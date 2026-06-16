import { createAvatar, type Style } from '@dicebear/core';
import {
  adventurer,
  avataaars,
  bottts,
  funEmoji,
  lorelei,
  micah,
  notionists,
  personas,
  thumbs,
} from '@dicebear/collection';

// The styles we expose. An avatar is stored as the compact descriptor
// `style:seed`, so we regenerate the SVG on the client and never persist
// a large image. Keep this map in sync with the descriptors below.
const STYLES = {
  adventurer,
  avataaars,
  bottts,
  funEmoji,
  lorelei,
  micah,
  notionists,
  personas,
  thumbs,
} as const;

type StyleName = keyof typeof STYLES;

// Background color choices baked into the avatar SVG. White is the default.
export const AVATAR_BG_OPTIONS: { id: string; label: string }[] = [
  { id: 'ffffff', label: 'White' },
  { id: 'e9d5ff', label: 'Lavender' },
  { id: 'bfdbfe', label: 'Sky' },
  { id: 'bbf7d0', label: 'Mint' },
  { id: 'fef08a', label: 'Sun' },
  { id: 'fecaca', label: 'Blush' },
  { id: 'fed7aa', label: 'Peach' },
  { id: 'e2e8f0', label: 'Slate' },
];

export const DEFAULT_AVATAR_BG = 'ffffff';

// Curated grid shown in the picker. A spread of styles + seeds so the options
// look visibly distinct rather than variations of one face.
export const AVATAR_PRESETS: string[] = [
  'notionists:Forge', 'adventurer:Atlas', 'avataaars:Nova', 'lorelei:Sol',
  'micah:Vega', 'personas:Orion', 'funEmoji:Pixel', 'bottts:Circuit',
  'thumbs:Mint', 'notionists:Slate', 'adventurer:Ember', 'avataaars:Indigo',
  'lorelei:Coral', 'micah:Hazel', 'personas:Onyx', 'funEmoji:Zest',
];

/**
 * Parse a descriptor into its parts. Format is `style:seed` or
 * `style:seed:bg`, where bg is a 6-digit hex (no #). bg defaults to white.
 */
export function parseAvatar(
  descriptor: string | undefined | null,
): { style: StyleName; seed: string; bg: string } | null {
  if (!descriptor) return null;
  const first = descriptor.indexOf(':');
  if (first === -1) return null;
  const style = descriptor.slice(0, first) as StyleName;
  let rest = descriptor.slice(first + 1);
  let bg = DEFAULT_AVATAR_BG;
  // A trailing `:<hex6>` is the background; anything else stays part of the seed.
  const m = rest.match(/^(.*):([0-9a-fA-F]{6})$/);
  if (m) {
    rest = m[1];
    bg = m[2].toLowerCase();
  }
  if (!STYLES[style] || !rest) return null;
  return { style, seed: rest, bg };
}

/** Build a descriptor string from parts. */
export function buildAvatar(style: string, seed: string, bg: string): string {
  return `${style}:${seed}:${bg}`;
}

/** Render a stored avatar descriptor to an inline data URI. */
export function avatarDataUri(descriptor: string | undefined | null): string | null {
  const parsed = parseAvatar(descriptor);
  if (!parsed) return null;
  const styleDef = STYLES[parsed.style] as Style<Record<string, unknown>> | undefined;
  if (!styleDef) return null;
  try {
    return createAvatar(styleDef, {
      seed: parsed.seed,
      backgroundColor: [parsed.bg],
      backgroundType: ['solid'],
    }).toDataUri();
  } catch {
    return null;
  }
}
