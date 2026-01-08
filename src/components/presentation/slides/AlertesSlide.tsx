import React from 'react';
import SlideLayout from '../SlideLayout';
import { Bell, AlertTriangle, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface AlertesSlideProps {
  slideNumber: number;
  totalSlides: number;
}

const AlertesSlide: React.FC<AlertesSlideProps> = ({ slideNumber, totalSlides }) => {
  return (
    <SlideLayout slideNumber={slideNumber} totalSlides={totalSlides} title="Centre d'Alertes">
      <div className="h-full grid grid-cols-2 gap-8">
        {/* Left - Description */}
        <div className="flex flex-col justify-center space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Notifications en temps réel
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Ne manquez jamais une information critique grâce au système 
              d'alertes multi-canal : push, email et interface.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Alertes critiques</p>
                <p className="text-sm text-gray-500">Événements nécessitant une action immédiate</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Alertes d'attention</p>
                <p className="text-sm text-gray-500">Informations importantes à surveiller</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Bell className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">Notifications standards</p>
                <p className="text-sm text-gray-500">Mises à jour et rappels réguliers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right - Alerts list */}
        <div className="flex items-center justify-center">
          <div className="w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-900">Alertes récentes</span>
              </div>
              <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
                3 non lues
              </span>
            </div>
            <div className="divide-y divide-gray-100">
              {[
                { 
                  icon: AlertTriangle, 
                  iconBg: 'bg-red-100', 
                  iconColor: 'text-red-600',
                  title: 'Mention critique détectée', 
                  desc: 'Article négatif sur ANSUT publié', 
                  time: 'Il y a 5 min',
                  unread: true
                },
                { 
                  icon: AlertCircle, 
                  iconBg: 'bg-orange-100', 
                  iconColor: 'text-orange-600',
                  title: 'Nouveau décret publié', 
                  desc: 'Régulation des tarifs télécom', 
                  time: 'Il y a 2h',
                  unread: true
                },
                { 
                  icon: CheckCircle, 
                  iconBg: 'bg-green-100', 
                  iconColor: 'text-green-600',
                  title: 'Collecte terminée', 
                  desc: '45 nouvelles actualités', 
                  time: 'Il y a 6h',
                  unread: false
                },
              ].map((alert, idx) => (
                <div key={idx} className={`p-4 flex items-start gap-3 ${alert.unread ? 'bg-blue-50/50' : ''}`}>
                  <div className={`w-10 h-10 ${alert.iconBg} rounded-full flex items-center justify-center flex-shrink-0`}>
                    <alert.icon className={`w-5 h-5 ${alert.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm">{alert.title}</p>
                    <p className="text-xs text-gray-500 truncate">{alert.desc}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
                    <Clock className="w-3 h-3" />
                    {alert.time}
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

export default AlertesSlide;
