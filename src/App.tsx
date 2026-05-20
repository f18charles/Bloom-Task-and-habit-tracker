import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import Layout from "./components/Layout.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Kanban from "./pages/Kanban.tsx";
import Habits from "./pages/Habits.tsx";
import Progress from "./pages/Progress.tsx";
import Calendar from "./pages/Calendar.tsx";
import Settings from "./pages/Settings.tsx";
import AuthPage from "./pages/Auth.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
import { useAuthStore } from "./store/useAuthStore.ts";
import { useNotifications } from "./hooks/useNotifications.ts";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import ToastContainer from "./components/Toast.tsx";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  
  if (isLoading) return null;
  if (!user) return <Navigate to="/auth" />;
  
  return (
    <ErrorBoundary>
      <Layout>{children}</Layout>
    </ErrorBoundary>
  );
}

export default function App() {
  const { checkAuth, user } = useAuthStore();
  useNotifications(); // Request permissions

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route 
          path="/auth" 
          element={user ? <Navigate to="/" /> : <AuthPage />} 
        />
        <Route 
          path="/reset-password" 
          element={<ResetPassword />} 
        />
        
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/kanban" element={<ProtectedRoute><Kanban /></ProtectedRoute>} />
        <Route path="/habits" element={<ProtectedRoute><Habits /></ProtectedRoute>} />
        <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}

