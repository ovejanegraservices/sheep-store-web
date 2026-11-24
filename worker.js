const GAME_IDS = [
  "run-sheep",
  "sheep-doom",
  "sheep-pac",
  "pvz",
  "gta-sa",
  "fnaf1",
  "fnaf2",
  "fnaf3",
  "fnaf4",
];

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });

async function getRatings(database) {
  const result = await database
    .prepare("SELECT game_id, total_rating, vote_count FROM game_ratings")
    .all();
  const rows = new Map(result.results.map((row) => [row.game_id, row]));
  const ratings = Object.fromEntries(GAME_IDS.map((gameId) => {
    const row = rows.get(gameId);
    const votes = row ? Number(row.vote_count) : 0;
    const average = votes > 0 ? Number(row.total_rating) / votes : null;
    return [gameId, {
      average,
      percentage: average === null ? null : Math.round(average * 20),
      votes,
    }];
  }));
  return { ratings };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api/ratings") return env.ASSETS.fetch(request);

    if (request.method !== "GET" && request.method !== "POST") {
      return jsonResponse({ error: "Método no permitido." }, 405);
    }

    const origin = request.headers.get("Origin");
    if (origin && origin !== url.origin) {
      return jsonResponse({ error: "Origen no permitido." }, 403);
    }

    try {
      if (request.method === "GET") return jsonResponse(await getRatings(env.DB));

      if (!request.headers.get("Content-Type")?.includes("application/json")) {
        return jsonResponse({ error: "Se requiere contenido JSON." }, 415);
      }
      const body = await request.text();
      if (body.length > 256) return jsonResponse({ error: "Solicitud demasiado grande." }, 413);

      let vote;
      try {
        vote = JSON.parse(body);
      } catch {
        return jsonResponse({ error: "JSON inválido." }, 400);
      }

      if (
        !vote ||
        !GAME_IDS.includes(vote.gameId) ||
        typeof vote.rating !== "number" ||
        !Number.isFinite(vote.rating) ||
        vote.rating < 0.5 ||
        vote.rating > 5 ||
        !Number.isInteger(vote.rating * 2)
      ) {
        return jsonResponse({ error: "La puntuación debe ser de 0,5 a 5 estrellas." }, 400);
      }

      const update = await env.DB
        .prepare("UPDATE game_ratings SET total_rating = total_rating + ?, vote_count = vote_count + 1 WHERE game_id = ?")
        .bind(vote.rating, vote.gameId)
        .run();
      if (!update.meta || update.meta.changes !== 1) {
        return jsonResponse({ error: "No se encontró el juego." }, 404);
      }
      return jsonResponse(await getRatings(env.DB));
    } catch (error) {
      console.error("No se pudo procesar la API de valoraciones.", error);
      return jsonResponse({ error: "No se pudieron cargar o guardar las valoraciones." }, 500);
    }
  },
};
