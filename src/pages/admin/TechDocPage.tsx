import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileCode, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { usePDF } from 'react-to-pdf';
import { TechDocPDFLayout } from '@/components/documentation/TechDocPDFLayout';
import { GuideViewer } from '@/components/formation/GuideViewer';
import { TECH_DOC_CONTENT } from '@/components/documentation/TechDocContent';

// Table des matières avec IDs correspondant aux ancres générées
const TOC_ITEMS = [
  { id: '1-presentation-generale', label: 'Présentation', num: 1 },
  { id: '2-architecture-technique', label: 'Architecture', num: 2 },
  { id: '3-base-de-donnees', label: 'Base de données', num: 3 },
  { id: '4-edge-functions', label: 'Edge Functions', num: 4 },
  { id: '5-systeme-de-permissions', label: 'Permissions', num: 5 },
  { id: '6-securite-conformite', label: 'Sécurité', num: 6 },
];

// Fonction de scroll fluide vers une section
const scrollToSection = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

export default function TechDocPage() {
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  
  const { toPDF, targetRef } = usePDF({
    filename: `ANSUT-RADAR-Documentation-Technique-${new Date().toISOString().split('T')[0]}.pdf`,
    page: {
      format: 'a4',
      orientation: 'portrait',
    },
  });

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      await toPDF();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <FileCode className="h-6 w-6 text-primary" />
              Documentation Technique
            </h1>
            <p className="text-muted-foreground text-sm">
              Manuel technique complet de la plateforme ANSUT RADAR
            </p>
          </div>
        </div>
        <Button onClick={handleDownload} disabled={isGenerating} className="gap-2">
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Génération...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Télécharger le PDF
            </>
          )}
        </Button>
      </div>

      {/* Table des matières rapide - cliquable */}
      <Card className="p-4 bg-muted/50">
        <h2 className="font-semibold mb-3 text-sm uppercase tracking-wide text-muted-foreground">
          Table des matières
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 text-sm">
          {TOC_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => scrollToSection(item.id)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-primary/10 transition-colors cursor-pointer text-left group"
            >
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                {item.num}
              </span>
              <span className="group-hover:text-primary transition-colors">{item.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Prévisualisation */}
      <Card className="p-0 overflow-hidden">
        <div className="bg-gray-100 dark:bg-gray-800 p-2 border-b flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">Prévisualisation du document</span>
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">Format A4</span>
        </div>
        <div className="max-h-[70vh] overflow-y-auto bg-gray-200 dark:bg-gray-900 p-4">
          <div className="mx-auto shadow-xl">
            <TechDocPDFLayout ref={targetRef}>
              <GuideViewer content={TECH_DOC_CONTENT} />
            </TechDocPDFLayout>
          </div>
        </div>
      </Card>

      {/* Infos complémentaires */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <Card className="p-4">
          <h3 className="font-semibold mb-2">📊 Contenu</h3>
          <ul className="text-muted-foreground space-y-1">
            <li>• 6 sections thématiques</li>
            <li>• 17 tables documentées</li>
            <li>• 17 Edge Functions</li>
            <li>• 17 permissions RBAC</li>
          </ul>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-2">🏗️ Architecture</h3>
          <ul className="text-muted-foreground space-y-1">
            <li>• Diagrammes d'architecture</li>
            <li>• Stack technique complet</li>
            <li>• Intégrations externes</li>
            <li>• Patterns de sécurité</li>
          </ul>
        </Card>
        <Card className="p-4">
          <h3 className="font-semibold mb-2">🔐 Sécurité</h3>
          <ul className="text-muted-foreground space-y-1">
            <li>• Politique RLS complète</li>
            <li>• Matrice rôle/permission</li>
            <li>• Audit et traçabilité</li>
            <li>• Bonnes pratiques</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
