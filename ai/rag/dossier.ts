// Render one Pokemon's fact sheet from the usage data. Used at build time by
// buildBrowserIndex to precompute the dossier lines the browser ships (retrieval
// itself now lives in browserRag.ts).
import { topKeys } from './profiles'
import { toId } from '../validate'
import type { ChaosEntry, DexEntryLite } from '../groundTruth'

const STAT_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const
const STAT_LABELS = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe']

function dexEntry(name: string, dex: Record<string, DexEntryLite>): DexEntryLite {
  return dex[toId(name)] ?? dex[toId(name.split('-Mega')[0])] ?? {}
}

// "Quiet:17/0/19/10/20/0" -> "Quiet, EVs: 17 HP / 19 Def / 10 SpA / 20 SpD"
function prettySpread(spread: string): string {
  const [nature, nums] = spread.split(':')
  const evs = nums
    .split('/')
    .map((v, i) => (v !== '0' ? `${v} ${STAT_LABELS[i]}` : ''))
    .filter(Boolean)
    .join(' / ')
  return `${nature}, EVs: ${evs}`
}

export function dossierLine(
  name: string,
  chaos: Record<string, ChaosEntry>,
  dex: Record<string, DexEntryLite>,
  moveNames: Record<string, string>,
  itemNames: Record<string, string>,
): string {
  const c = chaos[name]
  const entry = dexEntry(name, dex)
  const stats = STAT_KEYS.map((s) => entry.baseStats?.[s] ?? '?').join('/')
  const items = entry.requiredItem
    ? [entry.requiredItem]
    : topKeys(c.Items, 3).map((i) => itemNames[i] ?? i)
  const topSpread = Object.entries(c.Spreads).sort((a, b) => b[1] - a[1])[0][0]
  const moves = topKeys(c.Moves, 8).map((m) => moveNames[m] ?? m).join(', ')
  return (
    `- ${name} | type ${(entry.types ?? ['?']).join('/')} | base stats ${stats} (HP/Atk/Def/SpA/SpD/Spe)\n` +
    `  ability: ${topKeys(c.Abilities, 1)[0]} | items: ${items.join(', ')}\n` +
    `  moves it actually runs: ${moves}\n` +
    `  most common set: ${prettySpread(topSpread)}\n` +
    `  frequent teammates: ${topKeys(c.Teammates, 5).join(', ')}`
  )
}
