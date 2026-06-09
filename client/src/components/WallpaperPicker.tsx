import { useRef } from 'react';
import { WALLPAPER_PRESETS, useWallpaper, type WallpaperPreset } from '../wallpaper/WallpaperContext';
import { useToast } from './Toast';

/** Gmail-style slide-in wallpaper picker: live preview on click, apply/cancel. */
export function WallpaperPicker() {
  const { active, pickerOpen, closePicker, setPreview, applyPreview } = useWallpaper();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  if (!pickerOpen) return null;

  const sections = [...new Set(WALLPAPER_PRESETS.map((p) => p.section))];

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPreview({ wp: 'wp-custom', image: String(reader.result) });
    reader.readAsDataURL(file);
  }

  return (
    <div className="wp-backdrop open" onClick={(e) => e.target === e.currentTarget && closePicker()}>
      <div className="wp-panel" role="dialog" aria-label="Choose wallpaper">
        <div className="wp-panel-header">
          <span className="wp-panel-title">🎨 Choose Wallpaper</span>
          <button type="button" className="wp-close" aria-label="Close" onClick={closePicker}>✕</button>
        </div>

        <div className="wp-panel-body">
          <p className="wp-hint">Click a wallpaper to preview it instantly. Apply to save.</p>

          {sections.map((section) => (
            <div key={section}>
              <p className="wp-section-title">{section}</p>
              <div className="wp-grid">
                {WALLPAPER_PRESETS.filter((p) => p.section === section).map((p) => (
                  <Swatch
                    key={p.id}
                    preset={p}
                    selected={!active.image && active.wp === p.id}
                    onSelect={() => setPreview({ wp: p.id, image: null })}
                  />
                ))}
              </div>
            </div>
          ))}

          <p className="wp-section-title">🖼 Custom</p>
          <button type="button" className="wp-upload-btn" onClick={() => fileRef.current?.click()}>
            ⬆ Upload an image
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={onUpload} />
          {active.image && (
            <div className={`wp-swatch selected wp-custom-preview`} style={{ marginTop: 10, aspectRatio: '16/9', backgroundImage: `url(${active.image})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
              <div className="wp-swatch-label">Custom image</div>
              <div className="wp-swatch-check">✓</div>
            </div>
          )}
        </div>

        <div className="wp-panel-footer">
          <button type="button" className="wp-cancel-btn" onClick={closePicker}>Cancel</button>
          <button
            type="button"
            className="wp-apply-btn"
            onClick={() => {
              applyPreview();
              toast('Wallpaper applied', 'success');
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

function Swatch({ preset, selected, onSelect }: { preset: WallpaperPreset; selected: boolean; onSelect: () => void }) {
  return (
    <div
      className={`wp-swatch sw-${preset.id.replace(/^wp-/, '')}${selected ? ' selected' : ''}`}
      style={preset.style ? { background: preset.style } : undefined}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}
    >
      <div className="wp-swatch-label">{preset.label}</div>
      <div className="wp-swatch-check">✓</div>
    </div>
  );
}
