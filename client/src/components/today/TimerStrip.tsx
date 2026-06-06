import { useState } from 'react';
import { useToday } from '../../today/useToday';
import { formatClock } from '../../today/format';
import { InterruptModal } from './InterruptModal';

export function TimerStrip() {
  const { state, actions } = useToday();
  const [interrupting, setInterrupting] = useState(false);

  const active = state.timer.activeTaskId
    ? state.tasks.find((t) => t.id === state.timer.activeTaskId)
    : undefined;

  return (
    <>
      <div className="timer-strip">
        <div className={`timer-dot${active ? '' : ' idle'}`} />
        <span className="timer-lbl">{active ? active.title : 'No task running'}</span>
        <span className="timer-val">{formatClock(state.timer.elapsedSeconds)}</span>
        <button type="button" className="interrupt-btn" onClick={() => setInterrupting(true)}>
          ⚡ Interrupt
        </button>
        <button
          type="button"
          className="timer-stop"
          disabled={!active}
          onClick={() => actions.stopTimer()}
        >
          ■ Stop
        </button>
      </div>
      {interrupting && <InterruptModal onClose={() => setInterrupting(false)} />}
    </>
  );
}
