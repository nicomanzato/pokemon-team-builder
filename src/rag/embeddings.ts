// The embedder in the browser: MiniLM loaded from our OWN domain (public/models/),
// never from HuggingFace. Same model the ingest used, so the query vector and the
// shipped doc vectors are comparable.
import { env } from '@huggingface/transformers'
import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/huggingface_transformers'

// Self-hosted: don't reach out to HF, load from /models/ (served by the app).
env.allowRemoteModels = false
env.allowLocalModels = true
env.localModelPath = `${import.meta.env.BASE_URL}models`

export const embeddings = new HuggingFaceTransformersEmbeddings({
  model: 'Xenova/all-MiniLM-L6-v2',
  pretrainedOptions: { dtype: 'q8' },
})
