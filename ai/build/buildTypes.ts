// Build a slim species-id -> types map from the full pokedex, small enough to
// ship to the browser (the full dex stays Node-only). Run when the dex changes:
//   npx tsx ai/buildTypes.ts
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { loadDex } from './groundTruth'

const types: Record<string, string[]> = {}
for (const [id, entry] of Object.entries(loadDex())) {
  if (entry.types) types[id] = entry.types
}
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'runtime', 'assets', 'pokemonTypes.json')
writeFileSync(out, JSON.stringify(types))
console.log(`wrote ${out}: ${Object.keys(types).length} species`)
