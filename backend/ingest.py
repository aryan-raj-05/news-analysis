from typing import List
from scraper import scrape
from rag import make_embeddings, index_documents
import math
import re
import hashlib

def split_into_passages(text: str, chunk_size: int = 800, overlap: int = 100) -> List[str]:
    if not text:
        return []
    text = re.sub(r"\s+", " ", text).strip()
    passages = []
    start = 0
    L = len(text)
    while start < L:
        end = min(start + chunk_size, L)
        if end < L:
            idx = text.rfind(".", start, end)
            if idx != -1 and idx - start > chunk_size // 4:
                end = idx + 1
        passage = text[start:end].strip()
        if len(passage) > 50:
            passages.append(passage)
        start = max(end - overlap, end)
    return passages

def ingest_urls(urls: List[str]) -> int:
    """
    Ingest a list of URLs (expected length 3). Returns number of passages indexed.
    """
    docs = []
    for u in urls:
        item = scrape(u)
        passages = split_into_passages(item.get("text", ""), chunk_size=900, overlap=150)
        for i, p in enumerate(passages):
            uid = hashlib.sha1(f"{u}||{i}".encode("utf-8")).hexdigest()
            docs.append({
                "id": uid,
                "url": u,
                "title": item.get("title", ""),
                "text": p
            })
    if not docs:
        return 0
    texts = [d["text"] for d in docs]
    embeddings = make_embeddings(texts)
    index_documents(docs, embeddings)
    return len(docs)
