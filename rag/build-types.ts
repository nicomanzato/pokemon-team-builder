// Build a slim species-id -> types map for card colors, from the pokedex.
// Ships to the browser (small). Run when the dex changes:
//   npx tsx rag/build-types.ts
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const dex: Record<string, { types?: string[] }> = JSON.parse(
  readFileSync(join(HERE, 'data', 'pokedex.json'), 'utf8'),
)

const types: Record<string, string[]> = {}
for (const [id, entry] of Object.entries(dex)) {
  if (entry.types) types[id] = entry.types
}

const out = join(HERE, '..', 'src', 'rag', 'pokemonTypes.json')
writeFileSync(out, JSON.stringify(types))
console.log(`wrote ${out}: ${Object.keys(types).length} species`)
