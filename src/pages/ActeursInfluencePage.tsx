import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { HelpCircle, Users } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import PersonnalitesPage from '@/pages/PersonnalitesPage';
import { ActeursQuickTour } from '@/components/acteurs/ActeursQuickTour';
import { VeilleDirigeants } from '@/components/acteurs/VeilleDirigeants';
import { PageContainer, PageHeader, TermeMetier } from '@/components/common';

/**
 * Onglets de la section Acteurs.
 *
 * Les onglets « Présence médiatique » et « Évolution » ont été retirés : ils ne
 * présentaient que le score composite SPDI (0-100) et son historique — une
 * précision interprétée que la Charte de crédibilité proscrit. La valeur réelle
 * (mentions reliées, citations presse, dernière apparition) vit désormais dans
 * les fiches de la Cartographie. Les données SPDI restent en base, dormantes.
 */
const ONGLETS = [
  { value: 'cartographie', label: 'Cartographie' },
  { value: 'dirigeants', label: 'Veille dirigeants' },
] as const;

type ValeurOnglet = (typeof ONGLETS)[number]['value'];

/**
 * Section Acteurs.
 */
export default function ActeursInfluencePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const ongletDemande = searchParams.get('tab') as ValeurOnglet | null;
  // Les anciens liens ?tab=spdi / ?tab=revue retombent sur la cartographie.
  const ongletActif: ValeurOnglet =
    ongletDemande === 'dirigeants' ? 'dirigeants' : 'cartographie';
  const [visiteOuverte, setVisiteOuverte] = useState(false);

  const changerOnglet = (valeur: string) => {
    setSearchParams({ tab: valeur }, { replace: true });
  };

  return (
    <PageContainer>
      <div className="space-y-5">
        <PageHeader
          titre="Acteurs influents"
          description="Qui façonne le débat numérique, et qui se rapproche de l'ANSUT."
          icon={Users}
          actions={
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 sm:h-9 sm:w-9"
              onClick={() => setVisiteOuverte(true)}
              aria-label="Comment utiliser cette section"
            >
              <HelpCircle className="h-4 w-4 text-muted-foreground" aria-hidden />
            </Button>
          }
        >
          <p className="text-xs text-muted-foreground">
            La présence de chaque acteur est décrite par ses mentions réelles dans la
            presse et les réseaux suivis — des faits sourcés, jamais un score. Les
            acteurs sont regroupés par{' '}
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

          <TabsContent value="dirigeants" className="mt-5">
            <VeilleDirigeants />
          </TabsContent>
        </Tabs>
      </div>

      <ActeursQuickTour forceOpen={visiteOuverte} onOpenChange={setVisiteOuverte} />
    </PageContainer>
  );
}
