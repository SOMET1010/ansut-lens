import React from 'react';
import SlideLayout from '../SlideLayout';
import { Newspaper, Sparkles, Tag, TrendingUp } from 'lucide-react';

interface ActualitesSlideProps {
  slideNumber: number;
  totalSlides: number;
}

const ActualitesSlide: React.FC<ActualitesSlideProps> = ({ slideNumber, totalSlides }) => {
  return (
    <SlideLayout slideNumber={slideNumber} totalSlides={totalSlides} title="Fil d'Actualités">
      <div className="h-full grid grid-cols-2 gap-8">
        {/* Left - Features */}
        <div className="flex flex-col justify-center space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Actualités enrichies par l'IA
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Collecte automatique et analyse intelligente des actualités 
              pertinentes pour le secteur des télécommunications en Côte d'Ivoire.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
              <Sparkles className="w-6 h-6 text-purple-500" />
              <div>
                <p className="font-medium text-gray-900">Analyse IA automatique</p>
                <p className="text-sm text-gray-500">Résumé et contexte générés par Gemini</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
              <Tag className="w-6 h-6 text-blue-500" />
              <div>
                <p className="font-medium text-gray-900">Catégorisation intelligente</p>
                <p className="text-sm text-gray-500">Tags et thématiques automatiques</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-500" />
              <div>
                <p className="font-medium text-gray-900">Score d'importance</p>
                <p className="text-sm text-gray-500">Priorisation des contenus critiques</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Mock UI */}
        <div className="flex items-center justify-center">
          <div className="w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-900">Actualités récentes</span>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {[
                { title: 'Nouveau décret sur la fibre optique', importance: 'haute', sentiment: 'positif' },
                { title: 'Orange CI annonce ses résultats Q3', importance: 'moyenne', sentiment: 'neutre' },
                { title: 'Investissement 5G au Sénégal', importance: 'moyenne', sentiment: 'positif' },
              ].map((item, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <p className="font-medium text-gray-900 text-sm">{item.title}</p>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      item.importance === 'haute' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {item.importance}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`w-2 h-2 rounded-full ${
                      item.sentiment === 'positif' ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                    <span className="text-xs text-gray-500">Sentiment {item.sentiment}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
};

export default ActualitesSlide;
