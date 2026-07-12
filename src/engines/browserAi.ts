// The Pages engine: Qwen2.5-3B running entirely in the visitor's browser on
// WebGPU via WebLLM. Same RAG + repair pipeline as the dev engine; the only
// difference is generation happens here on the local GPU instead of Ollama.
// The model (~1.9 GB) downloads once on first use and is cached by the browser.
import { CreateMLCEngine, type MLCEngine } from '@mlc-ai/web-llm'
import { ragGenerate, type ChatFn, type Msg } from './ragPipeline'

const MODEL = 'Qwen2.5-3B-Instruct-q4f16_1-MLC'

let enginePromise: Promise<MLCEngine> | null = null

async function getEngine(onStep: (step: string) => void): Promise<MLCEngine> {
  if (!('gpu' in navigator)) {
    throw new Error('WebGPU is not available in this browser. Try Chrome or Edge (or a recent Safari).')
  }
  onStep('Loading Qwen2.5-3B into your browser (first time downloads ~1.9 GB, then cached)…')
  // Cached across calls: the model loads once, then every request reuses it.
  return (enginePromise ??= CreateMLCEngine(MODEL, {
    initProgressCallback: (r) => onStep(r.text),
  }))
}

export async function generateTeam(query: string, onStep: (step: string) => void) {
  const engine = await getEngine(onStep)
  const chat: ChatFn = async (messages: Msg[]) => {
    const res = await engine.chat.completions.create({ messages, temperature: 0.3 })
    return res.choices[0].message.content ?? ''
  }
  return ragGenerate(query, onStep, chat)
}
