import { useState } from 'react';
import { useToday } from '../../today/useToday';
import { AddVentureModal } from './AddVentureModal';
import { TaskFormModal } from './TaskFormModal';

export function Fab() {
  const { state } = useToday();
  const [open, setOpen] = useState(false);
  const [needVenture, setNeedVenture] = useState(false);

  function openAdd() {
    // A task needs a venture; route to venture creation first if there are none.
    if (state.areas.length === 0) setNeedVenture(true);
    else setOpen(true);
  }

  return (
    <>
      <button type="button" className="fab" aria-label="Add task" onClick={openAdd}>
        +
      </button>

      {needVenture && <AddVentureModal onClose={() => setNeedVenture(false)} />}
      {open && <TaskFormModal onClose={() => setOpen(false)} />}
    </>
  );
}
