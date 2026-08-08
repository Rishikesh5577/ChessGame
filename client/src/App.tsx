import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { ToastProvider, useToast } from './components/Toast'
import { Topbar } from './components/Topbar'
import { GamePage } from './pages/GamePage'
import { Lobby } from './pages/HomePage'
import { matchService } from './services/match'
import type { GameDto } from './types/game'
import './App.css'

function AppShell() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const isGamePage = location.pathname.startsWith('/game')

  useEffect(() => {
    matchService.connect()
    const unsub = matchService.onMatchStarted((game: GameDto) => {
      toast.show(
        game.vsBot ? 'Matched with Stockfish — good luck!' : 'Match started — good luck!',
        'success',
      )
      navigate('/game', { state: { game } })
    })
    return () => {
      unsub()
    }
  }, [navigate, toast])

  return (
    <div className={`app${isGamePage ? ' game-theme' : ''}`}>
      <Topbar />
      <main className={`container${isGamePage ? ' container-game' : ''}`}>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<Lobby />} />
          <Route path="/game" element={<GamePage />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AppShell />
    </ToastProvider>
  )
}
