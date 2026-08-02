#!/usr/bin/env python3
"""
Remplace les libelles jargonneux affiches a l'utilisateur.

L'audit a montre que le vocabulaire de l'interface etait forme d'anglicismes et
de formules de communicant — « Cockpit Reputationnel », « Posts a Amplifier »,
« Studio Publication », « Copilote intelligence » — incomprehensibles pour un
agent qui n'a pas participe a la conception de l'outil.

Chaque libelle est remplace par une formule qui dit ce que la section contient ou
permet de faire. Seuls les textes affiches sont modifies : les noms de types, de
hooks et de variables sont laisses intacts, car les renommer sans necessite
augmenterait le risque de regression sans beneficie pour l'utilisateur.
"""

from __future__ import annotations

import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent / "src"

# Chaque entree : (chemin relatif, texte affiche a remplacer, remplacement)
REMPLACEMENTS: list[tuple[str, str, str]] = [
    (
        "components/communication/AnsutAccountsActivityWidget.tsx",
        "Cockpit Réputationnel ANSUT — 24h / 7j",
        "Activité de nos comptes — 24 heures et 7 jours",
    ),
    (
        "components/communication/ReactionAnalyzerSection.tsx",
        "Analyseur de Réactions",
        "Analyser les réactions à une publication",
    ),
    (
        "components/communication/SujetsValorisationSection.tsx",
        "Sujets à Valoriser",
        "Sujets à mettre en avant",
    ),
    (
        "components/radar/EchoResonanceWidget.tsx",
        "Écho & Résonance",
        "Portée de nos publications",
    ),
    (
        "pages/CommunicationPage.tsx",
        "Kit Communication",
        "Préparer un dossier de communication",
    ),
    (
        "pages/CommunicationPage.tsx",
        "{ label: 'Studio Publication', icon: FileText, to: '/publier', desc: 'Notes et dossiers' }",
        "{ label: 'Publier', icon: FileText, to: '/publier', desc: 'Notes de synthèse et lettres d’information' }",
    ),
    (
        "pages/CommunicationPage.tsx",
        "{ label: 'Assistant IA', icon: MessageSquare, to: '/assistant', desc: 'Copilote intelligence' }",
        "{ label: 'Assistant', icon: MessageSquare, to: '/assistant', desc: 'Analyser et rédiger avec de l’aide' }",
    ),
    (
        "pages/CommunicationPage.tsx",
        "E-Réputation & Médias Sociaux",
        "Notre présence en ligne",
    ),
    (
        "pages/CommunicationPage.tsx",
        "Suivi quotidien de votre présence en ligne et couverture médiatique",
        "Ce que l’on dit de l’ANSUT chaque jour, dans la presse et sur les réseaux",
    ),
    (
        "pages/CommunicationPage.tsx",
        "Décrivez un sujet ou un projet à valoriser, l'IA prépare un dossier complet",
        "Décrivez un sujet à mettre en avant : messages clés, publications et courriel sont préparés pour vous",
    ),
    (
        "pages/CommunicationPage.tsx",
        "Accès rapide",
        "Aller plus loin",
    ),
]


def main() -> int:
    simulation = "--appliquer" not in sys.argv
    total = 0

    for chemin_relatif, avant, apres in REMPLACEMENTS:
        chemin = RACINE / chemin_relatif
        if not chemin.exists():
            print(f"ABSENT       {chemin_relatif}")
            continue

        contenu = chemin.read_text(encoding="utf-8")
        if avant not in contenu:
            statut = "DEJA FAIT" if apres in contenu else "INTROUVABLE"
            print(f"{statut:12s} {chemin_relatif} :: {avant[:60]}")
            continue

        contenu = contenu.replace(avant, apres)
        total += 1
        print(f"{'[simulation] ' if simulation else ''}OK           {chemin_relatif} :: {avant[:50]}")
        if not simulation:
            chemin.write_text(contenu, encoding="utf-8")

    print(f"\n{total} remplacement(s).")
    if simulation:
        print("Relancer avec --appliquer pour ecrire les modifications.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
