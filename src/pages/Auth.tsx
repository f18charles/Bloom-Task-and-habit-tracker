import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore.ts";
import { Flower } from "lucide-react";
import { motion } from "motion/react";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  
  const { login, register } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (isLogin) {
        await login({ email, password });
      } else {
        await register({ email, password, displayName });
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Authentication failed");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bloom-pink-light p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-10 rounded-[3rem] shadow-xl w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-bloom-pink rounded-3xl grid place-items-center mb-4 rotate-3 shadow-lg">
            <Flower className="text-white w-10 h-10" />
          </div>
          <h2 className="text-4xl font-black text-slate-800 tracking-tight">Bloom</h2>
          <p className="text-slate-400 mt-1">{isLogin ? "Welcome back!" : "Join our community"}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1 ml-1">Display Name</label>
              <input
                type="text"
                required
                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bloom-pink focus:bg-white transition-all outline-none"
                placeholder="How should we call you?"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1 ml-1">Email</label>
            <input
              type="email"
              required
              className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bloom-pink focus:bg-white transition-all outline-none"
              placeholder="hello@bloom.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1 ml-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-bloom-pink focus:bg-white transition-all outline-none"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-red-500 text-sm font-medium ml-1">{error}</p>}

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
