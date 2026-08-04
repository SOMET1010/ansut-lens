# Pige de presse professionnelle — architecture d'ingestion

> Demande de la Direction : disposer dans RADAR d'une **vraie revue de presse**,
> avec le **nom des journaux**, sourcée et vérifiée. Ce document décrit comment
> brancher un prestataire de pige (ou une saisie interne) sur RADAR, et **ce
> qu'il faut exiger du prestataire** avant de contracter.

## 1. Pourquoi une pige pro plutôt que l'OCR des unes

La collecte actuelle (`collecte-titrologie`) lit des **images** de unes sur
Abidjan.net dont le nom de fichier est un identifiant technique. Quand l'OCR ne
parvient pas à lire le bandeau-titre, RADAR n'a aucun nom de journal fiable —
d'où l'affichage « Journal non identifié ». Une pige professionnelle règle cela
à la source : le prestataire **livre déjà chaque article nommé et daté**.

RADAR ne change pas d'architecture : la pige entre par le **pipeline éditorial
commun** (Collecte → Qualification → Vues). Aucune logique métier dans les
écrans ; la Veille et la Revue de presse ne font que **lire** ce que la pige a
déposé.

## 2. Le point d'entrée : `import-pige` (déjà en place)

Fonction edge : `supabase/functions/import-pige/index.ts`.

- **Indépendante du prestataire.** Elle n'appelle aucune API tierce : elle
  **reçoit** un format pivot JSON. Quel que soit le fournisseur retenu,
  l'intégration se réduit à **mapper son export vers ce format**.
- **Sécurisée** par un jeton partagé : en-tête `x-import-token` == secret
  `IMPORT_PIGE_TOKEN` (à créer dans Lovable Cloud → Secrets).
- **Dépose dans `actualites`** avec `source_type = 'pige'`, `source_nom = <nom du
  journal>` → remonte automatiquement dans la Veille et la Revue de presse.
- **Dédoublonne** (URL canonique, sinon titre normalisé, 30 jours) et **date
  honnêtement** (date réelle du prestataire, `null` si absente — jamais la date
  du jour fabriquée).

### Contrat d'entrée (format pivot)

```
POST https://<projet>.supabase.co/functions/v1/import-pige
Headers: x-import-token: <IMPORT_PIGE_TOKEN>, Content-Type: application/json

{
  "articles": [
    {
      "journal":  "Fraternité Matin",     // REQUIS — nom du journal / média
      "titre":    "L'ANSUT accélère la fibre en zone rurale", // REQUIS
      "date":     "2026-08-04",            // ISO ou JJ/MM/AAAA (recommandé)
      "extrait":  "Le directeur général annonce…",            // chapô / résumé
      "url":      "https://fratmat.info/article/12345",       // page article
      "page":     3,                        // n° de page (presse écrite)
      "rubrique": "Économie",
      "themes":   ["télécom", "service universel"],
      "support":  "presse_ecrite"           // presse_ecrite | en_ligne | radio | tv
    }
  ]
}
```

Réponse : `{ success, recus, inseres, ignores_doublons, erreurs[] }`.

Seuls `journal` et `titre` sont obligatoires. Tout le reste est facultatif mais
**fortement recommandé** (surtout `date` et `url`) pour la datation et la
traçabilité.

### Note sur le score de pertinence

`import-pige` calcule un `score_pertinence` **explicable** : `55 + 10 × (nombre
de thèmes ANSUT distincts détectés)`, plancher 45. C'est un **comptage**, pas
une confiance fabriquée — la méthode est écrite dans `analyse_ia.methode`
(conforme à la charte de crédibilité). Un prestataire dont le périmètre est déjà
« ANSUT / numérique / télécoms » produit donc naturellement des scores élevés.

## 3. Modes de livraison acceptés (du plus au moins direct)

| Livraison prestataire | Intégration RADAR |
|---|---|
| **API / webhook JSON** | Le prestataire POSTe directement sur `import-pige` (idéal, temps réel). |
| **Fichier CSV / Excel quotidien** | Un petit script (ou l'assistant interne) convertit le CSV au format pivot et POSTe. Colonnes attendues = clés ci-dessus. |
| **E-mail quotidien (PDF/HTML)** | Le moins automatisable : nécessite une extraction. À éviter si possible, ou prévoir une saisie assistée. |

> Recommandation : **exiger une livraison API/webhook ou CSV structuré**. Fuir
> les livrables uniquement PDF/e-mail, non exploitables sans ressaisie.

## 4. Cahier des charges à remettre au prestataire

À vérifier **avant** de contracter (l'Argus/Kantar, Cision, ou agence locale) :

1. **Périmètre** : titres suivis (presse écrite CI + panafricaine + en ligne +
   éventuellement radio/TV), mots-clés (ANSUT, service universel, télécoms,
   numérique, fibre, connectivité, cybersécurité…).
2. **Format de livraison** : API/webhook JSON **ou** CSV structuré quotidien
   (voir colonnes §2). Refuser « PDF uniquement ».
3. **Champs par article** : nom du journal, titre, **date de parution**, page,
   rubrique, URL (si en ligne), résumé/chapô, tonalité si disponible.
4. **Fréquence & horaire** : livraison quotidienne avant 8 h (pour « Ce matin »).
5. **Antériorité / historique** : possibilité de recharger X jours en arrière.
6. **Droits** : autorisation de stocker et d'afficher extraits + liens en interne.
7. **SLA** : délai de correction en cas de manque, contact support.

## 5. Étapes de mise en service (une fois le prestataire choisi)

1. Créer le secret `IMPORT_PIGE_TOKEN` (Lovable Cloud → Secrets) et le
   communiquer au prestataire (ou au script de conversion CSV).
2. Déployer `import-pige` (automatique au déploiement du projet).
3. Test à blanc : POSTer 2-3 articles réels, vérifier qu'ils apparaissent dans
   la **Veille** avec le bon nom de journal.
4. Brancher la livraison quotidienne (webhook prestataire, ou tâche planifiée
   qui lit le CSV et POSTe).
5. (Option) Ajouter une **vue « Pige » dédiée** filtrant `source_type = 'pige'`
   si la Direction veut une revue de presse séparée du reste de la Veille.

## 6. Ce que RADAR fait / ne fait pas

- ✅ Reçoit, dédoublonne, date, qualifie et affiche la pige avec le **vrai nom du
  journal**.
- ✅ Reste **indépendant du prestataire** : changer de fournisseur = changer le
  mapping d'entrée, pas le produit.
- ❌ Ne **fabrique** pas de nom de journal ni de score de confiance : si une
  donnée manque, elle est laissée vide (charte de crédibilité).
- ❌ Ne se substitue pas au contrat de droits de reproduction avec les éditeurs.
