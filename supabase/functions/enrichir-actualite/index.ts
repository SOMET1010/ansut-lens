import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MotCleVeille {
  id: string;
  mot_cle: string;
  variantes: string[] | null;
  quadrant: string | null;
  score_criticite: number | null;
  alerte_auto: boolean | null;
  categories_veille?: {
    nom: string;
    code: string;
  } | { nom: string; code: string; }[] | null;
}

// Helper to get category name from joined data
const getCategoryName = (cat: MotCleVeille['categories_veille']): string | undefined => {
  if (!cat) return undefined;
  if (Array.isArray(cat)) return cat[0]?.nom;
  return cat.nom;
};

interface EnrichmentResult {
  tags: string[];
  categorie: string;
  importance: number;
  quadrant_dominant: string;
  quadrant_distribution: Record<string, number>;
  alertes_declenchees: string[];
  analyse_summary: string;
}

// Normalisation : lowercase + suppression accents
const normalize = (str: string): string => 
  str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Configuration manquante' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    const { actualite_id, content, titre, resume } = await req.json();

    console.log('[enrichir-actualite] Démarrage enrichissement', { actualite_id, hasContent: !!content });

    // 1. Récupérer tous les mots-clés actifs
    const { data: motsCles, error: motsClesError } = await supabase
      .from('mots_cles_veille')
      .select(`
        id, mot_cle, variantes, quadrant, score_criticite, alerte_auto,
        categories_veille (nom, code)
      `)
      .eq('actif', true)
      .order('score_criticite', { ascending: false });

    if (motsClesError) {
      console.error('[enrichir-actualite] Erreur récupération mots-clés:', motsClesError);
      throw motsClesError;
    }

    // 2. Récupérer l'actualité si on a un ID
    let textToAnalyze = content || '';
    let actualiteData = null;

    if (actualite_id) {
      const { data: actu, error: actuError } = await supabase
        .from('actualites')
        .select('*')
        .eq('id', actualite_id)
        .single();

      if (actuError) {
        console.error('[enrichir-actualite] Erreur récupération actualité:', actuError);
        throw actuError;
      }

      actualiteData = actu;
      textToAnalyze = `${actu.titre || ''} ${actu.resume || ''} ${actu.contenu || ''}`;
    } else if (titre || resume) {
      textToAnalyze = `${titre || ''} ${resume || ''}`;
    }

    if (!textToAnalyze.trim()) {
      return new Response(JSON.stringify({ error: 'Aucun contenu à analyser' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Analyser le contenu
    const normalizedContent = normalize(textToAnalyze);
    const matchedKeywords: string[] = [];
    const alertKeywords: string[] = [];
    let totalScore = 0;
    const quadrantScores: Record<string, number> = { tech: 0, regulation: 0, market: 0, reputation: 0 };
    const categoryScores: Record<string, number> = {};

    for (const motCle of motsCles) {
      const mc = motCle as MotCleVeille;
      const allTerms = [mc.mot_cle, ...(mc.variantes || [])];
      let matched = false;

      for (const term of allTerms) {
        if (normalizedContent.includes(normalize(term))) {
          matched = true;
          break;
        }
      }

      if (matched) {
        matchedKeywords.push(mc.mot_cle);
        const score = mc.score_criticite || 50;
        totalScore += score;

        if (mc.quadrant) {
          quadrantScores[mc.quadrant] = (quadrantScores[mc.quadrant] || 0) + score;
        }

        const catName = getCategoryName(mc.categories_veille);
        if (catName) {
          categoryScores[catName] = (categoryScores[catName] || 0) + score;
        }

        if (mc.alerte_auto) {
          alertKeywords.push(mc.mot_cle);
        }
      }
    }

    // 4. Calculer les résultats
    const importance = Math.min(100, Math.round(totalScore * 0.3));

    // Quadrant dominant
    const sortedQuadrants = Object.entries(quadrantScores)
      .filter(([_, score]) => score > 0)
      .sort((a, b) => b[1] - a[1]);
    const dominantQuadrant = sortedQuadrants[0]?.[0] || 'market';

    // Normaliser la distribution des quadrants (0-100)
    const maxQuadrantScore = Math.max(...Object.values(quadrantScores), 1);
    const quadrantDistribution: Record<string, number> = {};
    for (const [quadrant, score] of Object.entries(quadrantScores)) {
      quadrantDistribution[quadrant] = Math.round((score / maxQuadrantScore) * 100);
    }

    // Catégorie dominante
    const sortedCategories = Object.entries(categoryScores)
      .sort((a, b) => b[1] - a[1]);
    const dominantCategory = sortedCategories[0]?.[0] || 'Actualités sectorielles';

    const enrichment: EnrichmentResult = {
      tags: matchedKeywords,
      categorie: dominantCategory,
      importance,
      quadrant_dominant: dominantQuadrant,
      quadrant_distribution: quadrantDistribution,
      alertes_declenchees: alertKeywords,
      analyse_summary: `${matchedKeywords.length} mots-clés détectés${alertKeywords.length > 0 ? ` dont ${alertKeywords.length} critiques` : ''}`
    };

    console.log('[enrichir-actualite] Enrichissement calculé:', enrichment);

    // 5. Mettre à jour l'actualité si on a un ID
    if (actualite_id) {
      const { error: updateError } = await supabase
        .from('actualites')
        .update({
          tags: matchedKeywords,
          categorie: dominantCategory,
          importance,
          analyse_ia: JSON.stringify({
            ...enrichment,
            enrichi_le: new Date().toISOString()
          })
        })
        .eq('id', actualite_id);

      if (updateError) {
        console.error('[enrichir-actualite] Erreur mise à jour:', updateError);
        throw updateError;
      }

      // 6. Créer des alertes si nécessaire
      if (alertKeywords.length > 0) {
        await supabase
          .from('alertes')
          .insert({
            type: 'veille',
            niveau: alertKeywords.length >= 3 ? 'critical' : 'warning',
            titre: `Mots-clés critiques détectés`,
            message: `L'actualité contient ${alertKeywords.length} mot(s)-clé(s) critique(s): ${alertKeywords.join(', ')}`,
            reference_type: 'actualite',
            reference_id: actualite_id,
          });
      }

      console.log(`[enrichir-actualite] Actualité ${actualite_id} enrichie avec succès`);
    }

    return new Response(JSON.stringify({
      success: true,
      actualite_id,
      enrichment
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[enrichir-actualite] Erreur:', error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Erreur inconnue' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
