# Battleship Game - Abilities Edition 🚢⚔️

A fully-featured Battleship game built with **React + Vite** and powered by **Cloudflare Pages & D1 Database**. Play solo against AI, challenge friends in multiplayer, and master strategic abilities to dominate your opponents.

## 🎮 Game Overview

Battle opponents on a 10×10 grid with:
- **Single-player modes** with difficulty levels (Easy, Medium, Master)
- **Multiplayer support** for real-time PvP battles
- **Strategic abilities** across 4 categories: Offensive, Recon, Defense, and Ultra
- **Battle currency system** to purchase and unlock powerful abilities
- **Leaderboard rankings** to track your victories
- **Multiple theme options** for personalized gameplay
- **Account system** with persistent progression

## 🚀 Quick Start

### Installation

```bash
npm install
```

### Development

Run all three services concurrently:

```bash
npm run dev
```

Or run individually:
- **Frontend**: `npm run vite:dev` (http://localhost:5173)
- **Worker API**: `wrangler dev --remote --port 8787`
- **API Server**: `npm run api:dev`
- **Pages Dev**: `npm run pages:dev`

### Building

```bash
npm run build
npm run preview
```

## 📊 Game Modes

### Single Player
- **Easy**: Random shots, slower enemy, 25 points reward
- **Medium**: Targets nearby hits more often, 100 points reward
- **Master**: Aggressive hunt-and-target strategy, 1000 points reward

### Multiplayer
- Create rooms or join random matches
- Share room codes with friends
- Real-time battle synchronization
- Ability cooldown management during matches

## 🔮 Abilities System

Abilities are special powers you can purchase and equip to gain strategic advantages. Each ability has:
- **Name & Description**: What the ability does
- **Category**: Offensive, Recon, Defense, or Ultra (☢)
- **Price**: Battle currency cost to unlock
- **Cooldown**: Turns between uses
- **Max Uses**: Limited uses per match (0 = infinite in-match uses)

### Starter Abilities (Free)
Everyone begins with three basic abilities:
- **Cross Scan**: Reveal a 5-square cross pattern
- **Ship Scan**: Reveal and sink a 3-cell ship
- **Line Sweep**: Reveal 5 squares in a random line

### Economy & Progression
- Earn **battle currency** by winning matches
- Purchase abilities to expand your arsenal
- Equip loadouts before battle (limited slots)
- Build custom strategies with ability combinations

## 🎯 Ability Categories

See [ABILITIES.md](ABILITIES.md) for detailed information on all 29+ abilities organized by category.

## 🏗️ Project Structure

```
src/
  ├── App.jsx              # Main game component
  ├── App.css              # Game styles
  ├── SignIn.jsx           # Authentication
  ├── SignUp.jsx           # Registration
  ├── multiplayerRooms.js  # Multiplayer logic
  ├── scoreService.js      # Score/currency management
  └── worker.ts            # Cloudflare Worker runtime
functions/
  └── api/                 # Cloudflare Pages Functions
      ├── signin.ts
      ├── signup.ts
      ├── account.ts
      ├── currency.ts
      ├── score.ts
      └── leaderboard.ts
migrations/
  ├── 0001_create_users_table.sql
  └── 0002_add_battle_currency.sql
```

## 🔧 Tech Stack

- **Frontend**: React 19, Vite, Motion (animations)
- **Backend**: Cloudflare Workers & Pages Functions
- **Database**: Cloudflare D1 (SQLite)
- **Styling**: CSS with multiple theme presets
- **Testing**: ESLint for code quality

## 🎨 Themes

Choose from 8 beautiful themes:
- Pink, Red, Blue, Black, Green, Orange, Purple, Yellow

## 📈 Stats & Leaderboard

Track your performance:
- Total wins and losses
- Battle currency balance
- Rank position
- Match history
- Ability collection progress

## 🔐 Account System

- Secure sign-up and sign-in
- Account recovery options
- Persistent progression
- Cross-device synchronization

## 🐛 Development

```bash
# Lint code
npm run lint

# Build for production
npm run build
```

## 📚 Resources

- [Vite Documentation](https://vitejs.dev)
- [React Documentation](https://react.dev)
- [Cloudflare Pages](https://pages.cloudflare.com)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)

## 📝 License

This project is provided as-is for educational and entertainment purposes.
