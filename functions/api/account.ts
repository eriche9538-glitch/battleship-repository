interface Env {
  DB: D1Database;
}

export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  try {
    const userId = new URL(context.request.url).searchParams.get('userId');

    if (!userId) {
      return jsonResponse(400, { error: 'Missing userId' });
    }

    if (!context.env.DB) {
      return jsonResponse(500, { error: "Database binding 'DB' is missing." });
    }

    const user = await context.env.DB
      .prepare('SELECT id, username, email, score, COALESCE(battle_currency, 0) AS battle_currency FROM Users WHERE id = ?1 LIMIT 1')
      .bind(userId)
      .first<{ id: number; username: string; email: string; score: number; battle_currency: number } | null>();

    if (!user) {
      return jsonResponse(404, { error: 'User not found' });
    }

    return jsonResponse(200, {
      success: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        score: user.score ?? 0,
        battleCurrency: user.battle_currency ?? 0,
      },
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
