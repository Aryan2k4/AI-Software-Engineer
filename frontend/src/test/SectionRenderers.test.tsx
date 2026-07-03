import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import {
  IdeaClarificationRenderer,
  TechStackRenderer,
  ArchitectureRenderer,
  DatabaseSchemaRenderer,
  APIDesignRenderer,
} from "@/features/blueprint/SectionRenderers";
import type {
  IdeaClarification,
  TechStack,
  Architecture,
  DatabaseSchema,
  APIDesign,
} from "@/types/domain";

const mockIdea: IdeaClarification = {
  title: "Task Manager",
  summary: "A tool for managing tasks.",
  key_features: ["Create tasks", "Assign tasks"],
  target_users: "Teams",
  success_metrics: ["DAU > 1000"],
};

const mockTechStack: TechStack = {
  frontend: { framework: "React", language: "TypeScript" },
  backend: { framework: "FastAPI", language: "Python" },
  database: { primary: "PostgreSQL" },
  infrastructure: { hosting: "AWS" },
};

const mockArch: Architecture = {
  pattern: "Clean Architecture",
  layers: ["Presentation", "Domain"],
  diagram: "[ UI ] → [ Service ] → [ DB ]",
  description: "Layered architecture for separation of concerns",
};

const mockDB: DatabaseSchema = {
  tables: [{ name: "users", columns: ["id", "email"], description: "" }],
  relationships: ["users → projects"],
};

const mockAPI: APIDesign = {
  style: "REST",
  base_url: "/api/v1",
  endpoints: [{ method: "GET", path: "/health", description: "Health check", auth_required: false }],
  versioning: "URL versioning",
};

describe("IdeaClarificationRenderer", () => {
  it("renders title and summary", () => {
    render(<IdeaClarificationRenderer data={mockIdea} />);
    expect(screen.getByText("Task Manager")).toBeInTheDocument();
    expect(screen.getByText("A tool for managing tasks.")).toBeInTheDocument();
  });

  it("renders key features", () => {
    render(<IdeaClarificationRenderer data={mockIdea} />);
    expect(screen.getByText("Create tasks")).toBeInTheDocument();
  });
});

describe("TechStackRenderer", () => {
  it("renders framework names", () => {
    render(<TechStackRenderer data={mockTechStack} />);
    expect(screen.getByText("React")).toBeInTheDocument();
    expect(screen.getByText("FastAPI")).toBeInTheDocument();
  });
});

describe("ArchitectureRenderer", () => {
  it("renders pattern and layers", () => {
    render(<ArchitectureRenderer data={mockArch} />);
    expect(screen.getByText("Clean Architecture")).toBeInTheDocument();
    expect(screen.getByText("Presentation")).toBeInTheDocument();
  });
});

describe("DatabaseSchemaRenderer", () => {
  it("renders table names and columns", () => {
    render(<DatabaseSchemaRenderer data={mockDB} />);
    expect(screen.getByText("users")).toBeInTheDocument();
    expect(screen.getByText("id")).toBeInTheDocument();
  });
});

describe("APIDesignRenderer", () => {
  it("renders endpoint method and path", () => {
    render(<APIDesignRenderer data={mockAPI} />);
    expect(screen.getByText("GET")).toBeInTheDocument();
    expect(screen.getByText("/health")).toBeInTheDocument();
  });
});
