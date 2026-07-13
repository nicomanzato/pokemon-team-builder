// Minimal WebLLM connection: loads Qwen on the visitor's GPU and returns the raw
// model output. No RAG, no validation, no parsing — that's what gets rebuilt on
// top of this (with LangChain). A factory so we can offer two model sizes.
import { CreateMLCEngine, type MLCEngine } from '@mlc-ai/web-llm'
import type { Team } from '../types'

const SYSTEM =
  'You are a VGC team builder for Pokemon Champions, Regulation Set M-B. ' +
  'Reply with a Showdown paste of exactly 6 Pokemon.'

export function makeBrowserEngine(model: string, name: string, size: string) {
  let enginePromise: Promise<MLCEngine> | null = null

  function getEngine(onStep: (step: string) => void): Promise<MLCEngine> {
    if (!('gpu' in navigator)) {
      throw new Error('WebGPU is not available in this browser. Try Chrome or Edge (or a recent Safari).')
    }
    onStep(`Loading ${name} into your browser (first time downloads ${size}, then cached)…`)
    // Cached across calls: the model loads once, then every request reuses it.
    return (enginePromise ??= CreateMLCEngine(model, { initProgressCallback: (r) => onStep(r.text) }))
  }

  return async function generateTeam(
    query: string,
    onStep: (step: string) => void,
  ): Promise<{ team: Team; note?: string }> {
    const engine = await getEngine(onStep)
    onStep('Generating…')
    const res = await engine.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: query },
      ],
      temperature: 0.3,
    })
    const paste = res.choices[0].message.content ?? ''
    // No parser yet -> no structured Pokemon; the raw paste is what you build on.
    return { team: { strategy: query, pokemon: [], paste }, note: 'Raw model output — no RAG yet.' }
  }
}
