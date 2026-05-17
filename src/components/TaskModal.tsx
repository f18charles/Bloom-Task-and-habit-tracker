import { useState, useEffect } from "react";
import { X, Calendar, Check, Trash2, Plus } from "lucide-react";
import { useTaskStore, Task } from "../store/useTaskStore.ts";
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
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "TODO" as "TODO" | "IN_PROGRESS" | "DONE",
    priority: "MEDIUM" as "LOW" | "MEDIUM" | "HIGH",
    dueDate: "",
    syncToGoogle: false
  });

  const [subtasks, setSubtasks] = useState<{title: string, isCompleted: boolean}[]>([]);
  const [newSubtask, setNewSubtask] = useState("");

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
        syncToGoogle: !!task.googleEventId
      });
      setSubtasks(task.subtasks.map(s => ({ title: s.title, isCompleted: s.isCompleted })));
    } else {
      setFormData({
        title: "",
        description: "",
        status: (defaultStatus as any) || "TODO",
        priority: "MEDIUM",
        dueDate: "",
        syncToGoogle: false
      });
      setSubtasks([]);
    }
  }, [task, defaultStatus, isOpen]);

  const addLocalSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks([...subtasks, { title: newSubtask.trim(), isCompleted: false }]);
    setNewSubtask("");
  };

  const toggleSubtask = (index: number) => {
    const updated = [...subtasks];
    updated[index].isCompleted = !updated[index].isCompleted;
    setSubtasks(updated);
  };

  const removeSubtask = (index: number) => {
    setSubtasks(subtasks.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      subtasks,
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined
    };

    if (task) {
      await updateTask(task.id, data as any);
    } else {
      await addTask(data as any);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bloom-card w-full max-w-lg bg-white relative z-10 overflow-hidden"
          >
            <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-bloom-bg/30">
              <h2 className="text-xl font-bold text-gray-800">{task ? "Edit Task" : "New Task"}</h2>
              <button onClick={onClose} className="p-2 hover:bg-white rounded-xl text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div className="space-y-4">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">What needs to be done?</label>
                <input 
                  autoFocus
                  required
                  className="w-full text-xl font-bold border-none outline-none placeholder:text-slate-200"
                  placeholder="Task title..."
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Description (Optional)</label>
                <textarea 
                  className="w-full bg-slate-50 rounded-2xl p-4 outline-none text-sm text-slate-600 min-h-[100px] resize-none"
                  placeholder="Add more details..."
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                   <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Priority</label>
                   <select 
                     className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-600 outline-none"
                     value={formData.priority}
                     onChange={e => setFormData({...formData, priority: e.target.value as any})}
                   >
                     <option value="LOW">Low</option>
                     <option value="MEDIUM">Medium</option>
                     <option value="HIGH">High</option>
                   </select>
                </div>
                <div className="space-y-4">
                   <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Due Date</label>
                   <input 
                     type="date"
                     className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-slate-600 outline-none"
                     value={formData.dueDate}
                     onChange={e => setFormData({...formData, dueDate: e.target.value})}
                   />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-bloom-pink-light/30 rounded-2xl border border-bloom-pink/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-bloom-pink flex items-center justify-center text-white">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-bloom-pink">Sync to Google Calendar</p>
                    <p className="text-[10px] text-bloom-pink/60">Requires connected account</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={formData.syncToGoogle}
                    onChange={e => setFormData({...formData, syncToGoogle: e.target.checked})}
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-bloom-pink"></div>
                </label>
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Subtasks</label>
                <div className="space-y-3">
                  {subtasks.map((st, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group/st">
                      <div className="flex items-center gap-3">
                        <button 
                          type="button"
                          onClick={() => toggleSubtask(i)}
                          className={cn(
                            "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                            st.isCompleted ? "bg-bloom-pink border-bloom-pink" : "border-slate-200 bg-white"
                          )}
                        >
                          {st.isCompleted && <Check className="w-3 h-3 text-white" />}
                        </button>
                        <span className={cn("text-sm", st.isCompleted && "text-slate-400 line-through")}>{st.title}</span>
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeSubtask(i)}
                        className="opacity-0 group-hover/st:opacity-100 p-1 text-slate-300 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      className="flex-1 bg-slate-50 rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-bloom-pink transition-all"
                      placeholder="Add a subtask..."
                      value={newSubtask}
                      onChange={e => setNewSubtask(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addLocalSubtask();
                        }
                      }}
                    />
                    <button 
                      type="button"
                      onClick={addLocalSubtask}
                      className="p-2 bg-slate-100 rounded-xl text-slate-400 hover:text-bloom-pink transition-all"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button 
                  type="submit"
                  className="w-full bg-bloom-pink text-white font-black py-4 rounded-3xl shadow-xl shadow-bloom-pink/20 hover:brightness-105 active:scale-[0.98] transition-all"
                >
                  {task ? "Save Changes" : "Create Task"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
