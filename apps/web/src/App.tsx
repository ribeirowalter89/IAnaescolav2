import { lazy, Suspense, useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { api, clearAuthToken } from "./services/api";
import type { Guardian } from "./types";

const AuthPage = lazy(() => import("./pages/AuthPage").then((m) => ({ default: m.AuthPage })));
const DashboardPage = lazy(() => import("./pages/DashboardPage").then((m) => ({ default: m.DashboardPage })));
const StudyPage = lazy(() => import("./pages/StudyPage").then((m) => ({ default: m.StudyPage })));
const HistoryPage = lazy(() => import("./pages/HistoryPage").then((m) => ({ default: m.HistoryPage })));

function PrivateRoute({ children, guardian }: { children: JSX.Element; guardian: Guardian | null }) {
  if (!guardian) {
    return <Navigate to="/auth" replace />;
  }
  return children;
}

export function App() {
  const [guardian, setGuardian] = useState<Guardian | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/auth/me")
      .then((res) => setGuardian(res.data.guardian))
      .catch(() => {
        clearAuthToken();
        setGuardian(null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="centered">Carregando...</div>;

  return (
    <Suspense fallback={<div className="centered">Carregando interface...</div>}>
      <Routes>
        <Route path="/auth" element={<AuthPage onAuth={setGuardian} />} />
        <Route
          path="/"
          element={
            <PrivateRoute guardian={guardian}>
              <DashboardPage guardian={guardian!} />
            </PrivateRoute>
          }
        />
        <Route
          path="/study/:childId"
          element={
            <PrivateRoute guardian={guardian}>
              <StudyPage guardian={guardian!} />
            </PrivateRoute>
          }
        />
        <Route
          path="/history/:childId"
          element={
            <PrivateRoute guardian={guardian}>
              <HistoryPage guardian={guardian!} />
            </PrivateRoute>
          }
        />
        <Route path="*" element={<Navigate to={guardian ? "/" : "/auth"} replace />} />
      </Routes>
    </Suspense>
  );
}