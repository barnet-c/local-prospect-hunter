import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster as SonnerToaster } from 'sonner';
import { queryClient } from '@/lib/query-client';
import { AuthProvider, useAuth } from '@/hooks/useAuth';
import { ThemeProvider } from '@/lib/ThemeContext';
import AppLayout from '@/components/AppLayout';
import Login from '@/pages/Login';
import Hunter from '@/pages/Hunter';
import FollowUps from '@/pages/FollowUps';
import Watchlist from '@/pages/Watchlist';
import Dashboard from '@/pages/Dashboard';
import Settings from '@/pages/Settings';
import PageNotFound from '@/pages/PageNotFound';

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="min-h-screen bg-background grid place-items-center">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground animate-pulse">Loading…</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
              <Route element={<RequireAuth><AppLayout /></RequireAuth>}>
                <Route path="/" element={<Hunter />} />
                <Route path="/follow-ups" element={<FollowUps />} />
                <Route path="/watchlist" element={<Watchlist />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<PageNotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <SonnerToaster
            position="top-right"
            richColors
            toastOptions={{ style: { borderRadius: '2px', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' } }}
          />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
