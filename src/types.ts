export interface PokemonSet {
  species: string
  item: string
  ability: string
  level: string | null
  nature: string
  evs: Record<string, number>
  moves: string[]
  types: string[]
}

export interface Team {
  strategy: string
  pokemon: PokemonSet[]
  paste: string
}

export type GenerationStage =
  | { kind: 'idle' }
  | { kind: 'working'; step: string }
  | { kind: 'done'; team: Team; note?: string }
