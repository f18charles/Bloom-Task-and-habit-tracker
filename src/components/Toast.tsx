import { useEffect } from "react";
import { useToastStore, ToastMessage } from "../store/useToastStore.ts";
import { CheckCircle2, XCircle, AlertCircle, Info, X } from "lucide-react";
import { clsx } from "clsx";
import { motion, AnimatePresence } from "motion/react";

function ToastItem({ toast }: { toast: ToastMessage }) {
  const { removeToast } = useToastStore();

  useEffect(() => {
    const timer = setTimeout(() => {
      removeToast(toast.id);
    }, 4000); // auto-dismiss in 4 seconds

    return () => clearTimeout(timer);
  }, [toast.id, removeToast]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-bloom-dark-green" />,
    error: <XCircle className="w-5 h-5 text-red-600" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-600" />,
    info: <Info className="w-5 h-5 text-slate-600" />
  };

  const bgClasses = {
    success: "bg-bloom-green-light/95 border-bloom-green/30 text-bloom-dark-green",
    error: "bg-red-50/95 border-red-200 text-red-800",
    warning: "bg-amber-50/95 border-amber-200 text-amber-900",
    info: "bg-slate-50/95 border-slate-200 text-slate-800"
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
      className={clsx(
        "flex items-center gap-3 px-5 py-4 rounded-2xl shadow-lg border backdrop-blur-md w-full max-w-sm pointer-events-auto",
        bgClasses[toast.type]
      )}
    >
      <div className="flex-shrink-0">{icons[toast.type]}</div>
      <p className="text-xs font-black uppercase tracking-wider flex-1">{toast.message}</p>
      <button 
        type="button"
        onClick={() => removeToast(toast.id)}
        className="p-1 hover:bg-black/5 rounded-lg text-current/60 hover:text-current transition-all"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}

export default function ToastContainer() {
  const { toasts } = useToastStore();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 w-full max-w-sm pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
