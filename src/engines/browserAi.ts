// The Pages engine, the right way: RAG runs entirely in the visitor's browser.
// Embeddings from our self-hosted MiniLM, retrieval over shipped vectors, and
// generation with Qwen on WebGPU (WebLLM). No server anywhere.
import { ChatWebLLM } from '@langchain/community/chat_models/webllm'
import { prebuiltAppConfig } from '@mlc-ai/web-llm'
import { SystemMessage, HumanMessage, AIMessage, type BaseMessage } from '@langchain/core/messages'
import type { Team, PokemonSet } from '../types'
import { retrieve } from '../rag/retrieve'
import { parsePaste } from '../rag/parse'
import { validateTeam } from '../rag/validate'

const MAX_REPAIRS = 2

// WebLLM's model weights live on HuggingFace, which rate-limits heavy IPs. Point
// them at the ModelScope mirror (same files) so downloads don't 403. The model
// libraries (WASM) stay on GitHub, which isn't affected.
const appConfig = {
  ...prebuiltAppConfig,
  model_list: prebuiltAppConfig.model_list.map((m) => ({
    ...m,
    model: m.model.replace('https://huggingface.co/', 'https://modelscope.cn/models/'),
  })),
}

const RULES = `You are an expert VGC team builder for Pokemon Champions, Regulation Set M-B.
Choose exactly 6 Pokemon FROM THE PROVIDED LIST and build a team.
For each, write a Showdown paste block using its REAL name, a real item, its ability,
Level 50, EVs, nature, and 4 real moves from the data given. Format each block as:
the Pokemon's name then " @ " then the item on the first line; "Ability:", "Level: 50",
"EVs:", the nature line, then four "- move" lines. Separate the 6 blocks with a blank line.
Rules: EVs at most 66 total and 32 per stat. Exactly 4 moves each. Each item used once.
Output ONLY the 6 filled-in blocks. Never output the words "Species", "Item", "Move 1",
or any placeholder — always use real values from the list.`

export function makeBrowserEngine(model: string, name: string, size: string) {
  let chatPromise: Promise<ChatWebLLM> | null = null

  function getChat(onStep: (step: string) => void): Promise<ChatWebLLM> {
    if (!('gpu' in navigator)) {
      throw new Error('WebGPU is not available in this browser. Try Chrome or Edge (or a recent Safari).')
    }
    return (chatPromise ??= (async () => {
      const chat = new ChatWebLLM({ model, appConfig, chatOptions: { temperature: 0.3 } })
      onStep(`Loading ${name} into your browser (first time downloads ${size}, then cached)…`)
      await chat.initialize((r) => onStep(r.text))
      return chat
    })())
  }

  return async function generateTeam(
    query: string,
    onStep: (step: string) => void,
    useRag = true,
  ): Promise<{ team: Team; note?: string }> {
    const chat = await getChat(onStep)

    // 1. RETRIEVE — only when RAG is on. Off = the model works from its own
    //    (weak, outdated) knowledge, so you can see how much the data helps.
    let userMessage: string
    if (useRag) {
      onStep('Embedding your request & retrieving the meta…')
      const docs = await retrieve(query, 6)
      const context = docs.map((d) => d.pageContent).join('\n\n')
      userMessage = `Build ${query}. Choose 6 Pokemon from this list and write each with real values:\n\n${context}`
    } else {
      userMessage = `Build ${query}. Choose 6 Pokemon and write each with real values.`
    }

    const messages: BaseMessage[] = [new SystemMessage(RULES), new HumanMessage(userMessage)]

    // 2. GENERATE → VALIDATE → REPAIR — keep the best attempt across rounds
    let best: { paste: string; pokemon: PokemonSet[]; issues: string[] } | null = null
    for (let round = 0; round <= MAX_REPAIRS; round++) {
      onStep(round === 0 ? 'Composing the team…' : `Fixing ${best!.issues.length} rule issue(s)…`)
      const res = await chat.invoke(messages)
      const paste = typeof res.content === 'string' ? res.content : ''
      const pokemon = parsePaste(paste)
      const issues = validateTeam(pokemon)
      if (!best || issues.length < best.issues.length) best = { paste, pokemon, issues }
      if (best.issues.length === 0) break
      if (round < MAX_REPAIRS) {
        messages.push(new AIMessage(paste))
        messages.push(new HumanMessage(
          `That team breaks these rules: ${issues.join('; ')}. ` +
            `Rewrite the FULL team fixing every issue. Output only the 6 Showdown blocks.`,
        ))
      }
    }

    const tag = useRag ? 'RAG' : 'no RAG'
    const note = best!.issues.length
      ? `[${tag}] ${best!.issues.length} issue(s) after repair: ${best!.issues.slice(0, 2).join('; ')}`
      : `[${tag}] ✓ legal — repaired in the browser`
    return { team: { strategy: query, pokemon: best!.pokemon, paste: best!.paste }, note }
  }
}
