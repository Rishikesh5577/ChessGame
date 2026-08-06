import { useEffect, useState } from 'react'
import { useToast } from './Toast'
import { apiService } from '../services/api'
import { matchService } from '../services/match'
import { playerService } from '../services/player'
import { PlayerColor } from '../types/game'

type Props = {
  open: boolean
  onClose: () => void
}

export function CreateGameDialog({ open, onClose }: Props) {
  const toast = useToast()
  const [waiting, setWaiting] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdGameId, setCreatedGameId] = useState<string | null>(null)
  const [timeControl, setTimeControl] = useState('Unlimited')
  const [gameType, setGameType] = useState('Casual')
  const [hostColor, setHostColor] = useState<PlayerColor | null>(null)

  const playerId = playerService.getPlayerId()

  useEffect(() => {
    if (!open) return
    matchService.connect()

    const unsubStarted = matchService.onMatchStarted(() => {
      setWaiting(false)
      setCreatedGameId(null)
      onClose()
    })

    return unsubStarted
  }, [open, onClose])

  useEffect(() => {
    if (!open) {
      setWaiting(false)
      setCreating(false)
      setError(null)
      setCreatedGameId(null)
      setTimeControl('Unlimited')
      setGameType('Casual')
      setHostColor(null)
    }
  }, [open])

  if (!open) {
    return null
  }

  const createGame = async () => {
    setCreating(true)
    setError(null)
    try {
      const game = await apiService.createAnonymousGame({
        hostPlayerId: playerId,
        hostPlayerColor: hostColor,
      })
      setCreatedGameId(game.id)
      setWaiting(true)
      matchService.notifyGameAdded(game)
      toast.show('Game created — waiting for opponent', 'success')
    } catch (err) {
      console.error(err)
      const message = err instanceof Error ? err.message : 'Failed to create game'
      setError(message)
      toast.show(message, 'error')
      setWaiting(false)
    } finally {
      setCreating(false)
    }
  }

  const hide = async () => {
    if (createdGameId) {
      try {
        const cancelled = await apiService.cancelGame(createdGameId)
        matchService.notifyGameRemoved(cancelled)
      } catch (err) {
        console.error(err)
        matchService.cancelGame(createdGameId)
      }
    }
    setWaiting(false)
    setCreatedGameId(null)
    onClose()
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={() => void hide()}>
      <div className="modal create-game-modal" role="dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create game</h2>
          <button type="button" className="icon-btn" onClick={() => void hide()} aria-label="Close">
            ×
          </button>
        </div>

        {waiting ? (
          <div className="waiting">
            <p>Waiting for a player to join</p>
            <div className="spinner" />
          </div>
        ) : (
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault()
              void createGame()
            }}
          >
            <label className="field">
              <span>Time Control</span>
              <select value={timeControl} onChange={(e) => setTimeControl(e.target.value)}>
                {['Unlimited', 'Bullet', 'Blitz', 'Rapid', 'Classical'].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Game Type</span>
              <select value={gameType} onChange={(e) => setGameType(e.target.value)}>
                {['Casual', 'Rated'].map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>

            <div className="color-submits" aria-label="Host color">
              <button
                type="button"
                title="Black color"
                className={`color-submits__button${hostColor === PlayerColor.BLACK ? ' selected' : ''}`}
                onClick={() => setHostColor(PlayerColor.BLACK)}
              >
                <i style={{ backgroundImage: "url('/assets/colors/black-piece.svg')" }} />
              </button>
              <button
                type="button"
                title="Random color"
                className={`color-submits__button random${hostColor === null ? ' selected' : ''}`}
                onClick={() => setHostColor(null)}
              >
                <i style={{ backgroundImage: "url('/assets/colors/random-piece.svg')" }} />
              </button>
              <button
                type="button"
                title="White color"
                className={`color-submits__button${hostColor === PlayerColor.WHITE ? ' selected' : ''}`}
                onClick={() => setHostColor(PlayerColor.WHITE)}
              >
                <i style={{ backgroundImage: "url('/assets/colors/white-piece.svg')" }} />
              </button>
            </div>

            {error && <p className="error-text">{error}</p>}

            <div className="form-actions">
              <button type="submit" className="btn primary" disabled={creating}>
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
