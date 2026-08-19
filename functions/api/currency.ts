interface Env {
  DB: D1Database;
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  try {
    const body: any = await context.request.json().catch(() => null);
    const { userId, currencyDelta } = body || {};
    const parsedCurrencyDelta = Number(currencyDelta);

    if (!userId || !Number.isFinite(parsedCurrencyDelta)) {
      return jsonResponse(400, { error: 'Missing userId or invalid currencyDelta' });
    }

    if (!context.env.DB) {
      return jsonResponse(500, { error: "Database binding 'DB' is missing." });
    }

    await context.env.DB
      .prepare('UPDATE Users SET battle_currency = MAX(0, COALESCE(battle_currency, 0) + ?2) WHERE id = ?1')
      .bind(userId, parsedCurrencyDelta)
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
