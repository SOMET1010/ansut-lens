import { Mail, Globe, Phone } from 'lucide-react';

export function ContactSlide() {
  return (
    <div className="w-full space-y-8 text-center">
      <h2 className="text-3xl font-bold text-white">Merci de votre attention</h2>
      <div className="space-y-4 max-w-md mx-auto">
        <div className="flex items-center justify-center gap-3 text-white/80">
          <Globe className="w-5 h-5 text-primary" />
          <span>www.ansut.ci</span>
        </div>
        <div className="flex items-center justify-center gap-3 text-white/80">
          <Mail className="w-5 h-5 text-primary" />
          <span>contact@ansut.ci</span>
        </div>
        <div className="flex items-center justify-center gap-3 text-white/80">
          <Phone className="w-5 h-5 text-primary" />
          <span>+225 27 22 XX XX XX</span>
        </div>
      </div>
      <div className="pt-8">
        <p className="text-primary text-xl font-semibold">ANSUT RADAR</p>
        <p className="text-white/60">Votre partenaire de veille stratégique</p>
      </div>
    </div>
  );
}
