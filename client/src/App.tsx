import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { AppShell } from './components/AppShell';
import { TodayProvider } from './today/useToday';
import { LoginPage } from './pages/LoginPage';
import { TodayPage } from './pages/TodayPage';
import { CalendarPage } from './pages/CalendarPage';
import { GoalsPage } from './pages/GoalsPage';
import { TeamPage } from './pages/TeamPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="boot">Loading AXIOM…</div>;
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
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
    </TodayProvider>
  );
}
