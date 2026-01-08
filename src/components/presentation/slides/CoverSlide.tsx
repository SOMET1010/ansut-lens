import React from 'react';
import logoAnsut from '@/assets/logo-ansut.jpg';
import { Radar, Shield, Eye } from 'lucide-react';

const CoverSlide: React.FC = () => {
  return (
    <div className="w-[1120px] h-[630px] bg-gradient-to-br from-[#1a365d] via-[#2c5282] to-[#3182ce] relative flex flex-col items-center justify-center overflow-hidden print:break-after-page">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-20 w-40 h-40 border-2 border-white rounded-full" />
        <div className="absolute top-10 right-40 w-60 h-60 border border-white rounded-full" />
        <div className="absolute bottom-20 left-1/3 w-32 h-32 border-2 border-white rounded-full" />
        <div className="absolute bottom-40 right-20 w-48 h-48 border border-white rounded-full" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center space-y-8">
        <div className="flex items-center justify-center gap-6 mb-4">
          <img src={logoAnsut} alt="ANSUT" className="h-24 w-auto rounded-lg shadow-lg" />
        </div>
        
        <div className="space-y-4">
          <h1 className="text-5xl font-bold text-white tracking-tight">
            ANSUT RADAR
          </h1>
          <p className="text-2xl text-blue-100 font-light">
            Plateforme de Veille Stratégique
          </p>
        </div>

        <div className="flex items-center justify-center gap-8 mt-12">
          <div className="flex flex-col items-center gap-2 text-white/80">
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
              <Eye className="w-7 h-7" />
            </div>
            <span className="text-sm">Détecter</span>
          </div>
          <div className="flex flex-col items-center gap-2 text-white/80">
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
              <Radar className="w-7 h-7" />
            </div>
            <span className="text-sm">Analyser</span>
          </div>
          <div className="flex flex-col items-center gap-2 text-white/80">
            <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
              <Shield className="w-7 h-7" />
            </div>
            <span className="text-sm">Décider</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-white/60 text-sm">
        Agence Nationale du Service Universel des Télécommunications • {new Date().getFullYear()}
      </div>
    </div>
  );
};

export default CoverSlide;
