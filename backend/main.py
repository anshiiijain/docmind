import os
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from ingest import ingest_file
from database import search_collection, list_documents, delete_document

from database import search_collection, list_documents, delete_document

from fastapi.responses import StreamingResponse
import json
from llm import ask_llm, stream_llm

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

class ChatRequest(BaseModel):
    question: str
    history: list = []      # list of {"role": ..., "content": ...} dicts
    n_results: int = 5      # how many chunks to retrieve before sending to LLM
    filename: str = None    # optional: chat with one specific document

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

@app.post("/chat")
def chat(request: ChatRequest):
    """
    Full RAG pipeline in one endpoint:
    1. Embed the question
    2. Retrieve top N relevant chunks from ChromaDB
    3. Build prompt with context + question
    4. Call LLM
    5. Return answer + sources
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    # Step 1 + 2: retrieve relevant chunks
    chunks = search_collection(
        query=request.question,
        n_results=request.n_results,
        filename=request.filename,
    )

    # Step 3 + 4 + 5: build prompt and call LLM
    result = ask_llm(
        question=request.question,
        chunks=chunks,
        history=request.history or [],
    )

    return result

@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """
    Streaming version of /chat.

    Uses Server-Sent Events (SSE) format:
    - Each message is:  data: <json>\n\n
    - End signal is:    data: [DONE]\n\n

    The browser uses EventSource or fetch+ReadableStream to read these.

    Why SSE and not WebSockets?
    SSE is one-directional (server → client) and works over plain HTTP.
    WebSockets are bidirectional but need a persistent connection.
    For chat responses, SSE is simpler and sufficient.
    """
    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    # Retrieve chunks BEFORE starting the stream
    # You want retrieval to happen once, not inside the generator
    chunks = search_collection(
        query=request.question,
        n_results=request.n_results,
        filename=request.filename,
    )

    # Build the sources list now (before streaming starts)
    relevant_chunks = [c for c in chunks if c["distance"] < 1.2]
    sources = [
        {"source": c["source"], "page": c["page"], "snippet": c["text"][:150]}
        for c in relevant_chunks
    ]

    def event_generator():
        """
        This inner function is a generator that yields SSE-formatted strings.
        FastAPI's StreamingResponse reads from it and sends each yield
        to the client immediately — no buffering.
        """
        try:
            # Stream the answer tokens
            for token in stream_llm(request.question, chunks, request.history):
                # SSE format: must start with "data: " and end with "\n\n"
                payload = json.dumps({"type": "token", "content": token})
                yield f"data: {payload}\n\n"

            # After all tokens, send sources as a final event
            sources_payload = json.dumps({"type": "sources", "sources": sources})
            yield f"data: {sources_payload}\n\n"

            # Signal the client that streaming is complete
            yield "data: [DONE]\n\n"

        except Exception as e:
            error_payload = json.dumps({"type": "error", "message": str(e)})
            yield f"data: {error_payload}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            # These headers prevent buffering — critical for streaming to work
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            # Allow the frontend to read these headers (CORS)
            "Access-Control-Allow-Origin": "*",
        },
    )

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