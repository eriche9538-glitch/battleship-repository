var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-FjbhoA/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// functions/api/signup.ts
async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const body = await request.json().catch(() => null);
    const { username, email, password } = body || {};
    if (!username || !email || !password) {
      return jsonResponse(400, { error: "Missing required fields" });
    }
    const db = env.DB;
    if (!db) {
      return jsonResponse(500, { error: "Database binding 'DB' is missing." });
    }
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();
    const existingUser = await db.prepare("SELECT id FROM Users WHERE email = ?1 OR username = ?2 LIMIT 1").bind(cleanEmail, cleanUsername).first();
    if (existingUser) {
      return jsonResponse(409, { error: "Email or username already exists" });
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashedPassword = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
    await db.prepare("INSERT INTO Users (username, password, email) VALUES (?, ?, ?)").bind(cleanUsername, hashedPassword, cleanEmail).run();
    const insertedUser = await db.prepare("SELECT last_insert_rowid() AS id").first();
    const id = insertedUser?.id ?? 0;
    return jsonResponse(201, {
      success: true,
      user: { id, username: cleanUsername, email: cleanEmail }
    });
  } catch (error) {
    return jsonResponse(500, { error: "Internal server error", details: error.message });
  }
}
__name(onRequestPost, "onRequestPost");
function jsonResponse(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
__name(jsonResponse, "jsonResponse");

// functions/api/signin.ts
async function onRequestPost2(context) {
  const { request, env } = context;
  try {
    const body = await request.json().catch(() => null);
    const { identifier, password } = body || {};
    if (!identifier || !password) {
      return jsonResponse2(400, { error: "Missing required fields" });
    }
    const db = env.DB;
    if (!db) {
      return jsonResponse2(500, { error: "Database binding 'DB' is missing." });
    }
    const cleanIdentifier = identifier.trim();
    const user = await db.prepare("SELECT id, username, email, password, score FROM Users WHERE lower(email) = lower(?1) OR lower(username) = lower(?2) LIMIT 1").bind(cleanIdentifier, cleanIdentifier).first();
    if (!user) {
      return jsonResponse2(401, { error: "Invalid email/username or password" });
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashedPassword = Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
    if (user.password !== hashedPassword) {
      return jsonResponse2(401, { error: "Invalid email/username or password" });
    }
    return jsonResponse2(200, {
      success: true,
      user: { id: user.id, username: user.username, email: user.email, score: user.score ?? 0 }
    });
  } catch (error) {
    return jsonResponse2(500, { error: "Internal server error", details: error.message });
  }
}
__name(onRequestPost2, "onRequestPost");
function jsonResponse2(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
__name(jsonResponse2, "jsonResponse");

// functions/api/score.ts
async function onRequestPost3(context) {
  const { request, env } = context;
  try {
    const body = await request.json().catch(() => null);
    const { userId } = body || {};
    if (!userId) {
      return jsonResponse3(400, { error: "Missing userId" });
    }
    const db = env.DB;
    if (!db) {
      return jsonResponse3(500, { error: "Database binding 'DB' is missing." });
    }
    await db.prepare("UPDATE Users SET score = score + 1 WHERE id = ?1").bind(userId).run();
    return jsonResponse3(200, { success: true });
  } catch (error) {
    return jsonResponse3(500, { error: "Internal server error", details: error.message });
  }
}
__name(onRequestPost3, "onRequestPost");
function jsonResponse3(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
__name(jsonResponse3, "jsonResponse");

// functions/api/leaderboard.ts
async function onRequestGet(context) {
  const { request, env } = context;
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const db = env.DB;
    if (!db) {
      return jsonResponse4(500, { error: "Database binding 'DB' is missing." });
    }
    const topUsers = await db.prepare("SELECT id, username, score FROM Users ORDER BY COALESCE(score, 0) DESC, lower(username) ASC LIMIT 100").all();
    const entries = (topUsers.results || []).map((user, index) => ({
      id: user.id,
      username: user.username,
      score: user.score ?? 0,
      rank: index + 1
    }));
    let yourEntry = null;
    if (userId) {
      const currentUser = await db.prepare("SELECT id, username, score FROM Users WHERE id = ?1 LIMIT 1").bind(userId).first();
      if (currentUser) {
        const currentScore = currentUser.score ?? 0;
        const userRank = await db.prepare("SELECT COUNT(*) + 1 AS rank FROM Users WHERE COALESCE(score, 0) > ?1 OR (COALESCE(score, 0) = ?1 AND lower(username) < lower(?2))").bind(currentScore, currentUser.username).first();
        const isInTop100 = entries.some((entry) => entry.id === currentUser.id);
        if (!isInTop100) {
          yourEntry = {
            id: currentUser.id,
            username: currentUser.username,
            score: currentScore,
            rank: userRank?.rank ?? entries.length + 1
          };
        }
      }
    }
    return jsonResponse4(200, {
      success: true,
      entries,
      yourEntry
    });
  } catch (error) {
    return jsonResponse4(500, { error: "Internal server error", details: error.message });
  }
}
__name(onRequestGet, "onRequestGet");
function jsonResponse4(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" }
  });
}
__name(jsonResponse4, "jsonResponse");

// src/worker.ts
var worker_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === "/api/signup" && request.method === "POST") {
      const context = { request, env, waitUntil: ctx.waitUntil.bind(ctx) };
      return onRequestPost(context);
    }
    if (url.pathname === "/api/signin" && request.method === "POST") {
      const context = { request, env, waitUntil: ctx.waitUntil.bind(ctx) };
      return onRequestPost2(context);
    }
    if (url.pathname === "/api/score" && request.method === "POST") {
      const context = { request, env, waitUntil: ctx.waitUntil.bind(ctx) };
      return onRequestPost3(context);
    }
    if (url.pathname === "/api/leaderboard" && request.method === "GET") {
      const context = { request, env, waitUntil: ctx.waitUntil.bind(ctx) };
      return onRequestGet(context);
    }
    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request.clone());
      if (assetResponse.status === 404 && request.method === "GET") {
        const fallbackRequest = new Request(new URL("/index.html", request.url), request);
        return env.ASSETS.fetch(fallbackRequest);
      }
      return assetResponse;
    }
    return new Response("Not Found", { status: 404 });
  }
};

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// .wrangler/tmp/bundle-FjbhoA/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default
];
var middleware_insertion_facade_default = worker_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-FjbhoA/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=worker.js.map
