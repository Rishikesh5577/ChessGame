import { APP_CONFIG } from '../config'
import type {
  BotMoveCommand,
  BotMoveDto,
  BotStatus,
  CreateAnonymousGameCommand,
  CreateBotGameCommand,
  GameDto,
} from '../types/game'

async function request<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${APP_CONFIG.apiUrl}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `Request failed: ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export const apiService = {
  getGames(): Promise<GameDto[]> {
    return request<GameDto[]>('/games?gameStatus=OPEN')
  },
  getGame(id: string): Promise<GameDto> {
    return request<GameDto>(`/games/${id}`)
  },
  createAnonymousGame(command: CreateAnonymousGameCommand): Promise<GameDto> {
    return request<GameDto>('/games/anonymous', {
      method: 'POST',
      body: JSON.stringify(command),
    })
  },
  cancelGame(gameId: string): Promise<GameDto> {
    return request<GameDto>(`/games/${gameId}/cancel`, {
      method: 'POST',
    })
  },
  getBotStatus(): Promise<BotStatus> {
    return request<BotStatus>('/bot/status')
  },
  createBotGame(command: CreateBotGameCommand): Promise<GameDto> {
    return request<GameDto>('/games/vs-bot', {
      method: 'POST',
      body: JSON.stringify(command),
    })
  },
  /** Submits the human move (if any) and returns the engine's reply. */
  playBotMove(gameId: string, command: BotMoveCommand): Promise<BotMoveDto> {
    return request<BotMoveDto>(`/games/${gameId}/bot-move`, {
      method: 'POST',
      body: JSON.stringify(command),
    })
  },
}
