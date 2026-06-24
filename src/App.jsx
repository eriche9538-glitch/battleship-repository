import { useState } from 'react'
import './App.css'
import SignUp from './SignUp'

const GRID_SIZE = 10
const SHIP_SIZES = [5, 4, 3, 3, 2]
const DIFFICULTY_OPTIONS = {
  easy: { label: 'Easy', description: 'Random shots and a slower enemy.', delay: 320 },
  medium: { label: 'Medium', description: 'Targets nearby hits more often.', delay: 430 },
  master: { label: 'Master', description: 'Aggressive, hunt-and-target attacks.', delay: 550 },
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

function createGameState(difficulty = 'medium') {
  const playerFleet = createFleetBoard()
  const enemyFleet = createFleetBoard()

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

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [difficulty, setDifficulty] = useState('medium')
  const [game, setGame] = useState(() => createGameState('medium'))

  const enemyHits = game.enemyBoard.flat().filter((cell) => cell === 'hit').length
  const playerHits = game.playerBoard.flat().filter((cell) => cell === 'hit').length

  const handlePlayerAttack = (row, col) => {
    if (game.winner || game.enemyBoard[row][col] === 'hit' || game.enemyBoard[row][col] === 'miss') {
      return
    }

    const nextEnemyBoard = game.enemyBoard.map((boardRow) => [...boardRow])
    const hit = game.enemyLayout[row][col] === 'ship'

    nextEnemyBoard[row][col] = hit ? 'hit' : 'miss'

    const winner = isFleetSunk(game.enemyLayout, nextEnemyBoard) ? 'player' : null

    setGame((current) => ({
      ...current,
      enemyBoard: nextEnemyBoard,
      winner,
      status: winner
        ? 'You sank the enemy fleet. Victory!'
        : hit
          ? 'Direct hit! The enemy is taking damage.'
          : 'Missed the target. The enemy retaliates.',
    }))

    if (!winner) {
      window.setTimeout(() => {
        setGame((current) => {
          const [enemyRow, enemyCol] = chooseEnemyShot(current.playerBoard, current.difficulty) || []

          if (enemyRow === undefined || enemyCol === undefined) {
            return {
              ...current,
              winner: 'draw',
              status: 'No shots left. Start a new game to play again.',
            }
          }

          const nextPlayerBoard = current.playerBoard.map((boardRow) => [...boardRow])
          const enemyHit = current.playerLayout[enemyRow][enemyCol] === 'ship'

          nextPlayerBoard[enemyRow][enemyCol] = enemyHit ? 'hit' : 'miss'

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
      }, DIFFICULTY_OPTIONS[difficulty].delay)
    }
  }

  const handleDifficultySelect = (nextDifficulty) => {
    setDifficulty(nextDifficulty)
    setGame(createGameState(nextDifficulty))
  }

  const handleReset = () => {
    setGame(createGameState(difficulty))
  }

  if (!isLoggedIn) {
    return <SignUp onSignUpComplete={() => setIsLoggedIn(true)} />
  }

  return (
    <main className="app-shell">
      <section className="panel">
        <header className="intro">
          <div>
            <p className="eyebrow">Vite + React</p>
            <h1>Battleships</h1>
            <p className="lede">
              Sink the enemy fleet before they sink yours. Every turn fires one shot on the enemy waters.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexDirection: 'column' }}>
            <button type="button" className="ghost-button" onClick={handleReset}>
              New match
            </button>
            <button type="button" className="ghost-button" onClick={() => setIsLoggedIn(false)}>
              Logout
            </button>
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

        <section className="boards-grid">
          <article className="board-card">
            <div className="board-heading">
              <h2>Your fleet</h2>
              <p>Watch your own waters and your damage report.</p>
            </div>
            <div className="board" aria-label="Your fleet grid">
              {game.playerBoard.map((row, rowIndex) =>
                row.map((cell, colIndex) => (
                  <div
                    key={`player-${rowIndex}-${colIndex}`}
                    className={`cell ${cell === 'ship' ? 'ship' : cell === 'hit' ? 'hit' : cell === 'miss' ? 'miss' : 'water'}`}
                    aria-label={`Your ${rowIndex + 1},${colIndex + 1}`}
                  />
                ))
              )}
            </div>
          </article>

          <article className="board-card">
            <div className="board-heading">
              <h2>Enemy waters</h2>
              <p>Click a square to fire. Hidden ships are placed at random.</p>
            </div>
            <div className="board" aria-label="Enemy waters grid">
              {game.enemyBoard.map((row, rowIndex) =>
                row.map((cell, colIndex) => {
                  const isShot = cell === 'hit' || cell === 'miss'

                  return (
                    <button
                      key={`enemy-${rowIndex}-${colIndex}`}
                      type="button"
                      className={`cell enemy-cell ${isShot ? (cell === 'hit' ? 'hit' : 'miss') : 'water'}`}
                      onClick={() => handlePlayerAttack(rowIndex, colIndex)}
                      disabled={Boolean(game.winner) || isShot}
                      aria-label={`Fire at row ${rowIndex + 1}, column ${colIndex + 1}`}
                    />
                  )
                })
              )}
            </div>
          </article>
        </section>

        <footer className="footer-bar">
          <p>{game.status}</p>
          <button type="button" className="primary-button" onClick={handleReset}>
            Reset board
          </button>
        </footer>
      </section>
    </main>
  )
}

export default App
