# In-app wallpapers

Every image in this folder is auto-discovered (via `import.meta.glob` in
`client/src/wallpaper/photos.ts`) and shown as a selectable wallpaper in the
in-app picker (🖼 Photos section). No manifest, no code change — drop a file in
and it appears.

Guidelines:
- Formats: `jpg`, `jpeg`, `png`, `webp`, `avif`.
- Keep each under ~500 KB. Convert PNG/JPG to WebP (q ~82) before committing —
  the repo has `sharp` available:

  ```js
  // from repo root: node -e "..."  (see git history of the login folder)
  const sharp = require('sharp');
  await sharp(src).webp({ quality: 82 }).toFile(out);
  ```

- Filenames become the persisted id (`photo:<filename-without-ext>`) and a
  prettified label, so keep them stable and descriptive.

This is separate from `client/src/assets/login/` (the login-screen backdrop set).
