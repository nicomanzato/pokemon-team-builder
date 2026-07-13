// Parse the model's Showdown-ish paste into structured Pokemon the UI can render
// as cards. Tolerant of the small model's quirks (e.g. "Nature: X" vs "X Nature").
import type { PokemonSet } from '../types'
import speciesTypes from './pokemonTypes.json'

const TYPES = speciesTypes as Record<string, string[]>
const EV_KEYS = new Set(['hp', 'atk', 'def', 'spa', 'spd', 'spe'])

const toId = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')
// the model likes "Bold (-Defense)" — keep just the nature name
const cleanNature = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, '').trim()
const typesOf = (species: string): string[] =>
  TYPES[toId(species)] ?? TYPES[toId(species.split('-Mega')[0])] ?? []

export function parsePaste(text: string): PokemonSet[] {
  const mons: PokemonSet[] = []
  let mon: PokemonSet | null = null
  for (const raw of text.split('\n')) {
    const line = raw.trim().replace(/^`+|`+$/g, '')
    if (!line) continue

    // species line: "Species @ Item" (may have a nickname or gender marker)
    if (line.includes(' @ ') && !line.startsWith('-')) {
      const [rawHead, item] = line.split(' @ ')
      const head = rawHead.replace(/\s*\((?:M|F)\)\s*$/, '').trim()
      const species = (head.match(/\(([^)]+)\)/)?.[1] ?? head).replace(/[<>]/g, '').trim()
      mon = { species, item: item.trim(), ability: '', level: null, nature: '', evs: {}, moves: [], types: typesOf(species) }
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
    } else if (line.startsWith('Nature:')) {
      mon.nature = cleanNature(line.slice(7)) // "Nature: Jolly"
    } else if (line.endsWith('Nature')) {
      mon.nature = cleanNature(line.replace('Nature', '')) // "Jolly Nature"
    } else if (line.startsWith('-')) {
      mon.moves.push(line.replace(/^-\s*/, '').trim())
    }
  }
  return mons
}
