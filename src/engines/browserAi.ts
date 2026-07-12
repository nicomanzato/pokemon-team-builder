// The Pages engines: Qwen2.5 running entirely in the visitor's browser on WebGPU
// via WebLLM. Same RAG + repair pipeline; generation happens on the local GPU.
// A factory so we can offer two sizes — 7B (best quality) and 3B (lighter
// download) — each with its own lazily-loaded, browser-cached engine.
import { CreateMLCEngine, type MLCEngine } from '@mlc-ai/web-llm'
import { ragGenerate, type ChatFn, type Msg } from './ragPipeline'

export function makeBrowserEngine(model: string, name: string, size: string) {
  let enginePromise: Promise<MLCEngine> | null = null

  async function getEngine(onStep: (step: string) => void): Promise<MLCEngine> {
    if (!('gpu' in navigator)) {
      throw new Error('WebGPU is not available in this browser. Try Chrome or Edge (or a recent Safari).')
    }
    onStep(`Loading ${name} into your browser (first time downloads ${size}, then cached)…`)
    // Cached across calls: the model loads once, then every request reuses it.
    return (enginePromise ??= CreateMLCEngine(model, { initProgressCallback: (r) => onStep(r.text) }))
  }

  return async function generateTeam(query: string, onStep: (step: string) => void) {
    const engine = await getEngine(onStep)
    const chat: ChatFn = async (messages: Msg[]) => {
      const res = await engine.chat.completions.create({ messages, temperature: 0.3 })
      return res.choices[0].message.content ?? ''
    }
    return ragGenerate(query, onStep, chat)
  }
}
