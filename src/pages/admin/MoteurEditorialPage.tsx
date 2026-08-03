import { useState } from 'react';
import { Cog, Download, Loader2, PlayCircle, RefreshCw, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { PageContainer, PageHeader } from '@/components/common';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

/**
 * Moteur éditorial — panneau de contrôle du pipeline (admin).
 *
 * Permet de piloter les étages du pipeline sans passer par la console :
 *  1. Collecter les publications des comptes surveillés (étage 1).
 *  2. Diagnostiquer la qualification (dry-run, aucune écriture).
 *  3. Lancer le backfill de la qualification (étage 2, écrit editorial_qualifications).
 *
 * Chaque action affiche le résultat brut renvoyé par la fonction — aucun chiffre
 * n'est fabriqué ici, on montre ce que le moteur répond.
 */

type Etat = { enCours: boolean; resultat?: unknown; erreur?: string };

function Bloc({
  titre, description, bouton, icon: Icon, etat, onClick, variant = 'default',
}: {
  titre: string;
  description: string;
  bouton: string;
  icon: typeof PlayCircle;
  etat: Etat;
  onClick: () => void;
  variant?: 'default' | 'secondary';
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Icon className="h-4 w-4 text-primary" aria-hidden />
              {titre}
            </h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          <Button onClick={onClick} disabled={etat.enCours} variant={variant} className="shrink-0">
            {etat.enCours ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Icon className="mr-1.5 h-4 w-4" />}
            {bouton}
          </Button>
        </div>
        {etat.erreur && (
          <Alert variant="destructive">
            <AlertDescription>{etat.erreur}</AlertDescription>
          </Alert>
        )}
        {etat.resultat != null && (
          <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs">
            {JSON.stringify(etat.resultat, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}

export default function MoteurEditorialPage() {
  const [collecte, setCollecte] = useState<Etat>({ enCours: false });
  const [diag, setDiag] = useState<Etat>({ enCours: false });
  const [backfill, setBackfill] = useState<Etat>({ enCours: false });

  async function lancer(
    fonction: string,
    body: Record<string, unknown>,
    set: (e: Etat) => void,
    libelle: string,
  ) {
    set({ enCours: true });
    try {
      const { data, error } = await supabase.functions.invoke(fonction, { body });
      if (error) throw error;
      set({ enCours: false, resultat: data });
      toast.success(`${libelle} terminé`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur inconnue';
      set({ enCours: false, erreur: msg });
      toast.error(`${libelle} : ${msg}`);
    }
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          titre="Moteur éditorial"
          description="Piloter le pipeline : collecter les publications, qualifier une seule fois, préparer les vues."
          icon={Cog}
        />

        <Alert>
          <AlertDescription className="text-sm">
            Ordre recommandé : <strong>1. Collecter</strong> (récupère les posts des comptes surveillés),
            puis <strong>2. Diagnostic</strong> (vérifie sans rien écrire), puis <strong>3. Backfill</strong>
            {' '}(écrit la qualification que les écrans liront). Les opérations sont sûres et rejouables.
          </AlertDescription>
        </Alert>

        <Bloc
          titre="1. Collecter les publications"
          description="Va chercher les dernières publications des comptes surveillés (Facebook, LinkedIn, X, YouTube, site ANSUT) avec leur date réelle."
          bouton="Collecter maintenant"
          icon={PlayCircle}
          etat={collecte}
          onClick={() => lancer('collecte-institutionnelle', { mode: 'all' }, setCollecte, 'Collecte')}
        />

        <Bloc
          titre="2. Diagnostic de qualification (sans écriture)"
          description="Compte ce qui serait qualifié : contenus distincts, datés/vérifiés, voix ANSUT, doublons rattachés. N'écrit rien."
          bouton="Lancer le diagnostic"
          icon={Stethoscope}
          etat={diag}
          variant="secondary"
          onClick={() => lancer('requalifier-contenus', { mode: 'diagnostic' }, setDiag, 'Diagnostic')}
        />

        <Bloc
          titre="3. Backfill de la qualification"
          description="Calcule et enregistre la qualification unique (editorial_qualifications) pour tous les contenus. Idempotent."
          bouton="Lancer le backfill"
          icon={Download}
          etat={backfill}
          onClick={() => lancer('requalifier-contenus', { mode: 'backfill' }, setBackfill, 'Backfill')}
        />

        <p className="text-xs text-muted-foreground">
          <RefreshCw className="mr-1 inline h-3 w-3" />
          Après un backfill, ouvrez « Insights Communication » : les publications datées apparaîtront dans les fenêtres 7 / 30 / 90 jours.
        </p>
      </div>
    </PageContainer>
  );
}
