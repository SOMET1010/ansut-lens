import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download, Maximize2, Minimize2 } from 'lucide-react';
import { usePDF } from 'react-to-pdf';
import { SlideLayout } from '@/components/presentation/SlideLayout';
import { CoverSlide } from '@/components/presentation/slides/CoverSlide';
import { ObjectivesSlide } from '@/components/presentation/slides/ObjectivesSlide';
import { DashboardSlide } from '@/components/presentation/slides/DashboardSlide';
import { ActualitesSlide } from '@/components/presentation/slides/ActualitesSlide';
import { FluxSlide } from '@/components/presentation/slides/FluxSlide';
import { ActeursSlide } from '@/components/presentation/slides/ActeursSlide';
import { DossiersSlide } from '@/components/presentation/slides/DossiersSlide';
import { NewsletterStudioSlide } from '@/components/presentation/slides/NewsletterStudioSlide';
import { AssistantSlide } from '@/components/presentation/slides/AssistantSlide';
import { AlertesSlide } from '@/components/presentation/slides/AlertesSlide';
import { ArchitectureSlide } from '@/components/presentation/slides/ArchitectureSlide';
import { ContactSlide } from '@/components/presentation/slides/ContactSlide';

const slides = [
  { component: CoverSlide, title: 'Couverture' },
  { component: ObjectivesSlide, title: 'Objectifs' },
  { component: DashboardSlide, title: 'Tableau de Bord' },
  { component: ActualitesSlide, title: 'Actualités' },
  { component: FluxSlide, title: 'Flux de Veille' },
  { component: ActeursSlide, title: 'Acteurs' },
  { component: DossiersSlide, title: 'Studio Publication' },
  { component: NewsletterStudioSlide, title: 'Studio Newsletter' },
  { component: AssistantSlide, title: 'Assistant IA' },
  { component: AlertesSlide, title: 'Alertes' },
  { component: ArchitectureSlide, title: 'Architecture' },
  { component: ContactSlide, title: 'Contact' },
];

export default function PresentationPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { toPDF, targetRef } = usePDF({
    filename: 'ANSUT-RADAR-Presentation.pdf',
    page: { orientation: 'landscape', format: 'A4' }
  });

  const goToSlide = (index: number) => {
    if (index >= 0 && index < slides.length) {
      setCurrentSlide(index);
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

  const CurrentSlideComponent = slides[currentSlide].component;

  return (
    <div className="space-y-6 animate-fade-in" ref={containerRef}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Présentation</h1>
          <p className="text-muted-foreground">Générez et téléchargez la présentation PDF</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 className="h-4 w-4 mr-2" /> : <Maximize2 className="h-4 w-4 mr-2" />}
            {isFullscreen ? 'Quitter' : 'Plein écran'}
          </Button>
          <Button onClick={() => toPDF()}>
            <Download className="h-4 w-4 mr-2" />
            Télécharger PDF
          </Button>
        </div>
      </div>

      {/* Slide Preview */}
      <div className="relative aspect-video w-full max-w-4xl mx-auto rounded-xl overflow-hidden shadow-2xl border border-border">
        <div ref={targetRef}>
          <SlideLayout slideNumber={currentSlide + 1} totalSlides={slides.length}>
            <CurrentSlideComponent />
          </SlideLayout>
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={() => goToSlide(currentSlide - 1)}
          disabled={currentSlide === 0}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white disabled:opacity-30 hover:bg-black/70 transition-colors"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          onClick={() => goToSlide(currentSlide + 1)}
          disabled={currentSlide === slides.length - 1}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white disabled:opacity-30 hover:bg-black/70 transition-colors"
        >
          <ChevronRight className="h-6 w-6" />
        </button>
      </div>

      {/* Thumbnails */}
      <div className="flex gap-2 overflow-x-auto pb-2 max-w-4xl mx-auto">
        {slides.map((slide, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`shrink-0 px-3 py-2 rounded-lg text-sm transition-colors ${
              index === currentSlide
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted hover:bg-muted/80 text-muted-foreground'
            }`}
          >
            {index + 1}. {slide.title}
          </button>
        ))}
      </div>
    </div>
  );
}
