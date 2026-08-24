import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Trello, 
  Calendar, 
  CheckCircle2, 
  BarChart3, 
  Settings as SettingsIcon,
  LogOut,
  Flower2,
  Smartphone,
  Download,
  Sparkles
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore.ts";
import InstallApkModal from "./InstallApkModal.tsx";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout, checkAuth, isLoading } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [isApkModalOpen, setIsApkModalOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-bloom-pink-light">
        <Flower2 className="w-12 h-12 text-bloom-pink animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <>{children}</>;
  }

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Board", href: "/kanban", icon: Trello },
    { name: "Calendar", href: "/calendar", icon: Calendar },
    { name: "Habits", href: "/habits", icon: CheckCircle2 },
    { name: "Progress", href: "/progress", icon: BarChart3 },
    { name: "Settings", href: "/settings", icon: SettingsIcon },
  ];

  return (
    <div className="flex min-h-screen bg-bloom-bg dark:bg-slate-900 transition-colors">
      <InstallApkModal 
        isOpen={isApkModalOpen} 
        onClose={() => setIsApkModalOpen(false)} 
      />

      {/* Sidebar - Desktop Only */}
      <aside className="w-64 bg-white/60 dark:bg-slate-800/60 border-r border-bloom-pink/30 dark:border-slate-800 flex flex-col fixed h-full backdrop-blur-md hidden lg:flex z-50">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-bloom-green dark:bg-slate-700 rounded-xl grid place-items-center shadow-sm">
            <Flower2 className="text-bloom-dark-green dark:text-bloom-green w-5 h-5" />
          </div>
          <span className="text-2xl font-bold text-bloom-purple dark:text-[#f8a5c2] tracking-tight">
            Bloom
          </span>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 group",
                  isActive 
                    ? "bg-white dark:bg-slate-700 text-bloom-pink font-bold shadow-sm" 
                    : "text-slate-500 dark:text-slate-300 hover:bg-white/40 dark:hover:bg-slate-700/40"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-bloom-pink" : "text-slate-400 group-hover:text-slate-600 dark:text-slate-400 dark:group-hover:text-slate-200")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 space-y-3 border-t border-bloom-pink/10 dark:border-slate-700">
          {/* Android App Widget in Sidebar */}
          <div className="bg-gradient-to-br from-bloom-pink/10 via-bloom-purple/10 to-bloom-pink/5 dark:from-bloom-pink/20 dark:to-slate-800 p-3.5 rounded-2xl border border-bloom-pink/20 dark:border-slate-700 relative overflow-hidden group">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-8 h-8 rounded-xl bg-bloom-pink text-white flex items-center justify-center shrink-0 shadow-sm">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-black uppercase text-bloom-pink dark:text-bloom-pink tracking-wider">Android App</span>
                  <span className="text-[9px] font-bold bg-bloom-green text-bloom-dark-green px-1.5 rounded-full">Mobile</span>
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-white truncate">Android Edition</p>
              </div>
            </div>
            <button 
              onClick={() => setIsApkModalOpen(true)}
              className="w-full py-2 px-3 bg-bloom-pink hover:bg-bloom-pink/90 text-white font-bold text-xs rounded-xl shadow-md shadow-bloom-pink/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Android App
            </button>
          </div>

          <div className="bg-bloom-green-light/50 dark:bg-slate-700/45 p-3.5 rounded-2xl flex items-center justify-between border border-bloom-green/20 dark:border-slate-700/30">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-bloom-pink flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
                {user.displayName[0]}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold truncate text-bloom-dark-green dark:text-[#86efac]">{user.displayName}</span>
              </div>
            </div>
            <button 
              onClick={logout}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-red-500 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-3 sm:p-6 md:p-8 pb-20 lg:pb-8">
        {/* Top Navbar */}
        <header className="flex flex-col md:flex-row md:items-center justify-between mb-4 sm:mb-8 gap-3 sm:gap-4">
          <div className="flex items-center justify-between w-full md:w-auto">
            <div className="flex items-center gap-2">
              <div className="lg:hidden w-8 h-8 sm:w-10 sm:h-10 bg-bloom-green dark:bg-slate-700 rounded-lg sm:rounded-xl flex items-center justify-center shadow-sm">
                 <Flower2 className="text-bloom-dark-green dark:text-bloom-green w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="flex flex-col items-start md:items-start ml-1 sm:ml-2 md:ml-0">
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-slate-800 dark:text-white">
                  Hi, {user.displayName}!
                </h1>
                <p className="text-[11px] sm:text-xs md:text-sm text-slate-500 dark:text-slate-400">Keep up the great progress.</p>
              </div>
            </div>

            {/* Mobile APK Quick Button */}
            <button 
              onClick={() => setIsApkModalOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 bg-bloom-pink/10 dark:bg-bloom-pink/20 text-bloom-pink font-bold text-xs rounded-xl border border-bloom-pink/20 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Get App</span>
            </button>
          </div>
        </header>

        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 lg:hidden bg-white/90 dark:bg-slate-800/90 backdrop-blur-lg border-t border-bloom-pink/10 dark:border-slate-700 px-1 py-1.5 sm:px-2 sm:py-2 flex justify-around items-center z-50">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center gap-0.5 p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all",
                isActive ? "text-bloom-pink bg-bloom-pink/10 dark:bg-bloom-pink/20 font-semibold" : "text-slate-400 dark:text-slate-300"
              )}
            >
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-[9px] sm:text-[10px] font-bold">{item.name}</span>
            </Link>
          );
        })}
        <Link
          to="/settings"
          className={cn(
            "flex flex-col items-center gap-0.5 p-1.5 sm:p-2 rounded-lg sm:rounded-xl transition-all",
            location.pathname === "/settings" ? "text-bloom-pink bg-bloom-pink/10 dark:bg-bloom-pink/20 font-semibold" : "text-slate-400 dark:text-slate-300"
          )}
        >
          <SettingsIcon className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="text-[9px] sm:text-[10px] font-bold">Settings</span>
        </Link>
      </nav>
    </div>
  );
}

