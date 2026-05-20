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
  subMonths,
  parseISO
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays, Plus, X, Globe, Calendar as CalendarIcon, Clock, AlignLeft, Check, Trash2 } from "lucide-react";
import { useEventStore, Event as AppEvent } from "../store/useEventStore.ts";
import { useTaskStore } from "../store/useTaskStore.ts";
import { clsx } from "clsx";
import api from "../api/axios.ts";
import { motion, AnimatePresence } from "motion/react";

export default function Calendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { events, fetchEvents, createEvent, updateEvent, deleteEvent, isLoading: eventsLoading } = useEventStore();
  const { tasks, fetchTasks, isLoading: tasksLoading } = useTaskStore();
  
  // Google Calendar Connection Status
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // Modal view for showing/editing/deleting an event
  const [viewingEvent, setViewingEvent] = useState<AppEvent | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [allDay, setAllDay] = useState(false);
  const [syncToGoogle, setSyncToGoogle] = useState(true);

  useEffect(() => {
    fetchEvents();
    fetchTasks();
    checkGoogleConnection();
  }, [fetchEvents, fetchTasks]);

  const checkGoogleConnection = async () => {
    try {
      const { data } = await api.get("/calendar/status");
      setIsGoogleConnected(!!data.data?.connected);
    } catch {
      setIsGoogleConnected(false);
    }
  };

  const days = eachDayOfInterval({
    start: startOfWeek(startOfMonth(currentMonth)),
    end: endOfWeek(endOfMonth(currentMonth)),
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const openAddModal = (date: Date) => {
    setSelectedDay(date);
    setEventDate(format(date, "yyyy-MM-dd"));
    setTitle("");
    setDescription("");
    setStartTime("09:00");
    setEndTime("10:00");
    setAllDay(false);
    setSyncToGoogle(isGoogleConnected);
    setViewingEvent(null);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openViewModal = (event: AppEvent) => {
    setViewingEvent(event);
    setTitle(event.title);
    setDescription(event.description || "");
    const sDate = new Date(event.startTime);
    setEventDate(format(sDate, "yyyy-MM-dd"));
    setStartTime(format(sDate, "HH:mm"));
    if (event.endTime) {
      setEndTime(format(new Date(event.endTime), "HH:mm"));
    } else {
      setEndTime("");
    }
    setAllDay(event.allDay);
    setSyncToGoogle(isGoogleConnected);
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // construct ISO dates
    const startISO = allDay 
      ? new Date(`${eventDate}T00:00:00`).toISOString()
      : new Date(`${eventDate}T${startTime || "00:00"}:00`).toISOString();

    const endISO = allDay
      ? new Date(`${eventDate}T23:59:59`).toISOString()
      : endTime 
        ? new Date(`${eventDate}T${endTime || "00:00"}:00`).toISOString()
        : new Date(new Date(`${eventDate}T${startTime || "00:00"}:00`).getTime() + 60 * 60 * 1000).toISOString();

    const payload = {
      title,
      description,
      startTime: startISO,
      endTime: endISO,
      allDay,
      syncToGoogle: syncToGoogle && isGoogleConnected
    };

    try {
      if (viewingEvent) {
        await updateEvent(viewingEvent.id, payload);
      } else {
        await createEvent(payload);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this event?")) {
      try {
        await deleteEvent(id);
        setIsModalOpen(false);
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="space-y-8 relative">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-3xl shadow-sm border border-bloom-pink/10 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <p className="text-slate-400">Plan your events and view your tasks inline.</p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-500">
            <span className="w-3 h-3 rounded bg-sky-100 border border-sky-200 inline-block"></span>
            Events
          </div>
          <div className="flex items-center gap-1.5 font-bold text-slate-500">
            <span className="w-3 h-3 rounded bg-bloom-pink-light border border-bloom-pink/20 inline-block"></span>
            Tasks
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            type="button"
            onClick={() => openAddModal(new Date())}
            className="p-3 bg-bloom-pink text-white rounded-2xl hover:bg-bloom-pink/90 font-bold text-sm tracking-wide transition-all shadow-md shadow-bloom-pink/20 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Event
          </button>
          <button onClick={prevMonth} className="p-3 bg-bloom-bg rounded-2xl hover:bg-bloom-pink-light text-bloom-pink transition-all">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button onClick={nextMonth} className="p-3 bg-bloom-bg rounded-2xl hover:bg-bloom-pink-light text-bloom-pink transition-all">
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] shadow-sm border border-bloom-pink/10 overflow-hidden relative">
        {(eventsLoading || tasksLoading) && (
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center z-10">
            <div className="animate-pulse flex space-x-2">
              <div className="w-3 h-3 bg-bloom-pink rounded-full"></div>
              <div className="w-3 h-3 bg-bloom-pink rounded-full"></div>
              <div className="w-3 h-3 bg-bloom-pink rounded-full"></div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-7 border-b border-bloom-pink/10 bg-bloom-bg/30">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="py-4 text-center text-[10px] font-black uppercase tracking-[0.2em] text-bloom-pink/60">
              {day}
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 relative">
          {days.map((day) => {
            const dayEvents = events.filter(e => e.startTime && isSameDay(new Date(e.startTime), day));
            const dayTasks = tasks.filter(t => t.dueDate && isSameDay(new Date(t.dueDate), day));
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentMonth);

            return (
              <div 
                key={day.toString()} 
                onClick={() => openAddModal(day)}
                className={clsx(
                  "min-h-[140px] p-2 border-r border-b border-bloom-pink/5 transition-all hover:bg-bloom-bg/30 cursor-pointer group flex flex-col justify-between",
                  !isCurrentMonth && "bg-slate-50/30 opacity-40"
                )}
              >
                <div className="flex flex-col h-full gap-2 justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className={clsx(
                        "text-sm font-black flex items-center justify-center w-7 h-7 rounded-xl transition-all",
                        isToday ? "bg-bloom-pink text-white shadow-lg shadow-bloom-pink/20" : "text-slate-400 group-hover:text-bloom-pink"
                      )}>
                        {format(day, 'd')}
                      </span>
                      {(dayEvents.length > 0 || dayTasks.length > 0) && (
                        <div className="flex gap-1">
                          {dayEvents.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.6)]" />}
                          {dayTasks.length > 0 && <span className="w-1.5 h-1.5 rounded-full bg-bloom-pink shadow-[0_0_6px_rgba(249,168,201,0.6)]" />}
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-1">
                      {/* Events listed first */}
                      {dayEvents.map(evt => (
                        <div 
                          key={evt.id} 
                          onClick={(e) => {
                            e.stopPropagation();
                            openViewModal(evt);
                          }}
                          className="text-[10px] font-black uppercase tracking-wider px-2 py-1.5 rounded-xl bg-blue-50/80 text-blue-600 hover:bg-blue-100/90 transition-all border border-blue-100/30 truncate"
                        >
                          {evt.allDay ? "• " : `${format(new Date(evt.startTime), "HH:mm")} `}{evt.title}
                        </div>
                      ))}

                      {/* Tasks listed second */}
                      {dayTasks.map(task => (
                        <div 
                          key={task.id} 
                          onClick={(e) => {
                            e.stopPropagation();
                            // Tasks are read-only inline date markers
                          }}
                          className={clsx(
                            "text-[10px] font-black uppercase tracking-wider px-2 py-1.5 rounded-xl transition-all border border-pink-100/10 truncate",
                            task.status === "DONE" 
                              ? "bg-slate-50 text-slate-300 line-through decoration-slate-200" 
                              : "bg-bloom-pink-light/70 text-bloom-pink"
                          )}
                          title={`Task: ${task.title} (${task.status})`}
                        >
                          ✓ {task.title}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="opacity-0 group-hover:opacity-100 self-end text-[9px] font-black uppercase tracking-widest text-bloom-pink transition-all">
                    + Add Event
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {events.filter(e => isSameMonth(new Date(e.startTime), currentMonth)).length + 
       tasks.filter(t => t.dueDate && isSameMonth(new Date(t.dueDate), currentMonth)).length === 0 && 
       !eventsLoading && !tasksLoading && (
        <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 rounded-[2rem] border border-[#fce7f3]/60 max-w-xl mx-auto">
          <CalendarDays className="w-10 h-10 text-bloom-pink/50 mb-3" />
          <h4 className="text-sm font-black text-slate-700 uppercase tracking-wider mb-1">No events this month</h4>
          <p className="text-xs text-slate-400 mb-4">Create your first event or connect your Google Calendar in Settings.</p>
          <button 
            type="button"
            onClick={() => openAddModal(new Date())}
            className="px-4 py-2 bg-bloom-pink text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-sm hover:bg-bloom-pink/90 transition-all cursor-pointer"
          >
            New Event
          </button>
        </div>
      )}

      {/* New / View / Edit Event Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-white rounded-[2.5rem] border-none relative z-10 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-bloom-bg/30">
                <h2 className="text-xl font-bold text-slate-800">
                  {viewingEvent 
                    ? (isEditing ? "Edit Event" : "Event Details") 
                    : "Create Event"}
                </h2>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* View mode */}
              {viewingEvent && !isEditing ? (
                <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
                  <div className="space-y-2">
                    <span className="text-[10px] font-black tracking-widest uppercase text-blue-500 bg-blue-50 px-3 py-1 rounded-full">
                      {viewingEvent.allDay ? "All-Day Event" : "Scheduled Event"}
                    </span>
                    {viewingEvent.isFromGoogle && (
                      <span className="ml-2 text-[10px] font-black tracking-widest uppercase text-teal-600 bg-teal-50 px-3 py-1 rounded-full inline-flex items-center gap-1">
                        <Globe className="w-3 h-3" /> Google Calendar
                      </span>
                    )}
                    <h3 className="text-2xl font-black text-slate-800 mt-2">{viewingEvent.title}</h3>
                  </div>

                  {viewingEvent.description && (
                    <div className="flex gap-3 items-start text-slate-500">
                      <AlignLeft className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0" />
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{viewingEvent.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                    <div className="flex gap-3 items-center text-slate-500 text-sm font-bold">
                      <CalendarIcon className="w-4 h-4 text-slate-400" />
                      <span>{format(new Date(viewingEvent.startTime), "PP")}</span>
                    </div>

                    {!viewingEvent.allDay && (
                      <div className="flex gap-3 items-center text-slate-500 text-sm font-bold">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>
                          {format(new Date(viewingEvent.startTime), "p")} 
                          {viewingEvent.endTime ? ` - ${format(new Date(viewingEvent.endTime), "p")}` : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100/50 mt-4">
                    <span className="text-[10px] font-black tracking-widest uppercase text-slate-400">Created At</span>
                    <span className="text-xs text-slate-500">{format(new Date(viewingEvent.createdAt), "PP")}</span>
                  </div>

                  <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
                    <button
                      type="button"
                      onClick={() => handleDelete(viewingEvent.id)}
                      className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 font-bold text-sm tracking-wide transition-all flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                    {!viewingEvent.isFromGoogle && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(true)}
                        className="p-3 bg-bloom-pink text-white rounded-2xl hover:bg-bloom-pink/90 font-bold text-sm tracking-wide transition-all flex-1"
                      >
                        Edit Details
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* Edit/Add Form mode */
                <form onSubmit={handleSave} className="p-6 sm:p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                  <div className="space-y-4">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">What is the event title?</label>
                    <input 
                      type="text"
                      autoFocus
                      required
                      className="w-full text-xl font-bold border-none outline-none placeholder:text-slate-200 bg-transparent"
                      placeholder="Event title..."
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Description (Optional)</label>
                    <textarea 
                      className="w-full bg-slate-50 rounded-2xl p-4 outline-none text-sm text-slate-600 min-h-[100px] resize-none border border-transparent focus:border-bloom-pink/20 transition-all"
                      placeholder="Event details..."
                      value={description}
                      onChange={e => setDescription(e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-4">
                       <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Date</label>
                       <input 
                         type="date"
                         required
                         className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-600 outline-none hover:bg-slate-100 transition-colors"
                         value={eventDate}
                         onChange={e => setEventDate(e.target.value)}
                       />
                    </div>
                    
                    {!allDay && (
                      <>
                        <div className="space-y-4">
                           <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Start Time</label>
                           <input 
                             type="time"
                             required
                             className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-600 outline-none hover:bg-slate-100 transition-colors"
                             value={startTime}
                             onChange={e => setStartTime(e.target.value)}
                           />
                        </div>
                        <div className="space-y-4">
                           <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">End Time</label>
                           <input 
                             type="time"
                             required
                             className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-600 outline-none hover:bg-slate-100 transition-colors"
                             value={endTime}
                             onChange={e => setEndTime(e.target.value)}
                           />
                        </div>
                      </>
                    )}
                  </div>

                  {/* All day toggle */}
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/65">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-700 block">All-Day Event</span>
                        <span className="text-[10px] text-slate-400">Takes up the entire day</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={allDay}
                        onChange={e => setAllDay(e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                    </label>
                  </div>

                  {/* Sync to Google Calendar Toggle if Connected */}
                  {isGoogleConnected && (
                    <div className="flex items-center justify-between p-4 bg-bloom-pink-light/30 rounded-2xl border border-bloom-pink/10">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-bloom-pink flex items-center justify-center text-white">
                          <Globe className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-700 block">Google Calendar</span>
                          <span className="text-[10px] text-slate-400">Keep synced with your Google account</span>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={syncToGoogle}
                          onChange={e => setSyncToGoogle(e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bloom-pink"></div>
                      </label>
                    </div>
                  )}

                  <div className="flex gap-4 pt-6 border-t border-slate-50">
                    {viewingEvent && (
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="p-4 bg-slate-100 rounded-2xl text-slate-500 hover:bg-slate-200 font-bold text-sm tracking-wide transition-all duration-200 flex-1 text-center"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={title.trim().length === 0}
                      className="p-4 bg-bloom-pink text-white rounded-2xl hover:bg-bloom-pink/90 font-bold text-sm tracking-wide transition-all duration-200 flex-1 text-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-bloom-pink cursor-pointer"
                    >
                      {viewingEvent ? "Save Changes" : "Create Event"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
