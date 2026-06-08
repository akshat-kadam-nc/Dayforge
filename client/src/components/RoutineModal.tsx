import { useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useToday } from '../today/useToday';
import { saveRoutine, type Routine } from '../profile/api';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_DOW = [1, 2, 3, 4, 5, 6, 0]; // map column → JS getDay()

function fmtAvail(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Routine setup: carve sleep / commute / work out of the 24h day. Used for
 *  first-run onboarding and later edits from Settings. */
export function RoutineModal({ mode, onClose }: { mode: 'onboard' | 'edit'; onClose: () => void }) {
  const { user, updateUser } = useAuth();
  const { actions } = useToday();
  // Only seed from the saved routine once onboarded; before that it's all zeros,
  // so fall back to sensible defaults.
  const r = user?.onboarded ? user?.routine : null;
  const [sleepH, setSleepH] = useState(r ? r.sleepMinutes / 60 : 7.5);
  const [commute, setCommute] = useState(r ? r.commuteMinutes : 0);
  const [workH, setWorkH] = useState(r ? r.workMinutes / 60 : 8);
  const [workdays, setWorkdays] = useState<number[]>(r?.workdays?.length ? r.workdays : [1, 2, 3, 4, 5]);
  const [busy, setBusy] = useState(false);

  const sleepMin = Math.round(sleepH * 60);
  const workMin = Math.round(workH * 60);
  // Preview a typical working day's free time.
  const isWorkPreview = workdays.length > 0;
  const freeWork = Math.max(0, 1440 - sleepMin - commute - (isWorkPreview ? workMin : 0));
  const freeOff = Math.max(0, 1440 - sleepMin - commute);

  function toggleDay(dow: number) {
    setWorkdays((prev) => (prev.includes(dow) ? prev.filter((d) => d !== dow) : [...prev, dow]));
  }

  async function submit() {
    if (busy) return;
    setBusy(true);
    const routine: Routine = {
      sleepMinutes: sleepMin,
      commuteMinutes: commute,
      workMinutes: workMin,
      workdays,
    };
    try {
      const res = await saveRoutine(routine);
      updateUser({ onboarded: res.onboarded, routine: res.routine });
      actions.reload(); // pull fresh availableMinutes into the cockpit
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={mode === 'edit' ? onClose : undefined}>
      <div className="modal-card routine-card" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">{mode === 'onboard' ? '👋 Set up your day' : '⏰ Daily routine'}</h2>
        <p className="muted routine-intro">
          You start with a full 24h. Tell us your routine so Dayforge can show your real free time.
        </p>

        <label>
          Sleep (hours / day)
          <input type="number" min={0} max={16} step={0.5} value={sleepH}
            onChange={(e) => setSleepH(Math.max(0, Number(e.target.value)))} />
        </label>
        <label>
          Commute (minutes / day)
          <input type="number" min={0} max={600} step={5} value={commute}
            onChange={(e) => setCommute(Math.max(0, Number(e.target.value)))} />
        </label>
        <label>
          Work (hours / working day)
          <input type="number" min={0} max={16} step={0.5} value={workH}
            onChange={(e) => setWorkH(Math.max(0, Number(e.target.value)))} />
        </label>
        <label>
          Working days
          <div className="day-row">
            {DAYS.map((d, i) => {
              const dow = DAY_DOW[i];
              const on = workdays.includes(dow);
              return (
                <button key={d} type="button" className={`day-pill${on ? ' on' : ''}`} onClick={() => toggleDay(dow)}>
                  {d}
                </button>
              );
            })}
          </div>
        </label>

        <div className="routine-preview">
          <div><strong>{fmtAvail(freeWork)}</strong> free on a working day</div>
          <div><strong>{fmtAvail(freeOff)}</strong> free on an off day</div>
        </div>

        <div className="modal-actions">
          {mode === 'edit' && <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>}
          {mode === 'onboard' && <button type="button" className="btn-ghost" onClick={onClose}>Skip for now</button>}
          <button type="button" className="btn" onClick={submit} disabled={busy}>
            {busy ? '…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
