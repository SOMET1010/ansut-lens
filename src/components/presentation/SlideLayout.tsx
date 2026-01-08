import { ReactNode } from 'react';

interface SlideLayoutProps {
  children: ReactNode;
  slideNumber?: number;
  totalSlides?: number;
}

export function SlideLayout({ children, slideNumber, totalSlides }: SlideLayoutProps) {
  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-bold text-lg">A</span>
          </div>
          <span className="text-white/80 font-medium">ANSUT RADAR</span>
        </div>
        <div className="text-white/40 text-sm">
          Plateforme de Veille Stratégique
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center">
        {children}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-white/40 text-xs">
        <span>© ANSUT 2025 - Confidentiel</span>
        {slideNumber && totalSlides && (
          <span>{slideNumber} / {totalSlides}</span>
        )}
      </div>
    </div>
  );
}
