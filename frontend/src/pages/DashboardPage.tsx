import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, LogOut, Zap, Clock, CheckCircle, Loader, XCircle, ExternalLink } from "lucide-react";
import { useAuth } from "@/features/auth/useAuth";
import { projectsApi } from "@/features/projects/api";
import { FirstVisitBanner } from "@/components/common/FirstVisitBanner";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import type { ProjectSummary, GenerationStatus } from "@/types/domain";

const STATUS_CONFIG: Record<GenerationStatus, { icon: React.ReactNode; label: string; color: string }> = {
  pending: { icon: <Clock className="w-3.5 h-3.5" />, label: "Pending", color: "text-[var(--text-muted)]" },
  running: { icon: <Loader className="w-3.5 h-3.5 animate-spin" />, label: "Generating…", color: "text-[var(--accent-teal)]" },
  completed: { icon: <CheckCircle className="w-3.5 h-3.5" />, label: "Complete", color: "text-[var(--accent-teal)]" },
  failed: { icon: <XCircle className="w-3.5 h-3.5" />, label: "Failed", color: "text-red-400" },
};

function ProjectCard({ project }: { project: ProjectSummary }) {
  const navigate = useNavigate();
  const cfg = STATUS_CONFIG[project.status];
  const progress = Math.round((project.current_stage / project.total_stages) * 100);

  const handleClick = () => {
    if (project.status === "completed" && project.has_blueprint) {
      navigate(`/project/${project.id}`);
    } else if (project.status === "running" || project.status === "pending") {
      navigate(`/project/${project.id}/generating`);
    }
  };

  const isClickable = project.status !== "failed";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={isClickable ? { y: -2 } : undefined}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); } }}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? `Open project: ${project.name}` : undefined}
      className={`surface-elevated p-5 space-y-3 transition-colors ${
        isClickable ? "cursor-pointer hover:border-[var(--border-strong)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-teal)] focus:ring-offset-1 focus:ring-offset-[var(--bg-base)]" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{project.name}</p>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            {new Date(project.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className={`flex items-center gap-1.5 text-xs shrink-0 ${cfg.color}`}>
          {cfg.icon}
          {cfg.label}
        </div>
      </div>

      {/* Progress bar for running */}
      {project.status === "running" && (
        <div className="h-1 rounded-full bg-[var(--bg-overlay)] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-[var(--accent-teal)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}

      {project.status === "completed" && project.has_blueprint && (
        <div className="flex items-center gap-1 text-xs text-[var(--accent-teal)]">
          <ExternalLink className="w-3 h-3" />
          View blueprint
        </div>
      )}
    </motion.div>
  );
}

function NewProjectModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (project: ProjectSummary) => void;
}) {
  const [name, setName] = useState("");
  const [idea, setIdea] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const project = await projectsApi.create({ name, original_idea: idea });
      onCreated({
        id: project.id,
        name: project.name,
        status: project.status,
        current_stage: project.current_stage,
        total_stages: project.total_stages,
        created_at: project.created_at,
        has_blueprint: false,
      });
      navigate(`/project/${project.id}/generating`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="surface-elevated w-full max-w-md p-6 space-y-5"
      >
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)]">New Project</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Describe your idea and get a complete engineering blueprint
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-muted)]">Project name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={200}
              className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus:border-[var(--accent-teal)] focus:outline-none transition-colors"
              placeholder="My SaaS App"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-[var(--text-muted)]">Describe your idea</label>
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              required
              minLength={10}
              maxLength={2000}
              rows={4}
              className="w-full px-3 py-2.5 rounded-lg bg-[var(--bg-base)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus:border-[var(--accent-teal)] focus:outline-none transition-colors resize-none"
              placeholder="A platform that helps freelancers track invoices and client payments in real time…"
            />
            <p className="text-right text-xs text-[var(--text-disabled)]">{idea.length}/2000</p>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-[var(--border-default)] text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:border-[var(--border-strong)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2 rounded-lg bg-[var(--accent-teal)] text-[var(--bg-base)] text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isSubmitting ? "Creating…" : "Generate Blueprint"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}

function DashboardContent() {
  const { user, signOut } = useAuth();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    projectsApi.list()
      .then(setProjects)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {/* Nav */}
      <nav className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--accent-teal)]/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-[var(--accent-teal)]" />
            </div>
            <span className="text-sm font-bold text-[var(--text-primary)]">AI Software Engineer</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-[var(--text-muted)] hidden sm:block">{user?.email}</span>
            <button
              onClick={signOut}
              className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign out
            </button>
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">Projects</h1>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">{projects.length} total</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--accent-teal)] text-[var(--bg-base)] text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            New Project
          </motion.button>
        </div>

        <FirstVisitBanner projectCount={projects.length} />

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-[var(--accent-teal)] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 space-y-3"
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center">
              <Zap className="w-6 h-6 text-[var(--text-disabled)]" />
            </div>
            <p className="text-[var(--text-secondary)] font-medium">No projects yet</p>
            <p className="text-sm text-[var(--text-muted)]">Create your first blueprint to get started</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-2 text-sm text-[var(--accent-teal)] hover:underline"
            >
              + New Project
            </button>
          </motion.div>
        ) : (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      {/* Footer with API Explorer link (S7) */}
      <footer className="border-t border-[var(--border-subtle)] mt-16">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <p className="text-xs text-[var(--text-disabled)]">AG-ASE-2026</p>
          <a
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--accent-teal)] transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            API Explorer
          </a>
        </div>
      </footer>

      <AnimatePresence>
        {showModal && (
          <NewProjectModal
            onClose={() => setShowModal(false)}
            onCreated={(project) => setProjects((prev) => [project, ...prev])}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export function DashboardPage() {
  return (
    <ErrorBoundary>
      <DashboardContent />
    </ErrorBoundary>
  );
}
