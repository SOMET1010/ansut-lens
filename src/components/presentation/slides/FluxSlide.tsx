import React from 'react';
import SlideLayout from '../SlideLayout';
import { Rss, Filter, Bell, Mail } from 'lucide-react';

interface FluxSlideProps {
  slideNumber: number;
  totalSlides: number;
}

const FluxSlide: React.FC<FluxSlideProps> = ({ slideNumber, totalSlides }) => {
  return (
    <SlideLayout slideNumber={slideNumber} totalSlides={totalSlides} title="Flux de Veille Personnalisés">
      <div className="h-full grid grid-cols-2 gap-8">
        {/* Left - Description */}
        <div className="flex flex-col justify-center space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Veille sur mesure
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Créez des flux de veille personnalisés basés sur vos mots-clés, 
              catégories et critères d'importance pour ne rien manquer.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-blue-50 rounded-xl text-center">
              <Filter className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="font-semibold text-gray-900">Filtres avancés</p>
              <p className="text-xs text-gray-500 mt-1">Mots-clés, quadrants, importance</p>
            </div>

            <div className="p-4 bg-green-50 rounded-xl text-center">
              <Bell className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="font-semibold text-gray-900">Alertes push</p>
              <p className="text-xs text-gray-500 mt-1">Notifications instantanées</p>
            </div>

            <div className="p-4 bg-purple-50 rounded-xl text-center">
              <Mail className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="font-semibold text-gray-900">Digest email</p>
              <p className="text-xs text-gray-500 mt-1">Résumé quotidien ou hebdo</p>
            </div>

            <div className="p-4 bg-orange-50 rounded-xl text-center">
              <Rss className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p className="font-semibold text-gray-900">Multi-sources</p>
              <p className="text-xs text-gray-500 mt-1">Presse, réseaux, officiels</p>
            </div>
          </div>
        </div>

        {/* Right - Mock cards */}
        <div className="flex items-center justify-center">
          <div className="space-y-4 w-full max-w-sm">
            {[
              { name: 'Régulation Télécom', keywords: ['ARTCI', 'licence', 'régulation'], count: 24, color: 'border-l-blue-500' },
              { name: 'Concurrents', keywords: ['Orange', 'MTN', 'Moov'], count: 18, color: 'border-l-orange-500' },
              { name: 'Innovation 5G', keywords: ['5G', 'fibre', 'infrastructure'], count: 12, color: 'border-l-green-500' },
            ].map((flux, idx) => (
              <div key={idx} className={`bg-white rounded-lg shadow-md border-l-4 ${flux.color} p-4`}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900">{flux.name}</h4>
                  <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                    {flux.count} articles
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {flux.keywords.map((kw, i) => (
                    <span key={i} className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SlideLayout>
  );
};

export default FluxSlide;
