import jsPDF from 'jspdf';
import type { TitrologieData, UneJournal } from '@/types/matinale';

const ANGLE_LABELS: Record<string, string> = {
  politique: 'Politique',
  social: 'Social',
  economique: 'Économie',
  numerique_telecom: 'Numérique / Réseaux',
  reputationnel: 'Réputationnel',
};

const ENTITE_LABELS: Record<string, string> = {
  ANSUT: 'ANSUT',
  MTNIT: 'MTNIT',
  SERVICE_UNIVERSEL: 'Service Universel',
};

function fmtDate(): string {
  return new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export interface TitrologieExportFilter {
  angleKey?: string; // '' = tous angles
  minIntensite?: number; // 0-3
  sortDir?: 'asc' | 'desc';
}

function applyFilter(data: TitrologieData, filter?: TitrologieExportFilter): { unes: UneJournal[]; filterLabel: string | null } {
  if (!filter) return { unes: data.unes, filterLabel: null };
  const { angleKey = '', minIntensite = 0, sortDir = 'desc' } = filter;
  const getInt = (u: any): number => {
    const a = u?.angles || {};
    if (angleKey) return a[angleKey]?.intensite ?? 0;
    return Math.max(
      a.politique?.intensite ?? 0,
      a.social?.intensite ?? 0,
      a.economique?.intensite ?? 0,
      a.numerique_telecom?.intensite ?? 0,
      a.reputationnel?.intensite ?? 0,
    );
  };
  const filtered = data.unes
    .filter(u => {
      if (angleKey) {
        const a = (u as any).angles?.[angleKey];
        if (!a || (a.intensite ?? 0) < 1) return false;
      }
      return getInt(u) >= minIntensite;
    })
    .slice()
    .sort((a, b) => sortDir === 'desc' ? getInt(b) - getInt(a) : getInt(a) - getInt(b));

  const parts: string[] = [];
  parts.push(`Angle : ${angleKey ? (ANGLE_LABELS[angleKey] || angleKey) : 'Tous'}`);
  parts.push(`Intensité min : ${minIntensite}/3`);
  parts.push(`Tri : ${sortDir === 'desc' ? 'décroissant' : 'croissant'}`);
  return { unes: filtered, filterLabel: parts.join(' · ') };
}

export function buildTitrologieMarkdown(data: TitrologieData, filter?: TitrologieExportFilter): string {
  const lines: string[] = [];
  const date = fmtDate();
  const { unes: filteredUnes, filterLabel } = applyFilter(data, filter);
  lines.push(`# Briefing Titrologie — ${date}`);
  lines.push('');
  lines.push(`_Agence Nationale du Service Universel des Télécommunications (ANSUT)_`);
  if (filterLabel) {
    lines.push('');
    lines.push(`**Filtres appliqués** : ${filterLabel} — ${filteredUnes.length}/${data.unes.length} unes`);
  }
  lines.push('');

  const synth = data.synthese_codir;
  if (synth) {
    lines.push('## Synthèse CODIR');
    if (synth.risque_global) lines.push(`- **Risque global** : ${synth.risque_global}${typeof synth.score_global === 'number' ? ` (${synth.score_global} pts)` : ''}`);
    if (synth.risque_distribution) lines.push(`- **Distribution** : 🔴 ${synth.risque_distribution.ROUGE} / 🟠 ${synth.risque_distribution.ORANGE} / 🟢 ${synth.risque_distribution.VERT}`);
    if (synth.sujets_dominants?.length) lines.push(`- **Sujets dominants** : ${synth.sujets_dominants.join(' · ')}`);
    if (synth.impact_ansut?.length) {
      lines.push(`- **Impact ANSUT** :`);
      synth.impact_ansut.forEach(i => lines.push(`  - ${i}`));
    }
    if (synth.opportunite_communication) lines.push(`- **Opportunité com** : ${synth.opportunite_communication}`);
    if (synth.risque_a_surveiller) lines.push(`- **Risque à surveiller** : ${synth.risque_a_surveiller}`);
    if (synth.action_recommandee) lines.push(`- **Action recommandée** : ${synth.action_recommandee}`);
    lines.push('');
  }

  if (data.signaux_ansut?.length) {
    lines.push('## Signaux ANSUT détectés');
    data.signaux_ansut.forEach(s => lines.push(`- ${s}`));
    lines.push('');
  }

  lines.push(`## Unes analysées (${filteredUnes.length}${filteredUnes.length !== data.unes.length ? ` sur ${data.unes.length}` : ''})`);
  lines.push('');

  filteredUnes.forEach((u: UneJournal, idx) => {
    lines.push(`### ${idx + 1}. ${u.journal} — ${u.titre}`);
    lines.push('');
    lines.push(`- **Sujet** : ${u.sujet} · **Ton** : ${u.ton} · **Risque ANSUT** : ${u.risque_ansut}${typeof u.risque_score === 'number' ? ` (${u.risque_score} pts)` : ''}`);
    if (u.url) lines.push(`- **Source** : ${u.url}`);
    if (u.lien_ansut) lines.push(`- **Lien ANSUT** : ${u.lien_ansut}`);
    if (u.risque_signals?.length) lines.push(`- **Signaux risque** : ${u.risque_signals.join(', ')}`);

    const angles = (u as any).angles || {};
    const angleEntries = Object.entries(ANGLE_LABELS)
      .map(([k, label]) => [label, angles[k]] as const)
      .filter(([, a]) => a && a.intensite >= 1);

    if (angleEntries.length) {
      lines.push('');
      lines.push(`**Analyse par angle :**`);
      angleEntries.forEach(([label, a]: any) => {
        const conf = typeof a.confiance === 'number' ? ` _(confiance ${a.confiance}/100)_` : '';
        lines.push(`- **${label}** [intensité ${a.intensite}/3]${conf} : ${a.lecture || '—'}`);
        const liens = Array.isArray(a.liens) ? a.liens : [];
        liens.forEach((l: any) => {
          if (!l?.entite || !l?.phrase) return;
          const ent = ENTITE_LABELS[l.entite] || l.entite;
          const lc = typeof l.confiance === 'number' ? ` _(${l.confiance}/100)_` : '';
          lines.push(`  - 🔗 **${ent}**${lc} — ${l.phrase}`);
          if (l.preuve) lines.push(`    > « ${l.preuve} »`);
          if (Array.isArray(l.sources)) {
            l.sources.filter((s: string) => /^https?:\/\//.test(s)).forEach((s: string, k: number) => {
              lines.push(`    - source ${k + 1} : ${s}`);
            });
          }
        });
        if (!liens.length && a.lien_ansut_mtnd) {
          lines.push(`  - 🔗 ${a.lien_ansut_mtnd}`);
        }
      });
    }
    lines.push('');
  });

  lines.push('---');
  lines.push(`_Document généré automatiquement par ANSUT RADAR — ${new Date().toLocaleString('fr-FR')}_`);

  return lines.join('\n');
}

export function downloadMarkdown(data: TitrologieData) {
  const md = buildTitrologieMarkdown(data);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `briefing-titrologie-${new Date().toISOString().slice(0, 10)}.md`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadPDF(data: TitrologieData) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  const writeWrapped = (text: string, opts: { size?: number; bold?: boolean; color?: [number, number, number]; indent?: number; gap?: number } = {}) => {
    const size = opts.size ?? 10;
    const indent = opts.indent ?? 0;
    const gap = opts.gap ?? 4;
    doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(...(opts.color ?? [30, 30, 30] as [number, number, number]));
    const lines = doc.splitTextToSize(text, maxWidth - indent);
    const lineH = size * 1.25;
    ensureSpace(lines.length * lineH + gap);
    lines.forEach((line: string) => {
      doc.text(line, margin + indent, y);
      y += lineH;
    });
    y += gap;
  };

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 60, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('ANSUT RADAR — Briefing Titrologie', margin, 35);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(fmtDate(), margin, 52);
  y = 80;

  writeWrapped('Agence Nationale du Service Universel des Télécommunications (ANSUT)', { size: 9, color: [120, 120, 120] });

  const synth = data.synthese_codir;
  if (synth) {
    writeWrapped('Synthèse CODIR', { size: 13, bold: true, color: [15, 23, 42], gap: 6 });
    if (synth.risque_global) writeWrapped(`Risque global : ${synth.risque_global}${typeof synth.score_global === 'number' ? ` (${synth.score_global} pts)` : ''}`, { size: 10, bold: true });
    if (synth.risque_distribution) writeWrapped(`Distribution : ROUGE ${synth.risque_distribution.ROUGE} · ORANGE ${synth.risque_distribution.ORANGE} · VERT ${synth.risque_distribution.VERT}`);
    if (synth.sujets_dominants?.length) writeWrapped(`Sujets dominants : ${synth.sujets_dominants.join(' · ')}`);
    if (synth.impact_ansut?.length) {
      writeWrapped('Impact ANSUT :', { bold: true });
      synth.impact_ansut.forEach(i => writeWrapped(`• ${i}`, { indent: 12 }));
    }
    if (synth.opportunite_communication) writeWrapped(`Opportunité com : ${synth.opportunite_communication}`, { color: [16, 122, 87] });
    if (synth.risque_a_surveiller) writeWrapped(`Risque à surveiller : ${synth.risque_a_surveiller}`, { color: [185, 28, 28] });
    if (synth.action_recommandee) writeWrapped(`Action recommandée : ${synth.action_recommandee}`, { bold: true });
  }

  if (data.signaux_ansut?.length) {
    writeWrapped('Signaux ANSUT détectés', { size: 12, bold: true, color: [15, 23, 42], gap: 6 });
    data.signaux_ansut.forEach(s => writeWrapped(`• ${s}`, { indent: 12 }));
  }

  writeWrapped(`Unes analysées (${data.unes.length})`, { size: 13, bold: true, color: [15, 23, 42], gap: 8 });

  data.unes.forEach((u: UneJournal, idx) => {
    ensureSpace(40);
    writeWrapped(`${idx + 1}. ${u.journal} — ${u.titre}`, { size: 11, bold: true, color: [15, 23, 42] });
    writeWrapped(`Sujet : ${u.sujet} | Ton : ${u.ton} | Risque ANSUT : ${u.risque_ansut}${typeof u.risque_score === 'number' ? ` (${u.risque_score} pts)` : ''}`, { size: 9, color: [80, 80, 80] });
    if (u.url) writeWrapped(`Source : ${u.url}`, { size: 9, color: [37, 99, 235] });
    if (u.lien_ansut) writeWrapped(`Lien ANSUT : ${u.lien_ansut}`, { size: 9 });
    if (u.risque_signals?.length) writeWrapped(`Signaux : ${u.risque_signals.join(', ')}`, { size: 9, color: [120, 120, 120] });

    const angles = (u as any).angles || {};
    const angleEntries = Object.entries(ANGLE_LABELS)
      .map(([k, label]) => [label, angles[k]] as const)
      .filter(([, a]) => a && a.intensite >= 1);

    if (angleEntries.length) {
      writeWrapped('Analyse par angle :', { size: 10, bold: true, gap: 2 });
      angleEntries.forEach(([label, a]: any) => {
        const conf = typeof a.confiance === 'number' ? ` (confiance ${a.confiance}/100)` : '';
        writeWrapped(`• ${label} [intensité ${a.intensite}/3]${conf} : ${a.lecture || '—'}`, { size: 9, indent: 12 });
        const liens = Array.isArray(a.liens) ? a.liens : [];
        liens.forEach((l: any) => {
          if (!l?.entite || !l?.phrase) return;
          const ent = ENTITE_LABELS[l.entite] || l.entite;
          const lc = typeof l.confiance === 'number' ? ` (${l.confiance}/100)` : '';
          writeWrapped(`→ ${ent}${lc} — ${l.phrase}`, { size: 9, indent: 24, color: [30, 64, 175] });
          if (l.preuve) writeWrapped(`« ${l.preuve} »`, { size: 8, indent: 36, color: [100, 100, 100] });
          if (Array.isArray(l.sources)) {
            l.sources.filter((s: string) => /^https?:\/\//.test(s)).forEach((s: string, k: number) => {
              writeWrapped(`source ${k + 1} : ${s}`, { size: 8, indent: 36, color: [37, 99, 235] });
            });
          }
        });
        if (!liens.length && a.lien_ansut_mtnd) {
          writeWrapped(`→ ${a.lien_ansut_mtnd}`, { size: 9, indent: 24, color: [30, 64, 175] });
        }
      });
    }
    y += 6;
  });

  // Footer on each page
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(`ANSUT RADAR — page ${i}/${pageCount}`, margin, pageHeight - 20);
    doc.text(new Date().toLocaleString('fr-FR'), pageWidth - margin, pageHeight - 20, { align: 'right' });
  }

  doc.save(`briefing-titrologie-${new Date().toISOString().slice(0, 10)}.pdf`);
}
