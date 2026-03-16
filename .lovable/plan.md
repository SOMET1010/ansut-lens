

## Plan: Ajouter un bouton "Envoyer la Matinale" sur la page Communication

### Modification unique : `src/pages/CommunicationPage.tsx`

Dans la section `MatinaleBriefingSection`, ajouter à côté du bouton "Générer le briefing" un second bouton **"Envoyer la Matinale"** qui utilise le hook `useMatinaleSend` (déjà existant dans `src/hooks/useMatinale.ts`).

**Changements :**
1. Importer `useMatinaleSend` depuis `@/hooks/useMatinale`
2. Dans `MatinaleBriefingSection`, instancier `const { mutate: sendMatinale, isPending: isSending } = useMatinaleSend()`
3. Ajouter un bouton `<Button variant="default">` avec icône `<Send>` à côté du bouton existant, qui appelle `sendMatinale()`
4. Le bouton est désactivé pendant l'envoi et affiche un spinner

Aucune modification backend nécessaire — le hook `useMatinaleSend` et la fonction Edge existent déjà.

