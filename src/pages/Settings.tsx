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

  if (isLoading) return <div className="p-4 sm:p-8"><div className="animate-pulse space-y-4 bloom-card p-4 sm:p-8"><div className="h-16 bg-slate-100 dark:bg-slate-700 rounded-xl w-full"></div><div className="h-32 bg-slate-50 dark:bg-slate-700 rounded-xl w-full"></div></div></div>;

  return (
    <div className="max-w-3xl space-y-4 sm:space-y-6">
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white">Account Settings</h2>
        <div className="bloom-card p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-bloom-pink flex items-center justify-center text-white text-xl sm:text-2xl font-black shadow-md shrink-0">
              {user?.displayName[0]}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white truncate">{user?.displayName}</h3>
              <p className="text-xs sm:text-sm text-gray-400 dark:text-slate-300 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-end w-full sm:w-auto">
             <button 
               onClick={logout}
               className="flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 px-3 py-2 sm:px-4 sm:py-2 rounded-xl transition-all w-full sm:w-auto cursor-pointer"
             >
               <LogOut className="w-4 h-4" /> Sign Out
             </button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white">Connected Accounts</h2>
        <div className="bloom-card p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-3 sm:gap-4 w-full">
              <div className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-colors shrink-0",
                isCalendarConnected 
                  ? "bg-bloom-pink-light text-bloom-pink dark:bg-bloom-pink/20" 
                  : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-300"
              )}>
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-gray-800 dark:text-white">Google Calendar</h3>
                <p className="text-xs sm:text-sm text-gray-400 dark:text-slate-300 truncate">
                  {isCalendarConnected 
                    ? `Connected${lastSyncedAt ? ` • Last synced ${new Date(lastSyncedAt).toLocaleString()}` : ''}` 
                    : "Task syncing enabled"
                  }
                </p>
              </div>
            </div>

            {isCalendarConnected ? (
              <div className="flex flex-row items-center gap-3 w-full sm:w-auto">
                <button 
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-bloom-pink bg-bloom-pink-light dark:bg-bloom-pink/20 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl transition-all disabled:opacity-50 flex-1 sm:flex-none cursor-pointer"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", isSyncing && "animate-spin")} />
                  {isSyncing ? "Syncing..." : "Sync Now"}
                </button>
                <button 
                  onClick={handleDisconnect}
                  className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors py-2 px-2 cursor-pointer shrink-0"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button 
                onClick={handleConnectCalendar}
                className="bg-bloom-pink text-white text-xs sm:text-sm font-bold px-6 py-2.5 sm:px-8 sm:py-3 rounded-xl sm:rounded-2xl shadow-md shadow-bloom-pink/20 hover:brightness-105 transition-all w-full sm:w-auto cursor-pointer"
              >
                Connect
              </button>
            )}
          </div>

          {isCalendarConnected && (
            <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-bloom-bg/50 dark:bg-slate-700/30 p-3 sm:p-4 rounded-xl border border-bloom-pink/10 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-bloom-green flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-bloom-dark-green dark:text-green-800" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-bloom-dark-green dark:text-green-200 uppercase tracking-widest">Automatic Sync</p>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 mt-0.5">New tasks are pushed automatically.</p>
                </div>
              </div>
              <div className="bg-bloom-bg/50 dark:bg-slate-700/30 p-3 sm:p-4 rounded-xl border border-bloom-pink/10 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-orange-600 dark:text-orange-300 uppercase tracking-widest">Two-Way Pull</p>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 mt-0.5">Events are synced from Google.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
