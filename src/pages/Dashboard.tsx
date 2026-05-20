import { useEffect, useState } from "react";
import { useTaskStore } from "../store/useTaskStore.ts";
import { useAuthStore } from "../store/useAuthStore.ts";
import { useHabitStore } from "../store/useHabitStore.ts";
import { 
  CheckCircle2, 
  Plus,
  Calendar as CalendarIcon,
  Trophy,
  Zap,
  Flower
} from "lucide-react";
import { motion } from "motion/react";
import api from "../api/axios.ts";
import { cn } from "../lib/utils.ts";
import TaskModal from "../components/TaskModal.tsx";
// Gamification level utilities removed

import { ErrorBoundary } from "../components/ErrorBoundary.tsx";
import { Skeleton, TaskSkeleton, CardSkeleton } from "../components/Skeleton.tsx";

export default function Dashboard() {
  const { tasks, fetchTasks, isLoading: tasksLoading } = useTaskStore();
  const { user } = useAuthStore();
  const { habits, fetchHabits, logHabit, isLoading: habitsLoading } = useHabitStore();
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("NEWEST");

  const pendingTasksCount = tasks.filter(t => t.status !== "DONE").length;
  const pendingHabitsCount = habits.filter(h => {
    const isLoggedToday = h.logs?.some(l => 
      new Date(l.completedAt).toDateString() === new Date().toDateString()
    );
    return !isLoggedToday;
  }).length;

  useEffect(() => {
    fetchTasks();
    fetchHabits();
    setStatsLoading(true);
    api.get("/users/stats")
      .then(res => setStats(res.data.data))
      .finally(() => setStatsLoading(false));
  }, [fetchTasks, fetchHabits]);

  const filteredTasks = tasks
    .filter(t => t.status !== "DONE")
    .filter(t => filterPriority === "ALL" || t.priority === filterPriority)
    .sort((a, b) => {
      if (sortBy === "NEWEST") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "OLDEST") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "DUE_DATE") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return 0;
    });
  
  const upcomingTasks = [...filteredTasks];

  const openEditModal = (task: any) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const openAddModal = () => {
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <TaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        task={selectedTask}
      />
      {/* Overview Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-bloom-pink rounded-[2rem] p-6 sm:p-8 text-white shadow-md relative overflow-hidden flex flex-col justify-center min-h-[140px] sm:min-h-[160px]">
            <div className="relative z-10 space-y-2">
              <span className="text-[10px] uppercase font-black tracking-widest opacity-80">Workspace Status</span>
              <h4 className="text-2xl sm:text-3xl font-black">Your Focus Area</h4>
              <p className="text-sm opacity-90">
                You currently have <span className="font-bold underline">{pendingTasksCount} tasks</span> remaining to complete.
              </p>
            </div>
            <div className="absolute -bottom-10 -right-10 text-[8rem] sm:text-[10rem] opacity-5 font-black leading-none pointer-events-none select-none">
              ✓
            </div>
         </div>
         <div className="bg-bloom-green rounded-[2rem] p-6 sm:p-8 text-bloom-dark-green shadow-md flex flex-col justify-center min-h-[140px] sm:min-h-[160px]">
           <div className="space-y-2">
              <span className="text-[10px] uppercase font-black tracking-widest opacity-80">Daily Habits</span>
              <h4 className="text-2xl sm:text-3xl font-black">Daily Rituals</h4>
              <p className="text-sm opacity-90">
                {pendingHabitsCount > 0 
                  ? `You have ${pendingHabitsCount} habits remaining to log today.` 
                  : "All habits completed for today! Excellent job."}
              </p>
           </div>
         </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Habits & Badges */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <section className="bloom-card p-6 flex-1">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-700">Daily Habits</h3>
            </div>
            <div className="space-y-4">
              {(habitsLoading) ? (
                <>
                  <Skeleton className="h-12 w-full rounded-xl" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </>
              ) : habits.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-xs text-slate-400 italic mb-2">No habits set yet blooming!</p>
                  <button onClick={() => window.location.href='/habits'} className="text-xs font-bold text-bloom-pink hover:underline uppercase tracking-widest">Setup Habits</button>
                </div>
              ) : habits.slice(0, 3).map((habit) => {
                const isLoggedToday = habit.logs?.some(l => 
                  new Date(l.completedAt).toDateString() === new Date().toDateString()
                );
                return (
                  <div key={habit.id} className="flex items-center justify-between p-3 bg-bloom-bg rounded-xl transition-colors">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => !isLoggedToday && logHabit(habit.id)}
                        disabled={isLoggedToday}
                        className={cn(
                          "w-5 h-5 border-2 rounded-md flex items-center justify-center transition-all",
                          isLoggedToday 
                            ? "bg-bloom-pink border-bloom-pink" 
                            : "border-bloom-pink bg-white hover:bg-bloom-pink/10"
                        )}
                      >
                        {isLoggedToday && <CheckCircle2 className="w-4 h-4 text-white" />}
                      </button>
                      <span className={cn(
                        "text-sm font-medium",
                        isLoggedToday && "text-slate-400 line-through opacity-50"
                      )}>{habit.title}</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {isLoggedToday ? "Done" : "Pending"}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Achievement Badges section removed */}
        </div>

        {/* Right Column: Tasks */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <section className="bloom-card p-8 flex-1 border-none shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
              <div className="flex flex-col">
                <h3 className="font-bold text-lg text-gray-700">Currently Blooming</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Your priority focus</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select 
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="text-[10px] font-black uppercase tracking-widest bg-bloom-bg/50 border-none rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-bloom-pink transition-all text-slate-500"
                >
                  <option value="ALL">All Priority</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-[10px] font-black uppercase tracking-widest bg-bloom-bg/50 border-none rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-bloom-pink transition-all text-slate-500"
                >
                  <option value="NEWEST">Newest</option>
                  <option value="OLDEST">Oldest</option>
                  <option value="DUE_DATE">Due Date</option>
                </select>
                <button 
                  onClick={() => window.location.href='/kanban'}
                  className="text-bloom-pink font-black text-[10px] uppercase tracking-widest px-4 py-2 hover:bg-bloom-pink-light rounded-xl transition-all"
                >
                  View Board
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {tasksLoading ? (
                 <>
                   <TaskSkeleton />
                   <TaskSkeleton />
                 </>
               ) : upcomingTasks.length === 0 ? (
                 <div className="col-span-full py-12 flex flex-col items-center justify-center text-center bg-bloom-bg/30 rounded-[2rem] border border-bloom-pink/10 p-8">
                    <Flower className="w-14 h-14 text-bloom-pink animate-pulse mb-4" />
                    <h3 className="text-xl font-black text-slate-800 mb-2">Welcome to Bloom 🌸</h3>
                    <p className="text-sm text-slate-400 max-w-sm mx-auto mb-4 font-medium">Start organizing your workspace by adding your first task.</p>
                    <div className="flex items-center justify-center gap-4">
                      <button type="button" onClick={openAddModal} className="bloom-btn-primary px-6 py-2 text-sm font-bold rounded-xl cursor-pointer">Add First Task</button>
                      <button type="button" onClick={() => window.location.href='/kanban'} className="text-sm font-bold text-bloom-pink hover:underline">Go to Kanban &rarr;</button>
                    </div>
                 </div>
               ) : (
                 upcomingTasks.slice(0, 3).map((task) => (
                   <div 
                     key={task.id} 
                     onClick={() => openEditModal(task)}
                     className="p-5 border border-bloom-pink/5 rounded-2xl bg-white shadow-sm space-y-3 hover:border-bloom-pink/30 hover:shadow-md transition-all cursor-pointer group"
                   >
                     <div className="flex justify-between items-start">
                       <span className={cn(
                         "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm",
                         task.priority === "HIGH" ? "bg-red-50 text-red-500" :
                         task.priority === "MEDIUM" ? "bg-orange-50 text-orange-500" : "bg-blue-50 text-blue-500"
                       )}>
                         {task.priority}
                       </span>
                       <div className="flex items-center gap-2">
                         {task.googleEventId && <CalendarIcon className="w-3 h-3 text-blue-400" />}
                         <span className="text-[10px] text-slate-200 font-mono group-hover:text-bloom-pink transition-colors">#TSK-{task.id.slice(-3)}</span>
                       </div>
                     </div>
                     <p className="font-bold text-slate-800 line-clamp-1">{task.title}</p>
                     <div className="flex items-center gap-2">
                       <div className="w-5 h-5 rounded-full bg-bloom-pink-light flex items-center justify-center text-[8px] font-bold text-bloom-pink border border-white">
                          {user?.displayName?.[0] || 'U'}
                       </div>
                       <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{task.status || 'Planned'}</span>
                     </div>
                   </div>
                 ))
               )}
               {!tasksLoading && upcomingTasks.length > 0 && (
                 <button 
                   onClick={openAddModal}
                   className="p-5 border-2 border-dashed border-bloom-pink/10 rounded-2xl bg-bloom-bg/20 flex flex-col items-center justify-center hover:bg-white hover:border-bloom-pink/30 cursor-pointer group transition-all"
                 >
                    <Plus className="w-6 h-6 text-bloom-pink/40 mb-1 group-hover:scale-125 transition-transform" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-bloom-pink/60">Add Task</span>
                 </button>
               )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
