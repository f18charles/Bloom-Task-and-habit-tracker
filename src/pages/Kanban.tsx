import { useEffect, useState } from "react";
import { 
  DndContext, 
  closestCenter, 
  TouchSensor, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent,
  DragOverEvent,
  useDroppable
} from "@dnd-kit/core";
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { useTaskStore, Task } from "../store/useTaskStore.ts";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2, Calendar, LayoutList, Clock } from "lucide-react";
import { formatDistanceToNow, isPast } from "date-fns";
import { motion } from "motion/react";
import { cn } from "../lib/utils.ts";
import TaskModal from "../components/TaskModal.tsx";
import { TaskSkeleton } from "../components/Skeleton.tsx";

function SortableTask({ task, onClick }: { task: Task, onClick: () => void }) {
  const { deleteTask } = useTaskStore();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1
  };

  const completedSubtasks = task.subtasks?.filter(s => s.isCompleted).length || 0;
  const totalSubtasks = task.subtasks?.length || 0;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bloom-card p-5 group bg-white border border-bloom-pink/5 hover:border-bloom-pink/30 hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer overflow-hidden"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <button {...attributes} {...listeners} className="mt-1 cursor-grab active:cursor-grabbing text-slate-200 hover:text-bloom-pink transition-colors">
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-slate-800 truncate text-sm leading-none">{task.title}</h4>
            <div className="flex items-center gap-1.5 min-w-max">
              {task.googleEventId && <Calendar className="w-3 h-3 text-blue-400" />}
              <span className="text-[10px] text-slate-300 font-mono tracking-tighter">#{task.id.slice(-4).toUpperCase()}</span>
            </div>
          </div>
          
          {task.description && <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-4">{task.description}</p>}
          
          <div className="space-y-4">
            {totalSubtasks > 0 && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400">
                  <div className="flex items-center gap-1">
                    <LayoutList className="w-3 h-3" />
                    <span>{completedSubtasks}/{totalSubtasks} Subtasks</span>
                  </div>
                  <span>{Math.round(subtaskProgress)}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${subtaskProgress}%` }}
                    className="h-full bg-bloom-pink rounded-full"
                  />
                </div>
              </div>
            )}
 
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded shadow-sm",
                  task.priority === "HIGH" ? "bg-red-50 text-red-500" :
                  task.priority === "MEDIUM" ? "bg-orange-50 text-orange-500" : "bg-blue-50 text-blue-500"
                )}>
                  {task.priority}
                </span>
                {task.dueDate && (
                  <div className={cn(
                    "flex items-center gap-1 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                    isPast(new Date(task.dueDate)) ? "bg-red-50 text-red-400" : "bg-slate-50 text-slate-400"
                  )}>
                    <Clock className="w-2.5 h-2.5" />
                    <span>{formatDistanceToNow(new Date(task.dueDate), { addSuffix: true })}</span>
                  </div>
                )}
              </div>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  deleteTask(task.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-slate-200 hover:text-red-500 transition-all rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const COLUMNS = [
  { id: "TODO", title: "To Do", color: "bg-slate-300" },
  { id: "IN_PROGRESS", title: "In Progress", color: "bg-bloom-pink" },
  { id: "DONE", title: "Done", color: "bg-bloom-green" }
];

export default function Kanban() {
  const { tasks, fetchTasks, updateTask, isLoading } = useTaskStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [defaultStatus, setDefaultStatus] = useState("TODO");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("NEWEST");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const filteredTasks = tasks
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

  const openAddModal = (status: string) => {
    setSelectedTask(null);
    setDefaultStatus(status);
    setIsModalOpen(true);
  };

  const openEditModal = (task: Task) => {
    setSelectedTask(task);
    setIsModalOpen(true);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    // Check if dropped onto a column
    const isColumn = COLUMNS.some(c => c.id === overId);
    
    if (isColumn) {
      if (activeTask.status !== overId) {
        await updateTask(activeId, { status: overId as any });
      }
    } else {
      // Reordering or dropping onto another task
      const overTask = tasks.find(t => t.id === overId);
      if (overTask && activeTask.status !== overTask.status) {
        await updateTask(activeId, { status: overTask.status });
      }
    }
  };

  return (
    <div className="h-[calc(100vh-180px)] flex flex-col gap-6">
      <TaskModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        task={selectedTask}
        defaultStatus={defaultStatus}
      />
      <div className="flex flex-col md:flex-row md:items-center justify-between px-4 gap-4">
         <h2 className="text-3xl font-black text-slate-800 tracking-tight">Board</h2>
         <div className="flex flex-wrap items-center gap-3">
            <select 
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="text-[10px] font-black uppercase tracking-widest bg-white border-none rounded-xl px-4 py-2 shadow-sm border border-slate-50 outline-none focus:ring-1 focus:ring-bloom-pink transition-all"
            >
              <option value="ALL">All Priority</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-[10px] font-black uppercase tracking-widest bg-white border-none rounded-xl px-4 py-2 shadow-sm border border-slate-50 outline-none focus:ring-1 focus:ring-bloom-pink transition-all"
            >
              <option value="NEWEST">Newest</option>
              <option value="OLDEST">Oldest</option>
              <option value="DUE_DATE">Due Date</option>
            </select>
            <div className="flex gap-2 ml-2">
               {COLUMNS.map(col => (
                 <button 
                   key={col.id}
                   onClick={() => openAddModal(col.id)}
                   className="bg-white text-[10px] font-black uppercase tracking-widest text-slate-400 px-4 py-2 rounded-xl shadow-sm border border-slate-50 hover:text-bloom-pink hover:border-bloom-pink/20 transition-all"
                 >
                   + {col.title}
                 </button>
               ))}
            </div>
         </div>
      </div>
      <DndContext 
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
          {COLUMNS.map((col) => (
            <KanbanColumn 
              key={col.id}
              col={col}
              tasks={filteredTasks.filter(t => t.status === col.id)}
              openAddModal={openAddModal}
              onTaskClick={openEditModal}
              isLoading={isLoading}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function KanbanColumn({ col, tasks, openAddModal, onTaskClick, isLoading }: any) {
  const { setNodeRef } = useDroppable({ id: col.id });

  return (
    <div className="flex-1 flex flex-col gap-4 min-w-[300px] md:min-w-[320px]">
      <div className="flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className={cn("w-3 h-3 rounded-full shadow-sm", col.color)} />
          <h3 className="font-black text-slate-400 uppercase tracking-[0.2em] text-[10px]">
            {col.title}
          </h3>
          <span className="bg-white text-[10px] font-black text-slate-300 w-6 h-6 rounded-lg flex items-center justify-center border border-slate-50">{tasks.length}</span>
        </div>
        <button 
          onClick={() => openAddModal(col.id)}
          className="p-1.5 bg-white rounded-xl text-slate-300 hover:text-bloom-pink shadow-sm border border-slate-50 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
 
      <div 
        ref={setNodeRef}
        className="flex-1 bg-bloom-bg/30 border-2 border-white rounded-[2.5rem] p-6 space-y-4 overflow-y-auto"
      >
        {isLoading ? (
          <>
            <TaskSkeleton />
            <TaskSkeleton />
          </>
        ) : (
          <SortableContext 
            items={tasks.map((t: any) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {tasks.map((task: any) => (
              <SortableTask key={task.id} task={task} onClick={() => onTaskClick(task)} />
            ))}
          </SortableContext>
        )}
 
        {!isLoading && tasks.length === 0 && (
          <div className="h-32 border-2 border-dashed border-slate-100 rounded-[2rem] flex flex-col items-center justify-center gap-2 group hover:border-bloom-pink/20 transition-colors cursor-pointer" onClick={() => openAddModal(col.id)}>
            <p className="text-[10px] font-black text-slate-200 uppercase tracking-widest group-hover:text-bloom-pink/40">Drop items here</p>
          </div>
        )}
      </div>
    </div>
  );
}
