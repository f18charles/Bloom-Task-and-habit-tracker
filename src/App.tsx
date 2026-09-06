import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, lazy, Suspense } from "react";
import Layout from "./components/Layout.tsx";
import { useAuthStore } from "./store/useAuthStore.ts";
import { useNotifications } from "./hooks/useNotifications.ts";
import { ErrorBoundary } from "./components/ErrorBoundary.tsx";
import ToastContainer from "./components/Toast.tsx";
import { useToastStore } from "./store/useToastStore.ts";

// Route-based code splitting
const Dashboard = lazy(() => import("./pages/Dashboard.tsx"));
const Kanban = lazy(() => import("./pages/Kanban.tsx"));
const Habits = lazy(() => import("./pages/Habits.tsx"));
const Progress = lazy(() => import("./pages/Progress.tsx"));
const Calendar = lazy(() => import("./pages/Calendar.tsx"));
const Settings = lazy(() => import("./pages/Settings.tsx"));
const AuthPage = lazy(() => import("./pages/Auth.tsx"));
const ResetPassword = lazy(() => import("./pages/ResetPassword.tsx"));
const Welcome = lazy(() => import("./pages/Welcome.tsx"));

function PageLoading() {
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <div className="w-8 h-8 rounded-full border-2 border-bloom-pink/20 border-t-bloom-pink animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  
  if (isLoading) return <PageLoading />;
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
      <Suspense fallback={<PageLoading />}>
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
              isLoading ? (
                <PageLoading />
              ) : user ? (
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
      </Suspense>
    </BrowserRouter>
  );
}

