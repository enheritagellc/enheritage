import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import { Shell } from '@/components/layout/Shell';
import { Spinner } from '@enheritage/ui';

const DashboardPage = lazy(() => import('@/routes/index'));
const InterviewPage = lazy(() => import('@/routes/interview/index'));
const BiographyPage = lazy(() => import('@/routes/biography/index'));
const FamilyTreePage = lazy(() => import('@/routes/family-tree/index'));
const SettingsPage = lazy(() => import('@/routes/settings/index'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <Spinner size="lg" />
    </div>
  );
}

interface ProtectedRouteProps {
  children: React.ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
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
    loginWithRedirect({
      appState: { returnTo: location.pathname },
    });
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
            <Shell>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route index element={<DashboardPage />} />
                  <Route path="interview/:id" element={<InterviewPage />} />
                  <Route path="biography/:id" element={<BiographyPage />} />
                  <Route path="family-tree/:id" element={<FamilyTreePage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </Shell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
