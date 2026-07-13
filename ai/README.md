# `ai/` — the AI pipeline

Two layers, kept in separate folders because they run at different times and in
different places.

```
ai/
  format.ts        shared primitives (toId, natures, EV caps) — pure, browser-safe
  runtime/         ships to the browser; runs when a user builds a team
    parse.ts         Showdown paste  →  structured sets
    validateLight.ts light legality check (no extra data) for the repair loop
    prompt.ts        the format RULES + the dossier preamble
    rag/
      browserRag.ts    retrieval: embed the query, cosine over shipped vectors
      embedBrowser.ts  the embedder (transformers.js, runs in-browser)
    assets/          GENERATED — do not edit by hand (see build/)
      pokemonTypes.json    species → types (for card colors)
      profileVectors.json  the 275 profile embeddings
      dossierData.json     the 275 pre-rendered fact sheets
  build/           dev tooling; run once to (re)generate runtime/assets/
    groundTruth.ts   loads the raw data
    validate.ts      the full validator (needs learnsets; used by tests)
    buildTypes.ts        →  runtime/assets/pokemonTypes.json
    rag/
      profiles.ts        the text we embed (optimized for *finding* a Pokemon)
      dossier.ts         the fact sheet we feed the model (for *building*)
      buildBrowserIndex.ts →  runtime/assets/{profileVectors,dossierData}.json
    data/            raw Showdown/Smogon source (gitignored)
    *.test.ts        run with: npx tsx ai/build/<name>.test.ts
```

**Dependency rule:** `build/` reads `data/` and writes `runtime/assets/`. `runtime/`
imports those assets. **`runtime/` never imports `build/`** — that's what keeps
Node-only code (and the 12 MB of raw data) out of the browser bundle.

## The flow, from prompt to team

1. `src/engines/browserAi.ts` loads Qwen (WebLLM) into the visitor's GPU.
2. `src/engines/ragPipeline.ts` orchestrates:
   - `runtime/rag/browserRag.ts` embeds the request and retrieves the relevant
     Pokemon (their `dossier` fact sheets) — this is the **R** in RAG.
   - the RULES + the dossier become the prompt; the model **generates** a paste.
   - `runtime/parse.ts` structures it; `runtime/validateLight.ts` scores it; if it
     breaks a rule the pipeline asks the model to fix it (up to 2 repairs).
3. `src/App.tsx` renders the team.

## Regenerating the shipped assets

When the metagame data in `build/data/` changes:

```
npx tsx ai/build/buildTypes.ts          # → runtime/assets/pokemonTypes.json
npx tsx ai/build/rag/buildBrowserIndex.ts   # → runtime/assets/{profileVectors,dossierData}.json
```
