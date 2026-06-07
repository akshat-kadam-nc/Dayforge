import { useToday } from '../today/useToday';
import { TodayHeader } from '../components/today/TodayHeader';
import { NudgeRow } from '../components/today/NudgeRow';
import { TimeBudgetCard } from '../components/today/TimeBudgetCard';
import { AllocationRing } from '../components/today/AllocationRing';
import { VentureBlock } from '../components/today/VentureBlock';
import { TaskBuckets } from '../components/today/TaskBuckets';
import { CalendarEventsBlock } from '../components/today/CalendarEventsBlock';
import { InterruptionsBlock } from '../components/today/InterruptionsBlock';
import { CompletedFold } from '../components/today/CompletedFold';
import { GoalsSidebar } from '../components/today/GoalsSidebar';
import { TimerStrip } from '../components/today/TimerStrip';
import { Fab } from '../components/today/Fab';
import { EmptyState } from '../components/today/EmptyState';
import '../styles/today.css';

function Cockpit() {
  const { state, loading } = useToday();
  const todays = state.tasks.filter((t) => t.day === state.day);
  const openTasks = todays.filter((t) => t.status !== 'done');
  const doneCount = todays.length - openTasks.length;
  const hasAreas = state.areas.length > 0;

  return (
    <div className="cockpit">
      <TodayHeader streakDays={12} />

      <div className="cockpit-body">
        <main className="cockpit-main">
          {loading ? (
            <div className="cockpit-loading muted">Loading your day…</div>
          ) : !hasAreas ? (
            <EmptyState />
          ) : (
            <>
              <NudgeRow />
              <TimeBudgetCard />
              <AllocationRing />

              <TaskBuckets which="pending" />

              <div className="tasks-header">
                <span className="section-lbl">Today's Tasks</span>
                <span className="task-count">{openTasks.length} tasks · {doneCount} done</span>
              </div>

              {state.areas.map((area) => (
                <VentureBlock key={area.id} area={area} />
              ))}

              <CalendarEventsBlock />
              <TaskBuckets which="upcoming" />
              <InterruptionsBlock />
              <CompletedFold />
            </>
          )}
          <div style={{ height: 12 }} />
        </main>

        <GoalsSidebar />
      </div>

      <TimerStrip />
      <Fab />
    </div>
  );
}

export function TodayPage() {
  return <Cockpit />;
}
