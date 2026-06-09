import type { ReactNode } from 'react';

/**
 * Shared zero-data state for full pages (Team, Goals, …). Sits in a visible
 * glass card so it always reads clearly over any wallpaper — bare text on the
 * background was effectively invisible, which made empty pages look blank.
 */
export function PageEmpty({
  emoji,
  title,
  message,
  action,
}: {
  emoji: string;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="page-empty glass-card">
      <div className="page-empty-emoji">{emoji}</div>
      <h2 className="page-empty-title">{title}</h2>
      <p className="muted page-empty-msg">{message}</p>
      {action}
    </div>
  );
}
