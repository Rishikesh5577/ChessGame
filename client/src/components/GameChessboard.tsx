import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import { Chess, type Square } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import type { PieceDropHandlerArgs, SquareHandlerArgs } from 'react-chessboard'
import { PlayerColor } from '../types/game'

export type LocalMove = {
  from: string
  to: string
  color: PlayerColor
  isCheckmate: boolean
  isStalemate: boolean
  san?: string
}

type Props = {
  orientation: 'white' | 'black'
  playerColor: PlayerColor
  currentTurn?: PlayerColor
  externalMove?: { from: string; to: string; key?: number } | null
  onMove: (move: LocalMove) => void
  onPositionChange?: (info: {
    pgn: string
    fen: string
    inCheck: boolean
    sans: string[]
  }) => void
}

type PendingPromotion = {
  from: string
  to: string
}

function tryMove(game: Chess, from: string, to: string, promotion: 'q' | 'r' | 'b' | 'n' = 'q') {
  if (!from || !to || from === to) {
    return null
  }
  try {
    return game.move({
      from: from as Square,
      to: to as Square,
      promotion,
    })
  } catch {
    return null
  }
}

function needsPromotion(game: Chess, from: string, to: string): boolean {
  const piece = game.get(from as Square)
  if (!piece || piece.type !== 'p') return false
  const rank = to[1]
  return (piece.color === 'w' && rank === '8') || (piece.color === 'b' && rank === '1')
}

export function GameChessboard({
  orientation,
  playerColor,
  currentTurn,
  externalMove,
  onMove,
  onPositionChange,
}: Props) {
  const [game, setGame] = useState(() => new Chess())
  const [fen, setFen] = useState(() => game.fen())
  const [boardWidth, setBoardWidth] = useState(480)
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null)

  useEffect(() => {
    const resize = () => {
      const size = Math.min(window.innerWidth, window.innerHeight)
      setBoardWidth(Math.max(size - 220, 280))
    }
    resize()
    window.addEventListener('resize', resize)
    return () => window.removeEventListener('resize', resize)
  }, [])

  useEffect(() => {
    onPositionChange?.({
      pgn: game.pgn(),
      fen: game.fen(),
      inCheck: game.isCheck(),
      sans: game.history(),
    })
  }, [game, onPositionChange])

  useEffect(() => {
    if (!externalMove) {
      return
    }
    setGame((prev) => {
      const next = new Chess(prev.fen())
      const result = tryMove(next, externalMove.from, externalMove.to)
      if (result) {
        setFen(next.fen())
        setSelectedSquare(null)
        setPendingPromotion(null)
        setLastMove({ from: externalMove.from, to: externalMove.to })
        return next
      }
      return prev
    })
  }, [externalMove])

  const canMove = useMemo(() => {
    if (!currentTurn) return false
    return currentTurn === playerColor
  }, [currentTurn, playerColor])

  const expectedTurn = playerColor === PlayerColor.WHITE ? 'w' : 'b'

  const commitMove = (from: string, to: string, promotion: 'q' | 'r' | 'b' | 'n' = 'q'): boolean => {
    if (!canMove || game.turn() !== expectedTurn) {
      return false
    }

    const next = new Chess(game.fen())
    const result = tryMove(next, from, to, promotion)
    if (!result) {
      return false
    }

    setGame(next)
    setFen(next.fen())
    setSelectedSquare(null)
    setPendingPromotion(null)
    setLastMove({ from, to })
    onMove({
      from,
      to,
      color: playerColor,
      isCheckmate: next.isCheckmate(),
      isStalemate: next.isStalemate(),
      san: result.san,
    })
    return true
  }

  const requestMove = (from: string, to: string): boolean => {
    if (!canMove || game.turn() !== expectedTurn) {
      return false
    }
    if (needsPromotion(game, from, to)) {
      setPendingPromotion({ from, to })
      setSelectedSquare(null)
      return true
    }
    return commitMove(from, to)
  }

  const onPieceDrop = ({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
    if (!targetSquare || sourceSquare === targetSquare) {
      return false
    }
    return requestMove(sourceSquare, targetSquare)
  }

  const onPieceDrag = ({ square }: { square: string | null }) => {
    if (!canMove || !square || game.turn() !== expectedTurn) {
      return
    }
    setSelectedSquare(square)
  }

  const onSquareClick = ({ square, piece }: SquareHandlerArgs) => {
    if (pendingPromotion) return

    if (!canMove || game.turn() !== expectedTurn) {
      setSelectedSquare(null)
      return
    }

    if (!selectedSquare) {
      if (!piece) return
      const isWhitePiece = piece.pieceType.startsWith('w')
      const isOwn = playerColor === PlayerColor.WHITE ? isWhitePiece : !isWhitePiece
      if (isOwn) setSelectedSquare(square)
      return
    }

    if (selectedSquare === square) {
      setSelectedSquare(null)
      return
    }

    const moved = requestMove(selectedSquare, square)
    if (!moved && piece) {
      const isWhitePiece = piece.pieceType.startsWith('w')
      const isOwn = playerColor === PlayerColor.WHITE ? isWhitePiece : !isWhitePiece
      setSelectedSquare(isOwn ? square : null)
    } else if (!moved) {
      setSelectedSquare(null)
    }
  }

  const legalTargets = useMemo(() => {
    if (!selectedSquare || !canMove || game.turn() !== expectedTurn) {
      return [] as Array<{ square: string; isCapture: boolean }>
    }
    try {
      return game
        .moves({ square: selectedSquare as Square, verbose: true })
        .map((move) => ({
          square: move.to,
          isCapture: Boolean(move.captured),
        }))
    } catch {
      return []
    }
  }, [selectedSquare, canMove, expectedTurn, game])

  const squareStyles = useMemo(() => {
    const styles: Record<string, CSSProperties> = {}

    if (lastMove) {
      styles[lastMove.from] = { background: 'rgba(250, 204, 21, 0.35)' }
      styles[lastMove.to] = { background: 'rgba(250, 204, 21, 0.55)' }
    }

    if (game.isCheck()) {
      const board = game.board()
      for (const row of board) {
        for (const cell of row) {
          if (cell && cell.type === 'k' && cell.color === game.turn()) {
            styles[cell.square] = {
              background:
                'radial-gradient(ellipse at center, rgba(255,0,0,0.75) 0%, rgba(231,0,0,0.45) 40%, transparent 75%)',
            }
          }
        }
      }
    }

    if (selectedSquare) {
      styles[selectedSquare] = { background: 'rgba(250, 204, 21, 0.65)' }
    }

    for (const target of legalTargets) {
      styles[target.square] = target.isCapture
        ? {
            background:
              'radial-gradient(circle, transparent 0%, transparent 72%, rgba(19, 38, 47, 0.55) 72%)',
          }
        : {
            background:
              'radial-gradient(circle, rgba(19, 38, 47, 0.45) 18%, transparent 19%)',
          }
    }

    return styles
  }, [selectedSquare, legalTargets, lastMove, game])

  const promoColor = playerColor === PlayerColor.WHITE ? 'w' : 'b'

  return (
    <div className="board-wrap" style={{ width: boardWidth, maxWidth: '100%' }}>
      <Chessboard
        options={{
          id: 'chessbet-board',
          position: fen,
          boardOrientation: orientation,
          showNotation: true,
          animationDurationInMs: 200,
          boardStyle: {
            width: boardWidth,
            borderRadius: '4px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
          },
          darkSquareStyle: { backgroundColor: '#b96331' },
          lightSquareStyle: { backgroundColor: '#f0c697' },
          squareStyles,
          allowDragging: canMove && !pendingPromotion,
          canDragPiece: ({ piece }) => {
            const isWhitePiece = piece.pieceType.startsWith('w')
            return playerColor === PlayerColor.WHITE ? isWhitePiece : !isWhitePiece
          },
          onPieceDrop,
          onPieceDrag,
          onSquareClick,
        }}
      />

      {pendingPromotion && (
        <div className="promotion-bar" role="dialog" aria-label="Choose promotion piece">
          <span>Promote to</span>
          {(
            [
              ['q', 'Queen'],
              ['r', 'Rook'],
              ['b', 'Bishop'],
              ['n', 'Knight'],
            ] as const
          ).map(([code, label]) => (
            <button
              key={code}
              type="button"
              className="promo-btn"
              title={label}
              onClick={() => commitMove(pendingPromotion.from, pendingPromotion.to, code)}
            >
              {code === 'q' ? (promoColor === 'w' ? '♕' : '♛') : null}
              {code === 'r' ? (promoColor === 'w' ? '♖' : '♜') : null}
              {code === 'b' ? (promoColor === 'w' ? '♗' : '♝') : null}
              {code === 'n' ? (promoColor === 'w' ? '♘' : '♞') : null}
            </button>
          ))}
          <button
            type="button"
            className="btn ghost"
            onClick={() => setPendingPromotion(null)}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
