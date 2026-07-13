// Browser-safe subset of the validator: everything that needs NO extra data
// (structure, EV caps, species existence, item/species clauses). It cannot check
// learnset legality (that needs the 3MB learnsets we don't ship), so it's the
// referee for the in-browser repair loop, not the full Node validator.
import type { PokemonSet } from '../../src/types'
import { toId, NATURES, capitalize } from '../format'
import speciesTypes from './assets/pokemonTypes.json'

const VALID_SPECIES = new Set(Object.keys(speciesTypes as Record<string, string[]>))

export function validateLight(mons: PokemonSet[]): string[] {
  const issues: string[] = []
  if (mons.length !== 6) issues.push(`the team has ${mons.length} Pokemon, it must have exactly 6`)

  const seenSpecies = new Set<string>()
  const seenItems = new Set<string>()
  for (const mon of mons) {
    const name = mon.species
    const sid = toId(name)
    if (!VALID_SPECIES.has(sid) && !VALID_SPECIES.has(toId(name.split('-Mega')[0]))) {
      issues.push(`${name} is not a real Pokemon`)
      continue
    }
    if (seenSpecies.has(sid)) issues.push(`${name} is a duplicate species`)
    seenSpecies.add(sid)

    if (!mon.item) issues.push(`${name} has no held item`)
    else {
      const it = toId(mon.item)
      if (seenItems.has(it)) issues.push(`the item ${mon.item} is used more than once`)
      seenItems.add(it)
    }
    if (!mon.ability) issues.push(`${name} has no ability`)
    if (mon.nature && !NATURES.has(capitalize(mon.nature))) issues.push(`${name} has an invalid nature (${mon.nature})`)

    const total = Object.values(mon.evs).reduce((a, b) => a + b, 0)
    if (total > 66) issues.push(`${name} has ${total} total EVs (max is 66 in this format)`)
    for (const [stat, val] of Object.entries(mon.evs)) {
      if (val > 32) issues.push(`${name} has ${val} ${stat} EVs (max is 32 per stat)`)
    }
    if (mon.moves.length !== 4) issues.push(`${name} has ${mon.moves.length} moves, it must have exactly 4`)
  }
  return issues
}
