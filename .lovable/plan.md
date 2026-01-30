

## Plan : Ajouter un graphique d'évolution des actions admin (30 jours)

### Objectif
Ajouter un graphique de type **AreaChart** montrant l'évolution quotidienne des actions administratives sur les 30 derniers jours, permettant de visualiser les tendances d'activité.

---

### Aperçu visuel

```text
┌─────────────────────────────────────────────────────────────┐
│  Journal d'audit                                             │
├─────────────────────────────────────────────────────────────┤
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  ← Compteurs existants │
│  │Total │ │Invit.│ │Rôles │ │Reset │                        │
│  └──────┘ └──────┘ └──────┘ └──────┘                        │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Activité sur 30 jours                    Tendance: +12% ││  ← NOUVEAU
│  │ ▄▄                                                      ││
│  │ ██▄   ▄▄        ▄▄▄                                     ││
│  │ ███▄▄███▄▄▄▄▄▄▄▄████▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄││
│  │ 01/01  05/01  10/01  15/01  20/01  25/01  30/01         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Filtres...                                              ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

---

### Fonctionnalités du graphique

| Fonctionnalité | Description |
|----------------|-------------|
| **Type** | AreaChart avec dégradé (comme SPDIEvolutionChart) |
| **Période** | 30 derniers jours |
| **Données** | Nombre d'actions par jour, groupé par type |
| **Couleurs** | Vert (invitations), Bleu (rôles), Violet (MDP), Gris (autres) |
| **Tooltip** | Date complète + détail par type d'action |
| **Tendance** | Badge indiquant la variation vs période précédente |

---

### Implémentation technique

#### 1. Requête pour les données 30 jours

Ajouter une nouvelle requête pour récupérer les logs des 30 derniers jours sans limite :

```typescript
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const { data: chartLogs } = useQuery({
  queryKey: ["audit-logs-chart"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("admin_audit_logs")
      .select("action, created_at")
      .gte("created_at", thirtyDaysAgo.toISOString())
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data;
  },
});
```

#### 2. Transformation des données pour le graphique

Regrouper les logs par jour :

```typescript
const chartData = useMemo(() => {
  if (!chartLogs) return [];
  
  const dayMap = new Map<string, { 
    date: string; 
    total: number;
    invitations: number;
    roles: number;
    passwords: number;
    autres: number;
  }>();
  
  // Initialiser les 30 derniers jours
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = format(d, "yyyy-MM-dd");
    dayMap.set(key, { 
      date: key, 
      total: 0, 
      invitations: 0, 
      roles: 0, 
      passwords: 0, 
      autres: 0 
    });
  }
  
  // Remplir avec les données réelles
  chartLogs.forEach(log => {
    const dayKey = format(new Date(log.created_at), "yyyy-MM-dd");
    const entry = dayMap.get(dayKey);
    if (entry) {
      entry.total++;
      if (log.action === "user_invited") entry.invitations++;
      else if (log.action === "role_changed") entry.roles++;
      else if (log.action.includes("password")) entry.passwords++;
      else entry.autres++;
    }
  });
  
  return Array.from(dayMap.values());
}, [chartLogs]);
```

#### 3. Calcul de la tendance

Comparer les 15 derniers jours vs les 15 précédents :

```typescript
const tendance = useMemo(() => {
  if (chartData.length < 30) return 0;
  const recent = chartData.slice(-15).reduce((sum, d) => sum + d.total, 0);
  const previous = chartData.slice(0, 15).reduce((sum, d) => sum + d.total, 0);
  if (previous === 0) return recent > 0 ? 100 : 0;
  return Math.round(((recent - previous) / previous) * 100);
}, [chartData]);
```

#### 4. Composant graphique

Utiliser les composants Recharts existants avec le style du projet :

```typescript
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

<Card className="glass">
  <CardHeader className="pb-2">
    <div className="flex items-center justify-between">
      <CardTitle className="text-sm font-medium flex items-center gap-2">
        <TrendingUp className="h-4 w-4" />
        Activité sur 30 jours
      </CardTitle>
      <Badge variant={tendance >= 0 ? "default" : "secondary"}>
        {tendance >= 0 ? "+" : ""}{tendance}%
      </Badge>
    </div>
  </CardHeader>
  <CardContent>
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
          <XAxis 
            dataKey="date" 
            tickFormatter={(d) => format(new Date(d), "dd/MM")}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          />
          <YAxis 
            allowDecimals={false}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area 
            type="monotone" 
            dataKey="total" 
            stroke="hsl(var(--primary))" 
            fillOpacity={1} 
            fill="url(#colorTotal)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </CardContent>
</Card>
```

#### 5. Tooltip personnalisé

Afficher le détail par type d'action :

```typescript
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border rounded-lg p-3 shadow-lg">
        <p className="text-xs text-muted-foreground mb-2">
          {format(new Date(data.date), "EEEE d MMMM", { locale: fr })}
        </p>
        <p className="font-bold text-primary">{data.total} action{data.total > 1 ? "s" : ""}</p>
        <div className="text-xs mt-1 space-y-1">
          {data.invitations > 0 && <p className="text-emerald-400">• {data.invitations} invitation(s)</p>}
          {data.roles > 0 && <p className="text-blue-400">• {data.roles} rôle(s)</p>}
          {data.passwords > 0 && <p className="text-purple-400">• {data.passwords} MDP</p>}
          {data.autres > 0 && <p className="text-muted-foreground">• {data.autres} autre(s)</p>}
        </div>
      </div>
    );
  }
  return null;
};
```

---

### Imports à ajouter

```typescript
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from "lucide-react";
```

---

### Position dans la page

Le graphique sera inséré **entre les cartes statistiques et les filtres** :

1. Header (existant)
2. Stats Cards (existant)
3. **Graphique d'activité** (nouveau)
4. Filters Card (existant)
5. Table Card (existant)

---

### Fichier à modifier

| Fichier | Modifications |
|---------|---------------|
| `src/pages/admin/AuditLogsPage.tsx` | Ajouter requête, calculs, et composant graphique |

