/**
 * Smoke: two findMatch → PvP; one findMatch alone → bot after short timeout.
 * Requires backend on :8000. Run: node scripts/matchmaking-smoke.mjs
 */
import { Client } from '@stomp/stompjs'
import WebSocket from 'ws'

globalThis.WebSocket = WebSocket

const WS_URL = process.env.WS_URL || 'ws://127.0.0.1:8000/ws'

function connect(playerId) {
  return new Promise((resolve, reject) => {
    const events = []
    const client = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 0,
      debug: () => {},
      onConnect: () => {
        client.subscribe('/topic/match.join', (msg) => {
          events.push({ type: 'join', body: JSON.parse(msg.body) })
        })
        client.subscribe('/topic/match.queue', (msg) => {
          const body = JSON.parse(msg.body)
          if (String(body.playerId).toLowerCase() === String(playerId).toLowerCase()) {
            events.push({ type: 'queue', body })
          }
        })
        client.publish({
          destination: '/app/player/connect',
          body: JSON.stringify({ playerId }),
        })
        resolve({ client, events, playerId })
      },
      onStompError: (f) => reject(new Error(f.headers['message'] || 'stomp error')),
      onWebSocketError: (e) => reject(e),
    })
    client.activate()
  })
}

function find(session) {
  session.client.publish({
    destination: '/app/match/find',
    body: JSON.stringify({ playerId: session.playerId }),
  })
}

function waitFor(session, pred, ms) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (session.events.some(pred)) return resolve(session.events.find(pred))
      if (Date.now() - start > ms) return reject(new Error('timeout waiting for event'))
      setTimeout(tick, 50)
    }
    tick()
  })
}

const idA = crypto.randomUUID()
const idB = crypto.randomUUID()

console.log('Connecting…')
const a = await connect(idA)
const b = await connect(idB)

console.log('Test 1: pair two players')
find(a)
await waitFor(a, (e) => e.type === 'queue' && e.body.status === 'WAITING', 5000)
find(b)
const joinA = await waitFor(a, (e) => e.type === 'join', 5000)
const joinB = await waitFor(b, (e) => e.type === 'join', 5000)
if (joinA.body.id !== joinB.body.id) throw new Error('different games')
if (joinA.body.vsBot) throw new Error('expected PvP not bot')
console.log('OK PvP game', joinA.body.id)

a.client.deactivate()
b.client.deactivate()

console.log('Test 2: alone → bot (needs APP_MATCHMAKING_TIMEOUT_MS short or wait 30s)')
const idC = crypto.randomUUID()
const c = await connect(idC)
find(c)
await waitFor(c, (e) => e.type === 'queue' && e.body.status === 'WAITING', 5000)
const botJoin = await waitFor(c, (e) => e.type === 'join' && e.body.vsBot === true, 35_000)
console.log('OK bot game', botJoin.body.id, botJoin.body.botDifficulty)
c.client.deactivate()
console.log('All smoke checks passed')
process.exit(0)
