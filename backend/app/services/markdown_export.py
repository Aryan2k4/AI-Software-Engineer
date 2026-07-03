"""MarkdownExportService — renders blueprint sections to Markdown."""
from __future__ import annotations

from app.models.blueprint import Blueprint


def _h(level: int, text: str) -> str:
    return f"{'#' * level} {text}\n\n"


def _list(items: list[str]) -> str:
    return "".join(f"- {i}\n" for i in items) + "\n"


def blueprint_to_markdown(blueprint: Blueprint) -> str:
    s = blueprint.sections
    parts: list[str] = []

    parts.append("# Engineering Blueprint\n\n")
    parts.append(f"**Project:** {blueprint.original_idea}\n\n")
    parts.append(f"**Blueprint Version:** {blueprint.version}\n\n")
    parts.append("---\n\n")

    if s.idea_clarification:
        ic = s.idea_clarification
        parts.append(_h(2, "1. Idea Clarification"))
        parts.append(f"**{ic.title}**\n\n{ic.summary}\n\n")
        if ic.key_features:
            parts.append("**Key Features:**\n\n" + _list(ic.key_features))
        parts.append(f"**Target Users:** {ic.target_users}\n\n")
        if ic.success_metrics:
            parts.append("**Success Metrics:**\n\n" + _list(ic.success_metrics))

    if s.tech_stack:
        ts = s.tech_stack
        parts.append(_h(2, "2. Tech Stack"))
        for layer, details in {"Frontend": ts.frontend, "Backend": ts.backend,
                                "Database": ts.database, "Infrastructure": ts.infrastructure}.items():
            if details:
                parts.append(f"**{layer}:** " + ", ".join(f"{k}: {v}" for k, v in details.items()) + "\n\n")

    if s.architecture:
        arch = s.architecture
        parts.append(_h(2, "3. Architecture"))
        parts.append(f"**Pattern:** {arch.pattern}\n\n")
        if arch.layers:
            parts.append("**Layers:**\n\n" + _list(arch.layers))
        if arch.description:
            parts.append(f"{arch.description}\n\n")
        if arch.diagram:
            parts.append(f"```\n{arch.diagram}\n```\n\n")

    if s.database_schema:
        db = s.database_schema
        parts.append(_h(2, "4. Database Schema"))
        for table in db.tables:
            parts.append(f"**{table.name}:** " + ", ".join(table.columns) + "\n\n")
        if db.relationships:
            parts.append("**Relationships:**\n\n" + _list(db.relationships))

    if s.api_design:
        api = s.api_design
        parts.append(_h(2, "5. API Design"))
        parts.append(f"**Style:** {api.style}  **Base URL:** `{api.base_url}`\n\n")
        if api.endpoints:
            parts.append("| Method | Path | Description | Auth |\n")
            parts.append("|--------|------|-------------|------|\n")
            for ep in api.endpoints:
                auth = "✓" if ep.auth_required else "–"
                parts.append(f"| `{ep.method}` | `{ep.path}` | {ep.description} | {auth} |\n")
            parts.append("\n")

    if s.implementation_roadmap:
        rm = s.implementation_roadmap
        parts.append(_h(2, "6. Implementation Roadmap"))
        if rm.total_duration:
            parts.append(f"**Total Duration:** {rm.total_duration}\n\n")
        for phase in rm.phases:
            parts.append(f"**Phase {phase.phase}: {phase.title}** _{phase.duration}_\n\n")
            if phase.tasks:
                parts.append(_list(phase.tasks))

    if s.security_deployment:
        sd = s.security_deployment
        parts.append(_h(2, "7. Security & Deployment"))
        parts.append(f"**Auth:** {sd.auth}\n**HTTPS:** {'Yes' if sd.https else 'No'}\n**Environment:** {sd.environment}\n**Monitoring:** {sd.monitoring}\n\n")
        if sd.notes:
            parts.append(_list(sd.notes))

    if s.testing_strategy:
        ts2 = s.testing_strategy
        parts.append(_h(2, "8. Testing Strategy"))
        parts.append(f"**Unit:** {ts2.unit}\n**Integration:** {ts2.integration}\n**E2E:** {ts2.e2e}\n**Coverage Target:** {ts2.coverage_target}\n\n")

    if s.documentation:
        doc = s.documentation
        parts.append(_h(2, "9. Documentation"))
        parts.append(f"**API Docs:** {doc.api_docs}\n**README:** {doc.readme}\n**ADR:** {doc.adr}\n\n")
        if doc.notes:
            parts.append(_list(doc.notes))

    return "".join(parts)
