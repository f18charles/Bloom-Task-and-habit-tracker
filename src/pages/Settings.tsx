import { useState, useEffect } from "react";
import { useAuthStore } from "../store/useAuthStore.ts";
import { useToastStore } from "../store/useToastStore.ts";
import api from "../api/axios.ts";
import { 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  LogOut,
  MessageSquare,
  Send,
  Star,
  Rocket,
  Bug,
  Lightbulb,
  Check
} from "lucide-react";
import { cn } from "../lib/utils.ts";
import { motion } from "motion/react";

export default function Settings() {
  const { user, logout } = useAuthStore();
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Feedback state
  const [feedbackCategory, setFeedbackCategory] = useState<"GENERAL" | "FEATURE" | "BUG" | "IMPROVEMENT">("GENERAL");
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const [feedbackHoverRating, setFeedbackHoverRating] = useState<number>(0);
  const [feedbackTitle, setFeedbackTitle] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackIncludeSpecs, setFeedbackIncludeSpecs] = useState(true);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);
  const [pastFeedbacks, setPastFeedbacks] = useState<Array<{ id: string; feedback: any; createdAt: string }>>([]);
  const [showPastFeedbacks, setShowPastFeedbacks] = useState(false);

  useEffect(() => {
    fetchCalendarStatus();
    fetchFeedbacks();

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        setIsCalendarConnected(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const fetchFeedbacks = async () => {
    try {
      const { data } = await api.get("/feedback");
      if (data?.data) {
        setPastFeedbacks(data.data);
      }
    } catch {
      // Non-critical background fetch
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) return;

    setIsSubmittingFeedback(true);
    setFeedbackSuccess(null);

    try {
      const payload = {
        category: feedbackCategory,
        rating: feedbackRating > 0 ? feedbackRating : undefined,
        title: feedbackTitle.trim() || undefined,
        message: feedbackMessage.trim(),
        pageUrl: window.location.pathname,
        extraData: {
          includeSpecs: feedbackIncludeSpecs,
          screenResolution: feedbackIncludeSpecs ? `${window.screen.width}x${window.screen.height}` : undefined,
          viewport: feedbackIncludeSpecs ? `${window.innerWidth}x${window.innerHeight}` : undefined,
          colorScheme: document.documentElement.classList.contains("dark") ? "dark" : "light",
        },
      };

      const { data } = await api.post("/feedback", payload);
      useToastStore.getState().addToast("Feedback submitted successfully. Thank you!", "success");
      setFeedbackSuccess("Thank you for your feedback! Your submission has been saved.");
      setFeedbackTitle("");
      setFeedbackMessage("");
      setFeedbackRating(0);
      if (data?.data) {
        setPastFeedbacks((prev) => [data.data, ...prev]);
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || "Failed to submit feedback. Please try again.";
      useToastStore.getState().addToast(errorMsg, "error");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const fetchCalendarStatus = async () => {
    try {
      const { data } = await api.get("/calendar/status");
      setIsCalendarConnected(data.data.connected);
      setLastSyncedAt(data.data.lastSyncedAt);
    } catch (error) {
      console.error("Failed to fetch calendar status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const { data } = await api.get("/calendar/auth-url");
      const url = data.data.url;
      
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      window.open(
        url,
        'google_oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );
    } catch (error) {
      console.error("Failed to get auth URL");
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);
    try {
      await api.post("/calendar/sync");
      // Refresh status to get new lastSyncedAt
      fetchCalendarStatus();
      alert("Calendar sync completed!");
    } catch (error) {
      console.error("Sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect Google Calendar?")) return;
    try {
      await api.delete("/calendar/disconnect");
      setIsCalendarConnected(false);
    } catch (error) {
      console.error("Disconnect failed");
    }
  };

  if (isLoading) return <div className="p-4 sm:p-8"><div className="animate-pulse space-y-4 bloom-card p-4 sm:p-8"><div className="h-16 bg-slate-100 dark:bg-slate-700 rounded-xl w-full"></div><div className="h-32 bg-slate-50 dark:bg-slate-700 rounded-xl w-full"></div></div></div>;

  return (
    <div className="max-w-3xl space-y-4 sm:space-y-6">
      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white">Account Settings</h2>
        <div className="bloom-card p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-bloom-pink flex items-center justify-center text-white text-xl sm:text-2xl font-black shadow-md shrink-0">
              {user?.displayName[0]}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white truncate">{user?.displayName}</h3>
              <p className="text-xs sm:text-sm text-gray-400 dark:text-slate-300 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-end w-full sm:w-auto">
             <button 
               onClick={logout}
               className="flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 px-3 py-2 sm:px-4 sm:py-2 rounded-xl transition-all w-full sm:w-auto cursor-pointer"
             >
               <LogOut className="w-4 h-4" /> Sign Out
             </button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white">Connected Accounts</h2>
        <div className="bloom-card p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-3 sm:gap-4 w-full">
              <div className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-colors shrink-0",
                isCalendarConnected 
                  ? "bg-bloom-pink-light text-bloom-pink dark:bg-bloom-pink/20" 
                  : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-300"
              )}>
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-gray-800 dark:text-white">Google Calendar</h3>
                <p className="text-xs sm:text-sm text-gray-400 dark:text-slate-300 truncate">
                  {isCalendarConnected 
                    ? `Connected${lastSyncedAt ? ` • Last synced ${new Date(lastSyncedAt).toLocaleString()}` : ''}` 
                    : "Task syncing enabled"
                  }
                </p>
              </div>
            </div>

            {isCalendarConnected ? (
              <div className="flex flex-row items-center gap-3 w-full sm:w-auto">
                <button 
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  className="flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-bloom-pink bg-bloom-pink-light dark:bg-bloom-pink/20 px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl transition-all disabled:opacity-50 flex-1 sm:flex-none cursor-pointer"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", isSyncing && "animate-spin")} />
                  {isSyncing ? "Syncing..." : "Sync Now"}
                </button>
                <button 
                  onClick={handleDisconnect}
                  className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors py-2 px-2 cursor-pointer shrink-0"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button 
                onClick={handleConnectCalendar}
                className="bg-bloom-pink text-white text-xs sm:text-sm font-bold px-6 py-2.5 sm:px-8 sm:py-3 rounded-xl sm:rounded-2xl shadow-md shadow-bloom-pink/20 hover:brightness-105 transition-all w-full sm:w-auto cursor-pointer"
              >
                Connect
              </button>
            )}
          </div>

          {isCalendarConnected && (
            <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="bg-bloom-bg/50 dark:bg-slate-700/30 p-3 sm:p-4 rounded-xl border border-bloom-pink/10 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-bloom-green flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-bloom-dark-green dark:text-green-800" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-bloom-dark-green dark:text-green-200 uppercase tracking-widest">Automatic Sync</p>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 mt-0.5">New tasks are pushed automatically.</p>
                </div>
              </div>
              <div className="bg-bloom-bg/50 dark:bg-slate-700/30 p-3 sm:p-4 rounded-xl border border-bloom-pink/10 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-orange-100 dark:bg-orange-950/40 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-orange-600 dark:text-orange-300 uppercase tracking-widest">Two-Way Pull</p>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-slate-300 mt-0.5">Events are synced from Google.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Feedback Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white">Feedback & Feature Requests</h2>
          {pastFeedbacks.length > 0 && (
            <button
              type="button"
              onClick={() => setShowPastFeedbacks(!showPastFeedbacks)}
              className="text-xs font-semibold text-bloom-pink hover:underline flex items-center gap-1 cursor-pointer"
            >
              {showPastFeedbacks ? "Hide past submissions" : `View past submissions (${pastFeedbacks.length})`}
            </button>
          )}
        </div>

        <div className="bloom-card p-4 sm:p-6 space-y-5">
          <div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-slate-300">
              Help us improve Bloom. Whether you found an issue, have an idea for a new capability, or want to share your experience, we read every note.
            </p>
          </div>

          {feedbackSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3.5 rounded-xl bg-bloom-green/30 border border-bloom-dark-green/20 text-bloom-dark-green dark:text-green-300 text-xs sm:text-sm flex items-center gap-2.5"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>{feedbackSuccess}</span>
            </motion.div>
          )}

          <form onSubmit={handleFeedbackSubmit} className="space-y-4">
            {/* Category Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-700 dark:text-slate-200">Category</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "GENERAL", label: "General", icon: MessageSquare },
                  { id: "FEATURE", label: "Feature", icon: Rocket },
                  { id: "BUG", label: "Bug Report", icon: Bug },
                  { id: "IMPROVEMENT", label: "Performance", icon: Lightbulb },
                ].map((item) => {
                  const Icon = item.icon;
                  const isSelected = feedbackCategory === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFeedbackCategory(item.id as any)}
                      className={cn(
                        "flex items-center justify-center gap-2 p-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer",
                        isSelected
                          ? "bg-bloom-pink text-white border-bloom-pink shadow-xs"
                          : "bg-slate-50 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-bloom-pink/40"
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Satisfaction Rating */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-gray-700 dark:text-slate-200">Experience Rating</label>
                {feedbackRating > 0 && (
                  <button
                    type="button"
                    onClick={() => setFeedbackRating(0)}
                    className="text-[11px] text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 underline cursor-pointer"
                  >
                    Clear rating
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (feedbackHoverRating || feedbackRating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFeedbackRating(feedbackRating === star ? 0 : star)}
                        onMouseEnter={() => setFeedbackHoverRating(star)}
                        onMouseLeave={() => setFeedbackHoverRating(0)}
                        className="p-1 text-slate-300 hover:text-amber-400 transition-colors cursor-pointer"
                        aria-label={`Rate ${star} of 5 stars`}
                      >
                        <Star
                          className={cn(
                            "w-5 h-5 sm:w-6 sm:h-6 transition-all",
                            isFilled ? "fill-amber-400 text-amber-400 scale-105" : "text-slate-300 dark:text-slate-600"
                          )}
                        />
                      </button>
                    );
                  })}
                </div>
                <span className="text-xs font-medium text-gray-500 dark:text-slate-400">
                  {((feedbackHoverRating || feedbackRating) === 5) && "Excellent"}
                  {((feedbackHoverRating || feedbackRating) === 4) && "Very Good"}
                  {((feedbackHoverRating || feedbackRating) === 3) && "Satisfactory"}
                  {((feedbackHoverRating || feedbackRating) === 2) && "Needs Improvement"}
                  {((feedbackHoverRating || feedbackRating) === 1) && "Poor"}
                  {(feedbackHoverRating === 0 && feedbackRating === 0) && "No rating selected"}
                </span>
              </div>
            </div>

            {/* Title / Summary */}
            <div className="space-y-1.5">
              <label htmlFor="feedback-title" className="text-xs font-bold text-gray-700 dark:text-slate-200">
                Title / Summary <span className="text-gray-400 dark:text-slate-500 font-normal">(optional)</span>
              </label>
              <input
                id="feedback-title"
                type="text"
                value={feedbackTitle}
                onChange={(e) => setFeedbackTitle(e.target.value)}
                placeholder="e.g., Add recurring habit interval or weekly goal chart"
                maxLength={100}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-bloom-pink transition-colors"
              />
            </div>

            {/* Message Body */}
            <div className="space-y-1.5">
              <label htmlFor="feedback-message" className="text-xs font-bold text-gray-700 dark:text-slate-200">
                Details & Thoughts <span className="text-bloom-pink">*</span>
              </label>
              <textarea
                id="feedback-message"
                required
                rows={4}
                value={feedbackMessage}
                onChange={(e) => setFeedbackMessage(e.target.value)}
                placeholder="Share your feedback, bug details, or workflow suggestions..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:border-bloom-pink transition-colors resize-none"
              />
            </div>

            {/* Diagnostics Metadata Checkbox */}
            <div className="flex items-center gap-2.5 pt-1">
              <input
                id="feedback-specs"
                type="checkbox"
                checked={feedbackIncludeSpecs}
                onChange={(e) => setFeedbackIncludeSpecs(e.target.checked)}
                className="w-4 h-4 rounded text-bloom-pink focus:ring-bloom-pink cursor-pointer"
              />
              <label htmlFor="feedback-specs" className="text-xs text-gray-500 dark:text-slate-400 cursor-pointer select-none">
                Include browser and display diagnostics to assist debugging
              </label>
            </div>

            {/* Submit Action */}
            <div className="flex items-center justify-end pt-2">
              <button
                type="submit"
                disabled={isSubmittingFeedback || !feedbackMessage.trim()}
                className="flex items-center justify-center gap-2 bg-bloom-pink text-white text-xs sm:text-sm font-bold px-5 py-2.5 rounded-xl shadow-md shadow-bloom-pink/20 hover:brightness-105 transition-all disabled:opacity-50 cursor-pointer w-full sm:w-auto"
              >
                {isSubmittingFeedback ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Submit Feedback
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Past Submissions list */}
          {showPastFeedbacks && pastFeedbacks.length > 0 && (
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700/60 space-y-3">
              <h4 className="text-xs font-bold text-gray-700 dark:text-slate-200 uppercase tracking-wider">
                Your Past Submissions
              </h4>
              <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                {pastFeedbacks.map((item) => {
                  const fb = item.feedback || {};
                  return (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wide bg-bloom-pink-light text-bloom-pink dark:bg-bloom-pink/20">
                            {fb.category || "GENERAL"}
                          </span>
                          {fb.rating && (
                            <span className="text-amber-500 font-bold flex items-center gap-0.5">
                              ★ {fb.rating}/5
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400 dark:text-slate-400">
                          {new Date(item.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {fb.title && <p className="font-semibold text-gray-800 dark:text-white">{fb.title}</p>}
                      <p className="text-gray-600 dark:text-slate-300 line-clamp-2">{fb.message}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
