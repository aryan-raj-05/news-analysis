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
    <div className="min-h-screen bg-gray-100 flex">

      {/* Sidebar */}
      <aside className="w-80 bg-white shadow-md p-6 border-r border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
          Article Sources
        </h2>

        <h4 className="text-lg font-medium mb-3 text-gray-700">
          Enter 3 URLs
        </h4>

        {urls.map((u, i) => (
          <div key={i} className="mb-3">
            <input
              value={u}
              onChange={(e) => updateUrl(i, e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder={`URL ${i + 1}`}
            />
          </div>
        ))}

        <button
          onClick={ingest}
          className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow transition"
        >
          Ingest URLs
        </button>

        <p className="mt-4 text-gray-600 text-sm">{status}</p>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-10">
        <div className="max-w-4xl mx-auto">

          <h1 className="text-3xl font-bold text-gray-800 mb-8 text-center">
            AugmentNews
          </h1>

          {/* Question Box */}
          <div className="mb-8">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full px-4 py-3 text-lg rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder="Ask something about the ingested articles..."
            />

            <button
              onClick={ask}
              className="mt-4 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg shadow transition"
            >
              Ask
            </button>
          </div>

          {/* Answer Section */}
          <div className="bg-white border border-gray-200 rounded-lg shadow p-6">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Response</h2>

            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg min-h-[100px] whitespace-pre-wrap text-gray-800">
              {answer}
            </div>

            {/* Evidence */}
            <h3 className="text-xl font-semibold text-gray-700 mt-6 mb-2">
              Evidence
            </h3>

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
      </main>
    </div>
  );
}
