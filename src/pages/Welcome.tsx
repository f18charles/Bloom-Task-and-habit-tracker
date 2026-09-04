import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Flower2, 
  CheckCircle2, 
  Circle,
  Calendar as CalendarIcon, 
  BarChart3, 
  Trello, 
  Flame, 
  ArrowRight, 
  ChevronRight, 
  ShieldCheck, 
  Clock, 
  Plus, 
  Check, 
  RefreshCw,
  ChevronDown,
  Layers,
  ListTodo,
  CornerDownRight,
  Trash2,
  CalendarCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from "recharts";
import { useAuthStore } from "../store/useAuthStore.ts";

interface SandboxSubtaskLevel3 {
  id: string;
  title: string;
  isCompleted: boolean;
}

interface SandboxSubtaskLevel2 {
  id: string;
  title: string;
  isCompleted: boolean;
  subtasks?: SandboxSubtaskLevel3[];
}

interface SandboxTask {
  id: number;
  title: string;
  description?: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "TODO" | "IN_PROGRESS" | "DONE";
  dueDate: string;
  isRecurring?: boolean;
  subtasks: SandboxSubtaskLevel2[];
}

export default function Welcome() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Interactive Sandbox State
  const [sandboxTab, setSandboxTab] = useState<"tasks" | "habits" | "calendar" | "progress">("tasks");
  
  // Interactive tasks with 3-Level Nesting (Root -> Subtasks -> Micro-steps)
  const [tasks, setTasks] = useState<SandboxTask[]>([
    {
      id: 1,
      title: "Launch Product Feature Sprint",
      description: "Complete key milestone deliverables with team",
      priority: "URGENT",
      status: "IN_PROGRESS",
      dueDate: "Today, 5:00 PM",
      isRecurring: true,
      subtasks: [
        {
          id: "st-1",
          title: "Design user flow & interactive wireframes",
          isCompleted: true,
          subtasks: [
            { id: "st-1-1", title: "Review mobile breakpoints", isCompleted: true },
            { id: "st-1-2", title: "Approve dark mode palette", isCompleted: true }
          ]
        },
        {
          id: "st-2",
          title: "Implement 3-level subtask architecture",
          isCompleted: false,
          subtasks: [
            { id: "st-2-1", title: "Define TypeScript nested schema", isCompleted: true },
            { id: "st-2-2", title: "Wire reactive Zustand state updates", isCompleted: false },
            { id: "st-2-3", title: "Add interactive checklist modal UI", isCompleted: false }
          ]
        },
        {
          id: "st-3",
          title: "Deploy build & verify end-to-end sync",
          isCompleted: false,
          subtasks: []
        }
      ]
    },
    {
      id: 2,
      title: "Daily 15-Minute Focus & Planning Ritual",
      description: "Review top 3 daily priorities and calendar schedule",
      priority: "HIGH",
      status: "DONE",
      dueDate: "Completed",
      isRecurring: true,
      subtasks: [
        { id: "st-4", title: "Clear inbox action items", isCompleted: true, subtasks: [] },
        { id: "st-5", title: "Time-block afternoon deep work", isCompleted: true, subtasks: [] }
      ]
    },
    {
      id: 3,
      title: "Sync Google Calendar schedule for the week",
      description: "Connect bi-directional events and deadlines",
      priority: "MEDIUM",
      status: "TODO",
      dueDate: "Tomorrow, 10:00 AM",
      isRecurring: false,
      subtasks: [
        { id: "st-6", title: "Authorize OAuth access in settings", isCompleted: false, subtasks: [] }
      ]
    }
  ]);

  const [expandedTasks, setExpandedTasks] = useState<Record<number, boolean>>({ 1: true });
  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({ "st-2": true });
  const [newTaskInput, setNewTaskInput] = useState("");
  const [newSubtaskInputs, setNewSubtaskInputs] = useState<Record<number, string>>({});
  const [newLevel3Inputs, setNewLevel3Inputs] = useState<Record<string, string>>({});

  // Sample interactive habits in sandbox
  const [habits, setHabits] = useState([
    { id: 1, name: "Drink 2.5L Water", streak: 12, completedToday: true, icon: "💧" },
    { id: 2, name: "Read 20 Pages of a Book", streak: 7, completedToday: false, icon: "📚" },
    { id: 3, name: "30-min Deep Focus Session", streak: 19, completedToday: true, icon: "⚡" },
    { id: 4, name: "Evening Screen-Free Wind Down", streak: 4, completedToday: false, icon: "🌙" },
  ]);

  // Calendar sync simulator
  const [calendarSynced, setCalendarSynced] = useState(true);

  // FAQ open states
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Toggle Root Task completion
  const toggleTask = (id: number) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === "DONE" ? "TODO" : "DONE";
        const markSubtasksDone = nextStatus === "DONE";
        const updatedSubtasks = t.subtasks.map(s2 => ({
          ...s2,
          isCompleted: markSubtasksDone,
          subtasks: (s2.subtasks || []).map(s3 => ({ ...s3, isCompleted: markSubtasksDone }))
        }));
        return { ...t, status: nextStatus, subtasks: updatedSubtasks };
      }
      return t;
    }));
  };

  // Toggle Level 2 Subtask
  const toggleSubtaskLevel2 = (taskId: number, subtaskId: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const updatedSubtasks = t.subtasks.map(s2 => {
          if (s2.id === subtaskId) {
            const nextCompleted = !s2.isCompleted;
            return {
              ...s2,
              isCompleted: nextCompleted,
              subtasks: (s2.subtasks || []).map(s3 => ({ ...s3, isCompleted: nextCompleted }))
            };
          }
          return s2;
        });
        const allDone = updatedSubtasks.every(s2 => s2.isCompleted);
        return {
          ...t,
          status: allDone ? "DONE" : t.status === "DONE" ? "IN_PROGRESS" : t.status,
          subtasks: updatedSubtasks
        };
      }
      return t;
    }));
  };

  // Toggle Level 3 Micro-step
  const toggleSubtaskLevel3 = (taskId: number, subtaskId: string, level3Id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        const updatedSubtasks = t.subtasks.map(s2 => {
          if (s2.id === subtaskId) {
            const updatedL3 = (s2.subtasks || []).map(s3 => {
              if (s3.id === level3Id) {
                return { ...s3, isCompleted: !s3.isCompleted };
              }
              return s3;
            });
            const l2Done = updatedL3.every(s3 => s3.isCompleted);
            return { ...s2, isCompleted: l2Done, subtasks: updatedL3 };
          }
          return s2;
        });
        return { ...t, subtasks: updatedSubtasks };
      }
      return t;
    }));
  };

  // Add Root Task
  const handleAddSandboxTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskInput.trim()) return;
    const newId = Date.now();
    setTasks(prev => [
      {
        id: newId,
        title: newTaskInput.trim(),
        priority: "HIGH",
        status: "TODO",
        dueDate: "Today",
        isRecurring: false,
        subtasks: [
          { id: `st-${newId}-1`, title: "First preparation step", isCompleted: false, subtasks: [] }
        ]
      },
      ...prev
    ]);
    setExpandedTasks(prev => ({ ...prev, [newId]: true }));
    setNewTaskInput("");
  };

  // Add Level 2 Subtask to a specific task
  const handleAddLevel2Subtask = (taskId: number) => {
    const title = (newSubtaskInputs[taskId] || "").trim();
    if (!title) return;
    const newSubId = `st-${Date.now()}`;
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: [
            ...t.subtasks,
            { id: newSubId, title, isCompleted: false, subtasks: [] }
          ]
        };
      }
      return t;
    }));
    setNewSubtaskInputs(prev => ({ ...prev, [taskId]: "" }));
    setExpandedSubtasks(prev => ({ ...prev, [newSubId]: true }));
  };

  // Add Level 3 Micro-step
  const handleAddLevel3Subtask = (taskId: number, subtaskId: string) => {
    const title = (newLevel3Inputs[subtaskId] || "").trim();
    if (!title) return;
    const newL3Id = `l3-${Date.now()}`;
    setTasks(prev => prev.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          subtasks: t.subtasks.map(s2 => {
            if (s2.id === subtaskId) {
              return {
                ...s2,
                isCompleted: false,
                subtasks: [...(s2.subtasks || []), { id: newL3Id, title, isCompleted: false }]
              };
            }
            return s2;
          })
        };
      }
      return t;
    }));
    setNewLevel3Inputs(prev => ({ ...prev, [subtaskId]: "" }));
  };

  // Interactive habit toggle
  const toggleHabit = (id: number) => {
    setHabits(prev => prev.map(h => {
      if (h.id === id) {
        const newCompleted = !h.completedToday;
        return {
          ...h,
          completedToday: newCompleted,
          streak: newCompleted ? h.streak + 1 : Math.max(0, h.streak - 1)
        };
      }
      return h;
    }));
  };

  // Sample weekly progress chart data
  const sampleAnalyticsData = [
    { day: "Mon", completedTasks: 6, habitsScore: 85 },
    { day: "Tue", completedTasks: 8, habitsScore: 100 },
    { day: "Wed", completedTasks: 5, habitsScore: 75 },
    { day: "Thu", completedTasks: 9, habitsScore: 90 },
    { day: "Fri", completedTasks: 7, habitsScore: 80 },
    { day: "Sat", completedTasks: 4, habitsScore: 100 },
    { day: "Sun", completedTasks: 6, habitsScore: 95 },
  ];

  const completedCount = tasks.filter(t => t.status === "DONE").length;
  const completedHabitsCount = habits.filter(h => h.completedToday).length;

  const faqs = [
    {
      q: "What is Bloom and who is it designed for?",
      a: "Bloom is an all-in-one personal growth and productivity workspace. It is crafted for students, professionals, creators, and mindful individuals who want to organize daily tasks, sustain recurring positive habits, and maintain full schedule clarity without feeling overwhelmed."
    },
    {
      q: "How does the 3-Level Task hierarchy work?",
      a: "Bloom lets you structure complex objectives into 3 intuitive levels: Level 1 (Main Root Tasks), Level 2 (Subtasks for major phases), and Level 3 (steps & checklists). This lets you break large goals down into manageable actions while tracking progress automatically."
    },
    {
      q: "Can I set tasks to repeat automatically?",
      a: "Yes! Bloom supports automated recurring tasks with Daily, Weekly, and Monthly frequencies. When you finish a recurring task, the background engine automatically spawns the next occurrence on schedule."
    },
    {
      q: "How does Google Calendar synchronization work?",
      a: "Bloom features direct, bi-directional Google Calendar integration. You can connect your Google account in Settings, and Bloom will automatically pull your calendar events and push scheduled tasks directly into your calendar."
    },
    {
      q: "Can I organize tasks with Kanban boards?",
      a: "Yes! Bloom includes both a high-efficiency prioritized List view and an interactive Drag-and-Drop Kanban Board with To Do, In Progress, and Completed stages."
    },
    {
      q: "How do habit streaks work?",
      a: "Whenever you complete a habit on a scheduled day, your streak increments. Bloom tracks your active streaks, celebrates consistency milestones, and generates visual analytics so you can reflect on your growth over time."
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Top Header / Sticky Navigation */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-bloom-pink dark:bg-bloom-purple rounded-2xl grid place-items-center text-white shadow-md">
              <Flower2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                Bloom
              </span>
            </div>
          </div>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-bloom-pink dark:hover:text-white transition-colors">Features</a>
            <a href="#sandbox" className="hover:text-bloom-pink dark:hover:text-white transition-colors">Live Preview</a>
            <a href="#workflow" className="hover:text-bloom-pink dark:hover:text-white transition-colors">How It Works</a>
            <a href="#faq" className="hover:text-bloom-pink dark:hover:text-white transition-colors">FAQ</a>
          </nav>

          {/* User Auth Buttons */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {user ? (
              <button
                onClick={() => navigate("/")}
                className="bloom-btn-primary flex items-center gap-2 text-xs sm:text-sm font-bold shadow-md cursor-pointer"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-bloom-pink dark:hover:text-white transition-colors cursor-pointer"
                >
                  Sign In
                </Link>
                <Link
                  to="/auth?mode=register"
                  className="px-4 sm:px-5 py-2.5 bg-bloom-pink hover:bg-slate-800 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-slate-200/60 dark:border-slate-800">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-bloom-pink-light via-bloom-green-light to-purple-50 dark:from-slate-800/40 dark:to-purple-900/20 blur-3xl opacity-60 pointer-events-none -z-10 rounded-full" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6 sm:space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm text-xs font-bold text-slate-700 dark:text-slate-200"
          >
            <Layers className="w-3.5 h-3.5 text-bloom-pink" />
            <span>3-Level Tasks &bull; Habits &bull; Google Calendar Sync</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15]"
          >
            Structure complex goals, build habits, and watch your productivity <span className="text-bloom-pink dark:text-indigo-400 underline decoration-bloom-green decoration-wavy decoration-2">bloom</span>.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-base sm:text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed"
          >
            A calm, distraction-free workspace featuring 3-level hierarchical task breakdowns, recurring schedules, streak-powered habits, and bi-directional Google Calendar synchronization.
          </motion.p>

          {/* Action CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2"
          >
            <Link
              to="/auth?mode=register"
              className="w-full sm:w-auto px-8 py-4 bg-bloom-pink hover:bg-slate-800 text-white font-bold rounded-2xl shadow-lg shadow-slate-900/10 dark:shadow-indigo-950/40 flex items-center justify-center gap-2 text-base transition-all active:scale-95 cursor-pointer"
            >
              <span>Start Free Today</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <a
              href="#sandbox"
              className="w-full sm:w-auto px-7 py-4 bg-white dark:bg-slate-800 text-slate-800 dark:text-white font-bold rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-sm flex items-center justify-center gap-2 text-base transition-all cursor-pointer"
            >
              <span>Test Interactive Task Demo</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </a>
          </motion.div>

          {/* Feature Badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400 max-w-3xl mx-auto"
          >
            <div className="flex items-center justify-center gap-1.5 p-2 bg-white/60 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <Layers className="w-4 h-4 text-bloom-pink shrink-0" />
              <span>3-Level Hierarchical Tasks</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 p-2 bg-white/60 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <CalendarIcon className="w-4 h-4 text-bloom-green shrink-0" />
              <span>Google Calendar Sync</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 p-2 bg-white/60 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <Flame className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Habit Streaks</span>
            </div>
            <div className="flex items-center justify-center gap-1.5 p-2 bg-white/60 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-800">
              <ShieldCheck className="w-4 h-4 text-bloom-green shrink-0" />
              <span>Private & Cloud Synced</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Interactive Sandbox Section: Hands-On Experience */}
      <section id="sandbox" className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="text-center space-y-3 mb-10">
          <span className="text-xs font-black uppercase tracking-wider text-bloom-pink dark:text-indigo-400 bg-bloom-pink-light dark:bg-slate-800 px-3 py-1 rounded-full">
            Hands-On Interactive Sandbox
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            Experience 3-Level Tasks & Habits in Real Time
          </h2>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Test our hierarchical task breakdown, expand subtasks into micro-steps, complete goals, and test habit streaks directly in the sandbox below.
          </p>
        </div>

        {/* Sandbox Window Frame */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Top Window Bar with Interactive Tabs */}
          <div className="p-3 sm:p-4 bg-slate-100/80 dark:bg-slate-800/90 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
            {/* Window control dots */}
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-400" />
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="ml-2 text-xs font-bold text-slate-500 dark:text-slate-400 hidden sm:inline">
                Bloom Live Interactive Demo
              </span>
            </div>

            {/* Tab switchers */}
            <div className="flex items-center gap-1.5 bg-slate-200/70 dark:bg-slate-900/60 p-1 rounded-2xl text-xs font-bold">
              <button
                onClick={() => setSandboxTab("tasks")}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  sandboxTab === "tasks" 
                    ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm" 
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <ListTodo className="w-3.5 h-3.5 text-bloom-pink" />
                <span>3-Level Tasks ({completedCount}/{tasks.length})</span>
              </button>
              <button
                onClick={() => setSandboxTab("habits")}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  sandboxTab === "habits" 
                    ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm" 
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                <span>Habits ({completedHabitsCount}/{habits.length})</span>
              </button>
              <button
                onClick={() => setSandboxTab("calendar")}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  sandboxTab === "calendar" 
                    ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm" 
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />
                <span>Calendar Sync</span>
              </button>
              <button
                onClick={() => setSandboxTab("progress")}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                  sandboxTab === "progress" 
                    ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm" 
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-bloom-green" />
                <span>Analytics</span>
              </button>
            </div>
          </div>

          {/* Sandbox Body Content */}
          <div className="p-5 sm:p-8 bg-slate-50/50 dark:bg-slate-900/40 min-h-[420px]">
            {sandboxTab === "tasks" && (
              <div className="space-y-6">
                {/* Header within sandbox */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <span>Hierarchical Task Engine</span>
                      <span className="text-[10px] font-black uppercase text-bloom-pink bg-bloom-pink-light dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        3-Level Nesting
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Expand tasks to reveal Subtasks (L2) and granular checklist Micro-steps (L3).
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span className="bg-bloom-green/20 text-bloom-dark-green dark:text-emerald-300 px-2.5 py-1 rounded-xl">
                      {completedCount} Completed
                    </span>
                    <span className="bg-slate-200 dark:bg-slate-700 px-2.5 py-1 rounded-xl">
                      {tasks.length - completedCount} Pending
                    </span>
                  </div>
                </div>

                {/* Add task quick form */}
                <form onSubmit={handleAddSandboxTask} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Create a root task (e.g., 'Organize Product Launch')..."
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-bloom-pink transition-all"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 bg-bloom-pink text-white font-bold rounded-2xl text-xs sm:text-sm flex items-center gap-1.5 shadow-sm hover:brightness-95 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Task</span>
                  </button>
                </form>

                {/* Interactive Task Cards with 3-Level Subtasks */}
                <div className="space-y-4">
                  {tasks.map((task) => {
                    const isTaskExpanded = !!expandedTasks[task.id];
                    let totalSteps = 0;
                    let completedSteps = 0;
                    task.subtasks.forEach(s2 => {
                      if (s2.subtasks && s2.subtasks.length > 0) {
                        s2.subtasks.forEach(s3 => {
                          totalSteps++;
                          if (s3.isCompleted) completedSteps++;
                        });
                      } else {
                        totalSteps++;
                        if (s2.isCompleted) completedSteps++;
                      }
                    });

                    return (
                      <motion.div
                        key={task.id}
                        layout
                        className={`rounded-2xl border transition-all overflow-hidden ${
                          task.status === "DONE"
                            ? "bg-slate-100/80 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 opacity-80"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm"
                        }`}
                      >
                        {/* Level 1: Root Task Header */}
                        <div className="p-4 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => toggleTask(task.id)}
                              className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                                task.status === "DONE"
                                  ? "bg-bloom-green text-white"
                                  : "border-2 border-slate-300 dark:border-slate-600 hover:border-bloom-green text-transparent"
                              }`}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </button>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <p className={`text-sm font-bold truncate ${
                                  task.status === "DONE"
                                    ? "line-through text-slate-400 dark:text-slate-500"
                                    : "text-slate-800 dark:text-slate-100"
                                }`}>
                                  {task.title}
                                </p>
                                {task.isRecurring && (
                                  <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300">
                                    Recurring
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {task.dueDate}
                                </span>
                                {totalSteps > 0 && (
                                  <span className="font-semibold text-slate-500 dark:text-slate-400">
                                    {completedSteps}/{totalSteps} sub-steps
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              task.priority === "URGENT" 
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                : task.priority === "HIGH"
                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                            }`}>
                              {task.priority}
                            </span>

                            <button
                              type="button"
                              onClick={() => setExpandedTasks(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                            >
                              <span>{task.subtasks.length} Subtasks</span>
                              {isTaskExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Level 2 & 3 Subtasks Container */}
                        {isTaskExpanded && (
                          <div className="px-4 pb-4 pt-1 bg-slate-50/70 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700/50 space-y-3">
                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                              Subtasks & Checklists (Levels 2 & 3)
                            </div>

                            {/* Level 2 Subtasks list */}
                            <div className="space-y-2.5">
                              {task.subtasks.map((st2) => {
                                const isL2Expanded = !!expandedSubtasks[st2.id];
                                const l3Count = st2.subtasks?.length || 0;
                                const l3Completed = st2.subtasks?.filter(s3 => s3.isCompleted).length || 0;

                                return (
                                  <div 
                                    key={st2.id}
                                    className="p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-2"
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                        <button
                                          type="button"
                                          onClick={() => toggleSubtaskLevel2(task.id, st2.id)}
                                          className={`w-4 h-4 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                            st2.isCompleted
                                              ? "bg-bloom-pink border-bloom-pink text-white"
                                              : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                          }`}
                                        >
                                          {st2.isCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                        </button>
                                        <span className={`text-xs font-semibold truncate ${
                                          st2.isCompleted ? "line-through text-slate-400" : "text-slate-700 dark:text-slate-200"
                                        }`}>
                                          {st2.title}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => setExpandedSubtasks(prev => ({ ...prev, [st2.id]: !prev[st2.id] }))}
                                          className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer"
                                        >
                                          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">L3</span>
                                          <span>{l3Completed}/{l3Count}</span>
                                          {isL2Expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                        </button>
                                      </div>
                                    </div>

                                    {/* Level 3 Micro-steps */}
                                    {isL2Expanded && (
                                      <div className="pl-5 pt-1.5 space-y-1.5 border-t border-slate-100 dark:border-slate-700/40">
                                        {st2.subtasks && st2.subtasks.map((st3) => (
                                          <div key={st3.id} className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 dark:bg-slate-900/60">
                                            <CornerDownRight className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                                            <button
                                              type="button"
                                              onClick={() => toggleSubtaskLevel3(task.id, st2.id, st3.id)}
                                              className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                                                st3.isCompleted
                                                  ? "bg-bloom-pink border-bloom-pink text-white"
                                                  : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                              }`}
                                            >
                                              {st3.isCompleted && <Check className="w-2 h-2 stroke-[3]" />}
                                            </button>
                                            <span className={`text-[11px] truncate ${
                                              st3.isCompleted ? "line-through text-slate-400" : "text-slate-600 dark:text-slate-300"
                                            }`}>
                                              {st3.title}
                                            </span>
                                          </div>
                                        ))}

                                        {/* Add Level 3 item input */}
                                        <div className="flex gap-1.5 pt-1 items-center">
                                          <CornerDownRight className="w-3 h-3 text-bloom-pink/60 shrink-0" />
                                          <input
                                            type="text"
                                            placeholder="Add step..."
                                            value={newLevel3Inputs[st2.id] || ""}
                                            onChange={(e) => setNewLevel3Inputs({ ...newLevel3Inputs, [st2.id]: e.target.value })}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleAddLevel3Subtask(task.id, st2.id);
                                              }
                                            }}
                                            className="flex-1 px-2.5 py-1 text-[11px] bg-slate-50 dark:bg-slate-900 rounded-lg outline-none focus:ring-1 focus:ring-bloom-pink text-slate-700 dark:text-slate-200"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => handleAddLevel3Subtask(task.id, st2.id)}
                                            className="px-2 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-bloom-pink hover:text-white rounded-lg text-[10px] font-bold text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                                          >
                                            Add
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}

                              {/* Add Level 2 Subtask form */}
                              <div className="flex gap-2 pt-1">
                                <input
                                  type="text"
                                  placeholder="Add subtask..."
                                  value={newSubtaskInputs[task.id] || ""}
                                  onChange={(e) => setNewSubtaskInputs({ ...newSubtaskInputs, [task.id]: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleAddLevel2Subtask(task.id);
                                    }
                                  }}
                                  className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-bloom-pink text-slate-700 dark:text-slate-200"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAddLevel2Subtask(task.id)}
                                  className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-bloom-pink hover:text-white rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors cursor-pointer flex items-center gap-1"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Subtask</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {sandboxTab === "habits" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <span>Habit Momentum & Daily Streaks</span>
                      <span className="text-xs font-semibold text-amber-600 bg-amber-100 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 rounded-full">
                        Streaks
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Tap each habit to log today's completion and increase your streak!
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-bloom-green">
                      {Math.round((completedHabitsCount / habits.length) * 100)}% Daily Goal
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-bloom-green h-full rounded-full transition-all duration-500"
                    style={{ width: `${(completedHabitsCount / habits.length) * 100}%` }}
                  />
                </div>

                {/* Habit Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {habits.map((habit) => (
                    <motion.div
                      key={habit.id}
                      layout
                      onClick={() => toggleHabit(habit.id)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        habit.completedToday
                          ? "bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40 shadow-sm"
                          : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{habit.icon}</span>
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
                            {habit.name}
                          </p>
                          <div className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400 font-bold mt-0.5">
                            <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                            <span>{habit.streak} Day Streak</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                          habit.completedToday
                            ? "bg-bloom-green text-white shadow-md shadow-bloom-green/30"
                            : "border-2 border-slate-300 dark:border-slate-600 text-slate-400 hover:border-bloom-green"
                        }`}
                      >
                        {habit.completedToday ? <Check className="w-4 h-4 stroke-[3]" /> : <Circle className="w-4 h-4" />}
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {sandboxTab === "calendar" && (
              <div className="space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      <span>Google Calendar Bi-Directional Synchronization</span>
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Bloom schedules tasks directly with your primary calendar so your agenda is always unified.
                    </p>
                  </div>
                  <button
                    onClick={() => setCalendarSynced(!calendarSynced)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      calendarSynced 
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${calendarSynced ? "text-blue-500" : ""}`} />
                    <span>{calendarSynced ? "Sync Status: Active" : "Click to Enable Sync"}</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-[10px] font-bold text-blue-500 uppercase">9:00 AM - 10:00 AM</span>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white">Team Strategy Sync</h4>
                    <p className="text-[11px] text-slate-400">Google Calendar Event</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/50 space-y-1 relative">
                    <span className="text-[10px] font-bold text-bloom-green uppercase">11:30 AM - 1:00 PM</span>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white">Deep Work: Q3 Design</h4>
                    <p className="text-[11px] text-slate-400">Bloom Synced Task</p>
                  </div>
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-1">
                    <span className="text-[10px] font-bold text-purple-500 uppercase">3:00 PM - 4:00 PM</span>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-white">Growth Review & Habits</h4>
                    <p className="text-[11px] text-slate-400">Bloom Synced Task</p>
                  </div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-900/40 text-xs text-blue-800 dark:text-blue-200 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-500 shrink-0" />
                  <span>Automatic two-way updates: Changes made in Bloom reflect immediately in Google Calendar and vice-versa.</span>
                </div>
              </div>
            )}

            {sandboxTab === "progress" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                      Weekly Completion Velocity & Consistency
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Understand your productivity patterns through visual charts.
                    </p>
                  </div>
                </div>

                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sampleAnalyticsData}>
                      <defs>
                        <linearGradient id="taskColor" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                      <YAxis stroke="#94a3b8" fontSize={11} />
                      <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                      <Area type="monotone" dataKey="completedTasks" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#taskColor)" name="Tasks Completed" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Feature Deep Dive Pillars */}
      <section id="features" className="py-16 sm:py-24 bg-white dark:bg-slate-800/50 border-t border-b border-slate-200/80 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-16">
          <div className="text-center space-y-3 max-w-2xl mx-auto">
            <span className="text-xs font-black uppercase tracking-wider text-bloom-pink dark:text-indigo-400 bg-bloom-pink-light dark:bg-slate-800 px-3 py-1 rounded-full">
              Core Capabilities
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Everything You Need To Flourish Daily
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
              Thoughtfully architected tools to help you structure objectives, build compounding habits, and execute without cognitive overload.
            </p>
          </div>

          {/* 4 Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            {/* Pillar 1: 3-Level Tasks & Kanban */}
            <div className="bloom-card p-6 sm:p-8 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-bloom-pink-light dark:bg-slate-700 flex items-center justify-center text-bloom-pink dark:text-white">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                3-Level Task Hierarchy & Kanban Boards
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Break complex ambitions into structured milestones. Organize main goals (Level 1) into actionable subtasks (Level 2) and checklists of micro-steps (Level 3), with drag-and-drop Kanban and prioritized list views.
              </p>
              <ul className="space-y-2 text-xs font-medium text-slate-600 dark:text-slate-400 pt-2">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-bloom-green" /> 3-Level deep nesting (Root &rarr; Subtasks &rarr; Micro-steps)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-bloom-green" /> Recurring task rules (Daily, Weekly, Monthly cycles)
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-bloom-green" /> Priority matrix (Urgent, High, Medium, Low) & Kanban stages
                </li>
              </ul>
            </div>

            {/* Pillar 2: Habits */}
            <div className="bloom-card p-6 sm:p-8 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-500">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                Habit Tracking & Momentum Streaks
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Cultivate long-term routines with daily and weekly habit check-ins. Watch your active streaks ignite and feel the psychological momentum of compounding consistency.
              </p>
              <ul className="space-y-2 text-xs font-medium text-slate-600 dark:text-slate-400 pt-2">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-bloom-green" /> Customizable daily/weekly schedules
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-bloom-green" /> Streak counter with momentum milestones
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-bloom-green" /> Daily completion rate meters
                </li>
              </ul>
            </div>

            {/* Pillar 3: Calendar */}
            <div className="bloom-card p-6 sm:p-8 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-500">
                <CalendarIcon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                Google Calendar Bi-Directional Sync
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Connect your real-world Google Calendar with a single click. Keep time-sensitive tasks in sync with your meetings and appointments on one cohesive monthly and daily timeline.
              </p>
              <ul className="space-y-2 text-xs font-medium text-slate-600 dark:text-slate-400 pt-2">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-bloom-green" /> Bi-directional automatic sync
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-bloom-green" /> Scheduled task time-blocking
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-bloom-green" /> Conflict-free scheduling & reminders
                </li>
              </ul>
            </div>

            {/* Pillar 4: Analytics */}
            <div className="bloom-card p-6 sm:p-8 space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-bloom-green">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                Progress Analytics & Growth Metrics
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Gain objective insights into your productivity patterns. Review task completion velocity over time, habit consistency rates, and weekly performance summaries.
              </p>
              <ul className="space-y-2 text-xs font-medium text-slate-600 dark:text-slate-400 pt-2">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-bloom-green" /> Interactive visual charts
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-bloom-green" /> Historical task completion stats
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-bloom-green" /> Habit consistency scoring
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Workflow in 3 Simple Steps */}
      <section id="workflow" className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="text-center space-y-3 mb-14">
          <span className="text-xs font-black uppercase tracking-wider text-bloom-pink dark:text-indigo-400 bg-bloom-pink-light dark:bg-slate-800 px-3 py-1 rounded-full">
            Simple 3-Step Flow
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            How Bloom Works In Your Day
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-700 relative space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-bloom-pink text-white font-black text-sm flex items-center justify-center shadow-md">
              01
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              Capture & Structure Goals
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Create tasks and break them down into 3 levels: Root goals, Subtasks, and checklist Micro-steps with priorities and recurring rules.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-700 relative space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-bloom-green text-bloom-dark-green font-black text-sm flex items-center justify-center shadow-md">
              02
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              Sync & Execute
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Let Google Calendar align your deadlines while you organize and complete items on the dashboard or Kanban board.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-3xl border border-slate-200 dark:border-slate-700 relative space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white font-black text-sm flex items-center justify-center shadow-md">
              03
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white">
              Build Habits & Bloom
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Check off daily habits to maintain active streaks, and inspect your weekly analytics to celebrate consistency.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-16 sm:py-24 bg-white dark:bg-slate-800/50 border-t border-slate-200/80 dark:border-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-10">
          <div className="text-center space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-bloom-pink dark:text-indigo-400 bg-bloom-pink-light dark:bg-slate-800 px-3 py-1 rounded-full">
              Frequently Asked Questions
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Got Questions? We've Got Answers
            </h2>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div 
                key={idx}
                className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-5 text-left font-bold text-sm sm:text-base text-slate-800 dark:text-white flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 shrink-0 ${openFaq === idx ? "rotate-180" : ""}`} />
                </button>
                <AnimatePresence>
                  {openFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-700/60 pt-3">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Banner */}
      <section className="py-16 sm:py-20 bg-gradient-to-r from-bloom-pink via-slate-800 to-bloom-purple text-white relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6 relative z-10">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-3xl mx-auto grid place-items-center text-white shadow-lg">
            <Flower2 className="w-8 h-8" />
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight">
            Ready to nurture your potential?
          </h2>
          <p className="text-slate-200 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Create your account in seconds and step into a focused, organized workflow today.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/auth?mode=register"
              className="w-full sm:w-auto px-8 py-4 bg-bloom-green hover:bg-emerald-400 text-slate-900 font-bold rounded-2xl shadow-xl flex items-center justify-center gap-2 text-base transition-all active:scale-95 cursor-pointer"
            >
              <span>Create Free Account</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/auth"
              className="w-full sm:w-auto px-7 py-4 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl backdrop-blur-md transition-all cursor-pointer text-base"
            >
              Sign In to Existing Account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-10 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Flower2 className="w-4 h-4 text-bloom-green" />
            <span className="font-bold text-white">Bloom Productivity & Growth</span>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6 font-medium">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#sandbox" className="hover:text-white transition-colors">Live Preview</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <Link to="/auth" className="hover:text-white transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
