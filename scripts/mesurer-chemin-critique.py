#!/usr/bin/env python3
"""Mesure le poids reel du chemin critique d'un build de production.

Le chemin critique est l'ensemble des fichiers que le navigateur telecharge
avant de pouvoir afficher le premier ecran : le script d'entree, les chunks
declares en `modulepreload` dans `index.html`, et la feuille de style.

Usage : npm run build && python3 scripts/mesurer-chemin-critique.py
"""

import gzip
import re
from pathlib import Path

DIST = Path("dist")
INDEX = DIST / "index.html"

# Budget de performance : au-dela, l'experience se degrade sensiblement sur les
# connexions mobiles de la zone d'usage.
BUDGET_GZIP_KB = 400


def gzip_size(path: Path) -> int:
    return len(gzip.compress(path.read_bytes(), 9))


def main() -> None:
    if not INDEX.is_file():
        raise SystemExit("Aucun build trouve. Lancez d'abord `npm run build`.")

    html = INDEX.read_text(encoding="utf-8")
    references = re.findall(r'(?:src|href)="/assets/([^"]+)"', html)

    total_raw = total_gzip = 0
    lignes: list[tuple[str, float, float]] = []

    for nom in references:
        fichier = DIST / "assets" / nom
        if not fichier.is_file():
            continue
        raw = fichier.stat().st_size
        gz = gzip_size(fichier)
        total_raw += raw
        total_gzip += gz
        lignes.append((nom, raw / 1024, gz / 1024))

    lignes.sort(key=lambda ligne: ligne[2], reverse=True)

    print(f"{'Fichier':<44}{'Brut kB':>10}{'Gzip kB':>10}")
    print("-" * 64)
    for nom, raw_kb, gz_kb in lignes:
        print(f"{nom:<44}{raw_kb:>10.1f}{gz_kb:>10.1f}")
    print("-" * 64)
    print(f"{'TOTAL chemin critique':<44}{total_raw / 1024:>10.1f}{total_gzip / 1024:>10.1f}")

    total_gzip_kb = total_gzip / 1024
    statut = "DANS LE BUDGET" if total_gzip_kb <= BUDGET_GZIP_KB else "HORS BUDGET"
    print(f"\nBudget : {BUDGET_GZIP_KB} kB gzip — {statut} ({total_gzip_kb:.1f} kB)")

    # Verification : les generateurs de documents et les graphiques ne doivent
    # jamais figurer dans le chemin critique.
    interdits = ["vendor-documents", "vendor-charts", "vendor-dnd"]
    presents = [nom for nom, _, _ in lignes for interdit in interdits if interdit in nom]
    if presents:
        print(f"\nAvertissement : chunks differables presents dans le chemin critique : {presents}")
    else:
        print("\nAucun chunk differable dans le chemin critique.")


if __name__ == "__main__":
    main()
