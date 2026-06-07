import { useState } from 'react';
import { useToday } from '../../today/useToday';
import { formatClock } from '../../today/format';
import { InterruptModal } from './InterruptModal';

export function TimerStrip() {
  const { state, actions } = useToday();
  const [interrupting, setInterrupting] = useState(false);

  const runIds = Object.keys(state.timer.runs);
  const count = runIds.length;
  const totalSeconds = runIds.reduce((s, id) => s + state.timer.runs[id].elapsedSeconds, 0);

  let label = 'No task running';
  if (count === 1) {
    label = state.tasks.find((t) => t.id === runIds[0])?.title ?? 'Running';
  } else if (count > 1) {
    label = `${count} tasks running`;
  }

  return (
    <>
      <div className="timer-strip">
        <div className={`timer-dot${count > 0 ? '' : ' idle'}`} />
        <span className="timer-lbl">{label}</span>
        <span className="timer-val">{formatClock(totalSeconds)}</span>
        <button type="button" className="interrupt-btn" onClick={() => setInterrupting(true)}>
          ⚡ Interrupt
        </button>
        <button
          type="button"
          className="timer-stop"
          disabled={count === 0}
          onClick={() => actions.pauseAll()}
        >
          ⏸ Pause all
        </button>
      </div>
      {interrupting && <InterruptModal onClose={() => setInterrupting(false)} />}
    </>
  );
}
