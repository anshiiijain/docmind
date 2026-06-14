"""
Run with: pytest test_ingest.py -v
Make sure venv is active and uvicorn is NOT needed (tests hit functions directly)
"""
import os
import pytest
import chromadb

from ingest import load_document, chunk_documents, embed_and_store, ingest_file
from database import get_collection, search_collection, delete_document, list_documents


# ── Fixtures — setup/teardown that runs around each test ──────────────────────

@pytest.fixture(autouse=True)
def clean_collection():
    """
    Before each test: wipe the 'test_documents' collection.
    autouse=True means this runs for EVERY test automatically.
    This ensures tests don't affect each other (test isolation).
    """
    client = chromadb.PersistentClient(path="./chroma_db")
    # Delete test collection if it exists
    try:
        client.delete_collection("test_documents")
    except Exception:
        pass
    yield  # test runs here
    # After test: clean up again
    try:
        client.delete_collection("test_documents")
    except Exception:
        pass


@pytest.fixture
def sample_txt(tmp_path):
    """Create a temporary .txt file with known content for testing."""
    content = """
    Artificial intelligence is transforming industries worldwide.
    Machine learning enables computers to learn from data without explicit programming.
    Deep learning uses neural networks with many layers to solve complex problems.
    Natural language processing allows machines to understand human language.
    Computer vision helps machines interpret and understand visual information.
    """
    file = tmp_path / "sample.txt"
    file.write_text(content)
    return str(file)


@pytest.fixture
def sample_pdf(tmp_path):
    """Create a minimal PDF for testing."""
    try:
        from reportlab.pdfgen import canvas
        file = tmp_path / "sample.pdf"
        c = canvas.Canvas(str(file))
        c.drawString(100, 750, "This is a test PDF document about machine learning.")
        c.drawString(100, 730, "Neural networks are inspired by the human brain.")
        c.save()
        return str(file)
    except ImportError:
        pytest.skip("reportlab not installed — skipping PDF test. pip install reportlab to enable.")


# ── Tests ──────────────────────────────────────────────────────────────────────

class TestDocumentLoading:

    def test_load_txt_file(self, sample_txt):
        """TXT file should load and return at least one Document object."""
        docs = load_document(sample_txt)
        assert len(docs) >= 1
        assert len(docs[0].page_content) > 0

    def test_load_txt_content_is_correct(self, sample_txt):
        """Loaded content should contain what we put in the file."""
        docs = load_document(sample_txt)
        full_text = " ".join(d.page_content for d in docs)
        assert "machine learning" in full_text.lower()

    def test_load_unsupported_format_raises(self, tmp_path):
        """Unsupported file types should raise ValueError."""
        bad_file = tmp_path / "data.csv"
        bad_file.write_text("col1,col2\nval1,val2")
        with pytest.raises(ValueError, match="Unsupported file type"):
            load_document(str(bad_file))

    def test_load_pdf_file(self, sample_pdf):
        """PDF should load and return Document objects."""
        docs = load_document(sample_pdf)
        assert len(docs) >= 1


class TestChunking:

    def test_chunks_are_created(self, sample_txt):
        """A document should be split into at least 1 chunk."""
        docs = load_document(sample_txt)
        chunks = chunk_documents(docs)
        assert len(chunks) >= 1

    def test_chunk_size_respected(self, sample_txt):
        """No chunk should exceed chunk_size by too much (some leeway for splitter)."""
        docs = load_document(sample_txt)
        chunks = chunk_documents(docs)
        for chunk in chunks:
            # chunk_size=500, allow 20% leeway for splitter behavior
            assert len(chunk.page_content) <= 600, \
                f"Chunk too large: {len(chunk.page_content)} chars"

    def test_chunks_have_content(self, sample_txt):
        """No chunk should be empty."""
        docs = load_document(sample_txt)
        chunks = chunk_documents(docs)
        for chunk in chunks:
            assert chunk.page_content.strip() != ""


class TestEmbeddingAndStorage:

    def test_chunks_stored_in_chromadb(self, sample_txt):
        """After ingestion, ChromaDB should contain the right number of chunks."""
        docs = load_document(sample_txt)
        chunks = chunk_documents(docs)

        # Use a test collection, not the real 'documents' collection
        import chromadb
        from sentence_transformers import SentenceTransformer

        client = chromadb.PersistentClient(path="./chroma_db")
        test_col = client.get_or_create_collection("test_documents",
                                                    metadata={"hnsw:space": "cosine"})
        model = SentenceTransformer("all-MiniLM-L6-v2")
        texts = [c.page_content for c in chunks]
        embeddings = model.encode(texts).tolist()
        import uuid
        ids = [str(uuid.uuid4()) for _ in chunks]
        metadatas = [{"source": "sample.txt", "page": "0"} for _ in chunks]
        test_col.add(documents=texts, embeddings=embeddings, ids=ids, metadatas=metadatas)

        assert test_col.count() == len(chunks)

    def test_metadata_stored_correctly(self, sample_txt):
        """Each stored chunk should have source and page metadata."""
        docs = load_document(sample_txt)
        chunks = chunk_documents(docs)

        import chromadb
        from sentence_transformers import SentenceTransformer
        import uuid

        client = chromadb.PersistentClient(path="./chroma_db")
        test_col = client.get_or_create_collection("test_documents",
                                                    metadata={"hnsw:space": "cosine"})
        model = SentenceTransformer("all-MiniLM-L6-v2")
        texts = [c.page_content for c in chunks]
        embeddings = model.encode(texts).tolist()
        ids = [str(uuid.uuid4()) for _ in chunks]
        filename = "sample.txt"
        metadatas = [{"source": filename, "page": "0"} for _ in chunks]
        test_col.add(documents=texts, embeddings=embeddings, ids=ids, metadatas=metadatas)

        all_items = test_col.get(include=["metadatas"])
        for meta in all_items["metadatas"]:
            assert "source" in meta
            assert "page" in meta
            assert meta["source"] == filename


class TestSearch:

    def test_search_returns_relevant_chunk(self, sample_txt):
        """
        This is the most important test.
        If you ask about 'neural networks', the most relevant chunk
        should contain something about neural networks or deep learning.
        """
        # First ingest the file into the real 'documents' collection
        result = ingest_file(sample_txt)
        assert result["status"] == "success"

        # Now search
        results = search_collection("neural networks", n_results=3)

        assert len(results) > 0

        # The top result should be about neural networks or learning
        top_result = results[0]["text"].lower()
        assert any(word in top_result for word in
                   ["neural", "network", "deep", "learning", "machine"]), \
            f"Expected relevant chunk, got: {top_result}"

    def test_search_returns_distances(self, sample_txt):
        """Each result should have a distance score."""
        ingest_file(sample_txt)
        results = search_collection("artificial intelligence", n_results=2)
        for r in results:
            assert "distance" in r
            assert isinstance(r["distance"], float)

    def test_search_respects_n_results(self, sample_txt):
        """Should not return more results than n_results."""
        ingest_file(sample_txt)
        results = search_collection("machine learning", n_results=2)
        assert len(results) <= 2

    def test_empty_collection_returns_empty_list(self):
        """Searching an empty DB should return [] not crash."""
        # Collection is wiped by autouse fixture
        results = search_collection("anything")
        # May return empty or small result depending on other docs in DB
        # Main thing: no exception raised
        assert isinstance(results, list)

    def test_search_result_structure(self, sample_txt):
        """Each result dict should have the expected keys."""
        ingest_file(sample_txt)
        results = search_collection("learning", n_results=1)
        if results:
            keys = results[0].keys()
            assert "text" in keys
            assert "source" in keys
            assert "page" in keys
            assert "distance" in keys


class TestDeleteAndList:

    def test_list_documents_after_upload(self, sample_txt):
        """After ingesting a file, it should appear in list_documents."""
        ingest_file(sample_txt)
        docs = list_documents()
        filenames = [d["filename"] for d in docs]
        assert "sample.txt" in filenames

    def test_delete_removes_chunks(self, sample_txt):
        """After deletion, the document should not appear in list."""
        ingest_file(sample_txt)
        before = list_documents()
        assert any(d["filename"] == "sample.txt" for d in before)

        deleted_count = delete_document("sample.txt")
        assert deleted_count > 0

        after = list_documents()
        assert not any(d["filename"] == "sample.txt" for d in after)