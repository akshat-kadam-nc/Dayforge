import { useEffect, useRef, useState } from 'react';
import { useWallpaper, type WallpaperSelection } from '../wallpaper/WallpaperContext';
import { PHOTO_URL, isPhotoId } from '../wallpaper/photos';

interface LayerStyle {
  className: string;
  style?: React.CSSProperties;
  isImg: boolean;
}

/** The image URL behind a selection, if it resolves to one (custom upload or photo). */
function imageUrlOf(active: WallpaperSelection): string | undefined {
  return active.image ?? (isPhotoId(active.wp) ? PHOTO_URL[active.wp] : undefined);
}

/** Resolve the active selection to a renderable background layer. */
function toLayer(active: WallpaperSelection): LayerStyle {
  const imageUrl = imageUrlOf(active);
  const isImg = !!imageUrl;
  return {
    className: isImg ? 'wallpaper wp-photo' : `wallpaper ${active.wp}`,
    style: isImg
      ? { backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : undefined,
    isImg,
  };
}

/** A stable key for a selection so we only cross-fade on a real change. */
function keyOf(active: WallpaperSelection): string {
  return active.image ? 'custom' : active.wp;
}

const EMPTY: LayerStyle = { className: 'wallpaper', isImg: false };

/** Fixed background behind the whole app. Reads the live wallpaper selection
 *  (preview while the picker is open, otherwise the applied choice).
 *
 *  Cross-fade mechanism mirrors the login gateway: two persistent layers (slot
 *  A / slot B) that each transition opacity. On a change the incoming image is
 *  preloaded, written into the hidden slot, then that slot is flipped active so
 *  CSS dissolves it in over 2.4s while the outgoing slot dissolves out. Both
 *  layers stay mounted, so their images stay decoded and swapping back is
 *  instant — no pop, no re-decode flash. */
export function WallpaperLayer() {
  const { active } = useWallpaper();
  const target = toLayer(active);
  const targetKey = keyOf(active);

  // Two persistent slots. Slot 0 starts with the current wallpaper; slot 1 empty.
  const [slots, setSlots] = useState<LayerStyle[]>([target, EMPTY]);
  const [activeIdx, setActiveIdx] = useState(0);
  const lastKey = useRef(targetKey);

  useEffect(() => {
    if (targetKey === lastKey.current) return;
    lastKey.current = targetKey;
    const inactive = activeIdx === 0 ? 1 : 0;
    let cancelled = false;

    const reveal = () => {
      if (cancelled) return;
      // Write the incoming wallpaper into the hidden slot...
      setSlots((s) => {
        const next = [...s];
        next[inactive] = target;
        return next;
      });
      // ...then, after it has painted at opacity 0, flip which slot is active so
      // the opacity transition (CSS) actually runs instead of snapping.
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (!cancelled) setActiveIdx(inactive);
        }),
      );
    };

    const url = imageUrlOf(active);
    if (url) {
      // Preload so the incoming photo is decoded before the fade begins.
      const img = new Image();
      img.onload = reveal;
      img.onerror = reveal;
      img.src = url;
      // Safety net if the load event never fires (cache quirks).
      const fallback = setTimeout(reveal, 1500);
      return () => {
        cancelled = true;
        clearTimeout(fallback);
      };
    }
    reveal();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetKey]);

  const topIsImg = slots[activeIdx].isImg;

  return (
    <>
      {slots.map((l, i) => (
        <div
          key={i}
          className={`${l.className} wp-layer${i === activeIdx ? ' is-active' : ''}`}
          style={l.style}
          aria-hidden="true"
        />
      ))}
      {topIsImg && <div className="wp-scrim" aria-hidden="true" />}
    </>
  );
}
