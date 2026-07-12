// The classic Pokemon type palette — the accent system of the whole UI.
// Every card derives its identity from its Pokemon's primary type.
export const TYPE_COLORS: Record<string, string> = {
  Normal: '#9FA19F', Fire: '#E56C33', Water: '#4A90D9', Electric: '#F6C747',
  Grass: '#5FA855', Ice: '#6FC7C7', Fighting: '#C4562F', Poison: '#9A5A9C',
  Ground: '#B8935A', Flying: '#8FA8DD', Psychic: '#E06387', Bug: '#95A244',
  Rock: '#AFA981', Ghost: '#6A5A93', Dragon: '#6B5ACF', Dark: '#5A5366',
  Steel: '#8FA0A8', Fairy: '#E28EE2',
}

export const typeColor = (t?: string) => TYPE_COLORS[t ?? ''] ?? '#8B98AC'
