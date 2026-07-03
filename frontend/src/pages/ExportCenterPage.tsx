import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Download, FileText, FileJson, File, Clock, CheckCircle, XCircle, Loader, ArrowLeft } from "lucide-react";
import { exportsApi } from "@/features/export/api";
import { useExportStatus } from "@/features/export/useExportStatus";
import type { Export, ExportFormat } from "@/types/domain";

const FORMAT_CONFIG: Record<ExportFormat, { label: string; icon: React.ReactNode; desc: string }> = {
  markdown: { label: "Markdown", icon: <FileText className="w-4 h-4" />, desc: ".md file" },
  pdf: { label: "PDF", icon: <File className="w-4 h-4" />, desc: ".pdf file" },
  json: { label: "JSON", icon: <FileJson className="w-4 h-4" />, desc: ".json file" },
};

function ExportStatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle className="w-4 h-4 text-[var(--accent-teal)]" />;
  if (status === "failed") return <XCircle className="w-4 h-4 text-red-400" />;
  if (status === "processing") return <Loader className="w-4 h-4 text-[var(--text-muted)] animate-spin" />;
  return <Clock className="w-4 h-4 text-[var(--text-muted)]" />;
}

function ExportRow({ export_ }: { export_: Export }) {
  const { export_: live } = useExportStatus(
    export_.status !== "completed" && export_.status !== "failed" ? export_.id : null
  );
  const current = live ?? export_;
  const cfg = FORMAT_CONFIG[current.format];

  return (
    <div className="flex items-center gap-3 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] p-3">
      <div className="w-8 h-8 rounded-lg bg-[var(--bg-overlay)] flex items-center justify-center text-[var(--text-secondary)]">
        {cfg.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[var(--text-primary)]">{cfg.label}</p>
        <p className="text-xs text-[var(--text-muted)]">{cfg.desc} · {current.status}</p>
      </div>
      <ExportStatusIcon status={current.status} />
      {current.status === "completed" && current.file_url && (
        <a
          href={current.file_url}
          download
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--accent-teal)]/10 text-[var(--accent-teal)] text-xs font-medium hover:bg-[var(--accent-teal)]/20 transition-colors"
        >
          <Download className="w-3 h-3" />
          Download
        </a>
      )}
    </div>
  );
}

export function ExportCenterPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [exports, setExports] = useState<Export[]>([]);
  const [isCreating, setIsCreating] = useState<ExportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    exportsApi.listByProject(projectId)
      .then(setExports)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load exports"));
  }, [projectId]);

  const createExport = async (format: ExportFormat) => {
    if (!projectId) return;
    setIsCreating(format);
    setError(null);
    try {
      const resp = await exportsApi.create({ project_id: projectId, format });
      const newExport: Export = {
        id: resp.export_id,
        project_id: projectId,
        user_id: "",
        format,
        status: resp.status,
        file_url: resp.file_url,
        error_message: null,
        created_at: new Date().toISOString(),
        completed_at: null,
      };
      setExports((prev) => [newExport, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setIsCreating(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <nav className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3">
        <Link
          to={`/project/${projectId}`}
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Blueprint
        </Link>
      </nav>
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Export Blueprint</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">Download your blueprint in multiple formats</p>
      </div>

      {/* Format buttons */}
      <div className="grid grid-cols-3 gap-3">
        {(Object.entries(FORMAT_CONFIG) as [ExportFormat, typeof FORMAT_CONFIG[ExportFormat]][]).map(([format, cfg]) => (
          <motion.button
            key={format}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={() => createExport(format)}
            disabled={isCreating === format}
            className="surface-elevated p-4 text-left space-y-2 hover:border-[var(--border-strong)] transition-colors disabled:opacity-50"
          >
            <div className="text-[var(--accent-teal)]">{cfg.icon}</div>
            <p className="text-sm font-medium text-[var(--text-primary)]">{cfg.label}</p>
            <p className="text-xs text-[var(--text-muted)]">{cfg.desc}</p>
          </motion.button>
        ))}
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Export history */}
      {exports.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-widest">Export History</p>
          {exports.map((e) => <ExportRow key={e.id} export_={e} />)}
        </div>
      )}
    </div>
    </div>
  );
}
