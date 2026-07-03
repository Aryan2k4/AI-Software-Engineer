import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link2, Check, Trash2, Eye, Plus } from "lucide-react";
import { sharesApi } from "@/features/share/api";
import type { ProjectShare, ShareResponse } from "@/types/domain";

interface SharePanelProps {
  projectId: string;
  shares: ProjectShare[];
  onShareCreated: (share: ShareResponse) => void;
  onShareRevoked: (shareId: string) => void;
}

export function SharePanel({ projectId, shares, onShareCreated, onShareRevoked }: SharePanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createShare = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const share = await sharesApi.create({ project_id: projectId, visibility: "public" });
      onShareCreated(share);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create share link");
    } finally {
      setIsCreating(false);
    }
  };

  const copyLink = async (url: string, shareId: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedId(shareId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const revokeShare = async (shareId: string) => {
    try {
      await sharesApi.revoke(shareId);
      onShareRevoked(shareId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke share");
    }
  };

  return (
    <div className="surface-elevated p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Share Blueprint</p>
          <p className="text-xs text-[var(--text-muted)]">Create public share links</p>
        </div>
        <button
          onClick={createShare}
          disabled={isCreating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--accent-teal)] text-[var(--bg-base)] text-xs font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          <Plus className="w-3.5 h-3.5" />
          {isCreating ? "Creating…" : "New Link"}
        </button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs text-red-400"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {shares.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)] text-center py-4">No share links yet</p>
      ) : (
        <div className="space-y-2">
          {shares.map((share) => {
            const shareUrl = `${window.location.origin}/share/${share.share_token}`;
            return (
              <div
                key={share.id}
                className="flex items-center gap-2 rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] p-2.5"
              >
                <Link2 className="w-3.5 h-3.5 text-[var(--accent-teal)] shrink-0" />
                <span className="flex-1 min-w-0 text-xs font-mono text-[var(--text-secondary)] truncate">
                  /share/{share.share_token}
                </span>
                <div className="flex items-center gap-1 shrink-0 text-[var(--text-muted)]">
                  <Eye className="w-3 h-3" />
                  <span className="text-xs">{share.view_count}</span>
                </div>
                <button
                  onClick={() => copyLink(shareUrl, share.id)}
                  className="p-1 rounded hover:bg-[var(--bg-overlay)] transition-colors"
                  title="Copy link"
                >
                  {copiedId === share.id ? (
                    <Check className="w-3.5 h-3.5 text-[var(--accent-teal)]" />
                  ) : (
                    <Link2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                  )}
                </button>
                <button
                  onClick={() => revokeShare(share.id)}
                  className="p-1 rounded hover:bg-[var(--bg-overlay)] transition-colors"
                  title="Revoke"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400/60 hover:text-red-400" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
