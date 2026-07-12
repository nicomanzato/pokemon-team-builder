// Measure an engine against the validator. Same idea as the v1 eval.py: run a
// fixed set of requests, score each team, print the issue count. Rerun after RAG
// to see the curve. Run it (Ollama must be up):
//   npx tsx ai/eval.ts
import { generateTeam } from '../src/engines/local'
import { validateTeam } from './validate'
import { loadGroundTruth } from './groundTruth'

const STRATEGIES = [
  'a Trick Room team',
  'a rain team',
  'a hyper offense team with Tailwind',
]

const gt = loadGroundTruth()
let total = 0
for (const strategy of STRATEGIES) {
  const { team } = await generateTeam(strategy, () => {})
  const issues = validateTeam(team.pokemon, gt)
  total += issues.length
  console.log(`\n${strategy}: ${team.pokemon.length}/6 parsed, ${issues.length} issues`)
  for (const i of issues.slice(0, 4)) console.log(`  - ${i}`)
  if (issues.length > 4) console.log(`  … +${issues.length - 4} more`)
}
console.log(`\n=== baseline total: ${total} issues across ${STRATEGIES.length} teams ===`)
