// Dev preview: the RAG + repair pipeline generating with qwen2.5:3b over local
// Ollama (through the Vite proxy). Same pipeline the Pages build uses — only the
// chat backend differs (see browserAi.ts, which swaps this for WebLLM).
import { ragGenerate, type ChatFn, type Msg } from './ragPipeline'

const OLLAMA_URL = '/ollama/api/chat'
const MODEL = 'qwen2.5:3b'

const chat: ChatFn = async (messages: Msg[]) => {
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, messages, stream: false, options: { temperature: 0.3, num_predict: 1200 } }),
  })
  if (!res.ok) throw new Error(`Ollama responded ${res.status}`)
  return (await res.json()).message.content
}

export const generateTeam = (query: string, onStep: (step: string) => void) =>
  ragGenerate(query, onStep, chat)
