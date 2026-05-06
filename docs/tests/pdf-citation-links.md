# Tests manuels — Liens cliquables PDF/DOCX (DocumentWorkspace)

Objectif : vérifier que chaque badge de citation (`◆ ACTU`, `■ DOSSIER`, `[n]`)
génère une zone cliquable correctement positionnée et que l'URL s'ouvre dans le
navigateur, quelle que soit la taille de texte ou la mise en page choisies.

## Préparation

1. Ouvrir l'Assistant SUTA → générer un document contenant :
   - 1 titre H1, 1 H2, 1 H3
   - 2 citations actu : `[[ACTU:abc123|Titre actualité test]]`
   - 2 citations dossier : `[[DOSSIER:xyz789|Titre dossier test]]`
   - 3 références numériques : `[1]`, `[2]`, `[10]` avec une section
     « Références » contenant `[1] https://www.ansut.ci`,
     `[2]: https://www.gouv.ci`, `10. https://example.com/article-long`
2. Ouvrir le dialogue **Exporter…**

## Matrice de tests

Pour chaque combinaison ci-dessous, exporter en **PDF** puis en **DOCX**, ouvrir
le fichier et cliquer sur **chaque** badge. Vérifier que l'URL s'ouvre dans le
navigateur par défaut.

| # | Format | Marges | En-tête | Filigrane | Numéros pages | Visualiseur |
|---|--------|--------|---------|-----------|---------------|-------------|
| 1 | A4     | Normal | Oui     | Non       | Oui           | Chrome PDF / Word PC |
| 2 | A4     | Étroit | Non     | Oui       | Non           | Aperçu macOS / Pages |
| 3 | Letter | Large  | Oui     | Oui       | Oui           | Adobe Reader / Word Mac |
| 4 | A4     | Normal | Oui     | Non       | Oui           | Firefox PDF / LibreOffice |

## Points à vérifier (PDF)

- [ ] La zone cliquable couvre **exactement** le rectangle visible du badge
      (pas de décalage vertical après un retour à la ligne).
- [ ] Le badge `[n]` (taille 8pt) reste cliquable malgré sa taille réduite.
- [ ] Le badge `◆ ACTU` long (titre tronqué `…`) reste cliquable sur toute sa
      largeur, y compris le caractère `…`.
- [ ] Après un saut de page, les badges sur la nouvelle page restent cliquables
      à la bonne position.
- [ ] Les liens du **Sommaire** ouvrent la bonne page (ancrage interne).
- [ ] Avec filigrane activé, les badges restent cliquables (pas masqués par le
      filigrane).
- [ ] Avec marges « Étroit » et « Large », la zone cliquable suit bien la
      nouvelle largeur de page.
- [ ] Zoom 200 % dans le visualiseur : le clic reste précis (pas de dérive).

## Points à vérifier (DOCX)

- [ ] Chaque badge apparaît **souligné en bleu** (style `Hyperlink` appliqué).
- [ ] `Ctrl+clic` (Windows) / `⌘+clic` (Mac) ouvre l'URL correcte dans le
      navigateur.
- [ ] Le sommaire (TOC) est mis à jour via clic droit → « Mettre à jour les
      champs » et les ancrages fonctionnent.
- [ ] Les badges `[n]` qui ne possèdent pas d'URL associée (référence absente
      du bas de page) ne sont **pas** soulignés et **pas** cliquables.
- [ ] L'export DOCX ouvert dans Google Docs conserve les liens cliquables.

## Cas d'erreurs à tester

| Cas | Résultat attendu |
|-----|------------------|
| URL malformée dans la section références (`[1] htp://bad`) | Badge non cliquable, aucun crash |
| Citation `[[ACTU:|sans-id]]` | Segment ignoré ou rendu en texte brut |
| Document de 30+ pages | Liens du sommaire pointent toujours vers la bonne page |
| Filename personnalisé avec accents (`Note été 2026.pdf`) | Téléchargement OK, liens fonctionnels |

## Procédure de validation rapide

```text
1. Exporter PDF (config #1) → ouvrir → cliquer chaque badge → noter ✅/❌
2. Exporter DOCX (config #1) → ouvrir Word → Ctrl+clic chaque badge
3. Répéter pour configs #2, #3, #4
4. Reporter les résultats dans un ticket si une case ❌
```

## Critères d'acceptation

- 100 % des badges avec URL sont cliquables sur les 4 configurations.
- Aucune zone cliquable « fantôme » en dehors du badge visible.
- Le style Hyperlink (bleu + souligné) est appliqué sur PC et Mac.
