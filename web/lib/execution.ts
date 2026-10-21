import { createHash, timingSafeEqual } from "node:crypto";
export function workerAuthorized(
  header: string | null,
  hash: string | undefined,
): boolean {
  if (!hash || !/^[a-f0-9]{64}$/.test(hash) || !header?.startsWith("Bearer "))
    return false;
  return timingSafeEqual(
    createHash("sha256").update(header.slice(7)).digest(),
    Buffer.from(hash, "hex"),
  );
}
export function operatorAllowed(
  id: string | null,
  configured: string | undefined,
): boolean {
  return Boolean(id && configured && id === configured);
}
export function supportedFiles(
  files: Array<{ path: string; content: string }>,
) {
  // Never silently drop package configuration: unsupported projects fail closed.
  if (files.some((f) => f.path === "package.json"))
    throw new Error(
      "This runner supports dependency-free Node tests only. Generate .mjs files with node:test and no package.json. Jest and npm installation are not supported.",
    );
  return files.filter((f) => !/\.(md|txt)$/.test(f.path));
}
