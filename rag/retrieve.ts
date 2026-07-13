// Retrieval: load the saved vectors and search them by meaning.
// Import `retrieve()` from here (the generation step will), or run it directly to
// test:  npx tsx rag/retrieve.ts
import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory'
import type { Document } from '@langchain/core/documents'
import { embeddings } from './embeddings'

const VECTORS_PATH = join(dirname(fileURLToPath(import.meta.url)), 'vectors.json')

// Build the store once (lazy), from the saved vectors. The embeddings model is
// still needed here — to embed the QUERY at search time.
let store: MemoryVectorStore | null = null
function getStore(): MemoryVectorStore {
  if (!store) {
    store = new MemoryVectorStore(embeddings)
    store.memoryVectors = JSON.parse(readFileSync(VECTORS_PATH, 'utf8'))
  }
  return store
}

/** Query -> the k most similar Pokemon documents. */
export async function retrieve(query: string, k = 3): Promise<Document[]> {
  return getStore().similaritySearch(query, k)
}

// Runs only when this file is executed directly (not when imported elsewhere).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const results = await retrieve('a rain team', 3)
  console.log('similaritySearch("a rain team", 3):')
  for (const r of results) {
    console.log(`  → ${r.pageContent.split('.')[0]}   (${r.metadata.source.split('/').pop()})`)
  }
}
