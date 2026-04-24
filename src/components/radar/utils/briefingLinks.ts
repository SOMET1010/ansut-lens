/**
 * Couche de mapping unique reliant chaque CTA "Voir le détail" du Daily Briefing
 * aux fiches correspondantes dans /actualites, /radar et /dossiers.
 *
 * Garantit une cohérence des paramètres URL utilisés par les bandeaux Focus
 * (FocusBanner) et le scroll automatique vers l'item correspondant.
 *
 * Paramètres URL standardisés :
 *   - q     : terme de recherche libre (filtre principal côté liste)
 *   - focus : variante alternative de "q" pour les pages utilisant le radar
 *   - from  : section d'origine du briefing (retenir | impact | recommandation)
 *   - item  : libellé exact de l'item cliqué (utilisé pour le scroll/highlight)
 */

export type BriefingSectionKey = 'retenir' | 'impact' | 'recommandation';

export type BriefingTargetScope = 'section' | 'item';

interface BuildLinkInput {
  /** Section du briefing concernée */
  section: BriefingSectionKey;
  /** Texte brut de l'item (sera nettoyé : markdown bold, citations [n]) */
  itemText?: string;
  /** 'section' = bouton header (vue d'ensemble) · 'item' = lien inline d'un bullet */
  scope: BriefingTargetScope;
}

/** Destinations canoniques par section */
const SECTION_ROUTES: Record<BriefingSectionKey, string> = {
  retenir: '/actualites',
  impact: '/radar',
  recommandation: '/dossiers',
};

/** Pages qui filtrent par "q" (recherche texte) vs "focus" (radar) */
const QUERY_PARAM_BY_ROUTE: Record<string, 'q' | 'focus'> = {
  '/actualites': 'q',
  '/dossiers': 'q',
  '/radar': 'focus',
};

/** Nettoie un texte d'item du briefing (markdown + citations) */
export function cleanBriefingText(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/\[\d+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Construit l'URL cible pour un CTA du Daily Briefing.
 * Source unique de vérité pour tout le composant.
 */
export function buildBriefingDetailHref({ section, itemText, scope }: BuildLinkInput): string {
  const route = SECTION_ROUTES[section];
  const queryKey = QUERY_PARAM_BY_ROUTE[route];
  const params = new URLSearchParams();

  // Toujours conserver l'origine du clic
  params.set('from', section);

  if (scope === 'item' && itemText) {
    const clean = cleanBriefingText(itemText);
    if (clean) {
      params.set(queryKey, clean.slice(0, 80));
      params.set('item', clean.slice(0, 120));
    }
  }

  const qs = params.toString();
  return qs ? `${route}?${qs}` : route;
}

/** Libellés ARIA cohérents par section et mode (normal / crise) */
export function getBriefingCtaAriaLabel(
  section: BriefingSectionKey,
  scope: BriefingTargetScope,
  isCrise: boolean,
): string {
  if (scope === 'section') {
    if (section === 'retenir') return isCrise ? 'Décider sur les actualités à retenir' : 'Voir le détail des actualités à retenir';
    if (section === 'impact') return isCrise ? 'Évaluer l’impact Service Universel' : 'Voir le détail de l’impact Service Universel';
    return isCrise ? 'Agir maintenant sur les recommandations ANSUT' : 'Voir le détail des recommandations ANSUT';
  }
  // scope === 'item'
  if (section === 'retenir') return 'Voir l’actualité liée';
  if (section === 'impact') return 'Voir le détail sur le radar';
  return isCrise ? 'Agir maintenant sur ce dossier' : 'Ouvrir le dossier lié';
}
