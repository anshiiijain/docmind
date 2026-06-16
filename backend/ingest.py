import os
import uuid
from pathlib import Path
from config import settings
from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from sentence_transformers import SentenceTransformer

from database import get_collection

# Load the embedding model once at module level (expensive to load repeatedly)
# all-MiniLM-L6-v2: 80MB, fast, good quality — perfect for local dev
# It maps sentences to a 384-dimensional vector space
print("Loading embedding model...")
embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
print("Embedding model loaded.")


def load_document(file_path: str) -> list:
    """
    Load a file and return a list of LangChain Document objects.
    Each Document has: .page_content (text) and .metadata (dict)
    """
    ext = Path(file_path).suffix.lower()

    if ext == ".pdf":
        loader = PyPDFLoader(file_path)
    elif ext == ".txt":
        loader = TextLoader(file_path, encoding="utf-8")
    else:
        raise ValueError(f"Unsupported file type: {ext}. Use PDF or TXT.")

    return loader.load()
#

def chunk_documents(documents: list) -> list:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=settings.chunk_size,
        chunk_overlap=settings.chunk_overlap,
        length_function=len,
    )
    return splitter.split_documents(documents)
#


def embed_and_store(chunks: list, filename: str) -> int:
    """
    Embed each chunk and store in ChromaDB.
    Returns number of chunks stored.
    """
    collection = get_collection()

    # Extract just the text strings for embedding
    texts = [chunk.page_content for chunk in chunks]

    # Embed all chunks at once (batching is faster than one by one)
    # Returns a numpy array of shape (num_chunks, 384)
    embeddings = embedding_model.encode(texts, show_progress_bar=True)

    # Build metadata list — one dict per chunk
    metadatas = []
    for chunk in chunks:
        meta = {
            "source": filename,
            # PyPDFLoader gives page numbers; TextLoader doesn't
            "page": str(chunk.metadata.get("page", 0)),
        }
        metadatas.append(meta)

    # Generate unique IDs for each chunk
    # Using uuid ensures no collisions even if you re-upload the same file
    ids = [str(uuid.uuid4()) for _ in chunks]

    # Add to ChromaDB
    # ChromaDB stores: id, embedding, metadata, document (raw text)
    collection.add(
        documents=texts,
        embeddings=embeddings.tolist(),  # ChromaDB needs plain list, not numpy
        metadatas=metadatas,
        ids=ids,
    )

    return len(chunks)


def ingest_file(file_path: str) -> dict:
    """
    Full pipeline: load → chunk → embed → store
    Returns a summary dict.
    """
    filename = Path(file_path).name

    collection = get_collection()
    existing = collection.get(where={"source": filename})
    if existing["ids"]:
        return {
            "status":        "duplicate",
            "filename":      filename,
            "chunks_stored": 0,
            "message":       f"{filename} is already indexed. Delete it first to re-upload.",
        }
    
    try:
        print(f"Loading {filename}...")
        documents = load_document(file_path)

        print(f"Chunking {len(documents)} pages...")
        chunks = chunk_documents(documents)

        print(f"Embedding and storing {len(chunks)} chunks...")
        stored = embed_and_store(chunks, filename)

        return {
            "status": "success",
            "filename": filename,
            "pages": len(documents),
            "chunks_stored": stored,
        }

    except Exception as e:
        return {
            "status": "error",
            "filename": filename,
            "error": str(e),
        }


# ── Quick test — run this file directly to verify everything works ────────────
if __name__ == "__main__":
    import sys

    # Usage: python ingest.py path/to/your/file.pdf
    if len(sys.argv) < 2:
        print("Usage: python ingest.py <path_to_pdf_or_txt>")
        sys.exit(1)

    result = ingest_file(sys.argv[1])
    print("\n── Result ──────────────────────")
    for k, v in result.items():
        print(f"  {k}: {v}")

    # Verify by checking collection count
    collection = get_collection()
    print(f"\n── ChromaDB now has {collection.count()} total chunks ──")