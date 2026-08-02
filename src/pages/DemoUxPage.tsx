import { AlertTriangle, ArrowRight, Newspaper, TrendingUp, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChiffreCle,
  PageContainer,
  PageHeader,
  ProchaineAction,
  SectionRepliable,
  TermeMetier,
} from '@/components/common';
import { NAV_SECTIONS } from '@/config/navigation';
import { GROUPES_REGLAGES, NB_ENTREES_REGLAGES } from '@/config/reglages';
import { GLOSSAIRE } from '@/config/glossaire';

/**
 * Page de recette visuelle des composants de la refonte.
 *
 * L'application requiert une session authentifiee pour tous ses ecrans, ce qui
 * empeche de verifier le rendu des composants sans identifiants. Cette page,
 * volontairement accessible sans connexion et sans appel a la base, affiche les
 * briques du nouveau systeme avec des donnees fictives.
 *
 * Elle sert de support de recette et de reference pour l'equipe. Elle peut etre
 * supprimee, avec sa route dans `App.tsx`, une fois la refonte validee.
 */
export default function DemoUxPage() {
  return (
    <PageContainer>
      <div className="space-y-8 py-6">
        <PageHeader
          titre="Recette visuelle de la refonte"
          description="Cette page presente les composants du nouveau systeme avec des donnees fictives. Elle n'affiche aucune donnee reelle."
          icon={TrendingUp}
          actions={
            <Badge variant="secondary" className="font-normal">
              Page de recette
            </Badge>
          }
        />

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Chiffres cles interpretes</h2>
          <p className="text-sm text-muted-foreground">
            Les indicateurs affichaient un nombre et un pourcentage de variation, sans dire si la
            situation etait normale. Chaque chiffre porte desormais une phrase d&rsquo;interpretation.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ChiffreCle
              libelle="Articles collectes"
              valeur={128}
              variation={12}
              lecture="Volume habituel pour un lundi."
              icon={Newspaper}
            />
            <ChiffreCle
              libelle="Signaux critiques"
              valeur={3}
              variation={200}
              lecture="Inhabituel : trois fois la moyenne hebdomadaire."
              alerte
              icon={AlertTriangle}
            />
            <ChiffreCle
              libelle="Acteurs actifs"
              valeur={47}
              variation={-4}
              lecture="Legere baisse, sans signification particuliere."
              icon={Users}
            />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Guidage vers la prochaine action</h2>
          <p className="text-sm text-muted-foreground">
            Aucun ecran n&rsquo;indiquait quoi faire de l&rsquo;information consultee. Ce bloc ferme
            la lecture par une action concrete.
          </p>
          <ProchaineAction
            titre="Traitez les trois signaux critiques du jour"
            raison="Ils depassent le seuil d'alerte et n'ont pas encore ete qualifies."
            actionLabel="Voir les signaux"
            to="/veille"
            ton="urgent"
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Vocabulaire explique</h2>
          <p className="text-sm text-muted-foreground">
            L&rsquo;interface employait des sigles internes sans definition. Survolez les termes
            ci-dessous : <TermeMetier cle="spdi">SPDI</TermeMetier>,{' '}
            <TermeMetier cle="quadrant">quadrant</TermeMetier>,{' '}
            <TermeMetier cle="cercle">cercle</TermeMetier>,{' '}
            <TermeMetier cle="titrologie">titrologie</TermeMetier>,{' '}
            <TermeMetier cle="matinale">matinale</TermeMetier>.
          </p>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">
                Glossaire : {GLOSSAIRE.length} termes definis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {GLOSSAIRE.slice(0, 4).map((entree) => (
                <div key={entree.cle} className="text-sm">
                  <span className="font-medium">{entree.terme}</span>
                  <span className="text-muted-foreground"> — {entree.definition}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Sections repliables plutot que masquees</h2>
          <p className="text-sm text-muted-foreground">
            Vingt-trois blocs etaient purement masques sous le point de rupture mobile. Ils
            deviennent repliables : le contenu reste accessible sur tout ecran.
          </p>
          <SectionRepliable
            titre="Analyse detaillee"
            indication="Repartie par source et par thematique"
            toujoursOuvertDes="lg"
          >
            <p className="text-sm text-muted-foreground">
              Contenu secondaire, replie par defaut sur petit ecran et deploye sur grand ecran.
            </p>
          </SectionRepliable>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">
            Navigation : {NAV_SECTIONS.length} sections formulees en questions
          </h2>
          <p className="text-sm text-muted-foreground">
            Les huit entrees precedentes portaient des noms de code
            (&laquo;&nbsp;Capteurs Strategiques&nbsp;&raquo;, &laquo;&nbsp;Balayage 30 jours&nbsp;&raquo;).
            Chaque section repond desormais a une question.
          </p>
          <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            {NAV_SECTIONS.map((section) => (
              <li
                key={section.id}
                className="flex items-start gap-3 rounded-xl border bg-card p-3"
              >
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <section.icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{section.label}</span>
                  <span className="block text-xs text-muted-foreground">{section.question}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">
            Reglages : {NB_ENTREES_REGLAGES} entrees en {GROUPES_REGLAGES.length} groupes
          </h2>
          <p className="text-sm text-muted-foreground">
            Vingt-cinq cartes etaient alignees dans quatre sections au classement discutable, sans
            recherche possible.
          </p>
          <ul className="space-y-2">
            {GROUPES_REGLAGES.map((groupe) => (
              <li key={groupe.id} className="rounded-xl border bg-card p-3">
                <div className="flex items-start gap-2.5">
                  <groupe.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{groupe.titre}</p>
                    <p className="text-xs text-muted-foreground">{groupe.question}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {groupe.entrees.length} reglage{groupe.entrees.length > 1 ? 's' : ''} :{' '}
                      {groupe.entrees.map((entree) => entree.titre).join(', ')}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Zones tactiles</h2>
          <p className="text-sm text-muted-foreground">
            Les boutons compacts descendaient sous la hauteur minimale recommandee de 44 pixels sur
            mobile, ce qui rendait le pointage imprecis.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button className="min-h-11">
              Action principale
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden />
            </Button>
            <Button variant="outline" className="min-h-11">
              Action secondaire
            </Button>
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
