

## Constat

L'Espace Communication (`/communication`) ne contient actuellement que 3 sections : Briefing matinal, Kit Communication, et Accès rapide. Il manque la partie essentielle pour la Com au quotidien : **le suivi de l'e-réputation et des réseaux sociaux**.

Ces widgets existent déjà sur la page Radar mais sont noyés parmi d'autres outils techniques. La Com ne devrait pas avoir à aller sur `/radar` pour voir ses indicateurs sociaux.

## Ce qu'on va ajouter

Une nouvelle section **"E-Réputation & Médias Sociaux"** insérée en haut de la page Communication (avant le briefing), avec 4 widgets réutilisés depuis le Radar :

1. **Impact Média** (`MediaImpactWidget`) — volume d'articles, mentions ANSUT, sentiment du jour
2. **Social Pulse** (`SocialPulseWidget`) — derniers posts collectés sur LinkedIn, X, Facebook avec sentiment
3. **Part de Voix** (`ShareOfVoiceWidget`) — ratio publications ANSUT vs couverture presse
4. **Écho & Résonance** (`EchoResonanceWidget`) — impact des publications institutionnelles

## Modifications

| Fichier | Action |
|---------|--------|
| `src/pages/CommunicationPage.tsx` | Ajouter une section "E-Réputation & Médias Sociaux" avec les 4 widgets importés depuis `@/components/radar`, disposés en grille 2x2, placée entre le header et le briefing matinal |

L'avantage : aucun nouveau composant à créer, on réutilise les widgets existants qui sont déjà connectés aux données en base.

