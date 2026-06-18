"""
SQLAlchemy engine, session, and all task CRUD functions.
Kept separate from database.py (which is ChromaDB) to avoid confusion.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from models import Base, Task, TaskStatus, TaskPriority

# SQLite file lives next to main.py — zero config, no server needed
DATABASE_URL = "sqlite:///./tasks.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # needed for SQLite + FastAPI
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

# Creates tasks table if it doesn't exist yet
Base.metadata.create_all(bind=engine)


def get_db():
    """FastAPI dependency — yields a session, always closes it after."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── CRUD ──────────────────────────────────────────────────────────────────────

def db_get_tasks(db: Session, status: str = None) -> list[Task]:
    q = db.query(Task)
    if status:
        q = q.filter(Task.status == status)
    return q.order_by(Task.created_at.desc()).all()


def db_create_task(
    db: Session,
    title: str,
    priority: str = "medium",
    status: str = "todo",
    description: str = None,
    doc_name: str = None,
) -> Task:
    task = Task(
        id          = str(uuid.uuid4()),
        title       = title,
        description = description,
        status      = status,
        priority    = priority,
        doc_name    = doc_name,
        created_at  = datetime.now(timezone.utc),
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def db_update_task(db: Session, task_id: str, updates: dict) -> Task | None:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return None
    for key, val in updates.items():
        if val is not None:
            setattr(task, key, val)
    db.commit()
    db.refresh(task)
    return task


def db_delete_task(db: Session, task_id: str) -> bool:
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        return False
    db.delete(task)
    db.commit()
    return True
