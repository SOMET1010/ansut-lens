import { useMemo } from 'react';
import { AlertTriangle, BookOpen, FileText, HelpCircle, Info, Link2, ShieldAlert } from 'lucide-react';
import { PageContainer, PageHeader } from '@/components/common';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  REVUE_CONNAISSANCE,
  type RevueEntite,
  type RevueIndicateur,
  type RevueRelation,
} from '@/data/revueConnaissance';

/**
 * Écran admin — Revue de la connaissance institutionnelle (LECTURE SEULE).
 *
 * Alimenté par l'extraction assistée du plan (src/data/revueConnaissance.ts). Il
 * montre, pour chaque élément, le texte extrait, la diapositive, son statut, ses
 * relations et les décisions restant à prendre.
 *
 * IMPORTANT : cet écran ne valide RIEN. Aucun bouton ne passe un élément en
 * « validé » (🟢). La validation se fait en base, après revue, une fois le seed
 * appliqué. Rien ici n'est branché sur « Ce matin ».
 */

const TYPES_ORDRE: { type: string; titre: string }[] = [
  { type: 'mission', titre: 'Mission' },
  { type: 'axe', titre: 'Axes stratégiques' },
  { type: 'projet', titre: 'Projets' },
  { type: 'objectif', titre: 'Objectifs' },
  { type: 'partenaire', titre: 'Partenaires' },
];

const RELATION_LABEL: Record<string, string> = {
  contient: 'contient',
  porte: 'porte',
  responsable_de: 'responsable de',
  partenaire_de: 'partenaire de',
  contribue_a: 'contribue à',
};

function BadgeStatut({ validation }: { validation: string }) {
  if (validation === 'valide') {
    return <Badge className="bg-[hsl(var(--signal-positive))] text-[10px]">🟢 Validé</Badge>;
  }
  if (validation === 'suppose') {
    return (
      <Badge variant="outline" className="border-attention/50 text-[10px] text-attention">
        🟠 Supposé — à confirmer
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-attention/50 text-[10px] text-attention">
      🟡 À valider
    </Badge>
  );
}

export default function AdminRevueConnaissancePage() {
  const data = REVUE_CONNAISSANCE;

  const entiteParKey = useMemo(() => {
    const m = new Map<string, RevueEntite>();
    data.entities.forEach((e) => m.set(e.key, e));
    return m;
  }, [data.entities]);

  const relationsSortantes = useMemo(() => {
    const m = new Map<string, RevueRelation[]>();
    data.relations.forEach((r) => {
      if (!m.has(r.parent)) m.set(r.parent, []);
      m.get(r.parent)!.push(r);
    });
    return m;
  }, [data.relations]);

  const relationsEntrantes = useMemo(() => {
    const m = new Map<string, RevueRelation[]>();
    data.relations.forEach((r) => {
      if (!m.has(r.enfant)) m.set(r.enfant, []);
      m.get(r.enfant)!.push(r);
    });
    return m;
  }, [data.relations]);

  const indicateursParEntite = useMemo(() => {
    const m = new Map<string, RevueIndicateur[]>();
    data.indicators.forEach((i) => {
      if (!m.has(i.entity)) m.set(i.entity, []);
      m.get(i.entity)!.push(i);
    });
    return m;
  }, [data.indicators]);

  const nbSuppose = data.relations.filter((r) => r.validation === 'suppose').length;
  const nbAConfirmer = data.entities.filter((e) => e.note_maturite).length;

  const libelle = (key: string) => entiteParKey.get(key)?.libelle ?? key;

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          titre="Revue — Connaissance institutionnelle"
          description="Extraction assistée du plan stratégique, à revoir avant toute validation."
          icon={BookOpen}
        />

        {/* Bandeau : lecture seule, rien n'est validé. */}
        <div className="flex items-start gap-3 rounded-xl border border-attention/40 bg-attention/[0.06] p-4">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-attention" aria-hidden />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-attention">
              Lecture seule — aucune donnée n'est validée ici.
            </p>
            <p className="text-muted-foreground">
              Tous les éléments sont issus d'une <strong>extraction assistée</strong> du document et
              restent en statut <em>à valider</em> (🟡). Cet écran ne comporte aucun bouton de
              validation : la validation se fait en base, après revue. Rien n'est branché sur « Ce
              matin ».
            </p>
          </div>
        </div>

        {/* Source + volumes */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5" aria-hidden />
            <strong className="text-foreground">{data.source.titre}</strong>
          </span>
          <span>{data.source.reference}</span>
          <span>document du {data.source.date_document}</span>
          <span>·</span>
          <span>{data.entities.length} entités</span>
          <span>{data.relations.length} relations ({nbSuppose} supposées)</span>
          <span>{data.indicators.length} indicateurs</span>
          <span>{nbAConfirmer} à confirmer</span>
        </div>

        {/* Entités par type */}
        {TYPES_ORDRE.map(({ type, titre }) => {
          const entites = data.entities.filter((e) => e.type === type);
          if (entites.length === 0) return null;
          return (
            <section key={type} className="space-y-3">
              <h2 className="text-base font-semibold text-foreground">{titre}</h2>
              <div className="grid gap-3 lg:grid-cols-2">
                {entites.map((e) => {
                  const sortantes = relationsSortantes.get(e.key) ?? [];
                  const entrantes = relationsEntrantes.get(e.key) ?? [];
                  const indics = indicateursParEntite.get(e.key) ?? [];
                  return (
                    <Card key={e.key}>
                      <CardContent className="space-y-2.5 p-4">
                        <div className="flex flex-wrap items-center gap-2">
                          {e.code && (
                            <span className="text-xs font-semibold text-muted-foreground">{e.code}</span>
                          )}
                          <h3 className="text-sm font-semibold">{e.libelle}</h3>
                          <BadgeStatut validation="a_valider" />
                        </div>

                        {e.description && (
                          <p className="text-xs text-muted-foreground">{e.description}</p>
                        )}

                        {e.note_maturite && (
                          <p className="flex items-start gap-1.5 text-xs text-attention">
                            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
                            {e.note_maturite}
                          </p>
                        )}

                        {/* Preuve documentaire */}
                        <div className="rounded-lg border border-border/50 bg-muted/30 p-2.5">
                          <p className="mb-0.5 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                            <Info className="h-3 w-3" aria-hidden /> Preuve · {e.slide ?? '—'}
                          </p>
                          <p className="text-xs italic text-muted-foreground">« {e.texte ?? '—'} »</p>
                        </div>

                        {/* Relations */}
                        {(sortantes.length > 0 || entrantes.length > 0) && (
                          <div className="space-y-1">
                            {sortantes.map((r, i) => (
                              <p key={`s-${i}`} className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                <Link2 className="h-3 w-3 text-muted-foreground" aria-hidden />
                                <span className="text-muted-foreground">
                                  {RELATION_LABEL[r.type] ?? r.type} →
                                </span>
                                <span className="font-medium">{libelle(r.enfant)}</span>
                                <BadgeStatut validation={r.validation} />
                              </p>
                            ))}
                            {entrantes.map((r, i) => (
                              <p key={`e-${i}`} className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                <Link2 className="h-3 w-3 text-muted-foreground" aria-hidden />
                                <span className="text-muted-foreground">
                                  ← {libelle(r.parent)} ({RELATION_LABEL[r.type] ?? r.type})
                                </span>
                                <BadgeStatut validation={r.validation} />
                              </p>
                            ))}
                          </div>
                        )}

                        {/* Indicateurs rattachés — valeurs DOCUMENTAIRES de référence.
                            RADAR ne les pilote pas (pas de jauge, pas de % d'avancement) :
                            le suivi des KPI relève du Cockpit. */}
                        {indics.length > 0 && (
                          <div className="overflow-x-auto">
                            <p className="mb-1 text-[10px] italic text-muted-foreground">
                              Indicateurs de référence (documentaires) — non suivis par RADAR.
                            </p>
                            <table className="w-full text-[11px]">
                              <thead>
                                <tr className="text-left text-muted-foreground">
                                  <th className="py-1 pr-2 font-medium">Indicateur</th>
                                  <th className="py-1 pr-2 font-medium">Valeur cible (réf.)</th>
                                  <th className="py-1 pr-2 font-medium">Valeur de départ (réf.)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {indics.map((ind, i) => (
                                  <tr key={i} className="border-t border-border/40">
                                    <td className="py-1 pr-2">
                                      {ind.libelle}
                                      {ind.note && (
                                        <span className="block text-[10px] text-attention">
                                          {ind.note}
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-1 pr-2 tabular-nums">{ind.valeur_cible ?? '—'}</td>
                                    <td className="py-1 pr-2 tabular-nums">{ind.valeur_actuelle ?? '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* Ambiguïtés & décisions à prendre */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
            <HelpCircle className="h-4 w-4 text-attention" aria-hidden />
            Ambiguïtés &amp; décisions restant à prendre
          </h2>
          <Card className="border-attention/30">
            <CardContent className="p-4">
              <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                {data.ambiguites.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
                <li>{nbSuppose} relation(s) partenaire marquée(s) « supposé » — à confirmer ou infirmer.</li>
                <li>Directions responsables absentes du document — à compléter par l'ANSUT.</li>
              </ul>
            </CardContent>
          </Card>
        </section>
      </div>
    </PageContainer>
  );
}
