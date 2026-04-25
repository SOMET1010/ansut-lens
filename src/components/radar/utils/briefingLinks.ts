/**
 * Couche de mapping unique reliant chaque CTA "Voir le détail" du Daily Briefing
 * aux fiches correspondantes dans /actualites, /radar et /dossiers.
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
  section: BriefingSectionKey;
  itemText?: string;
  scope: BriefingTargetScope;
}

const SECTION_ROUTES: Record<BriefingSectionKey, string> = {
  retenir: '/actualites',
  impact: '/radar',
  recommandation: '/dossiers',
};

const QUERY_PARAM_BY_ROUTE: Record<string, 'q' | 'focus'> = {
  '/actualites': 'q',
  '/dossiers': 'q',
  '/radar': 'focus',
};

export function cleanBriefingText(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/\[\d+\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function buildBriefingDetailHref({ section, itemText, scope }: BuildLinkInput): string {
  const route = SECTION_ROUTES[section];
  const queryKey = QUERY_PARAM_BY_ROUTE[route];
  const params = new URLSearchParams();
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
  if (section === 'retenir') return 'Voir l’actualité liée';
  if (section === 'impact') return 'Voir le détail sur le radar';
  return isCrise ? 'Agir maintenant sur ce dossier' : 'Ouvrir le dossier lié';
}
