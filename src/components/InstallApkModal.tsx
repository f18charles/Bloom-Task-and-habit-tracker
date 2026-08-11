import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Smartphone, 
  Download, 
  ShieldCheck, 
  X, 
  CheckCircle2, 
  Copy, 
  Check, 
  ArrowRight,
  Sparkles,
  QrCode
} from "lucide-react";

interface InstallApkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InstallApkModal({ isOpen, onClose }: InstallApkModalProps) {
  const [copied, setCopied] = useState(false);
  const downloadUrl = `${window.location.origin}/api/apk`;

  const copyLink = () => {
    navigator.clipboard.writeText(downloadUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
            className="relative z-10 w-full max-w-lg bg-white dark:bg-slate-800 rounded-3xl shadow-2xl overflow-hidden border border-bloom-pink/20 dark:border-slate-700 flex flex-col max-h-[90vh]"
          >
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-bloom-pink via-purple-500 to-bloom-purple p-6 text-white relative">
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
                    <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">Android APK v1.0</span>
                    <span className="text-[10px] font-bold bg-bloom-green/30 text-bloom-dark-green dark:text-green-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Ready
                    </span>
                  </div>
                  <h3 className="text-2xl font-black tracking-tight mt-1">Bloom for Android</h3>
                </div>
              </div>
              <p className="text-xs text-white/90">Get the native Android experience with offline access, quick widgets & instant task logging.</p>
            </div>

            {/* Content Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto">
              {/* Direct Download Button */}
              <a 
                href="/api/apk"
                download="bloom-productivity-v1.0.apk"
                className="w-full py-3.5 px-6 bg-bloom-pink hover:bg-bloom-pink/90 text-white font-bold rounded-2xl shadow-lg shadow-bloom-pink/30 flex items-center justify-center gap-3 transition-all transform active:scale-98 text-center cursor-pointer"
              >
                <Download className="w-5 h-5 animate-bounce" />
                Download APK File (Direct)
              </a>

              {/* QR / Link Box */}
              <div className="bg-bloom-bg/50 dark:bg-slate-700/30 p-4 rounded-2xl border border-bloom-pink/10 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4">
                <div className="w-20 h-20 bg-white p-2 rounded-xl border border-slate-200 flex flex-col items-center justify-center shrink-0 shadow-sm">
                  <QrCode className="w-12 h-12 text-slate-800" />
                  <span className="text-[8px] font-bold text-slate-500 uppercase mt-0.5">Scan to Install</span>
                </div>
                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Download Link for Phone</p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-400 truncate mt-0.5">{downloadUrl}</p>
                  <button 
                    onClick={copyLink}
                    className="mt-2 text-xs font-bold text-bloom-pink hover:underline flex items-center justify-center sm:justify-start gap-1 cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied to clipboard!" : "Copy APK Download Link"}
                  </button>
                </div>
              </div>

              {/* Step by Step Install Guide */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-bloom-pink" />
                  Installation Instructions
                </h4>

                <div className="space-y-2 text-xs">
                  <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <span className="w-5 h-5 rounded-full bg-bloom-pink/10 text-bloom-pink font-bold text-[11px] flex items-center justify-center shrink-0">1</span>
                    <p className="text-slate-600 dark:text-slate-300">
                      Tap <strong className="text-slate-800 dark:text-white">Download APK File</strong> above to download <code className="bg-slate-200 dark:bg-slate-700 px-1 py-0.5 rounded text-[10px]">bloom-productivity-v1.0.apk</code>.
                    </p>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <span className="w-5 h-5 rounded-full bg-bloom-pink/10 text-bloom-pink font-bold text-[11px] flex items-center justify-center shrink-0">2</span>
                    <p className="text-slate-600 dark:text-slate-300">
                      Open your phone's <strong className="text-slate-800 dark:text-white">Downloads</strong> folder and tap the APK file.
                    </p>
                  </div>

                  <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-100 dark:border-slate-700/50">
                    <span className="w-5 h-5 rounded-full bg-bloom-pink/10 text-bloom-pink font-bold text-[11px] flex items-center justify-center shrink-0">3</span>
                    <p className="text-slate-600 dark:text-slate-300">
                      If prompted by Android, allow <strong className="text-slate-800 dark:text-white">"Install from unknown sources"</strong> in Chrome/Files settings, then press <strong className="text-slate-800 dark:text-white">Install</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Highlights */}
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-bloom-green" />
                  <span>Offline Sync & Cache</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-bloom-green" />
                  <span>Google Calendar Sync</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-bloom-green" />
                  <span>Full Screen Layout</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-bloom-green" />
                  <span>Biometric Security</span>
                </div>
              </div>
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
