import React, { useState } from "react";

export default function App() {
  const [urls, setUrls] = useState(["", "", ""]);
  const [status, setStatus] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(null);
  const [evidence, setEvidence] = useState([]);

  const updateUrl = (i, v) => {
    const copy = [...urls];
    copy[i] = v;
    setUrls(copy);
  };

  const ingest = async () => {
    setStatus("Ingesting...");
    setAnswer(null);
    try {
      const res = await fetch("http://localhost:8000/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ urls }),
      });
      const j = await res.json();
      if (!res.ok) {
        setStatus(`Error: ${j.error || "unknown"}`);
      } else {
        setStatus(`Indexed ${j.passages_indexed} passages`);
      }
    } catch (e) {
      setStatus(`Network error: ${e.message}`);
    }
  };

  const ask = async () => {
    setAnswer("Thinking...");
    setEvidence([]);
    try {
      const res = await fetch("http://localhost:8000/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const j = await res.json();
      if (!res.ok) {
        setAnswer(`Error: ${j.error || "unknown"}`);
      } else {
        setAnswer(j.answer);
        setEvidence(j.evidence || []);
      }
    } catch (e) {
      setAnswer(`Network error: ${e.message}`);
    }
  };

  return (
    <div style={{ maxWidth: 900, margin: "24px auto", fontFamily: "Inter, Arial, sans-serif" }}>
      <h2>Financial RAG — Demo</h2>

      <section style={{ marginBottom: 20 }}>
        <h4>Step 1 — Paste exactly 3 article URLs</h4>
        {urls.map((u, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <input
              value={u}
              onChange={(e) => updateUrl(i, e.target.value)}
              style={{ width: "90%", padding: 8 }}
              placeholder={`URL ${i + 1}`}
            />
          </div>
        ))}
        <button onClick={ingest} style={{ padding: "8px 12px" }}>
          Ingest URLs
        </button>
        <div style={{ marginTop: 8 }}>{status}</div>
      </section>

      <hr />

      <section style={{ marginTop: 20 }}>
        <h4>Step 2 — Ask a question</h4>
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          style={{ width: "90%", padding: 8 }}
          placeholder="Ask something about the ingested articles"
        />
        <div style={{ marginTop: 8 }}>
          <button onClick={ask} style={{ padding: "8px 12px" }}>
            Ask
          </button>
        </div>

        <div style={{ marginTop: 16 }}>
          <h4>Answer</h4>
          <div style={{ whiteSpace: "pre-wrap", background: "#fafafa", padding: 12, borderRadius: 6 }}>
            {answer}
          </div>

          <h5>Evidence</h5>
          <ul>
            {evidence.map((ev, i) => (
              <li key={i}>
                <a href={ev.url} target="_blank" rel="noreferrer">
                  {ev.url}
                </a>{" "}
                (score: {ev.score.toFixed(3)})
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
