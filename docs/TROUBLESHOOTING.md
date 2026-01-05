# Dépannage et FAQ

## Erreurs Courantes

### Authentification

#### "Token invalide" / 401 Unauthorized

**Cause :** Le token JWT a expiré ou est absent.

**Solution :**
```typescript
// Vérifier la session
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  // Rediriger vers login
  navigate('/auth');
}
```

#### "Droits insuffisants" / 403 Forbidden

**Cause :** L'utilisateur n'a pas le rôle requis.

**Solution :**
```typescript
// Vérifier le rôle côté client
const { isAdmin } = useAuth();
if (!isAdmin) {
  toast.error('Accès réservé aux administrateurs');
  return;
}
```

#### Email d'invitation non reçu

**Causes possibles :**
1. Email en spam
2. Adresse email incorrecte
3. Erreur Resend API

**Solution :**
1. Vérifier les spams
2. Vérifier l'adresse dans les logs admin
3. Consulter les logs Edge Function `invite-user`

#### Lien d'invitation invalide

**Cause :** URL de redirection non autorisée.

**Solution :** Vérifier que les URLs sont dans la liste autorisée :
- `https://ansut-lens.lovable.app`
- `https://ansut-lens.lovable.app/auth/reset-password`
- URLs de preview Lovable

---

### Base de Données

#### "Permission denied for table"

**Cause :** RLS policy manquante ou incorrecte.

**Diagnostic :**
```sql
-- Vérifier les policies
SELECT * FROM pg_policies WHERE tablename = 'ma_table';
```

**Solution :**
```sql
-- Ajouter une policy
CREATE POLICY "Users can view own data" ON ma_table
FOR SELECT USING (auth.uid() = user_id);
```

#### Données non affichées (limite 1000 rows)

**Cause :** Supabase limite à 1000 lignes par défaut.

**Solution :**
```typescript
// Pagination
const { data } = await supabase
  .from('actualites')
  .select('*')
  .range(0, 49); // 50 premiers résultats
```

#### Colonnes manquantes après migration

**Cause :** Types TypeScript non régénérés.

**Solution :** Les types sont régénérés automatiquement après approbation de migration.

---

### Edge Functions

#### Fonction non trouvée (404)

**Cause :** La fonction n'est pas déployée.

**Solution :**
1. Vérifier que le fichier existe dans `supabase/functions/`
2. Vérifier la syntaxe du fichier `index.ts`
3. Redéployer via l'interface Lovable

#### Timeout (504)

**Cause :** La fonction prend trop de temps (>30s).

**Solutions :**
1. Optimiser le code
2. Réduire le volume de données
3. Utiliser des tâches CRON pour les opérations longues

#### CORS Error

**Cause :** Headers CORS manquants.

**Solution :**
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Gérer preflight
if (req.method === "OPTIONS") {
  return new Response(null, { headers: corsHeaders });
}

// Inclure dans toutes les réponses
return new Response(data, { 
  headers: { ...corsHeaders, "Content-Type": "application/json" } 
});
```

#### Secret non trouvé

**Cause :** Le secret n'est pas configuré.

**Diagnostic :**
```typescript
const apiKey = Deno.env.get("MY_API_KEY");
console.log("API Key present:", !!apiKey);
```

**Solution :** Ajouter le secret via l'interface Lovable.

---

### CRON Jobs

#### Job non exécuté

**Causes possibles :**
1. Job désactivé
2. Schedule incorrect
3. Erreur dans la fonction

**Diagnostic :**
```sql
-- Vérifier le statut
SELECT * FROM cron.job WHERE jobname = 'mon-job';

-- Vérifier l'historique
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'mon-job')
ORDER BY start_time DESC LIMIT 10;
```

#### Collecte sans résultats

**Causes possibles :**
1. API Perplexity indisponible
2. Quota API dépassé
3. Mots-clés inactifs

**Diagnostic :**
```sql
-- Vérifier les logs
SELECT * FROM collectes_log 
ORDER BY created_at DESC LIMIT 10;
```

---

### Interface Utilisateur

#### Page blanche / Erreur de rendu

**Solutions :**
1. Vider le cache navigateur
2. Vérifier la console pour les erreurs JavaScript
3. Vérifier que les données sont chargées

#### Composant ne se met pas à jour

**Cause :** Cache TanStack Query.

**Solution :**
```typescript
// Invalider le cache
queryClient.invalidateQueries({ queryKey: ['ma-query'] });
```

#### Toast/Notification ne s'affiche pas

**Vérifier :**
1. Le `Toaster` est présent dans le layout
2. L'import de toast est correct

```typescript
import { toast } from 'sonner';
// ou
import { toast } from '@/hooks/use-toast';
```

---

## Debugging

### Logs Console

```typescript
// Activer les logs détaillés
console.log('Debug:', { variable, state });
```

### Logs Edge Functions

```typescript
// Dans une Edge Function
console.log("Request body:", JSON.stringify(body));
console.error("Error:", error.message);
```

Consulter via l'outil de logs dans Lovable.

### Logs Base de Données

```sql
-- Requêtes récentes
SELECT * FROM postgres_logs 
ORDER BY timestamp DESC 
LIMIT 100;

-- Erreurs uniquement
SELECT * FROM postgres_logs 
WHERE parsed.error_severity IS NOT NULL
ORDER BY timestamp DESC;
```

### Logs Authentification

```sql
SELECT * FROM auth_logs
ORDER BY timestamp DESC
LIMIT 100;
```

---

## FAQ

### Comment ajouter un nouvel administrateur ?

1. Se connecter en tant qu'admin
2. Aller dans Administration > Utilisateurs
3. Cliquer sur "Inviter un utilisateur"
4. Sélectionner le rôle "admin"

### Comment réinitialiser un mot de passe ?

**Pour soi-même :**
1. Cliquer sur "Mot de passe oublié" sur la page de connexion
2. Entrer son email
3. Suivre le lien reçu par email

**Pour un autre utilisateur (admin) :**
1. Désactiver puis réactiver le compte
2. Renvoyer une invitation

### Comment exporter des données ?

Les exports ne sont pas implémentés nativement. Options :
1. Utiliser l'API pour récupérer les données
2. Demander un export via le support

### Comment ajouter une nouvelle source de veille ?

1. Aller dans Administration > Mots-clés
2. Ajouter les mots-clés souhaités
3. Les prochaines collectes les prendront en compte

### Comment modifier la fréquence des collectes ?

1. Aller dans Administration > CRON Jobs
2. Modifier le schedule du job souhaité
3. Utiliser la syntaxe CRON standard

### Pourquoi les actualités sont-elles en doublon ?

Le système détecte les doublons par URL. Si une même actualité a des URLs différentes, elle peut apparaître plusieurs fois.

---

## Support

Pour les problèmes non résolus :
1. Consulter les logs détaillés
2. Vérifier la documentation Lovable
3. Contacter le support technique

---

Voir aussi : [Architecture](./ARCHITECTURE.md) | [Edge Functions](./EDGE-FUNCTIONS.md) | [API](./API.md)
