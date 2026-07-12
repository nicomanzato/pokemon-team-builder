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

// A team-generation engine. The UI only talks to this interface — swapping
// mock -> local model -> in-browser model never touches a component.
export interface Engine {
  id: string
  label: string
  description: string
  available: boolean
  generateTeam(
    query: string,
    onStep: (step: string) => void,
  ): Promise<{ team: Team; note?: string }>
}
