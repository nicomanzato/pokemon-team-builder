// Parse a Showdown paste (possibly with model prose around it) into structured
// sets. Pure and environment-agnostic — used by the web engine and by the Node
// eval alike.
import type { PokemonSet } from '../src/types'

const EV_KEYS = new Set(['hp', 'atk', 'def', 'spa', 'spd', 'spe'])

// A block starts at a line containing " @ " (the item).
// ponytail: dex-based species detection (and real `types`) lands with the data
// step; here every mon gets types: [] and the card falls back to a neutral color.
export function parsePaste(text: string): PokemonSet[] {
  const mons: PokemonSet[] = []
  let mon: PokemonSet | null = null
  for (const raw of text.split('\n')) {
    const line = raw.trim().replace(/^`+|`+$/g, '')
    if (!line) continue
    if (line.includes(' @ ') && !line.startsWith('-')) {
      const [rawHead, item] = line.split(' @ ')
      // Strip a trailing gender marker "(M)"/"(F)"; a remaining paren is the
      // nickname form "Nickname (Species)" -> Species, else the head is species.
      const head = rawHead.replace(/\s*\((?:M|F)\)\s*$/, '').trim()
      const species = head.match(/\(([^)]+)\)/)?.[1] ?? head
      mon = { species, item: item.trim(), ability: '', level: null, nature: '', evs: {}, moves: [], types: [] }
      mons.push(mon)
    } else if (!mon) {
      continue
    } else if (line.startsWith('Ability:')) {
      mon.ability = line.slice(8).trim()
    } else if (line.startsWith('Level:')) {
      mon.level = line.slice(6).trim()
    } else if (line.startsWith('EVs:')) {
      for (const part of line.slice(4).split('/')) {
        const m = part.trim().match(/^(\d+)\s+(\w+)/)
        if (m && EV_KEYS.has(m[2].toLowerCase())) mon.evs[m[2].toLowerCase()] = Number(m[1])
      }
    } else if (line.endsWith('Nature')) {
      mon.nature = line.replace('Nature', '').trim()
    } else if (line.startsWith('-')) {
      mon.moves.push(line.replace(/^-\s*/, '').trim())
    }
  }
  return mons
}
