// Mock generation backend. Same interface the real one will have:
// a query goes in, pipeline steps stream out, a Team comes back.
// Teams are real output from the v1 lab (7B + RAG), not invented data.
import teamsJson from './teams.json'
import type { Team } from '../types'

const TEAMS = teamsJson as unknown as Team[]

// keyword routing to the closest archived team
const MATCHERS: [RegExp, string][] = [
  [/trick|room|slow/i, 'a trick room team'],
  [/rain|water|drizzle|lluvia/i, 'a rain team'],
  [/sun|fire|drought|sol/i, 'a sun team built around strong fire atta'],
  [/tailwind|offense|fast|hyper/i, 'a hyper offense team with tailwind suppo'],
  [/garchomp|balanced|balance/i, 'a balanced team built around garchomp'],
]

export const QUICK_PICKS = [
  { label: 'Trick Room', query: 'a Trick Room team' },
  { label: 'Rain', query: 'a rain team' },
  { label: 'Sun offense', query: 'a sun team with strong Fire attackers' },
  { label: 'Tailwind hyper offense', query: 'a hyper offense team with Tailwind' },
  { label: 'Balanced + Garchomp', query: 'a balanced team built around Garchomp' },
]

// The steps mirror the real pipeline (see ROADMAP in v1) so the UI is designed
// against the states the real backend will actually have.
const STEPS = [
  'Embedding your request…',
  'Retrieving candidates from the meta…',
  'Expanding with frequent teammates…',
  'Composing the team…',
  'Validating legality (Reg M-B)…',
]

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function generateTeam(
  query: string,
  onStep: (step: string) => void,
): Promise<{ team: Team; note?: string }> {
  for (const step of STEPS) {
    onStep(step)
    await sleep(380 + Math.random() * 340)
  }
  const hit = MATCHERS.find(([re]) => re.test(query))
  const team = TEAMS.find((t) => t.strategy === hit?.[1])
  if (team) return { team }
  return {
    team: TEAMS[Math.floor(Math.random() * TEAMS.length)],
    note: 'Mock backend: no close match for that request, showing an archived team.',
  }
}
