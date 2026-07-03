import { apiFetch } from "@/lib/api-client";
import type { Export, ExportCreate, ExportResponse } from "@/types/domain";

const BASE = "/api/v1/exports";

export const exportsApi = {
  create: (data: ExportCreate) =>
    apiFetch<ExportResponse>(BASE, { method: "POST", body: JSON.stringify(data) }),

  get: (id: string) => apiFetch<Export>(`${BASE}/${id}`),

  listByProject: (projectId: string) =>
    apiFetch<Export[]>(`${BASE}/project/${projectId}`),
};
