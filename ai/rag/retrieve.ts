// The retrieval half of RAG: strategy -> a dossier of real metagame facts.
// Semantic hits (embeddings) get expanded with their real-world teammates — a
// million ladder games already decided who works with whom — then each Pokemon
// is turned into a compact fact sheet for the model to build from.
import { search } from './embed'
import { topKeys } from './profiles'
import { DOSSIER_INTRO } from '../prompt'
import { toId } from '../validate'
import { loadChaos, loadDex, loadMoveNames, loadItemNames } from '../groundTruth'
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

// Semantic hits + their frequent teammates, capped at 18 Pokemon.
async function retrieve(
  strategy: string,
  chaos: Record<string, ChaosEntry>,
  k = 6,
  matesPerHit = 2,
): Promise<string[]> {
  const hits = (await search(strategy, k)).map((h) => h.name)
  const expanded = [...hits]
  for (const name of hits) {
    for (const mate of topKeys(chaos[name].Teammates, matesPerHit)) {
      if (chaos[mate] && !expanded.includes(mate)) expanded.push(mate)
    }
  }
  // A short list: enough to choose 6 from, few enough that the weak model doesn't
  // try to stat-block every one. ponytail: raise if teams get repetitive.
  return expanded.slice(0, 10)
}

/** One Pokemon's fact sheet. Exported so the browser build can precompute lines. */
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

function dossier(
  names: string[],
  chaos: Record<string, ChaosEntry>,
  dex: Record<string, DexEntryLite>,
  moveNames: Record<string, string>,
  itemNames: Record<string, string>,
): string {
  return names.map((name) => dossierLine(name, chaos, dex, moveNames, itemNames)).join('\n')
}

/** Render the dossier block for a given list of Pokemon. Pure — the caller
 * supplies the data. Used both at inference (from retrieval) and when baking
 * dossiers into the fine-tune dataset. */
export function renderDossier(
  names: string[],
  chaos: Record<string, ChaosEntry>,
  dex: Record<string, DexEntryLite>,
  moveNames: Record<string, string>,
  itemNames: Record<string, string>,
): string {
  return DOSSIER_INTRO + dossier(names, chaos, dex, moveNames, itemNames)
}

/** Strategy in, dossier of real facts out. Reusable by any model. */
export async function ragContext(strategy: string): Promise<string> {
  const chaos = loadChaos()
  const names = await retrieve(strategy, chaos)
  return renderDossier(names, chaos, loadDex(), loadMoveNames(), loadItemNames())
}
