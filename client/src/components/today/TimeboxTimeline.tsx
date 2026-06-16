import { useEffect, useRef, useState } from 'react';
import { useToday } from '../../today/useToday';
import { formatMinutes } from '../../today/format';
import { allocatedMinutes, effectiveAvailable, overflowMinutes } from '../../today/budget';
import {
  SNAP_MIN,
  boxDuration,
  conflictIds,
  dayWindow,
  findFreeSlot,
  fmtTimeOfDay,
  pendingPlaceable,
  scheduledBoxes,
  snap,
  timedEvents,
  toHHMM,
  unscheduledTasks,
} from '../../today/timebox';
import type { Task } from '../../today/types';

const HOUR_PX = 52;
const PPM = HOUR_PX / 60; // pixels per minute

interface DragState {
  taskId: string;
  mode: 'move' | 'resize';
  startClientY: number;
  origStart: number;
  origEst: number;
  curStart: number;
  curEst: number;
  moved: boolean;
}

/**
 * The Day plan. Two surfaces driven by `variant`:
 *  - `bar`: a slim summary row in the main column with an open/close toggle.
 *  - `panel`: the full vertical timeline, rendered in the right column (in place
 *    of the rail) so tasks have the whole left column and there's room to drag.
 * `open` + `onToggle` are owned by the parent so it can swap the right column.
 */
export function TimeboxTimeline({
  variant,
  open,
  onToggle,
}: {
  variant: 'bar' | 'panel';
  open: boolean;
  onToggle: () => void;
}) {
  const { state, actions } = useToday();

  const boxes = scheduledBoxes(state);
  const events = timedEvents(state);
  const tray = unscheduledTasks(state);
  const pending = pendingPlaceable(state);
  const toPlace = tray.length + pending.length;
  const win = dayWindow(state);
  const conflicts = conflictIds(state);

  const [drag, setDrag] = useState<DragState | null>(null);

  // Refs so the drag listeners always read the current window/actions/drag
  // without re-subscribing on every render. Commits happen outside any setState
  // updater (an updater must stay pure — dispatching an action inside one warns).
  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const winRef = useRef(win);
  winRef.current = win;
  const dragRef = useRef(drag);
  dragRef.current = drag;

  useEffect(() => {
    if (!drag) return;
    function onMove(e: PointerEvent) {
      const d = dragRef.current;
      if (!d) return;
      const w = winRef.current;
      const deltaMin = (e.clientY - d.startClientY) / PPM;
      const next =
        d.mode === 'move'
          ? { ...d, curStart: Math.max(w.startMin, Math.min(w.endMin - d.origEst, snap(d.origStart + deltaMin))), moved: true }
          : { ...d, curEst: Math.max(SNAP_MIN, Math.min(w.endMin - d.origStart, snap(d.origEst + deltaMin))), moved: true };
      dragRef.current = next;
      setDrag(next);
    }
    function onUp() {
      const d = dragRef.current;
      if (d && d.moved) {
        const a = actionsRef.current;
        if (d.mode === 'move' && d.curStart !== d.origStart) a.scheduleTask(d.taskId, toHHMM(d.curStart));
        else if (d.mode === 'resize' && d.curEst !== d.origEst) a.setTaskEstimate(d.taskId, d.curEst);
      }
      dragRef.current = null;
      setDrag(null);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [drag?.taskId, drag?.mode]);

  const empty = boxes.length === 0 && tray.length === 0 && events.length === 0 && pending.length === 0;

  // Drop a task into the first free slot. A pending (earlier-day) task is pulled
  // onto today first so it renders as a box instead of staying off-plate.
  function placeInFreeSlot(t: Task, fromPending: boolean) {
    if (fromPending) actions.moveToToday(t.id);
    actions.scheduleTask(t.id, toHHMM(findFreeSlot(state, boxDuration(t), win)));
  }

  const planned = allocatedMinutes(state);
  const avail = effectiveAvailable(state);
  const over = overflowMinutes(state);

  // Slim bar in the main column: summary + a toggle that opens the panel.
  if (variant === 'bar') {
    if (empty) return null;
    return (
      <section className={`timebox-bar${open ? ' active' : ''}`}>
        <span className="timebox-title">🗓 Day plan</span>
        <span className="timebox-summary">
          {boxes.length} scheduled · {toPlace} to place
          {conflicts.size > 0 && <span className="timebox-conflict">⚠ {conflicts.size} overlap</span>}
        </span>
        <span className={`timebox-budget${over > 0 ? ' over' : ''}`}>
          {formatMinutes(planned)} / {formatMinutes(avail)}
          {over > 0 && <strong> · over {formatMinutes(over)}</strong>}
        </span>
        <button type="button" className="timebox-open" onClick={onToggle}>
          {open ? 'Close ✕' : 'Open ▸'}
        </button>
      </section>
    );
  }

  // Panel: the full timeline in the right column.
  function startDrag(e: React.PointerEvent, taskId: string, startMin: number, est: number, mode: 'move' | 'resize') {
    e.preventDefault();
    e.stopPropagation();
    setDrag({ taskId, mode, startClientY: e.clientY, origStart: startMin, origEst: est, curStart: startMin, curEst: est, moved: false });
  }

  const areaColor = (areaId: string) => state.areas.find((a) => a.id === areaId)?.color ?? '#8b5cf6';
  const trackHeight = (win.endMin - win.startMin) * PPM;
  const hours: number[] = [];
  for (let h = win.startMin; h <= win.endMin; h += 60) hours.push(h);

  return (
    <section className="timebox timebox-panel">
      <div className="timebox-head">
        <span className="timebox-title">🗓 Day plan</span>
        <span className={`timebox-budget${over > 0 ? ' over' : ''}`}>
          {formatMinutes(planned)} / {formatMinutes(avail)}
          {over > 0 && <strong> · over {formatMinutes(over)}</strong>}
        </span>
        <button type="button" className="timebox-collapse" onClick={onToggle} title="Close day plan">
          ✕
        </button>
      </div>

      <div className="timebox-panel-sub">
        {boxes.length} scheduled · {toPlace} to place
        {conflicts.size > 0 && <span className="timebox-conflict">⚠ {conflicts.size} overlap</span>}
      </div>

      {empty ? (
        <p className="muted timebox-empty">Nothing to plan yet.</p>
      ) : (
        <>
          {toPlace > 0 && (
            <div className="timebox-tray">
              <span className="timebox-tray-lbl">Unscheduled</span>
              {tray.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="timebox-chip"
                  style={{ ['--chip-color' as string]: areaColor(t.areaId) }}
                  title="Click to drop into the first free slot"
                  onClick={() => placeInFreeSlot(t, false)}
                >
                  <span className="timebox-chip-dot" />
                  <span className="timebox-chip-title">{t.title}</span>
                  <span className="timebox-chip-est">{formatMinutes(boxDuration(t))}</span>
                </button>
              ))}
              {pending.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="timebox-chip pending"
                  style={{ ['--chip-color' as string]: areaColor(t.areaId) }}
                  title="Pending — click to pull onto today and drop into the first free slot"
                  onClick={() => placeInFreeSlot(t, true)}
                >
                  <span className="timebox-chip-dot" />
                  <span className="timebox-chip-title">📌 {t.title}</span>
                  <span className="timebox-chip-est">{formatMinutes(boxDuration(t))}</span>
                </button>
              ))}
            </div>
          )}

          <div className="timebox-grid">
            <div className="timebox-gutter" style={{ height: trackHeight }}>
              {hours.map((h) => (
                <span key={h} className="tb-hour-label" style={{ top: (h - win.startMin) * PPM }}>
                  {fmtTimeOfDay(h)}
                </span>
              ))}
            </div>

            <div className="timebox-track" style={{ height: trackHeight }}>
              {hours.map((h) => (
                <div key={h} className="tb-hour-line" style={{ top: (h - win.startMin) * PPM }} />
              ))}

              {events.map((ev) => (
                <div
                  key={ev.id}
                  className="tb-event"
                  style={{
                    top: (ev.startMin - win.startMin) * PPM,
                    height: (ev.endMin - ev.startMin) * PPM,
                    ['--ev-color' as string]: ev.color,
                  }}
                >
                  <span className="tb-event-title">{ev.title}</span>
                  <span className="tb-event-time">{fmtTimeOfDay(ev.startMin)}</span>
                </div>
              ))}

              {boxes.map((box) => {
                const dragging = drag?.taskId === box.task.id;
                const startMin = dragging && drag.mode === 'move' ? drag.curStart : box.startMin;
                const estMin = dragging && drag.mode === 'resize' ? drag.curEst : boxDuration(box.task);
                const conflict = conflicts.has(box.task.id);
                const compact = estMin <= 30;
                return (
                  <div
                    key={box.task.id}
                    className={`tb-box${conflict ? ' conflict' : ''}${dragging ? ' dragging' : ''}${compact ? ' compact' : ''}`}
                    title={`${box.task.title} · ${fmtTimeOfDay(startMin)}–${fmtTimeOfDay(startMin + estMin)}`}
                    style={{
                      top: (startMin - win.startMin) * PPM,
                      height: estMin * PPM,
                      ['--box-color' as string]: areaColor(box.task.areaId),
                    }}
                    onPointerDown={(e) => startDrag(e, box.task.id, box.startMin, boxDuration(box.task), 'move')}
                  >
                    <div className="tb-box-main">
                      <span className="tb-box-time">
                        {fmtTimeOfDay(startMin)}–{fmtTimeOfDay(startMin + estMin)}
                      </span>
                      <span className="tb-box-title">{box.task.title}</span>
                    </div>
                    <button
                      type="button"
                      className="tb-box-x"
                      title="Unschedule"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => actions.scheduleTask(box.task.id, null)}
                    >
                      ✕
                    </button>
                    <span
                      className="tb-resize"
                      title="Drag to resize"
                      onPointerDown={(e) => startDrag(e, box.task.id, box.startMin, boxDuration(box.task), 'resize')}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
