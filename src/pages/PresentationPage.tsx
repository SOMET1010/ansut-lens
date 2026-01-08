import React, { useRef, useState } from 'react';
import { usePDF } from 'react-to-pdf';
import { Button } from '@/components/ui/button';
import { Download, ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';
import {
  CoverSlide,
  ObjectivesSlide,
  DashboardSlide,
  ActualitesSlide,
  FluxSlide,
  ActeursSlide,
  DossiersSlide,
  AssistantSlide,
  AlertesSlide,
  ArchitectureSlide,
  ContactSlide,
} from '@/components/presentation/slides';

const TOTAL_SLIDES = 11;

const PresentationPage: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { toPDF, targetRef } = usePDF({
    filename: `ANSUT-RADAR-Presentation-${new Date().toISOString().split('T')[0]}.pdf`,
    page: {
      format: [297, 167], // A4 landscape in mm (roughly 16:9)
      orientation: 'landscape',
    },
  });

  const goToSlide = (slide: number) => {
    if (slide >= 1 && slide <= TOTAL_SLIDES) {
      setCurrentSlide(slide);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const renderSlide = (slideNumber: number) => {
    switch (slideNumber) {
      case 1:
        return <CoverSlide />;
      case 2:
        return <ObjectivesSlide slideNumber={2} totalSlides={TOTAL_SLIDES} />;
      case 3:
        return <DashboardSlide slideNumber={3} totalSlides={TOTAL_SLIDES} />;
      case 4:
        return <ActualitesSlide slideNumber={4} totalSlides={TOTAL_SLIDES} />;
      case 5:
        return <FluxSlide slideNumber={5} totalSlides={TOTAL_SLIDES} />;
      case 6:
        return <ActeursSlide slideNumber={6} totalSlides={TOTAL_SLIDES} />;
      case 7:
        return <DossiersSlide slideNumber={7} totalSlides={TOTAL_SLIDES} />;
      case 8:
        return <AssistantSlide slideNumber={8} totalSlides={TOTAL_SLIDES} />;
      case 9:
        return <AlertesSlide slideNumber={9} totalSlides={TOTAL_SLIDES} />;
      case 10:
        return <ArchitectureSlide slideNumber={10} totalSlides={TOTAL_SLIDES} />;
      case 11:
        return <ContactSlide />;
      default:
        return null;
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-900 flex flex-col">
      {/* Toolbar */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-white font-semibold">Présentation ANSUT RADAR</h1>
          <span className="text-gray-400 text-sm">
            Slide {currentSlide} / {TOTAL_SLIDES}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleFullscreen}
            className="bg-gray-700 border-gray-600 text-white hover:bg-gray-600"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4 mr-2" />
            ) : (
              <Maximize2 className="w-4 h-4 mr-2" />
            )}
            {isFullscreen ? 'Quitter' : 'Plein écran'}
          </Button>
          
          <Button
            onClick={() => toPDF()}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Télécharger PDF
          </Button>
        </div>
      </div>

      {/* Slide viewer */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
        <div className="relative">
          {/* Current slide preview */}
          <div className="shadow-2xl rounded-lg overflow-hidden">
            {renderSlide(currentSlide)}
          </div>

          {/* Navigation arrows */}
          <button
            onClick={() => goToSlide(currentSlide - 1)}
            disabled={currentSlide === 1}
            className="absolute left-[-60px] top-1/2 -translate-y-1/2 w-12 h-12 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-full flex items-center justify-center text-white transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <button
            onClick={() => goToSlide(currentSlide + 1)}
            disabled={currentSlide === TOTAL_SLIDES}
            className="absolute right-[-60px] top-1/2 -translate-y-1/2 w-12 h-12 bg-gray-700 hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-full flex items-center justify-center text-white transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Slide thumbnails */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex items-center justify-center gap-2 overflow-x-auto">
          {Array.from({ length: TOTAL_SLIDES }, (_, i) => i + 1).map((num) => (
            <button
              key={num}
              onClick={() => goToSlide(num)}
              className={`w-16 h-10 rounded border-2 flex items-center justify-center text-xs font-medium transition-all ${
                currentSlide === num
                  ? 'border-blue-500 bg-blue-500/20 text-blue-400'
                  : 'border-gray-600 bg-gray-700 text-gray-400 hover:border-gray-500'
              }`}
            >
              {num}
            </button>
          ))}
        </div>
      </div>

      {/* Hidden container for PDF generation - contains all slides */}
      <div className="fixed left-[-9999px] top-0">
        <div ref={targetRef}>
          {Array.from({ length: TOTAL_SLIDES }, (_, i) => i + 1).map((num) => (
            <div key={num}>{renderSlide(num)}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PresentationPage;
