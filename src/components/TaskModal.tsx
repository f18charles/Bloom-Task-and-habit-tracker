import { useState, useEffect } from "react";
import { X, Calendar, Check, Trash2, Plus, ChevronDown, ChevronRight, CornerDownRight, Layers, Loader2, CheckCircle2 } from "lucide-react";
import { useTaskStore, Task, SubtaskLevel2, SubtaskLevel3 } from "../store/useTaskStore.ts";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils.ts";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task?: Task | null;
  defaultStatus?: string;
}

export default function TaskModal({ isOpen, onClose, task, defaultStatus }: TaskModalProps) {
  const { addTask, updateTask } = useTaskStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "TODO" as "TODO" | "IN_PROGRESS" | "DONE",
    priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH" | "URGENT",
    dueDate: "",
    isRecurring: false,
    recurrenceRule: "DAILY" as "DAILY" | "WEEKLY" | "MONTHLY",
    points: 10,
    syncToGoogle: false
  });

  // 3-Level Subtask state:
  // Level 1 = Root Task (formData)
  // Level 2 = subtasks: SubtaskLevel2[]
  // Level 3 = subtask.subtasks: SubtaskLevel3[] (nested inside Level 2)
  const [subtasks, setSubtasks] = useState<SubtaskLevel2[]>([]);
  const [newLevel2Title, setNewLevel2Title] = useState("");
  const [expandedSubtasks, setExpandedSubtasks] = useState<Record<string, boolean>>({});
  const [newLevel3Inputs, setNewLevel3Inputs] = useState<Record<string, string>>({});

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority || "MEDIUM",
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
        isRecurring: !!task.isRecurring,
        recurrenceRule: task.recurrenceRule || "DAILY",
        points: task.points || 10,
        syncToGoogle: !!task.googleEventId
      });

      const initialSubtasks: SubtaskLevel2[] = Array.isArray(task.subtasks)
        ? task.subtasks.map((st2) => ({
            id: st2.id || Math.random().toString(36).substring(2, 9),
            title: st2.title,
            isCompleted: !!st2.isCompleted,
            createdAt: st2.createdAt,
            subtasks: Array.isArray(st2.subtasks)
              ? st2.subtasks.map((st3) => ({
                  id: st3.id || Math.random().toString(36).substring(2, 9),
                  title: st3.title,
                  isCompleted: !!st3.isCompleted,
                  createdAt: st3.createdAt
                }))
              : []
          }))
        : [];

      setSubtasks(initialSubtasks);
      // Auto expand any subtasks that have level 3 items
      const initialExpanded: Record<string, boolean> = {};
      initialSubtasks.forEach(s => {
        if (s.subtasks && s.subtasks.length > 0) {
          initialExpanded[s.id] = true;
        }
      });
      setExpandedSubtasks(initialExpanded);
    } else {
      setFormData({
        title: "",
        description: "",
        status: (defaultStatus as any) || "TODO",
        priority: "MEDIUM",
        dueDate: "",
        isRecurring: false,
        recurrenceRule: "DAILY",
        points: 10,
        syncToGoogle: false
      });
      setSubtasks([]);
      setExpandedSubtasks({});
      setNewLevel3Inputs({});
    }
  }, [task, defaultStatus, isOpen]);

  // Level 2 Subtask Actions
  const addLevel2Subtask = () => {
    if (!newLevel2Title.trim()) return;
    const newId = Math.random().toString(36).substring(2, 9);
    const newSubtask: SubtaskLevel2 = {
      id: newId,
      title: newLevel2Title.trim(),
      isCompleted: false,
      createdAt: new Date().toISOString(),
      subtasks: []
    };
    setSubtasks([...subtasks, newSubtask]);
    setNewLevel2Title("");
    setExpandedSubtasks(prev => ({ ...prev, [newId]: true }));
  };

  const toggleLevel2Subtask = (index: number) => {
    const updated = [...subtasks];
    const target = updated[index];
    const newCompleted = !target.isCompleted;
    target.isCompleted = newCompleted;
    
    // If completing level 2, also mark its level 3 children as completed
    if (target.subtasks && target.subtasks.length > 0) {
      target.subtasks = target.subtasks.map(s3 => ({ ...s3, isCompleted: newCompleted }));
    }
    setSubtasks(updated);
  };

  const removeLevel2Subtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const toggleExpandLevel2 = (id: string) => {
    setExpandedSubtasks(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Level 3 Subtask Actions (Micro-steps - strict max nesting level)
  const addLevel3Subtask = (level2Index: number, level2Id: string) => {
    const title = (newLevel3Inputs[level2Id] || "").trim();
    if (!title) return;

    const updated = [...subtasks];
    const target = updated[level2Index];
    if (!target.subtasks) target.subtasks = [];

    const newLevel3: SubtaskLevel3 = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      isCompleted: false,
      createdAt: new Date().toISOString()
    };

    target.subtasks.push(newLevel3);
    target.isCompleted = false; // reset level 2 completed if adding pending step
    setSubtasks(updated);
    setNewLevel3Inputs(prev => ({ ...prev, [level2Id]: "" }));
    setExpandedSubtasks(prev => ({ ...prev, [level2Id]: true }));
  };

  const toggleLevel3Subtask = (level2Index: number, level3Index: number) => {
    const updated = [...subtasks];
    const level2 = updated[level2Index];
    if (!level2.subtasks || !level2.subtasks[level3Index]) return;

    level2.subtasks[level3Index].isCompleted = !level2.subtasks[level3Index].isCompleted;
    
    // Check if all level 3 subtasks are complete
    const allL3Done = level2.subtasks.every(s3 => s3.isCompleted);
    level2.isCompleted = allL3Done;

    setSubtasks(updated);
  };

  const removeLevel3Subtask = (level2Index: number, level3Index: number) => {
    const updated = [...subtasks];
    const level2 = updated[level2Index];
    if (!level2.subtasks) return;
    level2.subtasks = level2.subtasks.filter((_, i) => i !== level3Index);
    setSubtasks(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || !formData.title.trim()) return;

    setIsSubmitting(true);
    try {
      const data = {
        ...formData,
        subtasks,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        isRecurring: formData.isRecurring,
        recurrenceRule: formData.isRecurring ? formData.recurrenceRule : undefined
      };

      if (task) {
        await updateTask(task.id, data as any);
      } else {
        await addTask(data as any);
      }
      onClose();
    } catch {
      // Errors handled by axios interceptor
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute total hierarchy progress
  let totalStepsCount = 0;
  let completedStepsCount = 0;
  subtasks.forEach(s2 => {
    if (s2.subtasks && s2.subtasks.length > 0) {
      s2.subtasks.forEach(s3 => {
        totalStepsCount++;
        if (s3.isCompleted) completedStepsCount++;
      });
    } else {
      totalStepsCount++;
      if (s2.isCompleted) completedStepsCount++;
    }
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bloom-card w-full max-w-xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50 shadow-2xl relative z-10 overflow-hidden max-h-[92vh] flex flex-col rounded-3xl"
          >
            {/* Header */}
            <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/80">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-bloom-pink/10 dark:bg-bloom-pink/20 text-bloom-pink flex items-center justify-center font-bold">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800 dark:text-white leading-tight">
                    {task ? "Edit Task" : "Create New Task"}
                  </h2>
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Supports 3-Level Nesting (Root &rarr; Subtask &rarr; Steps)
                  </span>
                </div>
              </div>
              <button 
                type="button"
                onClick={onClose} 
                className="p-2 hover:bg-slate-200/50 dark:hover:bg-slate-700 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
              {/* Level 1: Root Task Title */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">
                  Task Title (Level 1) <span className="text-bloom-pink">*</span>
                </label>
                <input 
                  autoFocus
                  required
                  className="w-full text-lg sm:text-xl font-bold border-b border-slate-200 dark:border-slate-700 pb-2 outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 bg-transparent text-slate-800 dark:text-white focus:border-bloom-pink transition-colors"
                  placeholder="What needs to be done?"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">
                  Description
                </label>
                <textarea 
                  className="w-full bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-3.5 outline-none text-sm text-slate-700 dark:text-slate-200 min-h-[75px] resize-none border border-slate-100 dark:border-slate-700/60 focus:border-bloom-pink/40 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                  placeholder="Add context, specifications or notes..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Priority & Due Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Priority
                  </label>
                  <select 
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl font-bold text-sm text-slate-700 dark:text-slate-200 outline-none border border-slate-100 dark:border-slate-700/60 focus:border-bloom-pink/40"
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Due Date
                  </label>
                  <input 
                    type="date"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl font-bold text-sm text-slate-700 dark:text-slate-200 outline-none border border-slate-100 dark:border-slate-700/60 focus:border-bloom-pink/40"
                    value={formData.dueDate}
                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Recurring & Sync Controls */}
              <div className="space-y-3">
                {/* Recurring Task toggle */}
                <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-700/40">
                  <div>
                    <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Recurring Task</p>
                    <p className="text-[10px] text-slate-400">Automatically repeat when completed</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {formData.isRecurring && (
                      <select
                        value={formData.recurrenceRule}
                        onChange={e => setFormData({ ...formData, recurrenceRule: e.target.value as any })}
                        className="text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 outline-none text-slate-700 dark:text-slate-300"
                      >
                        <option value="DAILY">Daily</option>
                        <option value="WEEKLY">Weekly</option>
                        <option value="MONTHLY">Monthly</option>
                      </select>
                    )}
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer"
                        checked={formData.isRecurring}
                        onChange={e => setFormData({ ...formData, isRecurring: e.target.checked })}
                      />
                      <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-bloom-pink"></div>
                    </label>
                  </div>
                </div>

                {/* Sync to Google Calendar */}
                <div className="flex items-center justify-between p-3.5 bg-bloom-pink-light/20 dark:bg-bloom-pink/10 rounded-2xl border border-bloom-pink/15">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-bloom-pink flex items-center justify-center text-white">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-bloom-pink">Sync to Google Calendar</p>
                      <p className="text-[10px] text-bloom-pink/70">Reflects in connected Google calendar</p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={formData.syncToGoogle}
                      onChange={e => setFormData({ ...formData, syncToGoogle: e.target.checked })}
                    />
                    <div className="w-10 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-bloom-pink"></div>
                  </label>
                </div>
              </div>

              {/* 3-Level Subtasks Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-400">
                      Subtasks (Levels 2 & 3)
                    </label>
                    {totalStepsCount > 0 && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        {completedStepsCount}/{totalStepsCount} completed
                      </span>
                    )}
                  </div>
                </div>

                {/* Subtask list */}
                <div className="space-y-3">
                  {subtasks.map((st2, i2) => {
                    const isExpanded = !!expandedSubtasks[st2.id];
                    const level3Count = st2.subtasks?.length || 0;
                    const level3Completed = st2.subtasks?.filter(s3 => s3.isCompleted).length || 0;

                    return (
                      <div 
                        key={st2.id || i2} 
                        className="border border-slate-200 dark:border-slate-700/70 rounded-2xl p-3 bg-white dark:bg-slate-900/40 shadow-xs space-y-2.5 transition-all"
                      >
                        {/* Level 2 Item Row */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => toggleLevel2Subtask(i2)}
                              className={cn(
                                "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 cursor-pointer",
                                st2.isCompleted 
                                  ? "bg-bloom-pink border-bloom-pink text-white" 
                                  : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:border-bloom-pink"
                              )}
                            >
                              {st2.isCompleted && <Check className="w-3 h-3 stroke-[3]" />}
                            </button>

                            <span className={cn(
                              "text-sm font-semibold text-slate-800 dark:text-slate-200 truncate",
                              st2.isCompleted && "text-slate-400 dark:text-slate-500 line-through opacity-60"
                            )}>
                              {st2.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Toggle micro-steps */}
                            <button
                              type="button"
                              onClick={() => toggleExpandLevel2(st2.id)}
                              className="text-[10px] font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center gap-1 transition-colors cursor-pointer"
                              title="Toggle Level 3 steps"
                            >
                              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">L3</span>
                              <span>{level3Completed}/{level3Count}</span>
                              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            </button>

                            {/* Delete Level 2 item */}
                            <button 
                              type="button"
                              onClick={() => removeLevel2Subtask(i2)}
                              className="p-1.5 text-slate-300 hover:text-red-500 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                              title="Remove subtask"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Level 3 Micro-steps / Checklist (Strict Max Nesting Level) */}
                        {isExpanded && (
                          <div className="pl-6 pt-1 space-y-2 border-t border-slate-100 dark:border-slate-800/80">
                            {st2.subtasks && st2.subtasks.map((st3, i3) => (
                              <div key={st3.id || i3} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-slate-50/80 dark:bg-slate-800/50">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <CornerDownRight className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                                  <button
                                    type="button"
                                    onClick={() => toggleLevel3Subtask(i2, i3)}
                                    className={cn(
                                      "w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 cursor-pointer",
                                      st3.isCompleted 
                                        ? "bg-bloom-pink border-bloom-pink text-white" 
                                        : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                                    )}
                                  >
                                    {st3.isCompleted && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                  </button>
                                  <span className={cn(
                                    "text-xs text-slate-700 dark:text-slate-300 truncate",
                                    st3.isCompleted && "text-slate-400 dark:text-slate-500 line-through opacity-60"
                                  )}>
                                    {st3.title}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeLevel3Subtask(i2, i3)}
                                  className="p-1 text-slate-300 hover:text-red-500 rounded transition-colors cursor-pointer"
                                  title="Remove step"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            ))}

                            {/* Add Level 3 item input (No further nesting permitted beyond Level 3) */}
                            <div className="flex gap-2 pt-1 items-center">
                              <CornerDownRight className="w-3.5 h-3.5 text-bloom-pink/60 shrink-0" />
                              <input 
                                type="text"
                                className="flex-1 bg-slate-50 dark:bg-slate-800/80 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-bloom-pink text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                                placeholder="Add micro-step (Level 3)..."
                                value={newLevel3Inputs[st2.id] || ""}
                                onChange={e => setNewLevel3Inputs({ ...newLevel3Inputs, [st2.id]: e.target.value })}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    addLevel3Subtask(i2, st2.id);
                                  }
                                }}
                              />
                              <button 
                                type="button"
                                onClick={() => addLevel3Subtask(i2, st2.id)}
                                className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-bloom-pink hover:text-white rounded-xl text-slate-500 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Add Level 2 Subtask input */}
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      className="flex-1 bg-slate-50 dark:bg-slate-900/50 rounded-xl px-4 py-2.5 text-sm outline-none border border-slate-100 dark:border-slate-700/60 focus:border-bloom-pink text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
                      placeholder="Add a subtask (Level 2)..."
                      value={newLevel2Title}
                      onChange={e => setNewLevel2Title(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addLevel2Subtask();
                        }
                      }}
                    />
                    <button 
                      type="button"
                      onClick={addLevel2Subtask}
                      className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-bloom-pink hover:text-white rounded-xl text-slate-600 dark:text-slate-300 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Subtask</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit button */}
              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={formData.title.trim().length === 0 || isSubmitting}
                  className="w-full bg-bloom-pink text-white font-black py-3.5 rounded-2xl shadow-lg shadow-bloom-pink/20 hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{task ? "Saving Changes..." : "Creating Task..."}</span>
                    </>
                  ) : (
                    <span>{task ? "Save Changes" : "Create Task"}</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
