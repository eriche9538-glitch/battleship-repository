/**
 * Signup API Handler
 * Handles user registration and stores data in Cloudflare D1 when available.
 * Falls back to an in-memory store for local development.
 */
const localUsers = []

export async function onRequestPost(context) {
  const { request, env } = context

  try {
    const body = await request.json().catch(() => null)
    const { username, email, password } = body || {}

    if (!username || !email || !password) {
      return jsonResponse(400, { error: 'Missing required fields' })
    }

    if (password.length < 6) {
      return jsonResponse(400, { error: 'Password must be at least 6 characters' })
    }

    if (!email.includes('@')) {
      return jsonResponse(400, { error: 'Invalid email format' })
    }

    const db = env?.DB ?? null

    if (db) {
      await db
        .prepare(`
          CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `)
        .run()

      const existingUser = await db
        .prepare('SELECT id FROM users WHERE email = ? OR username = ?')
        .bind(email, username)
        .first()

      if (existingUser) {
        return jsonResponse(409, { error: 'Email or username already exists' })
      }

      const hashedPassword = await hashPassword(password)
      const result = await db
        .prepare(
          'INSERT INTO users (username, email, password) VALUES (?, ?, ?) RETURNING id, username, email'
        )
        .bind(username, email, hashedPassword)
        .first()

      return jsonResponse(201, {
        success: true,
        message: 'User created successfully',
        user: result,
      })
    }

    const existingLocalUser = localUsers.find((user) => user.email === email || user.username === username)
    if (existingLocalUser) {
      return jsonResponse(409, { error: 'Email or username already exists' })
    }

    const hashedPassword = await hashPassword(password)
    const newUser = {
      id: localUsers.length + 1,
      username,
      email,
      password: hashedPassword,
      created_at: new Date().toISOString(),
    }

    localUsers.push(newUser)

    return jsonResponse(201, {
      success: true,
      message: 'User created successfully',
      user: { id: newUser.id, username: newUser.username, email: newUser.email },
    })
  } catch (error) {
    console.error('Signup error:', error)
    return jsonResponse(500, { error: 'Internal server error' })
  }
}

export async function onRequestGet() {
  return jsonResponse(200, { message: 'Use POST to create a user account.' })
}

function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Simple password hashing function
 * In production, use bcrypt or argon2
 */
async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}
