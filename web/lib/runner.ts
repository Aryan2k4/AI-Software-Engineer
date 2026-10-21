import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
export type RunnerFile = { path: string; content: string };
export type ExecutionResult = {
  status: "passed" | "failed" | "timeout" | "unavailable";
  exitCode: number | null;
  log: string;
  durationMs: number;
};

// Operator-only helper. Never call this from a public request handler.
export function validateRunnerFiles(files: RunnerFile[]): void {
  if (!Array.isArray(files) || !files.length || files.length > 30)
    throw new Error("Supply 1–30 files.");
  let size = 0;
  const paths = new Set<string>();
  for (const file of files) {
    if (
      typeof file.path !== "string" ||
      typeof file.content !== "string" ||
      file.path.length > 180 ||
      !/^(src|test|tests)\/[A-Za-z0-9_./-]+\.(mjs|cjs|js|json)$/.test(
        file.path,
      ) ||
      file.path.split("/").some((p) => !p || p === "." || p === "..") ||
      file.path.includes(":")
    )
      throw new Error("Unsupported or unsafe file path.");
    const key = file.path.toLowerCase();
    if (paths.has(key)) throw new Error("Duplicate file path.");
    paths.add(key);
    size += Buffer.byteLength(file.content);
    if (size > 500000) throw new Error("Execution input exceeds 500 KB.");
  }
  if (!files.some((f) => /^(test|tests)\/.*\.test\.(mjs|cjs|js)$/.test(f.path)))
    throw new Error("Include at least one Node test file.");
}

function command(
  args: string[],
  timeoutMs: number,
): Promise<{ code: number | null; log: string; timedOut: boolean }> {
  return new Promise((resolve) => {
    const child = spawn("docker", args, {
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let log = "",
      bytes = 0,
      timedOut = false,
      done = false;
    const capture = (chunk: Buffer) => {
      const remaining = 1_000_000 - bytes;
      if (remaining > 0) {
        log += chunk.subarray(0, remaining).toString("utf8");
        bytes += Math.min(chunk.length, remaining);
      }
    };
    child.stdout.on("data", capture);
    child.stderr.on("data", capture);
    const finish = (code: number | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve({ code, log, timedOut });
    };
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
      finish(null);
    }, timeoutMs);
    child.on("error", () => {
      log += "Docker command unavailable.";
      finish(null);
    });
    child.on("close", finish);
  });
}

export async function runNodeTests(
  files: RunnerFile[],
  options: { image: string; timeoutMs?: number },
): Promise<ExecutionResult> {
  validateRunnerFiles(files);
  if (!/^node@sha256:[a-f0-9]{64}$/.test(options.image))
    throw new Error("Use an explicitly pinned Node image digest.");
  const timeout = options.timeoutMs ?? 30000;
  if (!Number.isInteger(timeout) || timeout < 100 || timeout > 30000)
    throw new Error("Timeout must be 100–30000 ms.");
  const started = Date.now(),
    directory = await mkdtemp(join(tmpdir(), "ase-run-")),
    name = `ase-test-${crypto.randomUUID()}`;
  try {
    for (const file of files) {
      const target = join(directory, ...file.path.split("/"));
      await mkdir(dirname(target), { recursive: true });
      await writeFile(target, file.content, { encoding: "utf8", flag: "wx" });
    }
    const tests = files
      .filter((f) => /^(test|tests)\/.*\.test\.(mjs|cjs|js)$/.test(f.path))
      .map((f) => `/workspace/${f.path}`);
    const result = await command(
      [
        "run",
        "--name",
        name,
        "--rm",
        "--pull=never",
        "--network=none",
        "--read-only",
        "--cap-drop=ALL",
        "--security-opt=no-new-privileges",
        "--user=65534:65534",
        "--memory=256m",
        "--memory-swap=256m",
        "--cpus=1",
        "--pids-limit=64",
        "--log-driver=none",
        "--tmpfs=/tmp:rw,noexec,nosuid,size=16m",
        "--mount",
        `type=bind,source=${directory},target=/workspace,readonly`,
        "--workdir=/workspace",
        options.image,
        "node",
        "--test",
        ...tests,
      ],
      timeout,
    );
    return {
      status: result.timedOut
        ? "timeout"
        : result.code === 0
          ? "passed"
          : result.code === 125 || result.code === null
            ? "unavailable"
            : "failed",
      exitCode: result.code,
      log: result.log,
      durationMs: Date.now() - started,
    };
  } finally {
    // Exact generated container name only; never prune unrelated containers.
    await command(["rm", "--force", name], 5000);
    await rm(directory, { recursive: true, force: true });
  }
}
