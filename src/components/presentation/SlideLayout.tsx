import React from 'react';
import logoAnsut from '@/assets/logo-ansut.jpg';

interface SlideLayoutProps {
  children: React.ReactNode;
  slideNumber: number;
  totalSlides: number;
  title?: string;
  showHeader?: boolean;
}

const SlideLayout: React.FC<SlideLayoutProps> = ({
  children,
  slideNumber,
  totalSlides,
  title,
  showHeader = true,
}) => {
  return (
    <div className="w-[1120px] h-[630px] bg-white relative flex flex-col overflow-hidden print:break-after-page">
      {/* Header */}
      {showHeader && (
        <div className="h-16 px-8 flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-[#1a365d] to-[#2c5282]">
          <div className="flex items-center gap-4">
            <img src={logoAnsut} alt="ANSUT" className="h-10 w-auto rounded" />
            <span className="text-white font-semibold text-lg">ANSUT RADAR</span>
          </div>
          {title && (
            <h2 className="text-white font-medium text-xl">{title}</h2>
          )}
        </div>
      )}

      {/* Content */}
      <div className={`flex-1 p-8 ${!showHeader ? 'pt-0' : ''}`}>
        {children}
      </div>

      {/* Footer */}
      <div className="h-10 px-8 flex items-center justify-between border-t border-gray-200 bg-gray-50 text-sm text-gray-600">
        <span>Plateforme de Veille Stratégique - ANSUT</span>
        <span>{slideNumber} / {totalSlides}</span>
      </div>
    </div>
  );
};

export default SlideLayout;
