// RAG retrieval that runs entirely in the browser: shipped profile vectors +
// pre-rendered dossier lines, query embedded live with transformers.js. Mirrors
// retrieve.ts but with zero server, zero 12MB chaos — the Pages-ready half.
import profileVectors from '../assets/profileVectors.json'
import dossierData from '../assets/dossierData.json'
import { embedTexts } from './embedBrowser'
import { DOSSIER_INTRO } from '../prompt'
import { toId } from '../../format'

const INDEX = profileVectors as { items: { id: string; name: string; vec: number[] }[] }
const DATA = dossierData as Record<string, { name: string; line: string; teammates: string[] }>

// Vectors are L2-normalized, so cosine similarity is just the dot product.
function topIds(query: number[], k: number): string[] {
  return INDEX.items
    .map((it) => {
      let dot = 0
      for (let i = 0; i < query.length; i++) dot += query[i] * it.vec[i]
      return { id: it.id, score: dot }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((s) => s.id)
}

/** Strategy in, dossier of real facts out — the browser-side retrieval. */
export async function browserDossier(query: string): Promise<string> {
  const [qvec] = await embedTexts([query])
  const hits = topIds(qvec, 6)
  const chosen = [...hits]
  for (const id of hits) {
    for (const mate of (DATA[id]?.teammates ?? []).slice(0, 2)) {
      const mid = toId(mate)
      if (DATA[mid] && !chosen.includes(mid)) chosen.push(mid)
    }
  }
  return DOSSIER_INTRO + chosen.slice(0, 10).map((id) => DATA[id].line).join('\n')
}
