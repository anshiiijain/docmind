# backend/analytics.py
"""
ML Analytics functions.

Key design decision: we don't re-read original files.
All text is already in ChromaDB as chunks — we fetch and reuse them.
This is fast, consistent, and decoupled from file storage.
"""

import spacy
from keybert import KeyBERT
from collections import Counter
from database import get_collection

# ── Load models once ───────────────────────────────────────────────────────────
# Why at module level? These models are large (50-200MB each).
# Loading them inside a function would reload on every API request — very slow.
# Loading once at startup means every subsequent call is instant.
print("Loading spaCy model...")
nlp = spacy.load("en_core_web_sm")

print("Loading KeyBERT model...")
# KeyBERT reuses the same sentence-transformer model we use for embeddings.
# So no extra memory — it's already loaded by the embedding pipeline.
kw_model = KeyBERT(model="all-MiniLM-L6-v2")

print("ML analytics models loaded.")


# ── Helper ─────────────────────────────────────────────────────────────────────

def get_chunks_for_doc(filename: str) -> list[str]:
    """
    Fetch all stored text chunks for a document from ChromaDB.

    This is the input to ALL analytics functions.
    We stored chunks during ingestion — now we reuse them for ML.
    No file I/O needed, no re-parsing PDFs.
    """
    collection = get_collection()
    results = collection.get(
        where={"source": filename},
        include=["documents"]   # only fetch text, not embeddings (faster)
    )
    return results["documents"]  # list of strings


# ── Topic Modeling ─────────────────────────────────────────────────────────────

def get_topics(filename: str) -> dict:
    """
    Find what themes/topics exist in a document using BERTopic.

    How BERTopic works:
    1. Embed all chunks into vectors (we already have these in ChromaDB,
       but BERTopic needs to do its own for clustering)
    2. UMAP: reduce 384-dim vectors to 2D (easier to cluster)
    3. HDBSCAN: cluster similar chunks together
    4. c-TF-IDF: find words that best represent each cluster = topic keywords

    Why not just use word frequency? Because "the", "is", "and" would dominate.
    BERTopic finds semantically meaningful themes, not just common words.

    Minimum chunks needed: BERTopic needs at least 10 docs to find patterns.
    Below that, we return a simple word frequency fallback.
    """
    chunks = get_chunks_for_doc(filename)

    if not chunks:
        return {"error": f"No chunks found for {filename}. Is it uploaded?"}

    # Fallback for small documents — BERTopic needs enough text to cluster
    if len(chunks) < 10:
        return _simple_topics(chunks)

    try:
        from bertopic import BERTopic

        # min_topic_size: minimum chunks per topic cluster.
        # Lower = more topics found. We use 2 for small docs.
        topic_model = BERTopic(
            min_topic_size=max(2, len(chunks) // 10),
            verbose=False,
        )

        topics, _ = topic_model.fit_transform(chunks)
        # topics: list of ints, one per chunk — which topic it belongs to
        # -1 means "outlier" (doesn't fit any topic) — we skip these

        topic_info = topic_model.get_topic_info()
        # topic_info is a DataFrame with columns: Topic, Count, Name, Representation

        results = []
        for _, row in topic_info.iterrows():
            if row["Topic"] == -1:
                continue  # skip outlier topic

            # get_topic() returns list of (word, score) tuples
            words = topic_model.get_topic(row["Topic"])
            if words:
                results.append({
                    "topic_id":  int(row["Topic"]),
                    "label":     f"Topic {row['Topic']}",
                    "keywords":  [w[0] for w in words[:6]],  # top 6 words
                    "chunk_count": int(row["Count"]),
                })

        return {"topics": results, "total_chunks": len(chunks)}

    except Exception as e:
        # BERTopic can fail on unusual text — fall back gracefully
        return _simple_topics(chunks)


def _simple_topics(chunks: list[str]) -> dict:
    """
    Fallback when BERTopic can't run (too few chunks or error).
    Uses simple word frequency — not as good but always works.
    """
    text = " ".join(chunks).lower()
    # Remove common stopwords manually (spaCy does this better but this is fast)
    stopwords = {"the","a","an","is","are","was","were","be","been","being",
                 "have","has","had","do","does","did","will","would","could",
                 "should","may","might","shall","can","need","dare","ought",
                 "used","to","of","in","for","on","with","at","by","from",
                 "this","that","these","those","it","its","and","or","but",
                 "not","so","if","as","into","through","about","than"}
    words = [w for w in text.split() if w.isalpha() and w not in stopwords and len(w) > 3]
    freq = Counter(words).most_common(20)

    return {
        "topics": [{
            "topic_id": 0,
            "label": "Main Topics",
            "keywords": [w for w, _ in freq[:8]],
            "chunk_count": len(chunks),
        }],
        "total_chunks": len(chunks),
        "note": "Small document — showing top keywords instead of topic clusters"
    }


# ── Named Entity Recognition ───────────────────────────────────────────────────

def get_entities(filename: str) -> dict:
    """
    Extract named entities using spaCy.

    NER = Named Entity Recognition.
    spaCy reads text and labels spans like:
      "Elon Musk"  → PERSON
      "Google"     → ORG
      "2024"       → DATE
      "$500M"      → MONEY
      "New York"   → GPE (geo-political entity)

    Why is this useful?
    Turns unstructured text → structured data.
    Instead of reading 50 pages, you see: "This doc mentions Apple, Google,
    Microsoft (ORGs) and discusses events from 2020-2024 (DATEs)."

    We process chunks separately (not as one giant string) because
    spaCy has a max text size limit and chunk boundaries are natural sentence groups.
    """
    chunks = get_chunks_for_doc(filename)

    if not chunks:
        return {"error": f"No chunks found for {filename}"}

    # Entity type → list of (text, count) we care about
    entity_counts: dict[str, Counter] = {
        "PERSON": Counter(),
        "ORG":    Counter(),
        "GPE":    Counter(),   # countries, cities
        "DATE":   Counter(),
        "MONEY":  Counter(),
        "PRODUCT": Counter(),
    }

    # Process each chunk through spaCy
    # nlp.pipe() is faster than calling nlp() in a loop — batches processing
    for doc in nlp.pipe(chunks, batch_size=50):
        for ent in doc.ents:
            if ent.label_ in entity_counts:
                # Normalize: strip whitespace, title case for consistency
                entity_counts[ent.label_][ent.text.strip()] += 1

    # Format results: only include entity types that have at least 1 result
    results = {}
    for label, counter in entity_counts.items():
        if counter:
            results[label] = [
                {"text": text, "count": count}
                for text, count in counter.most_common(10)  # top 10 per type
            ]

    return {
        "entities": results,
        "total_chunks_analyzed": len(chunks),
    }


# ── Keyword Extraction ─────────────────────────────────────────────────────────

def get_keywords(filename: str) -> dict:
    """
    Extract keywords using KeyBERT.

    How KeyBERT works:
    1. Embed the entire document into one vector
    2. Embed each candidate word/phrase
    3. Find words whose embeddings are closest to the document embedding
    → These words best "represent" the document semantically

    Why better than TF-IDF?
    TF-IDF: "neural" appears often → important.
    KeyBERT: "deep learning" is semantically central even if it appears once.

    keyphrase_ngram_range=(1,2): extract both single words AND two-word phrases.
    "machine learning" is more informative than just "machine" or "learning".
    """
    chunks = get_chunks_for_doc(filename)

    if not chunks:
        return {"error": f"No chunks found for {filename}"}

    # Join all chunks into one document for KeyBERT
    # KeyBERT works on the whole document, not chunk by chunk
    full_text = " ".join(chunks)

    # Limit text size — KeyBERT can be slow on very long texts
    if len(full_text) > 50000:
        full_text = full_text[:50000]

    keywords = kw_model.extract_keywords(
        full_text,
        keyphrase_ngram_range=(1, 2),   # single words + 2-word phrases
        stop_words="english",            # ignore common English words
        top_n=15,                        # return top 15 keywords
        diversity=0.5,                   # MMR diversity (0=redundant, 1=diverse)
        use_mmr=True,                    # Maximal Marginal Relevance — avoid repetition
    )
    # keywords: list of (keyword, score) tuples, score 0-1

    return {
        "keywords": [
            {"keyword": kw, "score": round(score, 3)}
            for kw, score in keywords
        ]
    }


# ── Document Stats ─────────────────────────────────────────────────────────────

def get_doc_stats(filename: str) -> dict:
    """
    Basic statistics about a document.
    No heavy ML — just useful numbers derived from stored chunks.

    reading_time: average adult reads 200-250 words/min.
    language: langdetect uses character n-grams to identify language.
    """
    chunks = get_chunks_for_doc(filename)

    if not chunks:
        return {"error": f"No chunks found for {filename}"}

    full_text = " ".join(chunks)
    word_count = len(full_text.split())
    char_count = len(full_text)
    avg_chunk_len = char_count // len(chunks) if chunks else 0

    # Detect language from first 1000 chars (enough for detection)
    try:
        from langdetect import detect
        language = detect(full_text[:1000])
    except Exception:
        language = "unknown"

    return {
        "filename":          filename,
        "chunk_count":       len(chunks),
        "word_count":        word_count,
        "char_count":        char_count,
        "avg_chunk_length":  avg_chunk_len,
        "reading_time_mins": max(1, word_count // 200),
        "language":          language,
    }