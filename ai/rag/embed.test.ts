// Pure cosine/top-k self-check (no Ollama). Run:
//   npx tsx ai/embed.test.ts
import assert from 'node:assert'
import { topK } from './embed'

const items = [
  { id: 'a', name: 'A', vec: [1, 0] },
  { id: 'b', name: 'B', vec: [0, 1] },
  { id: 'c', name: 'C', vec: [2, 2] }, // same direction as [1,1], magnitude ignored by cosine
]
const r = topK([1, 0], items, 3)
assert.equal(r.length, 3)
assert.equal(r[0].name, 'A', 'exact direction match ranks first')
assert.ok(Math.abs(r[0].score - 1) < 1e-9, 'cosine of identical direction is 1')
assert.ok(r[0].score >= r[1].score && r[1].score >= r[2].score, 'sorted descending')
assert.equal(r[2].name, 'B', 'orthogonal ranks last')

console.log('ok: topK passes')
