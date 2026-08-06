import { v4 as uuidv4 } from 'uuid'

const STORAGE_KEY = 'PLAYER_ID'

function normalizeId(raw: string | null): string | null {
  if (!raw) return null
  // Fix corrupted localStorage values like "\"uuid\"" or '"uuid"'
  const cleaned = raw.trim().replace(/^"+|"+$/g, '')
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(cleaned) ? cleaned : null
}

function readOrCreatePlayerId(): string {
  const existing = normalizeId(localStorage.getItem(STORAGE_KEY))
  if (existing) {
    // Persist cleaned value if it was corrupted
    localStorage.setItem(STORAGE_KEY, existing)
    return existing
  }
  const id = uuidv4()
  localStorage.setItem(STORAGE_KEY, id)
  return id
}

let playerId = readOrCreatePlayerId()

export const playerService = {
  getPlayerId(): string {
    return playerId
  },
  setPlayerId(id: string): void {
    const cleaned = normalizeId(id) ?? uuidv4()
    playerId = cleaned
    localStorage.setItem(STORAGE_KEY, cleaned)
  },
}
