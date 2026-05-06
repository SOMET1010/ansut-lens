import jsPDF from 'jspdf';
import type { MatinaleData } from '@/types/matinale';

const RUBRIQUE_LABELS: Record<string, string> = {
  telecom_numerique: 'Télécom / Numérique',
  economie_finance: 'Économie / Finance',
  gouvernance_regulation: 'Gouvernance / Régulation',
  international: 'International',
};
const PILIER_LABELS: Record<string, string> = {
  connectivite: 'Connectivité & Infrastructures',
  usages_services: 'Usages & Services Numériques',
  regulation_souverainete: 'Régulation & Souveraineté',
  concurrence_marche: 'Concurrence & Marché',
};

const NIVEAU_COLOR: Record<string, [number, number, number]> = {
  ROUGE: [220, 38, 38],
  ORANGE: [217, 119, 6],
  VERT: [5, 150, 105],
  BLEU: [37, 99, 235],
  'ÉLEVÉ': [220, 38, 38],
  MOYEN: [217, 119, 6],
  FAIBLE: [37, 99, 235],
  AUCUN: [120, 120, 120],
};

export function exportMatinalePDF(data: MatinaleData, freshnessHours: number) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 40;
  let y = M;

  const ensure = (h: number) => {
    if (y + h > pageH - M) {
      doc.addPage();
      y = M;
    }
  };

  const text = (
    str: string,
    opts: { size?: number; bold?: boolean; color?: [number, number, number]; indent?: number } = {},
  ) => {
    const { size = 10, bold = false, color = [30, 30, 30], indent = 0 } = opts;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(str || '—', pageW - 2 * M - indent);
    for (const ln of lines) {
      ensure(size + 4);
      doc.text(ln, M + indent, y);
      y += size + 4;
    }
  };

  const niveauChip = (niveau?: string) => {
    if (!niveau) return;
    const c = NIVEAU_COLOR[niveau] || [100, 100, 100];
    doc.setFillColor(c[0], c[1], c[2]);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const w = doc.getTextWidth(niveau) + 10;
    ensure(14);
    doc.roundedRect(M, y - 9, w, 12, 2, 2, 'F');
    doc.text(niveau, M + 5, y);
    y += 8;
  };

  const sectionTitle = (n: number, title: string) => {
    y += 8;
    ensure(28);
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(M, y - 12, pageW - 2 * M, 20, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`${n}. ${title}`, M + 8, y + 2);
    y += 18;
  };

  const bullet = (str: string, color: [number, number, number] = [30, 30, 30]) => {
    text(`•  ${str}`, { size: 10, color, indent: 6 });
  };

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 70, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('La Matinale CODIR — ANSUT', M, 32);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const dateStr = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
  const windowStr = freshnessHours === 24 ? '24 dernières heures'
    : freshnessHours === 48 ? '48 dernières heures' : '7 derniers jours';
  doc.text(`Briefing exécutif · ${dateStr} · Fenêtre : ${windowStr}`, M, 50);
  y = 90;

  // 1. Priorité Exécutive
  const prio = data.priorite_executive;
  if (prio) {
    sectionTitle(1, 'Priorité Exécutive');
    niveauChip(prio.niveau);
    text(prio.titre, { size: 12, bold: true });
    if (prio.impacts?.length) {
      text('Impacts ANSUT', { size: 9, bold: true, color: [100, 100, 100] });
      prio.impacts.forEach((i) => bullet(i));
    }
    if (prio.recommandation?.length) {
      text('Recommandations', { size: 9, bold: true, color: [124, 58, 237] });
      prio.recommandation.forEach((r) => bullet(r, [88, 28, 135]));
    }
  }

  // 2. Synthèse 60s
  if (data.synthese_60s?.length) {
    sectionTitle(2, 'Synthèse 60 secondes');
    data.synthese_60s.forEach((s) => {
      niveauChip(s.niveau);
      text(s.sujet, { size: 10, bold: true });
      text(s.impact_ansut, { size: 9, color: [80, 80, 80], indent: 6 });
    });
  }

  // 3. Veille par pilier
  if (data.veille_par_pilier && Object.keys(data.veille_par_pilier).length) {
    sectionTitle(3, 'Veille par pilier ANSUT');
    Object.entries(data.veille_par_pilier).forEach(([k, items]) => {
      if (!items?.length) return;
      text(PILIER_LABELS[k] || k, { size: 10, bold: true, color: [37, 99, 235] });
      items.forEach((it) => {
        text(`▸ ${it.titre}  [${it.niveau}]`, { size: 10, indent: 6 });
        if (it.lecture_ansut) text(it.lecture_ansut, { size: 9, color: [90, 90, 90], indent: 14 });
        if (it.source) text(it.source, { size: 8, color: [140, 140, 140], indent: 14 });
      });
    });
  }

  // 4. Lecture stratégique
  if (data.lecture_strategique?.length) {
    sectionTitle(4, 'Lecture stratégique');
    data.lecture_strategique.forEach((s) => {
      text(s.sujet, { size: 11, bold: true });
      if (s.opportunites?.length) {
        text('Opportunités', { size: 9, bold: true, color: [5, 150, 105] });
        s.opportunites.forEach((o) => bullet(o, [5, 95, 70]));
      }
      if (s.risques?.length) {
        text('Risques', { size: 9, bold: true, color: [220, 38, 38] });
        s.risques.forEach((r) => bullet(r, [153, 27, 27]));
      }
      if (s.scores) {
        const sc = s.scores;
        text(
          `Scores SU — Accès ${sc.acces}/10 · Usage ${sc.usage}/10 · Gouvernance ${sc.gouvernance}/10 · Souveraineté ${sc.souverainete}/10`,
          { size: 9, color: [60, 60, 60], indent: 6 },
        );
      }
    });
  }

  // 5. Impact projets ANSUT
  if (data.impact_projets_ansut?.length) {
    sectionTitle(5, 'Impact projets ANSUT');
    data.impact_projets_ansut.forEach((p) => {
      niveauChip(p.impact);
      text(p.domaine, { size: 10, bold: true });
      text(p.commentaire, { size: 9, color: [80, 80, 80], indent: 6 });
    });
  }

  // 6. Actions immédiates
  if (data.actions_immediates?.length) {
    sectionTitle(6, 'Actions immédiates');
    data.actions_immediates.forEach((a, i) => {
      text(`${i + 1}. ${a.action}`, { size: 10, bold: true });
      const meta = [a.responsable, a.delai].filter(Boolean).join(' · ');
      if (meta) text(meta, { size: 9, color: [120, 120, 120], indent: 12 });
    });
  }

  // 7. Réputation ANSUT
  const reput = data.reputation_ansut;
  if (reput) {
    sectionTitle(7, 'Réputation ANSUT');
    niveauChip(reput.niveau_risque);
    if (reput.positif?.length) {
      text('Signaux positifs', { size: 9, bold: true, color: [5, 150, 105] });
      reput.positif.forEach((p) => bullet(p, [5, 95, 70]));
    }
    if (reput.negatif?.length) {
      text('Signaux négatifs', { size: 9, bold: true, color: [220, 38, 38] });
      reput.negatif.forEach((n) => bullet(n, [153, 27, 27]));
    }
    if (reput.confusion_role) {
      text(`Confusion de rôle : ${reput.confusion_role}`, { size: 9, color: [217, 119, 6], indent: 6 });
    }
  }

  // 8. Signaux faibles
  if (data.signaux_faibles?.length) {
    sectionTitle(8, 'Signaux faibles');
    data.signaux_faibles.forEach((s) => bullet(s, [37, 99, 235]));
  }

  // 9. Revue de presse
  if (data.revue_de_presse?.length) {
    sectionTitle(9, 'Revue de presse');
    const byRub: Record<string, typeof data.revue_de_presse> = {};
    data.revue_de_presse.forEach((r) => {
      (byRub[r.rubrique] ||= []).push(r);
    });
    Object.entries(byRub).forEach(([rub, items]) => {
      text(RUBRIQUE_LABELS[rub] || rub, { size: 10, bold: true, color: [37, 99, 235] });
      items.forEach((it) => {
        text(`▸ ${it.titre}`, { size: 9, indent: 6 });
        text(`${it.source} · ${it.date}`, { size: 8, color: [140, 140, 140], indent: 14 });
        if (it.url) text(it.url, { size: 7, color: [37, 99, 235], indent: 14 });
      });
    });
  }

  // 10. Activité ANSUT
  if (data.activite_ansut) {
    sectionTitle(10, 'Activité ANSUT');
    text(
      `Publications : ${data.activite_ansut.publications_count} · Visibilité : ${data.activite_ansut.visibilite}`,
      { size: 10 },
    );
  }

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text(
      `ANSUT RADAR · Matinale CODIR · ${i}/${pageCount}`,
      pageW / 2,
      pageH - 15,
      { align: 'center' },
    );
  }

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`matinale-codir-${stamp}.pdf`);
}
