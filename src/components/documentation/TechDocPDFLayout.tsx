import { forwardRef, ReactNode } from 'react';
import logoAnsut from '@/assets/logo-ansut.jpg';

interface TechDocPDFLayoutProps {
  children: ReactNode;
}

export const TechDocPDFLayout = forwardRef<HTMLDivElement, TechDocPDFLayoutProps>(
  ({ children }, ref) => {
    const currentDate = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    return (
      <div 
        ref={ref}
        className="bg-white text-black"
        style={{ 
          width: '210mm',
          minHeight: '297mm',
          padding: '15mm 20mm',
          fontFamily: 'Arial, Helvetica, sans-serif'
        }}
      >
        {/* En-tête */}
        <header className="flex items-center justify-between border-b-2 border-gray-300 pb-4 mb-6">
          <div className="flex items-center gap-4">
            <img 
              src={logoAnsut} 
              alt="Logo ANSUT" 
              className="h-14 w-auto object-contain"
            />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">ANSUT RADAR</h1>
              <p className="text-sm text-gray-600">Documentation Technique</p>
            </div>
          </div>
          <div className="text-right text-sm text-gray-500">
            <p className="font-semibold text-gray-700">Version 2.1.0</p>
            <p>{currentDate}</p>
          </div>
        </header>

        {/* Contenu */}
        <main className="min-h-[240mm]">
          {children}
        </main>

        {/* Pied de page */}
        <footer className="border-t border-gray-200 pt-4 mt-6 text-center text-xs text-gray-500">
          <p>© {new Date().getFullYear()} ANSUT - Autorité Nationale de Surveillance des Télécommunications</p>
          <p className="mt-1">Document confidentiel - Usage interne uniquement</p>
        </footer>
      </div>
    );
  }
);

TechDocPDFLayout.displayName = 'TechDocPDFLayout';
