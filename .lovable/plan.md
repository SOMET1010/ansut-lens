

# Smart Feed Builder - Pop-up de Configuration Avancée

## Vision

Transformer le formulaire de création de flux d'une simple liste de champs en une **expérience de briefing d'agent IA**. L'utilisateur ne remplit pas un formulaire technique, il **configure une mission de surveillance**.

```text
┌────────────────────────────────────────────────────────────────────────────────┐
│  ✕  Configurer un nouvel agent                                                 │
│     Définissez les paramètres de surveillance pour votre flux.                 │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│  ⚡  [ Nom du flux__________________________________ ]                         │
│      Ex: Concurrence Fintech, E-Réputation...                                  │
│                                                                                │
│  ┌────────────────────────────────────────────────────────────────────────┐   │
│  │  🔍 Requête de surveillance                    [✨ Générer avec l'IA]  │   │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │   │
│  │  │ (ANSUT OR "Service Universel") AND 5G -Corruption               │  │   │
│  │  └──────────────────────────────────────────────────────────────────┘  │   │
│  │                                                                        │   │
│  │  Volume estimé: ██████░░░░░░ Modéré (~15 articles/sem)                │   │
│  └────────────────────────────────────────────────────────────────────────┘   │
│                                                                                │
│  📊 Quadrants Radar                                                            │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐                  │
│  │ 💻 Tech    │ │ 📈 Market  │ │ ⚖️ Régul.  │ │ ⭐ Réputa. │                  │
│  │    ✓       │ │            │ │     ✓      │ │            │                  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘                  │
│                                                                                │
│  🎯 Seuil d'importance                                                         │
│  ░░░░░░░░░██████████████████████████████████░░░░░░░░░  ≥ 50%                  │
│                                                                                │
│  ┌────────────────────────────────────────────────────────────────────────┐   │
│  │  🔔 Notifications en temps réel                              [━━━●]   │   │
│  │     Alerte dès qu'un article critique est détecté                     │   │
│  │                                                                        │   │
│  │     ○ Instantané  ● Quotidien  ○ Hebdomadaire                         │   │
│  │                                                                        │   │
│  │  📧 Alertes par email                                        [●━━━]   │   │
│  └────────────────────────────────────────────────────────────────────────┘   │
│                                                                                │
├────────────────────────────────────────────────────────────────────────────────┤
│                                                 [ Annuler ]  [⚡ Lancer ]      │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## Fichiers à modifier/créer

| Fichier | Action | Description |
|---------|--------|-------------|
| `src/components/flux/FluxFormDialog.tsx` | Remplacer | Nouveau design "Smart Feed Builder" |
| `supabase/functions/generer-requete-flux/index.ts` | Créer | Edge function pour générer les mots-clés via IA |

---

## Fonctionnalités clés

### 1. Génération IA des mots-clés ("Killer Feature")

L'utilisateur décrit son besoin en langage naturel, l'IA génère une requête booléenne structurée.

**Flux utilisateur :**
1. L'utilisateur saisit un nom descriptif (ex: "Concurrence Mobile Money")
2. Clique sur "Générer avec l'IA"
3. L'IA analyse le contexte et génère :
   - Une liste de mots-clés pertinents
   - Les quadrants recommandés
   - Un seuil d'importance suggéré

**Edge Function `generer-requete-flux` :**
```typescript
// Prompt système pour l'IA
const SYSTEM_PROMPT = `Tu es un expert en veille stratégique télécom pour l'ANSUT (Côte d'Ivoire).
À partir du nom/description d'un flux, génère une configuration de surveillance optimale.

Retourne UNIQUEMENT un JSON valide avec cette structure :
{
  "mots_cles": ["mot1", "mot2", ...],
  "quadrants": ["tech", "market", "regulation", "reputation"],
  "importance_min": 50,
  "description": "Description courte du flux"
}

Contexte : opérateurs Orange CI, MTN, Moov ; régulateur ARTCI ; enjeux 5G, fibre, satellites.`;
```

### 2. Sections du formulaire restructurées

| Section | Contenu | Style |
|---------|---------|-------|
| **Identité** | Nom du flux avec icône | Input moderne avec icône zap |
| **Ciblage IA** | Zone de requête + bouton génération | Bloc surélevé bg-slate-50, style terminal |
| **Quadrants** | Grille 4 boutons visuels | Cards cliquables avec icônes |
| **Importance** | Slider avec valeur affichée | Slider + badge pourcentage |
| **Alertes** | Section groupée notifications | Cards avec switches intégrés |

### 3. Volume estimé (feedback visuel)

Barre de progression indicative basée sur les critères :
- **Faible** (vert clair) : Requête très spécifique
- **Modéré** (vert) : Équilibre optimal
- **Élevé** (orange) : Risque de bruit

```tsx
const estimateVolume = (keywords: string[], quadrants: string[], importance: number) => {
  // Logique d'estimation basée sur les critères
  const score = keywords.length * 10 + (4 - quadrants.length) * 15 + (100 - importance);
  if (score < 30) return { level: 1, label: 'Faible', color: 'bg-yellow-500' };
  if (score < 70) return { level: 2, label: 'Modéré', color: 'bg-green-500' };
  return { level: 3, label: 'Élevé', color: 'bg-orange-500' };
};
```

### 4. Quadrants visuels avec icônes

```tsx
const quadrantOptions = [
  { id: 'tech', label: 'Technologie', icon: Cpu, color: 'bg-blue-500', hoverColor: 'hover:border-blue-500' },
  { id: 'market', label: 'Marché', icon: TrendingUp, color: 'bg-green-500', hoverColor: 'hover:border-green-500' },
  { id: 'regulation', label: 'Régulation', icon: Scale, color: 'bg-purple-500', hoverColor: 'hover:border-purple-500' },
  { id: 'reputation', label: 'Réputation', icon: Star, color: 'bg-orange-500', hoverColor: 'hover:border-orange-500' },
];
```

---

## Détail de l'implémentation

### Edge Function `generer-requete-flux`

```typescript
serve(async (req) => {
  const { nom, description } = await req.json();
  
  const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Nom du flux: ${nom}\nDescription: ${description || 'Non fournie'}` }
      ],
      response_format: { type: 'json_object' }
    }),
  });
  
  // Parse et retourne la configuration générée
});
```

### Composant FluxFormDialog refactoré

**Structure principale :**
```tsx
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
    
    {/* Header distinctif */}
    <DialogHeader className="border-b pb-4">
      <DialogTitle className="text-xl flex items-center gap-2">
        <Zap className="h-5 w-5 text-primary" />
        {flux ? 'Modifier l\'agent' : 'Configurer un nouvel agent'}
      </DialogTitle>
      <DialogDescription>
        Définissez les paramètres de surveillance pour votre flux.
      </DialogDescription>
    </DialogHeader>
    
    {/* Corps scrollable */}
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      
      {/* Section 1: Nom */}
      <section className="space-y-2">
        <Label className="font-semibold">Nom du flux</Label>
        <div className="flex gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Zap className="h-6 w-6" />
          </div>
          <Input 
            placeholder="Ex: Concurrence Fintech, E-Réputation..." 
            className="h-12 text-base"
            autoFocus
          />
        </div>
      </section>
      
      {/* Section 2: Ciblage IA */}
      <section className="bg-muted/50 rounded-xl p-5 border space-y-4">
        <div className="flex items-center justify-between">
          <Label className="font-semibold flex items-center gap-2">
            <Search className="h-4 w-4" />
            Requête de surveillance
          </Label>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleAiGenerate}
            disabled={isGenerating}
            className="gap-2 text-purple-600 border-purple-200 hover:bg-purple-50"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Générer avec l'IA
          </Button>
        </div>
        
        {/* Zone de mots-clés avec style terminal */}
        <Textarea 
          className="font-mono text-sm bg-background"
          placeholder="Saisissez vos mots-clés ou laissez l'IA le faire..."
        />
        
        {/* Indicateur de volume */}
        <VolumeIndicator keywords={formData.mots_cles} quadrants={formData.quadrants} />
      </section>
      
      {/* Section 3: Quadrants visuels */}
      <section className="space-y-3">
        <Label className="font-semibold">Quadrants Radar</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quadrantOptions.map(q => (
            <QuadrantButton 
              key={q.id} 
              {...q} 
              active={formData.quadrants.includes(q.id)}
              onClick={() => handleToggleQuadrant(q.id)}
            />
          ))}
        </div>
      </section>
      
      {/* Section 4: Importance */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="font-semibold">Seuil d'importance minimum</Label>
          <Badge variant="secondary">≥ {formData.importance_min}%</Badge>
        </div>
        <Slider value={[formData.importance_min]} onValueChange={...} max={100} />
      </section>
      
      {/* Section 5: Alertes (groupées) */}
      <section className="rounded-xl border p-4 space-y-4">
        <AlertOption 
          icon={Bell}
          title="Notifications en temps réel"
          description="Alerte dans l'app dès qu'un article critique est détecté"
          checked={formData.alerte_push}
          onChange={...}
        />
        
        {formData.alerte_push && (
          <RadioGroup value={formData.frequence_digest} className="flex gap-4 pl-10">
            <RadioOption value="instantane" label="Instantané" />
            <RadioOption value="quotidien" label="Quotidien" />
            <RadioOption value="hebdo" label="Hebdomadaire" />
          </RadioGroup>
        )}
        
        <Separator />
        
        <AlertOption 
          icon={Mail}
          title="Alertes par email"
          description="Recevoir un email pour chaque article critique"
          checked={formData.alerte_email}
          onChange={...}
        />
      </section>
      
    </div>
    
    {/* Footer avec CTA fort */}
    <DialogFooter className="border-t pt-4 bg-muted/30">
      <Button variant="ghost" onClick={() => onOpenChange(false)}>
        Annuler
      </Button>
      <Button onClick={handleSubmit} disabled={isLoading} className="gap-2">
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
        {flux ? 'Mettre à jour' : 'Lancer la surveillance'}
      </Button>
    </DialogFooter>
    
  </DialogContent>
</Dialog>
```

---

## Composants helper

### QuadrantButton

```tsx
function QuadrantButton({ id, label, icon: Icon, color, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all",
        active 
          ? `border-current ${color.replace('bg-', 'text-')} bg-current/10` 
          : "border-muted hover:border-muted-foreground/30"
      )}
    >
      <Icon className={cn("h-5 w-5 mb-2", active ? "" : "text-muted-foreground")} />
      <span className={cn("text-xs font-medium", active ? "" : "text-muted-foreground")}>
        {label}
      </span>
    </button>
  );
}
```

### VolumeIndicator

```tsx
function VolumeIndicator({ keywords, quadrants, importance }) {
  const { level, label, color } = estimateVolume(keywords, quadrants, importance);
  
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground font-medium">Volume estimé :</span>
      <div className="flex gap-0.5">
        {[1, 2, 3].map(i => (
          <div 
            key={i} 
            className={cn(
              "w-6 h-1.5 rounded-full transition-colors",
              i <= level ? color : "bg-muted"
            )} 
          />
        ))}
      </div>
      <span className={cn("font-medium", color.replace('bg-', 'text-'))}>
        {label}
      </span>
    </div>
  );
}
```

### AlertOption

```tsx
function AlertOption({ icon: Icon, title, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h4 className="font-medium text-sm">{title}</h4>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
```

---

## Récapitulatif des améliorations UX

| Avant | Après |
|-------|-------|
| Champs texte basiques | Sections visuellement distinctes |
| Mots-clés manuels uniquement | Bouton "Générer avec l'IA" |
| Checkboxes quadrants | Boutons visuels avec icônes |
| Pas de feedback | Indicateur de volume estimé |
| Notifications séparées | Section alertes groupée avec switches |
| Bouton "Créer le flux" | "Lancer la surveillance" (vocabulaire agent) |

