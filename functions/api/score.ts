interface Env {
  DB: D1Database;
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;

  try {
    const body: any = await request.json().catch(() => null);
    const { userId, currencyDelta = 0, eloDelta = 0, eloMode = 'normal' } = body || {};

    if (!userId) {
      return jsonResponse(400, { error: 'Missing userId' });
    }

    const db = env.DB;
    if (!db) {
      return jsonResponse(500, { error: "Database binding 'DB' is missing." });
    }

    const parsedCurrencyDelta = Number(currencyDelta);
    if (!Number.isFinite(parsedCurrencyDelta)) {
      return jsonResponse(400, { error: 'Invalid currencyDelta' });
    }

    const parsedEloDelta = Number(eloDelta);
    if (!Number.isFinite(parsedEloDelta) || !['normal', 'blitz'].includes(eloMode)) {
      return jsonResponse(400, { error: 'Invalid ELO update' });
    }

    const eloColumn = eloMode === 'blitz' ? 'blitz_elo' : 'normal_elo';

    await db
      .prepare(`UPDATE Users SET score = score + 1, ${eloColumn} = ${eloColumn} + ?2, battle_currency = MAX(0, COALESCE(battle_currency, 0) + ?3) WHERE id = ?1`)
      .bind(userId, parsedEloDelta, parsedCurrencyDelta)
      .run();

    return jsonResponse(200, { success: true });
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
