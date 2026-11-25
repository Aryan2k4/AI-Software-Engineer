"use client";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";
type Job = {
  id: string;
  runId: string;
  status: string;
  result?: { log: string; exitCode: number | null; durationMs: number };
};
export function ExecutionPanel({
  projectId,
  runId,
  saving = false,
  onFix,
}: {
  projectId: string;
  runId: string;
  saving?: boolean;
  onFix?: (log: string) => void;
}) {
  const [jobs, setJobs] = useState<Job[]>([]),
    [enabled, setEnabled] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [connectionError, setConnectionError] = useState(""),
    [worker, setWorker] = useState<{ online: boolean; lastSeenAt: string | null } | null>(null);
  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const res = await fetch(
          `/api/executions?projectId=${encodeURIComponent(projectId)}`,
        );
        if (!res.ok) throw new Error("Could not refresh execution status. Check your connection or sign in again.");
        const body = await res.json();
        if (active) {
          setJobs(body.jobs);
          setEnabled(body.enabled);
          setWorker(body.worker ?? null);
          setConnectionError("");
        }
      } catch {
        if (active) setConnectionError("Execution status could not refresh. Displayed results may be stale.");
      }
    }
    void refresh();
    const timer = setInterval(refresh, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [projectId]);
  const job = jobs.find((j) => j.runId === runId);
  async function change(action: "retry" | "cancel") {
    if (!job) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/executions", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: job.id, action }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error);
      setJobs((previous) => previous.map((j) => j.id === job.id ? { ...j, status: body.status, result: undefined } : j));
    } catch (e) { setError(e instanceof Error ? e.message : "Could not update job"); }
    finally { setBusy(false); }
  }
  return (
    <section className="panel">
      <h2>Application test execution</h2>
      <p className="muted">
        Operator-only Docker worker. Supports dependency-free Node tests, not
        Jest or npm install. The worker must be online. Execution uses this
        run’s immutable generated files, not later project edits.
      </p>
      {enabled && worker && <p role="status">Worker: <b>{worker.online ? "Online" : "Offline"}</b>{worker.lastSeenAt ? ` · Last connected ${new Date(worker.lastSeenAt).toLocaleString()}` : " · No connection recorded yet"}</p>}
      {enabled && worker && !worker.online && <p>Queued tests wait until your worker reconnects. Open Docker Desktop and run <code>npm run worker</code> in the configured web terminal. Keep the computer awake. The website remains available while the worker is offline.</p>}
      {connectionError && <p role="alert">{connectionError}</p>}
      {saving && <p>Waiting for workspace changes to save before requesting tests.</p>}
      {!enabled && (
        <p>
          Execution is unavailable for this account or the worker is not
          configured.
        </p>
      )}
      <Button
        disabled={!enabled || busy || saving || Boolean(job)}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const res = await fetch("/api/executions", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ projectId, runId }),
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error);
            setJobs((previous) => [{ ...body, runId }, ...previous]);
          } catch (e) {
            setError(e instanceof Error ? e.message : "Could not queue tests");
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Queuing…" : job ? "Tests requested" : "Run tests in isolation"}
      </Button>
      {enabled && job?.status === "queued" && <Button variant="outline" disabled={busy} onClick={() => change("cancel")}>Cancel queued tests</Button>}
      {enabled && job && ["failed", "timeout", "unavailable", "expired", "cancelled"].includes(job.status) && <Button variant="outline" disabled={busy || saving} onClick={() => change("retry")}>Retry tests</Button>}
      {error && <p role="alert">{error}</p>}
      {job && (
        <div role="status">
          <p>
            Execution status: <b>{job.status}</b>
          </p>
          {job.status === "queued" && (
            <p>Waiting for the operator worker. No tests have run yet.</p>
          )}
          {job.status === "running" && <p>Tests are running in an isolated container. Maximum application runtime: 30 seconds.</p>}
          {job.status === "cancelled" && <p>Cancelled before execution. You can retry this same snapshot.</p>}
          {job.status === "expired" && (
            <p>
              The worker did not report before its lease expired. No passing
              result is available.
            </p>
          )}
          {job.result && (
            <>
              <p>
                Exit code: {String(job.result.exitCode)} ·{" "}
                {job.result.durationMs} ms
              </p>
              <pre className="prose-pre">{job.result.log}</pre>
              {onFix && ["failed", "timeout"].includes(job.status) && <Button variant="outline" onClick={() => onFix(job.result!.log)}>Prepare fix request</Button>}
            </>
          )}
        </div>
      )}
    </section>
  );
}
