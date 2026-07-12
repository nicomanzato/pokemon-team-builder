# Pokemon Team Builder

Describe the team you want — *"a Trick Room team with Mega Mawile"* — and get back a
legal, ready-to-import [Pokemon Showdown](https://play.pokemonshowdown.com/) team for
the current official VGC format (**Pokemon Champions, Regulation Set M-B**).

The twist this project is building toward: the AI that composes the team will run
**entirely in your browser** — a small fine-tuned model over WebGPU, fed fresh
competitive data through retrieval. No API keys, no backend, no bill.

<!-- TODO: screenshot -->

## Why

This app grew out of a hands-on lab where I learned how local AI models actually
work by measuring them: the same team-building task, solved with a raw local model
(73 rule violations across 5 teams), then RAG over real usage stats (13), then a
LoRA fine-tune trained in 12 minutes on a MacBook (perfect format, memorized facts).
The web app is where those lessons become a product: **fine-tuning for form,
retrieval for facts, and a validator as referee.**

## Status

**UI complete, running on a mock backend.** The mock serves real teams produced by
the lab's 7B + RAG pipeline and streams the same pipeline steps the real backend
will emit — the interface is already the real one, only the brain is fake.

- Strategy input with quick presets
- Generation console showing pipeline stages (retrieval → composition → validation)
- Team cards accented by each Pokemon's type, with official artwork from PokeAPI
- One-click Showdown paste export

## Roadmap

1. **Legality validator in TypeScript** — species/item clauses, learnsets, the
   Champions 66-point EV system; verdict displayed per card.
2. **First real backend** — local RAG pipeline (Qwen 2.5 7B via Ollama) behind the
   same interface as the mock, plus a validator-driven retry loop.
3. **Fuse the LoRA fine-tune** and publish the small model to Hugging Face.
4. **In-browser inference** — WebLLM (WebGPU) + client-side retrieval + the TS
   validator, deployed free on GitHub Pages.

## Stack

- [Vite](https://vite.dev) + React + TypeScript + [Tailwind CSS v4](https://tailwindcss.com)
- Competitive data: [Smogon usage stats](https://www.smogon.com/stats/) (1M+ rated
  battles/month) and [Pokemon Showdown](https://github.com/smogon/pokemon-showdown) data files
- Artwork: [PokeAPI](https://pokeapi.co)
- Coming: [MLX](https://github.com/ml-explore/mlx)-trained LoRA served by
  [WebLLM](https://github.com/mlc-ai/web-llm)

## Run it

```bash
npm install
npm run dev   # http://localhost:5173
```

No configuration needed — the mock backend is self-contained.
