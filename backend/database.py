import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer

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


_embedding_model = None

def get_embedding_model():
    """Lazy load — only load model when first needed."""
    global _embedding_model
    if _embedding_model is None:
        print("Loading embedding model for search...")
        _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedding_model


def search_collection(query: str, n_results: int = 5, filename: str = None) -> list:
    """
    Embed the query and find the most similar chunks in ChromaDB.

    Steps:
    1. Embed the query string into a 384-dim vector
    2. ChromaDB compares it against all stored chunk vectors
    3. Returns top n_results by cosine similarity

    Optional: filter by filename to search within one document only.
    """
    collection = get_collection()

    if collection.count() == 0:
        return []

    model = get_embedding_model()
    query_embedding = model.encode([query]).tolist()  # shape: [[...384 floats...]]

    # Build optional filter — ChromaDB calls these "where" clauses
    where = {"source": filename} if filename else None

    results = collection.query(
        query_embeddings=query_embedding,
        n_results=min(n_results, collection.count()),  # can't return more than exists
        where=where,
        include=["documents", "metadatas", "distances"],
    )

    # Reformat into a clean list of dicts
    # results is awkwardly nested: results["documents"][0][i], results["distances"][0][i]
    chunks = []
    for i in range(len(results["documents"][0])):
        chunks.append({
            "text":     results["documents"][0][i],
            "source":   results["metadatas"][0][i].get("source", "unknown"),
            "page":     results["metadatas"][0][i].get("page", "0"),
            "distance": round(results["distances"][0][i], 4),
            # distance closer to 0 = more similar. Above ~1.2 is usually irrelevant.
        })

    return chunks


def delete_document(filename: str) -> int:
    """
    Delete all chunks belonging to a specific file.
    Returns how many chunks were deleted.
    """
    collection = get_collection()

    # First find all IDs that match this filename
    results = collection.get(where={"source": filename})
    ids_to_delete = results["ids"]

    if ids_to_delete:
        collection.delete(ids=ids_to_delete)

    return len(ids_to_delete)


def list_documents() -> list:
    """
    Return a unique list of all uploaded documents with their chunk counts.
    ChromaDB doesn't have a GROUP BY so we do it manually.
    """
    collection = get_collection()

    if collection.count() == 0:
        return []

    # Get ALL metadata (just metadata, not embeddings — faster)
    all_items = collection.get(include=["metadatas"])

    # Count chunks per source file
    doc_counts = {}
    for meta in all_items["metadatas"]:
        source = meta.get("source", "unknown")
        doc_counts[source] = doc_counts.get(source, 0) + 1

    return [{"filename": k, "chunks": v} for k, v in doc_counts.items()]