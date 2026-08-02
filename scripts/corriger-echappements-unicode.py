#!/usr/bin/env python3
"""Convertit les echappements Unicode litteraux en caracteres reels.

Les fichiers ecrits lors de la refonte contiennent des sequences du type
`\\u00e9` a l'interieur de chaines JSX. Une sequence `\\uXXXX` est correctement
interpretee par le moteur JavaScript dans une chaine entre guillemets, mais pas
dans un texte JSX place directement entre balises : elle s'y affiche alors
telle quelle a l'ecran.

Le script remplace donc chaque sequence par le caractere qu'elle designe, ce qui
rend le texte lisible dans tous les contextes et facilite la relecture du code.
Les fichiers de test et les modules qui manipulent volontairement des
echappements (validation de saisie, normalisation) sont exclus.

Usage : python3 scripts/corriger-echappements-unicode.py [--appliquer]
"""

import re
import sys
from pathlib import Path

SEQUENCE = re.compile(r"\\u([0-9a-fA-F]{4})")

# Certaines sequences doivent rester echappees : converties en caractere reel,
# elles deviendraient invisibles dans le code source alors qu'elles ont un role
# fonctionnel. C'est le cas de la marque d'ordre des octets (BOM), ajoutee en
# tete des exports CSV pour qu'Excel reconnaisse l'encodage UTF-8.
CODES_A_PRESERVER = {
    0xFEFF,  # BOM, requis par Excel pour les exports CSV
    0x00A0,  # espace insecable, indiscernable d'une espace ordinaire
    0x200B,  # espace sans largeur
    0x200D,  # liant sans largeur
}

# Plages a preserver egalement : elles apparaissent dans des expressions
# regulieres de normalisation, ou la forme echappee est la seule ecriture
# exploitable. La plage 0300-036F correspond aux diacritiques combinants,
# utilises pour retirer les accents avant comparaison.
PLAGES_A_PRESERVER = [(0x0300, 0x036F)]


def doit_preserver(code: int) -> bool:
    if code in CODES_A_PRESERVER:
        return True
    return any(debut <= code <= fin for debut, fin in PLAGES_A_PRESERVER)

# Modules dont les echappements sont intentionnels : ils servent a detecter ou
# neutraliser des caracteres invisibles dans les saisies utilisateur.
EXCLUSIONS = {
    "src/components/admin/rotateReasonValidation.ts",
    "src/components/admin/rotateReasonValidation.test.ts",
    "src/hooks/useArticleClusters.ts",
    "src/hooks/useDeduplicationActeurs.ts",
    "src/hooks/useMatinaleSources.ts",
}


def traiter(chemin: Path, appliquer: bool) -> int:
    if str(chemin).replace("\\", "/") in EXCLUSIONS:
        return 0

    texte = chemin.read_text(encoding="utf-8")
    def remplacer(correspondance: re.Match[str]) -> str:
        code = int(correspondance.group(1), 16)
        if doit_preserver(code):
            return correspondance.group(0)
        return chr(code)

    occurrences = [
        m for m in SEQUENCE.finditer(texte) if not doit_preserver(int(m.group(1), 16))
    ]
    if not occurrences:
        return 0

    converti = SEQUENCE.sub(remplacer, texte)

    if appliquer:
        chemin.write_text(converti, encoding="utf-8")

    return len(occurrences)


def main() -> None:
    appliquer = "--appliquer" in sys.argv
    total = 0

    for chemin in sorted(Path("src").rglob("*.ts*")):
        conversions = traiter(chemin, appliquer)
        if conversions:
            print(f"{conversions:>4} sequence(s)  {chemin}")
            total += conversions

    mode = "converties" if appliquer else "simulees (utiliser --appliquer)"
    print(f"\nTotal : {total} sequence(s) {mode}")


if __name__ == "__main__":
    main()
