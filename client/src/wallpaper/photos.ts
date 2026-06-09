// Photo wallpapers. Every image dropped in src/assets/wallpapers is bundled and
// becomes a selectable in-app wallpaper — no manifest to maintain.
const modules = import.meta.glob('../assets/wallpapers/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  query: '?url',
  import: 'default',
});

export interface PhotoWallpaper {
  /** Stable id persisted to localStorage, e.g. "photo:dayforge-wallpaper-1". */
  id: string;
  /** Hashed asset URL (changes across builds — never persist this). */
  url: string;
  label: string;
}

function prettify(file: string): string {
  return file
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

export const PHOTO_WALLPAPERS: PhotoWallpaper[] = Object.entries(modules)
  .map(([path, url]) => {
    const file = path.split('/').pop()!.replace(/\.[^.]+$/, '');
    return { id: `photo:${file}`, url: url as string, label: prettify(file) };
  })
  .sort((a, b) =>
    a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' }),
  );

/** id -> url, for O(1) resolution in the wallpaper layer. */
export const PHOTO_URL: Record<string, string> = Object.fromEntries(
  PHOTO_WALLPAPERS.map((p) => [p.id, p.url]),
);

export const isPhotoId = (wp: string): boolean => wp.startsWith('photo:');
