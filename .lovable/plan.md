
# Enrichissement des sources de veille africaines et télécom

## Objectif

Ajouter des sources alternatives pertinentes pour améliorer la couverture de veille sur l'écosystème tech africain et le secteur des télécommunications, en complément des 8 sources déjà configurées.

## Analyse des sources existantes

| Nom | Type | URL | Statut |
|-----|------|-----|--------|
| Africa Tech Summit | blog | africatechsummit.com/blog | Actif |
| CIO Mag Afrique | blog | cio-mag.com | Actif |
| Réseau Télécom | blog | reseaux-telecoms.net | Actif |
| JeuneAfrique Tech | news | jeuneafrique.com/economie-entreprises/tech | Actif |
| TIC Magazine CI | news | ticmagazine.ci | Actif |
| Facebook ANSUT | facebook | (réseau social) | Inactif |
| LinkedIn ANSUT | linkedin | (réseau social) | Inactif |
| Twitter/X ANSUT | twitter | (réseau social) | Inactif |

**Constat** : 5 sources actives sur 8, principalement francophones. Manque de diversité géographique et de couverture anglophone.

## Nouvelles sources proposees

### Blogs Tech Africains

| Nom | URL | Couverture |
|-----|-----|------------|
| Disrupt Africa | https://disrupt-africa.com | Startups et innovation panafricaine (EN) |
| TechCabal | https://techcabal.com | Tech news Afrique (EN) |
| Ecofin Telecom | https://agenceecofin.com/telecom | Télécoms et régulation Afrique (FR) |
| WeeTracker | https://weetracker.com | Startups et fintech Afrique (EN) |
| IT News Africa | https://itnewsafrica.com | Tech enterprise Afrique (EN) |
| Tech-Afrique | https://tech-afrique.com | Tech francophone (FR) |

### Presse Specialisee Telecom

| Nom | URL | Couverture |
|-----|-----|------------|
| Telecom Review Africa | https://telecomreviewafrica.com | Industrie télécom Afrique (EN) |
| Connecting Africa | https://connectingafrica.com | Connectivité et infra (EN) |
| Balancing Act Africa | https://balancingact-africa.com | Broadband et médias (EN) |
| CommsUpdate | https://commsupdate.com/africa | Régulation télécom (EN) |
| Mobile World Live | https://mobileworldlive.com | 5G et innovations mobiles (EN) |
| GSMA News Africa | https://gsma.com/africa | Association opérateurs (EN) |

### Actualites Regionales Cote d'Ivoire

| Nom | URL | Couverture |
|-----|-----|------------|
| Abidjan.net Tech | https://news.abidjan.net/h/tech | Tech locale CI (FR) |
| Le Point Afrique | https://lepointafrique.com | Actualités économiques (FR) |
| Financial Afrik | https://financialafrik.com | Finance et tech Afrique (FR) |

## Migration base de donnees

Insertion des 15 nouvelles sources avec le type approprié (blog ou news) et la fréquence de scan adaptée.

```sql
INSERT INTO sources_media (nom, type, url, actif, frequence_scan) VALUES
  -- Blogs Tech Africains
  ('Disrupt Africa', 'blog', 'https://disrupt-africa.com', true, '6h'),
  ('TechCabal', 'blog', 'https://techcabal.com', true, '6h'),
  ('Ecofin Telecom', 'news', 'https://www.agenceecofin.com/telecom', true, '6h'),
  ('WeeTracker', 'blog', 'https://weetracker.com', true, '12h'),
  ('IT News Africa', 'blog', 'https://www.itnewsafrica.com', true, '12h'),
  ('Tech-Afrique', 'blog', 'https://tech-afrique.com', true, '12h'),
  -- Presse Telecom
  ('Telecom Review Africa', 'news', 'https://www.telecomreviewafrica.com', true, '12h'),
  ('Connecting Africa', 'news', 'https://www.connectingafrica.com', true, '12h'),
  ('Balancing Act Africa', 'news', 'https://www.balancingact-africa.com', true, '24h'),
  ('CommsUpdate Africa', 'news', 'https://www.commsupdate.com/africa', true, '24h'),
  ('Mobile World Live', 'news', 'https://www.mobileworldlive.com', true, '12h'),
  ('GSMA Africa', 'news', 'https://www.gsma.com/africa', true, '24h'),
  -- Actualités régionales CI
  ('Abidjan.net Tech', 'news', 'https://news.abidjan.net/h/tech.asp', true, '6h'),
  ('Le Point Afrique', 'news', 'https://www.lepoint.fr/afrique', true, '12h'),
  ('Financial Afrik', 'news', 'https://www.financialafrik.com', true, '12h');
```

## Resultat attendu

Après ajout :
- **23 sources totales** (contre 8 actuellement)
- **20 sources actives** (contre 5)
- Couverture équilibrée FR/EN
- Diversité : blogs tech, presse télécom, actualités régionales

## Impact sur la collecte

Le job CRON `collecte-social-auto` (toutes les 6h) récupérera automatiquement les insights de ces nouvelles sources. Les mots-clés de veille déjà configurés filtreront les contenus pertinents.

## Section technique

### Types de sources compatibles

La fonction `collecte-social` filtre les sources par type :
```typescript
.in('type', ['blog', 'forum', 'news'])
```

Les nouveaux types utilisés (`blog`, `news`) sont donc compatibles sans modification du code.

### Frequences recommandees

| Fréquence | Sources |
|-----------|---------|
| 6h | Sources à fort volume (Disrupt Africa, TechCabal, Ecofin, Abidjan.net) |
| 12h | Sources à volume moyen (IT News, Telecom Review, etc.) |
| 24h | Sources à faible volume (GSMA, Balancing Act, CommsUpdate) |

### Fichiers concernes

Aucune modification de code requise - uniquement une insertion de données via migration SQL.

| Action | Détail |
|--------|--------|
| Migration SQL | INSERT de 15 nouvelles sources |
| Code | Aucun changement |
| CRON | Aucun changement (déjà configuré) |

### Verification post-insertion

Requête pour confirmer l'ajout :
```sql
SELECT type, COUNT(*) as count, 
       SUM(CASE WHEN actif THEN 1 ELSE 0 END) as actives
FROM sources_media 
GROUP BY type 
ORDER BY type;
```
