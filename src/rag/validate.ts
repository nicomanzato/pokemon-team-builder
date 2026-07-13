// Light legality check for the repair-free path: everything that needs no extra
// data (structure, EV caps, item/species clauses, species exists). It can't check
// learnsets, so it's an honest partial referee.
import type { PokemonSet } from '../types'
import speciesTypes from './pokemonTypes.json'

const VALID = new Set(Object.keys(speciesTypes as Record<string, string[]>))
const NATURES = new Set([
  'Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty', 'Bold', 'Docile', 'Relaxed',
  'Impish', 'Lax', 'Timid', 'Hasty', 'Serious', 'Jolly', 'Naive', 'Modest',
  'Mild', 'Quiet', 'Bashful', 'Rash', 'Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky',
])
const toId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

export function validateTeam(mons: PokemonSet[]): string[] {
  const issues: string[] = []
  if (mons.length !== 6) issues.push(`the team has ${mons.length} Pokemon, it must have exactly 6`)

  const seenSpecies = new Set<string>()
  const seenItems = new Set<string>()
  for (const mon of mons) {
    const sid = toId(mon.species)
    if (!VALID.has(sid) && !VALID.has(toId(mon.species.split('-Mega')[0]))) {
      issues.push(`${mon.species} is not a real Pokemon`)
      continue
    }
    if (seenSpecies.has(sid)) issues.push(`${mon.species} is a duplicate`)
    seenSpecies.add(sid)

    if (!mon.item) issues.push(`${mon.species} has no item`)
    else {
      const it = toId(mon.item)
      if (seenItems.has(it)) issues.push(`the item ${mon.item} is used more than once`)
      seenItems.add(it)
    }
    if (mon.nature && !NATURES.has(cap(mon.nature))) issues.push(`${mon.species} has an invalid nature (${mon.nature})`)

    const total = Object.values(mon.evs).reduce((a, b) => a + b, 0)
    if (total > 66) issues.push(`${mon.species} has ${total} total EVs (max 66 in this format)`)
    for (const [stat, val] of Object.entries(mon.evs)) {
      if (val > 32) issues.push(`${mon.species} has ${val} ${stat} EVs (max 32 per stat)`)
    }
    if (mon.moves.length !== 4) issues.push(`${mon.species} has ${mon.moves.length} moves, needs 4`)
  }
  return issues
}
