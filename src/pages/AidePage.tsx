import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, HelpCircle, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PageContainer, PageHeader } from '@/components/common';
import { GLOSSAIRE } from '@/config/glossaire';
import { NAV_SECTIONS } from '@/config/navigation';

/**
 * Page d'aide et glossaire.
 *
 * L'audit d'experience a identifie l'opacite du vocabulaire comme l'une des
 * premieres causes de rejet : la plateforme employait une quinzaine de termes
 * metier sans jamais les definir nulle part. Cette page constitue la reference
 * unique, doublee des infobulles contextuelles du composant `TermeMetier`.
 *
 * Elle presente egalement la carte des sections, afin qu'un utilisateur qui se
 * demande « ou est-ce que je trouve ceci ? » obtienne une reponse directe.
 */
export default function AidePage() {
  const [recherche, setRecherche] = useState('');

  const termesFiltres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return GLOSSAIRE;
    return GLOSSAIRE.filter(
      (entree) =>
        entree.terme.toLowerCase().includes(terme) ||
        entree.sigle?.toLowerCase().includes(terme) ||
        entree.definition.toLowerCase().includes(terme),
    );
  }, [recherche]);

  return (
    <PageContainer largeur="lecture">
      <div className="space-y-8">
        <PageHeader
          titre="Aide et glossaire"
          description="Le sens de chaque terme employ\u00e9 dans la plateforme, et o\u00f9 trouver chaque fonction."
          icon={HelpCircle}
        />

        <section aria-labelledby="sections-titre" className="space-y-3">
          <h2 id="sections-titre" className="flex items-center gap-2 text-base font-semibold">
            <ArrowRight className="h-4 w-4 text-primary" aria-hidden />
            O\u00f9 trouver quoi
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {NAV_SECTIONS.map((section) => (
              <Link
                key={section.id}
                to={section.path}
                className="flex min-h-11 items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <section.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{section.label}</span>
                  <span className="block text-xs leading-relaxed text-muted-foreground">
                    {section.question}
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="glossaire-titre" className="space-y-4">
          <div className="space-y-3">
            <h2 id="glossaire-titre" className="flex items-center gap-2 text-base font-semibold">
              <BookOpen className="h-4 w-4 text-primary" aria-hidden />
              Glossaire des termes
            </h2>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden
              />
              <Input
                value={recherche}
                onChange={(event) => setRecherche(event.target.value)}
                placeholder="Rechercher un terme\u2026"
                aria-label="Rechercher un terme dans le glossaire"
                className="min-h-11 pl-9"
              />
            </div>
          </div>

          {termesFiltres.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Aucun terme ne correspond \u00e0 cette recherche.
              </CardContent>
            </Card>
          ) : (
            <dl className="space-y-3">
              {termesFiltres.map((entree) => (
                <div key={entree.cle} className="rounded-xl border bg-card p-4">
                  <dt className="flex flex-wrap items-baseline gap-x-2">
                    <span className="text-sm font-semibold">{entree.terme}</span>
                    {entree.sigle && (
                      <span className="text-xs text-muted-foreground">{entree.sigle}</span>
                    )}
                  </dt>
                  <dd className="mt-1.5 space-y-1.5">
                    <p className="text-sm leading-relaxed text-foreground/90">
                      {entree.definition}
                    </p>
                    {entree.precision && (
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        {entree.precision}
                      </p>
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      </div>
    </PageContainer>
  );
}
