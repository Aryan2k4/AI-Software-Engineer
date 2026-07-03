import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap } from "lucide-react";

const STORAGE_KEY = "ase_banner_dismissed";

interface FirstVisitBannerProps {
  projectCount: number;
}

export function FirstVisitBanner({ projectCount }: FirstVisitBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (projectCount === 0 && !localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, [projectCount]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="relative mb-6 rounded-xl border border-[var(--border-default)] bg-[var(--bg-elevated)] p-5 overflow-hidden"
        >
          {/* Teal glow strip */}
          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--accent-teal)] to-transparent" />

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-[var(--accent-teal)]/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-[var(--accent-teal)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Welcome to AI Software Engineer
              </p>
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                Describe your project idea in one sentence and get a complete 9-section
                engineering blueprint — architecture, database schema, API design, and more.
              </p>
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Click <span className="text-[var(--accent-teal)]">New Project</span> to get started.
              </p>
            </div>
            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className="flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
