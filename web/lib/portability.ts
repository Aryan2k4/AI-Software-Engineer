import { workspaceSchema, type Workspace } from "./domain";

export function importWorkspace(current: Workspace, text: string): Workspace {
  if (new TextEncoder().encode(text).length > 2_000_000) throw new Error("Backup exceeds 2 MB.");
  let incoming: Workspace;
  try { incoming = workspaceSchema.parse(JSON.parse(text)); }
  catch { throw new Error("Invalid workspace backup. Choose a JSON file exported from this app."); }
  if (!incoming.projects.length) throw new Error("This backup contains no projects.");
  if (incoming.projects.length + current.projects.length > 50) throw new Error("Import would exceed the 50-project workspace limit.");
  // Always restore as copies. Never replace existing projects or reuse execution identities.
  const projects = incoming.projects.map((project) => ({
    ...project,
    id: crypto.randomUUID(),
    name: `${project.name.slice(0, 69)} (imported)`,
    runs: project.runs.map((run) => ({ ...run, id: crypto.randomUUID() })),
    tasks: project.tasks.map((task) => ({ ...task, id: crypto.randomUUID() })),
    messages: project.messages.map((message) => ({ ...message, id: crypto.randomUUID() })),
  }));
  const next = workspaceSchema.parse({ projects: [...current.projects, ...projects] });
  if (new TextEncoder().encode(JSON.stringify(next)).length > 2_000_000) throw new Error("Combined workspace exceeds 2 MB. Import into a smaller workspace.");
  return next;
}

function safeArchivePath(path: string) {
  if (!path || path.length > 180 || /[\\:<>"|?*\x00-\x1f\x7f]/.test(path) || path.startsWith("/")) return false;
  return path.split("/").every((segment) => segment && segment !== "." && segment !== ".." &&
    !/[. ]$/.test(segment) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment));
}

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ZIP STORE format: no compression, no dependency, UTF-8 names, no executable attributes.
// Bounds intentionally stay well below ZIP64 thresholds.
export function projectZip(files: Array<{ path: string; content: string }>): Uint8Array<ArrayBuffer> {
  if (!files.length || files.length > 100) throw new Error("Export requires 1–100 files.");
  const seen = new Set<string>();
  const encoder = new TextEncoder();
  const entries = files.map((file) => {
    if (!safeArchivePath(file.path)) throw new Error(`Unsafe archive path: ${file.path}`);
    const normalized = file.path.normalize("NFC").toLowerCase();
    if (seen.has(normalized)) throw new Error("Duplicate archive paths.");
    seen.add(normalized);
    return { name: encoder.encode(file.path), bytes: encoder.encode(file.content) };
  });
  const length = entries.reduce((n, e) => n + 30 + e.name.length + e.bytes.length + 46 + e.name.length, 22);
  if (length > 5_000_000) throw new Error("Archive exceeds 5 MB.");
  const output = new Uint8Array(length);
  const view = new DataView(output.buffer);
  let offset = 0;
  const records: Array<{ start: number; crc: number; name: Uint8Array; bytes: Uint8Array }> = [];
  for (const entry of entries) {
    const start = offset, crc = crc32(entry.bytes);
    view.setUint32(offset, 0x04034b50, true);
    view.setUint16(offset + 4, 20, true);
    view.setUint16(offset + 6, 0x800, true);
    view.setUint16(offset + 12, 33, true); // 1980-01-01
    view.setUint32(offset + 14, crc, true);
    view.setUint32(offset + 18, entry.bytes.length, true);
    view.setUint32(offset + 22, entry.bytes.length, true);
    view.setUint16(offset + 26, entry.name.length, true);
    offset += 30;
    output.set(entry.name, offset); offset += entry.name.length;
    output.set(entry.bytes, offset); offset += entry.bytes.length;
    records.push({ ...entry, start, crc });
  }
  const centralStart = offset;
  for (const entry of records) {
    view.setUint32(offset, 0x02014b50, true);
    view.setUint16(offset + 4, 20, true);
    view.setUint16(offset + 6, 20, true);
    view.setUint16(offset + 8, 0x800, true);
    view.setUint16(offset + 14, 33, true);
    view.setUint32(offset + 16, entry.crc, true);
    view.setUint32(offset + 20, entry.bytes.length, true);
    view.setUint32(offset + 24, entry.bytes.length, true);
    view.setUint16(offset + 28, entry.name.length, true);
    view.setUint32(offset + 42, entry.start, true);
    offset += 46;
    output.set(entry.name, offset); offset += entry.name.length;
  }
  const centralLength = offset - centralStart;
  view.setUint32(offset, 0x06054b50, true);
  view.setUint16(offset + 8, records.length, true);
  view.setUint16(offset + 10, records.length, true);
  view.setUint32(offset + 12, centralLength, true);
  view.setUint32(offset + 16, centralStart, true);
  return output;
}
