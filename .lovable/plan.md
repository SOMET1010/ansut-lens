

# Transformation de la page Flux en "Centre de Contrôle Intelligent"

## Vue d'ensemble

Transformer la page `/flux` d'une liste technique classique en un **tableau de bord de pilotage** où chaque flux est présenté comme un "agent de surveillance autonome" avec feedback visuel en temps réel.

```text
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  📡 Mes Flux de Veille                                    [3 actifs]  [+ Créer]      │
│  Gérez vos robots de surveillance et vos alertes automatiques                        │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                      │
│  ┌─────────────────────────┐  ┌─────────────────────────┐  ┌─────────────────────────┐
│  │ 🟢 Concurrence Mobile   │  │ 🟢 Régulation ARTCI     │  │ 🔘 Projet Backbone      │
│  │ ●━━━━━━━━━━━━━━━ ON     │  │ ●━━━━━━━━━━━━━━━ ON     │  │ ━━━━━━━━━━━━━━━● OFF    │
│  │                         │  │                         │  │ (grisé, en pause)       │
│  │ QUERY:                  │  │ QUERY:                  │  │ QUERY:                  │
│  │ ┌─────────────────────┐ │  │ ┌─────────────────────┐ │  │ ┌─────────────────────┐ │
│  │ │(Wave OR Orange)...  │ │  │ │ARTCI AND Décret... │ │  │ │"Fibre optique"...   │ │
│  │ └─────────────────────┘ │  │ └─────────────────────┘ │  │ └─────────────────────┘ │
│  │                         │  │                         │  │                         │
│  │ 📊 142 actus  📡 12 src │  │ 📊 8 actus   📡 Web    │  │ 📊 0 actus   📡 Presse │
│  │ ─────────────────────── │  │ ─────────────────────── │  │ ─────────────────────── │
│  │ [⚙️] [🗑️]       [Voir]  │  │ [⚙️] [🗑️]       [Voir]  │  │ [⚙️] [🗑️]       [Voir]  │
│  │                   +5 🔴 │  │                         │  │                         │
│  └─────────────────────────┘  └─────────────────────────┘  └─────────────────────────┘
│                                                                                      │
│  ────────────────────────────────────────────────────────────────────────────────── │
│                                                                                      │
│  ✨ Modèles recommandés pour vous                                                   │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                    │
│  │     ＋     │ │     ＋     │ │     ＋     │ │     ＋     │                    │
│  │ E-Réputation│ │ Cybersécurit│ │ Appels     │ │ Innovations │                    │
│  │ Surveillez..│ │ Alertes fai..│ │ d'Offres.. │ │ Fintech... │                    │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘                    │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Fichiers à modifier/créer

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/pages/FluxPage.tsx` | Modifier | Header amélioré + section modèles recommandés |
| `src/components/flux/FluxCard.tsx` | Remplacer | Nouvelle carte de contrôle type "agent" |
| `src/components/flux/FluxTemplateCard.tsx` | Créer | Composant pour les modèles recommandés |
| `src/components/flux/index.ts` | Modifier | Exporter le nouveau composant |
| `src/hooks/useFluxVeille.ts` | Modifier | Ajouter hook pour compter les nouvelles actualités |

---

## Détail des composants

### 1. FluxCard améliorée - "Carte de Contrôle"

**Nouveautés visuelles :**
- Indicateur de statut pulsant (point vert animé quand actif)
- Bloc `QUERY:` en style code monospace pour montrer les mots-clés
- Badge de nouveauté (`+5 nouveaux`) positionné en haut à droite
- Statistiques avec icônes (Activity pour volume, Globe pour sources)
- Actions qui apparaissent au survol (edit/delete)
- Grayscale quand le flux est en pause

**Structure de la carte :**
```tsx
<Card className={`group relative transition-all duration-300 
  ${isActive ? 'border-primary/30 shadow-sm hover:shadow-glow' : 'opacity-60 grayscale-[0.5] hover:grayscale-0'}`}>
  
  {/* Badge nouveautés */}
  {isActive && newCount > 0 && (
    <div className="absolute -top-2 -right-2 bg-destructive text-white text-[10px] font-bold 
      px-2 py-0.5 rounded-full shadow-sm border-2 border-background animate-pulse">
      +{newCount} nouveaux
    </div>
  )}
  
  {/* Header avec toggle */}
  <div className="flex justify-between items-start">
    <div className="flex items-center gap-3">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center 
        ${isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
        <Rss className="h-5 w-5" />
      </div>
      <div>
        <h3 className="font-bold">{flux.nom}</h3>
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full 
            ${isActive ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/50'}`} />
          <span className="text-xs text-muted-foreground">
            {isActive ? 'En surveillance' : 'En pause'}
          </span>
        </div>
      </div>
    </div>
    <Switch checked={isActive} onCheckedChange={...} />
  </div>
  
  {/* Query preview (style code) */}
  <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs border border-border/50">
    <span className="text-muted-foreground select-none">QUERY: </span>
    <span className="text-foreground">{buildQueryString(flux)}</span>
  </div>
  
  {/* Stats */}
  <div className="flex gap-4 text-sm text-muted-foreground">
    <span className="flex items-center gap-1.5">
      <Activity className="h-4 w-4" />
      <span className="font-bold text-foreground">{count}</span> actus
    </span>
    <span className="flex items-center gap-1.5">
      <Globe className="h-4 w-4" />
      {flux.quadrants.length || 'Tous'} quadrants
    </span>
  </div>
  
  {/* Actions (visible au hover) */}
  <div className="flex items-center justify-between pt-3 border-t">
    <Button size="sm" onClick={() => navigate(`/flux/${flux.id}`)}>
      <Eye className="h-4 w-4 mr-2" /> Voir le flux
    </Button>
    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button variant="ghost" size="icon"><Settings className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
    </div>
  </div>
</Card>
```

### 2. FluxTemplateCard - Modèles recommandés

Composant pour les suggestions "Quick Add" :

```tsx
interface FluxTemplate {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  keywords: string[];
  quadrants: string[];
}

const templates: FluxTemplate[] = [
  {
    id: 'ereputation',
    title: 'E-Réputation',
    description: 'Surveillez ce qu\'on dit de votre marque sur les réseaux',
    icon: MessageCircle,
    keywords: ['réputation', 'avis', 'mentions'],
    quadrants: ['reputation']
  },
  {
    id: 'cybersecurity',
    title: 'Cybersécurité',
    description: 'Alertes failles, ransomware et patchs critiques',
    icon: Shield,
    keywords: ['cyberattaque', 'faille', 'ransomware'],
    quadrants: ['tech']
  },
  {
    id: 'tenders',
    title: 'Appels d\'Offres',
    description: 'Détectez les nouveaux marchés publics dès publication',
    icon: FileText,
    keywords: ['appel d\'offres', 'marché public'],
    quadrants: ['market', 'regulation']
  },
  {
    id: 'fintech',
    title: 'Innovations Fintech',
    description: 'Suivi des startups et levées de fonds du secteur',
    icon: Coins,
    keywords: ['fintech', 'startup', 'levée de fonds'],
    quadrants: ['tech', 'market']
  }
];
```

### 3. Header amélioré

```tsx
<div className="flex justify-between items-end mb-8">
  <div>
    <h1 className="text-2xl font-bold flex items-center gap-3">
      <Rss className="h-7 w-7 text-primary" />
      Mes Flux de Veille
      <Badge variant="secondary" className="text-xs">
        {activeCount} actifs
      </Badge>
    </h1>
    <p className="text-muted-foreground mt-1">
      Gérez vos robots de surveillance et vos alertes automatiques
    </p>
  </div>
  <Button onClick={() => setFormOpen(true)} className="gap-2">
    <Plus className="h-4 w-4" />
    Créer un nouveau flux
  </Button>
</div>
```

---

## Hooks à ajouter

### useFluxNewActualitesCount

Nouveau hook pour compter les actualités non notifiées par flux :

```typescript
export function useFluxNewActualitesCount(fluxIds: string[]) {
  return useQuery({
    queryKey: ['flux-new-actualites-count', fluxIds],
    queryFn: async () => {
      if (!fluxIds.length) return {};
      const counts: Record<string, number> = {};
      
      for (const fluxId of fluxIds) {
        const { count, error } = await supabase
          .from('flux_actualites')
          .select('*', { count: 'exact', head: true })
          .eq('flux_id', fluxId)
          .eq('notifie', false);
        
        if (!error && count !== null) {
          counts[fluxId] = count;
        }
      }
      return counts;
    },
    enabled: fluxIds.length > 0,
    refetchInterval: 60000, // Refresh toutes les minutes
  });
}
```

---

## Fonction helper buildQueryString

Construit une représentation textuelle des critères du flux :

```typescript
function buildQueryString(flux: FluxVeille): string {
  const parts: string[] = [];
  
  if (flux.mots_cles.length > 0) {
    parts.push(flux.mots_cles.slice(0, 3).join(' OR '));
    if (flux.mots_cles.length > 3) {
      parts.push('...');
    }
  }
  
  if (flux.quadrants.length > 0 && flux.quadrants.length < 4) {
    parts.push(`[${flux.quadrants.join(', ')}]`);
  }
  
  if (flux.importance_min > 0) {
    parts.push(`≥${flux.importance_min}%`);
  }
  
  return parts.join(' AND ') || 'Tous les articles';
}
```

---

## États visuels

| État du flux | Apparence |
|--------------|-----------|
| **Actif** | Bordure primary, point vert pulsant, couleurs vives |
| **En pause** | Opacity 60%, grayscale 50%, point gris |
| **Avec nouveautés** | Badge rouge `-top-2 -right-2` avec compteur |
| **Hover** | Shadow glow, boutons d'action visibles |

---

## Animations CSS

Utiliser les classes existantes du design system :
- `animate-pulse` pour le point de statut
- `transition-all duration-300` pour les états
- `group-hover:opacity-100` pour révéler les actions
- `hover:shadow-glow` (déjà défini dans index.css)

---

## Récapitulatif UX

| Problème actuel | Solution |
|-----------------|----------|
| Écran vide intimidant | Section "Modèles recommandés" toujours visible |
| Pas de feedback visuel | Point pulsant + badge de nouveautés |
| Critères cachés | Bloc `QUERY:` en style terminal |
| Actions toujours visibles | Apparition au survol (UX pro) |
| Toggle statique | Switch avec indicateur textuel "En surveillance" |

