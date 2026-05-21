import { useEffect, useState } from "react";
import { useHabitStore } from "../store/useHabitStore.ts";
import { 
  Check, 
  Flame, 
  Plus, 
  Trash2,
  CalendarDays,
  Target,
  Trophy,
  Activity,
  Repeat
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { format } from "date-fns";
import { cn } from "../lib/utils.ts";
import { CardSkeleton } from "../components/Skeleton.tsx";

export default function Habits() {
  const { habits, fetchHabits, addHabit, logHabit, deleteHabit, isLoading } = useHabitStore();
  const [showAdd, setShowAdd] = useState(false);
  const [newHabit, setNewHabit] = useState({ title: "", frequency: "DAILY" as const, points: 5 });

  useEffect(() => {
    fetchHabits();
  }, [fetchHabits]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await addHabit(newHabit);
    setNewHabit({ title: "", frequency: "DAILY", points: 5 });
    setShowAdd(false);
  };

  const isCompletedToday = (habit: any) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return habit.logs?.some((log: any) => format(new Date(log.completedAt), 'yyyy-MM-dd') === today);
  };

  const calculateStreak = (habit: any) => {
    if (!habit.logs || habit.logs.length === 0) return 0;
    
    // Create a set of formatted dates that have logs
    const loggedDates = new Set(
      habit.logs.map((log: any) => format(new Date(log.completedAt), 'yyyy-MM-dd'))
    );
    
    let streak = 0;
    let checkDate = new Date(); // Start checking from today
    
    const todayStr = format(checkDate, 'yyyy-MM-dd');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = format(yesterday, 'yyyy-MM-dd');
    
    // If there is no log for today and no log for yesterday, then streak is 0
    if (!loggedDates.has(todayStr) && !loggedDates.has(yesterdayStr)) {
      return 0;
    }
    
    // If there is no log today but there is yesterday, start checking backwards from yesterday
    if (!loggedDates.has(todayStr)) {
      checkDate = yesterday;
    }
    
    // Count consecutive days going backwards
    while (true) {
      const formatted = format(checkDate, 'yyyy-MM-dd');
      if (loggedDates.has(formatted)) {
        streak++;
        // Go to previous day
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  };

  const completionRate = habits.length > 0 
    ? (habits.filter(h => isCompletedToday(h)).length / habits.length) * 100 
    : 0;

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-20">
      {/* Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-bloom-purple rounded-[2.5rem] p-8 text-white shadow-xl shadow-bloom-purple/20 relative overflow-hidden">
          <div className="relative z-10">
            <Target className="w-8 h-8 mb-4 opacity-80" />
            <h3 className="text-4xl font-black mb-1">{Math.round(completionRate)}%</h3>
            <p className="text-sm font-bold opacity-70 uppercase tracking-widest">Rituals Completed Today</p>
          </div>
          <div className="absolute -right-4 -bottom-4 text-9xl font-black opacity-10">%</div>
        </div>
        <div className="bg-bloom-green rounded-[2.5rem] p-8 text-bloom-dark-green shadow-xl shadow-bloom-green/20 relative overflow-hidden">
          <div className="relative z-10">
            <Trophy className="w-8 h-8 mb-4 opacity-80" />
            <h3 className="text-4xl font-black mb-1">{habits.length}</h3>
            <p className="text-sm font-bold opacity-70 uppercase tracking-widest">Active Rituals</p>
          </div>
          <div className="absolute -right-4 -bottom-4 text-9xl font-black opacity-10">
            <Activity className="w-24 h-24" />
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center px-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Your Rituals</h2>
          <p className="text-slate-400 font-medium">Small wins lead to big changes.</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)}
          className="bg-white text-bloom-pink font-bold px-6 py-3 rounded-2xl shadow-sm border border-bloom-pink/10 hover:shadow-md transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> New Habit
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bloom-card p-10 border-4 border-bloom-pink/10 shadow-2xl relative"
          >
            <form onSubmit={handleAdd} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="block text-xs font-black uppercase tracking-[0.2em] text-bloom-pink">The Goal</label>
                  <input 
                    autoFocus
                    required
                    className="w-full text-2xl font-bold bg-transparent border-b-2 border-slate-100 focus:border-bloom-pink outline-none pb-2 transition-all placeholder:text-slate-200"
                    placeholder="Waking up at 6am..."
                    value={newHabit.title}
                    onChange={e => setNewHabit({...newHabit, title: e.target.value})}
                  />
                </div>
                <div className="space-y-4">
                  <label className="block text-xs font-black uppercase tracking-[0.2em] text-bloom-pink">Frequency</label>
                  <select 
                    className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-600 outline-none hover:bg-slate-100 transition-colors"
                    value={newHabit.frequency}
                    onChange={e => setNewHabit({...newHabit, frequency: e.target.value as any})}
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-4 border-t border-slate-50 pt-8">
                <button 
                  type="button" 
                  onClick={() => setShowAdd(false)}
                  className="px-8 py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors"
                >
                  Later
                </button>
                <button 
                  type="submit" 
                  disabled={newHabit.title.trim().length === 0}
                  className="bg-bloom-pink text-white font-bold px-10 py-3 rounded-2xl shadow-lg shadow-bloom-pink/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all cursor-pointer"
                >
                  Start Ritual
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          <>
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </>
        ) : habits.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center text-center p-12 bg-white rounded-[3rem] border border-bloom-pink/10 max-w-lg mx-auto shadow-sm">
            <Repeat className="w-16 h-16 text-bloom-pink mb-4 animate-[spin_6s_linear_infinite]" />
            <h3 className="text-xl font-bold text-slate-800 mb-2">No habits yet</h3>
            <p className="text-sm text-slate-400 mb-6">Build your first daily habit to gain structure and routine.</p>
            <button 
              type="button"
              onClick={() => setShowAdd(true)}
              className="px-6 py-3 bg-bloom-pink text-white font-black rounded-2xl shadow-lg shadow-bloom-pink/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
            >
              Add Habit
            </button>
          </div>
        ) : habits.map((habit) => {
          const completed = isCompletedToday(habit);
          const streak = calculateStreak(habit);
          return (
            <motion.div 
              layout
              key={habit.id}
              className={cn(
                "bloom-card p-8 group transition-all relative overflow-hidden border-2",
                completed 
                  ? "bg-white border-bloom-green/30" 
                  : "bg-white border-white hover:border-bloom-pink/20"
              )}
            >
              <div className="flex flex-col h-full gap-6 relative z-10">
                <div className="flex justify-between items-start">
                   <div className={cn(
                     "w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm",
                     completed ? "bg-bloom-green text-white" : "bg-bloom-bg text-bloom-pink"
                   )}>
                     <Target className="w-7 h-7" />
                   </div>
                   <div className="flex gap-2">
                     <button 
                       onClick={() => deleteHabit(habit.id)}
                       className="p-2 text-slate-200 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                     >
                       <Trash2 className="w-5 h-5" />
                     </button>
                   </div>
                </div>

                <div>
                  <h4 className={cn("text-xl font-black tracking-tight mb-2", completed ? "text-slate-400 line-through" : "text-slate-800")}>
                    {habit.title}
                  </h4>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-full border border-transparent">
                      <CalendarDays className="w-3 h-3" /> {habit.frequency}
                    </span>
                    {/* Streak indicator removed */}
                  </div>
                </div>

                <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-50">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Ritual</span>
                    <span className="text-sm font-bold text-slate-500">Scheduled</span>
                  </div>
                  <button 
                    onClick={() => !completed && logHabit(habit.id)}
                    disabled={completed}
                    className={cn(
                      "px-8 py-3 rounded-2xl font-black text-sm transition-all shadow-md active:scale-95",
                      completed 
                        ? "bg-bloom-green-light text-bloom-dark-green shadow-none cursor-default" 
                        : "bg-bloom-pink text-white hover:brightness-105"
                    )}
                  >
                    {completed ? "Completed!" : "Done Today"}
                  </button>
                </div>
              </div>

              {completed && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.05 }}
                  className="absolute right-0 bottom-0 pointer-events-none"
                >
                  <Check className="w-48 h-48 -mr-12 -mb-12" />
                </motion.div>
              )}
            </motion.div>
          );
        })}

        {habits.length === 0 && !showAdd && !isLoading && (
          <div className="md:col-span-2 py-20 text-center bg-white/40 rounded-[4rem] border-4 border-dashed border-white/60">
             <div className="w-24 h-24 bg-white rounded-full grid place-items-center mx-auto mb-6 shadow-xl shadow-bloom-pink/10">
                <Target className="w-10 h-10 text-bloom-pink" />
             </div>
             <h3 className="text-2xl font-black text-slate-800">No rituals yet</h3>
             <p className="text-slate-400 font-medium max-w-sm mx-auto mt-2">
               Bloom starts with the small habits you keep every day. What's your first goal?
             </p>
             <button 
               onClick={() => setShowAdd(true)}
               className="mt-8 bg-bloom-pink text-white font-black px-10 py-4 rounded-3xl shadow-xl shadow-bloom-pink/20 hover:scale-105 transition-all"
             >
               Create First Habit
             </button>
          </div>
        )}
      </div>
    </div>
  );
}
