import os
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ingest import ingest_file
from database import search_collection, list_documents, delete_document

app = FastAPI(title="DocMind API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ── Pydantic models — defines what request body must look like ─────────────────
# FastAPI validates this automatically and returns 422 if it doesn't match

class SearchRequest(BaseModel):
    query: str
    n_results: int = 5       # default to 5, caller can override
    filename: str = None     # optional: search within one doc only


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/")
def health_check():
    return {"status": "ok", "message": "DocMind API is running"}


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Receive a file, save it, run ingestion pipeline."""
    allowed = {".pdf", ".txt"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Only PDF and TXT files allowed. Got: {ext}"
        )

    save_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    result = ingest_file(save_path)

    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["error"])

    return result


@app.post("/search")
def search_documents(request: SearchRequest):
    """
    Semantic search across all stored chunks.
    Returns top N chunks most similar to the query.
    This is the retrieval step of RAG — tomorrow you'll pass these to an LLM.
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    chunks = search_collection(
        query=request.query,
        n_results=request.n_results,
        filename=request.filename,
    )

    return {
        "query": request.query,
        "results": chunks,
        "total_returned": len(chunks),
    }


@app.get("/documents")
def get_documents():
    """List all uploaded documents with chunk counts."""
    docs = list_documents()
    return {"documents": docs, "total": len(docs)}


@app.delete("/documents/{filename}")
def delete_doc(filename: str):
    """Delete all chunks for a given document from ChromaDB."""
    deleted = delete_document(filename)
    if deleted == 0:
        raise HTTPException(
            status_code=404,
            detail=f"No document found with name: {filename}"
        )
    return {"status": "deleted", "filename": filename, "chunks_removed": deleted}