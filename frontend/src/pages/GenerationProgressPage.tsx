import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, Loader, XCircle, AlertTriangle } from "lucide-react";
import { projectsApi } from "@/features/projects/api";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import type { Project, GenerationStatus } from "@/types/domain";

const STAGE_LABELS = [
  "Clarifying your idea",
  "Selecting tech stack",
  "Designing architecture",
  "Modelling database schema",
  "Designing API surface",
  "Building implementation roadmap",
  "Security, testing & documentation",
];

const POLL_MS = 2500;

function StageItem({ index, currentStage, status }: {
  index: number;
  currentStage: number;
  status: GenerationStatus;
}) {
  const stageNum = index + 1;
  const isDone = currentStage > stageNum || status === "completed";
  const isActive = currentStage === stageNum && status === "running";
  const isFailed = status === "failed" && currentStage === stageNum;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
        isActive ? "bg-[var(--accent-teal)]/5 border border-[var(--border-default)]" : "border border-transparent"
      }`}
    >
      <div className="w-7 h-7 shrink-0 flex items-center justify-center">
        {isFailed ? (
          <XCircle className="w-5 h-5 text-red-400" />
        ) : isDone ? (
          <CheckCircle className="w-5 h-5 text-[var(--accent-teal)]" />
        ) : isActive ? (
          <Loader className="w-5 h-5 text-[var(--accent-teal)] animate-spin" />
        ) : (
          <div className="w-5 h-5 rounded-full border-2 border-[var(--border-default)]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${
          isDone ? "text-[var(--text-secondary)]" :
          isActive ? "text-[var(--text-primary)] font-medium" :
          "text-[var(--text-disabled)]"
        }`}>
          Stage {stageNum} — {STAGE_LABELS[index]}
        </p>
      </div>
      {isActive && (
        <div className="flex gap-0.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1 h-1 rounded-full bg-[var(--accent-teal)]"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}

function GenerationProgressContent() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);

  const poll = useCallback(async () => {
    if (!projectId || !mountedRef.current) return;
    try {
      const p = await projectsApi.get(projectId);
      if (!mountedRef.current) return;
      setProject(p);
      if (p.status === "completed") {
        setTimeout(() => { if (mountedRef.current) navigate(`/project/${projectId}`); }, 800);
      }
    } catch (e) {
      if (mountedRef.current) {
        setError(e instanceof Error ? e.message : "Failed to load project");
      }
    }
  }, [projectId, navigate]);

  useEffect(() => {
    mountedRef.current = true;
    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(timer);
    };
  }, [poll]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)] p-8">
        <div className="surface-elevated max-w-sm w-full p-8 text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
          <p className="text-[var(--text-primary)] font-medium">Error loading project</p>
          <p className="text-sm text-[var(--text-muted)]">{error}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="text-sm text-[var(--accent-teal)] hover:underline"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
        <div className="w-6 h-6 border-2 border-[var(--accent-teal)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const progress = Math.round((project.current_stage / project.total_stages) * 100);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg space-y-6"
      >
        {/* Header */}
        <div className="text-center space-y-2">
          <motion.div
            animate={{ rotate: project.status === "running" ? 360 : 0 }}
            transition={{ duration: 3, repeat: project.status === "running" ? Infinity : 0, ease: "linear" }}
            className="w-12 h-12 mx-auto rounded-2xl bg-[var(--accent-teal)]/10 border border-[var(--border-default)] flex items-center justify-center"
          >
            <span className="text-xl">⚡</span>
          </motion.div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">
            {project.status === "completed"
              ? "Blueprint ready!"
              : project.status === "failed"
              ? "Generation failed"
              : "Generating blueprint…"}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto line-clamp-2">
            {project.original_idea}
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[var(--accent-teal)] to-[var(--accent-cyan)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
        <p className="text-center text-xs text-[var(--text-muted)]">
          Stage {project.current_stage} / {project.total_stages}
        </p>

        {/* Stage list */}
        <div className="surface p-2 space-y-1">
          {STAGE_LABELS.map((_, i) => (
            <StageItem
              key={i}
              index={i}
              currentStage={project.current_stage}
              status={project.status}
            />
          ))}
        </div>

        {/* Failed state */}
        <AnimatePresence>
          {project.status === "failed" && project.error_message && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-lg bg-red-500/5 border border-red-500/20 p-4 space-y-2"
            >
              <p className="text-sm font-medium text-red-400">Generation failed</p>
              <p className="text-xs text-[var(--text-muted)]">{project.error_message}</p>
              <button
                onClick={() => navigate("/dashboard")}
                className="text-xs text-[var(--accent-teal)] hover:underline"
              >
                Back to Dashboard
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export function GenerationProgressPage() {
  return (
    <ErrorBoundary>
      <GenerationProgressContent />
    </ErrorBoundary>
  );
}
