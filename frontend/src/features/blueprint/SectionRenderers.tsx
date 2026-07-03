/**
 * Blueprint section renderer components.
 * Each renders its specific section with the design system.
 */
import { motion } from "framer-motion";
import type {
  IdeaClarification,
  TechStack,
  Architecture,
  DatabaseSchema,
  APIDesign,
  ImplementationRoadmap,
  SecurityDeployment,
  TestingStrategy,
  Documentation,
} from "@/types/domain";

const fadeIn = { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 } };

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div {...fadeIn} transition={{ duration: 0.3 }} className="surface-elevated p-6 space-y-4">
      <h3 className="text-sm font-semibold text-[var(--accent-teal)] uppercase tracking-widest">
        {title}
      </h3>
      {children}
    </motion.div>
  );
}

function Chip({ label }: { label: string }) {
  return (
    <span className="inline-block px-2.5 py-1 rounded-md bg-[var(--bg-overlay)] text-xs text-[var(--text-secondary)] border border-[var(--border-subtle)]">
      {label}
    </span>
  );
}

export function IdeaClarificationRenderer({ data }: { data: IdeaClarification }) {
  return (
    <SectionCard title="Idea Clarification">
      <div>
        <p className="text-base font-semibold text-[var(--text-primary)]">{data.title}</p>
        <p className="mt-2 text-sm text-[var(--text-secondary)] leading-relaxed">{data.summary}</p>
      </div>
      {data.key_features.length > 0 && (
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-2">Key Features</p>
          <ul className="space-y-1">
            {data.key_features.map((f, i) => (
              <li key={i} className="text-sm text-[var(--text-secondary)] flex gap-2">
                <span className="text-[var(--accent-teal)] mt-0.5">›</span> {f}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-1.5">
        {data.success_metrics.map((m, i) => <Chip key={i} label={m} />)}
      </div>
    </SectionCard>
  );
}

export function TechStackRenderer({ data }: { data: TechStack }) {
  const layers = [
    { label: "Frontend", items: data.frontend },
    { label: "Backend", items: data.backend },
    { label: "Database", items: data.database },
    { label: "Infrastructure", items: data.infrastructure },
  ].filter((l) => Object.keys(l.items).length > 0);

  return (
    <SectionCard title="Tech Stack">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {layers.map((layer) => (
          <div key={layer.label} className="space-y-1.5">
            <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
              {layer.label}
            </p>
            {Object.entries(layer.items).map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-[var(--text-muted)] capitalize">{k}</span>
                <span className="text-[var(--text-primary)] font-medium">{v}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export function ArchitectureRenderer({ data }: { data: Architecture }) {
  return (
    <SectionCard title="Architecture">
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--text-muted)]">Pattern</span>
        <span className="text-sm font-medium text-[var(--accent-teal)]">{data.pattern}</span>
      </div>
      {data.layers.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.layers.map((l, i) => <Chip key={i} label={l} />)}
        </div>
      )}
      {data.description && (
        <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{data.description}</p>
      )}
      {data.diagram && (
        <pre className="text-xs font-mono text-[var(--text-secondary)] bg-[var(--bg-base)] rounded-lg p-4 overflow-x-auto border border-[var(--border-subtle)] whitespace-pre-wrap">
          {data.diagram}
        </pre>
      )}
    </SectionCard>
  );
}

export function DatabaseSchemaRenderer({ data }: { data: DatabaseSchema }) {
  return (
    <SectionCard title="Database Schema">
      <div className="space-y-3">
        {data.tables.map((table, i) => (
          <div key={i} className="rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] p-3">
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-1.5">{table.name}</p>
            <div className="flex flex-wrap gap-1">
              {table.columns.map((col, j) => (
                <span key={j} className="text-xs font-mono text-[var(--accent-teal)] bg-[var(--accent-teal)]/5 px-2 py-0.5 rounded">
                  {col}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      {data.relationships.length > 0 && (
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-2">Relationships</p>
          <ul className="space-y-1">
            {data.relationships.map((r, i) => (
              <li key={i} className="text-xs text-[var(--text-secondary)]">› {r}</li>
            ))}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}

export function APIDesignRenderer({ data }: { data: APIDesign }) {
  const methodColors: Record<string, string> = {
    GET: "text-green-400",
    POST: "text-blue-400",
    PUT: "text-yellow-400",
    PATCH: "text-orange-400",
    DELETE: "text-red-400",
  };

  return (
    <SectionCard title="API Design">
      <div className="flex items-center gap-4 text-sm">
        <span className="text-[var(--text-muted)]">{data.style}</span>
        <code className="text-[var(--accent-teal)] font-mono text-xs bg-[var(--bg-base)] px-2 py-0.5 rounded">
          {data.base_url}
        </code>
      </div>
      <div className="space-y-2">
        {data.endpoints.map((ep, i) => (
          <div key={i} className="flex items-start gap-3 text-xs rounded-lg bg-[var(--bg-base)] border border-[var(--border-subtle)] p-2.5">
            <span className={`font-mono font-bold w-14 shrink-0 ${methodColors[ep.method] ?? "text-[var(--text-primary)]"}`}>
              {ep.method}
            </span>
            <code className="font-mono text-[var(--text-secondary)] shrink-0">{ep.path}</code>
            <span className="text-[var(--text-muted)] flex-1">{ep.description}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export function RoadmapRenderer({ data }: { data: ImplementationRoadmap }) {
  return (
    <SectionCard title="Implementation Roadmap">
      {data.total_duration && (
        <p className="text-xs text-[var(--text-muted)]">Total: <span className="text-[var(--text-secondary)]">{data.total_duration}</span></p>
      )}
      <div className="space-y-4">
        {data.phases.map((phase) => (
          <div key={phase.phase} className="relative pl-6">
            <div className="absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-[var(--accent-teal)] bg-[var(--bg-base)] flex items-center justify-center">
              <span className="text-[8px] text-[var(--accent-teal)] font-bold">{phase.phase}</span>
            </div>
            {phase.phase < data.phases.length && (
              <div className="absolute left-[7px] top-5 bottom-0 w-px bg-[var(--border-subtle)]" />
            )}
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              {phase.title}
              {phase.duration && <span className="text-xs text-[var(--text-muted)] ml-2 font-normal">({phase.duration})</span>}
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {phase.tasks.map((t, i) => (
                <li key={i} className="text-xs text-[var(--text-secondary)]">› {t}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

export function SecurityRenderer({ data }: { data: SecurityDeployment }) {
  return (
    <SectionCard title="Security & Deployment">
      <div className="grid grid-cols-2 gap-3 text-sm">
        {[
          ["Auth", data.auth],
          ["HTTPS", data.https ? "Enabled" : "Disabled"],
          ["Environment", data.environment],
          ["Monitoring", data.monitoring],
        ].map(([k, v]) => v ? (
          <div key={String(k)}>
            <p className="text-xs text-[var(--text-muted)]">{String(k)}</p>
            <p className="text-[var(--text-primary)] font-medium">{String(v)}</p>
          </div>
        ) : null)}
      </div>
      {data.notes.length > 0 && (
        <ul className="space-y-1">
          {data.notes.map((n, i) => <li key={i} className="text-xs text-[var(--text-secondary)]">› {n}</li>)}
        </ul>
      )}
    </SectionCard>
  );
}

export function TestingRenderer({ data }: { data: TestingStrategy }) {
  return (
    <SectionCard title="Testing Strategy">
      <div className="grid grid-cols-2 gap-3 text-sm">
        {[["Unit", data.unit], ["Integration", data.integration], ["E2E", data.e2e], ["Coverage", data.coverage_target]].map(([k, v]) => v ? (
          <div key={String(k)}>
            <p className="text-xs text-[var(--text-muted)]">{String(k)}</p>
            <p className="text-[var(--text-primary)]">{String(v)}</p>
          </div>
        ) : null)}
      </div>
    </SectionCard>
  );
}

export function DocumentationRenderer({ data }: { data: Documentation }) {
  return (
    <SectionCard title="Documentation">
      <div className="space-y-2 text-sm">
        {[["API Docs", data.api_docs], ["README", data.readme], ["ADR", data.adr]].map(([k, v]) => v ? (
          <div key={String(k)} className="flex gap-3">
            <span className="text-[var(--text-muted)] w-20 shrink-0">{String(k)}</span>
            <span className="text-[var(--text-secondary)]">{String(v)}</span>
          </div>
        ) : null)}
      </div>
      {data.notes.length > 0 && (
        <ul className="space-y-1 mt-2">
          {data.notes.map((n, i) => <li key={i} className="text-xs text-[var(--text-secondary)]">› {n}</li>)}
        </ul>
      )}
    </SectionCard>
  );
}
