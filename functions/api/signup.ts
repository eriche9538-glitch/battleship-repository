// functions/api/signup.ts

interface Env {
  DB: D1Database;
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;

  try {
    const body: any = await request.json().catch(() => null);
    const { username, email, password } = body || {};

    if (!username || !email || !password) {
      return jsonResponse(400, { error: 'Missing required fields' });
    }

    const db = env.DB;
    if (!db) {
      return jsonResponse(500, { error: "Database binding 'DB' is missing." });
    }

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Check database
    const existingUser = await db
      .prepare('SELECT id FROM users WHERE email = ?1 OR username = ?2 LIMIT 1')
      .bind(cleanEmail, cleanUsername)
      .first<{ id: string } | null>();

    if (existingUser) {
      return jsonResponse(409, { error: 'Email or username already exists' });
    }

    // Hash password using native crypto SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashedPassword = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    await db
      .prepare('INSERT INTO users (id, username, email, password, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(id, cleanUsername, cleanEmail, hashedPassword, createdAt)
      .run();

    return jsonResponse(201, {
      success: true,
      user: { id, username: cleanUsername, email: cleanEmail },
    });

  } catch (error: any) {
    return jsonResponse(500, { error: 'Internal server error', details: error.message });
  }
}

function jsonResponse(status: number, payload: Record<string, any>): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}