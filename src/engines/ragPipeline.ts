// The shared RAG + validate/repair pipeline. Everything except how a prompt is
// turned into text lives here; each engine supplies its own `chat` (Ollama in
// dev, WebLLM in the browser). That's the whole difference between them.
import type { PokemonSet, Team } from '../types'
import { parsePaste } from '../../ai/runtime/parse'
import { RULES } from '../../ai/runtime/prompt'
import { browserDossier } from '../../ai/runtime/rag/browserRag'
import { validateLight } from '../../ai/runtime/validateLight'

const MAX_REPAIRS = 2

export type Msg = { role: 'system' | 'user' | 'assistant'; content: string }
export type ChatFn = (messages: Msg[]) => Promise<string>

export async function ragGenerate(
  query: string,
  onStep: (step: string) => void,
  chat: ChatFn,
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
    onStep(round === 0 ? 'Composing the team…' : `Fixing ${best!.issues.length} rule issue(s)…`)
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
