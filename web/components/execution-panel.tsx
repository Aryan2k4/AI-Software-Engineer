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
}: {
  projectId: string;
  runId: string;
}) {
  const [jobs, setJobs] = useState<Job[]>([]),
    [enabled, setEnabled] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const res = await fetch(
          `/api/executions?projectId=${encodeURIComponent(projectId)}`,
        );
        if (!res.ok) return;
        const body = await res.json();
        if (active) {
          setJobs(body.jobs);
          setEnabled(body.enabled);
        }
      } catch {
        /* Keep last known result during transient connectivity loss. */
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
  return (
    <section className="panel">
      <h2>Application test execution</h2>
      <p className="muted">
        Operator-only Docker worker. Supports dependency-free Node tests, not
        Jest or npm install. The worker must be online. Execution uses this
        run’s immutable generated files, not later project edits.
      </p>
      {!enabled && (
        <p>
          Execution is unavailable for this account or the worker is not
          configured.
        </p>
      )}
      <Button
        disabled={!enabled || busy || Boolean(job)}
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
      {error && <p role="alert">{error}</p>}
      {job && (
        <div role="status">
          <p>
            Execution status: <b>{job.status}</b>
          </p>
          {job.status === "queued" && (
            <p>Waiting for the operator worker. No tests have run yet.</p>
          )}
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
            </>
          )}
        </div>
      )}
    </section>
  );
}
