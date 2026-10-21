import { runNodeTests } from "../lib/runner";
const base = process.env.WORKSPACE_URL,
  token = process.env.WORKER_TOKEN ?? process.env.ASE_WORKER_TOKEN,
  image = process.env.RUNNER_IMAGE;
if (!base || !token || !image)
  throw new Error("Set WORKSPACE_URL, WORKER_TOKEN and pinned RUNNER_IMAGE.");
const url = new URL("/api/worker", base);
if (
  url.protocol !== "https:" &&
  url.hostname !== "localhost" &&
  url.hostname !== "127.0.0.1"
)
  throw new Error("Worker requires HTTPS.");
async function call(body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
    redirect: "error",
  });
  if (!res.ok) throw new Error(`Control API returned ${res.status}`);
  return res.json();
}
async function main() {
  console.log(
    "Execution worker started. Only configured operator jobs are accepted.",
  );
  do {
    try {
      const { job } = await call({ action: "claim" });
      if (job) {
        let result;
        try {
          result = await runNodeTests(job.files, { image: image! });
        } catch {
          result = {
            status: "unavailable",
            exitCode: null,
            log: "Runner rejected input or could not initialize.",
            durationMs: 0,
          };
        }
        await call({
          action: "complete",
          id: job.id,
          leaseToken: job.leaseToken,
          result: {...result,log:result.log.slice(0,100000)},
        });
        console.log(`Job ${job.id}: ${result.status}`);
      }
    } catch (e) {
      console.error(e instanceof Error ? e.message : "Worker failed");
    }
    if (process.argv.includes("--once")) break;
    await new Promise((r) => setTimeout(r, 5000));
  } while (true);
}
main().catch(() => {
  process.exitCode = 1;
});
