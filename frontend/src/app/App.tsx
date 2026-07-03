/**
 * App.tsx — route-based code splitting via React.lazy (S7 / ADR-007)
 * Each route is a separate chunk, reducing initial bundle size.
 */
import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/features/auth/AuthContext";
import { ProtectedRoute } from "@/features/auth/ProtectedRoute";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

// ── Lazy chunks (route-based code splitting) ───────────────────────────────
const AuthPage = lazy(() =>
  import("@/pages/AuthPage").then((m) => ({ default: m.AuthPage }))
);
const DashboardPage = lazy(() =>
  import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage }))
);
const GenerationProgressPage = lazy(() =>
  import("@/pages/GenerationProgressPage").then((m) => ({ default: m.GenerationProgressPage }))
);
const BlueprintPage = lazy(() =>
  import("@/pages/BlueprintPage").then((m) => ({ default: m.BlueprintPage }))
);
const ExportCenterPage = lazy(() =>
  import("@/pages/ExportCenterPage").then((m) => ({ default: m.ExportCenterPage }))
);
const PublicSharePage = lazy(() =>
  import("@/pages/PublicSharePage").then((m) => ({ default: m.PublicSharePage }))
);

// ── Suspense fallback ──────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
      <div className="w-6 h-6 border-2 border-[var(--accent-teal)] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public */}
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/share/:token" element={<PublicSharePage />} />

              {/* Protected */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/project/:projectId/generating"
                element={
                  <ProtectedRoute>
                    <GenerationProgressPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/project/:projectId"
                element={
                  <ProtectedRoute>
                    <BlueprintPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/project/:projectId/export"
                element={
                  <ProtectedRoute>
                    <ExportCenterPage />
                  </ProtectedRoute>
                }
              />

              {/* Default */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
