// Format primitives shared by both layers (runtime + build). Pure and
// browser-safe — no data, no Node. Kept out of validate.ts (which is Node-only,
// build-side) so the browser runtime can import these without dragging it in.

export const toId = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '')

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

export const NATURES = new Set([
  'Hardy', 'Lonely', 'Brave', 'Adamant', 'Naughty', 'Bold', 'Docile', 'Relaxed',
  'Impish', 'Lax', 'Timid', 'Hasty', 'Serious', 'Jolly', 'Naive', 'Modest',
  'Mild', 'Quiet', 'Bashful', 'Rash', 'Calm', 'Gentle', 'Sassy', 'Careful', 'Quirky',
])

// Champions EV system, discovered in the usage data: 66 total, 32 max per stat.
export const EV_TOTAL_MAX = 66
export const EV_STAT_MAX = 32
