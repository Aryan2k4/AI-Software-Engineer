"""Unit tests for Pydantic models."""
import pytest

from app.models.blueprint import BlueprintSections
from app.models.export_share import ExportCreate, ExportFormat, ShareCreate, ShareVisibility
from app.models.project import ProjectCreate


def test_project_create_validates_min_length():
    with pytest.raises(ValueError):
        ProjectCreate(name="", original_idea="x" * 10)


def test_project_create_validates_idea_min_length():
    with pytest.raises(ValueError):
        ProjectCreate(name="My Project", original_idea="short")


def test_project_create_valid():
    p = ProjectCreate(name="My App", original_idea="A platform for managing tasks at scale")
    assert p.name == "My App"


def test_export_create_formats():
    for fmt in ExportFormat:
        e = ExportCreate(project_id="p1", format=fmt)
        assert e.format == fmt


def test_share_create_defaults():
    s = ShareCreate(project_id="p1")
    assert s.visibility == ShareVisibility.PUBLIC
    assert s.expires_in_days is None


def test_blueprint_sections_all_optional():
    # All sections are optional — empty sections should be valid
    s = BlueprintSections()
    assert s.idea_clarification is None
    assert s.tech_stack is None
