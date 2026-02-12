

# Proxy SMS via Deno.createHttpClient

## Probleme

L'environnement Edge Functions (Deno) refuse la connexion a `smsgateway.ablele.net` car son certificat SSL est emis par une autorite non reconnue (`UnknownIssuer`). Un `fetch()` standard et `node:https` avec `rejectUnauthorized: false` ont deja echoue.

## Solution

Utiliser l'API native Deno `Deno.createHttpClient()` qui permet de passer un client HTTP personnalise a `fetch()`. Cette API supporte l'option pour ignorer la verification des certificats ou fournir des certificats CA personnalises.

## Approche en deux etapes

### Etape 1 : Tester avec un client HTTP Deno personnalise

Modifier `supabase/functions/envoyer-sms/index.ts` pour creer un client HTTP qui ignore la verification SSL :

```text
// Creer un client HTTP sans verification SSL
const httpClient = Deno.createHttpClient({
  // Ne pas verifier le certificat du serveur
});

const response = await fetch(smsApiUrl, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: bodyPayload,
  client: httpClient,  // Passer le client personnalise
});
```

Si `Deno.createHttpClient` n'est pas disponible dans l'environnement Edge, passer a l'etape 2.

### Etape 2 (fallback) : Edge Function proxy dediee

Creer une Edge Function intermediaire `sms-proxy` qui :
- Recoit la requete SMS depuis `envoyer-sms`
- Tente l'envoi via differentes methodes (TCP brut, node:https)
- Retourne le resultat a `envoyer-sms`

Cette approche isole la logique de contournement SSL dans une fonction separee.

## Modifications prevues

**Fichier** : `supabase/functions/envoyer-sms/index.ts`
- Remplacer le `fetch()` standard par un appel utilisant `Deno.createHttpClient()`
- Ajouter une gestion d'erreur specifique si l'API n'est pas disponible

**Fichier** (si necessaire) : `supabase/config.toml`
- Ajouter la configuration pour `sms-proxy` si l'etape 2 est necessaire

## Plan de test

1. Deployer la fonction modifiee
2. Appeler `/envoyer-sms` avec un numero de test
3. Verifier les logs pour confirmer l'envoi ou identifier la prochaine etape

