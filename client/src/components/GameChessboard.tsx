import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Chess, type Square } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import type { PieceDropHandlerArgs, SquareHandlerArgs } from 'react-chessboard'
import { PlayerColor } from '../types/game'

export type LocalMove = {
  from: string
  to: string
  color: PlayerColor
  promotion?: string
  isCheckmate: boolean
  isStalemate: boolean
  san?: string
}

export type PositionInfo = {
  pgn: string
  fen: string
  inCheck: boolean
  sans: string[]
  isCheckmate: boolean
  isStalemate: boolean
  isDraw: boolean
  sideToMove: PlayerColor
}

type Props = {
  orientation: 'white' | 'black'
  playerColor: PlayerColor
  currentTurn?: PlayerColor
  externalMove?: { from: string; to: string; promotion?: string | null; key?: number } | null
  onMove: (move: LocalMove) => void
  onPositionChange?: (info: PositionInfo) => void
}

type PendingPromotion = {
  from: string
  to: string
}

/** Flat wood colours (no per-square gradient). */
const LIGHT_WOOD: CSSProperties = {
  backgroundColor: '#e8c992',
}

const DARK_WOOD: CSSProperties = {
  backgroundColor: '#b07038',
}

const FILES_WHITE = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
const RANKS_WHITE = ['8', '7', '6', '5', '4', '3', '2', '1']

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
  const [boardWidth, setBoardWidth] = useState(() => {
    if (typeof window === 'undefined') return 320
    const vw = window.innerWidth
    return Math.floor(Math.min(480, Math.max(180, vw - 56)))
  })
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null)
  const [pendingPromotion, setPendingPromotion] = useState<PendingPromotion | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)

  const files = orientation === 'white' ? FILES_WHITE : [...FILES_WHITE].reverse()
  const ranks = orientation === 'white' ? RANKS_WHITE : [...RANKS_WHITE].reverse()

  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return

    const update = () => {
      const vw = window.visualViewport?.width ?? window.innerWidth
      const vh = window.visualViewport?.height ?? window.innerHeight

      const felt = wrap.closest('.felt-mat') as HTMLElement | null
      const col = wrap.closest('.board-col') as HTMLElement | null
      const mid = wrap.closest('.frame-mid') as HTMLElement | null

      const leftCoord = mid?.querySelector('.coord-col.left') as HTMLElement | null
      const rightCoord = mid?.querySelector('.coord-col.right') as HTMLElement | null
      const gutterX =
        (leftCoord?.offsetWidth || 18) + (rightCoord?.offsetWidth || 18)

      /* Measure outer containers — never the board itself (avoids grow loop). */
      const outerW = Math.min(
        felt?.clientWidth ?? Number.POSITIVE_INFINITY,
        col?.clientWidth ?? Number.POSITIVE_INFINITY,
        vw,
      )

      const horizontalPad = 8
      const availableW = Math.max(140, outerW - gutterX - horizontalPad)

      const stacked = vw <= 860
      const chromeY = stacked ? 200 : 176
      const availableH = Math.max(140, vh - chromeY)

      const size = Math.floor(Math.min(availableW, availableH, 640))
      setBoardWidth((prev) => (prev === size ? prev : size))
    }

    update()
    requestAnimationFrame(update)

    const ro = new ResizeObserver(update)
    const felt = wrap.closest('.felt-mat')
    const col = wrap.closest('.board-col')
    if (felt) ro.observe(felt)
    if (col) ro.observe(col)

    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    window.visualViewport?.addEventListener('resize', update)

    return () => {
      ro.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [])

  useEffect(() => {
    onPositionChange?.({
      pgn: game.pgn(),
      fen: game.fen(),
      inCheck: game.isCheck(),
      sans: game.history(),
      isCheckmate: game.isCheckmate(),
      isStalemate: game.isStalemate(),
      isDraw: game.isDraw(),
      sideToMove: game.turn() === 'w' ? PlayerColor.WHITE : PlayerColor.BLACK,
    })
  }, [game, onPositionChange])

  useEffect(() => {
    if (!externalMove) {
      return
    }
    setGame((prev) => {
      const next = new Chess(prev.fen())
      const promotion = (externalMove.promotion ?? 'q') as 'q' | 'r' | 'b' | 'n'
      const result = tryMove(next, externalMove.from, externalMove.to, promotion)
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
      promotion: result.promotion,
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
      styles[lastMove.from] = { backgroundColor: 'rgba(186, 202, 68, 0.55)' }
      styles[lastMove.to] = { backgroundColor: 'rgba(186, 202, 68, 0.72)' }
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
      styles[selectedSquare] = { backgroundColor: 'rgba(186, 202, 68, 0.85)' }
    }

    for (const target of legalTargets) {
      styles[target.square] = target.isCapture
        ? {
            background:
              'radial-gradient(circle, transparent 0%, transparent 68%, rgba(20, 40, 20, 0.45) 68%)',
          }
        : {
            background:
              'radial-gradient(circle, rgba(20, 40, 20, 0.4) 16%, transparent 17%)',
          }
    }

    return styles
  }, [selectedSquare, legalTargets, lastMove, game])

  const promoColor = playerColor === PlayerColor.WHITE ? 'w' : 'b'

  return (
    <div ref={frameRef} className="wood-frame" aria-label="Chess board">
      <div className="coord-row top" aria-hidden>
        {files.map((f) => (
          <span key={`t-${f}`}>{f.toUpperCase()}</span>
        ))}
      </div>

      <div className="frame-mid">
        <div className="coord-col left" aria-hidden>
          {ranks.map((r) => (
            <span key={`l-${r}`}>{r}</span>
          ))}
        </div>

        <div ref={wrapRef} className="board-wrap">
          <Chessboard
            options={{
              id: 'chessbet-board',
              position: fen,
              boardOrientation: orientation,
              showNotation: false,
              animationDurationInMs: 180,
              boardStyle: {
                width: boardWidth,
                maxWidth: '100%',
                borderRadius: 0,
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.35)',
              },
              darkSquareStyle: DARK_WOOD,
              lightSquareStyle: LIGHT_WOOD,
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

        <div className="coord-col right" aria-hidden>
          {ranks.map((r) => (
            <span key={`r-${r}`}>{r}</span>
          ))}
        </div>
      </div>

      <div className="coord-row bottom" aria-hidden>
        {files.map((f) => (
          <span key={`b-${f}`}>{f.toUpperCase()}</span>
        ))}
      </div>
    </div>
  )
}
