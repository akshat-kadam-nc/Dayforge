import { Placeholder } from '../components/Placeholder';

export function CalendarPage() {
  return (
    <Placeholder title="Calendar" emoji="🗓️">
      <p className="muted">
        Day / Week / Month toggle. Month is a GCal-style grid synced across multiple Google
        accounts, with per-day allocation bars and overflow flags. See <code>mockups/month.html</code>.
      </p>
    </Placeholder>
  );
}
