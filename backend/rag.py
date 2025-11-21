# rag.py
# Embedding, vector store (FAISS) and simple RAG generation integration.
import os
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
from dotenv import load_dotenv
import openai
from typing import List, Dict, Optional

load_dotenv()
OPENAI_KEY = os.getenv("OPENAI_API_KEY")
if OPENAI_KEY:
    openai.api_key = OPENAI_KEY

# Global objects for simple prototype. In production, use a persistent vector DB.
_MODEL_NAME = "all-MiniLM-L6-v2"
_model = SentenceTransformer(_MODEL_NAME)

_index: Optional[faiss.IndexFlatL2] = None
_docs: List[Dict] = []

def make_embeddings(texts: List[str]) -> np.ndarray:
    """
    Returns embeddings as float32 numpy array suitable for FAISS.
    """
    embs = _model.encode(texts, show_progress_bar=False, convert_to_numpy=True)
    if embs.dtype != np.float32:
        embs = embs.astype("float32")
    return embs

def index_documents(docs: List[Dict], embeddings: np.ndarray):
    """
    Create/replace the global FAISS index and store docs in memory.
    """
    global _index, _docs
    if embeddings.ndim != 2:
        raise ValueError("Embeddings must be a 2D array")
    dim = embeddings.shape[1]
    # create a simple L2 index
    _index = faiss.IndexFlatL2(dim)
    _index.add(embeddings)
    _docs = docs

def retrieve(query: str, top_k: int = 4) -> List[Dict]:
    """
    Returns a list of {'doc': doc, 'score': float} ordered by increasing L2 distance (lower = closer).
    """
    global _index, _model, _docs
    if _index is None or not _docs:
        raise RuntimeError("Index is empty. Please ingest documents first.")
    q_emb = _model.encode([query], convert_to_numpy=True).astype("float32")
    distances, indices = _index.search(q_emb, top_k)
    results = []
    for dist, idx in zip(distances[0], indices[0]):
        if idx < 0 or idx >= len(_docs):
            continue
        results.append({"doc": _docs[int(idx)], "score": float(dist)})
    return results

def generate_answer(question: str, retrieved_passages: List[Dict], use_openai: bool = True) -> str:
    """
    Generate an answer given a question and retrieved_passages.
    If OPENAI_API_KEY is not set or use_openai=False, this function will return a short
    synthesized answer based strictly on concatenating retrieved passages (deterministic fallback).
    """
    # Build context
    context_parts = []
    for i, r in enumerate(retrieved_passages):
        doc = r["doc"]
        context_parts.append(f"PASSAGE {i+1} (source: {doc.get('url')}):\n{doc.get('text')}")
    context_text = "\n\n---\n\n".join(context_parts)

    if use_openai and OPENAI_KEY:
        prompt = (
            "You are a concise, factual financial assistant. Use ONLY the information in the passages below to answer the question. "
            "If the passages do not contain the answer, respond exactly: NOT IN SOURCES. Provide a short answer (max 200 words), "
            "then list supporting passage numbers in square brackets. Do not hallucinate.\n\n"
            f"CONTEXT:\n{context_text}\n\nQUESTION: {question}\n\nAnswer:"
        )
        try:
            resp = openai.ChatCompletion.create(
                model="gpt-4o",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.0,
                max_tokens=400
            )
            text = resp["choices"][0]["message"]["content"].strip()
            return text
        except Exception as e:
            # fallback to local summarization if OpenAI fails
            pass

    # Deterministic fallback: return concatenated highlights + citation list
    combined = "\n\n".join([rp["doc"]["text"] for rp in retrieved_passages])
    # Very simple heuristic: return the first 600 chars as 'answer' and list passage numbers
    answer_snippet = combined.strip()[:1200].rstrip()
    citations = "[" + ",".join(str(i + 1) for i in range(len(retrieved_passages))) + "]"
    return f"{answer_snippet}\n\nSupporting passages: {citations}"
