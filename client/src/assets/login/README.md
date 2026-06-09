# Login background wallpapers

Drop your login-screen background images **in this folder**. They are picked up
automatically (via Vite `import.meta.glob`) and one is chosen at random each time
the login screen loads. No code changes or manifest edits needed.

- Supported formats: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`
- Recommended: landscape, at least 1920×1080, optimized/compressed (these ship in
  the bundle, so keep each image reasonably sized — ideally under ~500 KB).
- After adding files: in dev the change is hot-reloaded; for production run
  `npm run build --workspace client` (or the normal deploy) so they're bundled.

The login card sits on a frosted-glass panel over a dark gradient scrim, so
images stay legible regardless of how light or busy they are.
