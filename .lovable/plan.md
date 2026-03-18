

## Plan de correction des 3 problemes signales

### A. Studio de Production -- Programmation newsletter cassee

**Diagnostic :**
Le cron job `newsletter-scheduler-daily` existe et est actif (tous les jours a 06h00). MAIS il y a un **bug critique de nommage de parametre** :

- `scheduler-newsletter` envoie `{ newsletter_id: newsletter.id }` (ligne 179)
- `envoyer-newsletter` attend `{ newsletterId }` (ligne 59)

Resultat : quand le scheduler tente d'envoyer une newsletter validee, le parametre est `undefined` et l'envoi echoue silencieusement avec "newsletterId requis".

De plus, `derniere_generation` est `null` et `prochain_envoi` est `null` dans la config, ce qui confirme que le scheduler n'a jamais reussi a generer/envoyer automatiquement.

**Corrections :**

1. **`supabase/functions/scheduler-newsletter/index.ts`** -- Corriger le nom du parametre :
   - Ligne 179 : `{ newsletter_id: newsletter.id }` → `{ newsletterId: newsletter.id }`

2. **`supabase/functions/envoyer-newsletter/index.ts`** -- Accepter les deux formats pour robustesse :
   - Ligne 59 : Extraire `newsletterId` OU `newsletter_id` du body

3. Redeployer les deux Edge Functions.

---

### B. Espace Communication -- "En cours de developpement"

**Diagnostic :**
L'Espace Communication (`/communication`) est en fait **deja fonctionnel** avec ~509 lignes de code. Il contient : Matinale, Reaction Analyzer, Sujets a Valoriser, Posts Amplifier, widgets e-reputation. Le message "en cours de developpement" visible dans l'interface est probablement un bandeau/badge statique qui n'a pas ete retire.

**Correction :**
- Rechercher et retirer tout bandeau "en cours de developpement" dans `CommunicationPage.tsx`
- Si absent du code, le message vient peut-etre d'un composant enfant -- verifier les composants importes

---

### C. Assistant IA -- "Doit etre entraine davantage"

**Diagnostic :**
L'assistant utilise maintenant GPT-5-mini (apres le switch depuis Gemini). Le prompt systeme est deja assez riche (contexte ANSUT, modes specialises, personnalisation utilisateur). Les ameliorations possibles :

**Corrections :**
1. **Enrichir le contexte injecte** -- Le prompt ne charge pas les actualites recentes ni les dossiers dans le contexte. L'assistant repond "dans le vide" sans donnees fraiches. Il faut injecter automatiquement les 15-20 dernieres actualites et les dossiers actifs dans le contexte systeme.

2. **Ajouter des instructions plus strictes** -- Renforcer les contraintes :
   - Ne jamais inventer de noms ou de fonctions
   - Toujours preciser quand une information n'est pas disponible
   - Utiliser les personnalites de la base comme reference

3. **Pre-charger les donnees pertinentes dans `assistant-ia/index.ts`** -- Avant l'appel LLM, faire des requetes pour recuperer actualites recentes, personnalites actives, et dossiers, puis les injecter dans le prompt systeme.

---

### Resume des modifications

| Fichier | Changement |
|---------|-----------|
| `supabase/functions/scheduler-newsletter/index.ts` | Fix parametre `newsletter_id` → `newsletterId` |
| `supabase/functions/envoyer-newsletter/index.ts` | Accepter `newsletterId` ou `newsletter_id` |
| `src/pages/CommunicationPage.tsx` | Retirer bandeau "en cours de developpement" si present |
| `supabase/functions/assistant-ia/index.ts` | Injecter actualites/dossiers/personnalites recentes dans le contexte |

Toutes les Edge Functions modifiees seront redeployees.

