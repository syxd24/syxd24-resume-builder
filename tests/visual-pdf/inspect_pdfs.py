from __future__ import annotations

import json
import sys
from pathlib import Path

from pypdf import PdfReader


def inspect(path: Path) -> dict[str, object]:
    reader = PdfReader(path)
    page_text = [(page.extract_text() or "") for page in reader.pages]
    links: list[str] = []
    fonts: set[str] = set()
    for page in reader.pages:
        for annotation_ref in page.get("/Annots", []):
            annotation = annotation_ref.get_object()
            action = annotation.get("/A")
            if annotation.get("/Subtype") == "/Link" and action and action.get("/URI"):
                links.append(str(action["/URI"]))
        resources = page.get("/Resources", {})
        for font_ref in resources.get("/Font", {}).values():
            font = font_ref.get_object()
            if font.get("/BaseFont"):
                fonts.add(str(font["/BaseFont"]))
    return {
        "file": path.name,
        "pages": len(reader.pages),
        "characters": sum(len(text) for text in page_text),
        "links": sorted(set(links)),
        "fonts": sorted(fonts),
        "contains_name": any("Alex Morgan" in text for text in page_text),
        "contains_last_stress_entry": any("Platform Engineer 48" in text for text in page_text),
    }


if __name__ == "__main__":
    print(json.dumps([inspect(Path(value)) for value in sys.argv[1:]], indent=2))
