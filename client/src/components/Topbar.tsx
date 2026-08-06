import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CreateGameDialog } from './CreateGameDialog'
import { matchService } from '../services/match'

export function Topbar() {
  const [createOpen, setCreateOpen] = useState(false)
  const [playOpen, setPlayOpen] = useState(false)
  const [connected, setConnected] = useState(matchService.isConnected())

  useEffect(() => matchService.onConnectionChange(setConnected), [])

  return (
    <>
      <header className="topbar">
        <Link to="/home" className="brand">
          <span className="logo">♛</span>
          <h1>ChessBet</h1>
        </Link>

        <nav className="nav">
          <div className="dropdown">
            <button type="button" className="nav-link" onClick={() => setPlayOpen((v) => !v)}>
              PLAY ▾
            </button>
            {playOpen && (
              <div className="dropdown-menu">
                <button
                  type="button"
                  onClick={() => {
                    setPlayOpen(false)
                    setCreateOpen(true)
                  }}
                >
                  Create a game
                </button>
              </div>
            )}
          </div>
          <span className="nav-link muted-link" title="Coming soon">
            PUZZLES
          </span>
        </nav>

        <div className="topbar-end">
          <span className={`conn-pill compact ${connected ? 'online' : 'offline'}`}>
            {connected ? '● Live' : '○ Offline'}
          </span>
          <button type="button" className="btn ghost" disabled title="Auth coming soon">
            SIGN IN
          </button>
        </div>
      </header>

      <CreateGameDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  )
}
