import type { CSSProperties } from 'react'
import type { PokemonSet } from '../types'
import { typeColor } from '../data/typeColors'
import { Sprite } from './Sprite'

const EV_ORDER = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'] as const
const EV_LABEL: Record<string, string> = {
  hp: 'HP', atk: 'Atk', def: 'Def', spa: 'SpA', spd: 'SpD', spe: 'Spe',
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-baseline gap-1.5">
      <dt className="shrink-0 text-[11px] uppercase tracking-wider text-muted">{label}</dt>
      <dd className="m-0 truncate text-sm">{value}</dd>
    </div>
  )
}

export function TeamCard({ set, index }: { set: PokemonSet; index: number }) {
  const accent = typeColor(set.types[0])
  const evs = EV_ORDER.filter((s) => set.evs[s])
    .map((s) => `${set.evs[s]} ${EV_LABEL[s]}`)
    .join(' / ')

  return (
    <article
      className="card-rise rounded-xl border border-line border-t-[3px] bg-surface p-4 pb-3.5"
      style={{ '--accent': accent, '--i': index, borderTopColor: accent } as CSSProperties}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3
            className="m-0 font-display text-2xl font-semibold uppercase tracking-wide"
            style={{ color: accent }}
          >
            {set.species}
          </h3>
          <div className="mt-1.5 flex gap-1">
            {set.types.map((t) => (
              <span
                key={t}
                className="rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-widest"
                style={{ color: typeColor(t), borderColor: `${typeColor(t)}8c` }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
        <Sprite
          species={set.species}
          className="-mt-1 size-20 shrink-0 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]"
        />
      </header>

      <dl className="my-3 grid grid-cols-2 gap-x-3.5 gap-y-1.5">
        <Fact label="Item" value={set.item} />
        <Fact label="Ability" value={set.ability} />
        <Fact label="Nature" value={set.nature} />
        <div className="col-span-2 flex min-w-0 items-baseline gap-1.5">
          <dt className="shrink-0 text-[11px] uppercase tracking-wider text-muted">EVs</dt>
          <dd className="m-0 font-mono text-xs leading-relaxed">{evs || '—'}</dd>
        </div>
      </dl>

      <ul className="m-0 grid list-none grid-cols-2 gap-1.5 p-0">
        {set.moves.map((m) => (
          <li
            key={m}
            className="truncate rounded-md bg-surface-2 px-2.5 py-1.5 text-[13.5px]"
          >
            {m}
          </li>
        ))}
      </ul>
    </article>
  )
}
