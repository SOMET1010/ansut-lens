

## Plan : Corriger la réception des emails quotidiens

### Problème
Les emails quotidiens (Matinale Com) sont générés et envoyés correctement, mais uniquement au seul destinataire configuré (`arnold.touan@ansut.ci`). L'utilisateur n'est pas dans la liste.

### Changements proposés

**1. Activer le canal Email dans la diffusion**
- Mettre à jour la ligne `diffusion_programmation` du canal `email` : `actif = true`
- Ajouter l'email de l'utilisateur connecté comme destinataire

**2. Améliorer la page Admin → Diffusion**
- Ajouter un bouton "Ajouter mon email" qui récupère l'email du profil connecté et l'ajoute automatiquement aux destinataires du canal email
- Afficher clairement le nombre de destinataires actuels et leur liste

**3. Lier le profil utilisateur aux destinataires**
- Sur la page Profil, ajouter une option "Recevoir la Matinale quotidienne par email" (toggle)
- Quand activé, ajouter automatiquement l'email du profil dans `newsletter_destinataires`

### Action immédiate
- Demander à l'utilisateur son email pour l'ajouter à la liste des destinataires via une requête SQL

