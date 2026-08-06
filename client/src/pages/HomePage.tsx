import { useEffect, useMemo, useState } from 'react'
import { useToast } from '../components/Toast'
import { apiService } from '../services/api'
import { matchService } from '../services/match'
import { playerService } from '../services/player'
import { GameStatus, PlayerColor, type GameDto } from '../types/game'

const PAGE_SIZE = 8

function hostColorLabel(game: GameDto): string {
  if (game.hostPlayerColor === PlayerColor.WHITE) return 'White'
  if (game.hostPlayerColor === PlayerColor.BLACK) return 'Black'
  return 'Random'
}

export function Lobby() {
  const toast = useToast()
  const [games, setGames] = useState<GameDto[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [joiningId, setJoiningId] = useState<string | null>(null)
  const [connected, setConnected] = useState(matchService.isConnected())
  const playerId = playerService.getPlayerId()

  useEffect(() => {
    let alive = true
    setLoading(true)
    matchService.connect()
    const unsubConn = matchService.onConnectionChange(setConnected)

    apiService
      .getGames()
      .then((result) => {
        if (!alive) return
        setGames(result.filter((g) => g.status === GameStatus.OPEN))
      })
      .catch((err) => {
        console.error(err)
        toast.show('Could not load lobby games', 'error')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    const unsubAdded = matchService.onGameAdded((game) => {
      setGames((prev) => [game, ...prev.filter((g) => g.id !== game.id)])
    })
    const unsubRemoved = matchService.onGameRemoved((game) => {
      setGames((prev) => prev.filter((g) => g.id !== game.id))
    })

    return () => {
      alive = false
      unsubConn()
      unsubAdded()
      unsubRemoved()
    }
  }, [toast])

  const pageCount = Math.max(1, Math.ceil(games.length / PAGE_SIZE))
  const pageGames = useMemo(() => {
    const start = page * PAGE_SIZE
    return games.slice(start, start + PAGE_SIZE)
  }, [games, page])

  useEffect(() => {
    if (page > pageCount - 1) {
      setPage(Math.max(0, pageCount - 1))
    }
  }, [page, pageCount])

  const joinGame = (game: GameDto) => {
    matchService.connect()
    setJoiningId(game.id)
    const isAnonymous = (game.hostPlayerUsername ?? 'Anonymous') === 'Anonymous'
    matchService.joinGame(game.id, isAnonymous)
    toast.show('Joining game…', 'info')
    window.setTimeout(() => setJoiningId(null), 2500)
  }

  return (
    <section className="lobby">
      <div className="lobby-head">
        <div>
          <h2>Lobby</h2>
          <p className="muted tight">Open games waiting for an opponent</p>
        </div>
        <div className={`conn-pill ${connected ? 'online' : 'offline'}`}>
          {connected ? 'Live' : 'Connecting…'}
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Color</th>
              <th>Player</th>
              <th>Rating</th>
              <th>Time</th>
              <th>Mode</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6}>Loading…</td>
              </tr>
            )}
            {!loading && games.length === 0 && (
              <tr>
                <td colSpan={6}>
                  No open games. Use <strong>PLAY → Create a game</strong> to host one.
                </td>
              </tr>
            )}
            {pageGames.map((game) => {
              const isHost =
                String(game.hostPlayerId ?? '').toLowerCase() === playerId.toLowerCase()
              return (
                <tr key={game.id} className={isHost ? 'row-mine' : undefined}>
                  <td>{hostColorLabel(game)}</td>
                  <td>
                    {game.hostPlayerUsername ?? 'Anonymous'}
                    {isHost ? ' (You)' : ''}
                  </td>
                  <td>{game.hostPlayerElo ?? 1200}</td>
                  <td>Unlimited</td>
                  <td>Classic</td>
                  <td>
                    {!isHost && (
                      <button
                        type="button"
                        className="btn primary"
                        disabled={loading || joiningId === game.id}
                        onClick={() => joinGame(game)}
                      >
                        {joiningId === game.id ? 'Joining…' : 'Join'}
                      </button>
                    )}
                    {isHost && <span className="waiting-tag">Waiting</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {games.length > PAGE_SIZE && (
        <div className="pager">
          <button
            type="button"
            className="btn"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </button>
          <span>
            Page {page + 1} / {pageCount}
          </span>
          <button
            type="button"
            className="btn"
            disabled={page >= pageCount - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      <p className="muted">Your ID: {playerId}</p>
    </section>
  )
}
