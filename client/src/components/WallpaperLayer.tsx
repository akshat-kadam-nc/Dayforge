import { useWallpaper } from '../wallpaper/WallpaperContext';
import { PHOTO_URL, isPhotoId } from '../wallpaper/photos';

/** Fixed background behind the whole app. Reads the live wallpaper selection
 *  (preview while the picker is open, otherwise the applied choice).
 *
 *  Three kinds of background:
 *   - custom upload  → data URL in `active.image`
 *   - photo          → `active.wp` is a `photo:<name>` id, resolved to its asset URL
 *   - preset         → a `.wp-*` gradient class
 *
 *  Image-based backgrounds also get a readability scrim so the glass components
 *  stay legible over busy photos; gradient presets render as designed. */
export function WallpaperLayer() {
  const { active } = useWallpaper();

  const photoUrl = isPhotoId(active.wp) ? PHOTO_URL[active.wp] : undefined;
  const imageUrl = active.image ?? photoUrl;

  const className = imageUrl ? 'wallpaper wp-photo' : `wallpaper ${active.wp}`;
  const style = imageUrl
    ? { backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : undefined;

  return (
    <>
      <div className={className} style={style} aria-hidden="true" />
      {imageUrl && <div className="wp-scrim" aria-hidden="true" />}
    </>
  );
}
