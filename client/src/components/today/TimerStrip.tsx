import { useState } from 'react';
import { useToday } from '../../today/useToday';
import { formatClock } from '../../today/format';
import { taskLoggedSeconds } from '../../today/budget';
import { InterruptModal } from './InterruptModal';

/** One strip per concurrently running task, each with its own 1s/sec timer and
 *  controls. An idle strip shows when nothing is running. */
export function TimerStrip() {
  const { state, actions } = useToday();
  const [interrupting, setInterrupting] = useState(false);
  const runIds = Object.keys(state.timer.runs);

  return (
    <>
      <div className="timer-strips">
        {runIds.length === 0 ? (
          <div className="timer-strip">
            <div className="timer-dot idle" />
            <span className="timer-lbl">No task running</span>
            <span className="timer-val">00:00:00</span>
            <button type="button" className="interrupt-btn" onClick={() => setInterrupting(true)}>
              ⚡ Interrupt
            </button>
          </div>
        ) : (
          runIds.map((id) => {
            const task = state.tasks.find((t) => t.id === id);
            const area = task ? state.areas.find((a) => a.id === task.areaId) : undefined;
            // Show total time on the task (prior logged + this run), not just the
            // live run, against the estimate so the allotment is visible inline.
            const secs = task ? taskLoggedSeconds(state, task) : state.timer.runs[id].elapsedSeconds;
            const allottedSecs = (task?.estimateMinutes ?? 0) * 60;
            const over = allottedSecs > 0 && secs > allottedSecs;
            return (
              <div key={id} className="timer-strip">
                <div className="timer-dot" style={area ? { background: area.color } : undefined} />
                <span className="timer-lbl">{task?.title ?? 'Task'}</span>
                <span className={`timer-val${over ? ' over' : ''}`}>
                  {formatClock(secs)}
                  {allottedSecs > 0 && <span className="timer-allot"> / {formatClock(allottedSecs)}</span>}
                </span>
                <button type="button" className="interrupt-btn sm" onClick={() => setInterrupting(true)} title="Log interruption">
                  ⚡
                </button>
                <button type="button" className="timer-pause" onClick={() => actions.pause(id)}>
                  ⏸ Pause
                </button>
                <button type="button" className="timer-stop" onClick={() => actions.stopComplete(id)}>
                  ⏹ Stop &amp; Complete
                </button>
              </div>
            );
          })
        )}
      </div>
      {interrupting && <InterruptModal onClose={() => setInterrupting(false)} />}
    </>
  );
}
