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
    <div className="min-h-screen bg-gray-100 flex justify-center py-10 px-4">
      <div className="w-full max-w-3xl bg-white shadow-md rounded-xl p-8">
        
        <h2 className="text-3xl font-semibold text-gray-800 mb-6 text-center">
          Financial RAG
        </h2>

        {/* Ingest Section */}
        <div className="mb-10">
          <h4 className="text-xl font-medium text-gray-700 mb-4">
            Enter the URLs you want to process
          </h4>

          {urls.map((u, i) => (
            <div key={i} className="mb-3">
              <input
                value={u}
                onChange={(e) => updateUrl(i, e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                placeholder={`URL ${i + 1}`}
              />
            </div>
          ))}

          <button
            onClick={ingest}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg shadow transition"
          >
            Ingest URLs
          </button>

          <p className="mt-3 text-gray-600">{status}</p>
        </div>

        <hr className="border-gray-300 mb-10" />

        {/* Query Section */}
        <div>
          <h4 className="text-xl font-medium text-gray-700 mb-4">
            Ask a question
          </h4>

          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            placeholder="Ask something about the ingested articles"
          />

          <button
            onClick={ask}
            className="mt-4 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg shadow transition"
          >
            Ask
          </button>

          {/* Answer */}
          <div className="mt-8">
            <h4 className="text-xl font-semibold text-gray-700 mb-2">Answer</h4>
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg shadow-inner whitespace-pre-wrap min-h-[80px]">
              {answer}
            </div>

            {/* Evidence */}
            <h5 className="text-lg font-semibold text-gray-700 mt-6 mb-2">Evidence</h5>
            <ul className="list-disc ml-6 text-gray-700">
              {evidence.map((ev, i) => (
                <li key={i} className="mb-2">
                  <a
                    href={ev.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 underline"
                  >
                    {ev.url}
                  </a>
                  <span className="ml-1 text-sm text-gray-500">
                    (score: {ev.score.toFixed(3)})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
}
