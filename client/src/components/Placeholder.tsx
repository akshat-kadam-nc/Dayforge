import type { ReactNode } from 'react';

export function Placeholder({
  title,
  emoji,
  children,
}: {
  title: string;
  emoji: string;
  children?: ReactNode;
}) {
  return (
    <section className="page">
      <header className="page-head">
        <span className="page-emoji">{emoji}</span>
        <h1>{title}</h1>
      </header>
      <div className="glass-card">{children}</div>
    </section>
  );
}
