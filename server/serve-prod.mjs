// Local-only: serve the built client + API like production (PWA service worker
// active, minified bundle) for reproducing prod-only issues. Gitignored.
process.env.SERVE_CLIENT = 'true';
process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT ?? '4100';
await import('./dist/index.js');
