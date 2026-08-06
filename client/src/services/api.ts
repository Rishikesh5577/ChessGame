import { APP_CONFIG } from '../config'
import type { CreateAnonymousGameCommand, GameDto } from '../types/game'

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
}
