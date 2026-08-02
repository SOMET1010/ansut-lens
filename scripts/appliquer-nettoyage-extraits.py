#!/usr/bin/env python3
"""
Applique `nettoyerExtrait` aux resumes d'articles issus de la collecte.

La recette a montre que les resumes collectes arrivent charges de balisage
Markdown, d'images et d'URL affichees en clair. Seuls les resumes provenant de
la collecte automatique sont concernes : les resumes rediges dans
l'application (dossiers, notes de synthese, analyses produites par l'assistant)
sont deja de la prose et ne doivent pas etre touches.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent / "src"

# Emplacements affichant un resume issu de la collecte d'actualites.
CIBLES: dict[str, list[str]] = {
    "components/actualites/PourVousFeed.tsx": ["{item.resume}"],
    "components/actualites/TitrologieWidget.tsx": ["{t.resume}"],
    "components/communication/MatinaleDrillDownModal.tsx": ["{a.resume}"],
    "pages/CommunicationPage.tsx": ["{item.resume}"],
    "pages/FluxDetailPage.tsx": ["{actu.resume}"],
}

IMPORT = "import { nettoyerExtrait } from '@/lib/nettoyerExtrait';"


def ajouter_import(contenu: str) -> str:
    """Insere l'import apres le dernier import existant du fichier."""
    if IMPORT in contenu:
        return contenu
    imports = list(re.finditer(r"^import .*?;$", contenu, re.MULTILINE))
    if not imports:
        return IMPORT + "\n" + contenu
    fin = imports[-1].end()
    return contenu[:fin] + "\n" + IMPORT + contenu[fin:]


def main() -> int:
    simulation = "--appliquer" not in sys.argv
    modifies = 0

    for chemin_relatif, expressions in CIBLES.items():
        chemin = RACINE / chemin_relatif
        if not chemin.exists():
            print(f"ABSENT  {chemin_relatif}")
            continue

        contenu = origine = chemin.read_text(encoding="utf-8")

        for expression in expressions:
            variable = expression.strip("{}")
            remplacement = "{nettoyerExtrait(" + variable + ")}"
            if remplacement in contenu:
                continue
            if expression not in contenu:
                print(f"INTROUVABLE  {chemin_relatif} :: {expression}")
                continue
            contenu = contenu.replace(expression, remplacement)

        if contenu != origine:
            contenu = ajouter_import(contenu)
            modifies += 1
            print(f"{'[simulation] ' if simulation else ''}MODIFIE  {chemin_relatif}")
            if not simulation:
                chemin.write_text(contenu, encoding="utf-8")

    print(f"\n{modifies} fichier(s) concerne(s).")
    if simulation:
        print("Relancer avec --appliquer pour ecrire les modifications.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
