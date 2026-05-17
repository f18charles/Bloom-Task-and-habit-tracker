import { ReactNode, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Trello, 
  Calendar, 
  CheckCircle2, 
  BarChart3, 
  Settings as SettingsIcon,
  LogOut,
  Flower,
  Flame,
  Award
} from "lucide-react";
import { useAuthStore } from "../store/useAuthStore.ts";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout, checkAuth, isLoading } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-bloom-pink-light">
        <Flower className="w-12 h-12 text-bloom-pink animate-spin" />
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
    <div className="flex min-h-screen bg-bloom-bg">
      {/* Sidebar */}
      <aside className="w-64 bg-white/60 border-r border-bloom-pink/30 flex flex-col fixed h-full backdrop-blur-md">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-bloom-green rounded-xl grid place-items-center shadow-sm">
            <Flower className="text-bloom-dark-green w-6 h-6" />
          </div>
          <span className="text-2xl font-bold text-bloom-purple tracking-tight">
            Bloom
          </span>
        </div>

        <nav className="flex-1 px-4 space-y-2">
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
                    ? "bg-white text-bloom-pink font-bold shadow-sm" 
                    : "text-slate-500 hover:bg-white/40"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-bloom-pink" : "text-slate-400 group-hover:text-slate-600")} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-bloom-pink/10 space-y-4">
          <div className="bg-bloom-green-light/50 p-4 rounded-2xl flex items-center justify-between border border-bloom-green/20">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-bloom-pink flex items-center justify-center text-white text-xs font-bold shadow-sm">
                {user.displayName[0]}
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold truncate max-w-[100px] text-bloom-dark-green">{user.displayName}</span>
                <span className="text-[10px] text-bloom-dark-green/60 uppercase tracking-wider">{user.points} pts</span>
              </div>
            </div>
            <button 
              onClick={logout}
              className="p-2 hover:bg-white rounded-lg text-slate-400 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        {/* Top Navbar */}
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Welcome back, {user.displayName}! 👋
            </h1>
            <p className="text-slate-500">You're on a roll today.</p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-white">
              <Flame className="w-5 h-5 text-orange-500" />
              <span className="font-bold text-slate-700">5 day streak</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-white">
              <Award className="w-5 h-5 text-yellow-500" />
              <span className="font-bold text-bloom-pink">{user.points} pts</span>
            </div>
          </div>
        </header>

        {children}
      </main>
    </div>
  );
}
