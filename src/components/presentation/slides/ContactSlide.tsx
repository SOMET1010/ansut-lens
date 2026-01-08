import React from 'react';
import logoAnsut from '@/assets/logo-ansut.jpg';
import { Mail, Globe, MapPin, Phone } from 'lucide-react';

const ContactSlide: React.FC = () => {
  return (
    <div className="w-[1120px] h-[630px] bg-gradient-to-br from-[#1a365d] via-[#2c5282] to-[#3182ce] relative flex flex-col items-center justify-center overflow-hidden print:break-after-page">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-32 h-32 border-2 border-white rounded-full" />
        <div className="absolute bottom-20 right-20 w-48 h-48 border border-white rounded-full" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center space-y-8">
        <img src={logoAnsut} alt="ANSUT" className="h-20 w-auto rounded-lg shadow-lg mx-auto" />
        
        <div className="space-y-2">
          <h2 className="text-4xl font-bold text-white">Merci de votre attention</h2>
          <p className="text-xl text-blue-100">ANSUT RADAR - Plateforme de Veille Stratégique</p>
        </div>

        <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto mt-12">
          <div className="flex items-center gap-4 bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Globe className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="text-white/60 text-sm">Site web</p>
              <p className="text-white font-medium">www.ansut.ci</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="text-white/60 text-sm">Email</p>
              <p className="text-white font-medium">contact@ansut.ci</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <Phone className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="text-white/60 text-sm">Téléphone</p>
              <p className="text-white font-medium">+225 27 20 XX XX XX</p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/10 rounded-xl p-4 backdrop-blur-sm">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <MapPin className="w-6 h-6 text-white" />
            </div>
            <div className="text-left">
              <p className="text-white/60 text-sm">Adresse</p>
              <p className="text-white font-medium">Abidjan, Côte d'Ivoire</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="absolute bottom-6 text-white/40 text-sm">
        © {new Date().getFullYear()} ANSUT - Tous droits réservés
      </div>
    </div>
  );
};

export default ContactSlide;
