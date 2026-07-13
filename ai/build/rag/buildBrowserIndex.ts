// Build the two static assets the browser RAG needs, so the 12MB chaos + the dex
// never ship. Run when the meta changes:
//   npx tsx ai/rag/buildBrowserIndex.ts
//
//   profileVectors.json : { model, items: [{id, name, vec}] }  (transformers.js embeddings)
//   dossierData.json    : { id: {name, line, teammates[]} }     (pre-rendered fact sheets)
import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildProfiles, topKeys } from './profiles'
import { dossierLine } from './dossier'
import { embedTexts } from '../../runtime/rag/embedBrowser'
import { loadChaos, loadDex, loadMoveNames, loadItemNames } from '../groundTruth'

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'runtime', 'assets')

async function main() {
  const chaos = loadChaos()
  const dex = loadDex()
  const moveNames = loadMoveNames()
  const itemNames = loadItemNames()
  const profiles = buildProfiles(chaos, dex)

  console.log(`embedding ${profiles.length} profiles with transformers.js…`)
  const vecs = await embedTexts(profiles.map((p) => p.text))
  const round = (v: number) => Math.round(v * 1e5) / 1e5 // trim JSON size
  writeFileSync(join(ASSETS, 'profileVectors.json'), JSON.stringify({
    model: 'all-MiniLM-L6-v2',
    items: profiles.map((p, i) => ({ id: p.id, name: p.name, vec: vecs[i].map(round) })),
  }))

  const dossierData: Record<string, { name: string; line: string; teammates: string[] }> = {}
  for (const p of profiles) {
    dossierData[p.id] = {
      name: p.name,
      line: dossierLine(p.name, chaos, dex, moveNames, itemNames),
      teammates: topKeys(chaos[p.name].Teammates, 5).filter((m) => chaos[m]),
    }
  }
  writeFileSync(join(ASSETS, 'dossierData.json'), JSON.stringify(dossierData))
  console.log(`wrote profileVectors.json + dossierData.json (${profiles.length} mons)`)
}

main()
