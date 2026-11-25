import { test } from "node:test";
import assert from "node:assert/strict";
import { importWorkspace, projectZip } from "../lib/portability";
import { seed, workspaceSchema } from "../lib/domain";
import { execFileSync } from "node:child_process";

test("backup import preserves original projects and assigns independent identities", () => {
  const original = seed();
  const next = importWorkspace(original, JSON.stringify(original));
  assert.equal(next.projects.length, 6);
  assert.deepEqual(next.projects.slice(0, 3), original.projects);
  assert.equal(new Set(next.projects.map((p) => p.id)).size, 6);
  assert.notEqual(next.projects[3].runs[0].id, original.projects[0].runs[0].id);
  assert.notEqual(next.projects[3].tasks[0].id, original.projects[0].tasks[0].id);
  assert.deepEqual(next.projects[3].files, original.projects[0].files);
  assert.equal(workspaceSchema.safeParse(next).success, true);
});
test("backup rejects malformed, empty, oversized and over-capacity imports", () => {
  for (const input of ["no", "{}", '{"projects":[]}', " ".repeat(2000001)])
    assert.throws(() => importWorkspace(seed(), input));
  assert.throws(() => importWorkspace({ projects: Array.from({ length: 50 }, () => seed().projects[0]) }, JSON.stringify(seed())));
});
test("ZIP contains UTF-8 paths, known CRC and a central directory", () => {
  const zip = Buffer.from(projectZip([{ path: "src/é.txt", content: "123456789" }]));
  assert.equal(zip.readUInt32LE(0), 0x04034b50);
  assert.equal(zip.readUInt32LE(14), 0xcbf43926);
  assert.equal(zip.readUInt16LE(6), 0x800);
  const end = zip.length - 22;
  assert.equal(zip.readUInt32LE(end), 0x06054b50);
  assert.equal(zip.readUInt16LE(end + 10), 1);
  assert.equal(zip.readUInt32LE(zip.readUInt32LE(end + 16)), 0x02014b50);
});
test("archive refuses traversal, Windows device names and ambiguous duplicates", () => {
  for (const path of ["../secret", "/etc/passwd", "C:/file", "src\\file", "src/../file", "src/NUL.txt", "src/file.", "src//file", "src/\0file"])
    assert.throws(() => projectZip([{ path, content: "x" }]));
  assert.throws(() => projectZip([{ path: "src/a.js", content: "x" }, { path: "src/A.js", content: "y" }]));
  assert.throws(() => projectZip([]));
});
test("Windows standard ZIP reader independently opens exported project", { skip: process.platform !== "win32" }, () => {
  const zip = projectZip([{ path: "src/hello.js", content: "export const hello = 'world';" }, { path: "README.md", content: "Read me" }]);
  const script = `Add-Type -AssemblyName System.IO.Compression; $stream = [System.IO.MemoryStream]::new([Convert]::FromBase64String($env:ASE_ZIP_FIXTURE)); $archive = [System.IO.Compression.ZipArchive]::new($stream); $entries = @($archive.Entries | ForEach-Object { $reader = [System.IO.StreamReader]::new($_.Open()); @{path=$_.FullName;content=$reader.ReadToEnd()}; $reader.Dispose() }); $entries | ConvertTo-Json -Compress; $archive.Dispose(); $stream.Dispose()`;
  const output = execFileSync("powershell.exe", ["-NoProfile", "-Command", script], { encoding: "utf8", windowsHide: true, env: { ...process.env, ASE_ZIP_FIXTURE: Buffer.from(zip).toString("base64") } });
  assert.deepEqual(JSON.parse(output), [{ path: "src/hello.js", content: "export const hello = 'world';" }, { path: "README.md", content: "Read me" }]);
});
