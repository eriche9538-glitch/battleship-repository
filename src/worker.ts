// src/worker.ts
import { onRequestPost as handleSignup } from '../functions/api/signup';

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