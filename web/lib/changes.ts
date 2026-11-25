import type { Project, Run } from "./domain";

export function previousArtifact(project: Project, run: Run, path: string) {
  const index = project.runs.findIndex((candidate) => candidate.id === run.id);
  if (index < 0) return undefined;
  return project.runs.slice(index + 1).flatMap((older) => older.output.files).find((file) => file.path === path);
}

// Prefix/suffix context keeps unchanged lines out of the highlighted replacement block.
export function lineChanges(before: string, after: string) {
  const a = before === "" ? [] : before.split("\n"), b = after.split("\n");
  let start = 0, end = 0;
  while (start < Math.min(a.length, b.length) && a[start] === b[start]) start++;
  while (end < Math.min(a.length, b.length) - start && a[a.length - end - 1] === b[b.length - end - 1]) end++;
  return { contextBefore: b.slice(0, start), removed: a.slice(start, a.length - end), added: b.slice(start, b.length - end), contextAfter: end ? b.slice(-end) : [] };
}
