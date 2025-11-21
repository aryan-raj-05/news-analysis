from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from ingest import ingest_urls
from rag import retrieve, generate_answer
import traceback
import os

BUILD_DIR = os.path.join(os.path.dirname(__file__), "dist")

app = Flask(
    __name__,
    static_folder=BUILD_DIR,
    static_url_path="/"
)

CORS(app)

@app.route("/ingest", methods=["POST"])
def ingest():
    try:
        body = request.get_json(force=True)
        urls = body.get("urls", [])

        if not isinstance(urls, list) or len(urls) != 3:
            return jsonify({"error": "Please provide exactly 3 URLs in an array under the 'urls' key."}), 400
        
        count = ingest_urls(urls)

        if count == 0:
            return jsonify({"status": "ok", "passages_indexed": 0, "warning": "Ingestion produced no passages (check URLs)."})
        
        return jsonify({"status": "ok", "passages_indexed": count})
    
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/query", methods=["POST"])
def query():
    try:
        body = request.get_json(force=True)
        question = body.get("question")

        if not question or not question.strip():
            return jsonify({"error": "No question provided under 'question' key."}), 400

        retrieved = retrieve(question, top_k=4)
        answer = generate_answer(question, retrieved)
        evidence = [{"url": r["doc"]["url"], "id": r["doc"]["id"], "score": r["score"]} for r in retrieved]
        return jsonify({"answer": answer, "evidence": evidence})
    
    except RuntimeError as e:
        return jsonify({"error": str(e)}), 400
    
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/status", methods=["GET"])
def status():
    return jsonify({"status": "ok"})


@app.errorhandler(404)
def frontend(_):
    return send_from_directory(BUILD_DIR, "index.html")


if __name__ == "__main__":
    # default port 8000 to match project plan
    app.run(host="0.0.0.0", port=8000)
