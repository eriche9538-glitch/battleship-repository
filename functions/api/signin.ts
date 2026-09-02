// functions/api/signin.ts

interface Env {
  DB: D1Database;
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;

  try {
    const body: any = await request.json().catch(() => null);
    const { identifier, password } = body || {};

    if (!identifier || !password) {
      return jsonResponse(400, { error: 'Missing required fields' });
    }

    const db = env.DB;
    if (!db) {
      return jsonResponse(500, { error: "Database binding 'DB' is missing." });
    }

    const cleanIdentifier = identifier.trim();

    const user = await db
      .prepare('SELECT id, username, email, password, score, COALESCE(battle_currency, 0) AS battle_currency FROM Users WHERE lower(email) = lower(?1) OR lower(username) = lower(?2) LIMIT 1')
      .bind(cleanIdentifier, cleanIdentifier)
      .first<{ id: number; username: string; email: string; password: string; score: number; battle_currency: number } | null>();

    if (!user) {
      return jsonResponse(401, { error: 'Invalid email/username or password' });
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashedPassword = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    if (user.password !== hashedPassword) {
      return jsonResponse(401, { error: 'Invalid email/username or password' });
    }

    return jsonResponse(200, {
      success: true,
      user: { id: user.id, username: user.username, email: user.email, score: user.score ?? 0, battleCurrency: user.battle_currency ?? 0 },
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
