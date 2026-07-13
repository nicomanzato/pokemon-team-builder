// The embeddings model, self-hosted — loaded from public/models/, never from
// HuggingFace. ingest and retrieve both import this so the doc vectors and the
// query vector always come from the same model.
import { env } from '@huggingface/transformers'
import { HuggingFaceTransformersEmbeddings } from '@langchain/community/embeddings/huggingface_transformers'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// Use our own copy of the model, don't reach out to HF.
env.allowRemoteModels = false
env.localModelPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'models')

export const embeddings = new HuggingFaceTransformersEmbeddings({
  model: 'Xenova/all-MiniLM-L6-v2',
  pretrainedOptions: { dtype: 'q8' }, // the quantized .onnx we downloaded
})
