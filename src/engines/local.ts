// Baseline engine: the naked 1.5B model over Ollama, no RAG yet.
// This is the "before" picture — how well qwen2.5:1.5b builds a Champions team
// with only the rules in the prompt and nothing about the actual metagame.
// The same code path swaps to WebLLM later; only this fetch changes.
import type { Team } from '../types'
import { parsePaste } from '../../ai/parse'

const OLLAMA_URL = 'http://localhost:11434/api/chat'
const MODEL = 'qwen2.5:1.5b'

// The format rules. A small model needs them spelled out; without the metagame
// data (that's the next step, RAG) this is all it has to go on.
const RULES = `You are an expert VGC team builder for Pokemon Champions, Regulation Set M-B \
(the official 2026 format: double battles, level 50, Mega Evolutions allowed).
Rules you must follow exactly:
- Exactly 6 Pokemon, all different species.
- Every Pokemon holds an item; no two Pokemon may hold the same item.
- A Mega Pokemon must hold its own Mega Stone (e.g. Mawile-Mega holds Mawilite).
- Terastallization DOES NOT EXIST in this format. Never mention Tera types.
- EV system: at most 66 EV points in total per Pokemon, at most 32 per stat.
- Exactly 4 moves per Pokemon, and only moves that Pokemon can actually learn.
- Exactly ONE ability per Pokemon.
Output ONLY 6 Showdown paste blocks, following this template EXACTLY \
(one field per line, no extra prose, no numbering):

Mawile-Mega @ Mawilite
Ability: Intimidate
Level: 50
EVs: 32 HP / 32 Atk / 2 Def
Adamant Nature
- Play Rough
- Sucker Punch
- Fake Out
- Protect`

export async function generateTeam(
  query: string,
  onStep: (step: string) => void,
): Promise<{ team: Team; note?: string }> {
  onStep(`Asking ${MODEL} (no RAG)…`)
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: RULES },
        { role: 'user', content: `Build a team for this request: ${query}` },
      ],
      stream: false,
      options: { temperature: 0.3, num_predict: 900 },
    }),
  })
  if (!res.ok) throw new Error(`Ollama responded ${res.status}`)
  const paste: string = (await res.json()).message.content
  const pokemon = parsePaste(paste)
  const note =
    pokemon.length === 6
      ? 'Baseline: naked 1.5B, no metagame data yet.'
      : `Baseline: model returned ${pokemon.length}/6 parseable Pokemon.`
  return { team: { strategy: query, pokemon, paste }, note }
}
