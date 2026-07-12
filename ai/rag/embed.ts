// Embeddings + semantic search over the Pokemon profiles.
// nomic-embed-text is asymmetric: documents and queries get different prefixes,
// or retrieval quality drops. We embed profiles once and cache them to disk;
// queries are embedded live at search time.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { buildProfiles } from './profiles'
import { loadChaos, loadDex } from '../groundTruth'

const OLLAMA_URL = 'http://localhost:11434/api/embed'
const MODEL = 'nomic-embed-text'
// cache lives alongside the other data in ai/data (gitignored)
const INDEX_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'embeddings.json')

interface IndexItem { id: string; name: string; vec: number[] }
interface Index { model: string; items: IndexItem[] }

async function embed(texts: string[], prefix: 'search_document' | 'search_query'): Promise<number[][]> {
  const out: number[][] = []
  for (let i = 0; i < texts.length; i += 64) {
    const batch = texts.slice(i, i + 64).map((t) => `${prefix}: ${t}`)
    const res = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, input: batch }),
    })
    if (!res.ok) throw new Error(`Ollama embed responded ${res.status}`)
    out.push(...(await res.json()).embeddings)
  }
  return out
}

// Pure cosine top-k. Vectors need not be normalized.
export function topK(query: number[], items: IndexItem[], k: number): { name: string; score: number }[] {
  const qn = Math.hypot(...query) || 1
  return items
    .map((it) => {
      let dot = 0
      for (let i = 0; i < query.length; i++) dot += query[i] * it.vec[i]
      return { name: it.name, score: dot / (qn * (Math.hypot(...it.vec) || 1)) }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
}

/** Embed every profile and cache to ai/data/embeddings.json. */
export async function buildIndex(): Promise<Index> {
  const profiles = buildProfiles(loadChaos(), loadDex())
  const vecs = await embed(profiles.map((p) => p.text), 'search_document')
  const index: Index = { model: MODEL, items: profiles.map((p, i) => ({ id: p.id, name: p.name, vec: vecs[i] })) }
  writeFileSync(INDEX_PATH, JSON.stringify(index))
  return index
}

export function loadIndex(): Index {
  return JSON.parse(readFileSync(INDEX_PATH, 'utf8'))
}

/** Strategy text -> most semantically similar Pokemon. Builds the cache if missing. */
export async function search(query: string, k = 10): Promise<{ name: string; score: number }[]> {
  const index = existsSync(INDEX_PATH) ? loadIndex() : await buildIndex()
  const [qvec] = await embed([query], 'search_query')
  return topK(qvec, index.items, k)
}
