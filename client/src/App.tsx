import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { AppShell } from './components/AppShell';
import { TodayProvider } from './today/useToday';
import { WallpaperProvider } from './wallpaper/WallpaperContext';
import { RoutineModal } from './components/RoutineModal';
import { LoginPage } from './pages/LoginPage';
import { TodayPage } from './pages/TodayPage';
import { CalendarPage } from './pages/CalendarPage';
import { GoalsPage } from './pages/GoalsPage';
import { TeamPage } from './pages/TeamPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="boot">Loading Dayforge…</div>;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <WallpaperProvider>
      <TodayProvider>
        <AppShell>
          <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/goals" element={<GoalsPage />} />
          <Route path="/team" element={<TeamPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppShell>
        <OnboardingGate />
      </TodayProvider>
    </WallpaperProvider>
  );
}

/** Shows routine setup once for a real account that hasn't onboarded yet. */
function OnboardingGate() {
  const { user, isGuest } = useAuth();
  const [skipped, setSkipped] = useState(false);
  if (isGuest || !user || user.onboarded || skipped) return null;
  return <RoutineModal mode="onboard" onClose={() => setSkipped(true)} />;
}
