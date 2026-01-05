import { useState } from 'react';
import { ArrowLeft, Mail, Sparkles, Calendar } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  NewsletterList, 
  NewsletterGenerator, 
  NewsletterPreview,
  NewsletterEditor,
  DestinataireManager,
  NewsletterScheduler
} from '@/components/newsletter';
import { useNewsletter } from '@/hooks/useNewsletters';
import type { Newsletter } from '@/types/newsletter';

type View = 'list' | 'generate' | 'preview' | 'edit';

export default function NewslettersPage() {
  const [view, setView] = useState<View>('list');
  const [selectedNewsletterId, setSelectedNewsletterId] = useState<string | null>(null);
  
  const { data: selectedNewsletter, refetch } = useNewsletter(selectedNewsletterId || undefined);

  const handleSelectNewsletter = (newsletter: Newsletter) => {
    setSelectedNewsletterId(newsletter.id);
    setView('preview');
  };

  const handleGenerated = (newsletter: Newsletter) => {
    setSelectedNewsletterId(newsletter.id);
    setView('preview');
  };

  const handleBack = () => {
    setSelectedNewsletterId(null);
    setView('list');
  };

  const handleRefresh = () => {
    refetch();
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <NavLink to="/admin">
              <ArrowLeft className="h-4 w-4" />
            </NavLink>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="h-6 w-6" />
              Newsletters Intelligentes
            </h1>
            <p className="text-muted-foreground">
              Générez et envoyez des newsletters basées sur la veille
            </p>
          </div>
        </div>

        {view === 'list' && (
          <Button onClick={() => setView('generate')}>
            <Sparkles className="h-4 w-4 mr-2" />
            Nouvelle Newsletter
          </Button>
        )}
      </div>

      {/* Main Content */}
      {view === 'list' && (
        <Tabs defaultValue="newsletters" className="space-y-6">
          <TabsList>
            <TabsTrigger value="newsletters">Newsletters</TabsTrigger>
            <TabsTrigger value="destinataires">Destinataires</TabsTrigger>
            <TabsTrigger value="programmation" className="gap-2">
              <Calendar className="h-4 w-4" />
              Programmation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="newsletters">
            <NewsletterList onSelect={handleSelectNewsletter} />
          </TabsContent>

          <TabsContent value="destinataires">
            <DestinataireManager />
          </TabsContent>

          <TabsContent value="programmation">
            <NewsletterScheduler />
          </TabsContent>
        </Tabs>
      )}

      {view === 'generate' && (
        <div className="max-w-2xl mx-auto">
          <Button variant="ghost" onClick={handleBack} className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Retour
          </Button>
          <NewsletterGenerator onGenerated={handleGenerated} />
        </div>
      )}

      {view === 'preview' && selectedNewsletter && (
        <NewsletterPreview 
          newsletter={selectedNewsletter}
          onBack={handleBack}
          onEdit={() => setView('edit')}
          onRefresh={handleRefresh}
        />
      )}

      {view === 'edit' && selectedNewsletter && (
        <NewsletterEditor 
          newsletter={selectedNewsletter}
          onBack={() => setView('preview')}
          onSaved={() => {
            refetch();
            setView('preview');
          }}
        />
      )}
    </div>
  );
}
