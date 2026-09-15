interface Env {
  DB: D1Database;
}

export async function onRequestGet(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;

  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const currencyMode = url.searchParams.get('mode') === 'currency';
    const eloMode = ['normal-elo', 'blitz-elo'].includes(url.searchParams.get('mode') || '') ? url.searchParams.get('mode') : null;
    const db = env.DB;
    if (!db) {
      return jsonResponse(500, { error: "Database binding 'DB' is missing." });
    }

    const topUsers = currencyMode
      ? await db.prepare('SELECT id, username, COALESCE(battle_currency, 0) AS currency FROM Users ORDER BY COALESCE(battle_currency, 0) DESC, lower(username) ASC LIMIT 100').all<{ id: number; username: string; currency: number }>()
      : eloMode === 'blitz-elo'
        ? await db.prepare('SELECT id, username, COALESCE(blitz_elo, 0) AS elo FROM Users ORDER BY COALESCE(blitz_elo, 0) DESC, lower(username) ASC LIMIT 100').all<{ id: number; username: string; elo: number }>()
        : eloMode === 'normal-elo'
          ? await db.prepare('SELECT id, username, COALESCE(normal_elo, 0) AS elo FROM Users ORDER BY COALESCE(normal_elo, 0) DESC, lower(username) ASC LIMIT 100').all<{ id: number; username: string; elo: number }>()
      : await db.prepare('SELECT id, username, score FROM Users ORDER BY COALESCE(score, 0) DESC, lower(username) ASC LIMIT 100').all<{ id: number; username: string; score: number }>();

    const entries = (topUsers.results || []).map((user, index) => ({
      id: user.id,
      username: user.username,
      ...(currencyMode ? { currency: user.currency ?? 0 } : eloMode ? { elo: user.elo ?? 0 } : { score: user.score ?? 0 }),
      rank: index + 1,
    }));

    let yourEntry = null;

    if (userId) {
      const currentUser = currencyMode
        ? await db.prepare('SELECT id, username, COALESCE(battle_currency, 0) AS currency FROM Users WHERE id = ?1 LIMIT 1').bind(userId).first<{ id: number; username: string; currency: number } | null>()
        : eloMode === 'blitz-elo'
          ? await db.prepare('SELECT id, username, COALESCE(blitz_elo, 0) AS elo FROM Users WHERE id = ?1 LIMIT 1').bind(userId).first<{ id: number; username: string; elo: number } | null>()
          : eloMode === 'normal-elo'
            ? await db.prepare('SELECT id, username, COALESCE(normal_elo, 0) AS elo FROM Users WHERE id = ?1 LIMIT 1').bind(userId).first<{ id: number; username: string; elo: number } | null>()
        : await db.prepare('SELECT id, username, score FROM Users WHERE id = ?1 LIMIT 1').bind(userId).first<{ id: number; username: string; score: number } | null>();

      if (currentUser) {
        const currentScore = currencyMode ? currentUser.currency ?? 0 : eloMode ? currentUser.elo ?? 0 : currentUser.score ?? 0;
        const userRank = await db
          .prepare(currencyMode
            ? 'SELECT COUNT(*) + 1 AS rank FROM Users WHERE COALESCE(battle_currency, 0) > ?1 OR (COALESCE(battle_currency, 0) = ?1 AND lower(username) < lower(?2))'
            : eloMode === 'blitz-elo'
              ? 'SELECT COUNT(*) + 1 AS rank FROM Users WHERE COALESCE(blitz_elo, 0) > ?1 OR (COALESCE(blitz_elo, 0) = ?1 AND lower(username) < lower(?2))'
              : eloMode === 'normal-elo'
                ? 'SELECT COUNT(*) + 1 AS rank FROM Users WHERE COALESCE(normal_elo, 0) > ?1 OR (COALESCE(normal_elo, 0) = ?1 AND lower(username) < lower(?2))'
                : 'SELECT COUNT(*) + 1 AS rank FROM Users WHERE COALESCE(score, 0) > ?1 OR (COALESCE(score, 0) = ?1 AND lower(username) < lower(?2))')
          .bind(currentScore, currentUser.username)
          .first<{ rank: number } | null>();

        const isInTop100 = entries.some((entry) => entry.id === currentUser.id);

        if (!isInTop100) {
          yourEntry = {
            id: currentUser.id,
            username: currentUser.username,
            ...(currencyMode ? { currency: currentScore } : eloMode ? { elo: currentScore } : { score: currentScore }),
            rank: userRank?.rank ?? entries.length + 1,
          };
        }
      }
    }

    return jsonResponse(200, {
      success: true,
      entries,
      yourEntry,
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
