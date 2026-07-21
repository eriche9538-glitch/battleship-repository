import test from 'node:test'
import assert from 'node:assert/strict'
import { joinRoomState, normalizeRoomCode, getOpponentName, joinRandomMatch } from './multiplayerRooms.js'

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
