interface Env {
  DB: D1Database;
}

export async function onRequestPost(context: { request: Request; env: Env }): Promise<Response> {
  const { request, env } = context;

  try {
    const body: any = await request.json().catch(() => null);
    const { userId } = body || {};

    if (!userId) {
      return jsonResponse(400, { error: 'Missing userId' });
    }

    const db = env.DB;
    if (!db) {
      return jsonResponse(500, { error: "Database binding 'DB' is missing." });
    }

    await db
      .prepare('UPDATE Users SET score = score + 1 WHERE id = ?1')
      .bind(userId)
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
