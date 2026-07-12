// Parser self-check. No test framework — run it directly:
//   npx tsx ai/parse.test.ts
import assert from 'node:assert'
import { parsePaste } from './parse'

const SAMPLE = `Here is your team:

Mawile-Mega @ Mawilite
Ability: Intimidate
Level: 50
EVs: 32 HP / 32 Atk / 2 Def
Adamant Nature
- Play Rough
- Sucker Punch
- Fake Out
- Protect

Whimsicott (F) @ Focus Sash
Ability: Prankster
Level: 50
EVs: 4 HP / 32 SpA / 30 Spe
Timid Nature
- Tailwind
- Moonblast
- Fake Tears
- Protect`

const mons = parsePaste(SAMPLE)
assert.equal(mons.length, 2, 'two blocks parsed, prose ignored')
assert.equal(mons[0].species, 'Mawile-Mega')
assert.equal(mons[0].item, 'Mawilite')
assert.equal(mons[0].ability, 'Intimidate')
assert.deepEqual(mons[0].evs, { hp: 32, atk: 32, def: 2 })
assert.equal(mons[0].nature, 'Adamant')
assert.equal(mons[0].moves.length, 4)
assert.equal(mons[0].moves[0], 'Play Rough')
// gender marker "(F)" must not be mistaken for a nickname's species
assert.equal(mons[1].species, 'Whimsicott')
assert.equal(mons[1].item, 'Focus Sash')

console.log('ok: parsePaste passes')
