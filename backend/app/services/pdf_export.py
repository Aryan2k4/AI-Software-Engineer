"""PDFExportService — renders blueprint to PDF via WeasyPrint."""
from __future__ import annotations

from app.models.blueprint import Blueprint
from app.services.markdown_export import blueprint_to_markdown

CSS = """
@page { margin: 2cm; }
body { font-family: 'Inter', 'Segoe UI', sans-serif; font-size: 13px; color: #1a1a2e; line-height: 1.6; }
h1 { font-size: 24px; color: #0a0b0d; border-bottom: 2px solid #2DD4BF; padding-bottom: 8px; }
h2 { font-size: 18px; color: #1e3a5f; margin-top: 24px; border-left: 3px solid #2DD4BF; padding-left: 8px; }
table { border-collapse: collapse; width: 100%; margin: 12px 0; }
th, td { border: 1px solid #e2e8f0; padding: 6px 10px; text-align: left; }
th { background: #f1f5f9; font-weight: 600; }
code { background: #f8fafc; padding: 2px 4px; border-radius: 3px; font-family: monospace; }
pre { background: #f8fafc; padding: 12px; border-radius: 6px; overflow-x: auto; }
ul { padding-left: 20px; }
li { margin: 2px 0; }
hr { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }
"""


def blueprint_to_pdf_bytes(blueprint: Blueprint) -> bytes:
    """Convert blueprint to PDF bytes."""
    try:
        import markdown as md
        from weasyprint import CSS as WEASYPRINT_CSS
        from weasyprint import HTML

        markdown_content = blueprint_to_markdown(blueprint)
        html_body = md.markdown(markdown_content, extensions=["tables", "fenced_code"])
        full_html = f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Engineering Blueprint</title></head>
<body>{html_body}</body>
</html>"""
        pdf_bytes = HTML(string=full_html).write_pdf(
            stylesheets=[WEASYPRINT_CSS(string=CSS)]
        )
        return pdf_bytes
    except ImportError:
        raise RuntimeError("WeasyPrint is not installed. Run: pip install weasyprint") from None
