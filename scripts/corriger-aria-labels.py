#!/usr/bin/env python3
"""Ajoute les `aria-label` manquants sur les boutons composes d'une seule icone.

Un bouton qui ne contient qu'une icone n'expose aucun texte : un lecteur
d'ecran l'annonce comme « bouton », sans indiquer sa fonction. L'audit
d'accessibilite en a recense soixante-dix dans le projet.

Le libelle est deduit du nom de l'icone Lucide presente dans le bouton, via la
table `LIBELLES`. Les boutons dont l'icone n'est pas repertoriee sont signales
pour traitement manuel plutot que dotes d'un libelle approximatif.

Usage : python3 scripts/corriger-aria-labels.py [--appliquer]
"""

import re
import sys
from pathlib import Path

# Libelles en francais, formules comme l'action realisee par le bouton.
LIBELLES: dict[str, str] = {
    "X": "Fermer",
    "Plus": "Ajouter",
    "Minus": "Retirer",
    "Search": "Rechercher",
    "Settings": "Ouvrir les reglages",
    "Settings2": "Ouvrir les reglages",
    "Trash2": "Supprimer",
    "Trash": "Supprimer",
    "Pencil": "Modifier",
    "Edit": "Modifier",
    "Edit2": "Modifier",
    "Edit3": "Modifier",
    "Copy": "Copier",
    "Check": "Valider",
    "RefreshCw": "Actualiser",
    "RotateCcw": "Reinitialiser",
    "Download": "Telecharger",
    "Upload": "Envoyer un fichier",
    "ExternalLink": "Ouvrir dans un nouvel onglet",
    "ChevronLeft": "Precedent",
    "ChevronRight": "Suivant",
    "ChevronUp": "Replier",
    "ChevronDown": "Deplier",
    "ArrowLeft": "Revenir",
    "ArrowRight": "Continuer",
    "ArrowUp": "Monter",
    "ArrowDown": "Descendre",
    "MoreHorizontal": "Autres actions",
    "MoreVertical": "Autres actions",
    "Bell": "Ouvrir les notifications",
    "BellRing": "Ouvrir les notifications",
    "HelpCircle": "Afficher l'aide",
    "Info": "Afficher les informations",
    "Eye": "Afficher",
    "EyeOff": "Masquer",
    "ThumbsUp": "Marquer comme utile",
    "ThumbsDown": "Marquer comme peu utile",
    "Star": "Ajouter aux favoris",
    "Bookmark": "Enregistrer",
    "Share2": "Partager",
    "Send": "Envoyer",
    "Play": "Lancer",
    "Pause": "Mettre en pause",
    "Square": "Arreter",
    "Filter": "Filtrer",
    "SlidersHorizontal": "Ajuster les filtres",
    "Calendar": "Choisir une date",
    "Clock": "Definir un horaire",
    "Save": "Enregistrer",
    "Link": "Copier le lien",
    "Link2": "Copier le lien",
    "Image": "Ajouter une image",
    "Paperclip": "Joindre un fichier",
    "Mic": "Activer le micro",
    "Maximize2": "Agrandir",
    "Minimize2": "Reduire",
    "GripVertical": "Deplacer",
    "Sun": "Passer en mode clair",
    "Moon": "Passer en mode sombre",
    "LogOut": "Se deconnecter",
    "User": "Ouvrir mon profil",
    "Sparkles": "Generer avec l'assistant",
    "Wand2": "Generer avec l'assistant",
    "FileText": "Ouvrir le document",
    "Loader2": "Chargement en cours",
    "Archive": "Archiver",
    "Flag": "Signaler",
    "PanelLeft": "Afficher ou masquer le menu",
    "Monitor": "Apercu sur ordinateur",
    "Tablet": "Apercu sur tablette",
    "Smartphone": "Apercu sur telephone",
    "History": "Afficher l'historique",
}

"""
La detection d'une balise `<Button ...>` ne peut pas se contenter de `[^>]*`.
Les attributs contiennent souvent des expressions JSX avec des fonctions
flechees (`onClick={(e) => ...}`), dont le chevron interrompt prematurement la
correspondance. On consomme donc soit des caracteres ordinaires, soit des blocs
d'accolades equilibrees, jusqu'au chevron fermant reel.
"""
BOUTON_RE = re.compile(
    r"<Button\b(?:[^>{}]|\{(?:[^{}]|\{[^{}]*\})*\})*?size=\"icon\"(?:[^>{}]|\{(?:[^{}]|\{[^{}]*\})*\})*>",
    re.S,
)
ICONE_RE = re.compile(r"<([A-Z][A-Za-z0-9]*)\s")


def traiter(chemin: Path, appliquer: bool) -> tuple[int, list[str]]:
    texte = chemin.read_text(encoding="utf-8")
    original = texte
    corrections = 0
    non_traites: list[str] = []
    decalage = 0

    for correspondance in BOUTON_RE.finditer(original):
        balise = correspondance.group(0)
        if "aria-label" in balise or "aria-labelledby" in balise:
            continue

        # Un attribut `title` est expose comme nom accessible par les lecteurs
        # d'ecran, mais reste invisible au clavier et sur mobile : on ajoute
        # malgre tout un `aria-label`, qui prime sur `title`.


        # Le contenu du bouton s'etend jusqu'a sa balise fermante.
        fin_contenu = original.find("</Button>", correspondance.end())
        contenu = original[correspondance.end() : fin_contenu if fin_contenu != -1 else None]

        """
        Determination du texte visible.

        Le contenu d'un bouton melange des balises JSX, des expressions entre
        accolades et parfois du texte. Seul ce dernier est annonce par un
        lecteur d'ecran. On retire donc successivement les balises, puis les
        expressions imbriquees jusqu'a stabilisation : une seule passe laissait
        des residus tels que `setOuvert(true)}` sur les boutons multilignes, qui
        etaient alors pris a tort pour du texte visible et donc ignores.
        """
        texte_visible = re.sub(r"<[^>]+>", " ", contenu)
        precedent = None
        while precedent != texte_visible:
            precedent = texte_visible
            texte_visible = re.sub(r"\{[^{}]*\}", " ", texte_visible)
        # Retire les fragments d'expression restes ouverts (avant une accolade).
        texte_visible = re.sub(r"[^<>{}]*\}", " ", texte_visible)
        texte_visible = re.sub(r"\{[^<>{}]*", " ", texte_visible)
        # Ignore la ponctuation et les residus de code.
        texte_visible = re.sub(r"[(){}\[\];:=,.?&|!'\"`+\-*/<>\s]", "", texte_visible)
        if texte_visible:
            continue

        icones = ICONE_RE.findall(contenu)
        libelle = next((LIBELLES[icone] for icone in icones if icone in LIBELLES), None)

        ligne = original[: correspondance.start()].count("\n") + 1
        if not libelle:
            non_traites.append(f"{chemin}:{ligne} (icones: {', '.join(icones) or 'aucune'})")
            continue


        """
        Insertion de l'attribut.

        L'insertion se faisait auparavant avant le dernier caractere de la
        balise, en supposant qu'il s'agissait du chevron fermant. Or la regex
        peut s'arreter sur le chevron d'une fonction flechee (`onClick={() =>
        ...}`) : l'attribut se retrouvait alors insere au milieu de
        l'expression, produisant du code invalide (`onClick={() = aria-label="…">`).

        L'attribut est desormais insere immediatement apres `size="icon"`, une
        position toujours situee dans la liste d'attributs, donc toujours valide.
        """
        ancre = 'size="icon"'
        position_ancre = balise.find(ancre)
        if position_ancre == -1:
            non_traites.append(f"{chemin}:{ligne} (ancre size=\"icon\" absente)")
            continue
        insertion = position_ancre + len(ancre)
        nouvelle_balise = (
            balise[:insertion] + f' aria-label="{libelle}"' + balise[insertion:]
        )
        debut = correspondance.start() + decalage
        fin = correspondance.end() + decalage
        texte = texte[:debut] + nouvelle_balise + texte[fin:]
        decalage += len(nouvelle_balise) - len(balise)
        corrections += 1

    if appliquer and corrections:
        chemin.write_text(texte, encoding="utf-8")

    return corrections, non_traites


def main() -> None:
    appliquer = "--appliquer" in sys.argv
    total = 0
    restants: list[str] = []

    for chemin in sorted(Path("src").rglob("*.tsx")):
        corrections, non_traites = traiter(chemin, appliquer)
        if corrections:
            print(f"{corrections:>3} correction(s)  {chemin}")
        total += corrections
        restants.extend(non_traites)

    mode = "appliquees" if appliquer else "simulees (utiliser --appliquer)"
    print(f"\nTotal : {total} correction(s) {mode}")

    if restants:
        print(f"\n{len(restants)} bouton(s) a traiter manuellement :")
        for reste in restants:
            print(f"  {reste}")


if __name__ == "__main__":
    main()
