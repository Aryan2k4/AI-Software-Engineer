import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, X } from "lucide-react";
import { projectsApi } from "@/features/projects/api";
import { blueprintsApi } from "@/features/blueprint/api";
import { sharesApi } from "@/features/share/api";
import { BlueprintHeader } from "@/features/blueprint/BlueprintHeader";
import { ResultPanel } from "@/features/blueprint/ResultPanel";
import { SharePanel } from "@/features/share/SharePanel";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import type { Project, Blueprint, ProjectShare, ShareResponse } from "@/types/domain";

type Drawer = "export" | "share" | null;

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <nav className="border-b border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-3 flex items-center gap-3">
        <Link
          to="/dashboard"
          className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Dashboard
        </Link>
      </nav>
      {children}
    </div>
  );
}

function BlueprintPageContent() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [blueprint, setBlueprint] = useState<Blueprint | null>(null);
  const [shares, setShares] = useState<ProjectShare[]>([]);
  const [drawer, setDrawer] = useState<Drawer>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    Promise.all([
      projectsApi.get(projectId),
      blueprintsApi.getByProject(projectId),
      sharesApi.listByProject(projectId),
    ])
      .then(([p, b, s]) => {
        setProject(p);
        setBlueprint(b);
        setShares(s);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load blueprint"))
      .finally(() => setIsLoading(false));
  }, [projectId]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 border-[var(--accent-teal)] border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (error || !project || !blueprint) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center py-24">
          <div className="surface-elevated max-w-sm w-full p-8 text-center space-y-3">
            <p className="text-[var(--text-primary)]">Blueprint not found</p>
            <p className="text-sm text-[var(--text-muted)]">{error}</p>
            <button
              onClick={() => navigate("/dashboard")}
              className="text-sm text-[var(--accent-teal)] hover:underline"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <BlueprintHeader
        project={project}
        blueprint={blueprint}
        onExportClick={() => navigate(`/project/${projectId}/export`)}
        onShareClick={() => setDrawer("share")}
      />

      <main className="max-w-4xl mx-auto px-4 py-8">
        <ResultPanel blueprint={blueprint} />
      </main>

      {/* Share drawer */}
      <AnimatePresence>
        {drawer === "share" && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setDrawer(null)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed right-0 top-0 bottom-0 w-full max-w-sm bg-[var(--bg-surface)] border-l border-[var(--border-subtle)] z-50 overflow-y-auto"
            >
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
                <p className="text-sm font-semibold text-[var(--text-primary)]">Share Blueprint</p>
                <button
                  onClick={() => setDrawer(null)}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-overlay)] transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4">
                <SharePanel
                  projectId={projectId!}
                  shares={shares}
                  onShareCreated={(share: ShareResponse) => {
                    setShares((prev) => [
                      {
                        id: share.share_id,
                        project_id: projectId!,
                        user_id: "",
                        share_token: share.share_token,
                        visibility: share.visibility,
                        view_count: 0,
                        expires_at: share.expires_at,
                        created_at: new Date().toISOString(),
                      },
                      ...prev,
                    ]);
                  }}
                  onShareRevoked={(shareId) =>
                    setShares((prev) => prev.filter((s) => s.id !== shareId))
                  }
                />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}

export function BlueprintPage() {
  return (
    <ErrorBoundary>
      <BlueprintPageContent />
    </ErrorBoundary>
  );
}
