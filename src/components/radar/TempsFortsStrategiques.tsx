import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Settings2, Zap } from 'lucide-react';
import { format, parseISO, isWithinInterval, differenceInCalendarDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { useEvenementsStrategiques } from '@/hooks/useEvenementsStrategiques';
import { useUserPermissions } from '@/hooks/useUserPermissions';

/** Un temps fort n'apparaît « à venir » que dans cet horizon (jours). */
const HORIZON_A_VENIR_JOURS = 30;

type StatutTempsFort = 'en-cours' | 'a-venir';

/**
 * Bandeau contextuel « Temps forts » de l'accueil.
 *
 * Les événements stratégiques (salons, sommets, temps forts sectoriels) sont
 * configurés dans l'Administration, mais leur VALEUR pour la DIRCOM est de
 * savoir, chaque matin, ce qui se joue maintenant ou très bientôt : c'est le
 * contexte qui explique pourquoi la veille s'intensifie. Ce composant n'est
 * qu'une VUE en lecture seule de cette donnée réelle — la configuration reste
 * dans l'Administration (« la pipeline décide, les écrans présentent »).
 *
 * Règle de crédibilité : uniquement des faits (dates, lieu, statut réel). Si
 * aucun temps fort n'est en cours ni imminent, on n'affiche rien — le silence
 * est préférable à un encart vide qui simulerait une actualité.
 */
export function TempsFortsStrategiques() {
  const { data: evenements } = useEvenementsStrategiques();
  const { hasPermission } = useUserPermissions();

  const pertinents = useMemo(() => {
    const maintenant = new Date();
    return (evenements ?? [])
      .map((evt) => {
        const debut = parseISO(evt.date_debut);
        const fin = parseISO(evt.date_fin);
        let statut: StatutTempsFort | null = null;
        if (isWithinInterval(maintenant, { start: debut, end: fin })) {
          statut = 'en-cours';
        } else if (debut > maintenant && differenceInCalendarDays(debut, maintenant) <= HORIZON_A_VENIR_JOURS) {
          statut = 'a-venir';
        }
        return statut ? { evt, statut, debut, fin } : null;
      })
      .filter((x): x is { evt: (typeof evenements)[number]; statut: StatutTempsFort; debut: Date; fin: Date } => x !== null)
      // En cours d'abord, puis par date de début croissante.
      .sort((a, b) => {
        if (a.statut !== b.statut) return a.statut === 'en-cours' ? -1 : 1;
        return a.debut.getTime() - b.debut.getTime();
      });
  }, [evenements]);

  // Silence autorisé : rien à contextualiser aujourd'hui.
  if (pertinents.length === 0) return null;

  return (
    <section aria-labelledby="temps-forts-titre" className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2
            id="temps-forts-titre"
            className="flex items-center gap-2 text-base font-semibold text-foreground"
          >
            <CalendarDays className="h-4 w-4 text-primary" aria-hidden />
            Temps forts
          </h2>
          <p className="text-xs text-muted-foreground">
            Les rendez-vous sectoriels en cours ou imminents — le contexte de la veille du jour.
          </p>
        </div>
        {hasPermission('manage_keywords') && (
          <Link
            to="/admin/evenements"
            className="flex shrink-0 items-center gap-1 rounded-sm text-xs text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Settings2 className="h-3.5 w-3.5" aria-hidden />
            Gérer
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pertinents.map(({ evt, statut, debut, fin }) => (
          <div
            key={evt.id}
            className="flex min-w-0 flex-col gap-2 rounded-xl border bg-card p-3.5"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="min-w-0 truncate text-sm font-medium">{evt.nom}</span>
              {statut === 'en-cours' ? (
                <Badge className="shrink-0 border-green-500/30 bg-green-500/15 text-green-500">
                  <Zap className="mr-1 h-3 w-3" aria-hidden />
                  En cours
                </Badge>
              ) : (
                <Badge variant="secondary" className="shrink-0">À venir</Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" aria-hidden />
                {format(debut, 'dd MMM', { locale: fr })} → {format(fin, 'dd MMM yyyy', { locale: fr })}
              </span>
              {evt.lieu && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" aria-hidden />
                  {evt.lieu}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
