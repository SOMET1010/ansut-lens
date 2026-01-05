import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  ArrowLeft, 
  CheckCircle, 
  Send, 
  Edit, 
  RefreshCw,
  Loader2 
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  useValidateNewsletter, 
  useSendNewsletter,
  useGenerateNewsletter 
} from '@/hooks/useNewsletters';
import type { Newsletter } from '@/types/newsletter';

interface NewsletterPreviewProps {
  newsletter: Newsletter;
  onBack: () => void;
  onEdit: () => void;
  onRefresh: () => void;
}

export function NewsletterPreview({ newsletter, onBack, onEdit, onRefresh }: NewsletterPreviewProps) {
  const validateNewsletter = useValidateNewsletter();
  const sendNewsletter = useSendNewsletter();
  const regenerate = useGenerateNewsletter();

  const { contenu } = newsletter;
  const isValidated = newsletter.statut === 'valide' || newsletter.statut === 'envoye';
  const isSent = newsletter.statut === 'envoye';

  const handleValidate = async () => {
    await validateNewsletter.mutateAsync(newsletter.id);
    onRefresh();
  };

  const handleSend = async () => {
    await sendNewsletter.mutateAsync(newsletter.id);
    onRefresh();
  };

  const handleRegenerate = async () => {
    await regenerate.mutateAsync({
      periode: newsletter.periode,
      ton: newsletter.ton,
      cible: newsletter.cible,
      date_debut: newsletter.date_debut,
      date_fin: newsletter.date_fin,
    });
    onBack();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>

        <div className="flex items-center gap-2">
          {!isSent && (
            <>
              <Button 
                variant="outline" 
                onClick={handleRegenerate}
                disabled={regenerate.isPending}
              >
                {regenerate.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Régénérer
              </Button>
              <Button variant="outline" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            </>
          )}
          
          {!isValidated && (
            <Button 
              onClick={handleValidate}
              disabled={validateNewsletter.isPending}
            >
              {validateNewsletter.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Valider
            </Button>
          )}
          
          {isValidated && !isSent && (
            <Button 
              onClick={handleSend}
              disabled={sendNewsletter.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {sendNewsletter.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Envoyer
            </Button>
          )}
        </div>
      </div>

      {/* Status bar */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-2xl font-bold">#{newsletter.numero}</div>
            <div>
              <div className="font-medium">
                {format(new Date(newsletter.date_debut), 'MMMM yyyy', { locale: fr })}
              </div>
              <div className="text-sm text-muted-foreground">
                {format(new Date(newsletter.date_debut), 'dd MMM', { locale: fr })} - {format(new Date(newsletter.date_fin), 'dd MMM yyyy', { locale: fr })}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={newsletter.statut === 'envoye' ? 'default' : 'secondary'}>
              {newsletter.statut === 'brouillon' && 'Brouillon'}
              {newsletter.statut === 'valide' && 'Validée'}
              {newsletter.statut === 'envoye' && `Envoyée (${newsletter.nb_destinataires})`}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardContent className="p-0">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-8 text-center rounded-t-lg">
            <h1 className="text-2xl font-bold mb-2">📰 NEWSLETTER ANSUT RADAR</h1>
            <p className="opacity-80">
              {format(new Date(newsletter.date_debut), 'MMMM yyyy', { locale: fr })} - Numéro {newsletter.numero}
            </p>
          </div>

          {/* Édito */}
          <div className="p-6 border-b">
            <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-3">📝 Édito</h2>
            <p className="italic text-muted-foreground">{contenu.edito?.texte}</p>
          </div>

          {/* Essentiel ANSUT */}
          <div className="p-6 border-b">
            <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-4">🎯 L'essentiel ANSUT</h2>
            <div className="space-y-4">
              {contenu.essentiel_ansut?.map((item, index) => (
                <div key={index} className="bg-accent/30 p-4 rounded-lg border-l-4 border-primary">
                  <h3 className="font-medium mb-2">✅ {item.titre}</h3>
                  <p className="text-sm text-muted-foreground mb-1">
                    <strong>Pourquoi c'est important :</strong> {item.pourquoi}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    <strong>Impact :</strong> {item.impact}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Tendance Tech */}
          <div className="p-6 border-b">
            <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-4">🔬 Tendance tech du mois</h2>
            <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
              <h3 className="font-medium text-blue-700 dark:text-blue-300 mb-2">{contenu.tendance_tech?.titre}</h3>
              <p className="text-sm mb-3">{contenu.tendance_tech?.contenu}</p>
              <p className="text-sm">
                <strong>👉 Pour l'ANSUT :</strong> {contenu.tendance_tech?.lien_ansut}
              </p>
            </div>
          </div>

          {/* Décryptage */}
          <div className="p-6 border-b">
            <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-4">📚 En 2 minutes</h2>
            <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-lg">
              <h3 className="font-medium text-amber-700 dark:text-amber-300 mb-2">{contenu.decryptage?.titre}</h3>
              <p className="text-sm">{contenu.decryptage?.contenu}</p>
            </div>
          </div>

          {/* Chiffre marquant */}
          <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-8 text-center">
            <h2 className="text-sm font-semibold uppercase tracking-wide mb-4 opacity-80">📊 Le chiffre</h2>
            <div className="text-5xl font-bold text-primary-foreground/90 mb-2">
              {contenu.chiffre_marquant?.valeur}
            </div>
            <div className="text-lg mb-2">{contenu.chiffre_marquant?.unite}</div>
            <div className="text-sm opacity-80">{contenu.chiffre_marquant?.contexte}</div>
          </div>

          {/* À venir */}
          <div className="p-6">
            <h2 className="text-sm font-semibold text-primary uppercase tracking-wide mb-4">📅 À venir</h2>
            <div className="space-y-3">
              {contenu.a_venir?.map((item, index) => (
                <div key={index} className="flex items-center gap-3 p-3 bg-accent/30 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    {item.type === 'evenement' && '📆'}
                    {item.type === 'appel_projets' && '📢'}
                    {item.type === 'deploiement' && '🚀'}
                    {item.type === 'decision' && '⚖️'}
                  </div>
                  <div>
                    <div className="font-medium">{item.titre}</div>
                    {item.date && <div className="text-sm text-muted-foreground">{item.date}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-primary text-primary-foreground p-6 text-center rounded-b-lg">
            <p className="font-medium mb-1">ANSUT - Service Universel des Télécommunications</p>
            <p className="text-sm opacity-80">Côte d'Ivoire | www.ansut.ci</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
