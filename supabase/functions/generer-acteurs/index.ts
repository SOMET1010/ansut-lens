import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Catégories d'acteurs avec leurs paramètres
const CATEGORIES_CONFIG = {
  institutionnels: {
    cercle: 1,
    query: `Donne-moi la liste EXACTE et VÉRIFIÉE des dirigeants actuels (2024-2025) des institutions numériques en Côte d'Ivoire:
- Ministre de la Transition Numérique et de la Digitalisation (MTND) ou équivalent
- Directeur Général de l'ARTCI (Autorité de Régulation des Télécommunications)
- Directeur Général de l'ANSUT (Agence Nationale du Service Universel des Télécommunications)
- Président du Conseil d'Administration de l'ANSUT
- Autres dirigeants clés de ces institutions (DGA, Directeurs)

IMPORTANT: Ne fournis QUE des noms que tu peux vérifier avec des sources officielles. Si tu n'es pas sûr, n'inclus pas la personne.`,
    sous_categories: {
      'MTND': 'tutelle_mtnd',
      'ARTCI': 'regulation_artci',
      'ANSUT': 'gouvernance_ansut'
    },
    categorie: 'regulateur'
  },
  operateurs: {
    cercle: 2,
    query: `Donne-moi la liste EXACTE et VÉRIFIÉE des dirigeants actuels (2024-2025) des opérateurs télécoms en Côte d'Ivoire:
- Orange Côte d'Ivoire: Directeur Général, Directeur Technique, Directeur Commercial
- MTN Côte d'Ivoire: Directeur Général, Directeur Technique
- Moov Africa Côte d'Ivoire: Directeur Général, autres directeurs clés

IMPORTANT: Ne fournis QUE des noms que tu peux vérifier avec des sources officielles récentes.`,
    sous_categories: {
      'Orange': 'operateurs_mobiles',
      'MTN': 'operateurs_mobiles',
      'Moov': 'operateurs_mobiles'
    },
    categorie: 'operateur'
  },
  fai: {
    cercle: 2,
    query: `Donne-moi la liste des dirigeants des FAI (Fournisseurs d'Accès Internet) et entreprises de connectivité en Côte d'Ivoire:
- Principaux FAI: CFAO Technologies, Arobase Telecom, MTN Business, autres
- Entreprises de fibre optique et data centers

IMPORTANT: Ne fournis QUE des noms vérifiables avec sources.`,
    sous_categories: {
      'default': 'fai_internet'
    },
    categorie: 'fai'
  },
  fintech: {
    cercle: 2,
    query: `Donne-moi la liste des dirigeants des principales Fintech et services Mobile Money en Côte d'Ivoire:
- Orange Money Côte d'Ivoire
- Wave Côte d'Ivoire
- MTN Mobile Money
- Moov Money
- Autres acteurs fintech majeurs

IMPORTANT: Ne fournis QUE des noms vérifiables avec sources officielles.`,
    sous_categories: {
      'default': 'fintech_mobile_money'
    },
    categorie: 'fintech'
  },
  bailleurs: {
    cercle: 3,
    query: `Donne-moi la liste des représentants des bailleurs de fonds et organisations internationales actifs dans le numérique en Côte d'Ivoire:
- Banque Mondiale (programmes numériques/TIC)
- AFD (Agence Française de Développement)
- BAD (Banque Africaine de Développement)
- Union Européenne
- USAID
- Smart Africa
- UIT (Union Internationale des Télécommunications) - bureau régional
- GSMA

IMPORTANT: Ne fournis QUE des noms vérifiables de responsables en poste.`,
    sous_categories: {
      'Banque Mondiale': 'bailleurs_financeurs',
      'AFD': 'bailleurs_financeurs',
      'BAD': 'bailleurs_financeurs',
      'UE': 'bailleurs_financeurs',
      'USAID': 'bailleurs_financeurs',
      'Smart Africa': 'organisations_africaines',
      'UIT': 'organisations_africaines',
      'GSMA': 'organisations_africaines',
      'default': 'bailleurs_financeurs'
    },
    categorie: 'bailleur'
  },
  experts: {
    cercle: 4,
    query: `Donne-moi la liste des experts, journalistes tech et académiques reconnus dans le secteur numérique en Côte d'Ivoire:
- Journalistes spécialisés tech/télécom (CIO Mag, Jeune Afrique, médias locaux)
- Professeurs et chercheurs (INP-HB, ESATIC, universités)
- Consultants reconnus en transformation digitale
- Influenceurs tech avec présence vérifiable

IMPORTANT: Ne fournis QUE des personnes avec présence publique vérifiable (articles, profils LinkedIn, publications).`,
    sous_categories: {
      'journaliste': 'medias_analystes',
      'professeur': 'academique_formation',
      'chercheur': 'academique_formation',
      'consultant': 'consultants_influenceurs',
      'influenceur': 'consultants_influenceurs',
      'default': 'medias_analystes'
    },
    categorie: 'expert'
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PERPLEXITY_API_KEY = Deno.env.get('PERPLEXITY_API_KEY');
    if (!PERPLEXITY_API_KEY) {
      throw new Error('PERPLEXITY_API_KEY non configurée');
    }

    const { categorie, nom_recherche, cercle_force, categorie_force } = await req.json();
    
    // Mode recherche individuelle par nom
    if (categorie === 'recherche_individuelle' && nom_recherche) {
      console.log(`[generer-acteurs] Recherche individuelle: ${nom_recherche}`);
      
      const query = `Recherche des informations sur "${nom_recherche}" dans le contexte du secteur numérique, télécommunications ou technologie en Côte d'Ivoire ou Afrique de l'Ouest.

Trouve:
- Son poste/fonction actuel
- Son organisation/entreprise
- Des sources vérifiables (articles, LinkedIn, communiqués officiels)

IMPORTANT: Ne fournis des informations QUE si tu trouves des sources vérifiables. Si tu ne trouves rien de concret, dis-le clairement.`;

      const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar-pro',
          messages: [
            {
              role: 'system',
              content: `Tu es un assistant de recherche. Réponds UNIQUEMENT en JSON valide:
{
  "trouve": true/false,
  "acteur": {
    "nom_complet": "Prénom NOM",
    "fonction": "Titre du poste",
    "organisation": "Nom de l'organisation",
    "pays": "Côte d'Ivoire",
    "sources": ["https://..."],
    "notes": "Contexte"
  }
}`
            },
            { role: 'user', content: query }
          ],
          search_recency_filter: 'year',
          return_citations: true
        }),
      });

      if (!perplexityResponse.ok) {
        throw new Error(`Erreur Perplexity: ${perplexityResponse.status}`);
      }

      const data = await perplexityResponse.json();
      const content = data.choices?.[0]?.message?.content || '';
      const citations = data.citations || [];

      let result = { trouve: false, acteur: null };
      try {
        const jsonMatch = content.match(/\{[\s\S]*"trouve"[\s\S]*\}/);
        if (jsonMatch) {
          result = JSON.parse(jsonMatch[0]);
        }
      } catch (e) {
        console.error('[generer-acteurs] Erreur parsing recherche individuelle:', e);
      }

      if (result.trouve && result.acteur) {
        const acteur = result.acteur as any;
        // Enrichir avec des valeurs par défaut ou forcées
        const acteurEnrichi = {
          ...acteur,
          sources: acteur.sources?.length > 0 ? acteur.sources : citations.slice(0, 2),
          cercle: cercle_force ?? 3,
          categorie: categorie_force ?? 'autre',
          sous_categorie: 'recherche_manuelle',
          suivi_spdi_actif: false,
          score_influence: 50,
          statut: 'verifie'
        };

        return new Response(
          JSON.stringify({
            categorie: 'recherche_individuelle',
            acteurs: [acteurEnrichi],
            acteurs_a_verifier: [],
            citations_globales: citations,
            total: 1
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        return new Response(
          JSON.stringify({
            categorie: 'recherche_individuelle',
            acteurs: [],
            acteurs_a_verifier: [],
            citations_globales: citations,
            total: 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Mode génération par catégorie (existant)
    if (!categorie || !CATEGORIES_CONFIG[categorie as keyof typeof CATEGORIES_CONFIG]) {
      return new Response(
        JSON.stringify({ 
          error: 'Catégorie invalide', 
          categories_valides: Object.keys(CATEGORIES_CONFIG) 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const config = CATEGORIES_CONFIG[categorie as keyof typeof CATEGORIES_CONFIG];

    console.log(`[generer-acteurs] Génération pour catégorie: ${categorie}`);

    // Appel Perplexity avec structured output
    const perplexityResponse = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar-pro',
        messages: [
          {
            role: 'system',
            content: `Tu es un assistant de recherche spécialisé dans le secteur des télécommunications et du numérique en Afrique de l'Ouest.
            
RÈGLES STRICTES:
1. Ne fournis JAMAIS de noms inventés ou non vérifiés
2. Chaque personne DOIT avoir au moins une source URL crédible
3. Si tu n'es pas certain, n'inclus pas la personne
4. Préfère moins de résultats mais tous vérifiés
5. Les sources doivent être des sites officiels, articles de presse, LinkedIn, ou communications officielles

Réponds UNIQUEMENT en JSON valide avec ce format exact:
{
  "acteurs": [
    {
      "nom_complet": "Prénom NOM",
      "fonction": "Titre exact du poste",
      "organisation": "Nom de l'organisation",
      "pays": "Côte d'Ivoire",
      "sources": ["https://url1.com", "https://url2.com"],
      "notes": "Contexte ou précision sur la source"
    }
  ]
}`
          },
          {
            role: 'user',
            content: config.query
          }
        ],
        search_recency_filter: 'year',
        return_citations: true
      }),
    });

    if (!perplexityResponse.ok) {
      const errorText = await perplexityResponse.text();
      console.error('[generer-acteurs] Erreur Perplexity:', perplexityResponse.status, errorText);
      
      if (perplexityResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requêtes atteinte, réessayez plus tard' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Erreur Perplexity: ${perplexityResponse.status}`);
    }

    const perplexityData = await perplexityResponse.json();
    const content = perplexityData.choices?.[0]?.message?.content || '';
    const citations = perplexityData.citations || [];

    console.log('[generer-acteurs] Réponse brute:', content.substring(0, 500));

    // Parser le JSON de la réponse
    let acteurs = [];
    try {
      // Extraire le JSON de la réponse (peut être entouré de texte)
      const jsonMatch = content.match(/\{[\s\S]*"acteurs"[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        acteurs = parsed.acteurs || [];
      }
    } catch (parseError) {
      console.error('[generer-acteurs] Erreur parsing JSON:', parseError);
      // Tentative alternative: chercher un tableau
      try {
        const arrayMatch = content.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          acteurs = JSON.parse(arrayMatch[0]);
        }
      } catch {
        console.error('[generer-acteurs] Impossible de parser la réponse');
      }
    }

    // Enrichir avec les métadonnées de catégorie
    const acteursEnrichis = acteurs.map((acteur: any, index: number) => {
      // Déterminer la sous-catégorie
      let sous_categorie = 'autre';
      const org = acteur.organisation?.toUpperCase() || '';
      const sousCategories = config.sous_categories as Record<string, string>;
      
      for (const [key, value] of Object.entries(sousCategories)) {
        if (key !== 'default' && org.includes(key.toUpperCase())) {
          sous_categorie = value;
          break;
        }
      }
      if (sous_categorie === 'autre' && sousCategories['default']) {
        sous_categorie = sousCategories['default'];
      }

      // Déterminer si SPDI actif (DG/Ministre/PCA des institutions clés)
      const fonction = acteur.fonction?.toLowerCase() || '';
      const estDirigeantCle = (
        fonction.includes('directeur général') ||
        fonction.includes('ministre') ||
        fonction.includes('président')
      ) && (
        org.includes('ANSUT') ||
        org.includes('ARTCI') ||
        org.includes('MTND') ||
        org.includes('ORANGE') ||
        org.includes('MTN') ||
        org.includes('MOOV')
      );

      // Score d'influence basé sur le poste
      let score_influence = 50;
      if (fonction.includes('ministre')) score_influence = 95;
      else if (fonction.includes('directeur général') && config.cercle === 1) score_influence = 90;
      else if (fonction.includes('directeur général')) score_influence = 80;
      else if (fonction.includes('président')) score_influence = 85;
      else if (fonction.includes('directeur')) score_influence = 70;

      // Ajouter les citations globales aux sources si pas de sources spécifiques
      const sources = acteur.sources?.length > 0 
        ? acteur.sources 
        : citations.slice(0, 2);

      return {
        ...acteur,
        cercle: config.cercle,
        categorie: config.categorie,
        sous_categorie,
        suivi_spdi_actif: estDirigeantCle,
        score_influence,
        sources,
        statut: sources.length > 0 ? 'verifie' : 'a_verifier'
      };
    });

    // Filtrer ceux sans sources
    const acteursValides = acteursEnrichis.filter((a: any) => 
      a.sources && a.sources.length > 0
    );
    const acteursAVerifier = acteursEnrichis.filter((a: any) => 
      !a.sources || a.sources.length === 0
    );

    console.log(`[generer-acteurs] ${acteursValides.length} acteurs vérifiés, ${acteursAVerifier.length} à vérifier`);

    return new Response(
      JSON.stringify({
        categorie,
        acteurs: acteursValides,
        acteurs_a_verifier: acteursAVerifier,
        citations_globales: citations,
        total: acteurs.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[generer-acteurs] Erreur:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erreur inconnue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
