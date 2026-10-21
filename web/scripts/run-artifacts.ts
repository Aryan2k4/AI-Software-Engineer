import { readFile } from "node:fs/promises";
import { runNodeTests } from "../lib/runner";
async function main() {
  const file = process.argv[2],
    image = process.env.RUNNER_IMAGE;
  if (!file || !image)
    throw new Error(
      "Usage: RUNNER_IMAGE=node@sha256:... npm run runner -- artifacts.json",
    );
  const raw = await readFile(file, "utf8");
  if (Buffer.byteLength(raw) > 1_000_000)
    throw new Error("Artifact JSON exceeds 1 MB.");
  const input = JSON.parse(raw);
  const result = await runNodeTests(input.files ?? input, { image });
  console.log(JSON.stringify(result, null, 2));
  process.exitCode = result.status === "passed" ? 0 : 1;
}
main().catch((e) => {
  console.error(e instanceof Error ? e.message : "Runner failed");
  process.exitCode = 1;
});
