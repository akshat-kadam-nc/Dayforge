import { useWallpaper } from '../wallpaper/WallpaperContext';

/** Fixed background behind the whole app. Reads the live wallpaper selection
 *  (preview while the picker is open, otherwise the applied choice). */
export function WallpaperLayer() {
  const { active } = useWallpaper();
  const className = active.image ? 'wallpaper wp-custom' : `wallpaper ${active.wp}`;
  const style = active.image
    ? { backgroundImage: `url(${active.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : undefined;
  return <div className={className} style={style} aria-hidden="true" />;
}
