import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { PHOTO_URL, PHOTO_WALLPAPERS, isPhotoId } from './photos';

export interface WallpaperPreset {
  id: string;
  label: string;
  section: string;
  /** Inline background when there's no dedicated CSS class. */
  style?: string;
}

/** Preset catalogue, mirroring the today-v4 mockup picker. */
export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  { id: 'wp-poke-dusk', label: 'Pokémon Dusk', section: '🎮 Gaming & Anime' },
  { id: 'wp-dbz', label: 'Super Saiyan', section: '🎮 Gaming & Anime' },
  { id: 'wp-midnight', label: 'Midnight Route', section: '🌌 Atmospheric' },
  { id: 'wp-ocean', label: 'Ocean Calm', section: '🌌 Atmospheric' },
  { id: 'wp-cherry', label: 'Cherry Blossom', section: '🌸 Light & Soft' },
  { id: 'wp-mint', label: 'Mint Fresh', section: '🌸 Light & Soft' },
  { id: 'wp-grape', label: 'Deep Grape', section: '🎨 Solid & Minimal' },
  { id: 'wp-forest', label: 'Forest', section: '🎨 Solid & Minimal' },
  { id: 'wp-slate', label: 'Slate', section: '🎨 Solid & Minimal' },
];

/** Fresh-user default: a calm photo. Falls back to a gradient if it's missing. */
const DEFAULT_WP = 'photo:dayforge-wallpaper-10';
const FALLBACK_WP = 'wp-poke-dusk';
const WP_KEY = 'axiom_wp';
const WP_IMG_KEY = 'axiom_wp_image';
const WP_SHUFFLE_KEY = 'axiom_wp_shuffle';
const WP_INTERVAL_KEY = 'axiom_wp_interval';

/** Selectable shuffle cadences (ms). Default is a calm 60s so it isn't
 *  distracting while working. */
export const SHUFFLE_INTERVALS: { ms: number; label: string }[] = [
  { ms: 10_000, label: '10 seconds' },
  { ms: 30_000, label: '30 seconds' },
  { ms: 60_000, label: '60 seconds' },
  { ms: 300_000, label: '5 minutes' },
  { ms: 600_000, label: '10 minutes' },
  { ms: 900_000, label: '15 minutes' },
  { ms: 1_800_000, label: '30 minutes' },
  { ms: 3_600_000, label: '60 minutes' },
];
const DEFAULT_SHUFFLE_MS = 60_000;

function readInterval(): number {
  const raw = Number(localStorage.getItem(WP_INTERVAL_KEY));
  return SHUFFLE_INTERVALS.some((o) => o.ms === raw) ? raw : DEFAULT_SHUFFLE_MS;
}

/** Resolve a stored wp id to something renderable: a missing photo (e.g. its
 *  file was removed) degrades to the gradient fallback instead of a blank bg. */
function resolveWp(wp: string): string {
  if (isPhotoId(wp) && !PHOTO_URL[wp]) return FALLBACK_WP;
  return wp;
}

export interface WallpaperSelection {
  /** Preset id; ignored when `image` is set. */
  wp: string;
  /** Custom uploaded image as a data URL, or null for a preset. */
  image: string | null;
}

interface WallpaperCtx {
  /** What the layer should currently render (preview while picking, else applied). */
  active: WallpaperSelection;
  applied: WallpaperSelection;
  preview: WallpaperSelection | null;
  pickerOpen: boolean;
  openPicker: () => void;
  closePicker: () => void;
  setPreview: (sel: WallpaperSelection) => void;
  applyPreview: () => void;
  /** Auto-rotate through the photo wallpapers on a timer. */
  shuffle: boolean;
  setShuffle: (on: boolean) => void;
  /** How often shuffle rotates, in ms (one of SHUFFLE_INTERVALS). */
  shuffleMs: number;
  setShuffleMs: (ms: number) => void;
}

const Ctx = createContext<WallpaperCtx | null>(null);

export function WallpaperProvider({ children }: { children: ReactNode }) {
  const [applied, setApplied] = useState<WallpaperSelection>(() => ({
    wp: resolveWp(localStorage.getItem(WP_KEY) || DEFAULT_WP),
    image: localStorage.getItem(WP_IMG_KEY) || null,
  }));
  const [preview, setPreviewState] = useState<WallpaperSelection | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [shuffle, setShuffleState] = useState(() => localStorage.getItem(WP_SHUFFLE_KEY) === '1');
  const [shuffleMs, setShuffleMsState] = useState<number>(readInterval);

  function setShuffleMs(ms: number) {
    try {
      localStorage.setItem(WP_INTERVAL_KEY, String(ms));
    } catch {
      // non-fatal
    }
    setShuffleMsState(ms);
  }

  function setShuffle(on: boolean) {
    try {
      localStorage.setItem(WP_SHUFFLE_KEY, on ? '1' : '0');
    } catch {
      // non-fatal
    }
    setShuffleState(on);
    // Turning shuffle off restores the user's last explicitly-chosen wallpaper.
    if (!on) {
      setApplied({
        wp: resolveWp(localStorage.getItem(WP_KEY) || DEFAULT_WP),
        image: localStorage.getItem(WP_IMG_KEY) || null,
      });
    }
  }

  // While shuffle is on, rotate through the photo wallpapers without overwriting
  // the saved choice (so it returns on toggle-off). Needs at least two photos.
  useEffect(() => {
    if (!shuffle || PHOTO_WALLPAPERS.length < 2) return;
    const ids = PHOTO_WALLPAPERS.map((p) => p.id);
    const id = setInterval(() => {
      setApplied((cur) => {
        const next = ids[(ids.indexOf(cur.wp) + 1) % ids.length];
        return { wp: next, image: null };
      });
    }, shuffleMs);
    return () => clearInterval(id);
  }, [shuffle, shuffleMs]);

  const value = useMemo<WallpaperCtx>(
    () => ({
      active: preview ?? applied,
      applied,
      preview,
      pickerOpen,
      openPicker: () => setPickerOpen(true),
      closePicker: () => {
        setPreviewState(null);
        setPickerOpen(false);
      },
      setPreview: (sel) => setPreviewState(sel),
      applyPreview: () => {
        const sel = preview ?? applied;
        setApplied(sel);
        try {
          localStorage.setItem(WP_KEY, sel.wp);
          if (sel.image) localStorage.setItem(WP_IMG_KEY, sel.image);
          else localStorage.removeItem(WP_IMG_KEY);
        } catch {
          // Custom image can exceed the localStorage quota; selection still applies for the session.
        }
        setPreviewState(null);
        setPickerOpen(false);
      },
      shuffle,
      setShuffle,
      shuffleMs,
      setShuffleMs,
    }),
    [applied, preview, pickerOpen, shuffle, shuffleMs],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallpaper() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWallpaper must be used within WallpaperProvider');
  return ctx;
}
