export type CalendarView = 'day' | 'week' | 'month';

const VIEWS: { id: CalendarView; label: string }[] = [
  { id: 'day', label: 'Day' },
  { id: 'week', label: 'Week' },
  { id: 'month', label: 'Month' },
];

export function ViewToggle({ view, onChange }: { view: CalendarView; onChange: (v: CalendarView) => void }) {
  return (
    <div className="view-toggle">
      {VIEWS.map((v) => (
        <button
          key={v.id}
          className={view === v.id ? 'active' : ''}
          onClick={() => onChange(v.id)}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}
