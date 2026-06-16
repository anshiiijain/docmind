import os
import shutil
import logging
from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, validator
import json

from config import settings
from ingest import ingest_file
from database import search_collection, list_documents, delete_document, get_collection
from llm import ask_llm, stream_llm, format_sources

# ── Logging setup ──────────────────────────────────────────────────────────────
# logging > print() because: levels (DEBUG/INFO/ERROR), timestamps, can write to file
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("docmind")

# ── App setup ──────────────────────────────────────────────────────────────────
app = FastAPI(
    title="DocMind API",
    version="1.0.0",
    description="Personal AI Document Assistant — RAG powered"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs(settings.upload_dir, exist_ok=True)


# ── Pydantic Models ────────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query: str
    n_results: int = 5
    filename: str = None

    @validator("query")
    def query_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Query cannot be empty")
        return v.strip()

    @validator("n_results")
    def n_results_in_range(cls, v):
        if not 1 <= v <= 20:
            raise ValueError("n_results must be between 1 and 20")
        return v


class ChatRequest(BaseModel):
    question: str
    history: list = []
    n_results: int = 5
    filename: str = None

    @validator("question")
    def question_not_empty(cls, v):
        if not v.strip():
            raise ValueError("Question cannot be empty")
        return v.strip()


# ── Custom Exception Handlers ──────────────────────────────────────────────────
# These run when FastAPI catches specific error types.
# Without these, validation errors return ugly 422 responses.

@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    """Return clean 400 with readable message instead of FastAPI's default 422."""
    errors = []
    for error in exc.errors():
        field = " → ".join(str(e) for e in error["loc"])
        errors.append(f"{field}: {error['msg']}")
    return JSONResponse(
        status_code=400,
        content={"detail": "Validation error", "errors": errors}
    )


@app.exception_handler(Exception)
async def general_error_handler(request: Request, exc: Exception):
    """Catch-all for unexpected errors — log them and return 500."""
    logger.error(f"Unhandled error on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Check server logs."}
    )


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/")
def health_check():
    """Health check — also shows DB stats."""
    try:
        collection = get_collection()
        chunk_count = collection.count()
    except Exception:
        chunk_count = -1

    return {
        "status": "ok",
        "version": "1.0.0",
        "llm_provider": settings.llm_provider,
        "total_chunks_in_db": chunk_count,
    }


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """
    Upload a PDF or TXT file and ingest it into ChromaDB.

    Validates:
    - File extension must be .pdf or .txt
    - File size must be under MAX_FILE_SIZE_MB
    """
    # Validate extension
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in settings.allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{ext}' not supported. Allowed: {settings.allowed_extensions}"
        )

    # Validate file size
    # Read into memory temporarily to check size
    content = await file.read()
    size_mb = len(content) / (1024 * 1024)
    if size_mb > settings.max_file_size_mb:
        raise HTTPException(
            status_code=413,
            detail=f"File too large: {size_mb:.1f}MB. Maximum: {settings.max_file_size_mb}MB"
        )

    # Save to disk
    save_path = os.path.join(settings.upload_dir, file.filename)
    with open(save_path, "wb") as f:
        f.write(content)

    logger.info(f"File saved: {file.filename} ({size_mb:.2f}MB)")

    # Run ingestion
    result = ingest_file(save_path)

    if result["status"] == "error":
        os.remove(save_path)
        raise HTTPException(status_code=500, detail=result["error"])

    if result["status"] == "duplicate":
        raise HTTPException(status_code=409, detail=result["message"])

    logger.info(f"Ingestion complete: {file.filename} → {result['chunks_stored']} chunks")
    return result


@app.post("/search")
def search_documents(request: SearchRequest):
    """
    Semantic search — find chunks relevant to a query.
    Useful for debugging RAG quality without calling the LLM.
    """
    try:
        chunks = search_collection(
            query=request.query,
            n_results=request.n_results,
            filename=request.filename,
        )
    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail="Search failed. Is ChromaDB running?")

    return {
        "query":          request.query,
        "results":        chunks,
        "total_returned": len(chunks),
    }


@app.post("/chat")
def chat(request: ChatRequest):
    """Non-streaming chat. Waits for full answer then returns it."""
    chunks = search_collection(
        query=request.question,
        n_results=request.n_results,
        filename=request.filename,
    )

    try:
        result = ask_llm(
            question=request.question,
            chunks=chunks,
            history=request.history,
        )
    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        raise HTTPException(
            status_code=503,
            detail="LLM service unavailable. Check your API key or Ollama is running."
        )

    return result


@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Streaming chat using Server-Sent Events.
    Sends tokens as they're generated — no waiting.
    """
    chunks = search_collection(
        query=request.question,
        n_results=request.n_results,
        filename=request.filename,
    )

    relevant_chunks = [c for c in chunks if c["distance"] < settings.distance_threshold]
    sources = format_sources(relevant_chunks)

    def event_generator():
        try:
            for token in stream_llm(request.question, chunks, request.history):
                payload = json.dumps({"type": "token", "content": token})
                yield f"data: {payload}\n\n"

            sources_payload = json.dumps({"type": "sources", "sources": sources})
            yield f"data: {sources_payload}\n\n"

            yield "data: [DONE]\n\n"

        except Exception as e:
            logger.error(f"Streaming error: {e}")
            error_payload = json.dumps({"type": "error", "message": "Stream interrupted"})
            yield f"data: {error_payload}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":       "no-cache",
            "X-Accel-Buffering":   "no",
            "Access-Control-Allow-Origin": "*",
        },
    )


@app.get("/documents")
def get_documents():
    """List all uploaded documents with their chunk counts."""
    try:
        docs = list_documents()
    except Exception as e:
        logger.error(f"list_documents failed: {e}")
        raise HTTPException(status_code=500, detail="Could not retrieve document list")

    return {"documents": docs, "total": len(docs)}


@app.delete("/documents/{filename}")
def delete_doc(filename: str):
    """Remove all chunks for a document from ChromaDB."""
    if not filename.strip():
        raise HTTPException(status_code=400, detail="Filename cannot be empty")

    deleted = delete_document(filename)
    if deleted == 0:
        raise HTTPException(
            status_code=404,
            detail=f"No document found with name '{filename}'"
        )

    logger.info(f"Deleted document: {filename} ({deleted} chunks removed)")
    return {"status": "deleted", "filename": filename, "chunks_removed": deleted}