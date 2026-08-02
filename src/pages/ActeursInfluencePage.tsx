import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { GitCompare, HelpCircle, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import PersonnalitesPage from '@/pages/PersonnalitesPage';
import PresenceDigitalePage from '@/pages/PresenceDigitalePage';
import SpdiReviewPage from '@/pages/SpdiReviewPage';
import { SPDIBenchmarkPanel } from '@/components/spdi';
import { ActeursQuickTour } from '@/components/acteurs/ActeursQuickTour';
import { PageContainer, PageHeader, TermeMetier } from '@/components/common';

/**
 * Onglets de la section Acteurs.
 *
 * Les libelles precedents empruntaient au vocabulaire interne
 * (« Dashboard SPDI », « Revue Stabilite »). Ils sont reformules en francais
 * courant, le sigle restant explique par une infobulle sous l'en-tete.
 */
const ONGLETS = [
  { value: 'cartographie', label: 'Cartographie' },
  { value: 'spdi', label: 'Scores de présence' },
  { value: 'revue', label: 'Revue de stabilité' },
] as const;

type ValeurOnglet = (typeof ONGLETS)[number]['value'];

/**
 * Section Acteurs.
 *
 * L'audit a identifie ici un defaut de previsibilite : l'onglet « Benchmark »
 * etait presente au meme niveau que les trois autres, mais ouvrait un panneau
 * lateral au lieu d'afficher un contenu d'onglet. Le controle ne se
 * selectionnait donc jamais, et l'utilisateur ne pouvait pas anticiper l'effet
 * de son clic. La comparaison devient un bouton d'action distinct, ce qui rend
 * son comportement conforme a son apparence.
 */
export default function ActeursInfluencePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const ongletActif = (searchParams.get('tab') as ValeurOnglet) || 'cartographie';
  const [comparaisonOuverte, setComparaisonOuverte] = useState(false);
  const [visiteOuverte, setVisiteOuverte] = useState(false);

  const changerOnglet = (valeur: string) => {
    setSearchParams({ tab: valeur }, { replace: true });
  };

  return (
    <PageContainer>
      <div className="space-y-5">
        <PageHeader
          titre="Acteurs"
          description="Qui parle et qui compte dans le secteur : cartographie, scores de présence et suivi de stabilité."
          icon={Users}
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                className="min-h-11 sm:min-h-9"
                onClick={() => setComparaisonOuverte(true)}
              >
                <GitCompare className="mr-1.5 h-4 w-4" aria-hidden />
                Comparer des acteurs
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 sm:h-9 sm:w-9"
                onClick={() => setVisiteOuverte(true)}
                aria-label="Comment utiliser cette section"
              >
                <HelpCircle className="h-4 w-4 text-muted-foreground" aria-hidden />
              </Button>
            </>
          }
        >
          <p className="text-xs text-muted-foreground">
            Les scores de présence reposent sur le{' '}
            <TermeMetier cle="spdi">SPDI</TermeMetier>, et les acteurs sont répartis par{' '}
            <TermeMetier cle="cercle">cercle</TermeMetier> de proximité.
          </p>
        </PageHeader>

        <Tabs value={ongletActif} onValueChange={changerOnglet}>
          <TabsList>
            {ONGLETS.map((onglet) => (
              <TabsTrigger key={onglet.value} value={onglet.value}>
                {onglet.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="cartographie" className="mt-5">
            <PersonnalitesPage />
          </TabsContent>

          <TabsContent value="spdi" className="mt-5">
            <PresenceDigitalePage />
          </TabsContent>

          <TabsContent value="revue" className="mt-5">
            <SpdiReviewPage />
          </TabsContent>
        </Tabs>
      </div>

      <SPDIBenchmarkPanel open={comparaisonOuverte} onOpenChange={setComparaisonOuverte} />
      <ActeursQuickTour forceOpen={visiteOuverte} onOpenChange={setVisiteOuverte} />
    </PageContainer>
  );
}
