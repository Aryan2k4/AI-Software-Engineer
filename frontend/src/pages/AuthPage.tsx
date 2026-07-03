import { useState } from "react";
import { Navigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/features/auth/useAuth";

type Mode = "signin" | "signup";

export function AuthPage() {
  const { user, isLoading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isLoading && user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password);
        setSuccessMsg("Account created! Check your email to confirm, then sign in.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg-base)] p-4">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8 text-center"
      >
        <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--accent-teal)]/10 border border-[var(--border-default)] flex items-center justify-center mb-4">
          <span className="text-2xl">⚡</span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">AI Software Engineer</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Idea → Engineering Blueprint in seconds
        </p>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="surface-elevated w-full max-w-sm p-8 space-y-6"
      >
        {/* Mode toggle */}
        <div className="flex rounded-lg bg-[var(--bg-base)] p-1 gap-1">
          {(["signin", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(null); setSuccessMsg(null); }}
              className={`flex-1 py-1.5 text-sm rounded-md font-medium transition-all ${
                mode === m
                  ? "bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
              }`}
            >
              {m === "signin" ? "Sign In" : "Sign Up"}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-muted)]" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus:border-[var(--accent-teal)] focus:outline-none transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-muted)]" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus:border-[var(--accent-teal)] focus:outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.p
                key="error"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-red-400"
              >
                {error}
              </motion.p>
            )}
            {successMsg && (
              <motion.p
                key="success"
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-xs text-[var(--accent-teal)]"
              >
                {successMsg}
              </motion.p>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 rounded-lg bg-[var(--accent-teal)] text-[var(--bg-base)] text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {isSubmitting
              ? "Please wait…"
              : mode === "signin"
              ? "Sign In"
              : "Create Account"}
          </button>
        </form>
      </motion.div>

      <p className="mt-6 text-xs text-[var(--text-disabled)]">AG-ASE-2026</p>
    </div>
  );
}
