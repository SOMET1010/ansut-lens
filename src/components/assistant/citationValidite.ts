/**
 * Validité des citations de l'assistant IA — logique PURE et testable.
 *
 * L'assistant émet des citations `[[ACTU:id|titre]]` / `[[DOSSIER:id|titre]]`.
 * La fonction edge valide ces identifiants contre le contexte réellement injecté
 * et renvoie la liste des citations INVALIDES (id hallucinée). Charte de
 * crédibilité : une citation qui ne remonte à aucune source vérifiée ne doit
 * JAMAIS s'afficher comme un lien réel — on la marque « source introuvable »
 * (traçabilité honnête) plutôt que de fabriquer un lien cliquable factice.
 *
 * Ce module centralise : la clé d'identité d'une citation, la construction de
 * l'ensemble des clés invalides (depuis l'événement `citation_validation`), et
 * l'extraction des sources citées d'un message.
 */

export type TypeCitation = 'ACTU' | 'DOSSIER';

/** Clé d'identité stable d'une citation (type + id). */
export function cleCitation(type: TypeCitation, id: string): string {
  return `${type}:${id}`;
}

/**
 * Ensemble des clés invalides à partir des citations signalées par le back.
 * Tolère les entrées partielles (type/id manquant ignoré).
 */
export function construireClesInvalides(
  citations: ReadonlyArray<{ type?: string; id?: string }> | null | undefined,
): Set<string> {
  const set = new Set<string>();
  for (const c of citations ?? []) {
    if ((c?.type === 'ACTU' || c?.type === 'DOSSIER') && c?.id) {
      set.add(cleCitation(c.type, c.id));
    }
  }
  return set;
}

export interface SourceCitee {
  type: TypeCitation;
  id: string;
  titre: string;
  /** true si l'id ne correspond à aucun contenu vérifié (hallucination). */
  invalide: boolean;
}

// Même classe d'id que le rendu in-chat (`MessageContent`) et la validation edge :
// uniquement des identifiants hex/UUID. Un marqueur non conforme reste du texte
// littéral et n'est donc jamais présenté comme une citation.
const MARQUEUR = /\[\[(ACTU|DOSSIER):([a-f0-9-]+)\|([^\]]+)\]\]/g;

/**
 * Extrait les sources citées d'un message, marquées valides/invalides, dédupliquées
 * par (type, id). L'ordre de première apparition est conservé.
 */
export function extraireSources(content: string, clesInvalides?: Set<string>): SourceCitee[] {
  if (!content) return [];
  const out: SourceCitee[] = [];
  const vues = new Set<string>();
  let m: RegExpExecArray | null;
  MARQUEUR.lastIndex = 0;
  while ((m = MARQUEUR.exec(content)) !== null) {
    const type = m[1] as TypeCitation;
    const id = m[2];
    const cle = cleCitation(type, id);
    if (vues.has(cle)) continue;
    vues.add(cle);
    out.push({
      type,
      id,
      titre: m[3].trim(),
      invalide: !!clesInvalides?.has(cle),
    });
  }
  return out;
}
