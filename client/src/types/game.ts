export const PlayerColor = {
  WHITE: 'WHITE',
  BLACK: 'BLACK',
} as const
export type PlayerColor = (typeof PlayerColor)[keyof typeof PlayerColor]

export const GameStatus = {
  OPEN: 'OPEN',
  ONGOING: 'ONGOING',
  DRAW: 'DRAW',
  RESIGNED: 'RESIGNED',
  COMPLETED: 'COMPLETED',
  ABORTED: 'ABORTED',
  CANCELLED: 'CANCELLED',
} as const
export type GameStatus = (typeof GameStatus)[keyof typeof GameStatus]

export interface GameDto {
  id: string
  hostPlayerId?: string
  hostPlayerUsername?: string
  hostPlayerColor?: PlayerColor
  hostPlayerElo?: number
  whitePlayerId?: string
  whitePlayerUsername?: string
  whitePlayerElo?: number
  blackPlayerId?: string
  blackPlayerUsername?: string
  blackPlayerElo?: number
  winnerPlayer?: PlayerColor
  status: GameStatus
  currentTurn?: PlayerColor
  isRanked: boolean
  isTimerEnabled: boolean
  pgn: string
  createdDate: string
}

export interface CreateAnonymousGameCommand {
  hostPlayerId: string
  hostPlayerColor: PlayerColor | null
}

export interface JoinGameCommand {
  gameId: string
  playerId: string
}

export interface CancelGameCommand {
  gameId: string
}

export interface ConnectPlayerCommand {
  playerId: string
}

export interface MakeMoveCommand {
  gameId: string
  color: PlayerColor
  from: string
  to: string
  isCheckmate: boolean
  isStalemate: boolean
}

export interface MoveDto {
  gameId: string
  color: PlayerColor
  from: string
  to: string
  isCheckmate: boolean
  isStalemate: boolean
}
