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
import { calculateLevel, getLevelProgress, getPointsForLevel } from "../lib/levelUtils.ts";

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

  const currentLevel = calculateLevel(user?.points || 0);
  const nextLevel = currentLevel + 1;
  const progress = getLevelProgress(user?.points || 0);
  const pointsToNext = getPointsForLevel(nextLevel) - (user?.points || 0);

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
      {/* Top Banner Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-bloom-pink rounded-[2rem] p-6 sm:p-8 text-white shadow-md relative overflow-hidden flex flex-col justify-center min-h-[140px] sm:min-h-[160px]">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-black tracking-widest opacity-80 mb-1">Current Level</p>
                  <h4 className="text-3xl sm:text-4xl font-black">Level {currentLevel}</h4>
                </div>
                <div className="bg-white/20 p-2 sm:p-3 rounded-2xl backdrop-blur-md">
                  <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-[9px] sm:text-[10px] font-black uppercase tracking-widest leading-none">
                  <span>{user?.points || 0} XP</span>
                  <span>{pointsToNext} XP to Lvl {nextLevel}</span>
                </div>
                <div className="h-2 sm:h-3 w-full bg-black/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    className="h-full bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                  />
                </div>
              </div>
            </div>
            <div className="absolute -bottom-10 -right-10 text-[8rem] sm:text-[12rem] opacity-5 font-black leading-none pointer-events-none select-none">
              {currentLevel}
            </div>
         </div>
         <div className="bg-bloom-green rounded-[2rem] p-6 sm:p-8 text-bloom-dark-green shadow-md flex flex-col justify-center min-h-[140px] sm:min-h-[160px]">
           <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] uppercase font-black tracking-widest opacity-80 mb-1">Weekly Growth</p>
                <h4 className="text-xl sm:text-2xl font-bold">Flourishing</h4>
              </div>
              <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-bloom-dark-green opacity-40" />
           </div>
           <div className="flex items-end gap-1.5 sm:gap-2 h-12 sm:h-16 mt-2">
             {stats?.pointsHistory ? (
               stats.pointsHistory.map((day: any, i: number) => {
                 const maxPoints = Math.max(...stats.pointsHistory.map((d: any) => d.points), 10);
                 const height = (day.points / maxPoints) * 100;
                 return (
                   <div key={i} className="flex-1 flex flex-col items-center gap-1">
                     <div 
                       className={cn(
                         "w-full rounded-t-lg transition-all duration-500",
                         i === 6 ? "bg-bloom-dark-green" : "bg-bloom-dark-green/20"
                       )}
                       style={{ height: `${Math.max(height, 5)}%` }}
                     ></div>
                     <span className="text-[8px] font-bold opacity-40">{day.name[0]}</span>
                   </div>
                 );
               })
             ) : (
                <>
                  <div className="flex-1 bg-bloom-dark-green/10 rounded-t-lg h-12"></div>
                  <div className="flex-1 bg-bloom-dark-green/10 rounded-t-lg h-6"></div>
                  <div className="flex-1 bg-bloom-dark-green/10 rounded-t-lg h-16"></div>
                  <div className="flex-1 bg-bloom-dark-green/10 rounded-t-lg h-8"></div>
                  <div className="flex-1 bg-bloom-dark-green rounded-t-lg h-14"></div>
                  <div className="flex-1 bg-bloom-dark-green/20 rounded-t-lg h-10"></div>
                  <div className="flex-1 bg-bloom-dark-green/10 rounded-t-lg h-12"></div>
                </>
             )}
           </div>
         </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Left Column: Habits & Badges */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <section className="bloom-card p-6 flex-1">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-gray-700">Daily Habits</h3>
              <span className="text-xs text-bloom-green font-bold px-2 py-1 bg-bloom-green-light rounded-lg">+50 pts</span>
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
                      {isLoggedToday ? "Done" : `+${habit.points}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="bloom-card p-6 min-h-[160px]">
             <h3 className="font-bold text-gray-700 mb-4 text-sm">Achievement Badges</h3>
             <div className="flex flex-wrap gap-4">
               {currentLevel >= 1 && (
                 <div className="flex flex-col items-center gap-1">
                   <div className="w-12 h-12 rounded-full bg-bloom-pink-light flex items-center justify-center text-xl shadow-sm border border-white" title="Seedling: Reach Level 1">🌱</div>
                   <span className="text-[10px] font-bold text-slate-400">Lvl 1</span>
                 </div>
               )}
               {currentLevel >= 5 ? (
                 <div className="flex flex-col items-center gap-1">
                   <div className="w-12 h-12 rounded-full bg-bloom-green-light flex items-center justify-center text-xl shadow-sm border border-white" title="Sprout: Reach Level 5">🌿</div>
                   <span className="text-[10px] font-bold text-slate-400">Lvl 5</span>
                 </div>
               ) : (
                 <div className="flex flex-col items-center gap-1 opacity-20 grayscale">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-xl shadow-sm border border-white">🔒</div>
                    <span className="text-[10px] font-bold text-slate-300">Lvl 5</span>
                 </div>
               )}
               {currentLevel >= 10 ? (
                 <div className="flex flex-col items-center gap-1">
                   <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center text-xl shadow-sm border border-white" title="Bloomed: Reach Level 10">🌸</div>
                   <span className="text-[10px] font-bold text-slate-400">Lvl 10</span>
                 </div>
               ) : (
                 <div className="flex flex-col items-center gap-1 opacity-20 grayscale">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-xl shadow-sm border border-white">🔒</div>
                    <span className="text-[10px] font-bold text-slate-300">Lvl 10</span>
                 </div>
               )}
               {currentLevel >= 20 ? (
                 <div className="flex flex-col items-center gap-1 border-2 border-yellow-400 rounded-full p-0.5">
                   <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-xl shadow-sm border border-white" title="Master Gardener: Reach Level 20">👑</div>
                   <span className="text-[10px] font-black text-yellow-600">Lvl 20</span>
                 </div>
               ) : (
                 <div className="flex flex-col items-center gap-1 opacity-20 grayscale">
                    <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-xl shadow-sm border border-white">🔒</div>
                    <span className="text-[10px] font-bold text-slate-300">Lvl 20</span>
                 </div>
               )}
             </div>
          </section>
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
                 <div className="col-span-full py-12 flex flex-col items-center justify-center text-center bg-bloom-bg/30 rounded-[2rem] border-2 border-dashed border-bloom-pink/10">
                    <Flower className="w-12 h-12 text-bloom-pink/20 mb-3" />
                    <p className="text-slate-400 font-medium italic">No tasks blooming yet!</p>
                    <button onClick={openAddModal} className="mt-4 bloom-btn-primary px-6 py-2 text-sm">Add First Task</button>
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
                       <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">+{task.points} pts</span>
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
