// RAG generation (Node): same 1.5B, same rules as the baseline, but the user
// prompt carries a dossier of real metagame facts. Node-only for now because the
// dossier needs the full chaos data on disk; the browser gets it later, slimmed.
import type { Team } from '../../src/types'
import { parsePaste } from '../parse'
import { RULES } from '../prompt'
import { ragContext } from './retrieve'

const OLLAMA_URL = 'http://localhost:11434/api/chat'
const MODEL = 'qwen2.5:1.5b'

// One-shot format exemplar. A different archetype (sun) so it teaches the SHAPE
// — 6 blocks, one field per line, tiny EVs, 4 moves — without being copyable for
// the Trick Room / rain / Tailwind requests we actually test.
const EXAMPLE_REQUEST = 'a sample sun team (this is only a format example)'
const EXAMPLE_ANSWER = `Torkoal @ Charcoal
Ability: Drought
Level: 50
EVs: 32 HP / 4 Def / 8 SpD
Quiet Nature
- Eruption
- Heat Wave
- Protect
- Body Press

Charizard-Mega-Y @ Charizardite Y
Ability: Drought
Level: 50
EVs: 4 HP / 32 SpA / 30 Spe
Modest Nature
- Heat Wave
- Solar Beam
- Air Slash
- Protect

Venusaur @ Life Orb
Ability: Chlorophyll
Level: 50
EVs: 4 HP / 32 SpA / 30 Spe
Modest Nature
- Growth
- Giga Drain
- Sludge Bomb
- Protect

Great Tusk @ Assault Vest
Ability: Protosynthesis
Level: 50
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Headlong Rush
- Close Combat
- Rock Slide
- Ice Spinner

Flutter Mane @ Focus Sash
Ability: Protosynthesis
Level: 50
EVs: 4 Def / 32 SpA / 30 Spe
Timid Nature
- Moonblast
- Shadow Ball
- Icy Wind
- Protect

Landorus-Therian @ Rocky Helmet
Ability: Intimidate
Level: 50
EVs: 32 HP / 16 Def / 18 SpD
Impish Nature
- Earthquake
- U-turn
- Rock Slide
- Protect`

export async function buildTeamRag(query: string): Promise<{ team: Team }> {
  const context = await ragContext(query)
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: RULES },
        { role: 'user', content: `Build a team for this request: ${EXAMPLE_REQUEST}` },
        { role: 'assistant', content: EXAMPLE_ANSWER },
        { role: 'user', content: `Build a team for this request: ${query}${context}` },
      ],
      stream: false,
      options: { temperature: 0.3, num_predict: 1200 },
    }),
  })
  if (!res.ok) throw new Error(`Ollama responded ${res.status}`)
  const paste: string = (await res.json()).message.content
  return { team: { strategy: query, pokemon: parsePaste(paste), paste } }
}
