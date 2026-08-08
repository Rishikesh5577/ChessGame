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

export const BotDifficulty = {
  EASY: 'EASY',
  MEDIUM: 'MEDIUM',
  HARD: 'HARD',
  IMPOSSIBLE: 'IMPOSSIBLE',
} as const
export type BotDifficulty = (typeof BotDifficulty)[keyof typeof BotDifficulty]

export const BOT_DIFFICULTY_LABELS: Record<BotDifficulty, string> = {
  EASY: 'Easy (~1400)',
  MEDIUM: 'Medium (~1800)',
  HARD: 'Hard (~2400)',
  IMPOSSIBLE: 'Impossible (full strength)',
}

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
  vsBot: boolean
  botColor?: PlayerColor
  botDifficulty?: BotDifficulty
  pgn: string
  createdDate: string
}

export interface CreateAnonymousGameCommand {
  hostPlayerId: string
  hostPlayerColor: PlayerColor | null
}

export interface CreateBotGameCommand {
  hostPlayerId: string
  hostPlayerColor: PlayerColor | null
  difficulty: BotDifficulty
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
  promotion?: string | null
  isCheckmate: boolean
  isStalemate: boolean
}

export interface MoveDto {
  gameId: string
  color: PlayerColor
  from: string
  to: string
  promotion?: string | null
  isCheckmate: boolean
  isStalemate: boolean
}

/** The human move being submitted. All fields null when asking the engine to open the game. */
export interface BotMoveCommand {
  from: string | null
  to: string | null
  promotion: string | null
}

export interface BotMoveDto {
  gameId: string
  color: PlayerColor | null
  from: string | null
  to: string | null
  promotion: string | null
  gameOver: boolean
}

export interface BotStatus {
  available: boolean
  reason: string
}

export interface FindMatchCommand {
  playerId: string
}

export interface CancelFindMatchCommand {
  playerId: string
}

export type MatchQueueStatus = 'WAITING' | 'CANCELLED' | 'FAILED'

export interface MatchQueueDto {
  playerId: string
  status: MatchQueueStatus
  timeoutMs: number
  expiresAtEpochMs: number
  message: string
}
