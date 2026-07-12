"""Minimal HTTP wrapper around the fine-tuned model for the web to call.
Uses the exact generation path that our eval verified (apply_chat_template +
make_sampler(temp=0.3)) — mlx_lm.server's own sampling degenerated on this model.
The web reaches it through the Vite dev proxy (/mlx -> here).

  python ai/finetune/server.py [adapter_path] [port]

POST body: {"messages": [{"role","content"}, ...]}  ->  {"text": "..."}
"""
import json
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

from mlx_lm import load, generate
from mlx_lm.sample_utils import make_sampler

MODEL = "mlx-community/Qwen2.5-1.5B-Instruct-4bit"
ADAPTER = sys.argv[1] if len(sys.argv) > 1 else "ai/finetune/adapters"
PORT = int(sys.argv[2]) if len(sys.argv) > 2 else 8080

print(f"loading {MODEL} + adapter {ADAPTER}…", flush=True)
model, tokenizer = load(MODEL, adapter_path=ADAPTER)
sampler = make_sampler(temp=0.3)


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        n = int(self.headers.get("Content-Length", 0))
        body = json.loads(self.rfile.read(n))
        prompt = tokenizer.apply_chat_template(body["messages"], add_generation_prompt=True, tokenize=False)
        text = generate(model, tokenizer, prompt=prompt, max_tokens=1200, sampler=sampler)
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps({"text": text}).encode())

    def log_message(self, *args):
        pass


print(f"serving on 127.0.0.1:{PORT}", flush=True)
HTTPServer(("127.0.0.1", PORT), Handler).serve_forever()
