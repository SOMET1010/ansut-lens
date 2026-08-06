# Charte couleur de RADAR (règle permanente)

RADAR est un produit **éditorial**, pas un tableau de bord bariolé. La couleur y
porte du **sens**, jamais de la décoration. Une couleur de signal (vert, orange,
rouge) n'a de valeur que si elle est **rare** : quand un élément orange apparaît,
il doit attirer l'œil *parce qu'il est exceptionnel*. Un produit où tout est bleu
(ou tout est coloré) ne dit plus rien.

## Les cinq rôles (et un seul rôle par couleur)

| Rôle | Couleur | Token | Emploi |
|------|---------|-------|--------|
| **Navigation & sélection** | Bleu | `primary` / `ring` | Liens, onglet actif, élément sélectionné, focus, boutons d'action primaires, affordances « voir → ». **Rien d'autre.** |
| **Signal positif** | Vert | `confirme` (`-soft`/`-border`) | Fait confirmé, activité réelle mesurée, alignement, statut « à jour ». |
| **Attention / évolution notable** | Orange | `attention` (`-soft`/`-border`) | Vigilance, dérive, à examiner, variation notable. |
| **Alerte réelle** | Rouge | `incident` (`-soft`/`-border`) | Incident avéré, sensibilité critique, danger. |
| **Contexte & information secondaire** | Gris | `muted-foreground`, `border`, `muted` | Métadonnées, libellés, kickers, icônes de section, séparateurs, textes d'aide. |

## Règles d'application

1. **Le bleu ne décore pas.** Un titre de section, une puce, une icône
   d'illustration, un kicker (« SYNTHÈSE · … ») ne sont **pas** de la navigation :
   ils sont du **contexte** → gris. Le bleu est réservé à ce qui se clique ou se
   sélectionne.
2. **Un signal coloré = un fait.** On ne met du vert/orange/rouge que si la
   couleur est *justifiée par une donnée réelle* (cf. Charte de crédibilité).
   Pas de vert « décoratif », pas d'orange « pour faire joli ».
3. **La rareté fait la force.** Si tout un écran est orange, plus rien n'alerte.
   Sur une vue donnée, les signaux colorés doivent rester minoritaires face au
   gris de contexte et au noir/encre du texte.
4. **Le neutre est la couleur par défaut.** Un composant sans intention de
   signal ni de navigation est en encre (`foreground`) sur papier (`card`),
   accents en gris. On ajoute une couleur seulement quand elle *veut dire*
   quelque chose.
5. **Les cercles / catégories** gardent un repère coloré discret (un point, un
   contour) — c'est de l'information, pas un aplat. Le repère ne doit pas
   dominer la carte.

## Ce que cette charte a déjà corrigé

- Cartes acteur : avatar neutralisé, cercle réduit à un point + contour, couleur
  forte réservée au signal (vert = activité, orange/rouge = alerte).
- Signature `PhraseSynthese` : kicker et filet passés en **gris de contexte**
  (le bleu ne signait pas une navigation).
- Tuiles de repères : pastilles d'icônes neutres ; seule la tuile « à
  surveiller » vire à l'orange quand elle porte réellement une alerte.

## Dette restante (à traiter au fil des écrans)

Le bleu décoratif subsiste encore par endroits (titres de section, icônes
d'illustration). Il se retire écran par écran, en appliquant la règle 1 :
*est-ce que cet élément se clique ?* Si non → gris.
