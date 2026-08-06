import { useEffect } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { ToastProvider, useToast } from './components/Toast'
import { Topbar } from './components/Topbar'
import { GamePage } from './pages/GamePage'
import { Lobby } from './pages/HomePage'
import { matchService } from './services/match'
import type { GameDto } from './types/game'
import './App.css'

function AppShell() {
  const navigate = useNavigate()
  const toast = useToast()

  useEffect(() => {
    matchService.connect()
    const unsub = matchService.onMatchStarted((game: GameDto) => {
      toast.show('Match started — good luck!', 'success')
      navigate('/game', { state: { game } })
    })
    return () => {
      unsub()
    }
  }, [navigate, toast])

  return (
    <div className="app">
      <Topbar />
      <main className="container">
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
