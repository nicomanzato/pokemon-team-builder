// The referee, ported from the v1 lab's validate.py. Pure functions: given the
// parsed team and the ground-truth data, return a list of legality issues.
// Environment-agnostic on purpose — the data is loaded elsewhere (Node reads it
// from disk today; the browser gets a slimmed version later).
import type { PokemonSet } from '../src/types'

export interface GroundTruth {
  dex: Record<string, DexEntry>
  moves: Record<string, unknown> // move id -> data; we only need the keys (existence)
  learnsets: Record<string, { learnset: Record<string, string[]> }>
  // Smogon chaos keyed by species id: moves/abilities actually seen in rated games.
  // Champions changed some learnsets; anything the live simulator allowed is de facto legal.
  observed: Record<string, { Abilities?: Record<string, number>; Moves?: Record<string, number> }>
}

interface DexEntry {
  baseSpecies?: string
  prevo?: string
  requiredItem?: string
  abilities?: Record<string, string>
  types?: string[]
}

export const NATURES = new Set([
  'Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty', 'Bold', 'Docile', 'Relaxed',
  'Impish', 'Lax', 'Timid', 'Hasty', 'Serious', 'Jolly', 'Naive', 'Modest',
  'Mild', 'Quiet', 'Bashful', 'Rash', 'Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky',
])
// Champions EV system, discovered in the usage data: 66 total, 32 max per stat.
const EV_TOTAL_MAX = 66
const EV_STAT_MAX = 32

export const toId = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

// Union of learnsets across the inheritance chain: formes inherit from their base
// species, evolutions from their prevos. Returns null if we have no learnset data
// for the whole chain (unknown -> don't flag moves as unlearnable).
function learnsetFor(speciesId: string, gt: GroundTruth): Set<string> | null {
  const moves = new Set<string>()
  const queue = [speciesId]
  const seen = new Set<string>()
  while (queue.length) {
    const sid = queue.pop()!
    if (!sid || seen.has(sid)) continue
    seen.add(sid)
    if (gt.learnsets[sid]) for (const m of Object.keys(gt.learnsets[sid].learnset)) moves.add(m)
    const entry = gt.dex[sid] ?? {}
    for (const link of ['baseSpecies', 'prevo'] as const) {
      if (entry[link]) queue.push(toId(entry[link]!))
    }
  }
  return moves.size ? moves : null
}

/** Returns a list of issue strings. Empty list = legal team. */
export function validateTeam(mons: PokemonSet[], gt: GroundTruth): string[] {
  const issues: string[] = []
  if (mons.length !== 6) issues.push(`team has ${mons.length} Pokemon, needs 6`)

  const seenSpecies = new Set<string>()
  const seenItems = new Set<string>()
  for (const mon of mons) {
    const name = mon.species
    const sid = toId(name)
    const entry = gt.dex[sid]
    if (!entry) {
      issues.push(`${name}: does not exist`)
      continue
    }

    const base = toId(entry.baseSpecies ?? name)
    if (seenSpecies.has(base)) issues.push(`${name}: species clause violation (duplicate)`)
    seenSpecies.add(base)

    if (!mon.item) {
      issues.push(`${name}: no held item`)
    } else {
      const itemId = toId(mon.item)
      if (seenItems.has(itemId)) issues.push(`${name}: item clause violation (${mon.item} repeated)`)
      seenItems.add(itemId)
      const required = entry.requiredItem
      if (required && itemId !== toId(required)) {
        issues.push(`${name}: must hold ${required}, holds ${mon.item}`)
      }
    }

    const observed = gt.observed[sid] ?? {}
    const legalAbilities = new Set<string>()
    for (const a of Object.values(entry.abilities ?? {})) legalAbilities.add(toId(a))
    for (const a of Object.values(gt.dex[base]?.abilities ?? {})) legalAbilities.add(toId(a))
    for (const a of Object.keys(observed.Abilities ?? {})) legalAbilities.add(a)
    if (mon.ability && !legalAbilities.has(toId(mon.ability))) {
      issues.push(`${name}: illegal ability ${mon.ability}`)
    }

    if (mon.nature && !NATURES.has(capitalize(mon.nature))) {
      issues.push(`${name}: invalid nature ${mon.nature}`)
    }

    const totalEvs = Object.values(mon.evs).reduce((a, b) => a + b, 0)
    if (totalEvs > EV_TOTAL_MAX) {
      issues.push(`${name}: EVs total ${totalEvs} > ${EV_TOTAL_MAX} (Champions system)`)
    }
    for (const [stat, val] of Object.entries(mon.evs)) {
      if (val > EV_STAT_MAX) issues.push(`${name}: ${val} ${stat} EVs > max ${EV_STAT_MAX}`)
    }

    if (mon.moves.length !== 4) issues.push(`${name}: has ${mon.moves.length} moves, needs 4`)
    const learnset = learnsetFor(sid, gt)
    if (learnset) for (const m of Object.keys(observed.Moves ?? {})) learnset.add(m)
    for (const move of mon.moves) {
      const mid = toId(move)
      if (!(mid in gt.moves)) issues.push(`${name}: move ${move} does not exist`)
      else if (learnset && !learnset.has(mid)) issues.push(`${name}: cannot learn ${move}`)
    }
  }
  return issues
}
