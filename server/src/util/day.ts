/** Day key in YYYY-MM-DD. Used to scope tasks, logs, and interruptions to a day. */
export function dayKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Validate/normalise a day key, falling back to today when absent or malformed. */
export function normaliseDay(input: unknown): string {
  return typeof input === 'string' && DAY_RE.test(input) ? input : dayKey();
}
