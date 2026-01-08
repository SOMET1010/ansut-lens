import React from 'react';
import SlideLayout from '../SlideLayout';
import { BarChart3, TrendingUp, AlertTriangle, Activity } from 'lucide-react';

interface DashboardSlideProps {
  slideNumber: number;
  totalSlides: number;
}

const DashboardSlide: React.FC<DashboardSlideProps> = ({ slideNumber, totalSlides }) => {
  return (
    <SlideLayout slideNumber={slideNumber} totalSlides={totalSlides} title="Tableau de Bord">
      <div className="h-full grid grid-cols-2 gap-8">
        {/* Left - Description */}
        <div className="flex flex-col justify-center space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Vue d'ensemble stratégique
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Le tableau de bord offre une vision synthétique de l'ensemble des indicateurs 
              de veille, permettant aux décideurs d'identifier rapidement les points d'attention.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4 p-3 bg-blue-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Score SPDI</h4>
                <p className="text-sm text-gray-600">Score de Présence Digitale Institutionnelle</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-3 bg-green-50 rounded-lg">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Tendances</h4>
                <p className="text-sm text-gray-600">Évolution des métriques sur 30 jours</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-3 bg-orange-50 rounded-lg">
              <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Alertes actives</h4>
                <p className="text-sm text-gray-600">Notifications critiques en temps réel</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Visual */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-6 shadow-lg">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white mb-3">
                <span className="text-3xl font-bold">72</span>
              </div>
              <p className="text-gray-600 font-medium">Score SPDI Global</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                <Activity className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">156</p>
                <p className="text-xs text-gray-500">Actualités</p>
              </div>
              <div className="bg-white rounded-lg p-4 text-center shadow-sm">
                <AlertTriangle className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">8</p>
                <p className="text-xs text-gray-500">Alertes</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
};

export default DashboardSlide;
