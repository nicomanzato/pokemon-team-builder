// Generates one profile .txt per Pokemon in rag/docs/, from the real Smogon
// usage data. These are the "documents" your LangChain ingestion loads.
//   npx tsx rag/generate-docs.ts
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const readJson = (p: string) => JSON.parse(readFileSync(join(HERE, 'data', p), 'utf8'))

// --- load the data ---
const chaos: Record<string, ChaosEntry> = readJson('regmb.json').data
const dex: Record<string, DexEntry> = readJson('pokedex.json')
const moveNames: Record<string, string> = mapNames(readJson('moves.json'))
const itemNames: Record<string, string> = readJson('items.json') // already id -> name

interface ChaosEntry {
  usage: number
  Abilities: Record<string, number>
  Items: Record<string, number>
  Moves: Record<string, number>
  Teammates: Record<string, number>
}
interface DexEntry { types?: string[]; baseStats?: Record<string, number>; abilities?: Record<string, string> }

function mapNames(moves: Record<string, { name: string }>): Record<string, string> {
  return Object.fromEntries(Object.entries(moves).map(([id, m]) => [id, m.name]))
}

const toId = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')

// top N keys of a "counts" object, ignoring noise
function topKeys(counts: Record<string, number>, n: number): string[] {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k)
    .filter((k) => k && k !== 'nothing')
    .slice(0, n)
}

function dexEntry(name: string): DexEntry {
  return dex[toId(name)] ?? dex[toId(name.split('-Mega')[0])] ?? {}
}

function speedHint(spe: number): string {
  if (spe <= 50) return 'very slow, great under Trick Room'
  if (spe <= 70) return 'slow'
  if (spe >= 110) return 'very fast'
  if (spe >= 90) return 'fast'
  return 'medium speed'
}

// resolve an ability id ("intimidate") to its display name ("Intimidate")
function abilityName(id: string, entry: DexEntry): string {
  return Object.values(entry.abilities ?? {}).find((a) => toId(a) === id) ?? id
}

function profileText(name: string): string {
  const c = chaos[name]
  const entry = dexEntry(name)
  const types = (entry.types ?? ['?']).join('/')
  const spe = entry.baseStats?.spe ?? 80
  const ability = abilityName(topKeys(c.Abilities, 1)[0] ?? '?', entry)
  const moves = topKeys(c.Moves, 8).map((m) => moveNames[m] ?? m).join(', ')
  const items = topKeys(c.Items, 3).map((i) => itemNames[i] ?? i).join(', ')
  const teammates = topKeys(c.Teammates, 5).join(', ')
  return (
    `${name}. ${types} type. ${speedHint(spe)}.\n` +
    `Ability: ${ability}.\n` +
    `Common moves: ${moves}.\n` +
    `Common item: ${items}.\n` +
    `Frequent teammates: ${teammates}.\n`
  )
}

// --- write one file per Pokemon ---
const docsDir = join(HERE, 'docs')
rmSync(docsDir, { recursive: true, force: true }) // start fresh
mkdirSync(docsDir, { recursive: true })

let count = 0
for (const name of Object.keys(chaos)) {
  writeFileSync(join(docsDir, `${toId(name)}.txt`), profileText(name))
  count++
}
console.log(`wrote ${count} profile docs to rag/docs/`)
