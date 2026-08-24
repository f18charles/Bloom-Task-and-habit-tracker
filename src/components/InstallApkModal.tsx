import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Smartphone, 
  X, 
  Download, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  Bell
} from "lucide-react";

interface InstallApkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InstallApkModal({ isOpen, onClose }: InstallApkModalProps) {
  const [apkStatus, setApkStatus] = useState<{ available: boolean; downloadUrl?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetch("/api/apk/status")
        .then((res) => res.json())
        .then((data) => {
          setApkStatus(data);
        })
        .catch(() => {
          setApkStatus({ available: false });
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
          />

          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative z-10 w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-bloom-pink/20 dark:border-slate-700 flex flex-col"
          >
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-bloom-pink via-purple-600 to-bloom-purple p-6 text-white relative">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full">
                      Android Edition
                    </span>
                  </div>
                  <h3 className="text-2xl font-black tracking-tight mt-1">
                    Bloom for Android
                  </h3>
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-6 space-y-6 text-center">
              {isLoading ? (
                <div className="py-8 flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 border-3 border-bloom-pink border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-400 font-medium">Checking app availability...</p>
                </div>
              ) : apkStatus?.available ? (
                /* APK Available - Download Option */
                <div className="space-y-5">
                  <div className="w-16 h-16 bg-bloom-pink/10 dark:bg-bloom-pink/20 rounded-2xl flex items-center justify-center text-bloom-pink mx-auto">
                    <Download className="w-8 h-8" />
                  </div>

                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 rounded-full text-xs font-bold mb-2">
                      <Sparkles className="w-3.5 h-3.5" />
                      Ready to Download
                    </div>
                    <h4 className="text-lg font-bold text-slate-800 dark:text-white">
                      Download Bloom APK
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                      Install the Android application directly on your device.
                    </p>
                  </div>

                  <a 
                    href={apkStatus.downloadUrl || "/api/apk/download"}
                    download="bloom-productivity.apk"
                    className="w-full py-3.5 px-6 bg-bloom-pink hover:bg-bloom-pink/90 text-white font-bold rounded-2xl shadow-lg shadow-bloom-pink/30 flex items-center justify-center gap-2 transition-all cursor-pointer text-sm"
                  >
                    <Download className="w-4 h-4" />
                    Download APK File
                  </a>
                </div>
              ) : (
                /* APK Coming Soon */
                <div className="space-y-5 py-2">
                  <div className="w-16 h-16 bg-amber-50 dark:bg-slate-700/50 rounded-2xl flex items-center justify-center text-amber-500 mx-auto shadow-inner">
                    <Clock className="w-8 h-8 animate-pulse" />
                  </div>

                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 rounded-full text-xs font-bold mb-2">
                      <Bell className="w-3.5 h-3.5" />
                      Coming Soon
                    </div>
                    <h4 className="text-xl font-black text-slate-800 dark:text-white">
                      Android App Coming Soon
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed max-w-xs mx-auto">
                      The native Android application is currently in development. Once compiled and uploaded, the direct download link will automatically be available here.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 text-left space-y-2">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Features Coming to Android:</p>
                    <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-bloom-pink" />
                        <span>Native Android Interface & Gestures</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-bloom-pink" />
                        <span>Real-Time Task & Habit Syncing</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-bloom-pink" />
                        <span>Google Calendar Integration</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-700 flex justify-end">
              <button 
                onClick={onClose}
                className="px-5 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
