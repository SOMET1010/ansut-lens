import React from 'react';
import SlideLayout from '../SlideLayout';
import { FolderOpen, FileText, Lock, Users } from 'lucide-react';

interface DossiersSlideProps {
  slideNumber: number;
  totalSlides: number;
}

const DossiersSlide: React.FC<DossiersSlideProps> = ({ slideNumber, totalSlides }) => {
  return (
    <SlideLayout slideNumber={slideNumber} totalSlides={totalSlides} title="Dossiers Stratégiques">
      <div className="h-full grid grid-cols-2 gap-8">
        {/* Left - Description */}
        <div className="flex flex-col justify-center space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Centre de documentation interne
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Rédigez et partagez des notes d'analyse, fiches de synthèse et 
              dossiers stratégiques avec votre équipe.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Éditeur Markdown</p>
                <p className="text-sm text-gray-500">Mise en forme riche et intuitive</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Catégorisation</p>
                <p className="text-sm text-gray-500">Organisation par thématiques</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Lock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Contrôle d'accès</p>
                <p className="text-sm text-gray-500">Brouillon, interne, publié</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Mock UI */}
        <div className="flex items-center justify-center">
          <div className="w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-indigo-600" />
                <span className="font-medium text-gray-900">Mes dossiers</span>
              </div>
              <span className="text-sm text-gray-500">3 dossiers</span>
            </div>
            <div className="p-4 space-y-3">
              {[
                { title: 'Analyse concurrentielle Q4 2024', category: 'Stratégie', status: 'publié', color: 'bg-green-100 text-green-700' },
                { title: 'Note sur la régulation 5G', category: 'Régulation', status: 'interne', color: 'bg-blue-100 text-blue-700' },
                { title: 'Veille médiatique - Décembre', category: 'Veille', status: 'brouillon', color: 'bg-gray-100 text-gray-600' },
              ].map((doc, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{doc.title}</p>
                      <p className="text-xs text-gray-500">{doc.category}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${doc.color}`}>
                    {doc.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
};

export default DossiersSlide;
