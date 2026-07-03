import { apiFetch } from "@/lib/api-client";
import type {
  ProjectShare,
  ShareCreate,
  ShareResponse,
  PublicBlueprintResponse,
} from "@/types/domain";

export const sharesApi = {
  create: (data: ShareCreate) =>
    apiFetch<ShareResponse>("/api/v1/shares", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  listByProject: (projectId: string) =>
    apiFetch<ProjectShare[]>(`/api/v1/shares/project/${projectId}`),

  revoke: (shareId: string) =>
    apiFetch<void>(`/api/v1/shares/${shareId}`, { method: "DELETE" }),

  getPublic: (token: string) =>
    apiFetch<PublicBlueprintResponse>(`/api/v1/public/share/${token}`),
};
