import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Download, ArrowLeft } from 'lucide-react';
import { usePDF } from 'react-to-pdf';
import { useNavigate } from 'react-router-dom';
import { TechDocPDFLayout } from '@/components/documentation/TechDocPDFLayout';

export default function CredibilitePDFPage() {
  const navigate = useNavigate();
  const { toPDF, targetRef } = usePDF({
    filename: 'ANSUT-RADAR-Credibilite-Sources.pdf',
    page: { orientation: 'portrait', format: 'A4' },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Crédibilité des Sources</h1>
            <p className="text-muted-foreground text-sm">Fiche explicative pour l'équipe Communication</p>
          </div>
        </div>
        <Button onClick={() => toPDF()}>
          <Download className="h-4 w-4 mr-2" />
          Télécharger PDF
        </Button>
      </div>

      {/* PDF content */}
      <div className="flex justify-center overflow-auto">
        <TechDocPDFLayout ref={targetRef}>
          <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', color: '#1a1a1a' }}>
            {/* Title */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}>
                🔍 Comment ANSUT RADAR mesure la fiabilité d'une source ?
              </h2>
              <p style={{ fontSize: '13px', color: '#64748b' }}>
                Fiche synthétique — Équipe Communication
              </p>
            </div>

            {/* Intro */}
            <p style={{ fontSize: '14px', lineHeight: '1.7', marginBottom: '24px', color: '#334155' }}>
              Chaque source média surveillée par la plateforme se voit attribuer automatiquement
              une <strong>note de crédibilité sur 100</strong>. Cette note est recalculée tous les
              <strong> 30 jours</strong> pour refléter l'évolution de la qualité des contenus.
            </p>

            {/* 3 criteria */}
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', color: '#0f172a' }}>
              Les 3 critères de calcul
            </h3>

            {/* Criterion 1 */}
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '20px' }}>🔗</span>
                <strong style={{ fontSize: '15px', color: '#166534' }}>1. Liens vérifiables — 40 % de la note</strong>
              </div>
              <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#334155', margin: 0 }}>
                On vérifie si chaque article publié par la source contient un lien (URL) fonctionnel.
                Une source qui fournit des preuves vérifiables est plus crédible qu'une source sans liens.
              </p>
            </div>

            {/* Criterion 2 */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '16px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '20px' }}>🎯</span>
                <strong style={{ fontSize: '15px', color: '#1e40af' }}>2. Pertinence pour l'ANSUT — 30 % de la note</strong>
              </div>
              <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#334155', margin: 0 }}>
                On mesure si les articles produits par la source sont importants et utiles pour les
                missions de l'ANSUT. Plus le contenu est pertinent, plus la note est élevée.
              </p>
            </div>

            {/* Criterion 3 */}
            <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '20px' }}>💬</span>
                <strong style={{ fontSize: '15px', color: '#854d0e' }}>3. Tonalité générale — 30 % de la note</strong>
              </div>
              <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#334155', margin: 0 }}>
                L'IA analyse le ton de chaque article (positif, neutre ou négatif). Une couverture
                équilibrée ou positive contribue à un meilleur score de crédibilité.
              </p>
            </div>

            {/* Visual formula */}
            <div style={{ background: '#f8fafc', border: '2px solid #e2e8f0', borderRadius: '8px', padding: '20px', marginBottom: '24px', textAlign: 'center' }}>
              <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: 'bold', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                Formule simplifiée
              </p>
              <p style={{ fontSize: '16px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                Score = (Liens valides × 40%) + (Pertinence × 30%) + (Tonalité × 30%)
              </p>
            </div>

            {/* Interpretation */}
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '12px', color: '#0f172a' }}>
              Comment lire le score ?
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', marginBottom: '24px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: '600' }}>Score</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: '600' }}>Niveau</th>
                  <th style={{ textAlign: 'left', padding: '8px 12px', color: '#64748b', fontWeight: '600' }}>Interprétation</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 10px', borderRadius: '12px', fontWeight: 'bold' }}>70 – 100</span>
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: '600', color: '#166534' }}>Fiable</td>
                  <td style={{ padding: '8px 12px', color: '#334155' }}>Source de confiance, contenu de qualité vérifié</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ background: '#fef9c3', color: '#854d0e', padding: '2px 10px', borderRadius: '12px', fontWeight: 'bold' }}>40 – 69</span>
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: '600', color: '#854d0e' }}>Modérée</td>
                  <td style={{ padding: '8px 12px', color: '#334155' }}>À surveiller, certains contenus manquent de sources</td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ background: '#fee2e2', color: '#991b1b', padding: '2px 10px', borderRadius: '12px', fontWeight: 'bold' }}>0 – 39</span>
                  </td>
                  <td style={{ padding: '8px 12px', fontWeight: '600', color: '#991b1b' }}>Faible</td>
                  <td style={{ padding: '8px 12px', color: '#334155' }}>Peu fiable, contenus rarement sourcés ou hors sujet</td>
                </tr>
              </tbody>
            </table>

            {/* Key takeaway */}
            <div style={{ background: '#f0f9ff', border: '1px solid #7dd3fc', borderRadius: '8px', padding: '16px' }}>
              <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#0369a1', marginBottom: '6px' }}>
                💡 En résumé
              </p>
              <p style={{ fontSize: '13px', lineHeight: '1.6', color: '#334155', margin: 0 }}>
                Plus une source publie des articles <strong>sourcés</strong>, <strong>pertinents pour l'ANSUT</strong> et
                de <strong>tonalité équilibrée</strong>, plus son score de crédibilité est élevé.
                Ce classement permet à l'équipe de veille de prioriser les sources les plus fiables
                et d'identifier celles qui nécessitent une vérification supplémentaire.
              </p>
            </div>
          </div>
        </TechDocPDFLayout>
      </div>
    </div>
  );
}
