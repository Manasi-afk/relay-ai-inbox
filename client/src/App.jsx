import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import AuthPage from './pages/Auth.jsx';
import Onboarding from './pages/Onboarding.jsx';
import AppShell from './components/AppShell.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Inbox from './pages/Inbox.jsx';
import Accounts from './pages/Accounts.jsx';
import Portal from './pages/Portal.jsx';
import Landing from './pages/Landing.jsx';
import { EmptyState, ErrorState, Spinner } from './components/ui.jsx';
import { Compass } from 'lucide-react';

function FullPageLoader() {
  return <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--brand)' }}><Spinner size={28} /></div>;
}

/** Signed-in routes. Sends users who haven't finished onboarding to /onboarding. */
function Protected({ children, onboarding = false }) {
  const { token, me, meLoading, meError, refetchMe } = useAuth();
  const loc = useLocation();
  if (!token) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  if (meLoading) return <FullPageLoader />;
  if (meError && !me) return <ErrorState error={meError} onRetry={refetchMe} />;
  if (!onboarding && !me.user.onboarded) return <Navigate to="/onboarding" replace />;
  if (onboarding && me.user.onboarded) return <Navigate to="/app" replace />;
  return children;
}

function PublicOnly({ children }) {
  const { token } = useAuth();
  return token ? <Navigate to="/app" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicOnly><Landing /></PublicOnly>} />
      <Route path="/login" element={<PublicOnly><AuthPage mode="login" /></PublicOnly>} />
      <Route path="/signup" element={<PublicOnly><AuthPage mode="signup" /></PublicOnly>} />
      <Route path="/onboarding" element={<Protected onboarding><Onboarding /></Protected>} />
      <Route path="/app" element={<Protected><AppShell /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="inbox" element={<Inbox />} />
        <Route path="inbox/:segment" element={<Inbox />} />
        <Route path="accounts" element={<Accounts />} />
      </Route>
      <Route path="/c/:token" element={<Portal />} />
      <Route path="*" element={<EmptyState icon={Compass} title="Page not found">The page you’re looking for doesn’t exist. <a href="/app" style={{ color: 'var(--brand)', fontWeight: 600 }}>Go to dashboard</a></EmptyState>} />
    </Routes>
  );
}
