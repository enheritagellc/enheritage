import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, NavLink, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Spinner } from '@enheritage/ui';

const UsersPage = lazy(() => import('@/routes/users/index'));
const InterviewsPage = lazy(() => import('@/routes/interviews/index'));
const BiographiesPage = lazy(() => import('@/routes/biographies/index'));
const KeepsakesPage = lazy(() => import('@/routes/keepsakes/index'));
const AnalyticsPage = lazy(() => import('@/routes/analytics/index'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Spinner size="lg" />
    </div>
  );
}

const NAV_LINKS = [
  { to: '/users', label: 'Users' },
  { to: '/interviews', label: 'Interviews' },
  { to: '/biographies', label: 'Biographies' },
  { to: '/keepsakes', label: 'Keepsakes' },
  { to: '/analytics', label: 'Analytics' },
];

function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth0();

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col">
      {/* Top nav */}
      <header className="bg-[#0D1D35] text-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="font-semibold text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded bg-[#C8973A] inline-flex items-center justify-center text-xs font-bold">E</span>
            Admin
          </span>
          <nav className="flex items-center gap-1" aria-label="Admin navigation">
            {NAV_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  [
                    'px-3 py-1.5 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-[#2B5BA8] text-white font-medium'
                      : 'text-white/70 hover:text-white hover:bg-white/10',
                  ].join(' ')
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
        {user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/70">{user.email}</span>
            <button
              type="button"
              onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    loginWithRedirect({ appState: { returnTo: location.pathname } });
    return null;
  }

  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AdminShell>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route index element={<Navigate to="/users" replace />} />
                  <Route path="users" element={<UsersPage />} />
                  <Route path="interviews" element={<InterviewsPage />} />
                  <Route path="biographies" element={<BiographiesPage />} />
                  <Route path="keepsakes" element={<KeepsakesPage />} />
                  <Route path="analytics" element={<AnalyticsPage />} />
                  <Route path="*" element={<Navigate to="/users" replace />} />
                </Routes>
              </Suspense>
            </AdminShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
