import { useState } from 'react';
import { useToday } from '../today/useToday';
import { todaysTasks } from '../today/budget';
import { TodayHeader } from '../components/today/TodayHeader';
import { NudgeRow } from '../components/today/NudgeRow';
import { TimeBudgetCard } from '../components/today/TimeBudgetCard';
import { AllocationRing } from '../components/today/AllocationRing';
import { TimeboxTimeline } from '../components/today/TimeboxTimeline';
import { VentureBlock } from '../components/today/VentureBlock';
import { TaskBuckets } from '../components/today/TaskBuckets';
import { CalendarEventsBlock } from '../components/today/CalendarEventsBlock';
import { InterruptionsBlock } from '../components/today/InterruptionsBlock';
import { CompletedFold } from '../components/today/CompletedFold';
import { GoalsSidebar } from '../components/today/GoalsSidebar';
import { ChoresCard } from '../components/today/ChoresCard';
import { TimerStrip } from '../components/today/TimerStrip';
import { CelebrationLayer } from '../components/today/CelebrationLayer';
import { Fab } from '../components/today/Fab';
import { EmptyState } from '../components/today/EmptyState';
import { CockpitSkeleton } from '../components/Skeleton';
import '../styles/today.css';

const RAIL_KEY = 'axiom.today.railCollapsed';
const DAYPLAN_KEY = 'axiom.today.dayplanOpen';

function Cockpit() {
  const { state, loading } = useToday();
  const todays = todaysTasks(state).filter((t) => t.kind === 'task');
  const openTasks = todays.filter((t) => t.status !== 'done');
  const doneCount = todays.length - openTasks.length;
  const hasAreas = state.areas.length > 0;

  const [railCollapsed, setRailCollapsed] = useState(
    () => localStorage.getItem(RAIL_KEY) === '1',
  );
  // When the Day plan is open it takes over the right column (in place of the
  // rail) so the task list gets the full left column and there's room to drag.
  const [dayPlanOpen, setDayPlanOpen] = useState(
    () => localStorage.getItem(DAYPLAN_KEY) === '1',
  );
  function toggleRail() {
    setRailCollapsed((v) => {
      const next = !v;
      localStorage.setItem(RAIL_KEY, next ? '1' : '0');
      return next;
    });
  }
  function toggleDayPlan() {
    setDayPlanOpen((v) => {
      const next = !v;
      localStorage.setItem(DAYPLAN_KEY, next ? '1' : '0');
      return next;
    });
  }

  // The right column shows the day-plan panel when open, else the rail (unless
  // the rail is collapsed). When nothing shows, drop to a single column.
  const showDayPlan = hasAreas && dayPlanOpen;
  const showRail = hasAreas && !dayPlanOpen && !railCollapsed;
  const singleCol = !showDayPlan && !showRail;

  return (
    <div className="cockpit">
      <TodayHeader streakDays={state.streak} />

      <div className={`cockpit-body${singleCol ? ' rail-collapsed' : ''}`}>
        <main className={`cockpit-main${!loading && hasAreas ? ' stagger' : ''}`}>
          {loading ? (
            <CockpitSkeleton />
          ) : !hasAreas ? (
            <EmptyState />
          ) : (
            <>
              <NudgeRow />
              <TimeBudgetCard />
              <AllocationRing />
              <TimeboxTimeline variant="bar" open={dayPlanOpen} onToggle={toggleDayPlan} />

              <TaskBuckets which="pending" />

              <div className="tasks-header">
                <span className="section-lbl">Today's Tasks</span>
                <span className="task-count">{openTasks.length} tasks · {doneCount} done</span>
              </div>

              {state.areas.map((area) => (
                <VentureBlock key={area.id} area={area} />
              ))}

              <TaskBuckets which="upcoming" />
              <CompletedFold />
            </>
          )}
          <div style={{ height: 12 }} />
        </main>

        {showDayPlan && (
          <aside className="cockpit-rail cockpit-dayplan">
            <TimeboxTimeline variant="panel" open onToggle={toggleDayPlan} />
          </aside>
        )}

        {showRail && (
          <aside className="cockpit-rail">
            <ChoresCard />
            <GoalsSidebar />
            <CalendarEventsBlock />
            <InterruptionsBlock />
          </aside>
        )}

        {hasAreas && !dayPlanOpen && (
          <button
            type="button"
            className={`rail-toggle${railCollapsed ? ' collapsed' : ''}`}
            onClick={toggleRail}
            title={railCollapsed ? 'Show side panel' : 'Hide side panel'}
            aria-label={railCollapsed ? 'Show side panel' : 'Hide side panel'}
          >
            {railCollapsed ? '‹' : '›'}
          </button>
        )}
      </div>

      <TimerStrip />
      <CelebrationLayer />
      <Fab />
    </div>
  );
}

export function TodayPage() {
  return <Cockpit />;
}
