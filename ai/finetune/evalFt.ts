// Measure the fine-tuned model: FT alone vs FT+RAG, scored by our validator.
// TS builds the prompts and validates; the Python runner just generates.
//   npx tsx ai/finetune/evalFt.ts
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { parsePaste } from '../parse'
import { validateTeam, toId } from '../validate'
import { loadGroundTruth } from '../groundTruth'
import { ragContext } from '../rag/retrieve'

const HERE = dirname(fileURLToPath(import.meta.url))
const DATA = join(HERE, 'data')
const PYTHON = '/Users/nico/pokemon-team-builder-v1/.venv/bin/python'

// In-distribution archetypes (the model trained on these) ...
const STRATEGIES = [
  'a Trick Room team',
  'a rain team',
  'a sun team',
  'a hyper offense team with Tailwind',
  'a balanced team built around Garchomp',
]
// ... and out-of-distribution traps: the fine-tune never saw these. If FT alone
// recites a trained team and FT+RAG fixes it, retrieval is doing real work.
const TRAPS = ['a sandstorm team', 'a team built around Pikachu']
const ALL = [...STRATEGIES, ...TRAPS]

const gt = loadGroundTruth()

// The exact system prompt the model trained on (read it from the data itself).
const trainLines = readFileSync(join(DATA, 'train.jsonl'), 'utf8').trim().split('\n')
const FT_SYSTEM = JSON.parse(trainLines[0]).messages[0].content

// Species signatures of every training team, to detect verbatim memorization.
const trainSignatures = new Set(
  trainLines.map((l) => {
    const paste = JSON.parse(l).messages[2].content
    return parsePaste(paste).map((m) => toId(m.species)).sort().join(',')
  }),
)

async function buildPrompts() {
  const prompts: { id: string; system: string; user: string }[] = []
  for (const strategy of ALL) {
    prompts.push({ id: `ft::${strategy}`, system: FT_SYSTEM, user: `Build me ${strategy}.` })
    const context = await ragContext(strategy)
    prompts.push({ id: `ft+rag::${strategy}`, system: FT_SYSTEM, user: `Build me ${strategy}.${context}` })
  }
  return prompts
}

function report(completions: Record<string, string>) {
  for (const mode of ['ft', 'ft+rag']) {
    console.log(`\n===== ${mode} =====`)
    let total = 0
    for (const strategy of ALL) {
      const text = completions[`${mode}::${strategy}`] ?? ''
      const mons = parsePaste(text)
      const issues = validateTeam(mons, gt)
      total += issues.length
      const sig = mons.map((m) => toId(m.species)).sort().join(',')
      const memo = trainSignatures.has(sig) ? '  ⚠ COPY of a training team' : ''
      const trap = TRAPS.includes(strategy) ? ' [trap]' : ''
      console.log(`${strategy}${trap}: ${mons.length}/6, ${issues.length} issues${memo}`)
    }
    console.log(`>>> ${mode} total: ${total} issues across ${ALL.length} requests`)
  }
}

const prompts = await buildPrompts()
writeFileSync(join(DATA, 'prompts.jsonl'), prompts.map((p) => JSON.stringify(p)).join('\n') + '\n')
console.log(`generating ${prompts.length} completions with the fine-tuned model…`)
execFileSync(PYTHON, [join(HERE, 'generate.py'), join(DATA, 'prompts.jsonl'), join(DATA, 'completions.jsonl'), join(HERE, 'adapters')], { stdio: 'inherit' })

const completions: Record<string, string> = {}
for (const line of readFileSync(join(DATA, 'completions.jsonl'), 'utf8').trim().split('\n')) {
  const c = JSON.parse(line)
  completions[c.id] = c.text
}
report(completions)
