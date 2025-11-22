# scraper.py
# Simple, robust scraper that extracts title and paragraphs.
from bs4 import BeautifulSoup
import requests

READ_TIMEOUT = 15
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; FinancialRAG/1.0)"}

def scrape(url: str) -> dict:
    """
    Scrape the given URL and return a dict: { 'url', 'title', 'text' }.
    Text is a single string with paragraphs separated by double newlines.
    """
    resp = requests.get(url, timeout=READ_TIMEOUT, headers=HEADERS)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")

    title = soup.title.string.strip() if soup.title and soup.title.string else url

    paragraphs = []
    for p in soup.find_all("p"):
        text = p.get_text(separator=" ", strip=True)
        if text and len(text) > 30:
            paragraphs.append(text)

    if not paragraphs:
        desc = soup.find("meta", attrs={"name": "description"}) or soup.find("meta", attrs={"property": "og:description"})
        if desc and desc.get("content"):
            paragraphs.append(str(desc.get("content")).strip())

    text = "\n\n".join(paragraphs)
    return {"url": url, "title": title, "text": text}
