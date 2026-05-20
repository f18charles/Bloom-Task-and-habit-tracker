import { useEffect, useState } from "react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths 
} from "date-fns";
import { ChevronLeft, ChevronRight, Flower } from "lucide-react";
import { useTaskStore } from "../store/useTaskStore.ts";
import { clsx } from "clsx";

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { tasks, fetchTasks } = useTaskStore();

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth)),
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl shadow-sm border border-bloom-pink/10">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <p className="text-slate-400">Plan your journey ahead.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-3 bg-bloom-bg rounded-2xl hover:bg-bloom-pink-light text-bloom-pink transition-all">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button onClick={nextMonth} className="p-3 bg-bloom-bg rounded-2xl hover:bg-bloom-pink-light text-bloom-pink transition-all">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-bloom-pink/10 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-bloom-pink/10 bg-bloom-bg/30">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-bloom-pink/60">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7">
          {days.map((day, idx) => {
            const dayTasks = tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), day));
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentMonth);

            return (
              <div 
                key={day.toString()} 
                className={clsx(
                  "min-h-[140px] p-3 border-r border-b border-bloom-pink/5 transition-all hover:bg-bloom-bg/40 cursor-pointer group",
                  !isCurrentMonth && "bg-slate-50/50 opacity-40"
                )}
              >
                <div className="flex flex-col h-full gap-2">
                  <div className="flex justify-between items-start">
                    <span className={clsx(
                      "text-xl font-bold flex items-center justify-center w-8 h-8 rounded-xl",
                      isToday ? "bg-bloom-pink text-white shadow-lg shadow-bloom-pink/20" : "text-slate-300"
                    )}>
                      {format(day, 'd')}
                    </span>
                    {dayTasks.length > 0 && (
                      <div className="w-2 h-2 rounded-full bg-bloom-pink shadow-[0_0_8px_rgba(249,168,201,0.6)]" />
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-1">
                    {dayTasks.map(task => (
                      <div 
                        key={task.id} 
                        className={clsx(
                          "text-[10px] font-bold px-2 py-1 rounded-lg truncate",
                          task.status === "DONE" ? "bg-slate-100 text-slate-300 line-through" : "bg-bloom-pink-light text-bloom-pink"
                        )}
                      >
                        {task.title}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
