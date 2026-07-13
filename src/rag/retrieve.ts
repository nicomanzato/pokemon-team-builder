// Browser retrieval: load the precomputed vectors (shipped as JSON) into a store,
// then search them by meaning. Only the query is embedded live (in the browser);
// the doc vectors were computed at build time by rag/ingest.ts.
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory'
import type { Document } from '@langchain/core/documents'
import { embeddings } from './embeddings'
import vectors from '../../rag/vectors.json'

let store: MemoryVectorStore | null = null
function getStore(): MemoryVectorStore {
  if (!store) {
    store = new MemoryVectorStore(embeddings)
    store.memoryVectors = vectors as typeof store.memoryVectors
  }
  return store
}

/** Query -> the k most similar Pokemon documents. */
export async function retrieve(query: string, k = 6): Promise<Document[]> {
  return getStore().similaritySearch(query, k)
}
