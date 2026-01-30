

# Plan de transformation : Du Dashboard BI au Flux de Competitive Intelligence

## Le changement de paradigme

| Approche actuelle (BI) | Nouvelle approche (CI) |
|------------------------|------------------------|
| Combien d'articles ? | Quoi lire ? Pourquoi c'est important ? |
| Grille de cartes statiques | Flux chronologique enrichi |
| KPIs numériques isolés | Briefing textuel contextualisé |
| Navigation par catégorie | Tags intégrés aux articles |

---

## Architecture visuelle cible

```text
┌─────────────────────────────────────────────────────────────────┐
│  📍 BRIEFING DU JOUR (Généré par IA)                           │
│  "3 sujets majeurs : Orange lance SAT pour la connectivité     │
│   rurale, nouveau ministre au Numérique, débat sur les tarifs  │
│   du Service Universel. Attention : 1 alerte cybersécurité."   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🔴 ALERTE CRITIQUE                                              │
│ Cybersécurité : vulnérabilité critique détectée                │
│ Source: CERT-CI • Impact: 90/100 • Il y a 10 min               │
│                                                    [Voir →]    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ Flux d'Analyse Temps Réel           Dernière màj : 14:02       │
├─────────────────────────────────────────────────────────────────┤
│ ▌ Sika Finance • Il y a 2h                    ⚡ Signal Faible │
│ ▌ Orange SAT : connecter les zones où les réseaux s'arrêtent   │
│ ▌                                                               │
│ ▌ Orange CI lance une solution satellite en partenariat avec   │
│ ▌ Eutelsat pour connecter les zones rurales et enclavées...    │
│ ▌                                                               │
│ ▌ #Connectivité  #Inclusion  #Satellite                        │
│                                                   📖 🔖 📤     │
├─────────────────────────────────────────────────────────────────┤
│ ▌ Benin Web TV • Hier                                          │
│ ▌ Djibril Ouattarra prend les commandes du numérique           │
│ ▌                                                               │
│ ▌ Le nouveau ministre s'engage à rendre le numérique           │
│ ▌ accessible à tous comme un service public essentiel...       │
│ ▌                                                               │
│ ▌ #Gouvernance  #Transition  #Politique                        │
│                                                   📖 🔖 📤     │
├─────────────────────────────────────────────────────────────────┤
│              [Charger plus d'analyses]                          │
└─────────────────────────────────────────────────────────────────┘

┌─ Radar Stratégique ──────────────────────────────────────────────┐
│ TECHNOLOGIE        │ RÉGULATION        │ MARCHÉ      │ RÉPUTATION │
│ 🔴 Cybersécurité   │ 🟠 Tarifs SUT     │ 🔵 Mobile   │ 🔵 Média+  │
│ 🔵 5G Déploiement  │                   │   Money     │            │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 1 : Briefing du jour (nouveau composant)

**Composant : `DailyBriefing.tsx`**

Résumé textuel généré dynamiquement à partir des dernières actualités.

**Logique de génération :**
```typescript
const generateBriefing = (actualites: Actualite[], signaux: Signal[]) => {
  const criticalAlerts = signaux.filter(s => s.niveau === 'critical');
  const topArticles = actualites.slice(0, 3);
  
  return {
    summary: `${topArticles.length} sujets majeurs : ${topArticles.map(a => a.titre.split(':')[0]).join(', ')}.`,
    alertCount: criticalAlerts.length,
    alertMessage: criticalAlerts.length > 0 
      ? `Attention : ${criticalAlerts.length} alerte${criticalAlerts.length > 1 ? 's' : ''} critique${criticalAlerts.length > 1 ? 's' : ''}.`
      : null
  };
};
```

**Design :**
- Fond gradient subtil (bleu vers transparent)
- Icône de briefing militaire/stratégique
- Texte en prose, pas en bullet points
- Suppression des KPIs numériques

---

## Phase 2 : Bannière d'alerte critique

**Composant : `CriticalAlertBanner.tsx`**

Affichage proéminent des signaux de niveau `critical`.

**Caractéristiques :**
- Bordure gauche rouge épaisse + fond rouge clair
- Icône `ShieldAlert` animée (pulse subtil)
- Score d'impact affiché
- Bouton d'action "Voir les détails"

**Code simplifié :**
```tsx
<div className="flex border-l-4 border-red-500 bg-red-50 p-4 rounded-lg">
  <ShieldAlert className="h-6 w-6 text-red-600 animate-pulse mr-4" />
  <div className="flex-1">
    <h4 className="font-bold text-red-900">{signal.titre}</h4>
    <p className="text-sm text-red-700">{signal.description}</p>
    <div className="flex gap-4 mt-2 text-xs text-red-600">
      <span>Source: {signal.source_type || 'SOC'}</span>
      <span>Impact: {signal.score_impact}/100</span>
      <RelativeTime date={signal.date_detection} />
    </div>
  </div>
  <Button variant="outline" className="border-red-300 text-red-700">
    Voir →
  </Button>
</div>
```

---

## Phase 3 : Intelligence Card (item du flux)

**Composant : `IntelligenceCard.tsx`**

Remplace les lignes de timeline par des cartes horizontales riches en contenu.

**Structure de l'item :**
```text
┌────────────────────────────────────────────────────────────────┐
│ ▌  Source • Temps relatif                    [Badge Signal]   │
│ ▌                                                              │
│ ▌  Titre de l'article (cliquable, gras)                       │
│ ▌                                                              │
│ ▌  Résumé de 2-3 lignes expliquant l'impact stratégique...    │
│ ▌                                                              │
│ ▌  #Tag1  #Tag2  #Tag3                                        │
│ ▌                                              [📖] [🔖] [📤] │
└────────────────────────────────────────────────────────────────┘
```

**Coloration sémantique :**
| Sentiment | Bordure | Indicateur |
|-----------|---------|------------|
| Négatif/Alerte | `border-l-4 border-red-500` | Rouge |
| Neutre/Signal faible | `border-l-4 border-purple-400` | Violet |
| Positif/Opportunité | `border-l-4 border-emerald-500` | Vert |

**Détection automatique du sentiment :**
```typescript
const getSentimentStyle = (actualite: Actualite) => {
  // Si sentiment explicite
  if (actualite.sentiment !== null) {
    if (actualite.sentiment < -0.3) return 'negative';
    if (actualite.sentiment > 0.3) return 'positive';
  }
  // Sinon, analyse des tags
  const alertTags = ['risque', 'alerte', 'menace', 'problème'];
  const hasAlertTag = actualite.tags?.some(t => 
    alertTags.some(at => t.toLowerCase().includes(at))
  );
  if (hasAlertTag) return 'negative';
  
  return 'neutral';
};
```

---

## Phase 4 : Intelligence Feed (conteneur du flux)

**Composant : `IntelligenceFeed.tsx`**

Conteneur principal affichant le flux chronologique.

**Caractéristiques :**
- Header avec titre + timestamp de dernière mise à jour
- Liste des `IntelligenceCard`
- Bouton "Charger plus" en footer
- Skeleton de chargement adapté

**Affichage des actions au survol :**
```tsx
<div className="flex flex-col gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
  <button title="Lire la source" onClick={() => window.open(actualite.source_url)}>
    <ExternalLink size={18} />
  </button>
  <button title="Sauvegarder dans un dossier">
    <Bookmark size={18} />
  </button>
  <button title="Partager">
    <Share2 size={18} />
  </button>
</div>
```

---

## Phase 5 : Radar compact

**Modification du composant existant**

Réduire le radar stratégique à une barre compacte en bas de page.

**Nouveau design :**
```text
┌─ Radar Stratégique (5 signaux actifs) ────────────────────────┐
│ TECH          │ RÉGULATION    │ MARCHÉ       │ RÉPUTATION     │
│ 🔴 Cyber (90) │ 🟠 Tarifs (80)│ 🔵 Money (60)│ 🔵 Média+ (70) │
│ 🔵 5G (75)    │               │              │                │
└───────────────────────────────────────────────────────────────┘
```

**Changements :**
- Passer de grille 2x2 à barre horizontale 4 colonnes
- Afficher le score d'impact entre parenthèses
- Indicateur visuel de niveau (●) coloré

---

## Fichiers à créer

| Fichier | Description |
|---------|-------------|
| `src/components/radar/DailyBriefing.tsx` | Résumé textuel du jour |
| `src/components/radar/CriticalAlertBanner.tsx` | Bannière d'alertes critiques |
| `src/components/radar/IntelligenceCard.tsx` | Carte d'article enrichie |
| `src/components/radar/IntelligenceFeed.tsx` | Conteneur du flux |

## Fichiers à modifier

| Fichier | Modifications |
|---------|---------------|
| `src/pages/RadarPage.tsx` | Restructuration complète de la mise en page |
| `src/hooks/useRadarData.ts` | Nouveau hook `useIntelligenceFeed` avec pagination |

---

## Récapitulatif des améliorations UX

### Densité d'information
- **Avant** : 4 KPIs + 2 cartes héros + grille radar = ~60% espace "vide"
- **Après** : Briefing + Flux = 3x plus de contenu visible sans scroll

### Pattern de lecture "F"
L'œil scanne naturellement : Source → Titre → Résumé → Tags

### Hiérarchie d'urgence
- Alertes critiques en bannière rouge en haut
- Signal faible en badge violet distinctif
- Opportunités en bordure verte

### Actions contextuelles
Boutons d'action (lire, sauvegarder, partager) apparaissent au survol

