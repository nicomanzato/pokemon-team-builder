// Browser-and-Node embedder via transformers.js. Replaces the Ollama-based
// embed.ts for anything that must run in the browser: the query is embedded here
// at runtime, and the profile vectors are precomputed here at build time — same
// model both sides, or cosine similarity is meaningless.
import { pipeline, type FeatureExtractionPipeline } from '@huggingface/transformers'

// Tiny (~23MB), ONNX-ready, symmetric — no query/doc prefixes needed. Query and
// profiles are embedded with this same model so cosine similarity is meaningful.
const MODEL = 'Xenova/all-MiniLM-L6-v2'

let extractorP: Promise<FeatureExtractionPipeline> | null = null
const getExtractor = () => (extractorP ??= pipeline('feature-extraction', MODEL))

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const extractor = await getExtractor()
  const out = await extractor(texts, { pooling: 'mean', normalize: true })
  return out.tolist() as number[][]
}
