import chromadb
from chromadb.config import Settings

# PersistentClient saves to disk — survives restarts
# If you use Client() instead, data is lost on restart
client = chromadb.PersistentClient(path="./chroma_db")

def get_collection(name: str = "documents"):
    """
    get_or_create means: if collection exists, return it.
    If not, create it fresh. Safe to call every time.
    """
    return client.get_or_create_collection(
        name=name,
        metadata={"hnsw:space": "cosine"}  # use cosine similarity (not L2)
    )