import { apiFetch } from "@/lib/api-client";
import type { Blueprint } from "@/types/domain";

export const blueprintsApi = {
  getByProject: (projectId: string) =>
    apiFetch<Blueprint>(`/api/v1/blueprints/project/${projectId}`),
};
