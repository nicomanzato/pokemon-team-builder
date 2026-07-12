// The real thing, dev edition: RAG runs entirely in the browser (embeddings +
// retrieval via transformers.js), generation goes to a bigger stock model over
// local Ollama (qwen2.5:3b), and a validate→repair loop cleans up the small
// model's mistakes. For Pages, only the generation call swaps to WebLLM — the
// RAG and the repair loop are already browser-side and ship as-is.
import type { PokemonSet, Team } from '../types'
import { parsePaste } from '../../ai/parse'
import { RULES } from '../../ai/prompt'
import { browserDossier } from '../../ai/rag/browserRag'
import { validateLight } from '../../ai/validateLight'

const OLLAMA_URL = '/ollama/api/chat'
const MODEL = 'qwen2.5:3b'
const MAX_REPAIRS = 2

type Msg = { role: 'system' | 'user' | 'assistant'; content: string }

async function chat(messages: Msg[]): Promise<string> {
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages, stream: false, options: { temperature: 0.3, num_predict: 1200 } }),
  })
  if (!res.ok) throw new Error(`Ollama responded ${res.status}`)
  return (await res.json()).message.content
}

export async function generateTeam(
  query: string,
  onStep: (step: string) => void,
): Promise<{ team: Team; note?: string }> {
  onStep('Embedding your request & retrieving the meta…')
  const dossier = await browserDossier(query)

  const messages: Msg[] = [
    { role: 'system', content: RULES },
    { role: 'user', content: `Build a team for this request: ${query}${dossier}` },
  ]

  // Keep the best attempt: the small model sometimes makes a later round worse.
  let best: { paste: string; mons: PokemonSet[]; issues: string[] } | null = null
  for (let round = 0; round <= MAX_REPAIRS; round++) {
    onStep(round === 0 ? `Composing with ${MODEL}…` : `Fixing ${best!.issues.length} rule issue(s)…`)
    const paste = await chat(messages)
    const mons = parsePaste(paste)
    const issues = validateLight(mons)
    if (!best || issues.length < best.issues.length) best = { paste, mons, issues }
    if (best.issues.length === 0) break
    if (round < MAX_REPAIRS) {
      messages.push({ role: 'assistant', content: paste })
      messages.push({
        role: 'user',
        content:
          `That team breaks these rules: ${issues.join('; ')}. ` +
          `Rewrite the FULL team as exactly 6 valid Showdown blocks, fixing every issue. Output only the 6 blocks.`,
      })
    }
  }

  const note = best!.issues.length
    ? `${best!.issues.length} issue(s) remain after repair: ${best!.issues.slice(0, 2).join('; ')}`
    : '✓ legal — repaired in the browser'
  return { team: { strategy: query, pokemon: best!.mons.slice(0, 6), paste: best!.paste }, note }
}
