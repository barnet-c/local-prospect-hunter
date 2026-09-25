import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Crosshair, Mail, Eye, LayoutDashboard, Settings as SettingsIcon, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import ThemeToggle from '@/components/hunter/ThemeToggle';

export const NAV = [
  { label: 'Hunter', to: '/', icon: Crosshair, end: true },
  { label: 'Follow-ups', to: '/follow-ups', icon: Mail },
  { label: 'Watchlist', to: '/watchlist', icon: Eye },
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Settings', to: '/settings', icon: SettingsIcon },
];

function Brand() {
  return (
    <div className="px-5 pt-6 pb-5 border-b border-border">
      <div className="flex items-center gap-2">
        <Crosshair className="h-5 w-5 text-primary" />
        <span className="font-mono text-sm font-semibold uppercase tracking-[0.14em]">Prospect Hunter</span>
      </div>
      <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Local B2B recon</div>
    </div>
  );
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col border-r border-border bg-card/40">
        <Brand />

        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-1">
            {NAV.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 px-3 py-2 rounded-sm font-mono text-xs uppercase tracking-wide transition-colors',
                    isActive ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60',
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <footer className="px-4 py-4 border-t border-border">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] text-muted-foreground truncate">{user?.email}</span>
            <div className="flex items-center gap-1 shrink-0">
              <ThemeToggle />
              <button type="button" onClick={logout} className="p-2 text-muted-foreground hover:text-foreground" title="Sign out">
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </footer>
      </aside>

      {/* Mobile top bar */}
      <header className="md:hidden fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur px-4 h-14">
        <div className="flex items-center gap-2">
          <Crosshair className="h-5 w-5 text-primary" />
          <span className="font-mono text-sm font-semibold uppercase tracking-[0.14em]">Prospect Hunter</span>
        </div>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <button type="button" onClick={() => setMobileOpen((o) => !o)} className="p-2 text-muted-foreground hover:text-foreground">
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <nav className="md:hidden fixed inset-x-0 top-14 z-30 border-b border-border bg-background px-3 py-3">
          <ul className="space-y-1">
            {NAV.map((item) => {
              const active = item.end ? pathname === item.to : pathname.startsWith(item.to);
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-sm font-mono text-xs uppercase tracking-wide',
                      active ? 'bg-primary/15 text-primary' : 'text-muted-foreground',
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                </li>
              );
            })}
            <li>
              <button type="button" onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-sm font-mono text-xs uppercase tracking-wide text-muted-foreground">
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </li>
          </ul>
        </nav>
      )}

      <main className="md:ml-60 pt-20 md:pt-8 px-4 md:px-8 pb-16 max-w-7xl">
        <Outlet />
      </main>
    </div>
  );
}
