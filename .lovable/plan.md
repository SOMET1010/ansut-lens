

# Nettoyage de la fonction envoyer-sms apres resolution SSL

## Contexte

Le certificat SSL de la passerelle `smsgateway.ablele.net` a ete corrige. Le contournement SSL (`fetchWithSSLFallback`) n'est plus necessaire et peut etre supprime pour simplifier le code.

## Modifications

**Fichier** : `supabase/functions/envoyer-sms/index.ts`

1. Supprimer la fonction `fetchWithSSLFallback` (lignes 9-55) qui n'est plus utile
2. Remplacer l'appel `fetchWithSSLFallback(smsApiUrl, bodyPayload)` par un appel `fetch()` standard
3. Tester l'envoi SMS pour confirmer que la connexion HTTPS fonctionne correctement

## Resultat attendu

Un code plus simple et plus securise, utilisant la verification SSL standard de Deno.

