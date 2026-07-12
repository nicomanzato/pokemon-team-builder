// Measure engines against the validator. Same idea as the v1 eval.py: run a
// fixed set of requests, score each team, print the issue count. Runs baseline
// and RAG side by side so the curve is visible. Ollama must be up.
//   npx tsx ai/eval.ts            # both
//   npx tsx ai/eval.ts baseline   # one
import { generateTeam } from '../src/engines/local'
import { buildTeamRag } from './rag/teamBuilder'
import { validateTeam } from './validate'
import { loadGroundTruth } from './groundTruth'
import type { Team } from '../src/types'

const STRATEGIES = [
  'a Trick Room team',
  'a rain team',
  'a hyper offense team with Tailwind',
]

const MODES: Record<string, (q: string) => Promise<Team>> = {
  baseline: (q) => generateTeam(q, () => {}).then((r) => r.team),
  rag: (q) => buildTeamRag(q).then((r) => r.team),
}

const gt = loadGroundTruth()
const modes = process.argv.slice(2).filter((m) => m in MODES)
const selected = modes.length ? modes : Object.keys(MODES)

for (const mode of selected) {
  let total = 0
  console.log(`\n===== ${mode} =====`)
  for (const strategy of STRATEGIES) {
    const team = await MODES[mode](strategy)
    const issues = validateTeam(team.pokemon, gt)
    total += issues.length
    console.log(`\n${strategy}: ${team.pokemon.length}/6 parsed, ${issues.length} issues`)
    for (const i of issues.slice(0, 4)) console.log(`  - ${i}`)
    if (issues.length > 4) console.log(`  … +${issues.length - 4} more`)
  }
  console.log(`\n>>> ${mode} total: ${total} issues across ${STRATEGIES.length} teams`)
}
