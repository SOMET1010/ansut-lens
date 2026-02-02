import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SocialInsight {
  source_id?: string;
  plateforme: 'linkedin' | 'twitter' | 'facebook';
  type_contenu: 'post' | 'mention' | 'hashtag' | 'trending';
  contenu: string;
  auteur?: string;
  auteur_url?: string;
  url_original?: string;
  date_publication?: string;
  engagement_score: number;
  sentiment?: number;
  entites_detectees?: string[];
  hashtags?: string[];
  est_critique: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FIRECRAWL_API_KEY = Deno.env.get('FIRECRAWL_API_KEY');
    if (!FIRECRAWL_API_KEY) {
      throw new Error('FIRECRAWL_API_KEY not configured');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer les sources sociales actives
    const { data: sources, error: sourcesError } = await supabase
      .from('sources_media')
      .select('id, nom, type, url')
      .in('type', ['linkedin', 'twitter', 'facebook'])
      .eq('actif', true);

    if (sourcesError) {
      throw new Error(`Failed to fetch sources: ${sourcesError.message}`);
    }

    console.log(`Found ${sources?.length || 0} social sources to scrape`);

    const insights: SocialInsight[] = [];
    const errors: string[] = [];

    // Récupérer les mots-clés de veille pour le filtrage
    const { data: motsCles } = await supabase
      .from('mots_cles_veille')
      .select('mot_cle, variantes')
      .eq('actif', true);

    const keywords = motsCles?.flatMap(mc => [mc.mot_cle, ...(mc.variantes || [])]) || [];
    console.log(`Filtering with ${keywords.length} keywords`);

    for (const source of sources || []) {
      try {
        console.log(`Scraping ${source.nom} (${source.type})...`);

        // Utiliser Firecrawl pour scraper le contenu public
        const scrapeResponse = await fetch('https://api.firecrawl.dev/v1/scrape', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${FIRECRAWL_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: source.url,
            formats: ['markdown', 'links'],
            onlyMainContent: true,
            waitFor: 3000,
          }),
        });

        if (!scrapeResponse.ok) {
          const errorText = await scrapeResponse.text();
          errors.push(`${source.nom}: ${errorText}`);
          continue;
        }

        const scrapeData = await scrapeResponse.json();
        const markdown = scrapeData.data?.markdown || scrapeData.markdown || '';

        if (!markdown) {
          console.log(`No content found for ${source.nom}`);
          continue;
        }

        // Extraire les insights du contenu
        const extractedInsights = extractInsightsFromContent(
          markdown,
          source.id,
          source.type as 'linkedin' | 'twitter' | 'facebook',
          keywords
        );

        insights.push(...extractedInsights);
        console.log(`Extracted ${extractedInsights.length} insights from ${source.nom}`);

      } catch (err) {
        const errMessage = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`${source.nom}: ${errMessage}`);
        console.error(`Error scraping ${source.nom}:`, err);
      }
    }

    // Insérer les nouveaux insights
    if (insights.length > 0) {
      const { error: insertError } = await supabase
        .from('social_insights')
        .insert(insights);

      if (insertError) {
        throw new Error(`Failed to insert insights: ${insertError.message}`);
      }

      // Générer des alertes pour les insights critiques
      const criticalInsights = insights.filter(i => i.est_critique);
      if (criticalInsights.length > 0) {
        const alertes = criticalInsights.map(insight => ({
          type: 'social',
          niveau: 'important',
          titre: `Insight social critique - ${insight.plateforme}`,
          message: insight.contenu?.substring(0, 200) + '...',
          reference_type: 'social_insight',
        }));

        await supabase.from('alertes').insert(alertes);
        console.log(`Generated ${alertes.length} alerts for critical insights`);
      }
    }

    // Logger la collecte
    await supabase.from('collectes_log').insert({
      type: 'social',
      statut: errors.length === 0 ? 'succes' : 'partiel',
      nb_resultats: insights.length,
      sources_utilisees: sources?.map(s => s.nom) || [],
      erreur: errors.length > 0 ? errors.join('; ') : null,
    });

    return new Response(JSON.stringify({
      success: true,
      insights_collected: insights.length,
      sources_scraped: sources?.length || 0,
      errors: errors.length > 0 ? errors : undefined,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in collecte-social:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Fonction pour extraire les insights du contenu scraped
function extractInsightsFromContent(
  content: string,
  sourceId: string,
  plateforme: 'linkedin' | 'twitter' | 'facebook',
  keywords: string[]
): SocialInsight[] {
  const insights: SocialInsight[] = [];
  
  // Diviser le contenu en sections/posts potentiels
  const sections = content.split(/\n{2,}/).filter(s => s.trim().length > 50);
  
  for (const section of sections.slice(0, 10)) { // Limiter à 10 insights par source
    const cleanContent = section.trim();
    
    // Vérifier si le contenu contient des mots-clés pertinents
    const matchingKeywords = keywords.filter(kw => 
      cleanContent.toLowerCase().includes(kw.toLowerCase())
    );
    
    if (matchingKeywords.length === 0 && keywords.length > 0) {
      continue; // Ignorer si aucun mot-clé ne correspond
    }

    // Extraire les hashtags
    const hashtagMatches = cleanContent.match(/#\w+/g) || [];
    
    // Calculer un score d'engagement estimé
    const engagementScore = calculateEngagementScore(cleanContent, plateforme);
    
    // Estimer le sentiment (simplifié)
    const sentiment = estimateSentiment(cleanContent);
    
    // Déterminer si critique (mentions négatives, controverses)
    const isCritical = sentiment < -0.3 || 
      /controvers|scandale|accusation|crise|problème|échec/i.test(cleanContent);

    insights.push({
      source_id: sourceId,
      plateforme,
      type_contenu: 'post',
      contenu: cleanContent.substring(0, 1000),
      hashtags: hashtagMatches,
      engagement_score: engagementScore,
      sentiment,
      entites_detectees: matchingKeywords,
      est_critique: isCritical,
    });
  }
  
  return insights;
}

function calculateEngagementScore(content: string, plateforme: string): number {
  // Score basé sur des indicateurs de longueur et structure
  let score = Math.min(content.length / 10, 50);
  
  // Bonus pour les mentions et hashtags
  const mentions = (content.match(/@\w+/g) || []).length;
  const hashtags = (content.match(/#\w+/g) || []).length;
  
  score += mentions * 5;
  score += hashtags * 3;
  
  // Plateforme-specific adjustments
  if (plateforme === 'linkedin') score *= 1.2; // LinkedIn posts tend to have higher value
  if (plateforme === 'twitter') score *= 0.8; // Twitter posts are shorter
  
  return Math.round(Math.min(score, 100));
}

function estimateSentiment(content: string): number {
  const positiveWords = /excellent|succès|innovant|réussi|félicitations|bravo|super|génial|formidable/gi;
  const negativeWords = /échec|problème|crise|scandale|controvers|accusation|déception|inquiétude/gi;
  
  const positiveCount = (content.match(positiveWords) || []).length;
  const negativeCount = (content.match(negativeWords) || []).length;
  
  if (positiveCount === 0 && negativeCount === 0) return 0;
  
  const total = positiveCount + negativeCount;
  return Number(((positiveCount - negativeCount) / total).toFixed(2));
}
