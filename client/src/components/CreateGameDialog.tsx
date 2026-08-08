import { useEffect, useState } from 'react'
import { useToast } from './Toast'
import { matchService } from '../services/match'
import type { MatchQueueDto } from '../types/game'

type Props = {
  open: boolean
  onClose: () => void
}

const DEFAULT_TIMEOUT_MS = 30_000

export function CreateGameDialog({ open, onClose }: Props) {
  const toast = useToast()
  const [searching, setSearching] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [expiresAt, setExpiresAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    matchService.connect()

    const unsubStarted = matchService.onMatchStarted(() => {
      setSearching(false)
      setExpiresAt(null)
      setError(null)
      onClose()
    })

    const unsubQueue = matchService.onQueueStatus((status: MatchQueueDto) => {
      if (status.status === 'WAITING') {
        setSearching(true)
        setExpiresAt(status.expiresAtEpochMs)
        setError(null)
        return
      }

      setSearching(false)
      setExpiresAt(null)

      if (status.status === 'FAILED') {
        setError(status.message || 'Matchmaking failed')
        toast.show(status.message || 'Matchmaking failed', 'error')
      }
    })

    return () => {
      unsubStarted()
      unsubQueue()
    }
  }, [open, onClose, toast])

  useEffect(() => {
    if (!open) {
      setSearching(false)
      setSecondsLeft(0)
      setExpiresAt(null)
      setError(null)
    }
  }, [open])

  useEffect(() => {
    if (!searching || expiresAt == null) {
      return
    }

    const tick = () => {
      const left = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
      setSecondsLeft(left)
    }

    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [searching, expiresAt])

  if (!open) {
    return null
  }

  const startSearch = () => {
    setError(null)
    setSearching(true)
    setExpiresAt(Date.now() + DEFAULT_TIMEOUT_MS)
    setSecondsLeft(Math.ceil(DEFAULT_TIMEOUT_MS / 1000))
    matchService.findMatch()
  }

  const cancelSearch = () => {
    matchService.cancelFind()
    setSearching(false)
    setExpiresAt(null)
    setSecondsLeft(0)
  }

  const hide = () => {
    if (searching) {
      cancelSearch()
    }
    onClose()
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={hide}>
      <div className="modal create-game-modal" role="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Find Match</h2>
          <button type="button" className="icon-btn" onClick={hide} aria-label="Close">
            ×
          </button>
        </div>

        {searching ? (
          <div className="waiting find-match-waiting">
            <p>Searching for an opponent…</p>
            <div className="spinner" />
            <p className="countdown">
              {secondsLeft > 0
                ? `${secondsLeft}s left — then you play Stockfish`
                : 'Starting game vs Stockfish…'}
            </p>
            <button type="button" className="btn ghost" onClick={cancelSearch}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="find-match-body">
            <p className="find-match-copy">
              Another player online? You get matched instantly. Alone for 30 seconds? You play
              Stockfish at full strength.
            </p>
            {error && <p className="error-text">{error}</p>}
            <div className="form-actions">
              <button type="button" className="btn primary" onClick={startSearch}>
                Find Match
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
