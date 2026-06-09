import { useState } from 'react'
import './App.css'

const GRID_SIZE = 10
const SHIP_SIZES = [5, 4, 3, 3, 2]

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

function createGameState() {
  const playerFleet = createFleetBoard()
  const enemyFleet = createFleetBoard()

  return {
    playerLayout: playerFleet.board,
    enemyLayout: enemyFleet.board,
    playerBoard: playerFleet.board.map((row) => [...row]),
    enemyBoard: createEmptyBoard(),
    status: 'Your turn. Choose a square on the enemy grid.',
    winner: null,
  }
}

function App() {
  const [game, setGame] = useState(createGameState)

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
          const availableShots = []

          for (let y = 0; y < GRID_SIZE; y += 1) {
            for (let x = 0; x < GRID_SIZE; x += 1) {
              if (current.playerBoard[y][x] !== 'hit' && current.playerBoard[y][x] !== 'miss') {
                availableShots.push([y, x])
              }
            }
          }

          if (availableShots.length === 0) {
            return {
              ...current,
              winner: 'draw',
              status: 'No shots left. Start a new game to play again.',
            }
          }

          const [enemyRow, enemyCol] = availableShots[
            Math.floor(Math.random() * availableShots.length)
          ]
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
      }, 450)
    }
  }

  const handleReset = () => {
    setGame(createGameState())
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
          <button type="button" className="ghost-button" onClick={handleReset}>
            New match
          </button>
        </header>

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
