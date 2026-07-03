// Domain types — kept in sync with backend Pydantic models
// Regenerate api.types.ts via: npm run generate-types

export type GenerationStatus = "pending" | "running" | "completed" | "failed";
export type ExportFormat = "markdown" | "pdf" | "json";
export type ExportStatus = "pending" | "processing" | "completed" | "failed";
export type ShareVisibility = "public" | "private";

export interface Project {
  id: string;
  user_id: string;
  name: string;
  original_idea: string;
  status: GenerationStatus;
  current_stage: number;
  total_stages: number;
  blueprint_id: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  status: GenerationStatus;
  current_stage: number;
  total_stages: number;
  created_at: string;
  has_blueprint: boolean;
}

export interface ProjectCreate {
  name: string;
  original_idea: string;
}

// ── Blueprint ──────────────────────────────────────────────────────────────────

export interface IdeaClarification {
  title: string;
  summary: string;
  key_features: string[];
  target_users: string;
  success_metrics: string[];
}

export interface TechStack {
  frontend: Record<string, string>;
  backend: Record<string, string>;
  database: Record<string, string>;
  infrastructure: Record<string, string>;
}

export interface Architecture {
  pattern: string;
  layers: string[];
  diagram: string;
  description: string;
}

export interface DBTable {
  name: string;
  columns: string[];
  description: string;
}

export interface DatabaseSchema {
  tables: DBTable[];
  relationships: string[];
}

export interface APIEndpoint {
  method: string;
  path: string;
  description: string;
  auth_required: boolean;
}

export interface APIDesign {
  style: string;
  base_url: string;
  endpoints: APIEndpoint[];
  versioning: string;
}

export interface RoadmapPhase {
  phase: number;
  title: string;
  duration: string;
  tasks: string[];
}

export interface ImplementationRoadmap {
  phases: RoadmapPhase[];
  total_duration: string;
}

export interface SecurityDeployment {
  auth: string;
  https: boolean;
  environment: string;
  monitoring: string;
  notes: string[];
}

export interface TestingStrategy {
  unit: string;
  integration: string;
  e2e: string;
  coverage_target: string;
}

export interface Documentation {
  api_docs: string;
  readme: string;
  adr: string;
  notes: string[];
}

export interface BlueprintSections {
  idea_clarification: IdeaClarification | null;
  tech_stack: TechStack | null;
  architecture: Architecture | null;
  database_schema: DatabaseSchema | null;
  api_design: APIDesign | null;
  implementation_roadmap: ImplementationRoadmap | null;
  security_deployment: SecurityDeployment | null;
  testing_strategy: TestingStrategy | null;
  documentation: Documentation | null;
}

export interface Blueprint {
  id: string;
  project_id: string;
  user_id: string;
  original_idea: string;
  sections: BlueprintSections;
  version: string;
  created_at: string;
  updated_at: string;
}

// ── Export ─────────────────────────────────────────────────────────────────────

export interface Export {
  id: string;
  project_id: string;
  user_id: string;
  format: ExportFormat;
  status: ExportStatus;
  file_url: string | null;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
}

export interface ExportCreate {
  project_id: string;
  format: ExportFormat;
}

export interface ExportResponse {
  export_id: string;
  status: ExportStatus;
  file_url: string | null;
  message: string;
}

// ── Share ──────────────────────────────────────────────────────────────────────

export interface ProjectShare {
  id: string;
  project_id: string;
  user_id: string;
  share_token: string;
  visibility: ShareVisibility;
  view_count: number;
  expires_at: string | null;
  created_at: string;
}

export interface ShareCreate {
  project_id: string;
  visibility: ShareVisibility;
  expires_in_days?: number;
}

export interface ShareResponse {
  share_id: string;
  share_token: string;
  share_url: string;
  visibility: ShareVisibility;
  expires_at: string | null;
}

export interface PublicBlueprintResponse {
  project_name: string;
  original_idea: string;
  sections: BlueprintSections;
  created_at: string;
  share_token: string;
}
