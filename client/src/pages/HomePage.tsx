import { useEffect, useState } from 'react'
import { CreateGameDialog } from '../components/CreateGameDialog'
import { matchService } from '../services/match'
import { playerService } from '../services/player'

export function Lobby() {
  const [connected, setConnected] = useState(matchService.isConnected())
  const [findOpen, setFindOpen] = useState(false)
  const playerId = playerService.getPlayerId()

  useEffect(() => {
    matchService.connect()
    return matchService.onConnectionChange(setConnected)
  }, [])

  return (
    <section className="lobby">
      <div className="lobby-head">
        <div>
          <h2>Play</h2>
          <p className="muted tight">Find a human, or play the bot if nobody joins</p>
        </div>
        <div className={`conn-pill ${connected ? 'online' : 'offline'}`}>
          {connected ? 'Live' : 'Connecting…'}
        </div>
      </div>

      <div className="find-match-hero">
        <p>
          Press <strong>Find Match</strong>. If another player is searching, you are paired right
          away. If you wait alone for 30 seconds, Stockfish takes the other seat.
        </p>
        <button
          type="button"
          className="btn primary find-match-cta"
          disabled={!connected}
          onClick={() => setFindOpen(true)}
        >
          Find Match
        </button>
      </div>

      <p className="muted player-id">Your ID: {playerId}</p>

      <CreateGameDialog open={findOpen} onClose={() => setFindOpen(false)} />
    </section>
  )
}
