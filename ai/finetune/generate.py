"""Dumb model runner: the ONLY Python in the project. Reads prompts.jsonl,
generates a completion for each with the fine-tuned 1.5B (base + LoRA adapter),
writes completions.jsonl. TS builds the prompts (RAG included) and validates the
output — Python just runs MLX, which has no TS equivalent.

  python ai/finetune/generate.py <prompts.jsonl> <completions.jsonl> [adapter_path]

Each prompt line: {"id": "...", "system": "...", "user": "..."}
Each completion line: {"id": "...", "text": "..."}
"""
import json
import sys

from mlx_lm import load, generate
from mlx_lm.sample_utils import make_sampler

MODEL = "mlx-community/Qwen2.5-1.5B-Instruct-4bit"


def main(prompts_path, completions_path, adapter_path):
    model, tokenizer = load(MODEL, adapter_path=adapter_path)
    sampler = make_sampler(temp=0.3)

    prompts = [json.loads(line) for line in open(prompts_path) if line.strip()]
    with open(completions_path, "w") as out:
        for p in prompts:
            chat = [{"role": "system", "content": p["system"]},
                    {"role": "user", "content": p["user"]}]
            prompt = tokenizer.apply_chat_template(chat, add_generation_prompt=True, tokenize=False)
            text = generate(model, tokenizer, prompt=prompt, max_tokens=1200, sampler=sampler)
            out.write(json.dumps({"id": p["id"], "text": text}) + "\n")
            print(f"  generated {p['id']}", file=sys.stderr)


if __name__ == "__main__":
    prompts_path, completions_path = sys.argv[1], sys.argv[2]
    adapter_path = sys.argv[3] if len(sys.argv) > 3 else "ai/finetune/adapters"
    main(prompts_path, completions_path, adapter_path)
