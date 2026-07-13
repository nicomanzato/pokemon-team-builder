// Ingestion: build the vector store and save it to vectors.json.
// Run this once (or whenever the docs change):
//   npx tsx rag/ingest.ts
import 'dotenv/config'
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DirectoryLoader } from '@langchain/classic/document_loaders/fs/directory'
import { TextLoader } from '@langchain/classic/document_loaders/fs/text'
import { CharacterTextSplitter } from '@langchain/textsplitters'
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory'
import { embeddings } from './embeddings'

const HERE = dirname(fileURLToPath(import.meta.url))

async function main() {
  // 1. LOAD — one Document per .txt file
  console.log('Loading documents…')
  const docs = await new DirectoryLoader(join(HERE, 'docs'), {
    '.txt': (path) => new TextLoader(path),
  }).load()
  console.log(`  loaded ${docs.length} documents`)

  // 2. SPLIT — our profiles are tiny, so each stays one chunk
  const chunks = await new CharacterTextSplitter({ chunkSize: 1000, chunkOverlap: 0 }).splitDocuments(docs)

  // 3. EMBED + 4. STORE
  console.log('Embedding + building the vector store…')
  const store = await MemoryVectorStore.fromDocuments(chunks, embeddings)

  // 5. SAVE — memoryVectors is [{ content, embedding, metadata }], just serialize it
  writeFileSync(join(HERE, 'vectors.json'), JSON.stringify(store.memoryVectors))
  console.log(`  saved ${store.memoryVectors.length} vectors to vectors.json`)
}

main()
