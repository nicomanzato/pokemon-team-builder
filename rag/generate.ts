// Generation: retrieve the relevant Pokemon, put them in the prompt, ask the
// model to build a team. This is the "G" in RAG (retrieval already happened).
// Uses ChatOllama for local dev; the browser app swaps this for WebLLM.
//   npx tsx rag/generate.ts
import 'dotenv/config'
import { fileURLToPath } from 'node:url'
import { ChatOllama } from '@langchain/ollama'
import { SystemMessage, HumanMessage } from '@langchain/core/messages'
import { retrieve } from './retrieve'

const RULES = `You are an expert VGC team builder for Pokemon Champions, Regulation Set M-B.
Use ONLY the Pokemon from the provided list. Pick exactly 6.
Output ONLY 6 Showdown paste blocks, one per Pokemon, separated by a blank line.
Each block must be EXACTLY this shape (no markdown, no numbering, no extra text):

Species @ Item
Ability: Ability
Level: 50
EVs: 32 HP / 32 Atk / 2 Spe
Adamant Nature
- Move 1
- Move 2
- Move 3
- Move 4

Rules: EVs total at most 66 and at most 32 per stat. Exactly 4 moves. One item each.`

const model = new ChatOllama({ model: 'qwen2.5:7b', temperature: 0.3 })

export async function generateTeam(query: string): Promise<string> {
  // 1. RETRIEVAL — the Pokemon most relevant to this request
  const docs = await retrieve(query, 6)
  const context = docs.map((d) => d.pageContent).join('\n\n')

  // 2. PROMPT — the rules (system) + the retrieved facts and the request (user)
  const messages = [
    new SystemMessage(RULES),
    new HumanMessage(`Request: ${query}\n\nUse only these Pokemon:\n\n${context}`),
  ]

  // 3. GENERATE — the model composes the team from the facts we gave it
  const res = await model.invoke(messages)
  return res.content as string
}

// Runs only when executed directly (not when imported).
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const team = await generateTeam('a rain team')
  console.log(team)
}
