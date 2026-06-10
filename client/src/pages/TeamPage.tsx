import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { apiTeamRepo, localTeamRepo, type TeamRepo } from '../team/repo';
import type { DelegationInput, PersonInput } from '../team/api';
import {
  DELEGATION_STATUSES,
  STATUS_COLOR,
  STATUS_LABEL,
  type Delegation,
  type DelegationStatus,
  type Person,
} from '../team/types';
import { AssignModal } from '../components/team/AssignModal';
import { PersonModal } from '../components/team/PersonModal';
import { useToast } from '../components/Toast';
import { PageEmpty } from '../components/PageEmpty';
import '../styles/team.css';

type ViewMode = 'person' | 'status';
type Filter = 'all' | 'overdue' | 'blocked' | 'week';

/** Local midnight today, for due/follow-up comparisons. */
function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function initial(name: string): string {
  return (name.trim()[0] ?? '?').toUpperCase();
}

/** Short due label: "Due today", "Due in 3d", "3d overdue". */
function dueLabel(iso?: string): { text: string; overdue: boolean } | null {
  if (!iso) return null;
  const due = new Date(iso);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - startOfToday()) / 86400000);
  if (days === 0) return { text: 'Due today', overdue: false };
  if (days < 0) return { text: `${-days}d overdue`, overdue: true };
  if (days === 1) return { text: 'Due tomorrow', overdue: false };
  return { text: `Due in ${days}d`, overdue: false };
}

function isOpen(d: Delegation): boolean {
  return d.status !== 'done';
}
function isOverdue(d: Delegation): boolean {
  if (!isOpen(d) || !d.dueAt) return false;
  const due = new Date(d.dueAt);
  due.setHours(0, 0, 0, 0);
  return due.getTime() < startOfToday();
}
/** Follow-up is due if its date is today or earlier and the work is still open. */
function followUpDue(d: Delegation): 'today' | 'overdue' | null {
  if (!isOpen(d) || !d.followUpAt) return null;
  const fu = new Date(d.followUpAt);
  fu.setHours(0, 0, 0, 0);
  const diff = fu.getTime() - startOfToday();
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  return null;
}
function dueThisWeek(d: Delegation): boolean {
  if (!isOpen(d) || !d.dueAt) return false;
  const due = new Date(d.dueAt);
  due.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - startOfToday()) / 86400000);
  return days >= 0 && days <= 7;
}

export function TeamPage() {
  const { isGuest } = useAuth();
  const { toast } = useToast();
  const repo: TeamRepo = useMemo(() => (isGuest ? localTeamRepo : apiTeamRepo), [isGuest]);

  const [people, setPeople] = useState<Person[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('person');
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [assignFor, setAssignFor] = useState<{ personId?: string; editing?: Delegation } | null>(null);
  const [personModal, setPersonModal] = useState<{ editing?: Person } | true | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    repo
      .load()
      .then((d) => {
        if (cancelled) return;
        setPeople(d.people);
        setDelegations(d.delegations);
        setSelectedId((prev) => prev ?? d.people[0]?.id ?? null);
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [repo]);

  // ---- per-person rollups ----
  const byPerson = useMemo(() => {
    const map: Record<string, { open: number; fu: number; alert: boolean }> = {};
    for (const p of people) map[p.id] = { open: 0, fu: 0, alert: false };
    for (const d of delegations) {
      const m = map[d.personId];
      if (!m) continue;
      if (isOpen(d)) m.open += 1;
      if (followUpDue(d)) m.fu += 1;
      if (isOverdue(d) || (isOpen(d) && d.status === 'blocked')) m.alert = true;
    }
    return map;
  }, [people, delegations]);

  // People sorted by attention: alert first, then follow-ups, then open count.
  const sortedPeople = useMemo(() => {
    return [...people].sort((a, b) => {
      const ma = byPerson[a.id] ?? { open: 0, fu: 0, alert: false };
      const mb = byPerson[b.id] ?? { open: 0, fu: 0, alert: false };
      return (
        Number(mb.alert) - Number(ma.alert) || mb.fu - ma.fu || mb.open - ma.open || a.name.localeCompare(b.name)
      );
    });
  }, [people, byPerson]);

  const followUps = useMemo(
    () => delegations.filter((d) => followUpDue(d) !== null),
    [delegations],
  );

  const counts = useMemo(() => {
    let overdue = 0;
    let blocked = 0;
    for (const d of delegations) {
      if (isOverdue(d)) overdue += 1;
      if (isOpen(d) && d.status === 'blocked') blocked += 1;
    }
    return { overdue, blocked };
  }, [delegations]);

  const matchesFilter = (d: Delegation): boolean => {
    if (query && !d.title.toLowerCase().includes(query.toLowerCase())) return false;
    if (filter === 'overdue') return isOverdue(d);
    if (filter === 'blocked') return isOpen(d) && d.status === 'blocked';
    if (filter === 'week') return dueThisWeek(d);
    return true;
  };

  const selected = people.find((p) => p.id === selectedId) ?? null;
  const personName = (id: string) => people.find((p) => p.id === id)?.name ?? 'Unknown';
  const personColor = (id: string) => people.find((p) => p.id === id)?.color ?? '#7c3aed';

  // ---- mutations (optimistic) ----
  async function setStatus(d: Delegation, status: DelegationStatus) {
    setDelegations((prev) => prev.map((x) => (x.id === d.id ? { ...x, status } : x)));
    try {
      await repo.updateDelegation(d.id, { status });
    } catch {
      setDelegations((prev) => prev.map((x) => (x.id === d.id ? { ...x, status: d.status } : x)));
    }
  }
  async function removeDelegation(d: Delegation) {
    setDelegations((prev) => prev.filter((x) => x.id !== d.id));
    try {
      await repo.deleteDelegation(d.id);
      toast('Delegation removed', 'info');
    } catch {
      setDelegations((prev) => [...prev, d]);
      toast('Could not remove delegation', 'error');
    }
  }
  async function saveAssign(editing: Delegation | undefined, input: DelegationInput) {
    if (editing) {
      const updated = await repo.updateDelegation(editing.id, input);
      setDelegations((prev) => prev.map((x) => (x.id === editing.id ? updated : x)));
      toast('Delegation updated', 'success');
    } else {
      const created = await repo.createDelegation(input);
      setDelegations((prev) => [...prev, created]);
      toast('Task delegated', 'success');
    }
  }
  async function removePerson(person: Person) {
    const prevPeople = people;
    const prevDelegations = delegations;
    setPeople((ps) => ps.filter((p) => p.id !== person.id));
    setDelegations((ds) => ds.filter((d) => d.personId !== person.id));
    setSelectedId((cur) => (cur === person.id ? prevPeople.find((p) => p.id !== person.id)?.id ?? null : cur));
    try {
      await repo.deletePerson(person.id);
      toast(`${person.name} removed`, 'info');
    } catch {
      setPeople(prevPeople);
      setDelegations(prevDelegations);
      toast('Could not remove report', 'error');
    }
  }
  async function savePerson(editing: Person | undefined, input: PersonInput) {
    if (editing) {
      const updated = await repo.updatePerson(editing.id, input);
      setPeople((prev) => prev.map((x) => (x.id === editing.id ? updated : x)));
      toast('Report updated', 'success');
    } else {
      const created = await repo.createPerson(input);
      setPeople((prev) => [...prev, created]);
      setSelectedId(created.id);
      toast(`${created.name} added`, 'success');
    }
  }

  const selectedDelegations = selected
    ? delegations.filter((d) => d.personId === selected.id && matchesFilter(d))
    : [];
  const selStats = selected
    ? (['pending', 'in_progress', 'blocked'] as DelegationStatus[]).map((s) => ({
        status: s,
        n: delegations.filter((d) => d.personId === selected.id && d.status === s).length,
      }))
    : [];

  return (
    <div className="team">
      <header className="team-head">
        <div className="team-title">👥 Team &amp; Delegation</div>
        <button className="team-add-person" type="button" onClick={() => setPersonModal(true)}>
          ＋ Add report
        </button>
      </header>

      {followUps.length > 0 && (
        <div className="fu-strip">
          <span className="fu-strip-title">⏰ Follow-ups due</span>
          <div className="fu-pills">
            {followUps.map((d) => (
              <button
                key={d.id}
                type="button"
                className={`fu-pill${followUpDue(d) === 'overdue' ? ' overdue' : ''}`}
                onClick={() => {
                  setView('person');
                  setSelectedId(d.personId);
                }}
              >
                <span className="fu-ava" style={{ background: personColor(d.personId) }}>
                  {initial(personName(d.personId))}
                </span>
                {personName(d.personId).split(' ')[0]} — {d.title}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="team-controls">
        <div className="mode-toggle">
          <button className={view === 'person' ? 'active' : ''} onClick={() => setView('person')} type="button">
            By Person
          </button>
          <button className={view === 'status' ? 'active' : ''} onClick={() => setView('status')} type="button">
            By Status
          </button>
        </div>
        <div className="filter-chips">
          <button className={`chip${filter === 'all' ? ' active' : ''}`} onClick={() => setFilter('all')} type="button">
            All
          </button>
          <button
            className={`chip alert${filter === 'overdue' ? ' active' : ''}`}
            onClick={() => setFilter('overdue')}
            type="button"
          >
            Overdue · {counts.overdue}
          </button>
          <button className={`chip${filter === 'blocked' ? ' active' : ''}`} onClick={() => setFilter('blocked')} type="button">
            Blocked · {counts.blocked}
          </button>
          <button className={`chip${filter === 'week' ? ' active' : ''}`} onClick={() => setFilter('week')} type="button">
            Due this week
          </button>
        </div>
        <input
          className="team-search"
          placeholder="🔍 Search tasks…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="team-loading muted">Loading your team…</div>
      ) : people.length === 0 ? (
        <PageEmpty
          emoji="👥"
          title="No reports yet"
          message="Add the people you delegate work to, then assign and track tasks across your ventures here."
          action={
            <button className="btn" type="button" onClick={() => setPersonModal(true)}>
              ＋ Add your first report
            </button>
          }
        />
      ) : view === 'person' ? (
        <div className="team-split">
          <div className="people-rail">
            <div className="rail-title">
              {people.length} report{people.length === 1 ? '' : 's'} · sorted by attention
            </div>
            {sortedPeople.map((p) => {
              const m = byPerson[p.id] ?? { open: 0, fu: 0, alert: false };
              return (
                <button
                  key={p.id}
                  type="button"
                  className={`person${p.id === selectedId ? ' selected' : ''}`}
                  onClick={() => setSelectedId(p.id)}
                >
                  <span className="person-ava" style={{ background: p.color }}>
                    {initial(p.name)}
                    {m.alert && <span className="person-dot" style={{ background: STATUS_COLOR.blocked }} />}
                  </span>
                  <span className="person-info">
                    <span className="person-name">{p.name}</span>
                    <span className="person-role">{p.role}</span>
                  </span>
                  <span className="person-counts">
                    <span className="count-open">{m.open} open</span>
                    <span className={`count-fu${m.fu === 0 ? ' none' : ''}`}>{m.fu === 0 ? '—' : `${m.fu} FU`}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {selected && (
            <div className="detail">
              <div className="detail-head">
                <span className="detail-ava" style={{ background: selected.color }}>
                  {initial(selected.name)}
                </span>
                <div className="detail-id">
                  <div className="detail-name">{selected.name}</div>
                  <div className="detail-role">{selected.role}</div>
                </div>
                <div className="detail-stats">
                  {selStats.map((s) => (
                    <div className="dstat" key={s.status}>
                      <div className="dstat-val" style={{ color: STATUS_COLOR[s.status] }}>
                        {s.n}
                      </div>
                      <div className="dstat-lbl">{STATUS_LABEL[s.status]}</div>
                    </div>
                  ))}
                </div>
                <button className="assign-btn" type="button" onClick={() => setAssignFor({ personId: selected.id })}>
                  ＋ Assign work
                </button>
                <button
                  className="detail-edit"
                  type="button"
                  title="Edit report"
                  onClick={() => setPersonModal({ editing: selected })}
                >
                  ✎
                </button>
              </div>

              <div className="deleg-list">
                {selectedDelegations.length === 0 ? (
                  <p className="muted deleg-empty">No work matches here. Assign something or clear the filter.</p>
                ) : (
                  selectedDelegations.map((d) => (
                    <DelegItem
                      key={d.id}
                      d={d}
                      onStatus={(s) => setStatus(d, s)}
                      onEdit={() => setAssignFor({ personId: d.personId, editing: d })}
                      onDelete={() => removeDelegation(d)}
                    />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="status-board">
          {DELEGATION_STATUSES.map((s) => {
            const items = delegations.filter((d) => d.status === s && matchesFilter(d));
            return (
              <div className="status-col" key={s}>
                <div className="status-col-head" style={{ color: STATUS_COLOR[s] }}>
                  <span className="status-dot" style={{ background: STATUS_COLOR[s] }} />
                  {STATUS_LABEL[s]} · {items.length}
                </div>
                <div className="status-col-list">
                  {items.map((d) => (
                    <DelegItem
                      key={d.id}
                      d={d}
                      person={{ name: personName(d.personId), color: personColor(d.personId) }}
                      onStatus={(ns) => setStatus(d, ns)}
                      onEdit={() => setAssignFor({ personId: d.personId, editing: d })}
                      onDelete={() => removeDelegation(d)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {assignFor && (
        <AssignModal
          people={people}
          defaultPersonId={assignFor.personId}
          editing={assignFor.editing}
          onClose={() => setAssignFor(null)}
          onSave={saveAssign}
        />
      )}
      {personModal && (
        <PersonModal
          editing={personModal === true ? undefined : personModal.editing}
          onClose={() => setPersonModal(null)}
          onSave={savePerson}
          onDelete={removePerson}
        />
      )}
    </div>
  );
}

// ---- delegation row (shared by both views) ----

function DelegItem({
  d,
  person,
  onStatus,
  onEdit,
  onDelete,
}: {
  d: Delegation;
  person?: { name: string; color: string };
  onStatus: (s: DelegationStatus) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const due = dueLabel(d.dueAt);
  const fu = followUpDue(d);
  return (
    <div className="deleg-item">
      <span className="deleg-status" style={{ background: STATUS_COLOR[d.status] }} />
      <div className="deleg-info">
        <div className="deleg-name">{d.title}</div>
        <div className="deleg-meta">
          {person && (
            <span className="deleg-person" style={{ color: person.color }}>
              {person.name}
            </span>
          )}
          {d.ventureLabel && (
            <span
              className="deleg-ctx"
              style={{ background: `${d.ventureColor}22`, color: d.ventureColor }}
            >
              {d.ventureLabel}
            </span>
          )}
          {d.recurrence ? (
            <span className="deleg-recur">🔁 {d.recurrence}</span>
          ) : (
            due && <span className={`deleg-date${due.overdue ? ' overdue' : ''}`}>{due.text}</span>
          )}
        </div>
      </div>
      {fu && <span className={`fu-flag${fu === 'overdue' ? ' overdue' : ''}`}>⏰ FU {fu}</span>}
      <select
        className="status-select"
        value={d.status}
        onChange={(e) => onStatus(e.target.value as DelegationStatus)}
        style={{ color: STATUS_COLOR[d.status], borderColor: `${STATUS_COLOR[d.status]}55` }}
      >
        {DELEGATION_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <button className="deleg-edit" type="button" title="Edit" onClick={onEdit}>
        ✎
      </button>
      <button className="deleg-del" type="button" title="Remove" onClick={onDelete}>
        ✕
      </button>
    </div>
  );
}
