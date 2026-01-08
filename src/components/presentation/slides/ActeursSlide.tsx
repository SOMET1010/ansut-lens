import React from 'react';
import SlideLayout from '../SlideLayout';
import { Users, Target, TrendingUp, AlertCircle } from 'lucide-react';

interface ActeursSlideProps {
  slideNumber: number;
  totalSlides: number;
}

const ActeursSlide: React.FC<ActeursSlideProps> = ({ slideNumber, totalSlides }) => {
  return (
    <SlideLayout slideNumber={slideNumber} totalSlides={totalSlides} title="Cartographie des Acteurs Clés">
      <div className="h-full grid grid-cols-2 gap-8">
        {/* Left - Description */}
        <div className="flex flex-col justify-center space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Surveillance des personnalités influentes
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Identifiez et suivez les acteurs clés de l'écosystème : ministres, 
              régulateurs, dirigeants, journalistes et influenceurs.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Cercles d'influence</p>
                <p className="text-sm text-gray-500">3 niveaux de proximité stratégique</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Score SPDI individuel</p>
                <p className="text-sm text-gray-500">Mesure de présence digitale</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Alertes personnalisées</p>
                <p className="text-sm text-gray-500">Notifications sur activité inhabituelle</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Visual */}
        <div className="flex items-center justify-center">
          <div className="relative w-80 h-80">
            {/* Cercles concentriques */}
            <div className="absolute inset-0 border-2 border-dashed border-gray-300 rounded-full" />
            <div className="absolute inset-8 border-2 border-dashed border-gray-400 rounded-full" />
            <div className="absolute inset-16 border-2 border-dashed border-gray-500 rounded-full" />
            
            {/* Centre ANSUT */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                ANSUT
              </div>
            </div>

            {/* Acteurs - Cercle 1 */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-medium shadow">
              C1
            </div>
            <div className="absolute bottom-12 left-8 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-medium shadow">
              C1
            </div>
            <div className="absolute bottom-12 right-8 w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-medium shadow">
              C1
            </div>

            {/* Acteurs - Cercle 2 */}
            <div className="absolute top-20 right-2 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-medium shadow">
              C2
            </div>
            <div className="absolute top-20 left-2 w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-xs font-medium shadow">
              C2
            </div>

            {/* Labels */}
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-center">
              <p className="text-sm font-medium text-gray-700">Cercles d'influence</p>
              <div className="flex items-center justify-center gap-4 mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded-full" /> Cercle 1</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-500 rounded-full" /> Cercle 2</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-500 rounded-full" /> Cercle 3</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
};

export default ActeursSlide;
