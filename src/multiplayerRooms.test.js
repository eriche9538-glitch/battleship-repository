import test from 'node:test'
import assert from 'node:assert/strict'
import { applyMultiplayerAbility, createMultiplayerMatchState, expireMultiplayerRound, joinRoomState, normalizeRoomCode, getOpponentName, joinRandomMatch, ROUND_DURATION_MS } from './multiplayerRooms.js'

test('joinRoomState marks the room as matched when two players join', () => {
  const first = joinRoomState(null, { id: 'p1', name: 'Alice' })
  const second = joinRoomState(first, { id: 'p2', name: 'Bob' })

  assert.equal(second.status, 'matched')
  assert.equal(second.players.length, 2)
})

test('normalizeRoomCode trims whitespace and lowercases the code', () => {
  assert.equal(normalizeRoomCode('  My-Room  '), 'my-room')
})

test('getOpponentName returns the other player in a matched room', () => {
  const room = {
    players: [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }],
    status: 'matched',
  }

  assert.equal(getOpponentName(room, 'p1'), 'Bob')
  assert.equal(getOpponentName(room, 'p2'), 'Alice')
})

test('joinRandomMatch pairs a waiting player with the next joiner', () => {
  const first = joinRandomMatch({}, { id: 'p1', name: 'Alice' })
  const second = joinRandomMatch(first.nextStore, { id: 'p2', name: 'Bob' })

  assert.equal(first.roomState, null)
  assert.equal(second.roomState.status, 'matched')
  assert.equal(second.roomState.players.length, 2)
})

test('expireMultiplayerRound passes the turn after 30 seconds', () => {
  const room = createMultiplayerMatchState('room', [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }])
  const expiredRoom = expireMultiplayerRound(room, room.roundStartedAt + ROUND_DURATION_MS)

  assert.equal(expiredRoom.turnPlayerId, 'p2')
  assert.equal(expiredRoom.roundStartedAt, room.roundStartedAt + ROUND_DURATION_MS)
})

test('expireMultiplayerRound leaves an active round unchanged', () => {
  const room = createMultiplayerMatchState('room', [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }])

  assert.strictEqual(expireMultiplayerRound(room, room.roundStartedAt + ROUND_DURATION_MS - 1), room)
})

test('applyMultiplayerAbility applies a targeted cross to the opponent board', () => {
  const room = createMultiplayerMatchState('room', [{ id: 'p1', name: 'Alice' }, { id: 'p2', name: 'Bob' }])
  const nextRoom = applyMultiplayerAbility(room, 'p1', 'cross', 0, 0)
  const playerState = nextRoom.players.find((player) => player.id === 'p1')
  const opponentState = nextRoom.players.find((player) => player.id === 'p2')

  assert.equal(nextRoom.turnPlayerId, 'p2')
  assert.equal(playerState.enemyBoard[0][0] === 'hit' || playerState.enemyBoard[0][0] === 'miss', true)
  assert.equal(opponentState.playerBoard[0][0] === 'hit' || opponentState.playerBoard[0][0] === 'miss', true)
})
