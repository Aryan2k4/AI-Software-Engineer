"""Unit tests for markdown export service."""
from app.models.blueprint import Blueprint, BlueprintSections, IdeaClarification, TechStack
from app.services.markdown_export import blueprint_to_markdown


def make_blueprint() -> Blueprint:
    sections = BlueprintSections(
        idea_clarification=IdeaClarification(
            title="Task Manager",
            summary="A simple task management tool.",
            key_features=["Create tasks", "Assign tasks"],
            target_users="Teams",
            success_metrics=["DAU > 1000"],
        ),
        tech_stack=TechStack(
            frontend={"framework": "React", "language": "TypeScript"},
            backend={"framework": "FastAPI", "language": "Python"},
            database={"primary": "PostgreSQL"},
            infrastructure={"hosting": "AWS"},
        ),
    )
    return Blueprint(
        id="bp-1",
        project_id="proj-1",
        user_id="user-1",
        original_idea="A task manager",
        sections=sections,
        version="1.1",
    )


def test_markdown_contains_title():
    md = blueprint_to_markdown(make_blueprint())
    assert "Task Manager" in md


def test_markdown_contains_tech_stack():
    md = blueprint_to_markdown(make_blueprint())
    assert "React" in md
    assert "FastAPI" in md


def test_markdown_has_all_section_headers():
    md = blueprint_to_markdown(make_blueprint())
    assert "Idea Clarification" in md
    assert "Tech Stack" in md


def test_markdown_is_string():
    md = blueprint_to_markdown(make_blueprint())
    assert isinstance(md, str)
    assert len(md) > 100
