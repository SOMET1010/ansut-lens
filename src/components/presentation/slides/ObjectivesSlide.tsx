import React from 'react';
import SlideLayout from '../SlideLayout';
import { Eye, Activity, Brain, Bell, CheckCircle } from 'lucide-react';

interface ObjectivesSlideProps {
  slideNumber: number;
  totalSlides: number;
}

const ObjectivesSlide: React.FC<ObjectivesSlideProps> = ({ slideNumber, totalSlides }) => {
  const objectives = [
    {
      icon: Eye,
      title: 'Détecter',
      description: 'Identifier les signaux faibles et les tendances émergentes dans l\'écosystème télécom',
      color: 'bg-blue-500',
    },
    {
      icon: Activity,
      title: 'Surveiller',
      description: 'Suivre en temps réel les acteurs clés, médias et réseaux sociaux',
      color: 'bg-green-500',
    },
    {
      icon: Brain,
      title: 'Analyser',
      description: 'Exploiter l\'IA pour enrichir et contextualiser les informations collectées',
      color: 'bg-purple-500',
    },
    {
      icon: Bell,
      title: 'Alerter',
      description: 'Notifier instantanément les décideurs sur les événements critiques',
      color: 'bg-orange-500',
    },
    {
      icon: CheckCircle,
      title: 'Décider',
      description: 'Fournir une base solide pour des prises de décision éclairées',
      color: 'bg-teal-500',
    },
  ];

  return (
    <SlideLayout slideNumber={slideNumber} totalSlides={totalSlides} title="Objectifs de la Plateforme">
      <div className="h-full flex items-center">
        <div className="grid grid-cols-5 gap-4 w-full">
          {objectives.map((obj, index) => (
            <div
              key={index}
              className="flex flex-col items-center text-center p-4 rounded-xl bg-gray-50 border border-gray-200 hover:shadow-md transition-shadow"
            >
              <div className={`w-16 h-16 rounded-full ${obj.color} flex items-center justify-center mb-4`}>
                <obj.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{obj.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{obj.description}</p>
            </div>
          ))}
        </div>
      </div>
    </SlideLayout>
  );
};

export default ObjectivesSlide;
