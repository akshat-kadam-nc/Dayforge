import { useEffect, useState } from 'react';
import { useWallpaper } from '../wallpaper/WallpaperContext';
import { PHOTO_URL, isPhotoId } from '../wallpaper/photos';

interface Layer {
  key: string;
  className: string;
  style?: React.CSSProperties;
  isImg: boolean;
}

/** Resolve the active selection to a renderable background layer. */
function toLayer(active: { wp: string; image: string | null }): Layer {
  const photoUrl = isPhotoId(active.wp) ? PHOTO_URL[active.wp] : undefined;
  const imageUrl = active.image ?? photoUrl;
  const isImg = !!imageUrl;
  return {
    key: active.image ? 'custom' : active.wp,
    className: isImg ? 'wallpaper wp-photo' : `wallpaper ${active.wp}`,
    style: isImg
      ? { backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : undefined,
    isImg,
  };
}

/** Fixed background behind the whole app. Reads the live wallpaper selection
 *  (preview while the picker is open, otherwise the applied choice).
 *
 *  Background kinds: custom upload (data URL), photo (`photo:<name>` id), or a
 *  `.wp-*` gradient preset. When the selection changes (e.g. shuffle rotates it)
 *  the incoming layer cross-fades over the outgoing one. Image-based backgrounds
 *  also get a readability scrim so the glass stays legible over busy photos. */
export function WallpaperLayer() {
  const { active } = useWallpaper();
  const next = toLayer(active);
  const [layers, setLayers] = useState<Layer[]>([next]);

  useEffect(() => {
    const top = layers[layers.length - 1];
    if (top.key === next.key) return;
    // Keep the outgoing layer beneath the new one, then prune after the fade.
    setLayers((ls) => [...ls.slice(-1), next]);
    const t = setTimeout(() => setLayers((ls) => ls.slice(-1)), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [next.key]);

  const topIsImg = layers[layers.length - 1].isImg;

  return (
    <>
      {layers.map((l, i) => (
        <div
          key={l.key}
          className={`${l.className}${i === layers.length - 1 && layers.length > 1 ? ' wp-fade-in' : ''}`}
          style={l.style}
          aria-hidden="true"
        />
      ))}
      {topIsImg && <div className="wp-scrim" aria-hidden="true" />}
    </>
  );
}
