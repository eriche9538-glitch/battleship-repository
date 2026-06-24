# Battleship Game with D1 Sign-Up Integration

## Overview

This project is a Vite + React battleship game with Cloudflare Workers and D1 (Cloudflare's SQLite database) integration. Users must sign up before playing the game.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up D1 Database

The D1 database configuration is already in `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "battleship-db"
database_id = "66641c4e-91f1-46c4-90b6-2fa2bb08ea6c"
```

### 3. Create Database Tables

Run the migration to create the users table:

```bash
npx wrangler d1 migrations apply battleship-db --local
```

Or for production:

```bash
npx wrangler d1 migrations apply battleship-db --remote
```

If you need to create the table manually, connect to the database:

```bash
npx wrangler d1 execute battleship-db --local --file=migrations/0001_create_users_table.sql
```

### 4. Development Server

```bash
npm run dev
```

The app will start at `http://localhost:5173/`. You'll see a sign-up page first.

### 5. Sign Up

Fill out the sign-up form with:
- **Username**: A unique captain name
- **Email**: Your email address
- **Password**: At least 6 characters

The sign-up data is stored in D1 and sent to the `/api/signup` endpoint.

### 6. Play the Game

After signing up, you can select difficulty levels (Easy, Medium, Master) and play battleship against the AI.

## Project Structure

```
├── src/
│   ├── App.jsx              # Main game and routing component
│   ├── App.css              # Game styles
│   ├── SignUp.jsx           # Sign-up component
│   ├── SignUp.css           # Sign-up styles
│   ├── main.jsx             # React entry point
│   └── index.css            # Global styles
├── functions/
│   └── api/
│       └── signup.js        # Cloudflare Workers API handler for sign-ups
├── migrations/
│   └── 0001_create_users_table.sql  # D1 migration for users table
├── wrangler.toml            # Cloudflare Workers config
└── package.json
```

## API Endpoints

### POST `/api/signup`

Sign up a new user.

**Request:**
```json
{
  "username": "captain_john",
  "email": "captain@example.com",
  "password": "securepass123"
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": 1,
    "username": "captain_john",
    "email": "captain@example.com"
  }
}
```

**Response (Error - 400/409/500):**
```json
{
  "error": "Email or username already exists"
}
```

## Database Schema

**users table:**
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Deployment

### Deploy to Cloudflare Workers

```bash
npx wrangler deploy
```

### Bind D1 to Workers

The D1 database binding is configured in `wrangler.toml`. When deployed, the `env.DB` object will be available in your functions.

## Security Notes

- **Password Hashing**: Currently using SHA-256. In production, use bcrypt or argon2.
- **HTTPS**: Ensure all communication is over HTTPS in production.
- **Validation**: All inputs are validated on the backend. Add rate limiting for production.
- **CORS**: Configure appropriate CORS headers for your domain.

## Troubleshooting

### Sign-up fails with "Cannot find module 'node:crypto'"
Ensure you're using Node.js 16+ which has the `crypto` module built-in.

### D1 database errors
- Check the database ID in `wrangler.toml`
- Verify the migration was applied: `npx wrangler d1 info battleship-db`
- Check database schema: `npx wrangler d1 execute battleship-db --local "SELECT * FROM users;"`

### API endpoint returns 404
Ensure the `functions/api/signup.js` file exists and Wrangler is configured to serve it.

## Features

- **Sign-Up Page**: Create accounts with validation
- **D1 Database**: Store user data securely
- **Battleship Game**: Play against AI with three difficulty levels
- **Responsive Design**: Works on desktop and mobile
- **Real-time Gameplay**: Interactive game board with immediate feedback

## Difficulty Levels

- **Easy**: Random shots, 320ms delay between moves
- **Medium**: Targets nearby hits, 430ms delay
- **Master**: Aggressive hunt-and-target strategy, 550ms delay
