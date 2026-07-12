import { useEffect, useState } from 'react'

// Official artwork via PokeAPI. We ask the API for the sprite URL by name and
// cache the promise per species — one request per Pokemon per session.
const cache = new Map<string, Promise<string | null>>()

function candidates(species: string): string[] {
  const n = species.toLowerCase().replace(/[^a-z0-9-]+/g, '-')
  const list = [n]
  // PokeAPI quirks: gendered defaults and suffixes ("Basculegion" -> basculegion-male)
  list.push(`${n}-male`)
  if (n.endsWith('-f')) list.push(n.replace(/-f$/, '-female'))
  if (n.endsWith('-m')) list.push(n.replace(/-m$/, '-male'))
  return list
}

async function fetchSprite(species: string): Promise<string | null> {
  for (const name of candidates(species)) {
    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${name}`)
      if (!res.ok) continue
      const data = await res.json()
      const url =
        data.sprites?.other?.['official-artwork']?.front_default ??
        data.sprites?.front_default
      if (url) return url
    } catch {
      return null
    }
  }
  return null
}

export function Sprite({ species, className }: { species: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    if (!cache.has(species)) cache.set(species, fetchSprite(species))
    cache.get(species)!.then((url) => alive && setSrc(url))
    return () => {
      alive = false
    }
  }, [species])

  if (!src) return <div className={className} aria-hidden />
  return <img src={src} alt={species} className={className} loading="lazy" />
}
