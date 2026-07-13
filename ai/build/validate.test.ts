// Validator self-check. Needs the local data (ai/data). Run it directly:
//   npx tsx ai/validate.test.ts
import assert from 'node:assert'
import type { PokemonSet } from '../../src/types'
import { validateTeam } from './validate'
import { loadGroundTruth } from './groundTruth'

const gt = loadGroundTruth()

const mon = (over: Partial<PokemonSet>): PokemonSet => ({
  species: 'Incineroar', item: 'Assault Vest', ability: '', level: '50',
  nature: 'Adamant', evs: {}, moves: [], types: [], ...over,
})
const has = (issues: string[], needle: string) =>
  assert.ok(issues.some((i) => i.includes(needle)), `expected an issue with "${needle}", got: ${issues.join('; ') || '(none)'}`)

// --- crafted violations (deterministic) ---
has(validateTeam([mon({})], gt), 'needs 6') // 1 mon, not 6
has(validateTeam([mon({ species: 'Notarealmon' })], gt), 'does not exist')
has(validateTeam([mon({ item: 'Leftovers' }), mon({ item: 'Sitrus Berry' })], gt), 'species clause')
has(validateTeam([mon({ species: 'Incineroar', item: 'Leftovers' }), mon({ species: 'Rillaboom', item: 'Leftovers' })], gt), 'item clause')
has(validateTeam([mon({ evs: { atk: 33 } })], gt), '> max 32')
has(validateTeam([mon({ evs: { hp: 32, atk: 32, def: 32 } })], gt), 'EVs total')
has(validateTeam([mon({ moves: ['Fake Out', 'Flare Blitz', 'Parting Shot'] })], gt), 'needs 4')
has(validateTeam([mon({ moves: ['Definitelynotamove', 'a', 'b', 'c'] })], gt), 'does not exist')

// --- positive: a real set built from observed data must be clean on the learnability path ---
const sid = Object.keys(gt.observed).find((s) => {
  const e = gt.dex[s]
  const realMoves = Object.keys(gt.observed[s].Moves ?? {}).filter((m) => m in gt.moves)
  return e && Object.keys(e.abilities ?? {}).length >= 1 && realMoves.length >= 4 && !e.requiredItem
})
assert.ok(sid, 'found a species with enough observed data')
const entry = gt.dex[sid!]
const legalMon = mon({
  species: sid!,
  item: 'Sitrus Berry',
  ability: Object.values(entry.abilities!)[0],
  moves: Object.keys(gt.observed[sid!].Moves!).filter((m) => m in gt.moves).slice(0, 4),
})
const legalIssues = validateTeam([legalMon], gt)
assert.ok(
  !legalIssues.some((i) => /cannot learn|illegal ability|does not exist/.test(i)),
  `legal mon should be clean on learnability, got: ${legalIssues.join('; ')}`,
)

console.log('ok: validateTeam passes')
