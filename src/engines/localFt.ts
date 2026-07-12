// Fine-tuned engine: the LoRA-tuned 1.5B served by our ai/finetune/server.py,
// reached through a Vite dev proxy (/mlx -> localhost:8080) so the browser hits
// it same-origin. Uses the SHORT training-time prompt shape — the model learned
// to answer exactly that, so no verbose rules and no RAG dossier here.
import type { Team } from '../types'
import { parsePaste } from '../../ai/parse'
import { FT_SYSTEM } from '../../ai/prompt'

const MLX_URL = '/mlx'

export async function generateTeam(
  query: string,
  onStep: (step: string) => void,
): Promise<{ team: Team; note?: string }> {
  onStep('Asking the fine-tuned 1.5B…')
  const res = await fetch(MLX_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: FT_SYSTEM },
        { role: 'user', content: `Build me ${query}.` },
      ],
    }),
  })
  if (!res.ok) throw new Error(`mlx server responded ${res.status}`)
  const paste: string = (await res.json()).text
  const pokemon = parsePaste(paste)
  const note =
    pokemon.length === 6
      ? 'Fine-tuned 1.5B (format baked in). May recite memorized teams.'
      : `Fine-tuned model returned ${pokemon.length}/6 parseable Pokemon.`
  return { team: { strategy: query, pokemon, paste }, note }
}
