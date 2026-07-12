// One competitive text profile per Pokemon, built from the Smogon usage data
// (+ dex for types/stats). This is the document that gets embedded: the words in
// it are what a strategy query will match against semantically.
import { toId } from '../validate'
import type { ChaosEntry, DexEntryLite } from '../groundTruth'

const STAT_ORDER = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const

// Top keys by weighted count, dropping rare noise (< minShare of the total).
export function topKeys(counts: Record<string, number>, n: number, minShare = 0.03): string[] {
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .filter(([k, v]) => k && k !== 'nothing' && v / total >= minShare)
    .map(([k]) => k)
}

function dexEntry(name: string, dex: Record<string, DexEntryLite>): DexEntryLite {
  return dex[toId(name)] ?? dex[toId(name.split('-Mega')[0])] ?? {}
}

function speedHint(spe: number): string {
  if (spe <= 50) return 'very slow, great under Trick Room'
  if (spe <= 70) return 'slow'
  if (spe >= 110) return 'very fast'
  if (spe >= 90) return 'fast'
  return 'medium speed'
}

export interface Profile {
  id: string
  name: string
  text: string
}

/** Build a profile per Pokemon in the chaos data. */
export function buildProfiles(chaos: Record<string, ChaosEntry>, dex: Record<string, DexEntryLite>): Profile[] {
  const profiles: Profile[] = []
  for (const [name, c] of Object.entries(chaos)) {
    const entry = dexEntry(name, dex)
    const base = entry.baseStats ?? {}
    const stats = STAT_ORDER.map((s) => `${s} ${base[s] ?? '?'}`).join(', ')
    const ability = topKeys(c.Abilities, 1)[0] ?? '?'
    const moves = topKeys(c.Moves, 8).join(', ')
    const mates = topKeys(c.Teammates, 5).join(', ')
    const text =
      `${name}. Type: ${(entry.types ?? ['?']).join('/')}. ` +
      `Base stats: ${stats}. ${speedHint(base.spe ?? 80)}. ` +
      `Common ability: ${ability}. ` +
      `Frequently used moves: ${moves}. ` +
      `Frequently paired with: ${mates}.`
    profiles.push({ id: toId(name), name, text })
  }
  return profiles
}
