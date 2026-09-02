const GRID_SIZE = 10
const SHIP_SIZES = [5, 4, 3, 3, 2]

function createEmptyBoard() {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill('water'))
}

function createFleetBoard() {
  const board = createEmptyBoard()

  for (const size of SHIP_SIZES) {
    let placed = false

    while (!placed) {
      const horizontal = Math.random() < 0.5
      const startRow = Math.floor(Math.random() * GRID_SIZE)
      const startCol = Math.floor(Math.random() * GRID_SIZE)
      const cells = []
      let fits = true

      for (let offset = 0; offset < size; offset += 1) {
        const row = horizontal ? startRow : startRow + offset
        const col = horizontal ? startCol + offset : startCol

        if (row >= GRID_SIZE || col >= GRID_SIZE || board[row][col] === 'ship') {
          fits = false
          break
        }

        cells.push([row, col])
      }

      if (fits) {
        cells.forEach(([row, col]) => {
          board[row][col] = 'ship'
        })
        placed = true
      }
    }
  }

  return board
}

function isFleetSunk(layout, board) {
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (layout[row][col] === 'ship' && board[row][col] !== 'hit') {
        return false
      }
    }
  }

  return true
}

export function normalizeRoomCode(code) {
  return String(code ?? '').trim().toLowerCase()
}

export function readRoomStore(storage, key = 'battleships-room-store') {
  if (!storage) {
    return {}
  }

  try {
    const storedValue = storage.getItem(key)
    return storedValue ? JSON.parse(storedValue) : {}
  } catch {
    return {}
  }
}

export function writeRoomStore(storage, store, key = 'battleships-room-store') {
  if (!storage) {
    return
  }

  try {
    storage.setItem(key, JSON.stringify(store))
  } catch {
    // Ignore storage failures in non-persistent environments.
  }
}

export function joinRoomState(room, player) {
  const normalizedCode = normalizeRoomCode(room?.code || player?.roomCode || '')
  const existingPlayers = Array.isArray(room?.players) ? room.players : []
  const playerEntry = {
    id: player.id,
    name: player.name || player.username || 'Guest',
    roomCode: normalizedCode,
  }

  const players = [...existingPlayers.filter((entry) => entry.id !== player.id), playerEntry]

  if (players.length >= 2) {
    return {
      code: normalizedCode,
      players,
      status: 'matched',
      matchedAt: Date.now(),
    }
  }

  return {
    code: normalizedCode,
    players,
    status: 'waiting',
  }
}

export function joinRandomMatch(store, player) {
  const queue = Array.isArray(store?.queue) ? store.queue : []
  const waitingPlayer = queue[0]

  if (!waitingPlayer) {
    const nextStore = { ...store }
    delete nextStore.randomMatch

    return {
      roomState: null,
      nextStore: {
        ...nextStore,
        queue: [{ id: player.id, name: player.name || player.username || 'Guest' }],
      },
    }
  }

  const matchedRoom = {
    code: 'random-match',
    players: [
      { id: waitingPlayer.id, name: waitingPlayer.name || waitingPlayer.username || 'Guest' },
      { id: player.id, name: player.name || player.username || 'Guest' },
    ],
    status: 'matched',
    matchedAt: Date.now(),
  }

  return {
    roomState: matchedRoom,
    nextStore: {
      ...store,
      queue: [],
    },
  }
}

export function createMultiplayerMatchState(roomCode, players) {
  const normalizedPlayers = players.map((player) => {
    const playerLayout = createFleetBoard()

    return {
      id: player.id,
      name: player.name || player.username || 'Guest',
      playerLayout,
      playerBoard: playerLayout.map((row) => [...row]),
      enemyBoard: createEmptyBoard(),
    }
  })

  return {
    code: normalizeRoomCode(roomCode),
    players: normalizedPlayers,
    status: 'playing',
    turnPlayerId: normalizedPlayers[0]?.id || null,
    winner: null,
  }
}

export function getMultiplayerPlayerState(room, playerId) {
  return room?.players?.find((player) => player.id === playerId) || null
}

export function applyMultiplayerAttack(room, playerId, row, col) {
  if (!room?.players || room.status !== 'playing') {
    return room
  }

  const currentPlayer = room.players.find((player) => player.id === playerId)
  const opponentPlayer = room.players.find((player) => player.id !== playerId)

  if (!currentPlayer || !opponentPlayer || room.turnPlayerId !== playerId) {
    return room
  }

  if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
    return room
  }

  if (currentPlayer.enemyBoard[row][col] !== 'water') {
    return room
  }

  const hit = opponentPlayer.playerLayout[row][col] === 'ship'
  const nextEnemyBoard = currentPlayer.enemyBoard.map((boardRow) => [...boardRow])
  nextEnemyBoard[row][col] = hit ? 'hit' : 'miss'

  const nextOpponentBoard = opponentPlayer.playerBoard.map((boardRow) => [...boardRow])
  nextOpponentBoard[row][col] = hit ? 'hit' : 'miss'

  const nextPlayers = room.players.map((player) => {
    if (player.id === playerId) {
      return {
        ...player,
        enemyBoard: nextEnemyBoard,
      }
    }

    if (player.id === opponentPlayer.id) {
      return {
        ...player,
        playerBoard: nextOpponentBoard,
      }
    }

    return player
  })

  const winner = isFleetSunk(opponentPlayer.playerLayout, nextOpponentBoard) ? playerId : null
  const nextTurnPlayerId = hit ? playerId : opponentPlayer.id

  return {
    ...room,
    players: nextPlayers,
    turnPlayerId: winner ? room.turnPlayerId : nextTurnPlayerId,
    winner,
    status: winner ? 'finished' : 'playing',
  }
}

export function getOpponentName(room, playerId) {
  if (!room?.players) {
    return null
  }

  const opponent = room.players.find((entry) => entry.id !== playerId)
  return opponent?.name || null
}
