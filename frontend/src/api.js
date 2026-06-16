// frontend/src/api.js
// Central place for all backend calls.
// If your backend URL changes, you change it in ONE place.

const BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";

// ── Helper ─────────────────────────────────────────────────────────────────────

async function handleResponse(res) {
  if (!res.ok) {
    // Try to get the error message from the response body
    let detail = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }
  return res.json();
}


// ── Document endpoints ─────────────────────────────────────────────────────────

export async function uploadDocument(file, onProgress = null) {
  /**
   * Upload a file to the backend.
   * Uses FormData — NOT JSON. File uploads must use multipart/form-data.
   * 
   * onProgress: optional callback(percent) for progress bar.
   * We use XMLHttpRequest instead of fetch for progress events.
   */
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("file", file);

    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });
    }

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText));
      } else {
        try {
          const err = JSON.parse(xhr.responseText);
          reject(new Error(err.detail || `Upload failed: ${xhr.status}`));
        } catch {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

    xhr.open("POST", `${BASE_URL}/upload`);
    xhr.send(formData);
  });
}


export async function getDocuments() {
  /** Fetch list of all uploaded documents. */
  const res = await fetch(`${BASE_URL}/documents`);
  return handleResponse(res);
}


export async function deleteDocument(filename) {
  /** Delete a document and all its chunks from ChromaDB. */
  const res = await fetch(
    `${BASE_URL}/documents/${encodeURIComponent(filename)}`,
    { method: "DELETE" }
  );
  return handleResponse(res);
}


export async function searchDocuments(query, nResults = 5, filename = null) {
  /** Semantic search — useful for debugging RAG quality. */
  const res = await fetch(`${BASE_URL}/search`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ query, n_results: nResults, filename }),
  });
  return handleResponse(res);
}


// ── Chat endpoints ─────────────────────────────────────────────────────────────

export async function sendChatMessage(question, history = [], filename = null) {
  /** Non-streaming chat — returns full answer at once. */
  const res = await fetch(`${BASE_URL}/chat`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ question, history, filename }),
  });
  return handleResponse(res);
}


export function streamChatMessage(question, history = [], filename = null, callbacks = {}) {
  /**
   * Streaming chat using SSE.
   *
   * callbacks = {
   *   onToken:    (token: string) => void   ← called for each word/token
   *   onSources:  (sources: array) => void  ← called once at the end
   *   onDone:     () => void                ← called when stream ends
   *   onError:    (message: string) => void ← called on error
   * }
   *
   * Returns an AbortController so the caller can cancel:
   *   const ctrl = streamChatMessage(...)
   *   ctrl.abort()  ← cancels the stream
   *
   * Why fetch instead of EventSource?
   * EventSource only supports GET requests. We need POST (to send body).
   * fetch with ReadableStream gives us the same streaming but with POST.
   */
  const controller = new AbortController();

  fetch(`${BASE_URL}/chat/stream`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ question, history, filename }),
    signal:  controller.signal,
  })
  .then(async (res) => {
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      callbacks.onError?.(err.detail || "Chat request failed");
      return;
    }

    const reader  = res.body.getReader();
    const decoder = new TextDecoder();
    let   buffer  = "";  // incomplete lines accumulate here

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Decode the binary chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // SSE messages end with \n\n — split on that
      const lines = buffer.split("\n\n");

      // Last element might be incomplete — keep it in buffer
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        const data = line.slice(6).trim(); // remove "data: " prefix

        if (data === "[DONE]") {
          callbacks.onDone?.();
          return;
        }

        try {
          const parsed = JSON.parse(data);

          if (parsed.type === "token") {
            callbacks.onToken?.(parsed.content);
          } else if (parsed.type === "sources") {
            callbacks.onSources?.(parsed.sources);
          } else if (parsed.type === "error") {
            callbacks.onError?.(parsed.message);
          }
        } catch (_) {
          // Non-JSON line — ignore
        }
      }
    }
  })
  .catch((err) => {
    if (err.name !== "AbortError") {
      callbacks.onError?.(err.message || "Network error");
    }
  });

  return controller;
}


// ── Health ─────────────────────────────────────────────────────────────────────

export async function getHealth() {
  const res = await fetch(`${BASE_URL}/`);
  return handleResponse(res);
}