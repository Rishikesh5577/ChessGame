import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { GameChessboard, type LocalMove } from '../components/GameChessboard'
import { GameResultDialog } from '../components/GameResultDialog'
import { useToast } from '../components/Toast'
import { matchService } from '../services/match'
import { playerService } from '../services/player'
import { PlayerColor, type GameDto, type MoveDto } from '../types/game'

type LocationState = {
  game?: GameDto
}

export function GamePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const stateGame = (location.state as LocationState | null)?.game
  const [game, setGame] = useState<GameDto | null>(
    () => stateGame ?? matchService.getCurrentMatch(),
  )
  const [currentTurn, setCurrentTurn] = useState<PlayerColor | undefined>(
    game?.currentTurn ?? PlayerColor.WHITE,
  )
  const [externalMove, setExternalMove] = useState<{ from: string; to: string; key: number } | null>(
    null,
  )
  const [resultOpen, setResultOpen] = useState(false)
  const [result, setResult] = useState<'win' | 'lose' | 'draw'>()
  const [pgn, setPgn] = useState('')
  const [moveSans, setMoveSans] = useState<string[]>([])
  const [inCheck, setInCheck] = useState(false)

  const playerId = playerService.getPlayerId()
  const playerColor = useMemo(() => {
    if (!game) return PlayerColor.WHITE
    return String(game.whitePlayerId).toLowerCase() === playerId.toLowerCase()
      ? PlayerColor.WHITE
      : PlayerColor.BLACK
  }, [game, playerId])

  const orientation = playerColor === PlayerColor.BLACK ? 'black' : 'white'
  const isMyTurn = currentTurn === playerColor

  useEffect(() => {
    if (stateGame) {
      matchService.setCurrentMatch(stateGame)
      setGame(stateGame)
      setCurrentTurn(stateGame.currentTurn ?? PlayerColor.WHITE)
    }
  }, [stateGame])

  useEffect(() => {
    if (!game) {
      navigate('/home', { replace: true })
    }
  }, [game, navigate])

  useEffect(() => {
    const unsub = matchService.onReceivedMove((move: MoveDto) => {
      if (move.color !== playerColor) {
        setExternalMove({ from: move.from, to: move.to, key: Date.now() })
      }
      setCurrentTurn(move.color === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE)

      if (move.isCheckmate) {
        // The side that just moved delivered checkmate — they win.
        setResult(playerColor === move.color ? 'win' : 'lose')
        setResultOpen(true)
      } else if (move.isStalemate) {
        setResult('draw')
        setResultOpen(true)
      }
    })
    return unsub
  }, [playerColor])

  const onPositionChange = useCallback(
    (info: { pgn: string; fen: string; inCheck: boolean; sans: string[] }) => {
      setPgn(info.pgn)
      setInCheck(info.inCheck)
      setMoveSans(info.sans)
    },
    [],
  )

  if (!game) {
    return null
  }

  const sendMove = (move: LocalMove) => {
    matchService.makeMove({
      gameId: game.id,
      color: move.color,
      from: move.from,
      to: move.to,
      isCheckmate: move.isCheckmate,
      isStalemate: move.isStalemate,
    })
    setCurrentTurn(move.color === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE)
    if (move.isCheckmate) {
      setResult('win')
      setResultOpen(true)
      toast.show('Checkmate! You win.', 'success')
    } else if (move.isStalemate) {
      setResult('draw')
      setResultOpen(true)
    }
  }

  const isYou = (id?: string) =>
    Boolean(id) && String(id).toLowerCase() === playerId.toLowerCase()

  const goHome = () => {
    setResultOpen(false)
    navigate('/home')
  }

  return (
    <div className="game-layout">
      <GameResultDialog
        open={resultOpen}
        result={result}
        onClose={() => setResultOpen(false)}
        onGoHome={goHome}
      />

      <div className="board-col">
        <div className={`turn-banner ${isMyTurn ? 'your-turn' : 'waiting-turn'}`}>
          {resultOpen
            ? 'Game over'
            : isMyTurn
              ? inCheck
                ? 'Your turn — you are in check!'
                : 'Your turn'
              : 'Waiting for opponent…'}
        </div>
        <GameChessboard
          orientation={orientation}
          playerColor={playerColor}
          currentTurn={currentTurn ?? PlayerColor.WHITE}
          externalMove={externalMove}
          onMove={sendMove}
          onPositionChange={onPositionChange}
        />
      </div>

      <aside className="side-col">
        <div className="card">
          <h3>Game Info</h3>
          <div className="player-row">
            <span className="dot white" />
            <div>
              <strong>{game.whitePlayerUsername}</strong> ({game.whitePlayerElo})
              {isYou(game.whitePlayerId) ? ' · You' : ''}
            </div>
          </div>
          <div className="player-row">
            <span className="dot black" />
            <div>
              <strong>{game.blackPlayerUsername}</strong> ({game.blackPlayerElo})
              {isYou(game.blackPlayerId) ? ' · You' : ''}
            </div>
          </div>
          <p className="meta">
            Turn: <strong>{currentTurn ?? '—'}</strong>
            {inCheck && !resultOpen ? ' · Check' : ''}
          </p>
          <p className="meta">Status: {game.status}</p>
          <div className="actions">
            <button type="button" className="btn" disabled title="Coming soon">
              Resign
            </button>
            <button type="button" className="btn" disabled title="Coming soon">
              Offer Draw
            </button>
          </div>
        </div>

        <div className="card">
          <h3>Moves</h3>
          <div className="move-list">
            {moveSans.length === 0 && <span className="muted">No moves yet</span>}
            {moveSans.map((san, idx) => (
              <span key={`${san}-${idx}`} className="move-chip">
                {Math.floor(idx / 2) + 1}
                {idx % 2 === 0 ? '.' : '...'} {san}
              </span>
            ))}
          </div>
        </div>

        <div className="card">
          <h3>PGN</h3>
          <textarea className="pgn-box" rows={8} readOnly value={pgn || 'No moves yet'} />
        </div>

        <Link className="btn ghost" to="/home">
          Back to lobby
        </Link>
      </aside>
    </div>
  )
}
