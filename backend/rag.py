import os
import numpy as np
import faiss
from typing import List, Dict, Optional
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

import google.generativeai as genai

load_dotenv()

API_KEY = os.getenv("GOOGLE_API_KEY")
genai.configure(api_key=API_KEY)

_model = SentenceTransformer("all-MiniLM-L6-v2")

_index: Optional[faiss.IndexFlatL2] = None
_docs: List[Dict] = []


def make_embeddings(texts: List[str]) -> np.ndarray:
    embs = _model.encode(texts, show_progress_bar=False, convert_to_numpy=True)
    return embs.astype("float32")


def index_documents(docs: List[Dict], embeddings: np.ndarray):
    global _index, _docs
    dim = embeddings.shape[1]
    _index = faiss.IndexFlatL2(dim)
    _index.add(embeddings)
    _docs = docs


def retrieve(query: str, top_k: int = 4) -> List[Dict]:
    if _index is None or not _docs:
        raise RuntimeError("Index is empty. Please ingest documents first.")

    q_emb = _model.encode([query], convert_to_numpy=True).astype("float32")
    distances, indices = _index.search(q_emb, top_k)

    results = []
    for dist, idx in zip(distances[0], indices[0]):
        if 0 <= idx < len(_docs):
            results.append({"doc": _docs[idx], "score": float(dist)})
    return results


def generate_answer(question: str, retrieved_passages: List[Dict]) -> str:
    """
    Generates answer using Gemini 1.5 Flash (or any Gemini model).
    """
    # Format context
    context = []
    for i, r in enumerate(retrieved_passages):
        doc = r["doc"]
        context.append(f"PASSAGE {i+1} (source: {doc['url']}):\n{doc['text']}")
    context_text = "\n\n---\n\n".join(context)

    prompt = (
        "You are a factual financial assistant. Use ONLY the following passages to answer.\n"
        "If not answerable, respond exactly: NOT IN SOURCES.\n\n"
        f"CONTEXT:\n{context_text}\n\nQUESTION: {question}\n\nAnswer:"
    )

    try:
        model = genai.GenerativeModel("models/gemini-2.5-flash")
        response = model.generate_content(prompt)
        print("Gemini raw response:", response)
        return response.text.strip()

    except Exception as e:
        print("Gemini ERROR:", repr(e))
        raise

