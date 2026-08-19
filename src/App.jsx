import { useEffect, useRef, useState } from 'react'
import { animate } from 'motion'
import './App.css'
import SignUp from './SignUp'
import SignIn from './SignIn'
import { applyMultiplayerAttack, createMultiplayerMatchState, getMultiplayerPlayerState, getOpponentName, joinRandomMatch, joinRoomState, normalizeRoomCode, readRoomStore, writeRoomStore } from './multiplayerRooms'
import { incrementUserScore } from './scoreService'

const GRID_SIZE = 10
const SHIP_SIZES = [5, 4, 3, 3, 2]
const ACCOUNT_STORAGE_KEY = 'battleships-account'
const ROOM_STORAGE_KEY = 'battleships-room-store'
const BATTLE_CURRENCY_STORAGE_KEY = 'battleships-battle-currency'
const ABILITY_STOCK_STORAGE_KEY = 'battleships-ability-stock'
const DIFFICULTY_OPTIONS = {
  easy: { label: 'Easy', description: 'Random shots and a slower enemy.', delay: 320, reward: 25 },
  medium: { label: 'Medium', description: 'Targets nearby hits more often.', delay: 430, reward: 100 },
  master: { label: 'Master', description: 'Aggressive, hunt-and-target attacks.', delay: 550, reward: 1000 },
}

const ABILITY_CONFIGS = {
  cross: {
    label: 'Cross Scan',
    category: 'Recon',
    maxCooldown: 2,
    maxUses: 3,
    price: 50,
    description: 'Reveal a cross pattern of 5 squares.',
  },
  ship: {
    label: 'Ship Scan',
    category: 'Recon',
    maxCooldown: 3,
    maxUses: 2,
    price: 100,
    description: 'Reveal and sink a 3-cell enemy ship.',
  },
  line: {
    label: 'Line Sweep',
    category: 'Offensive',
    maxCooldown: 4,
    maxUses: 4,
    price: 150,
    description: 'Reveal 5 squares in a random horizontal or vertical line.',
  },
  airstrike: { label: 'Airstrike', category: 'Offensive', maxCooldown: 2, maxUses: 0, price: 750, description: 'Bomb 3 random enemy squares.' },
  missileBarrage: { label: 'Missile Barrage', category: 'Offensive', maxCooldown: 3, maxUses: 0, price: 1000, description: 'Launch 7 missiles at random enemy squares.' },
  piercingShot: { label: 'Piercing Shot', category: 'Offensive', maxCooldown: 3, maxUses: 0, price: 850, description: 'Fire through 5 squares in a straight line.' },
  crossfire: { label: 'Crossfire', category: 'Offensive', maxCooldown: 3, maxUses: 0, price: 1200, description: 'Strike two cross patterns at once.' },
  scatterShot: { label: 'Scatter Shot', category: 'Offensive', maxCooldown: 2, maxUses: 0, price: 900, description: 'Scatter 8 shots across enemy waters.' },
  torpedo: { label: 'Torpedo', category: 'Offensive', maxCooldown: 4, maxUses: 0, price: 1500, description: 'Torpedo a complete random row or column.' },
  radarScan: { label: 'Radar Scan', category: 'Recon', maxCooldown: 2, maxUses: 0, price: 400, description: 'Reveal 3 hidden ship squares.' },
  sonarPulse: { label: 'Sonar Pulse', category: 'Recon', maxCooldown: 2, maxUses: 0, price: 650, description: 'Scan a 3x3 ring around a random target.' },
  spyPlane: { label: 'Spy Plane', category: 'Recon', maxCooldown: 2, maxUses: 0, price: 900, description: 'Reveal a hidden ship square and its nearby waters.' },
  heatMap: { label: 'Heat Map', category: 'Recon', maxCooldown: 3, maxUses: 0, price: 750, description: 'Scan a 3x3 area of enemy waters.' },
  shipTracker: { label: 'Ship Tracker', category: 'Recon', maxCooldown: 4, maxUses: 0, price: 1000, description: 'Track and sink a remaining 3-tile ship.' },
  smokeScreen: { label: 'Smoke Screen', category: 'Defense', maxCooldown: 3, maxUses: 0, price: 600, description: 'Hide your fleet and skip the enemy turn.' },
  decoyShip: { label: 'Decoy Ship', category: 'Defense', maxCooldown: 3, maxUses: 0, price: 1100, description: 'Deploy a decoy that absorbs the next enemy shot.' },
  armorPlating: { label: 'Armor Plating', category: 'Defense', maxCooldown: 4, maxUses: 0, price: 1300, description: 'Protect your fleet from the next enemy hit.' },
  emergencyRepair: { label: 'Emergency Repair', category: 'Defense', maxCooldown: 4, maxUses: 0, price: 1200, description: 'Repair one damaged ship tile and skip the enemy turn.' },
  minefield: { label: 'Minefield', category: 'Defense', maxCooldown: 4, maxUses: 0, price: 1500, description: 'Seed 5 mines across random enemy waters.' },
  shieldGenerator: { label: 'Shield Generator', category: 'Defense', maxCooldown: 5, maxUses: 0, price: 1800, description: 'Block the next two enemy shots.' },
  tacticalSwap: { label: 'Tactical Swap', category: '☢', maxCooldown: 4, maxUses: 0, price: 40000, description: 'Reveal two random areas and evade the enemy turn.' },
  counterattack: { label: 'Counterattack', category: '☢', maxCooldown: 4, maxUses: 0, price: 35000, description: 'Strike 3 enemy squares and retaliate if hit.' },
  blackout: { label: 'Blackout', category: '☢', maxCooldown: 5, maxUses: 0, price: 100000, description: 'Reveal 10 random enemy squares.' },
  ghostFleet: { label: 'Ghost Fleet', category: '☢', maxCooldown: 5, maxUses: 0, price: 150000, description: 'Reveal 12 random enemy squares and evade fire.' },
  finalSalvo: { label: 'Final Salvo', category: '☢', maxCooldown: 6, maxUses: 0, price: 200000, description: 'Fire a devastating salvo across a random row.' },
  nuclearStrike: { label: 'Nuclear Strike', category: '☢', maxCooldown: 8, maxUses: 0, price: 250000, description: 'Reveal every remaining enemy square.' },
}

const ABILITY_CATEGORIES = ['Offensive', 'Recon', 'Defense', '☢']

const createAbilityMap = (getValue) => Object.fromEntries(
  Object.entries(ABILITY_CONFIGS).map(([type, config]) => [type, getValue(config, type)]),
)

const THEME_STORAGE_KEY = 'battleships-theme'
const THEME_PRESETS = {
  pink: {
    label: 'Pink',
    background: 'linear-gradient(135deg, #f5aeed 0%, #f2a5af 100%)',
    panel: 'rgba(255, 245, 250, 0.96)',
    surface: 'rgba(245, 174, 237, 0.24)',
    border: 'rgba(245, 174, 237, 0.4)',
    text: '#000000',
    muted: '#5b3b4d',
    accent: '#f5aeed',
  },
  red: {
    label: 'Red',
    background: 'linear-gradient(135deg, #f2a5af 0%, #f5aeed 100%)',
    panel: 'rgba(255, 245, 245, 0.96)',
    surface: 'rgba(242, 165, 175, 0.24)',
    border: 'rgba(242, 165, 175, 0.4)',
    text: '#000000',
    muted: '#5f3a3f',
    accent: '#f2a5af',
  },
  blue: {
    label: 'Blue',
    background: 'linear-gradient(135deg, #b2d5ed 0%, #f5aeed 100%)',
    panel: 'rgba(245, 250, 255, 0.96)',
    surface: 'rgba(178, 213, 237, 0.24)',
    border: 'rgba(178, 213, 237, 0.4)',
    text: '#000000',
    muted: '#3e5567',
    accent: '#b2d5ed',
  },
  black: {
    label: 'Black',
    background: 'linear-gradient(135deg, #000000 0%, #000000 100%)',
    panel: 'rgba(20, 20, 20, 0.96)',
    surface: 'rgba(255, 255, 255, 0.12)',
    border: 'rgba(255, 255, 255, 0.24)',
    text: '#f3fabb',
    muted: '#d3bbfa',
    accent: '#ffffff',
  },
  green: {
    label: 'Green',
    background: 'linear-gradient(135deg, #c5fabb 0%, #f3fabb 100%)',
    panel: 'rgba(248, 255, 246, 0.96)',
    surface: 'rgba(197, 250, 187, 0.24)',
    border: 'rgba(197, 250, 187, 0.4)',
    text: '#000000',
    muted: '#4a5f46',
    accent: '#c5fabb',
  },
  orange: {
    label: 'Orange',
    background: 'linear-gradient(135deg, #fadcbb 0%, #f5aeed 100%)',
    panel: 'rgba(255, 250, 245, 0.96)',
    surface: 'rgba(250, 220, 187, 0.24)',
    border: 'rgba(250, 220, 187, 0.4)',
    text: '#000000',
    muted: '#6b4e34',
    accent: '#fadcbb',
  },
  purple: {
    label: 'Purple',
    background: 'linear-gradient(135deg, #d3bbfa 0%, #f5aeed 100%)',
    panel: 'rgba(250, 247, 255, 0.96)',
    surface: 'rgba(211, 187, 250, 0.24)',
    border: 'rgba(211, 187, 250, 0.4)',
    text: '#000000',
    muted: '#5b4272',
    accent: '#d3bbfa',
  },
  yellow: {
    label: 'Yellow',
    background: 'linear-gradient(135deg, #f3fabb 0%, #fadcbb 100%)',
    panel: 'rgba(255, 255, 245, 0.96)',
    surface: 'rgba(243, 250, 187, 0.24)',
    border: 'rgba(243, 250, 187, 0.4)',
    text: '#000000',
    muted: '#6a6a3f',
    accent: '#f3fabb',
  },
}

function createEmptyBoard() {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill('water'))
}

function createFleetBoard() {
  const board = createEmptyBoard()
  const ships = []

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
        ships.push({ size, cells })
        placed = true
      }
    }
  }

  return { board, ships }
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

function getNeighbors(row, col) {
  const neighbors = []

  for (let deltaRow = -1; deltaRow <= 1; deltaRow += 1) {
    for (let deltaCol = -1; deltaCol <= 1; deltaCol += 1) {
      if (deltaRow === 0 && deltaCol === 0) {
        continue
      }

      if (Math.abs(deltaRow) === Math.abs(deltaCol)) {
        continue
      }

      const nextRow = row + deltaRow
      const nextCol = col + deltaCol

      if (nextRow >= 0 && nextRow < GRID_SIZE && nextCol >= 0 && nextCol < GRID_SIZE) {
        neighbors.push([nextRow, nextCol])
      }
    }
  }

  return neighbors
}

function chooseEnemyShot(playerBoard, difficulty) {
  const availableShots = []

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (playerBoard[row][col] !== 'hit' && playerBoard[row][col] !== 'miss') {
        availableShots.push([row, col])
      }
    }
  }

  if (availableShots.length === 0) {
    return null
  }

  if (difficulty !== 'easy') {
    const hitCells = []

    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        if (playerBoard[row][col] === 'hit') {
          hitCells.push([row, col])
        }
      }
    }

    if (hitCells.length > 0 && (difficulty === 'master' || Math.random() < 0.75)) {
      const [hitRow, hitCol] = hitCells[Math.floor(Math.random() * hitCells.length)]
      const candidates = getNeighbors(hitRow, hitCol).filter(([row, col]) => {
        return playerBoard[row][col] !== 'hit' && playerBoard[row][col] !== 'miss'
      })

      if (candidates.length > 0) {
        return candidates[Math.floor(Math.random() * candidates.length)]
      }
    }
  }

  return availableShots[Math.floor(Math.random() * availableShots.length)]
}

function canPlaceShip(board, row, col, size, horizontal) {
  if (row < 0 || col < 0) {
    return false
  }

  for (let offset = 0; offset < size; offset += 1) {
    const nextRow = horizontal ? row : row + offset
    const nextCol = horizontal ? col + offset : col

    if (nextRow >= GRID_SIZE || nextCol >= GRID_SIZE || board[nextRow][nextCol] === 'ship') {
      return false
    }
  }

  return true
}

function placeShip(board, row, col, size, horizontal) {
  const nextBoard = board.map((boardRow) => [...boardRow])

  for (let offset = 0; offset < size; offset += 1) {
    const nextRow = horizontal ? row : row + offset
    const nextCol = horizontal ? col + offset : col
    nextBoard[nextRow][nextCol] = 'ship'
  }

  return nextBoard
}

function createGameState(difficulty = 'medium', playerLayout = null, enemyLayout = null) {
  const playerFleet = playerLayout
    ? { board: playerLayout.map((row) => [...row]) }
    : createFleetBoard()
  const enemyFleet = enemyLayout
    ? { board: enemyLayout.map((row) => [...row]) }
    : createFleetBoard()

  return {
    playerLayout: playerFleet.board,
    enemyLayout: enemyFleet.board,
    playerBoard: playerFleet.board.map((row) => [...row]),
    enemyBoard: createEmptyBoard(),
    difficulty,
    status: `Level: ${DIFFICULTY_OPTIONS[difficulty].label}. Your turn. Choose a square on the enemy grid.`,
    winner: null,
  }
}

function getCrossPattern(row, col) {
  const coords = [[row, col]]
  if (row - 1 >= 0) coords.push([row - 1, col])
  if (row + 1 < GRID_SIZE) coords.push([row + 1, col])
  if (col - 1 >= 0) coords.push([row, col - 1])
  if (col + 1 < GRID_SIZE) coords.push([row, col + 1])
  return coords
}

function getRandomLinePattern(row, col) {
  const isHorizontal = Math.random() < 0.5
  const coords = [[row, col]]
  const step = isHorizontal ? [0, 1] : [1, 0]

  for (let offset = 1; offset < 5; offset += 1) {
    const nextRow = row + step[0] * offset
    const nextCol = col + step[1] * offset
    if (nextRow < 0 || nextRow >= GRID_SIZE || nextCol < 0 || nextCol >= GRID_SIZE) {
      break
    }
    coords.push([nextRow, nextCol])
  }

  for (let offset = 1; offset < 5 && coords.length < 5; offset += 1) {
    const nextRow = row - step[0] * offset
    const nextCol = col - step[1] * offset
    if (nextRow < 0 || nextRow >= GRID_SIZE || nextCol < 0 || nextCol >= GRID_SIZE) {
      break
    }
    coords.unshift([nextRow, nextCol])
  }

  return coords.slice(0, 5)
}

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [showSignIn, setShowSignIn] = useState(true)
  const [currentView, setCurrentView] = useState('home')
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window === 'undefined') {
      return null
    }

    try {
      const stored = window.localStorage.getItem(ACCOUNT_STORAGE_KEY)
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  })
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const [wins, setWins] = useState(0)
  const [battleCurrency, setBattleCurrency] = useState(() => {
    if (typeof window === 'undefined') {
      return 0
    }

    const storedCurrency = Number(window.localStorage.getItem(BATTLE_CURRENCY_STORAGE_KEY))
    return Number.isFinite(storedCurrency) ? storedCurrency : 0
  })
  const [difficulty, setDifficulty] = useState('medium')
  const [gameMode, setGameMode] = useState('single')
  const [roomCodeInput, setRoomCodeInput] = useState('')
  const [activeRoomCode, setActiveRoomCode] = useState('')
  const [multiplayerType, setMultiplayerType] = useState('random')
  const [roomState, setRoomState] = useState(null)
  const [multiplayerGame, setMultiplayerGame] = useState(null)
  const [game, setGame] = useState(() => createGameState('medium'))
  const [placementBoard, setPlacementBoard] = useState(createEmptyBoard())
  const [placementIndex, setPlacementIndex] = useState(0)
  const [placementOrientation, setPlacementOrientation] = useState('horizontal')
  const [placementActive, setPlacementActive] = useState(true)
  const [hoveredPlacement, setHoveredPlacement] = useState(null)
  const [score, setScore] = useState(0)
  const [recentAbility, setRecentAbility] = useState(null)
  const [abilityCooldowns, setAbilityCooldowns] = useState(() => createAbilityMap(() => 0))
  const [abilityUses, setAbilityUses] = useState(() => createAbilityMap((config) => config.maxUses))
  const [abilityStock, setAbilityStock] = useState(() => {
    if (typeof window === 'undefined') {
      return createAbilityMap(() => 0)
    }

    try {
      const storedStock = JSON.parse(window.localStorage.getItem(ABILITY_STOCK_STORAGE_KEY) || '{}')
      return createAbilityMap((config, type) => Number.isFinite(storedStock[type]) ? storedStock[type] : 0)
    } catch {
      return createAbilityMap(() => 0)
    }
  })
  const [usedAbilityTypes, setUsedAbilityTypes] = useState([])
  const [defenseCharges, setDefenseCharges] = useState(0)
  const [leaderboard, setLeaderboard] = useState([])
  const [yourLeaderboardEntry, setYourLeaderboardEntry] = useState(null)
  const [currencyLeaderboard, setCurrencyLeaderboard] = useState([])
  const [yourCurrencyLeaderboardEntry, setYourCurrencyLeaderboardEntry] = useState(null)
  const [recentHit, setRecentHit] = useState(null)
  const [hoveredEnemyTarget, setHoveredEnemyTarget] = useState(null)
  const [showLeaderboard, setShowLeaderboard] = useState(false)
  const [showCurrencyLeaderboard, setShowCurrencyLeaderboard] = useState(false)
  const [showAbilityShop, setShowAbilityShop] = useState(false)
  const [themeName, setThemeName] = useState('blue')
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const appRootRef = useRef(null)
  const enemyBoardRef = useRef(null)
  const playerBoardRef = useRef(null)
  const statusRef = useRef(null)

  const enemyHits = game.enemyBoard.flat().filter((cell) => cell === 'hit').length
  const playerHits = game.playerBoard.flat().filter((cell) => cell === 'hit').length

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    try {
      const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
      if (storedTheme && THEME_PRESETS[storedTheme]) {
        setThemeName(storedTheme)
      }
    } catch {
      // Ignore theme load failures.
    }

    return undefined
  }, [])

  useEffect(() => {
    if (!currentUser?.id || typeof window === 'undefined') {
      return undefined
    }

    const loadLeaderboard = async () => {
      try {
        const response = await fetch(`/api/leaderboard?userId=${currentUser.id}`)
        if (response.ok) {
          const payload = await response.json()
          setLeaderboard(payload.entries || [])
          setYourLeaderboardEntry(payload.yourEntry || null)
        }

        const currencyResponse = await fetch(`/api/leaderboard?userId=${currentUser.id}&mode=currency`)
        if (currencyResponse.ok) {
          const payload = await currencyResponse.json()
          setCurrencyLeaderboard(payload.entries || [])
          setYourCurrencyLeaderboardEntry(payload.yourEntry || null)
        }
      } catch {
        // Ignore leaderboard fetch failures.
      }
    }

    loadLeaderboard()

    return undefined
  }, [currentUser?.id])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, themeName)
    } catch {
      // Ignore theme persistence failures.
    }

    return undefined
  }, [themeName])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    window.localStorage.setItem(BATTLE_CURRENCY_STORAGE_KEY, String(battleCurrency))
    window.localStorage.setItem(ABILITY_STOCK_STORAGE_KEY, JSON.stringify(abilityStock))

    return undefined
  }, [battleCurrency, abilityStock])

  useEffect(() => {
    if (!appRootRef.current) {
      return undefined
    }

    animate(appRootRef.current, {
      opacity: [0, 0.25, 1],
      transform: ['translateY(24px)', 'translateY(8px)', 'translateY(0px)'],
    }, {
      duration: 0.45,
      easing: 'easeOut',
    })

    return undefined
  }, [currentView, showSignIn])

  useEffect(() => {
    if (!statusRef.current) {
      return undefined
    }

    animate(statusRef.current, {
      opacity: [0.5, 1],
      transform: ['translateY(10px)', 'translateY(0px)'],
    }, {
      duration: 0.34,
      easing: 'easeOut',
    })

    return undefined
  }, [game.status])

  useEffect(() => {
    const buttons = Array.from(document.querySelectorAll('.primary-button, .ghost-button'))
    const onPress = (event) => {
      animate(event.currentTarget, {
        scale: [1, 0.96, 1],
      }, {
        duration: 0.18,
        easing: 'easeOut',
      })
    }

    buttons.forEach((button) => button.addEventListener('pointerdown', onPress))

    return () => {
      buttons.forEach((button) => button.removeEventListener('pointerdown', onPress))
    }
  }, [currentView])

  useEffect(() => {
    if (currentView !== 'game') {
      return undefined
    }

    const cards = Array.from(document.querySelectorAll('.board-card'))
    if (cards.length === 0) {
      return undefined
    }

    animate(cards, {
      opacity: [0, 0.5, 1],
      transform: ['translateY(18px)', 'translateY(6px)', 'translateY(0px)'],
    }, {
      duration: 0.5,
      easing: 'easeOut',
      delay: 0.08,
      stagger: 0.06,
    })

    return undefined
  }, [currentView, gameMode])

  useEffect(() => {
    if (!hoveredEnemyTarget) {
      return undefined
    }

    const targetCell = document.querySelector(`[data-hit-coord="${hoveredEnemyTarget[0]}-${hoveredEnemyTarget[1]}"]`)
    if (!targetCell) {
      return undefined
    }

    animate(targetCell, {
      scale: [1, 1.04, 1],
      boxShadow: [
        '0 0 0 0 rgba(248, 113, 113, 0)',
        '0 0 0 16px rgba(248, 113, 113, 0.30)',
        '0 0 0 0 rgba(248, 113, 113, 0)',
      ],
    }, {
      duration: 0.3,
      easing: 'easeOut',
    })

    return undefined
  }, [hoveredEnemyTarget])

  useEffect(() => {
    if (!recentHit) {
      return undefined
    }

    const boardRef = recentHit.board === 'player' ? playerBoardRef.current : enemyBoardRef.current
    if (!boardRef) {
      return undefined
    }

    const hitCell = boardRef.querySelector(`[data-hit-coord="${recentHit.row}-${recentHit.col}"]`)
    if (!hitCell) {
      return undefined
    }

    const pulseColor = recentHit.type === 'hit' ? 'rgba(248, 113, 113, 0.45)' : 'rgba(59, 130, 246, 0.35)'
    animate(hitCell, {
      opacity: [0.9, 1, 1],
      scale: [1, 0.96, 1.1, 1],
      boxShadow: [
        '0 2px 12px rgba(0,0,0,0.16)',
        `0 0 0 24px ${pulseColor}`,
        '0 0 0 0 rgba(0, 0, 0, 0)',
      ],
    }, {
      duration: 0.64,
      easing: 'easeOut',
    })

    const overlay = hitCell.querySelector('.hit-bomb')
    if (overlay) {
      animate(overlay, {
        opacity: [0, 1, 1, 0],
        scale: [0.5, 1, 1.3, 1.6],
      }, {
        duration: 0.75,
        easing: 'easeOut',
      })
    }

    animate(boardRef, {
      transform: ['scale(1)', 'scale(1.01)', 'scale(1)'],
    }, {
      duration: 0.6,
      easing: 'easeOut',
    })

    return undefined
  }, [recentHit])

  const persistWin = async (currencyReward) => {
    if (!currentUser?.id || typeof window === 'undefined') {
      return
    }

    try {
      const response = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, currencyDelta: currencyReward }),
      })

      if (response.ok) {
        setScore((currentScore) => currentScore + 1)
        const leaderboardResponse = await fetch(`/api/leaderboard?userId=${currentUser.id}`)
        if (leaderboardResponse.ok) {
          const payload = await leaderboardResponse.json()
          setLeaderboard(payload.entries || [])
          setYourLeaderboardEntry(payload.yourEntry || null)
        }

        const currencyResponse = await fetch(`/api/leaderboard?userId=${currentUser.id}&mode=currency`)
        if (currencyResponse.ok) {
          const payload = await currencyResponse.json()
          setCurrencyLeaderboard(payload.entries || [])
          setYourCurrencyLeaderboardEntry(payload.yourEntry || null)
        }
      }
    } catch {
      // Ignore score persistence failures.
    }
  }

  const awardBattleCurrency = () => {
    const reward = DIFFICULTY_OPTIONS[difficulty].reward
    setBattleCurrency((currentCurrency) => currentCurrency + reward)
    return reward
  }

  const handleBuyAbility = (type) => {
    const price = ABILITY_CONFIGS[type].price
    if (battleCurrency < price) {
      return
    }

    setBattleCurrency((currentCurrency) => currentCurrency - price)
    if (currentUser?.id) {
      void fetch('/api/currency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, currencyDelta: -price }),
      })
    }
    setAbilityStock((currentStock) => ({
      ...currentStock,
      [type]: currentStock[type] + 1,
    }))
    setAbilityUses((currentUses) => ({
      ...currentUses,
      [type]: currentUses[type] + 1,
    }))
  }

  const decrementCooldowns = () => {
    setAbilityCooldowns((prev) => createAbilityMap((_config, type) => Math.max(0, prev[type] - 1)))
  }

  const finalizePlayerMove = (nextEnemyBoard, statusMessage, options = {}) => {
    const winner = isFleetSunk(game.enemyLayout, nextEnemyBoard) ? 'player' : null

    setGame((current) => ({
      ...current,
      enemyBoard: nextEnemyBoard,
      playerBoard: options.nextPlayerBoard || current.playerBoard,
      winner,
      status: winner ? 'You sank the enemy fleet. Victory!' : statusMessage,
    }))

    if (winner === 'player') {
      setWins((currentWins) => currentWins + 1)
      const currencyReward = DIFFICULTY_OPTIONS[difficulty].reward
      awardBattleCurrency()
      void persistWin(currencyReward)
      return
    }

    if (options.skipEnemyTurn) {
      decrementCooldowns()
      return
    }

    window.setTimeout(() => {
      if (defenseCharges > 0) {
        setDefenseCharges((currentCharges) => Math.max(0, currentCharges - 1))
        decrementCooldowns()
        setGame((current) => ({
          ...current,
          status: 'Your defense absorbed the enemy attack.',
        }))
        return
      }

      setGame((current) => {
        const [enemyRow, enemyCol] = chooseEnemyShot(current.playerBoard, current.difficulty) || []

        if (enemyRow === undefined || enemyCol === undefined) {
          decrementCooldowns()
          return {
            ...current,
            winner: 'draw',
            status: 'No shots left. Start a new game to play again.',
          }
        }

        const nextPlayerBoard = current.playerBoard.map((boardRow) => [...boardRow])
        const enemyHit = current.playerLayout[enemyRow][enemyCol] === 'ship'

        nextPlayerBoard[enemyRow][enemyCol] = enemyHit ? 'hit' : 'miss'
        const enemyHitId = `${enemyRow}-${enemyCol}-${Date.now()}`
        setRecentHit({ row: enemyRow, col: enemyCol, board: 'player', type: enemyHit ? 'hit' : 'miss', id: enemyHitId })
        window.setTimeout(() => {
          setRecentHit((current) => (current?.id === enemyHitId ? null : current))
        }, 900)

        const enemyWinner = isFleetSunk(current.playerLayout, nextPlayerBoard) ? 'enemy' : null

        return {
          ...current,
          playerBoard: nextPlayerBoard,
          winner: enemyWinner || current.winner,
          status: enemyWinner
            ? 'The enemy sank your fleet. Try a fresh match.'
            : enemyHit
              ? 'The enemy scored a hit on your fleet.'
              : 'The enemy missed your ships.',
        }
      })

      decrementCooldowns()
    }, DIFFICULTY_OPTIONS[difficulty].delay)
  }

  const handlePlayerAttack = (row, col, event) => {
    if (game.winner || game.enemyBoard[row][col] === 'hit' || game.enemyBoard[row][col] === 'miss') {
      return
    }

    const nextEnemyBoard = game.enemyBoard.map((boardRow) => [...boardRow])
    const hit = game.enemyLayout[row][col] === 'ship'

    nextEnemyBoard[row][col] = hit ? 'hit' : 'miss'

    const hitId = `${row}-${col}-${Date.now()}`
    setRecentHit({ row, col, board: 'enemy', type: hit ? 'hit' : 'miss', id: hitId })
    if (event?.currentTarget) {
      animate(event.currentTarget, {
        scale: [1, 0.96, 1.08, 1],
        boxShadow: [
          '0 2px 12px rgba(0,0,0,0.15)',
          hit ? '0 0 0 20px rgba(248, 113, 113, 0.35)' : '0 0 0 20px rgba(59, 130, 246, 0.30)',
          '0 0 0 0 rgba(0, 0, 0, 0)',
        ],
      }, {
        duration: 0.6,
        easing: 'easeOut',
      })
    }
    window.setTimeout(() => {
      setRecentHit((current) => (current?.id === hitId ? null : current))
    }, 900)

    finalizePlayerMove(nextEnemyBoard, hit ? 'Direct hit! The enemy is taking damage.' : 'Missed the target. The enemy retaliates.')
  }

  const getThreeTileShipCoords = (enemyLayout) => {
    const visited = Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(false))
    const ships = []

    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        if (enemyLayout[row][col] !== 'ship' || visited[row][col]) {
          continue
        }

        const component = []
        const stack = [[row, col]]
        visited[row][col] = true

        while (stack.length > 0) {
          const [currentRow, currentCol] = stack.pop()
          component.push([currentRow, currentCol])

          for (const [dr, dc] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) {
            const nextRow = currentRow + dr
            const nextCol = currentCol + dc
            if (
              nextRow >= 0 && nextRow < GRID_SIZE &&
              nextCol >= 0 && nextCol < GRID_SIZE &&
              !visited[nextRow][nextCol] &&
              enemyLayout[nextRow][nextCol] === 'ship'
            ) {
              visited[nextRow][nextCol] = true
              stack.push([nextRow, nextCol])
            }
          }
        }

        if (component.length === 3) {
          ships.push(component)
        }
      }
    }

    if (ships.length === 0) {
      return null
    }

    return ships[Math.floor(Math.random() * ships.length)]
  }

  const getShipPattern = (row, col) => {
    const directions = [
      { dr: 0, dc: 1 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: -1, dc: 0 },
    ]

    let best = [[row, col]]

    for (const { dr, dc } of directions) {
      const coords = []
      for (let offset = -1; offset <= 1; offset += 1) {
        const nextRow = row + dr * offset
        const nextCol = col + dc * offset

        if (nextRow < 0 || nextRow >= GRID_SIZE || nextCol < 0 || nextCol >= GRID_SIZE) {
          break
        }

        coords.push([nextRow, nextCol])
      }

      if (coords.length === 3) {
        return coords
      }

      if (coords.length > best.length) {
        best = coords
      }
    }

    return best
  }

  const handleAbilityUse = (type) => {
    const config = ABILITY_CONFIGS[type]
    if (
      gameMode !== 'single' || placementActive || game.winner ||
      abilityCooldowns[type] > 0 || abilityUses[type] <= 0 ||
      (!usedAbilityTypes.includes(type) && usedAbilityTypes.length >= 3)
    ) {
      return
    }

    const availableTargets = []
    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        if (game.enemyBoard[row][col] !== 'hit' && game.enemyBoard[row][col] !== 'miss') {
          availableTargets.push([row, col])
        }
      }
    }

    const randomTargets = (count) => [...availableTargets]
      .sort(() => Math.random() - 0.5)
      .slice(0, count)
    const [row, col] = availableTargets[Math.floor(Math.random() * availableTargets.length)] || [0, 0]
    let coords = [[row, col]]
    let skipEnemyTurn = false
    let nextPlayerBoard = game.playerBoard

    if (type === 'cross') coords = getCrossPattern(row, col)
    if (type === 'ship' || type === 'shipTracker') coords = getThreeTileShipCoords(game.enemyLayout) || getShipPattern(row, col)
    if (type === 'line' || type === 'piercingShot') coords = getRandomLinePattern(row, col)
    if (type === 'airstrike') coords = randomTargets(3)
    if (type === 'missileBarrage') coords = randomTargets(7)
    if (type === 'scatterShot') coords = randomTargets(8)
    if (type === 'blackout') coords = randomTargets(10)
    if (type === 'ghostFleet') coords = randomTargets(12)
    if (type === 'minefield') coords = randomTargets(5)
    if (type === 'crossfire') coords = [...getCrossPattern(row, col), ...getCrossPattern((row + 4) % GRID_SIZE, (col + 4) % GRID_SIZE)]
    if (type === 'sonarPulse') coords = getCrossPattern(row, col).concat([[row - 1, col - 1], [row - 1, col + 1], [row + 1, col - 1], [row + 1, col + 1]])
      .filter(([targetRow, targetCol]) => targetRow >= 0 && targetRow < GRID_SIZE && targetCol >= 0 && targetCol < GRID_SIZE)
    if (type === 'heatMap') coords = Array.from({ length: 9 }, (_, index) => [row + Math.floor(index / 3) - 1, col + (index % 3) - 1])
      .filter(([targetRow, targetCol]) => targetRow >= 0 && targetRow < GRID_SIZE && targetCol >= 0 && targetCol < GRID_SIZE)
    if (type === 'torpedo' || type === 'finalSalvo') {
      coords = Math.random() < 0.5
        ? Array.from({ length: GRID_SIZE }, (_, targetCol) => [row, targetCol])
        : Array.from({ length: GRID_SIZE }, (_, targetRow) => [targetRow, col])
    }
    if (type === 'radarScan') coords = game.enemyLayout.flatMap((boardRow, targetRow) => boardRow.map((cell, targetCol) => cell === 'ship' ? [targetRow, targetCol] : null).filter(Boolean)).filter(([targetRow, targetCol]) => game.enemyBoard[targetRow][targetCol] === 'water').slice(0, 3)
    if (type === 'spyPlane') {
      const shipTarget = game.enemyLayout.flatMap((boardRow, targetRow) => boardRow.map((cell, targetCol) => cell === 'ship' ? [targetRow, targetCol] : null).filter(Boolean)).find(([targetRow, targetCol]) => game.enemyBoard[targetRow][targetCol] === 'water') || [row, col]
      coords = getCrossPattern(shipTarget[0], shipTarget[1])
    }
    if (type === 'tacticalSwap') {
      coords = [...getRandomLinePattern(row, col), ...getRandomLinePattern((row + 5) % GRID_SIZE, (col + 5) % GRID_SIZE)]
      skipEnemyTurn = true
    }
    if (type === 'counterattack') {
      coords = randomTargets(3)
      setDefenseCharges((currentCharges) => currentCharges + 1)
    }
    if (type === 'smokeScreen' || type === 'decoyShip' || type === 'armorPlating' || type === 'shieldGenerator') {
      skipEnemyTurn = type === 'smokeScreen'
      setDefenseCharges((currentCharges) => currentCharges + (type === 'shieldGenerator' ? 2 : 1))
    }
    if (type === 'emergencyRepair') {
      const repairedBoard = game.playerBoard.map((boardRow) => [...boardRow])
      const damaged = repairedBoard.flatMap((boardRow, targetRow) => boardRow.map((cell, targetCol) => cell === 'hit' ? [targetRow, targetCol] : null).filter(Boolean))[0]
      if (damaged) repairedBoard[damaged[0]][damaged[1]] = game.playerLayout[damaged[0]][damaged[1]] === 'ship' ? 'ship' : 'water'
      nextPlayerBoard = repairedBoard
      skipEnemyTurn = true
      coords = []
    }
    if (type === 'nuclearStrike') coords = availableTargets

    const nextEnemyBoard = game.enemyBoard.map((boardRow) => [...boardRow])
    let revealedCount = 0
    let hitCount = 0
    const uniqueCoords = coords.filter(([targetRow, targetCol], index, values) => targetRow >= 0 && targetRow < GRID_SIZE && targetCol >= 0 && targetCol < GRID_SIZE && values.findIndex(([sameRow, sameCol]) => sameRow === targetRow && sameCol === targetCol) === index)

    uniqueCoords.forEach(([targetRow, targetCol]) => {
      if (nextEnemyBoard[targetRow][targetCol] === 'hit' || nextEnemyBoard[targetRow][targetCol] === 'miss') return
      const hit = game.enemyLayout[targetRow][targetCol] === 'ship'
      nextEnemyBoard[targetRow][targetCol] = hit ? 'hit' : 'miss'
      revealedCount += 1
      if (hit) hitCount += 1
    })

    if (!skipEnemyTurn && revealedCount === 0 && type !== 'emergencyRepair') return

    setRecentAbility({ type, coords: uniqueCoords, id: `${type}-${Date.now()}` })
    setUsedAbilityTypes((currentTypes) => currentTypes.includes(type) ? currentTypes : [...currentTypes, type])
    setAbilityCooldowns((prev) => ({ ...prev, [type]: config.maxCooldown }))
    setAbilityUses((prev) => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }))
    if (abilityStock[type] > 0 && abilityUses[type] > config.maxUses) {
      setAbilityStock((prev) => ({ ...prev, [type]: Math.max(0, prev[type] - 1) }))
    }

    const status = type === 'emergencyRepair'
      ? 'Emergency Repair restored one damaged tile.'
      : `${config.label} revealed ${revealedCount} square${revealedCount === 1 ? '' : 's'}. ${hitCount > 0 ? 'Direct hits!' : 'No hits this time.'}`
    finalizePlayerMove(nextEnemyBoard, status, { skipEnemyTurn, nextPlayerBoard })
  }

  const handleStartClick = () => {
    setCurrentView('signin')
    setShowSignIn(true)
    setIsLoggedIn(false)
  }

  const startPlacementFlow = (nextDifficulty = difficulty) => {
    setDifficulty(nextDifficulty)
    setPlacementBoard(createEmptyBoard())
    setPlacementIndex(0)
    setPlacementOrientation('horizontal')
    setPlacementActive(true)
    setHoveredPlacement(null)
    setAbilityCooldowns(createAbilityMap(() => 0))
    setAbilityUses(createAbilityMap((config, type) => config.maxUses + abilityStock[type]))
    setUsedAbilityTypes([])
    setDefenseCharges(0)
    setGame({ ...createGameState(nextDifficulty), status: 'Place your fleet before the match starts.' })
  }

  const handleDifficultySelect = (nextDifficulty) => {
    startPlacementFlow(nextDifficulty)
  }

  const handleReset = () => {
    startPlacementFlow(difficulty)
  }

  const handlePlaceShip = (row, col) => {
    if (!placementActive || gameMode !== 'single') {
      return
    }

    const size = SHIP_SIZES[placementIndex]
    const nextBoard = placementBoard.map((boardRow) => [...boardRow])

    if (!canPlaceShip(nextBoard, row, col, size, placementOrientation === 'horizontal')) {
      return
    }

    const placedBoard = placeShip(nextBoard, row, col, size, placementOrientation === 'horizontal')
    setPlacementBoard(placedBoard)

    const nextPlacementIndex = placementIndex + 1
    if (nextPlacementIndex >= SHIP_SIZES.length) {
      const enemyFleet = createFleetBoard()
      setGame(createGameState(difficulty, placedBoard, enemyFleet.board))
      setPlacementActive(false)
      setHoveredPlacement(null)
      return
    }

    setPlacementIndex(nextPlacementIndex)
    setHoveredPlacement(null)
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const syncRoomState = () => {
      const store = readRoomStore(window.localStorage, ROOM_STORAGE_KEY)
      const nextRoom = activeRoomCode ? store[activeRoomCode] || null : null
      setRoomState(nextRoom)
    }

    const handleStorage = (event) => {
      if (event.key === ROOM_STORAGE_KEY) {
        syncRoomState()
      }
    }

    const channel = typeof window.BroadcastChannel === 'function'
      ? new window.BroadcastChannel('battleships-rooms')
      : null

    if (channel) {
      channel.addEventListener('message', (event) => {
        if (event.data?.type === 'room-update') {
          syncRoomState()
        }
      })
    }

    syncRoomState()
    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('storage', handleStorage)
      channel?.close()
    }
  }, [activeRoomCode])

  const persistRoomState = (nextRoomState) => {
    if (typeof window === 'undefined') {
      return
    }

    const store = readRoomStore(window.localStorage, ROOM_STORAGE_KEY)

    if (!nextRoomState) {
      if (store[activeRoomCode]) {
        delete store[activeRoomCode]
        writeRoomStore(window.localStorage, store, ROOM_STORAGE_KEY)
      }
      return
    }

    store[nextRoomState.code] = nextRoomState
    writeRoomStore(window.localStorage, store, ROOM_STORAGE_KEY)

    if (typeof window.BroadcastChannel === 'function') {
      const channel = new window.BroadcastChannel('battleships-rooms')
      channel.postMessage({ type: 'room-update', roomCode: nextRoomState.code })
      channel.close()
    }
  }

  const handleModeToggle = () => {
    if (gameMode === 'single') {
      setGameMode('multiplayer')
      setActiveRoomCode('')
      setRoomCodeInput('')
      setMultiplayerType('random')
      setRoomState(null)
      return
    }

    setGameMode('single')
    setActiveRoomCode('')
    setRoomCodeInput('')
    setMultiplayerType('random')
    setRoomState(null)
  }

  const handleRandomMatch = () => {
    if (typeof window === 'undefined') {
      return
    }

    const store = readRoomStore(window.localStorage, ROOM_STORAGE_KEY)
    const match = joinRandomMatch(store, {
      id: currentUser?.email || `guest-${Date.now()}`,
      name: currentUser?.username || 'Guest',
    })

    setMultiplayerType('random')
    setActiveRoomCode('')
    setRoomCodeInput('')
    setRoomState(match.roomState)
    if (match.roomState?.status === 'matched') {
      const nextMultiplayerGame = createMultiplayerMatchState('random-match', match.roomState.players)
      setMultiplayerGame(nextMultiplayerGame)
      const store = readRoomStore(window.localStorage, ROOM_STORAGE_KEY)
      store.randomMatch = nextMultiplayerGame
      writeRoomStore(window.localStorage, { ...store, randomMatch: nextMultiplayerGame }, ROOM_STORAGE_KEY)
    }
    writeRoomStore(window.localStorage, match.nextStore, ROOM_STORAGE_KEY)

    if (typeof window.BroadcastChannel === 'function') {
      const channel = new window.BroadcastChannel('battleships-rooms')
      channel.postMessage({ type: 'room-update' })
      channel.close()
    }
  }

  const handleCreateRoom = () => {
    const generatedCode = currentUser?.username
      ? `${currentUser.username.toLowerCase().replace(/\s+/g, '-')}-${Math.max(100, (currentUser.username.length + wins) % 900 + 100)}`
      : `guest-room-${Math.floor(100 + Math.random() * 900)}`

    const normalizedCode = normalizeRoomCode(generatedCode)

    const nextRoomState = joinRoomState(null, {
      id: currentUser?.email || `guest-${Date.now()}`,
      name: currentUser?.username || 'Guest',
      roomCode: normalizedCode,
    })

    setMultiplayerType('private')
    setActiveRoomCode(normalizedCode)
    setRoomCodeInput(normalizedCode)
    setRoomState(nextRoomState)
    persistRoomState(nextRoomState)
  }

  const handleJoinRoom = () => {
    const normalizedCode = normalizeRoomCode(roomCodeInput)

    if (!normalizedCode) {
      return
    }

    const store = typeof window !== 'undefined' ? readRoomStore(window.localStorage, ROOM_STORAGE_KEY) : {}
    const existingRoom = store[normalizedCode] || roomState
    const nextRoomState = joinRoomState(existingRoom, {
      id: currentUser?.email || `guest-${Date.now()}`,
      name: currentUser?.username || 'Guest',
      roomCode: normalizedCode,
    })

    setMultiplayerType('private')
    setActiveRoomCode(normalizedCode)
    setRoomState(nextRoomState)
    if (nextRoomState?.status === 'matched') {
      const nextMultiplayerGame = createMultiplayerMatchState(nextRoomState.code, nextRoomState.players)
      setMultiplayerGame(nextMultiplayerGame)
      persistRoomState({ ...nextRoomState, game: nextMultiplayerGame })
    }
    persistRoomState(nextRoomState)
  }

  const handleMultiplayerAttack = (row, col) => {
    if (!multiplayerGame || !currentUser?.email) {
      return
    }

    const activePlayer = getMultiplayerPlayerState(multiplayerGame, currentUser.email)
    const currentPlayerId = activePlayer?.id || currentUser.email

    const nextRoom = applyMultiplayerAttack(multiplayerGame, currentPlayerId, row, col)
    setMultiplayerGame(nextRoom)

    if (typeof window !== 'undefined') {
      const store = readRoomStore(window.localStorage, ROOM_STORAGE_KEY)
      store[normalizeRoomCode(multiplayerGame.code)] = { ...roomState, game: nextRoom }
      writeRoomStore(window.localStorage, store, ROOM_STORAGE_KEY)
    }
  }

  const roomCode = activeRoomCode || (currentUser?.username
    ? `${currentUser.username.toLowerCase().replace(/\s+/g, '-')}-${Math.max(100, (currentUser.username.length + wins) % 900 + 100)}`
    : 'guest-room-101')

  const activeTheme = THEME_PRESETS[themeName] || THEME_PRESETS.ocean
  const themeStyle = {
    '--app-background': activeTheme.background,
    '--panel-background': activeTheme.panel,
    '--panel-border': activeTheme.border,
    '--surface-background': activeTheme.surface,
    '--text-primary': activeTheme.text,
    '--text-secondary': activeTheme.muted,
    '--accent': activeTheme.accent,
  }

  const renderPreferencesBar = () => {
    if (!isLoggedIn) {
      return null
    }

    return (
      <div className="preferences-bar">
        <div className="preferences-stack">
          <button type="button" className="ghost-button" onClick={() => setShowThemeMenu((value) => !value)}>
            Preferences
          </button>
          {showThemeMenu && (
            <div className="preferences-menu">
              <p className="preferences-title">Pick a look</p>
              <div className="theme-swatches">
                {Object.entries(THEME_PRESETS).map(([value, preset]) => (
                  <button
                    key={value}
                    type="button"
                    className={`theme-swatch ${themeName === value ? 'active' : ''}`}
                    onClick={() => {
                      setThemeName(value)
                      setShowThemeMenu(false)
                    }}
                    style={{ background: preset.background }}
                  >
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (currentView === 'home') {
    return (
      <main ref={appRootRef} className="app-shell" style={themeStyle}>
        <section className="panel home-panel">
          <div className="home-overlay" />
          <div className="home-hero">
            <p className="eyebrow">Welcome to Battleships</p>
            <h1>Battleships</h1>
            <p className="lede home-copy">
              A classic naval showdown with private rooms, profile tracking, and a polished intro experience.
            </p>
            <div className="home-actions">
              <button type="button" className="primary-button" onClick={handleStartClick}>
                Log in and start playing!
              </button>
              <button type="button" className="ghost-button" onClick={() => {
                setCurrentView('credits')
              }}>
                Credits
              </button>
            </div>
          </div>
        </section>
      </main>
    )
  }

  if (currentView === 'credits') {
    return (
      <main ref={appRootRef} className="app-shell" style={themeStyle}>
        <section className="panel credits-panel">
          <button type="button" className="ghost-button credits-back" onClick={() => setCurrentView('home')}>
            Back
          </button>
          <div className="credits-text">Me, myself, and I</div>
        </section>
      </main>
    )
  }

  if (currentView === 'signin') {
    return (
      <main ref={appRootRef} className="app-shell" style={themeStyle}>
        {showSignIn ? (
          <SignIn
        onSignInComplete={(user) => {
          setCurrentUser(user)
          setScore(user?.score ?? 0)
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(user))
          }
          setIsLoggedIn(true)
          setCurrentView('game')
          setShowProfileMenu(false)
        }}
            onSwitchToSignUp={() => setShowSignIn(false)}
          />
        ) : (
          <SignUp
            onSignUpComplete={(user) => {
          setCurrentUser(user)
          setScore(user?.score ?? 0)
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(user))
          }
              setShowSignIn(true)
              setIsLoggedIn(true)
              setCurrentView('game')
              setShowProfileMenu(false)
            }}
            onSwitchToSignIn={() => setShowSignIn(true)}
          />
        )}
      </main>
    )
  }

  return (
    <main ref={appRootRef} className="app-shell" style={themeStyle}>
      {renderPreferencesBar()}
      <section className="panel">
        <header className="intro">
          <div>
            <p className="eyebrow">Vite + React</p>
            <h1>Battleships</h1>
            <p className="lede">
              Sink the enemy fleet before they sink yours. Every turn fires one shot on the enemy waters.
            </p>
          </div>
          <div className="header-actions">
            <button type="button" className="ghost-button" onClick={handleReset}>
              New match
            </button>
            <div className="currency-badge" aria-label={`${battleCurrency} battle currency`}>
              <span>Battle currency</span>
              <strong>{battleCurrency}</strong>
            </div>
            <button type="button" className="primary-button" onClick={() => setShowAbilityShop((value) => !value)}>
              {showAbilityShop ? 'Close ability shop' : 'Ability shop'}
            </button>
            <button type="button" className="primary-button" onClick={() => setShowLeaderboard((value) => !value)}>
              {showLeaderboard ? 'Hide leaderboard' : 'Leaderboard'}
            </button>
            <button type="button" className="ghost-button" onClick={() => setShowCurrencyLeaderboard((value) => !value)}>
              {showCurrencyLeaderboard ? 'Hide currency leaderboard' : 'Currency leaderboard'}
            </button>
            <div className="profile-stack">
              <button type="button" className="ghost-button profile-toggle" onClick={() => setShowProfileMenu((value) => !value)}>
                <span className="profile-avatar">{(currentUser?.username || currentUser?.email || 'P').charAt(0).toUpperCase()}</span>
                <span>{currentUser?.username || 'Profile'}</span>
              </button>
              {showProfileMenu && (
                <div className="profile-menu">
                  <div className="profile-card">
                    <div className="profile-summary">
                      <span className="profile-avatar large">{(currentUser?.username || currentUser?.email || 'P').charAt(0).toUpperCase()}</span>
                      <div>
                        <p className="profile-name">{currentUser?.username || 'Captain'}</p>
                        <p className="profile-email">{currentUser?.email || 'Signed in'}</p>
                      </div>
                    </div>
                    <div className="profile-win-box">
                      <span>Wins</span>
                      <strong>{wins}</strong>
                    </div>
                    <div className="profile-win-box">
                      <span>Score</span>
                      <strong>{score}</strong>
                    </div>
                    <div className="profile-win-box">
                      <span>Battle currency</span>
                      <strong>{battleCurrency}</strong>
                    </div>
                  </div>
                </div>
              )}
              <button type="button" className="ghost-button" onClick={() => {
                setIsLoggedIn(false)
                setCurrentView('home')
                setShowSignIn(true)
                setCurrentUser(null)
                setShowProfileMenu(false)
              }}>
                Logout
              </button>
            </div>
          </div>
        </header>

        <section className="difficulty-card">
          <div>
            <p className="eyebrow">Choose a level</p>
            <h2>Difficulty</h2>
            <p className="lede small">Switch levels anytime. Picking a new level resets the board for a fresh match.</p>
          </div>
          <div className="difficulty-pills" role="group" aria-label="Difficulty levels">
            {Object.entries(DIFFICULTY_OPTIONS).map(([value, settings]) => (
              <button
                key={value}
                type="button"
                className={`difficulty-pill ${difficulty === value ? 'active' : ''}`}
                onClick={() => handleDifficultySelect(value)}
              >
                <strong>{settings.label}</strong>
                <span>{settings.description}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mode-card">
          <div>
            <p className="eyebrow">Optional</p>
            <h2>Multiplayer modes</h2>
            <p className="lede small">
              {gameMode === 'single'
                ? 'Keep the classic single-player experience, or switch to an optional multiplayer mode.'
                : multiplayerType === 'random'
                  ? 'You are in random matchmaking. A player will be paired with you automatically.'
                  : 'You are in a private room. Share the code with a friend or join one you already have.'}
            </p>
          </div>
          <div className="mode-actions">
            <button type="button" className={`ghost-button ${gameMode === 'multiplayer' ? 'active-mode' : ''}`} onClick={handleModeToggle}>
              {gameMode === 'single' ? 'Play against other users' : 'Return to single player'}
            </button>
            {gameMode === 'multiplayer' && (
              <>
                <button type="button" className={`ghost-button ${multiplayerType === 'random' ? 'active-mode' : ''}`} onClick={handleRandomMatch}>
                  Random players
                </button>
                <button type="button" className="ghost-button" onClick={handleCreateRoom}>
                  Create private room
                </button>
                {multiplayerType === 'private' && (
                  <div className="room-input-group">
                    <input
                      type="text"
                      value={roomCodeInput}
                      onChange={(event) => setRoomCodeInput(event.target.value)}
                      placeholder="Enter room code"
                    />
                    <button type="button" className="primary-button" onClick={handleJoinRoom}>
                      Join room
                    </button>
                  </div>
                )}
                <div className="room-box">
                  <span>{multiplayerType === 'private' ? 'Private room' : 'Random match'}</span>
                  <strong>{multiplayerType === 'private' ? roomCode : (roomState?.status === 'matched' ? 'Matched' : 'Searching for players')}</strong>
                  {(roomState?.status === 'matched') && (
                    <span className="room-status">Matched with {getOpponentName(roomState, currentUser?.email || roomState.players[0]?.id)}</span>
                  )}
                </div>
              </>
            )}
          </div>
        </section>

        <section className="stats-row">
          <article className="stat-card">
            <span>Enemy hits</span>
            <strong>{enemyHits}</strong>
          </article>
          <article className="stat-card">
            <span>Your hits</span>
            <strong>{playerHits}</strong>
          </article>
          <article className="stat-card status-card">
            <span>Status</span>
            <strong>{game.winner === 'player' ? 'Victory' : game.winner === 'enemy' ? 'Defeat' : game.winner === 'draw' ? 'Draw' : 'Live fire'}</strong>
          </article>
        </section>

        {showLeaderboard && (
          <div className="leaderboard-overlay" onClick={() => setShowLeaderboard(false)}>
            <section className="leaderboard-card" onClick={(event) => event.stopPropagation()}>
              <div className="board-heading">
                <h2>Leaderboard</h2>
                <p>Top 100 players ranked by wins. Your place is shown at the bottom when you are outside the top 100.</p>
              </div>
              <div className="leaderboard-list">
                {leaderboard.map((entry) => (
                  <div key={entry.id} className={`leaderboard-row ${currentUser?.id === entry.id ? 'leaderboard-self' : ''}`}>
                    <span className="leaderboard-rank">#{entry.rank}</span>
                    <span className="leaderboard-name">{entry.username}</span>
                    <span className="leaderboard-score">{entry.score} wins</span>
                  </div>
                ))}
                {yourLeaderboardEntry && (
                  <div className="leaderboard-row leaderboard-self">
                    <span className="leaderboard-rank">#{yourLeaderboardEntry.rank}</span>
                    <span className="leaderboard-name">{yourLeaderboardEntry.username}</span>
                    <span className="leaderboard-score">{yourLeaderboardEntry.score} wins</span>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {showCurrencyLeaderboard && (
          <div className="leaderboard-overlay" onClick={() => setShowCurrencyLeaderboard(false)}>
            <section className="leaderboard-card" onClick={(event) => event.stopPropagation()}>
              <div className="board-heading">
                <h2>Currency leaderboard</h2>
                <p>Top 100 players ranked by battle currency. Your place is shown at the bottom when you are outside the top 100.</p>
              </div>
              <div className="leaderboard-list">
                {currencyLeaderboard.map((entry) => (
                  <div key={entry.id} className={`leaderboard-row ${currentUser?.id === entry.id ? 'leaderboard-self' : ''}`}>
                    <span className="leaderboard-rank">#{entry.rank}</span>
                    <span className="leaderboard-name">{entry.username}</span>
                    <span className="leaderboard-score">{entry.currency.toLocaleString()} currency</span>
                  </div>
                ))}
                {yourCurrencyLeaderboardEntry && (
                  <div className="leaderboard-row leaderboard-self">
                    <span className="leaderboard-rank">#{yourCurrencyLeaderboardEntry.rank}</span>
                    <span className="leaderboard-name">{yourCurrencyLeaderboardEntry.username}</span>
                    <span className="leaderboard-score">{yourCurrencyLeaderboardEntry.currency.toLocaleString()} currency</span>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {showAbilityShop && (
          <div className="leaderboard-overlay" onClick={() => setShowAbilityShop(false)}>
            <section className="leaderboard-card ability-shop-card" onClick={(event) => event.stopPropagation()}>
              <div className="board-heading">
                <h2>Ability shop</h2>
                <p>Spend battle currency on extra ability charges. Purchased charges persist between matches.</p>
              </div>
              <div className="shop-balance">Balance: <strong>{battleCurrency}</strong></div>
              <div className="shop-list">
                {ABILITY_CATEGORIES.map((category) => (
                  <section key={category} className="shop-category">
                    <h3>{category}</h3>
                    <div className="shop-category-list">
                      {Object.entries(ABILITY_CONFIGS)
                        .filter(([, config]) => config.category === category)
                        .map(([type, config]) => (
                          <div key={type} className="shop-row">
                            <div>
                              <strong>{config.label}</strong>
                              <p>{config.description}</p>
                              <small>Stored charges: {abilityStock[type]}</small>
                            </div>
                            <button
                              type="button"
                              className="primary-button"
                              onClick={() => handleBuyAbility(type)}
                              disabled={battleCurrency < config.price}
                            >
                              Buy · {config.price.toLocaleString()}
                            </button>
                          </div>
                        ))}
                    </div>
                  </section>
                ))}
              </div>
            </section>
          </div>
        )}

        <section className="boards-grid">
          {placementActive && gameMode === 'single' ? (
            <article className="board-card">
              <div className="board-heading">
                <h2>Place your fleet</h2>
                <p>Choose where each ship goes. You are placing the {SHIP_SIZES[placementIndex]}-cell {placementOrientation} ship.</p>
                <button type="button" className="ghost-button" onClick={() => setPlacementOrientation((value) => (value === 'horizontal' ? 'vertical' : 'horizontal'))}>
                  Switch to {placementOrientation === 'horizontal' ? 'vertical' : 'horizontal'}
                </button>
              </div>
              <div className="board placement-board" aria-label="Fleet placement grid">
                {placementBoard.map((row, rowIndex) =>
                  row.map((cell, colIndex) => {
                    const isHovered = hoveredPlacement?.some(([hoverRow, hoverCol]) => hoverRow === rowIndex && hoverCol === colIndex)
                    const isPreview = isHovered && placementActive

                    return (
                      <button
                        key={`placement-${rowIndex}-${colIndex}`}
                        type="button"
                        className={`cell placement-cell ${cell === 'ship' ? 'ship' : ''} ${isPreview ? 'placement-preview' : ''}`}
                        onClick={() => handlePlaceShip(rowIndex, colIndex)}
                        onMouseEnter={() => {
                          const size = SHIP_SIZES[placementIndex]
                          if (!canPlaceShip(placementBoard, rowIndex, colIndex, size, placementOrientation === 'horizontal')) {
                            setHoveredPlacement(null)
                            return
                          }

                          const previewCells = []
                          for (let offset = 0; offset < size; offset += 1) {
                            const nextRow = placementOrientation === 'horizontal' ? rowIndex : rowIndex + offset
                            const nextCol = placementOrientation === 'horizontal' ? colIndex + offset : colIndex
                            previewCells.push([nextRow, nextCol])
                          }
                          setHoveredPlacement(previewCells)
                        }}
                        onMouseLeave={() => setHoveredPlacement(null)}
                        aria-label={`Place ship at row ${rowIndex + 1}, column ${colIndex + 1}`}
                      />
                    )
                  })
                )}
              </div>
            </article>
          ) : multiplayerGame && gameMode === 'multiplayer' ? (
            <>
              <article className="board-card">
                <div className="board-heading">
                  <h2>Your fleet</h2>
                  <p>Watch your own waters and your damage report.</p>
                </div>
                <div className="board" aria-label="Your fleet grid">
                  {(() => {
                    const playerState = getMultiplayerPlayerState(multiplayerGame, currentUser?.email || currentUser?.username || 'guest')
                    return (playerState?.playerBoard || []).map((row, rowIndex) =>
                      row.map((cell, colIndex) => (
                        <div
                          key={`player-${rowIndex}-${colIndex}`}
                          className={`cell ${cell === 'ship' ? 'ship' : cell === 'hit' ? 'hit' : cell === 'miss' ? 'miss' : 'water'}`}
                          aria-label={`Your ${rowIndex + 1},${colIndex + 1}`}
                        />
                      ))
                    )
                  })()}
                </div>
              </article>

              <article className="board-card">
                <div className="board-heading">
                  <h2>Enemy waters</h2>
                  <p>{multiplayerGame.turnPlayerId === (currentUser?.email || currentUser?.username || 'guest') ? 'Your turn to fire.' : 'Waiting for the opponent to move.'}</p>
                </div>
                <div className="board" aria-label="Enemy waters grid">
                  {(() => {
                    const playerState = getMultiplayerPlayerState(multiplayerGame, currentUser?.email || currentUser?.username || 'guest')
                    return (playerState?.enemyBoard || []).map((row, rowIndex) =>
                      row.map((cell, colIndex) => {
                        const isShot = cell === 'hit' || cell === 'miss'

                        return (
                          <button
                            key={`enemy-${rowIndex}-${colIndex}`}
                            type="button"
                            className={`cell enemy-cell ${isShot ? (cell === 'hit' ? 'hit' : 'miss') : 'water'}`}
                            onClick={() => handleMultiplayerAttack(rowIndex, colIndex)}
                            disabled={Boolean(multiplayerGame.winner) || isShot || multiplayerGame.turnPlayerId !== (currentUser?.email || currentUser?.username || 'guest')}
                            aria-label={`Fire at row ${rowIndex + 1}, column ${colIndex + 1}`}
                          />
                        )
                      })
                    )
                  })()}
                </div>
              </article>
            </>
          ) : (
            <>
              <article className="board-card">
                <div className="board-heading">
                  <h2>Your fleet</h2>
                  <p>Watch your own waters and your damage report.</p>
                </div>
                <div ref={playerBoardRef} className="board player-board" aria-label="Your fleet grid">
                  {game.playerBoard.map((row, rowIndex) =>
                    row.map((cell, colIndex) => {
                      const isRecentHit = recentHit?.board === 'player' && recentHit.row === rowIndex && recentHit.col === colIndex

                      return (
                        <div
                          key={`player-${rowIndex}-${colIndex}`}
                          data-hit-coord={`${rowIndex}-${colIndex}`}
                          className={`cell ${cell === 'ship' ? 'ship' : cell === 'hit' ? 'hit' : cell === 'miss' ? 'miss' : 'water'}`}
                          aria-label={`Your ${rowIndex + 1},${colIndex + 1}`}
                        >
                          {isRecentHit ? (
                            <span className={`hit-bomb ${cell === 'miss' ? 'miss-bomb' : ''}`}>
                              {cell === 'miss' ? '💨' : '💥'}
                            </span>
                          ) : null}
                        </div>
                      )
                    })
                  )}
                </div>
              </article>

              <article className="board-card">
                <div className="board-heading">
                  <h2>Enemy waters</h2>
                  <p>Click a square to fire. Hidden ships are placed at random.</p>
                </div>
                <div ref={enemyBoardRef} className="board enemy-board" aria-label="Enemy waters grid">
                  {game.enemyBoard.map((row, rowIndex) =>
                    row.map((cell, colIndex) => {
                      const isShot = cell === 'hit' || cell === 'miss'
                      const isRecentHit = recentHit?.board === 'enemy' && recentHit.row === rowIndex && recentHit.col === colIndex

                      return (
                        <button
                          key={`enemy-${rowIndex}-${colIndex}`}
                          type="button"
                          data-hit-coord={`${rowIndex}-${colIndex}`}
                          className={`cell enemy-cell ${isShot ? (cell === 'hit' ? 'hit' : 'miss') : hoveredEnemyTarget?.[0] === rowIndex && hoveredEnemyTarget?.[1] === colIndex ? 'targeted' : 'water'}`}
                          onClick={(event) => handlePlayerAttack(rowIndex, colIndex, event)}
                          onMouseEnter={() => setHoveredEnemyTarget([rowIndex, colIndex])}
                          onMouseLeave={() => setHoveredEnemyTarget(null)}
                          onFocus={() => setHoveredEnemyTarget([rowIndex, colIndex])}
                          onBlur={() => setHoveredEnemyTarget(null)}
                          disabled={Boolean(game.winner) || isShot}
                          aria-label={`Fire at row ${rowIndex + 1}, column ${colIndex + 1}`}
                        >
                          {isRecentHit ? (
                            <span className={`hit-bomb ${cell === 'miss' ? 'miss-bomb' : ''}`}>
                              {cell === 'miss' ? '💨' : '💥'}
                            </span>
                          ) : null}
                        </button>
                      )
                    })
                  )}
                </div>
              </article>
            </>
          )}
        </section>

        {!placementActive && gameMode === 'single' && (
          <section className="abilities-panel">
            <div className="abilities-heading">
              <h2>Abilities</h2>
              <p>Choose up to 3 different ability types per match. Cooldowns tick down after each enemy turn.</p>
            </div>
            <div className="ability-buttons">
              {Object.entries(ABILITY_CONFIGS).map(([type, config]) => {
                const hasUsesLeft = abilityUses[type] > 0
                const usedTypeLimit = !usedAbilityTypes.includes(type) && usedAbilityTypes.length >= 3
                const disabled = Boolean(game.winner) || abilityCooldowns[type] > 0 || !hasUsesLeft || usedTypeLimit

                return (
                  <button
                    key={type}
                    type="button"
                    className="ability-button"
                    onClick={() => handleAbilityUse(type)}
                    disabled={disabled}
                    aria-label={`${config.label}: ${config.description}`}
                  >
                    <span>{config.label}</span>
                    <small>
                      {abilityCooldowns[type] > 0
                        ? `Cooldown ${abilityCooldowns[type]} · ${abilityUses[type]} use${abilityUses[type] === 1 ? '' : 's'} left`
                        : usedTypeLimit
                          ? 'Three ability types already chosen'
                          : `${config.description} · ${abilityUses[type]} use${abilityUses[type] === 1 ? '' : 's'} left`}
                    </small>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        <footer className="footer-bar">
          <p ref={statusRef}>{gameMode === 'multiplayer' ? (multiplayerType === 'private'
            ? (roomState?.status === 'matched'
              ? `Room ${roomCode} is matched. ${getOpponentName(roomState, currentUser?.email || roomState.players[0]?.id) || 'Another player'} is ready.`
              : `Private room ready: ${roomCode}. Share this code with another player to begin.`)
            : (roomState?.status === 'matched'
              ? `Random match ready. ${getOpponentName(roomState, currentUser?.email || roomState.players[0]?.id) || 'Another player'} is waiting.`
              : 'Random multiplayer is ready. A player will be matched with you shortly.')) : (placementActive && gameMode === 'single' ? 'Place your fleet before the match starts.' : game.status)}</p>
          <button type="button" className="primary-button" onClick={handleReset}>
            Reset board
          </button>
        </footer>
      </section>
    </main>
  )
}

export default App
