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
import Welcome from "./pages/Welcome.tsx";
import { useAuthStore } from "./store/useAuthStore.ts";
import { useNotifications } from "./hooks/useNotifications.ts";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import ToastContainer from "./components/Toast.tsx";
import { useToastStore } from "./store/useToastStore.ts";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  
  if (isLoading) return null;
  if (!user) return <Navigate to="/welcome" />;
  
  return (
    <ErrorBoundary>
      <Layout>{children}</Layout>
    </ErrorBoundary>
  );
}

export default function App() {
  const { checkAuth, user, isLoading } = useAuthStore();
  useNotifications(); // Request permissions

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Prevent default console logging of unhandled rejections
      if (typeof event.preventDefault === "function") {
        event.preventDefault();
      }
      
      const reason = event.reason;
      if (!reason) return;

      const message = typeof reason === "string" 
        ? reason 
        : reason?.message || reason?.response?.data?.error;

      if (message && typeof message === "string" && !message.includes("canceled")) {
        useToastStore.getState().addToast(message, "error");
      }
    };

    const handleError = (event: ErrorEvent) => {
      if (event.message) {
        useToastStore.getState().addToast(event.message, "error");
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/welcome" element={<Welcome />} />
        <Route 
          path="/auth" 
          element={user ? <Navigate to="/" /> : <AuthPage />} 
        />
        <Route 
          path="/reset-password" 
          element={<ResetPassword />} 
        />
        
        <Route 
          path="/" 
          element={
            isLoading ? null : user ? (
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            ) : (
              <Welcome />
            )
          } 
        />
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

