#!/usr/bin/env python3
"""Trace la chaine d'imports statiques qui force un module dans le chunk d'entree.

Usage : python3 scripts/analyse-chemin-critique.py jspdf
"""

import re
import sys
from collections import deque
from pathlib import Path

SRC = Path("src")
ENTRY = Path("src/main.tsx")

IMPORT_RE = re.compile(
    r"""^\s*import\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]""",
    re.MULTILINE,
)

# Les imports dynamiques ne comptent pas : ils creent leur propre chunk.
DYNAMIC_RE = re.compile(r"""import\s*\(\s*['"]([^'"]+)['"]""")


def resolve(spec: str, importer: Path) -> Path | None:
    """Resout un specificateur d'import vers un fichier du projet."""
    if spec.startswith("@/"):
        base = SRC / spec[2:]
    elif spec.startswith("."):
        base = (importer.parent / spec).resolve().relative_to(Path.cwd())
    else:
        return None  # dependance externe

    candidates = [
        base,
        base.with_suffix(".ts"),
        base.with_suffix(".tsx"),
        base / "index.ts",
        base / "index.tsx",
    ]
    for candidate in candidates:
        if candidate.is_file():
            return candidate
    return None


def static_imports(path: Path) -> list[tuple[str, Path | None]]:
    if path.suffix not in {".ts", ".tsx", ".js", ".jsx"}:
        return []
    try:
        text = path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return []
    dynamic = set(DYNAMIC_RE.findall(text))
    result = []
    for spec in IMPORT_RE.findall(text):
        if spec in dynamic:
            continue
        result.append((spec, resolve(spec, path)))
    return result


def main() -> None:
    target = sys.argv[1] if len(sys.argv) > 1 else "jspdf"

    # Parcours en largeur depuis le point d'entree, en suivant uniquement les
    # imports statiques : on obtient ainsi le plus court chemin critique.
    parents: dict[Path, Path | None] = {ENTRY: None}
    queue = deque([ENTRY])
    found_via: Path | None = None

    while queue:
        current = queue.popleft()
        for spec, resolved in static_imports(current):
            if target in spec and resolved is None:
                found_via = current
                queue.clear()
                break
            if resolved and resolved not in parents:
                parents[resolved] = current
                queue.append(resolved)

    if not found_via:
        print(f"'{target}' n'est PAS dans le chemin critique.")
        return

    chain = []
    node: Path | None = found_via
    while node is not None:
        chain.append(node)
        node = parents[node]

    print(f"Chaine d'imports statiques amenant '{target}' dans le chunk d'entree :\n")
    for depth, path in enumerate(reversed(chain)):
        print(f"{'  ' * depth}-> {path}")
    print(f"{'  ' * len(chain)}-> {target}")


if __name__ == "__main__":
    main()
