import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs'
import { APP_CONFIG } from '../config'
import { playerService } from './player'
import type {
  CancelFindMatchCommand,
  CancelGameCommand,
  ConnectPlayerCommand,
  CreateAnonymousGameCommand,
  FindMatchCommand,
  GameDto,
  JoinGameCommand,
  MakeMoveCommand,
  MatchQueueDto,
  MoveDto,
} from '../types/game'

type Listener<T> = (value: T) => void

function sameId(a?: string | null, b?: string | null): boolean {
  if (!a || !b) return false
  return String(a).toLowerCase() === String(b).toLowerCase()
}

class MatchService {
  private client: Client | null = null
  private subscriptions: StompSubscription[] = []
  private currentMatch: GameDto | null = null
  private connecting = false
  private readonly pendingPublishes: Array<{ destination: string; body: string }> = []

  private gameAddedListeners = new Set<Listener<GameDto>>()
  private gameRemovedListeners = new Set<Listener<GameDto>>()
  private receivedMoveListeners = new Set<Listener<MoveDto>>()
  private matchStartedListeners = new Set<Listener<GameDto>>()
  private queueListeners = new Set<Listener<MatchQueueDto>>()
  private connectionListeners = new Set<Listener<boolean>>()

  connect(): void {
    if (this.client?.active || this.connecting) {
      return
    }

    this.connecting = true
    this.client = new Client({
      brokerURL: APP_CONFIG.wsUrl,
      reconnectDelay: 3000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: (msg) => console.debug('[stomp]', msg),
      onConnect: () => {
        this.connecting = false
        this.subscribeToGameEvents()
        const connectPlayer: ConnectPlayerCommand = {
          playerId: playerService.getPlayerId(),
        }
        this.client?.publish({
          destination: '/app/player/connect',
          body: JSON.stringify(connectPlayer),
        })
        this.flushPending()
        this.connectionListeners.forEach((l) => l(true))
      },
      onDisconnect: () => {
        this.connecting = false
        this.connectionListeners.forEach((l) => l(false))
      },
      onStompError: (frame) => {
        this.connecting = false
        console.error('[stomp] broker error', frame.headers['message'], frame.body)
      },
      onWebSocketError: (event) => {
        this.connecting = false
        console.error('[stomp] websocket error', event)
      },
    })

    this.client.activate()
  }

  isConnected(): boolean {
    return Boolean(this.client?.connected)
  }

  onConnectionChange(listener: Listener<boolean>): () => void {
    this.connectionListeners.add(listener)
    listener(this.isConnected())
    return () => this.connectionListeners.delete(listener)
  }

  getCurrentMatch(): GameDto | null {
    return this.currentMatch
  }

  setCurrentMatch(game: GameDto | null): void {
    this.currentMatch = game
  }

  onGameAdded(listener: Listener<GameDto>): () => void {
    this.gameAddedListeners.add(listener)
    return () => this.gameAddedListeners.delete(listener)
  }

  onGameRemoved(listener: Listener<GameDto>): () => void {
    this.gameRemovedListeners.add(listener)
    return () => this.gameRemovedListeners.delete(listener)
  }

  onReceivedMove(listener: Listener<MoveDto>): () => void {
    this.receivedMoveListeners.add(listener)
    return () => this.receivedMoveListeners.delete(listener)
  }

  onMatchStarted(listener: Listener<GameDto>): () => void {
    this.matchStartedListeners.add(listener)
    return () => this.matchStartedListeners.delete(listener)
  }

  onQueueStatus(listener: Listener<MatchQueueDto>): () => void {
    this.queueListeners.add(listener)
    return () => this.queueListeners.delete(listener)
  }

  /** Notify local UI immediately (e.g. after REST create) even if WS echo is delayed. */
  notifyGameAdded(game: GameDto): void {
    this.gameAddedListeners.forEach((l) => l(game))
  }

  notifyGameRemoved(game: GameDto): void {
    this.gameRemovedListeners.forEach((l) => l(game))
  }

  findMatch(): void {
    const command: FindMatchCommand = {
      playerId: playerService.getPlayerId(),
    }
    this.publish('/app/match/find', command)
  }

  cancelFind(): void {
    const command: CancelFindMatchCommand = {
      playerId: playerService.getPlayerId(),
    }
    this.publish('/app/match/cancelFind', command)
  }

  createAnonymousGame(command: CreateAnonymousGameCommand): void {
    this.publish('/app/game/createAnonymous', command)
  }

  cancelGame(gameId: string): void {
    const command: CancelGameCommand = { gameId }
    this.publish('/app/game/cancel', command)
  }

  joinGame(gameId: string, isAnonymous: boolean): void {
    const command: JoinGameCommand = {
      gameId,
      playerId: playerService.getPlayerId(),
    }
    const destination = isAnonymous ? '/app/match/joinAnonymous' : '/app/match/join'
    this.publish(destination, command)
  }

  makeMove(command: MakeMoveCommand): void {
    this.publish('/app/match/move', command)
  }

  private publish(destination: string, body: unknown): void {
    const payload = JSON.stringify(body)
    if (!this.client?.connected) {
      this.connect()
      this.pendingPublishes.push({ destination, body: payload })
      console.warn('[stomp] queued until connected:', destination)
      return
    }
    this.client.publish({ destination, body: payload })
  }

  private flushPending(): void {
    if (!this.client?.connected) return
    while (this.pendingPublishes.length > 0) {
      const next = this.pendingPublishes.shift()
      if (!next) break
      this.client.publish(next)
    }
  }

  private subscribeToGameEvents(): void {
    if (!this.client) {
      return
    }

    this.subscriptions.forEach((sub) => sub.unsubscribe())
    this.subscriptions = []

    this.subscriptions.push(
      this.client.subscribe('/topic/match.join', (message: IMessage) => {
        const game = JSON.parse(message.body) as GameDto
        this.gameRemovedListeners.forEach((l) => l(game))

        const playerId = playerService.getPlayerId()
        const isParticipant =
          sameId(game.whitePlayerId, playerId) || sameId(game.blackPlayerId, playerId)

        if (isParticipant) {
          this.currentMatch = game
          this.matchStartedListeners.forEach((l) => l(game))
        }
      }),
    )

    this.subscriptions.push(
      this.client.subscribe('/topic/match.queue', (message: IMessage) => {
        const status = JSON.parse(message.body) as MatchQueueDto
        const playerId = playerService.getPlayerId()
        if (!sameId(status.playerId, playerId)) {
          return
        }
        this.queueListeners.forEach((l) => l(status))
      }),
    )

    this.subscriptions.push(
      this.client.subscribe('/topic/match.moveReceived', (message: IMessage) => {
        const move = JSON.parse(message.body) as MoveDto
        this.receivedMoveListeners.forEach((l) => l(move))
      }),
    )

    this.subscriptions.push(
      this.client.subscribe('/topic/game.created', (message: IMessage) => {
        const game = JSON.parse(message.body) as GameDto
        this.gameAddedListeners.forEach((l) => l(game))
      }),
    )

    this.subscriptions.push(
      this.client.subscribe('/topic/game.cancelled', (message: IMessage) => {
        const game = JSON.parse(message.body) as GameDto
        this.gameRemovedListeners.forEach((l) => l(game))
      }),
    )
  }
}

export const matchService = new MatchService()
