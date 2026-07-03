
import { motion } from "framer-motion";
import { Download, Share2, Calendar, Zap } from "lucide-react";
import type { Project, Blueprint } from "@/types/domain";

interface BlueprintHeaderProps {
  project: Project;
  blueprint: Blueprint;
  onExportClick: () => void;
  onShareClick: () => void;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BlueprintHeader({
  project,
  blueprint,
  onExportClick,
  onShareClick,
}: BlueprintHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]"
    >
      <div className="max-w-4xl mx-auto px-4 py-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left: project info */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-[var(--accent-teal)]/10 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-[var(--accent-teal)]" />
              </div>
              <h1 className="text-lg font-bold text-[var(--text-primary)] truncate">
                {project.name}
              </h1>
              <span className="shrink-0 px-2 py-0.5 rounded text-xs bg-[var(--accent-teal)]/10 text-[var(--accent-teal)] font-medium">
                v{blueprint.version}
              </span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] line-clamp-2 max-w-xl">
              {project.original_idea}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(blueprint.created_at)}
              <span className="mx-1">·</span>
              <span>9 sections</span>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onShareClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-default)] text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </button>
            <button
              onClick={onExportClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent-teal)] text-[var(--bg-base)] text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              <Download className="w-3.5 h-3.5" />
              Export
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
