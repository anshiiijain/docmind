
import os
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from ingest import ingest_file

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

@app.get("/")
def health_check():
    return {"status": "ok", "message": "DocMind API is running"}


@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # Validate file type
    allowed = {".pdf", ".txt"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail=f"Only PDF and TXT files allowed. Got: {ext}")

    # Save the uploaded file to disk
    save_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(save_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    # Run ingestion pipeline
    result = ingest_file(save_path)

    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["error"])

    return result