import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  ArrowLeft, 
  CheckCircle, 
  Send, 
  Edit, 
  RefreshCw,
  Loader2,
  Eye,
  Code,
  Download,
  Copy,
  Check
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { useState } from 'react';
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
  const [viewMode, setViewMode] = useState<'preview' | 'html'>('preview');
  const [copied, setCopied] = useState(false);
  
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

  const handleCopyHtml = () => {
    if (newsletter.html_court) {
      navigator.clipboard.writeText(newsletter.html_court);
      setCopied(true);
      toast.success('HTML copié dans le presse-papiers');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadHtml = () => {
    if (newsletter.html_court) {
      const blob = new Blob([newsletter.html_court], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `newsletter-ansut-radar-${newsletter.numero}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Fichier HTML téléchargé');
    }
  };

  const tonLabels: Record<string, string> = {
    pedagogique: 'Pédagogique',
    institutionnel: 'Institutionnel',
    strategique: 'Stratégique'
  };

  const cibleLabels: Record<string, string> = {
    dg_ca: 'Direction',
    partenaires: 'Partenaires',
    general: 'Grand Public'
  };

  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    brouillon: { label: 'Brouillon', variant: 'secondary' },
    en_revision: { label: 'En révision', variant: 'outline' },
    valide: { label: 'Validée', variant: 'default' },
    envoye: { label: 'Envoyée', variant: 'default' },
    archive: { label: 'Archivée', variant: 'secondary' }
  };

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>

        <div className="flex items-center gap-2 flex-wrap">
          {!isSent && (
            <>
              <Button 
                variant="outline" 
                size="sm"
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
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Modifier
              </Button>
            </>
          )}
          
          {!isValidated && (
            <Button 
              size="sm"
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
              size="sm"
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
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="text-3xl font-bold text-primary">#{newsletter.numero}</div>
              <div>
                <div className="font-semibold">
                  {format(new Date(newsletter.date_debut), 'MMMM yyyy', { locale: fr })}
                </div>
                <div className="text-sm text-muted-foreground">
                  {format(new Date(newsletter.date_debut), 'd MMM', { locale: fr })} → {format(new Date(newsletter.date_fin), 'd MMM yyyy', { locale: fr })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{tonLabels[newsletter.ton]}</Badge>
              <Badge variant="outline">{cibleLabels[newsletter.cible]}</Badge>
              <Badge variant={statusConfig[newsletter.statut]?.variant || 'secondary'}>
                {statusConfig[newsletter.statut]?.label || newsletter.statut}
                {newsletter.statut === 'envoye' && newsletter.nb_destinataires > 0 && (
                  <span className="ml-1">({newsletter.nb_destinataires})</span>
                )}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview tabs */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'preview' | 'html')}>
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="preview" className="gap-2">
              <Eye className="h-4 w-4" />
              Aperçu
            </TabsTrigger>
            <TabsTrigger value="html" className="gap-2">
              <Code className="h-4 w-4" />
              HTML
            </TabsTrigger>
          </TabsList>

          {viewMode === 'html' && newsletter.html_court && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyHtml}>
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? 'Copié' : 'Copier'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadHtml}>
                <Download className="h-4 w-4 mr-2" />
                Télécharger
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="preview" className="mt-0">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {/* Header */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cg%20fill%3D%22none%22%20fill-rule%3D%22evenodd%22%3E%3Cg%20fill%3D%22%23ffffff%22%20fill-opacity%3D%220.03%22%3E%3Cpath%20d%3D%22M36%2034v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6%2034v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6%204V0H4v4H0v2h4v4h2V6h4V4H6z%22%2F%3E%3C%2Fg%3E%3C%2Fg%3E%3C%2Fsvg%3E')] opacity-50" />
                <div className="relative z-10">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl mb-4 shadow-lg shadow-orange-500/30">
                    <span className="text-2xl">📡</span>
                  </div>
                  <h1 className="text-2xl font-bold mb-1">ANSUT RADAR</h1>
                  <p className="text-sm opacity-80 uppercase tracking-widest">Veille Stratégique Numérique</p>
                  <div className="mt-4 flex items-center justify-center gap-4 text-sm">
                    <span>📅 {format(new Date(newsletter.date_debut), 'MMMM yyyy', { locale: fr })}</span>
                    <Badge className="bg-white/20 hover:bg-white/30">N°{newsletter.numero}</Badge>
                  </div>
                </div>
              </div>

              {/* Édito */}
              <div className="p-6 border-b">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-lg">📝</div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Édito</span>
                </div>
                <blockquote className="text-lg italic text-muted-foreground border-l-4 border-orange-500 pl-4">
                  {contenu.edito?.texte}
                </blockquote>
                <p className="text-right mt-4 text-sm text-muted-foreground font-medium">— La Rédaction ANSUT RADAR</p>
              </div>

              {/* Essentiel ANSUT */}
              <div className="p-6 border-b">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-lg">🎯</div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">L'essentiel ANSUT</span>
                </div>
                <div className="space-y-4">
                  {contenu.essentiel_ansut?.map((item, index) => (
                    <div key={index} className="bg-gradient-to-r from-accent/50 to-accent/30 p-5 rounded-xl border-l-4 border-orange-500">
                      <h3 className="font-semibold text-foreground mb-3 flex items-start gap-2">
                        <span className="flex-shrink-0 w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-xs mt-0.5">✓</span>
                        {item.titre}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2 pl-7">
                        <strong className="text-foreground/80">Pourquoi :</strong> {item.pourquoi}
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400 font-medium pl-7">
                        → {item.impact}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tech & Décryptage Grid */}
              <div className="grid md:grid-cols-2">
                {/* Tendance Tech */}
                <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-b md:border-r md:border-b-0">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center text-lg">🔬</div>
                    <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Tendance Tech</span>
                  </div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">{contenu.tendance_tech?.titre}</h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">{contenu.tendance_tech?.contenu}</p>
                  <div className="bg-white dark:bg-slate-900 p-3 rounded-lg text-sm">
                    <strong className="text-orange-500">👉 Pour l'ANSUT :</strong>
                    <span className="text-blue-900 dark:text-blue-100 ml-1">{contenu.tendance_tech?.lien_ansut}</span>
                  </div>
                </div>

                {/* Décryptage */}
                <div className="p-6 bg-gradient-to-br from-amber-50 to-yellow-100/50 dark:from-amber-950/30 dark:to-yellow-900/20 border-b">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center text-lg">📚</div>
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">En 2 Minutes</span>
                  </div>
                  <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-3">{contenu.decryptage?.titre}</h3>
                  <p className="text-sm text-amber-800 dark:text-amber-200">{contenu.decryptage?.contenu}</p>
                </div>
              </div>

              {/* Chiffre marquant */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-10 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 via-transparent to-orange-500/10" />
                <div className="relative z-10">
                  <span className="text-xs font-bold uppercase tracking-widest opacity-60">📊 Le Chiffre Marquant</span>
                  <div className="text-6xl sm:text-7xl font-extrabold my-4 bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent">
                    {contenu.chiffre_marquant?.valeur}
                  </div>
                  <div className="text-xl font-medium mb-2">{contenu.chiffre_marquant?.unite}</div>
                  <div className="text-sm opacity-70 max-w-md mx-auto">{contenu.chiffre_marquant?.contexte}</div>
                </div>
              </div>

              {/* À venir */}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-lg">📅</div>
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">À Venir</span>
                </div>
                <div className="space-y-3">
                  {contenu.a_venir?.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 bg-accent/30 rounded-xl hover:bg-accent/50 transition-colors">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                        item.type === 'evenement' ? 'bg-blue-100 dark:bg-blue-900/50' :
                        item.type === 'appel_projets' ? 'bg-green-100 dark:bg-green-900/50' :
                        item.type === 'deploiement' ? 'bg-amber-100 dark:bg-amber-900/50' :
                        'bg-purple-100 dark:bg-purple-900/50'
                      }`}>
                        {item.type === 'evenement' && '📆'}
                        {item.type === 'appel_projets' && '📢'}
                        {item.type === 'deploiement' && '🚀'}
                        {item.type === 'decision' && '⚖️'}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{item.titre}</div>
                        {item.date && <div className="text-sm text-muted-foreground">{item.date}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-slate-900 text-white p-8 text-center">
                <div className="text-lg font-bold mb-1">ANSUT</div>
                <p className="text-sm opacity-80 mb-4">Agence Nationale du Service Universel des Télécommunications</p>
                <a href="https://www.ansut.ci" className="text-orange-400 hover:text-orange-300 font-medium text-sm">
                  www.ansut.ci
                </a>
                <div className="mt-6 pt-6 border-t border-white/10 text-xs opacity-50">
                  Newsletter générée par ANSUT RADAR
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="html" className="mt-0">
          <Card>
            <CardContent className="p-4">
              {newsletter.html_court ? (
                <pre className="bg-slate-950 text-slate-100 p-4 rounded-lg overflow-x-auto text-xs max-h-[600px]">
                  <code>{newsletter.html_court}</code>
                </pre>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Aucun HTML généré pour cette newsletter
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
