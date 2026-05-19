import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore.ts";
import { Flower, AlertCircle } from "lucide-react";
import { motion } from "motion/react";
import { loginSchema, registerSchema } from "../lib/validation.ts";
import { z } from "zod";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  
  const { login, register } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});

    try {
      if (isLogin) {
        loginSchema.parse({ email, password });
        await login({ email, password });
      } else {
        registerSchema.parse({ email, password, displayName });
        await register({ email, password, displayName });
      }
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        err.issues.forEach((e) => {
          if (e.path[0]) errors[e.path[0].toString()] = e.message;
        });
        setFieldErrors(errors);
      } else {
        setError(err.response?.data?.error || "Authentication failed");
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bloom-pink-light p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] shadow-xl w-full max-w-md border-none"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 bg-bloom-pink rounded-3xl grid place-items-center mb-4 rotate-3 shadow-lg">
            <Flower className="text-white w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-800 tracking-tight">Bloom</h2>
          <p className="text-slate-400 mt-1">{isLogin ? "Welcome back!" : "Join our community"}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 ml-1">Display Name</label>
              <input
                type="text"
                className={`w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bloom-pink focus:bg-white transition-all outline-none ${fieldErrors.displayName ? "ring-2 ring-red-200" : ""}`}
                placeholder="How should we call you?"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              {fieldErrors.displayName && <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.displayName}</p>}
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1 ml-1">Email</label>
            <input
              type="email"
              className={`w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bloom-pink focus:bg-white transition-all outline-none ${fieldErrors.email ? "ring-2 ring-red-200" : ""}`}
              placeholder="hello@bloom.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {fieldErrors.email && <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.email}</p>}
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1 ml-1">Password</label>
            <input
              type="password"
              className={`w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bloom-pink focus:bg-white transition-all outline-none ${fieldErrors.password ? "ring-2 ring-red-200" : ""}`}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {fieldErrors.password && <p className="text-red-500 text-xs mt-1 ml-1">{fieldErrors.password}</p>}
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 text-sm font-medium p-4 rounded-2xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <button type="submit" className="w-full bloom-btn-primary py-4 text-lg font-bold shadow-lg shadow-bloom-pink/20">
            {isLogin ? "Sign In" : "Get Started"}
          </button>
        </form>

        <div className="mt-8 text-center text-slate-500">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-bloom-pink font-bold hover:underline"
          >
            {isLogin ? "New here? Create an account" : "Already have an account? Sign in"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
