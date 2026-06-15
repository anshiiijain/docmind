"""
config.py — single source of truth for all settings.

Why do this?
When you have LLM_PROVIDER in llm.py, UPLOAD_DIR in main.py,
and ChromaDB path in database.py, changing one setting means
hunting through multiple files. One config file fixes this.

Pydantic's BaseSettings reads from environment variables automatically.
If OPENAI_API_KEY is in your .env, it's available as settings.openai_api_key.
"""
import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # LLM
    llm_provider: str      = os.getenv("LLM_PROVIDER", "openai")
    llm_model: str         = os.getenv("LLM_MODEL", "gpt-3.5-turbo")
    openai_api_key: str    = os.getenv("OPENAI_API_KEY", "")

    # ChromaDB
    chroma_path: str       = os.getenv("CHROMA_PATH", "./chroma_db")
    collection_name: str   = os.getenv("COLLECTION_NAME", "documents")

    # Upload
    upload_dir: str        = os.getenv("UPLOAD_DIR", "uploads")
    max_file_size_mb: int  = int(os.getenv("MAX_FILE_SIZE_MB", "50"))
    allowed_extensions: set = {".pdf", ".txt"}

    # RAG tuning
    chunk_size: int        = int(os.getenv("CHUNK_SIZE", "500"))
    chunk_overlap: int     = int(os.getenv("CHUNK_OVERLAP", "50"))
    max_retrieval: int     = int(os.getenv("MAX_RETRIEVAL", "10"))
    distance_threshold: float = float(os.getenv("DISTANCE_THRESHOLD", "1.2"))

    # CORS
    allowed_origins: list  = ["http://localhost:3000", "http://localhost:5173"]


settings = Settings()