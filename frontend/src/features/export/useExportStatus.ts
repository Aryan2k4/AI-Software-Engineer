/**
 * useExportStatus — ADR-005
 * Primary: Supabase Realtime channel on exports table
 * Fallback: polling every 3s if Realtime fails or disconnects
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { exportsApi } from "@/features/export/api";
import type { Export, ExportStatus } from "@/types/domain";

const POLL_INTERVAL_MS = 3000;
const REALTIME_TIMEOUT_MS = 5000;

interface UseExportStatusResult {
  export_: Export | null;
  status: ExportStatus | null;
  isLoading: boolean;
  error: string | null;
}

export function useExportStatus(exportId: string | null): UseExportStatusResult {
  const [export_, setExport] = useState<Export | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const realtimeConnected = useRef(false);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const fetchExport = useCallback(async () => {
    if (!exportId) return;
    try {
      const data = await exportsApi.get(exportId);
      setExport(data);
      if (data.status === "completed" || data.status === "failed") {
        stopPolling();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch export");
    }
  }, [exportId, stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollTimerRef.current = setInterval(fetchExport, POLL_INTERVAL_MS);
  }, [fetchExport, stopPolling]);

  useEffect(() => {
    if (!exportId) return;

    setIsLoading(true);
    fetchExport().finally(() => setIsLoading(false));

    // Attempt Realtime subscription
    const channel = supabase
      .channel(`export-${exportId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "exports",
          filter: `id=eq.${exportId}`,
        },
        (payload) => {
          realtimeConnected.current = true;
          stopPolling();
          if (payload.new) {
            setExport(payload.new as Export);
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          realtimeConnected.current = true;
        }
      });

    // Fallback: if Realtime doesn't connect within timeout, start polling
    const realtimeTimeout = setTimeout(() => {
      if (!realtimeConnected.current) {
        startPolling();
      }
    }, REALTIME_TIMEOUT_MS);

    return () => {
      clearTimeout(realtimeTimeout);
      stopPolling();
      supabase.removeChannel(channel);
      realtimeConnected.current = false;
    };
  }, [exportId, fetchExport, startPolling, stopPolling]);

  return {
    export_,
    status: export_?.status ?? null,
    isLoading,
    error,
  };
}
