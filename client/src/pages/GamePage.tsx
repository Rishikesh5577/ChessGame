import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { GameChessboard, type LocalMove, type PositionInfo } from '../components/GameChessboard'
import { GameResultDialog } from '../components/GameResultDialog'
import { useToast } from '../components/Toast'
import { apiService } from '../services/api'
import { matchService } from '../services/match'
import { playerService } from '../services/player'
import {
  BOT_DIFFICULTY_LABELS,
  PlayerColor,
  type BotMoveCommand,
  type GameDto,
  type MoveDto,
} from '../types/game'

type LocationState = {
  game?: GameDto
}

type ExternalMove = {
  from: string
  to: string
  promotion?: string | null
  key: number
}

function avatarInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
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
  const [externalMove, setExternalMove] = useState<ExternalMove | null>(null)
  const [resultOpen, setResultOpen] = useState(false)
  const [result, setResult] = useState<'win' | 'lose' | 'draw'>()
  const [pgn, setPgn] = useState('')
  const [moveSans, setMoveSans] = useState<string[]>([])
  const [inCheck, setInCheck] = useState(false)
  const [botThinking, setBotThinking] = useState(false)
  const [botFailed, setBotFailed] = useState(false)

  const resultReported = useRef(false)
  const openingRequested = useRef(false)

  const playerId = playerService.getPlayerId()
  const playerColor = useMemo(() => {
    if (!game) return PlayerColor.WHITE
    return String(game.whitePlayerId).toLowerCase() === playerId.toLowerCase()
      ? PlayerColor.WHITE
      : PlayerColor.BLACK
  }, [game, playerId])

  const isBotGame = Boolean(game?.vsBot)
  const orientation = playerColor === PlayerColor.BLACK ? 'black' : 'white'
  const isMyTurn = currentTurn === playerColor

  const opponent = useMemo(() => {
    if (!game) return { name: 'Opponent', elo: 1200, isBot: false }
    const youAreWhite = playerColor === PlayerColor.WHITE
    return {
      name: youAreWhite ? (game.blackPlayerUsername ?? 'Opponent') : (game.whitePlayerUsername ?? 'Opponent'),
      elo: youAreWhite ? (game.blackPlayerElo ?? 1200) : (game.whitePlayerElo ?? 1200),
      isBot: Boolean(game.vsBot),
    }
  }, [game, playerColor])

  const you = useMemo(() => {
    if (!game) return { name: 'You', elo: 1200 }
    const youAreWhite = playerColor === PlayerColor.WHITE
    return {
      name: youAreWhite ? (game.whitePlayerUsername ?? 'You') : (game.blackPlayerUsername ?? 'You'),
      elo: youAreWhite ? (game.whitePlayerElo ?? 1200) : (game.blackPlayerElo ?? 1200),
    }
  }, [game, playerColor])

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

  const askEngine = useCallback(
    async (gameId: string, command: BotMoveCommand) => {
      setBotThinking(true)
      try {
        const reply = await apiService.playBotMove(gameId, command)

        if (reply.gameOver || !reply.from || !reply.to) {
          return
        }

        setExternalMove({
          from: reply.from,
          to: reply.to,
          promotion: reply.promotion,
          key: Date.now(),
        })
        setCurrentTurn(reply.color === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE)
      } catch (err) {
        console.error(err)
        setBotFailed(true)
        toast.show(err instanceof Error ? err.message : 'The engine could not reply', 'error')
      } finally {
        setBotThinking(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    if (!game?.vsBot || game.botColor !== PlayerColor.WHITE || openingRequested.current) {
      return
    }

    openingRequested.current = true
    void askEngine(game.id, { from: null, to: null, promotion: null })
  }, [game, askEngine])

  useEffect(() => {
    if (isBotGame) {
      return
    }

    const unsub = matchService.onReceivedMove((move: MoveDto) => {
      if (!game || move.gameId !== game.id || move.color === playerColor) {
        return
      }

      setExternalMove({
        from: move.from,
        to: move.to,
        promotion: move.promotion,
        key: Date.now(),
      })
      setCurrentTurn(move.color === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE)
    })

    return unsub
  }, [game, isBotGame, playerColor])

  const onPositionChange = useCallback(
    (info: PositionInfo) => {
      setPgn(info.pgn)
      setInCheck(info.inCheck)
      setMoveSans(info.sans)

      if (resultReported.current) {
        return
      }

      if (info.isCheckmate) {
        resultReported.current = true
        setResult(info.sideToMove === playerColor ? 'lose' : 'win')
        setResultOpen(true)
      } else if (info.isStalemate || info.isDraw) {
        resultReported.current = true
        setResult('draw')
        setResultOpen(true)
      }
    },
    [playerColor],
  )

  if (!game) {
    return null
  }

  const sendMove = (move: LocalMove) => {
    setCurrentTurn(move.color === PlayerColor.WHITE ? PlayerColor.BLACK : PlayerColor.WHITE)

    if (isBotGame) {
      void askEngine(game.id, {
        from: move.from,
        to: move.to,
        promotion: move.promotion ?? null,
      })
      return
    }

    matchService.makeMove({
      gameId: game.id,
      color: move.color,
      from: move.from,
      to: move.to,
      promotion: move.promotion ?? null,
      isCheckmate: move.isCheckmate,
      isStalemate: move.isStalemate,
    })
  }

  const goHome = () => {
    setResultOpen(false)
    navigate('/home')
  }

  const opponentSubtitle = isBotGame
    ? BOT_DIFFICULTY_LABELS[game.botDifficulty ?? 'IMPOSSIBLE']
    : `Rating ${opponent.elo}`

  const statusText = () => {
    if (resultOpen) {
      if (result === 'win') return 'You won!'
      if (result === 'lose') return 'You lost.'
      return 'Draw.'
    }
    if (botFailed) return 'Engine error — return to the lobby.'
    if (botThinking) return `${opponent.name} is thinking…`
    if (isMyTurn) {
      return inCheck
        ? 'Your turn — you are in check! Click any valid piece to move.'
        : 'Your turn. Click any valid piece to move.'
    }
    return isBotGame ? `${opponent.name} is thinking…` : 'Waiting for opponent…'
  }

  return (
    <div className="game-layout classic-table">
      <GameResultDialog
        open={resultOpen}
        result={result}
        onClose={() => setResultOpen(false)}
        onGoHome={goHome}
      />

      <div className="board-col">
        <div className="felt-mat">
          <div className="seat opponent-seat">
            <div className={`seat-avatar${opponent.isBot ? ' bot' : ''}`} aria-hidden>
              {opponent.isBot ? '♛' : avatarInitials(opponent.name)}
            </div>
            <div className="seat-meta">
              <strong className="seat-name">{opponent.name}</strong>
              <span className="seat-sub">{opponentSubtitle}</span>
            </div>
          </div>

          <GameChessboard
            orientation={orientation}
            playerColor={playerColor}
            currentTurn={currentTurn ?? PlayerColor.WHITE}
            externalMove={externalMove}
            onMove={sendMove}
            onPositionChange={onPositionChange}
          />

          <p className="table-status">{statusText()}</p>

          <div className="seat you-seat">
            <div className="seat-avatar you" aria-hidden>
              {avatarInitials(you.name === 'Anonymous' ? 'You' : you.name)}
            </div>
            <div className="seat-meta">
              <strong className="seat-name">
                {you.name === 'Anonymous' ? 'You' : you.name}
              </strong>
              <span className="seat-sub">Rating {you.elo}</span>
            </div>
          </div>
        </div>
      </div>

      <aside className="side-col">
        <div className="card">
          <h3>Game Info</h3>
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
