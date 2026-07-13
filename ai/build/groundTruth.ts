// Node-only loader for the validator's ground truth. Reads the Showdown data and
// the Smogon chaos from disk (ai/data, gitignored). The browser will get a
// slimmed version later — this file never reaches the bundle.
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { toId } from '../format'
import type { GroundTruth } from './validate'

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), 'data')
const readJson = (p: string) => JSON.parse(readFileSync(join(DATA_DIR, p), 'utf8'))

// A Smogon "chaos" entry: weighted counts (not percentages) of what this species
// ran in rated games. Keyed by display name ("Mawile-Mega", "Garchomp").
export interface ChaosEntry {
  usage: number
  Abilities: Record<string, number>
  Items: Record<string, number>
  Moves: Record<string, number>
  Spreads: Record<string, number>
  Teammates: Record<string, number>
}

export const loadChaos = (): Record<string, ChaosEntry> => readJson('smogon/regmb.json').data
export const loadDex = (): Record<string, DexEntryLite> => readJson('showdown/pokedex.json')

// move id -> display name ("flareblitz" -> "Flare Blitz")
export const loadMoveNames = (): Record<string, string> => {
  const moves = readJson('showdown/moves.json') as Record<string, { name: string }>
  return Object.fromEntries(Object.entries(moves).map(([id, m]) => [id, m.name]))
}

// item id -> display name ("lifeorb" -> "Life Orb") — items.json is already this map
export const loadItemNames = (): Record<string, string> => readJson('showdown/items.json')

export interface DexEntryLite {
  name?: string
  types?: string[]
  baseStats?: Record<string, number>
  requiredItem?: string
  abilities?: Record<string, string>
  baseSpecies?: string
}

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
