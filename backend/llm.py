import os
from dotenv import load_dotenv

load_dotenv()

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai")
LLM_MODEL    = os.getenv("LLM_MODEL", "gpt-3.5-turbo")


# ── Prompt Assembly ────────────────────────────────────────────────────────────
# This is where RAG "happens". You're not asking the LLM to remember your doc —
# you're pasting the relevant excerpts directly into the prompt and saying
# "answer using only THIS". The LLM is acting as a reading comprehension engine.

SYSTEM_PROMPT = """You are a helpful assistant that answers questions about uploaded documents.

RULES:
1. Answer ONLY using the context chunks provided below.
2. If the answer is not in the context, say "I couldn't find that in the uploaded documents."
3. Always mention which document your answer came from.
4. Be concise and direct.
5. Do not make up information."""


def build_prompt_messages(question: str, chunks: list, history: list = None) -> list:
    """
    Assemble the full message list to send to the LLM.

    Structure:
      [system]          ← tells LLM how to behave
      [user/assistant]  ← previous conversation turns (optional)
      [user]            ← CONTEXT + current question

    Why put context in the LAST user message?
    The LLM pays more attention to recent tokens. Putting context
    right before the question = better retrieval grounding.
    """
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Add conversation history (for multi-turn chat)
    # History format: [{"role": "user", "content": "..."}, {"role": "assistant", "content": "..."}]
    if history:
        messages.extend(history)

    # Format retrieved chunks into readable context block
    context_block = format_context(chunks)

    # Final user message = context + question
    user_message = f"""CONTEXT FROM DOCUMENTS:
{context_block}

QUESTION: {question}"""

    messages.append({"role": "user", "content": user_message})
    return messages


def format_context(chunks: list) -> str:
    """
    Turn list of chunk dicts into a readable string for the prompt.

    Each chunk looks like:
    {text: "...", source: "file.pdf", page: "3", distance: 0.21}

    We format it so the LLM knows where each piece came from.
    This is what enables the LLM to say "According to file.pdf, page 3..."
    """
    if not chunks:
        return "No relevant context found in uploaded documents."

    parts = []
    for i, chunk in enumerate(chunks, 1):
        part = f"[{i}] Source: {chunk['source']} | Page: {chunk['page']}\n{chunk['text']}"
        parts.append(part)

    return "\n\n---\n\n".join(parts)


# ── LLM Callers ────────────────────────────────────────────────────────────────

def call_openai(messages: list) -> str:
    """Call OpenAI chat completions API. Returns full response string."""
    from openai import OpenAI

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=messages,
        temperature=0.2,   # low = more factual, less creative. Good for RAG.
        max_tokens=1000,
    )

    return response.choices[0].message.content


def call_ollama(messages: list) -> str:
    """Call local Ollama instance. Returns full response string."""
    import requests

    response = requests.post(
        "http://localhost:11434/api/chat",
        json={
            "model": LLM_MODEL,
            "messages": messages,
            "stream": False,
        },
        timeout=120,  # local models can be slow
    )
    response.raise_for_status()
    return response.json()["message"]["content"]


def ask_llm(question: str, chunks: list, history: list = None) -> dict:
    """
    Main entry point. Retrieves context, builds prompt, calls LLM.
    Returns answer + the source chunks used (for citations).
    """
    # Filter out low-quality chunks before sending to LLM
    # distance > 1.2 means the chunk is probably not relevant
    relevant_chunks = [c for c in chunks if c["distance"] < 1.2]

    if not relevant_chunks:
        return {
            "answer": "I couldn't find relevant information in the uploaded documents for your question.",
            "sources": [],
        }

    messages = build_prompt_messages(question, relevant_chunks, history)

    if LLM_PROVIDER == "openai":
        answer = call_openai(messages)
    elif LLM_PROVIDER == "ollama":
        answer = call_ollama(messages)
    else:
        raise ValueError(f"Unknown LLM_PROVIDER: {LLM_PROVIDER}. Use 'openai' or 'ollama'.")

    return {
        "answer": answer,
        # Return sources so frontend can show citations
        "sources": [
            {"source": c["source"], "page": c["page"], "snippet": c["text"][:150]}
            for c in relevant_chunks
        ],
    }

from typing import Generator


def stream_openai(messages: list) -> Generator[str, None, None]:
    """
    Generator function that yields tokens one by one as OpenAI produces them.

    A generator uses 'yield' instead of 'return'.
    The caller gets each value as it's produced — it doesn't wait for all of them.
    This is what makes streaming work: FastAPI reads from this generator
    and sends each chunk to the browser immediately.
    """
    from openai import OpenAI

    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    # stream=True makes OpenAI return an iterator instead of waiting
    response = client.chat.completions.create(
        model=LLM_MODEL,
        messages=messages,
        temperature=0.2,
        max_tokens=1000,
        stream=True,
    )

    for chunk in response:
        # Each chunk may or may not have content (some are metadata chunks)
        delta = chunk.choices[0].delta
        if delta.content is not None:
            yield delta.content   # yields one token at a time, e.g. "The", " answer", " is"


def stream_ollama(messages: list) -> Generator[str, None, None]:
    """Stream tokens from local Ollama."""
    import requests, json

    response = requests.post(
        "http://localhost:11434/api/chat",
        json={"model": LLM_MODEL, "messages": messages, "stream": True},
        stream=True,
        timeout=120,
    )
    response.raise_for_status()

    for line in response.iter_lines():
        if line:
            data = json.loads(line)
            token = data.get("message", {}).get("content", "")
            if token:
                yield token


def stream_llm(question: str, chunks: list, history: list = None) -> Generator:
    """
    Same as ask_llm but yields tokens instead of returning full string.
    Used by the streaming endpoint.
    """
    relevant_chunks = [c for c in chunks if c["distance"] < 1.2]

    if not relevant_chunks:
        yield "I couldn't find relevant information in the uploaded documents for your question."
        return

    messages = build_prompt_messages(question, relevant_chunks, history)

    if LLM_PROVIDER == "openai":
        yield from stream_openai(messages)
    elif LLM_PROVIDER == "ollama":
        yield from stream_ollama(messages)
    else:
        raise ValueError(f"Unknown LLM_PROVIDER: {LLM_PROVIDER}")