import { useState } from 'react'
import type { GenerationStage } from './types'
import { QUICK_PICKS } from './mock/generate'
import { ENGINES, DEFAULT_ENGINE } from './engines'
import { TeamCard } from './components/TeamCard'

export default function App() {
  const [query, setQuery] = useState('')
  const [stage, setStage] = useState<GenerationStage>({ kind: 'idle' })
  const [copied, setCopied] = useState(false)
  const [engine, setEngine] = useState(DEFAULT_ENGINE)
  const busy = stage.kind === 'working'

  async function build(q: string) {
    const request = q.trim()
    if (!request || busy) return
    setCopied(false)
    setStage({ kind: 'working', step: 'Starting…' })
    try {
      const { team, note } = await engine.generateTeam(request, (step) =>
        setStage({ kind: 'working', step }),
      )
      setStage({ kind: 'done', team, note })
    } catch (err) {
      setStage({ kind: 'error', message: err instanceof Error ? err.message : String(err) })
    }
  }

  async function copyPaste() {
    if (stage.kind !== 'done') return
    await navigator.clipboard.writeText(stage.team.paste)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mx-auto max-w-[1080px] px-5 pb-12 pt-6">
      <header className="flex items-baseline justify-between pb-7">
        <span className="font-display text-xl font-semibold uppercase tracking-widest">
          Pokemon <em className="not-italic text-brand">Team Builder</em>
        </span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 rounded-full border border-line px-3 py-1 font-mono text-xs text-muted">
            engine
            <select
              value={engine.id}
              disabled={busy}
              onChange={(e) => setEngine(ENGINES.find((x) => x.id === e.target.value)!)}
              className="cursor-pointer bg-transparent font-mono text-xs text-ink outline-none disabled:cursor-default"
              aria-label="Generation engine"
            >
              {ENGINES.map((e) => (
                <option key={e.id} value={e.id} disabled={!e.available} className="bg-surface">
                  {e.label + (e.available ? '' : ' (soon)')}
                </option>
              ))}
            </select>
          </label>
          <span className="rounded-full border border-line px-3 py-1 font-mono text-xs text-muted">
            Champions · Reg M-B
          </span>
        </div>
      </header>

      <section>
        <h1 className="mb-5 mt-6 font-display text-[clamp(34px,5vw,52px)] font-bold uppercase leading-none tracking-wide">
          Describe the team you want
        </h1>
        <form
          className="flex flex-col gap-2.5 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault()
            build(query)
          }}
        >
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="a Trick Room team with Mega Mawile…"
            disabled={busy}
            aria-label="Team request"
            className="flex-1 rounded-[10px] border border-line bg-surface px-4 py-3.5 text-base text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          />
          <button
            type="submit"
            disabled={busy || !query.trim()}
            className="cursor-pointer rounded-[10px] bg-brand px-6 py-3.5 font-display text-lg font-semibold uppercase tracking-wider text-[#221a00] disabled:cursor-default disabled:opacity-45 sm:py-0"
          >
            Build team
          </button>
        </form>
        <div className="mt-3.5 flex flex-wrap gap-2">
          {QUICK_PICKS.map((p) => (
            <button
              key={p.label}
              disabled={busy}
              onClick={() => {
                setQuery(p.query)
                build(p.query)
              }}
              className="cursor-pointer rounded-full border border-line bg-transparent px-3.5 py-1.5 text-[13px] text-muted transition-colors hover:border-brand hover:text-ink disabled:cursor-default disabled:opacity-45"
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6 min-h-11" aria-live="polite">
        {stage.kind === 'working' && (
          <p className="m-0 font-mono text-sm text-brand">
            <span className="cursor-blink" aria-hidden>
              ▮
            </span>{' '}
            {stage.step}
          </p>
        )}
        {stage.kind === 'done' && stage.note && (
          <p className="m-0 font-mono text-[13px] text-muted">{stage.note}</p>
        )}
        {stage.kind === 'error' && (
          <p className="m-0 font-mono text-sm text-[#E56C66]">
            {stage.message} — is Ollama running? (<code>ollama serve</code>)
          </p>
        )}
      </section>

      {stage.kind === 'done' && (
        <section>
          <header className="mb-4 mt-2 flex flex-col items-start gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="m-0 font-display text-[26px] font-semibold uppercase tracking-wide">
              Your team
            </h2>
            <button
              onClick={copyPaste}
              className="cursor-pointer rounded-lg border border-line bg-surface-2 px-4 py-2 text-sm text-ink transition-colors hover:border-brand"
            >
              {copied ? 'Copied ✓' : 'Copy Showdown paste'}
            </button>
          </header>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3.5">
            {stage.team.pokemon.map((set, i) => (
              <TeamCard key={set.species} set={set} index={i} />
            ))}
          </div>
        </section>
      )}

      {stage.kind === 'idle' && (
        <p className="max-w-[52ch] text-muted">
          Type a strategy — or hit one of the presets — and a team for the current
          VGC format comes back as cards and a ready-to-import Showdown paste.
        </p>
      )}

      <footer className="mt-12 border-t border-line pt-4 font-mono text-xs text-muted">
        Engine: {engine.label} — {engine.description}
      </footer>
    </div>
  )
}
