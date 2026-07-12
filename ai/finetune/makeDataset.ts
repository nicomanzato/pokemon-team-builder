// Synthesize the fine-tuning dataset from the usage data — no hand-written teams.
// Each example walks the real Teammates graph from an archetype seed and dresses
// every Pokemon in its most common set. Teams are legal by construction (the item
// clause is enforced here), so the model trains only on rule-abiding output.
//   npx tsx ai/finetune/makeDataset.ts
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { toId } from '../validate'
import { loadChaos, loadDex, loadMoveNames, loadItemNames } from '../groundTruth'
import type { ChaosEntry, DexEntryLite } from '../groundTruth'
import { FT_SYSTEM as SYSTEM } from '../prompt'

const STAT_LABELS = ['HP', 'Atk', 'Def', 'SpA', 'SpD', 'Spe']
const PHRASINGS = [
  'Build me {}.',
  'I want {} for the current regulation.',
  'Can you put together {}?',
  'Make {} please.',
  'Team request: {}',
]

// Seeded RNG (mulberry32) so the dataset is reproducible.
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const rand = mulberry32(42)
const choice = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]

const chaos = loadChaos()
const dex = loadDex()
const moveNames = loadMoveNames()
const itemNames = loadItemNames()
// only build with reasonably common Pokemon: enough games for reliable sets
const pool: Record<string, ChaosEntry> = Object.fromEntries(
  Object.entries(chaos).filter(([, c]) => c.usage >= 0.005),
)

const share = (counts: Record<string, number>, key: string) => {
  const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1
  return (counts[key] ?? 0) / total
}
const topKeys = (counts: Record<string, number>, n?: number): string[] => {
  const ranked = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k)
    .filter((k) => k && k !== 'nothing')
  return n ? ranked.slice(0, n) : ranked
}

const entry = (name: string): DexEntryLite =>
  dex[toId(name)] ?? dex[toId(name.split('-Mega')[0])] ?? {}
const speed = (name: string) => entry(name).baseStats?.spe ?? 100
const baseSpecies = (name: string) => toId(entry(name).baseSpecies ?? name)

function buildTeam(seed: string, bonus?: (m: string) => number): string[] | null {
  const team = [seed]
  while (team.length < 6) {
    const weights: Record<string, number> = {}
    for (const member of team)
      for (const [mate, w] of Object.entries(chaos[member].Teammates))
        if (pool[mate]) weights[mate] = (weights[mate] ?? 0) + w
    const usedBases = new Set(team.map(baseSpecies))
    const candidates = Object.entries(weights)
      .filter(([mate]) => !usedBases.has(baseSpecies(mate)))
      .map(([mate, w]) => [w * (bonus ? bonus(mate) : 1), mate] as [number, string])
    if (!candidates.length) return null
    const top3 = candidates.sort((a, b) => b[0] - a[0]).slice(0, 3)
    team.push(choice(top3)[1])
  }
  return team
}

function renderSet(name: string, usedItems: Set<string>): string | null {
  const c = chaos[name]
  const e = entry(name)
  const required = e.requiredItem
  const item = required ?? topKeys(c.Items).find((i) => !usedItems.has(i))
  if (!item) return null
  usedItems.add(toId(item))

  const abilityId = topKeys(c.Abilities, 1)[0]
  const ability = Object.values(e.abilities ?? {}).find((a) => toId(a) === abilityId) ?? abilityId
  const moves = topKeys(c.Moves, 4).map((m) => moveNames[m] ?? m)
  if (moves.length < 4) return null

  const [nature, nums] = choice(topKeys(c.Spreads, 3)).split(':')
  const evs = nums
    .split('/')
    .map((v, i) => (v !== '0' ? `${v} ${STAT_LABELS[i]}` : ''))
    .filter(Boolean)
    .join(' / ')

  const itemName = required ?? itemNames[item] ?? item
  const lines = [`${name} @ ${itemName}`, `Ability: ${ability}`, 'Level: 50']
  if (evs) lines.push(`EVs: ${evs}`)
  lines.push(`${nature} Nature`, ...moves.map((m) => `- ${m}`))
  return lines.join('\n')
}

function renderTeam(team: string[]): string | null {
  const usedItems = new Set<string>()
  const blocks: string[] = []
  for (const name of team) {
    const block = renderSet(name, usedItems)
    if (!block) return null
    blocks.push(block)
  }
  return blocks.join('\n\n')
}

type Arc = [desc: string | null, seeds: string[], bonus: ((m: string) => number) | null]
function archetypes(): Arc[] {
  const has = (pred: (c: ChaosEntry) => boolean) =>
    Object.entries(pool).filter(([, c]) => pred(c)).map(([n]) => n)
  return [
    ['a Trick Room team', has((c) => share(c.Moves, 'trickroom') >= 0.15), (m) => (speed(m) <= 70 ? 3 : 1)],
    ['a rain team', has((c) => share(c.Abilities, 'drizzle') >= 0.5), (m) => ((entry(m).types ?? []).includes('Water') ? 2 : 1)],
    ['a sun team', has((c) => share(c.Abilities, 'drought') >= 0.5), (m) => ((entry(m).types ?? []).includes('Fire') ? 2 : 1)],
    ['a hyper offense team with Tailwind', has((c) => share(c.Moves, 'tailwind') >= 0.15), (m) => (speed(m) >= 90 ? 2 : 1)],
    [null, Object.keys(pool).sort((a, b) => pool[b].usage - pool[a].usage).slice(0, 40), null],
  ]
}

function main() {
  const arcs = archetypes()
  for (const [desc, seeds] of arcs) console.log(`archetype ${desc ?? 'balanced around X'}: ${seeds.length} seeds`)

  const examples: unknown[] = []
  const seen = new Set<string>()
  let attempts = 0
  while (examples.length < 400 && attempts < 20000) {
    attempts++
    const [desc, seeds, bonus] = choice(arcs)
    if (!seeds.length) continue
    const seed = choice(seeds)
    const team = buildTeam(seed, bonus ?? undefined)
    if (!team) continue
    const key = [...team].sort().join(',')
    if (seen.has(key)) continue
    const paste = renderTeam(team)
    if (!paste) continue
    seen.add(key)
    const instruction = choice(PHRASINGS).replace('{}', desc ?? `a balanced team built around ${seed}`)
    examples.push({ messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: instruction },
      { role: 'assistant', content: paste },
    ] })
  }

  // Fisher-Yates shuffle, then 90/10 split.
  for (let i = examples.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[examples[i], examples[j]] = [examples[j], examples[i]]
  }
  const split = Math.floor(examples.length * 0.9)
  const dataDir = join(dirname(fileURLToPath(import.meta.url)), 'data')
  mkdirSync(dataDir, { recursive: true })
  for (const [file, chunk] of [['train.jsonl', examples.slice(0, split)], ['valid.jsonl', examples.slice(split)]] as const) {
    writeFileSync(join(dataDir, file), chunk.map((e) => JSON.stringify(e)).join('\n') + '\n')
    console.log(`wrote ${file}: ${chunk.length} examples`)
  }
}

main()
