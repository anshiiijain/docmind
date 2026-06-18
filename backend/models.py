from sqlalchemy import Column, String, DateTime, Enum as SAEnum
from sqlalchemy.orm import DeclarativeBase
from datetime import datetime, timezone
import enum

class Base(DeclarativeBase):
    pass

class TaskStatus(str, enum.Enum):
    todo        = "todo"
    in_progress = "in-progress"
    done        = "done"

class TaskPriority(str, enum.Enum):
    low    = "low"
    medium = "medium"
    high   = "high"

class Task(Base):
    __tablename__ = "tasks"

    id          = Column(String, primary_key=True)
    title       = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status      = Column(SAEnum(TaskStatus), default=TaskStatus.todo, nullable=False)
    priority    = Column(SAEnum(TaskPriority), default=TaskPriority.medium, nullable=False)
    doc_name    = Column(String, nullable=True)   # Day 15: link task → document
    created_at  = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
