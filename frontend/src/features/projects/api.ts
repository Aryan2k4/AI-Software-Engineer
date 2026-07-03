import { apiFetch } from "@/lib/api-client";
import type { Project, ProjectCreate, ProjectSummary } from "@/types/domain";

const BASE = "/api/v1/projects";

export const projectsApi = {
  create: (data: ProjectCreate) =>
    apiFetch<Project>(BASE, { method: "POST", body: JSON.stringify(data) }),

  list: () => apiFetch<ProjectSummary[]>(BASE),

  get: (id: string) => apiFetch<Project>(`${BASE}/${id}`),

  delete: (id: string) => apiFetch<void>(`${BASE}/${id}`, { method: "DELETE" }),
};
