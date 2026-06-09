import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { PHOTO_URL, isPhotoId } from './photos';

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
}

const Ctx = createContext<WallpaperCtx | null>(null);

export function WallpaperProvider({ children }: { children: ReactNode }) {
  const [applied, setApplied] = useState<WallpaperSelection>(() => ({
    wp: resolveWp(localStorage.getItem(WP_KEY) || DEFAULT_WP),
    image: localStorage.getItem(WP_IMG_KEY) || null,
  }));
  const [preview, setPreviewState] = useState<WallpaperSelection | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);

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
    }),
    [applied, preview, pickerOpen],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallpaper() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWallpaper must be used within WallpaperProvider');
  return ctx;
}
