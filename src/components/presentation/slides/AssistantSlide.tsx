import React from 'react';
import SlideLayout from '../SlideLayout';
import { Bot, MessageSquare, Lightbulb, Database } from 'lucide-react';

interface AssistantSlideProps {
  slideNumber: number;
  totalSlides: number;
}

const AssistantSlide: React.FC<AssistantSlideProps> = ({ slideNumber, totalSlides }) => {
  return (
    <SlideLayout slideNumber={slideNumber} totalSlides={totalSlides} title="Assistant IA Contextuel">
      <div className="h-full grid grid-cols-2 gap-8">
        {/* Left - Description */}
        <div className="flex flex-col justify-center space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Intelligence artificielle au service de l'analyse
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Posez vos questions à l'assistant IA qui a accès à l'ensemble 
              des données de veille pour vous fournir des analyses contextuelles.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border border-gray-200 rounded-xl">
              <Bot className="w-8 h-8 text-purple-600 mb-2" />
              <p className="font-semibold text-gray-900 text-sm">Powered by Gemini</p>
              <p className="text-xs text-gray-500 mt-1">IA de pointe Google</p>
            </div>

            <div className="p-4 border border-gray-200 rounded-xl">
              <Database className="w-8 h-8 text-blue-600 mb-2" />
              <p className="font-semibold text-gray-900 text-sm">Données contextuelles</p>
              <p className="text-xs text-gray-500 mt-1">Accès aux actualités et acteurs</p>
            </div>

            <div className="p-4 border border-gray-200 rounded-xl">
              <MessageSquare className="w-8 h-8 text-green-600 mb-2" />
              <p className="font-semibold text-gray-900 text-sm">Conversations</p>
              <p className="text-xs text-gray-500 mt-1">Historique sauvegardé</p>
            </div>

            <div className="p-4 border border-gray-200 rounded-xl">
              <Lightbulb className="w-8 h-8 text-amber-600 mb-2" />
              <p className="font-semibold text-gray-900 text-sm">Suggestions</p>
              <p className="text-xs text-gray-500 mt-1">Recommandations proactives</p>
            </div>
          </div>
        </div>

        {/* Right - Chat UI */}
        <div className="flex items-center justify-center">
          <div className="w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-4 py-3 flex items-center gap-2">
              <Bot className="w-5 h-5 text-white" />
              <span className="font-medium text-white">Assistant ANSUT</span>
            </div>
            <div className="p-4 space-y-4 bg-gray-50 h-64">
              {/* User message */}
              <div className="flex justify-end">
                <div className="bg-blue-600 text-white px-4 py-2 rounded-2xl rounded-br-md max-w-[80%] text-sm">
                  Quelles sont les dernières actualités sur la 5G en Côte d'Ivoire ?
                </div>
              </div>

              {/* AI response */}
              <div className="flex justify-start">
                <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-bl-md max-w-[85%] text-sm shadow-sm">
                  <p className="text-gray-700">
                    D'après les actualités récentes, voici les points clés sur la 5G :
                  </p>
                  <ul className="mt-2 space-y-1 text-gray-600 text-xs">
                    <li>• L'ARTCI prépare le cadre réglementaire</li>
                    <li>• Tests pilotes prévus en 2025</li>
                    <li>• Orange CI et MTN intéressés</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 bg-white">
              <div className="flex items-center gap-2 bg-gray-100 rounded-full px-4 py-2">
                <span className="text-gray-400 text-sm">Posez votre question...</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
};

export default AssistantSlide;
