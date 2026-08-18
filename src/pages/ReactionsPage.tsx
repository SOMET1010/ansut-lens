import { useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  AlertTriangle,
  ExternalLink,
  Info,
  Loader2,
  MessageSquarePlus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageContainer } from '@/components/common/PageContainer';
import { PageHeader } from '@/components/common/PageHeader';
import {
  useAjouterCommentaire,
  useCommentairesFil,
  useEvaluerFil,
  useFilsSociaux,
  useSignalerFil,
  useSupprimerFil,
  type FilSocial,
} from '@/hooks/useFilsSociaux';

/**
 * Réactions du public — signalement manuel de fils sociaux.
 *
 * Cette page couvre l'angle mort documenté dans
 * `docs/PROCEDURE_ACCES_SOCIAUX.md` (§5) : aucune API officielle ne donne accès
 * aux commentaires publiés sous un post d'une page tierce. Un agent COM colle
 * l'URL du post, saisit les commentaires observés, et RADAR applique une règle
 * d'alerte explicable, sans dépendre d'un accès Meta / X / LinkedIn.
 */

const PLATEFORMES = [
  { valeur: 'facebook', libelle: 'Facebook' },
  { valeur: 'twitter', libelle: 'X (Twitter)' },
  { valeur: 'linkedin', libelle: 'LinkedIn' },
  { valeur: 'instagram', libelle: 'Instagram' },
  { valeur: 'tiktok', libelle: 'TikTok' },
  { valeur: 'autre', libelle: 'Autre' },
];

function libellePlateforme(valeur: string): string {
  return PLATEFORMES.find((p) => p.valeur === valeur)?.libelle ?? valeur;
}

function TonaliteBadge({ valeur }: { valeur: number | null }) {
  if (valeur === null || valeur === undefined) {
    return <Badge variant="outline">Tonalité non évaluée</Badge>;
  }
  if (valeur <= -0.3) {
    return <Badge className="bg-incident text-incident-foreground">Tonalité négative</Badge>;
  }
  if (valeur >= 0.3) {
    return <Badge className="bg-confirme text-confirme-foreground">Tonalité positive</Badge>;
  }
  return <Badge variant="secondary">Tonalité neutre</Badge>;
}

function FormulaireSignalement() {
  const signaler = useSignalerFil();
  const [url, setUrl] = useState('');
  const [plateforme, setPlateforme] = useState('facebook');
  const [titre, setTitre] = useState('');
  const [auteur, setAuteur] = useState('');
  const [contexte, setContexte] = useState('');

  const soumettre = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      new URL(url.trim());
    } catch {
      return;
    }
    signaler.mutate(
      { url, plateforme, titre, auteur_publication: auteur, contexte },
      {
        onSuccess: () => {
          setUrl('');
          setTitre('');
          setAuteur('');
          setContexte('');
        },
      },
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Signaler un fil à suivre</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4 md:grid-cols-2" onSubmit={soumettre}>
          <div className="md:col-span-2">
            <Label htmlFor="fil-url">Lien de la publication</Label>
            <Input
              id="fil-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.facebook.com/…/posts/…"
              required
            />
          </div>
          <div>
            <Label htmlFor="fil-plateforme">Plateforme</Label>
            <Select value={plateforme} onValueChange={setPlateforme}>
              <SelectTrigger id="fil-plateforme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PLATEFORMES.map((p) => (
                  <SelectItem key={p.valeur} value={p.valeur}>
                    {p.libelle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="fil-auteur">Auteur de la publication</Label>
            <Input
              id="fil-auteur"
              value={auteur}
              onChange={(e) => setAuteur(e.target.value)}
              placeholder="SIKA Finance"
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="fil-titre">Titre / sujet de la publication</Label>
            <Input
              id="fil-titre"
              value={titre}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Financement du PND 2026-2030 : l’ANSUT porte quatre projets"
            />
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="fil-contexte">Contexte (facultatif)</Label>
            <Textarea
              id="fil-contexte"
              value={contexte}
              onChange={(e) => setContexte(e.target.value)}
              rows={2}
              placeholder="Pourquoi ce fil mérite d’être suivi"
            />
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={signaler.isPending || !url.trim()}>
              {signaler.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ajouter au suivi
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function CarteFil({ fil }: { fil: FilSocial }) {
  const { data: commentaires = [], isLoading } = useCommentairesFil(fil.id);
  const ajouter = useAjouterCommentaire();
  const evaluer = useEvaluerFil();
  const supprimer = useSupprimerFil();

  const [contenu, setContenu] = useState('');
  const [auteur, setAuteur] = useState('');
  const [influent, setInfluent] = useState(false);

  const negatifs = useMemo(
    () => commentaires.filter((c) => typeof c.sentiment === 'number' && c.sentiment <= -0.3).length,
    [commentaires],
  );

  const enregistrer = (event: React.FormEvent) => {
    event.preventDefault();
    if (!contenu.trim()) return;
    ajouter.mutate(
      { fil_id: fil.id, contenu, auteur, auteur_influent: influent },
      {
        onSuccess: () => {
          setContenu('');
          setAuteur('');
          setInfluent(false);
        },
      },
    );
  };

  return (
    <Card className={fil.alerte_generee ? 'border-incident' : undefined}>
      <CardHeader className="gap-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base">{fil.titre || fil.url}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {libellePlateforme(fil.plateforme)}
              {fil.auteur_publication ? ` · ${fil.auteur_publication}` : ''} · signalé{' '}
              {formatDistanceToNow(new Date(fil.created_at), { addSuffix: true, locale: fr })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TonaliteBadge valeur={fil.tonalite_globale} />
            {fil.alerte_generee && (
              <Badge className="bg-incident text-incident-foreground">
                <AlertTriangle className="mr-1 h-3 w-3" aria-hidden />
                Alerte émise
              </Badge>
            )}
          </div>
        </div>
        {fil.contexte && <p className="text-sm text-muted-foreground">{fil.contexte}</p>}
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <a
            href={fil.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            Ouvrir la publication
          </a>
          <span>
            {commentaires.length} commentaire{commentaires.length > 1 ? 's' : ''} saisi
            {commentaires.length > 1 ? 's' : ''} · {negatifs} négatif{negatifs > 1 ? 's' : ''}
          </span>
          {fil.derniere_evaluation && (
            <span>
              évalué{' '}
              {formatDistanceToNow(new Date(fil.derniere_evaluation), { addSuffix: true, locale: fr })}
            </span>
          )}
        </div>

        <form className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-[1fr_14rem]" onSubmit={enregistrer}>
          <div>
            <Label htmlFor={`com-${fil.id}`} className="sr-only">
              Commentaire observé
            </Label>
            <Textarea
              id={`com-${fil.id}`}
              rows={2}
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
              placeholder="Copier ici le commentaire observé, mot pour mot"
            />
          </div>
          <div className="space-y-2">
            <Input
              value={auteur}
              onChange={(e) => setAuteur(e.target.value)}
              placeholder="Auteur du commentaire"
              aria-label="Auteur du commentaire"
            />
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <Checkbox
                checked={influent}
                onCheckedChange={(v) => setInfluent(v === true)}
                aria-label="Compte influent"
              />
              Compte influent
            </label>
            <Button type="submit" size="sm" className="w-full" disabled={ajouter.isPending || !contenu.trim()}>
              <MessageSquarePlus className="mr-2 h-4 w-4" aria-hidden />
              Enregistrer
            </Button>
          </div>
        </form>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement des commentaires…</p>
        ) : commentaires.length > 0 ? (
          <ul className="space-y-2">
            {commentaires.map((c) => (
              <li key={c.id} className="rounded-md border border-border p-2 text-sm">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{c.auteur || 'Auteur non nommé'}</span>
                  {c.auteur_influent && <Badge variant="outline">Compte influent</Badge>}
                  {typeof c.sentiment === 'number' && (
                    <span className={c.sentiment <= -0.3 ? 'text-incident' : undefined}>
                      tonalité {c.sentiment.toFixed(2)}
                    </span>
                  )}
                  <span>
                    {formatDistanceToNow(new Date(c.date_commentaire), { addSuffix: true, locale: fr })}
                  </span>
                </div>
                <p className="mt-1">{c.contenu}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucun commentaire saisi : la règle d’alerte ne peut pas encore s’appliquer.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => evaluer.mutate(fil.id)}
            disabled={evaluer.isPending || commentaires.length === 0}
          >
            {evaluer.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
            )}
            Évaluer la tonalité du fil
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => supprimer.mutate(fil.id)}
            disabled={supprimer.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" aria-hidden />
            Retirer du suivi
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ReactionsPage() {
  const { data: fils = [], isLoading } = useFilsSociaux();

  return (
    <PageContainer>
      <PageHeader
        titre="Réactions du public"
        description="Suivi des commentaires sous les publications qui parlent de l’ANSUT, y compris chez les médias tiers."
      />

      <div className="mt-6 space-y-6">
        <div className="flex items-start gap-2 rounded-lg border border-border bg-muted p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>
            Règle d’alerte appliquée, sans zone d’ombre : une alerte est émise dès que{' '}
            <strong>3 commentaires négatifs</strong> sont enregistrés sur un même fil en moins de 24 h,{' '}
            <strong>ou</strong> qu’un <strong>compte marqué influent</strong> publie un commentaire négatif.
            L’alerte cite toujours les commentaires réels qui l’ont déclenchée.
          </p>
        </div>

        <FormulaireSignalement />

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement des fils suivis…</p>
        ) : fils.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun fil suivi pour le moment. Collez le lien d’une publication pour démarrer.
          </p>
        ) : (
          <div className="space-y-4">
            {fils.map((fil) => (
              <CarteFil key={fil.id} fil={fil} />
            ))}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
