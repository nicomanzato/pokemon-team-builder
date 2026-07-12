// Baseline engine: the naked 1.5B model over Ollama, no RAG yet.
// This is the "before" picture — how well qwen2.5:1.5b builds a Champions team
// with only the rules in the prompt and nothing about the actual metagame.
// The same code path swaps to WebLLM later; only this fetch changes.
import type { Team } from '../types'
import { parsePaste } from '../../ai/parse'
import { RULES } from '../../ai/prompt'

const OLLAMA_URL = 'http://localhost:11434/api/chat'
const MODEL = 'qwen2.5:1.5b'

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
