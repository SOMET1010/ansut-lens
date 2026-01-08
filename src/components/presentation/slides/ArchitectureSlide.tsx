import React from 'react';
import SlideLayout from '../SlideLayout';
import { Database, Cloud, Shield, Cpu, Globe, Lock } from 'lucide-react';

interface ArchitectureSlideProps {
  slideNumber: number;
  totalSlides: number;
}

const ArchitectureSlide: React.FC<ArchitectureSlideProps> = ({ slideNumber, totalSlides }) => {
  return (
    <SlideLayout slideNumber={slideNumber} totalSlides={totalSlides} title="Architecture Technique">
      <div className="h-full grid grid-cols-2 gap-8">
        {/* Left - Tech stack */}
        <div className="flex flex-col justify-center space-y-6">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Stack technologique moderne
            </h3>
            <p className="text-gray-600 leading-relaxed">
              Une architecture cloud-native, sécurisée et évolutive pour 
              supporter la croissance de la plateforme.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">React + TypeScript</p>
                <p className="text-xs text-gray-500">Frontend moderne</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">PostgreSQL</p>
                <p className="text-xs text-gray-500">Base de données</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <Cpu className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Edge Functions</p>
                <p className="text-xs text-gray-500">Logique serveur</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                <Cloud className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Lovable Cloud</p>
                <p className="text-xs text-gray-500">Hébergement</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
            <Shield className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-medium text-green-800 text-sm">Sécurité renforcée</p>
              <p className="text-xs text-green-600">RLS, authentification, audit logs</p>
            </div>
          </div>
        </div>

        {/* Right - Architecture diagram */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-sm space-y-4">
            {/* Users */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <p className="font-semibold text-blue-800 text-center mb-3">Utilisateurs</p>
              <div className="flex justify-center gap-4">
                <div className="text-center">
                  <div className="w-10 h-10 bg-blue-200 rounded-full mx-auto mb-1" />
                  <span className="text-xs text-blue-600">Admin</span>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 bg-blue-200 rounded-full mx-auto mb-1" />
                  <span className="text-xs text-blue-600">User</span>
                </div>
                <div className="text-center">
                  <div className="w-10 h-10 bg-blue-200 rounded-full mx-auto mb-1" />
                  <span className="text-xs text-blue-600">Guest</span>
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="w-0.5 h-6 bg-gray-300" />
            </div>

            {/* Frontend */}
            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
              <div className="flex items-center justify-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-gray-900">Application React</span>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <div className="w-0.5 h-6 bg-gray-300" />
            </div>

            {/* Backend */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-200">
              <p className="font-semibold text-purple-800 text-center mb-3">Backend Cloud</p>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-white rounded-lg p-2 shadow-sm">
                  <Lock className="w-4 h-4 text-purple-600 mx-auto" />
                  <span className="text-xs text-gray-600">Auth</span>
                </div>
                <div className="bg-white rounded-lg p-2 shadow-sm">
                  <Database className="w-4 h-4 text-purple-600 mx-auto" />
                  <span className="text-xs text-gray-600">DB</span>
                </div>
                <div className="bg-white rounded-lg p-2 shadow-sm">
                  <Cpu className="w-4 h-4 text-purple-600 mx-auto" />
                  <span className="text-xs text-gray-600">Functions</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SlideLayout>
  );
};

export default ArchitectureSlide;
