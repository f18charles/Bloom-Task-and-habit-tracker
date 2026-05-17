import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore.ts";
import api from "../api/axios.ts";
import { Calendar, CheckCircle2, AlertCircle, RefreshCw, LogOut } from "lucide-react";
import { cn } from "../lib/utils.ts";
import { motion } from "motion/react";

export default function Settings() {
  const { user, logout } = useAuthStore();
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCalendarStatus();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setIsCalendarConnected(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fetchCalendarStatus = async () => {
    try {
      const { data } = await api.get("/calendar/status");
      setIsCalendarConnected(data.data.connected);
      setLastSyncedAt(data.data.lastSyncedAt);
    } catch (error) {
      console.error("Failed to fetch calendar status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const { data } = await api.get("/calendar/auth-url");
      const url = data.data.url;
      
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      window.open(
        url,
        'google_oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (error) {
      console.error("Failed to get auth URL");
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      await api.post("/calendar/sync");
      // Refresh status to get new lastSyncedAt
      fetchCalendarStatus();
      alert("Calendar sync completed!");
    } catch (error) {
      console.error("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Google Calendar?")) return;
    try {
      await api.delete("/calendar/disconnect");
      setIsCalendarConnected(false);
    } catch (error) {
      console.error("Disconnect failed");
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="max-w-4xl space-y-8">
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-800">Account Settings</h2>
        <div className="bloom-card p-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-3xl bg-bloom-pink flex items-center justify-center text-white text-2xl font-black shadow-lg">
              {user?.displayName[0]}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">{user?.displayName}</h3>
              <p className="text-sm text-gray-400">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-2 text-sm font-bold text-red-500 hover:bg-red-50 px-4 py-2 rounded-2xl transition-all"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-800">Connected Accounts</h2>
        <div className="bloom-card p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                isCalendarConnected ? "bg-bloom-pink-light text-bloom-pink" : "bg-slate-100 text-slate-400"
              )}>
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-gray-800">Google Calendar</h3>
                <p className="text-sm text-gray-400">
                  {isCalendarConnected 
                    ? `Connected${lastSyncedAt ? ` • Last synced ${new Date(lastSyncedAt).toLocaleString()}` : ''}` 
                    : "Connect to sync your tasks with Google Calendar"
                  }
                </p>
              </div>
            </div>

            {isCalendarConnected ? (
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  className="flex items-center gap-2 text-sm font-bold text-bloom-pink hover:bg-bloom-pink-light px-4 py-2 rounded-2xl transition-all disabled:opacity-50"
                >
                  <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                  {isSyncing ? "Syncing..." : "Sync Now"}
                </button>
                <button 
                  onClick={handleDisconnect}
                  className="text-xs font-bold text-gray-400 hover:text-red-500"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button 
                onClick={handleConnectCalendar}
                className="bg-bloom-pink text-white font-bold px-6 py-2.5 rounded-2xl shadow-lg shadow-bloom-pink/20 hover:brightness-105 transition-all"
              >
                Connect Calendar
              </button>
            )}
          </div>

          {isCalendarConnected && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-bloom-bg/50 p-4 rounded-2xl border border-bloom-pink/10 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-bloom-green flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-bloom-dark-green" />
                </div>
                <div>
                  <p className="text-xs font-bold text-bloom-dark-green uppercase tracking-widest">Automatic Sync</p>
                  <p className="text-sm text-gray-600 mt-1">New tasks with due dates are automatically pushed to Google.</p>
                </div>
              </div>
              <div className="bg-bloom-bg/50 p-4 rounded-2xl border border-bloom-pink/10 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                </div>
                <div>
                  <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">Bidirectional Pull</p>
                  <p className="text-sm text-gray-600 mt-1">Calendar events from the last 24h are periodically pulled into Bloom.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
