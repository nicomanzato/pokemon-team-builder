// Node-only loader for the validator's ground truth. Reads the Showdown data and
// the Smogon chaos from disk (ai/data, gitignored). The browser will get a
// slimmed version later — this file never reaches the bundle.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { toId, type GroundTruth } from './validate'

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), 'data')
const readJson = (p: string) => JSON.parse(readFileSync(join(DATA_DIR, p), 'utf8'))

export function loadGroundTruth(): GroundTruth {
  const chaos = readJson('smogon/regmb.json').data as Record<string, unknown>
  const observed: GroundTruth['observed'] = {}
  for (const [name, entry] of Object.entries(chaos)) observed[toId(name)] = entry as never
  return {
    dex: readJson('showdown/pokedex.json'),
    moves: readJson('showdown/moves.json'),
    learnsets: readJson('showdown/learnsets.json'),
    observed,
  }
}
