// src/worker.ts
import { onRequestPost as handleSignup } from '../functions/api/signup';
import { onRequestPost as handleSignin } from '../functions/api/signin';
import { onRequestPost as handleScore } from '../functions/api/score';
import { onRequestPost as handleCurrency } from '../functions/api/currency';
import { onRequestGet as handleAccount } from '../functions/api/account';
import { onRequestGet as handleLeaderboard } from '../functions/api/leaderboard';

interface Env {
  DB: D1Database;
  ASSETS: Fetcher; // Binding from your wrangler.toml [assets] section
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // 1. Route API requests to your signup logic
    if (url.pathname === '/api/signup' && request.method === 'POST') {
      // Create a simulated Pages Function context to reuse your existing code
      const context = { request, env, waitUntil: ctx.waitUntil.bind(ctx) } as any;
      return handleSignup(context);
    }

    if (url.pathname === '/api/signin' && request.method === 'POST') {
      const context = { request, env, waitUntil: ctx.waitUntil.bind(ctx) } as any;
      return handleSignin(context);
    }

    if (url.pathname === '/api/score' && request.method === 'POST') {
      const context = { request, env, waitUntil: ctx.waitUntil.bind(ctx) } as any;
      return handleScore(context);
    }

    if (url.pathname === '/api/currency' && request.method === 'POST') {
      const context = { request, env, waitUntil: ctx.waitUntil.bind(ctx) } as any;
      return handleCurrency(context);
    }

    if (url.pathname === '/api/account' && request.method === 'GET') {
      const context = { request, env, waitUntil: ctx.waitUntil.bind(ctx) } as any;
      return handleAccount(context);
    }

    if (url.pathname === '/api/leaderboard' && request.method === 'GET') {
      const context = { request, env, waitUntil: ctx.waitUntil.bind(ctx) } as any;
      return handleLeaderboard(context);
    }

    // 2. Fallback: Serve Vite static assets from the ./dist folder
    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request.clone());
      
      // Handle client-side Single Page Application (SPA) routing
      if (assetResponse.status === 404 && request.method === 'GET') {
        const fallbackRequest = new Request(new URL('/index.html', request.url), request);
        return env.ASSETS.fetch(fallbackRequest);
      }
      
      return assetResponse;
    }

    return new Response("Not Found", { status: 404 });
  }
};