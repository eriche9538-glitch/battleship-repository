import http from 'http'

// Simple in-memory storage for development
const users = []

async function hashPassword(password) {
  // For development, use a simple hash
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(JSON.stringify(payload))
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''

    req.on('data', (chunk) => {
      body += chunk.toString()
    })

    req.on('end', () => {
      if (!body) {
        resolve({})
        return
      }

      try {
        resolve(JSON.parse(body))
      } catch (error) {
        reject(new Error('Invalid JSON body'))
      }
    })

    req.on('error', reject)
  })
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host || 'localhost'}`)

  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true })
    return
  }

  if (pathname === '/api/signup' && req.method === 'POST') {
    try {
      const { username, email, password } = await parseBody(req)

      if (!username || !email || !password) {
        sendJson(res, 400, { error: 'Missing required fields' })
        return
      }

      if (password.length < 6) {
        sendJson(res, 400, { error: 'Password must be at least 6 characters' })
        return
      }

      if (!email.includes('@')) {
        sendJson(res, 400, { error: 'Invalid email format' })
        return
      }

      const existingUser = users.find((u) => u.email === email || u.username === username)
      if (existingUser) {
        sendJson(res, 409, { error: 'Email or username already exists' })
        return
      }

      const hashedPassword = await hashPassword(password)
      const newUser = {
        id: users.length + 1,
        username,
        email,
        password: hashedPassword,
        created_at: new Date().toISOString(),
      }

      users.push(newUser)

      sendJson(res, 201, {
        success: true,
        message: 'User created successfully',
        user: { id: newUser.id, username: newUser.username, email: newUser.email },
      })
    } catch (error) {
      console.error('Signup error:', error)
      if (error.message === 'Invalid JSON body') {
        sendJson(res, 400, { error: 'Invalid JSON body' })
        return
      }
      sendJson(res, 500, { error: 'Internal server error' })
    }
  } else if (pathname === '/health' && req.method === 'GET') {
    sendJson(res, 200, { status: 'ok' })
  } else {
    sendJson(res, 404, { error: 'Not found' })
  }
})

const PORT = 3001
server.listen(PORT, () => {
  console.log(`Development API server running on http://localhost:${PORT}`)
})
