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
  const [activeTheme, setActiveTheme] = useState<'light' | 'dark' | 'system'>('system');

  useEffect(() => {
    fetchCalendarStatus();
    
    const storedTheme = (localStorage.getItem('bloom-theme') as 'light' | 'dark' | 'system') || 'system';
    setActiveTheme(storedTheme);

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

  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    localStorage.setItem('bloom-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      // system
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDark);
    }
    setActiveTheme(theme);
  };

  if (isLoading) return <div className="p-8"><div className="animate-pulse space-y-4 bloom-card p-8"><div className="h-20 bg-slate-100 dark:bg-slate-700 rounded-2xl w-full"></div><div className="h-40 bg-slate-50 dark:bg-slate-700 rounded-2xl w-full"></div></div></div>;

  return (
    <div className="max-w-4xl space-y-8">
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Account Settings</h2>
        <div className="bloom-card p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-16 h-16 rounded-3xl bg-bloom-pink flex items-center justify-center text-white text-2xl font-black shadow-lg shrink-0">
              {user?.displayName[0]}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">{user?.displayName}</h3>
              <p className="text-sm text-gray-400 dark:text-slate-300">{user?.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
             <button 
               onClick={logout}
               className="flex items-center justify-center gap-2 text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 px-4 py-2 rounded-2xl transition-all flex-1 md:flex-none"
             >
               <LogOut className="w-4 h-4" /> Sign Out
             </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white">Connected Accounts</h2>
        <div className="bloom-card p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 w-full">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors shrink-0",
                isCalendarConnected 
                  ? "bg-bloom-pink-light text-bloom-pink dark:bg-bloom-pink/20" 
                  : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-300"
              )}>
                <Calendar className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-gray-800 dark:text-white">Google Calendar</h3>
                <p className="text-sm text-gray-400 dark:text-slate-300 truncate">
                  {isCalendarConnected 
                    ? `Connected${lastSyncedAt ? ` • Last synced ${new Date(lastSyncedAt).toLocaleString()}` : ''}` 
                    : "Task syncing enabled"
                  }
                </p>
              </div>
            </div>

            {isCalendarConnected ? (
              <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <button 
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-2 text-sm font-bold text-bloom-pink bg-bloom-pink-light dark:bg-bloom-pink/20 px-6 py-2.5 rounded-2xl transition-all disabled:opacity-50 w-full sm:w-auto cursor-pointer"
                >
                  <RefreshCw className={cn("w-4 h-4", isSyncing && "animate-spin")} />
                  {isSyncing ? "Syncing..." : "Sync Now"}
                </button>
                <button 
                  onClick={handleDisconnect}
                  className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors py-2 cursor-pointer"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button 
                onClick={handleConnectCalendar}
                className="bg-bloom-pink text-white font-bold px-8 py-3 rounded-2xl shadow-lg shadow-bloom-pink/20 hover:brightness-105 transition-all w-full sm:w-auto cursor-pointer"
              >
                Connect
              </button>
            )}
          </div>

          {isCalendarConnected && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-bloom-bg/50 dark:bg-slate-700/30 p-4 rounded-2xl border border-bloom-pink/10 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-bloom-green flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-bloom-dark-green dark:text-green-800" />
                </div>
                <div>
                  <p className="text-xs font-bold text-bloom-dark-green dark:text-green-200 uppercase tracking-widest">Automatic Sync</p>
                  <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">New tasks are pushed automatically.</p>
                </div>
              </div>
              <div className="bg-bloom-bg/50 dark:bg-slate-700/30 p-4 rounded-2xl border border-bloom-pink/10 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-orange-600 dark:text-orange-300 uppercase tracking-widest">Two-Way Pull</p>
                  <p className="text-sm text-gray-600 dark:text-slate-300 mt-1">Events are synced from Google.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Appearance</h2>
        <div className="bloom-card p-6 sm:p-8">
          <p className="text-sm text-slate-500 dark:text-slate-300 mb-6 font-medium">Choose how Bloom looks on your device.</p>
          <div className="flex flex-col sm:flex-row gap-3">
            {(["light", "system", "dark"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  applyTheme(t);
                }}
                className={cn(
                  "flex-1 p-4 rounded-2xl font-bold text-sm uppercase tracking-wider transition-all duration-200 border cursor-pointer",
                  activeTheme === t
                    ? "bg-bloom-pink border-bloom-pink text-white shadow-xl shadow-bloom-pink/20"
                    : "bg-slate-50 dark:bg-slate-700/50 border-slate-100/60 dark:border-slate-600/30 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
