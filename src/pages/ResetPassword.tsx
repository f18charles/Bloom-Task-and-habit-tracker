import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Sparkles, AlertCircle, Check, Eye, EyeOff } from "lucide-react";
import { motion } from "motion/react";
import api from "../api/axios.ts";
import { useToastStore } from "../store/useToastStore.ts";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const { addToast } = useToastStore();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No reset token found in URL. Please request a new link.");
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setError("");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/auth/reset-password", { token, password });
      addToast(data.message || "Password updated successfully!", "success");
      setSuccess(true);
      setTimeout(() => {
        navigate("/auth");
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to update password. Link might be expired.");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = password.length >= 6 && password === confirmPassword;

  return (
    <div className="min-h-screen flex items-center justify-center bg-bloom-pink-light p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] shadow-xl w-full max-w-md border-none"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-bloom-pink rounded-3xl grid place-items-center mb-4 rotate-3 shadow-lg">
            <Sparkles className="text-white w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">Bloom</h2>
          <p className="text-slate-400 mt-1">Set your new password</p>
        </div>

        {success ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 text-emerald-600 text-sm font-medium p-6 rounded-2xl flex flex-col items-center gap-2 border border-emerald-100 text-center">
              <Check className="w-8 h-8 mb-2" />
              <p className="font-bold text-lg">Password Changed!</p>
              <p className="text-xs opacity-95">Redirecting you to sign in within a few seconds...</p>
            </div>
            <button
              onClick={() => navigate("/auth")}
              className="w-full bg-slate-100 text-slate-600 font-bold py-3 rounded-2xl text-center text-sm hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Go to Sign In Immediately
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 ml-1">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  disabled={!token}
                  className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bloom-pink focus:bg-white transition-all outline-none text-slate-700 font-bold"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 ml-1">Confirm New Password</label>
              <input
                type="password"
                required
                disabled={!token}
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bloom-pink focus:bg-white transition-all outline-none text-slate-700 font-bold"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-500 text-sm font-medium p-4 rounded-2xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading || !isFormValid || !token}
              className="w-full bloom-btn-primary py-4 text-lg font-bold shadow-lg shadow-bloom-pink/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? "Saving..." : "Update Password"}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
}
