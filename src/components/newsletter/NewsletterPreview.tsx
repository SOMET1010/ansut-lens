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
          <Card className="overflow-hidden shadow-lg">
            <CardContent className="p-0">
              {/* HEADER INNOV'ACTU - Marine blue + Orange */}
              <div className="bg-gradient-to-r from-[#1a237e] to-[#283593] text-white relative overflow-hidden">
                <div className="p-6 pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Logo */}
                      <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-lg">
                        <span className="text-3xl">📡</span>
                      </div>
                      {/* Title */}
                      <div>
                        <h1 className="text-4xl font-extrabold text-[#e65100] tracking-tight">INNOV'ACTU</h1>
                        <p className="text-sm text-white/90 tracking-wider">NEWSLETTER ANSUT</p>
                      </div>
                    </div>
                    {/* Numero & Date */}
                    <div className="text-right">
                      <div className="bg-[#e65100] text-white px-4 py-2 rounded-lg font-bold text-lg inline-block">
                        N°{newsletter.numero}
                      </div>
                      <div className="text-white/85 text-sm mt-2">
                        {format(new Date(newsletter.date_debut), 'd MMMM yyyy', { locale: fr })}
                      </div>
                    </div>
                  </div>
                </div>
                {/* Orange wave decoration */}
                <div className="h-1.5 bg-gradient-to-r from-[#e65100] via-[#ff8a00] to-[#e65100]" />
              </div>

              {/* HEADER IMAGE (if available) */}
              {contenu.header?.image_url && (
                <div className="w-full">
                  <img 
                    src={contenu.header.image_url} 
                    alt={contenu.header.image_alt || 'Image newsletter'} 
                    className="w-full h-48 object-cover"
                  />
                </div>
              )}

              {/* CONTENT: SOMMAIRE + MAIN */}
              <div className="flex min-h-[500px]">
                {/* SOMMAIRE (Left Sidebar) */}
                <div className="w-48 bg-[#e65100] flex-shrink-0">
                  <div className="p-5 sticky top-0">
                    <div className="text-white font-bold mb-5 flex items-center gap-2 text-base">
                      <span className="text-lg">≡</span> Sommaire
                    </div>
                    <nav className="space-y-1">
                      {[
                        { icon: '📝', label: 'Édito', id: 'edito' },
                        { icon: '🎯', label: 'ANSUT News', id: 'ansut-news' },
                        { icon: '🔬', label: 'Technologie', id: 'tech' },
                        { icon: '📚', label: 'En 2 Minutes', id: 'decrypt' },
                        { icon: '📊', label: 'Le Chiffre', id: 'chiffre' },
                        { icon: '📅', label: 'À Venir', id: 'avenir' },
                      ].map((item) => (
                        <a 
                          key={item.id}
                          href={`#${item.id}`}
                          className="flex items-center gap-2 text-white/95 hover:text-white hover:bg-white/10 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border-b border-white/20 last:border-0"
                        >
                          <span>{item.icon}</span>
                          {item.label}
                        </a>
                      ))}
                    </nav>
                  </div>
                </div>

                {/* MAIN CONTENT (Right) */}
                <div className="flex-1 bg-white">
                  {/* ÉDITO */}
                  <div id="edito" className="p-7 border-b">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-lg">📝</div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#e65100]">Édito</span>
                    </div>
                    <blockquote className="text-base italic text-muted-foreground border-l-4 border-[#e65100] pl-4 leading-relaxed">
                      {contenu.edito?.texte}
                    </blockquote>
                    <p className="text-right mt-4 text-sm text-muted-foreground font-medium">— La Rédaction ANSUT</p>
                  </div>

                  {/* ANSUT NEWS */}
                  <div id="ansut-news" className="p-7 border-b">
                    <div className="flex items-center gap-2.5 mb-5">
                      <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center text-lg">🎯</div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#e65100]">ANSUT News</span>
                    </div>
                    <div className="space-y-4">
                      {contenu.essentiel_ansut?.map((item, index) => (
                        <div key={index} className="bg-gradient-to-r from-orange-50 to-orange-100/50 p-5 rounded-xl border-l-4 border-[#e65100]">
                          {item.image_url && (
                            <img 
                              src={item.image_url} 
                              alt={item.image_alt || item.titre} 
                              className="w-full h-36 object-cover rounded-lg mb-3"
                            />
                          )}
                          <h3 className="font-semibold text-foreground mb-3 flex items-start gap-2.5">
                            <span className="flex-shrink-0 w-6 h-6 bg-[#e65100] text-white rounded-full flex items-center justify-center text-xs font-bold">{index + 1}</span>
                            {item.titre}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-2 pl-8">
                            <strong className="text-foreground/80">Pourquoi :</strong> {item.pourquoi}
                          </p>
                          <p className="text-sm text-green-600 font-semibold pl-8">
                            → {item.impact}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* TECHNOLOGIE */}
                  <div id="tech" className="p-7 bg-gradient-to-br from-blue-50 to-blue-100/50 border-b">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center text-lg">🔬</div>
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Technologie</span>
                    </div>
                    {contenu.tendance_tech?.image_url && (
                      <img 
                        src={contenu.tendance_tech.image_url} 
                        alt={contenu.tendance_tech.image_alt || contenu.tendance_tech.titre} 
                        className="w-full h-44 object-cover rounded-xl mb-4"
                      />
                    )}
                    <h3 className="font-semibold text-blue-900 mb-3 text-lg">{contenu.tendance_tech?.titre}</h3>
                    <p className="text-sm text-blue-800 mb-4 leading-relaxed">{contenu.tendance_tech?.contenu}</p>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <strong className="text-[#e65100]">👉 Pour l'ANSUT :</strong>
                      <span className="text-blue-900 ml-1">{contenu.tendance_tech?.lien_ansut}</span>
                    </div>
                  </div>

                  {/* EN 2 MINUTES */}
                  <div id="decrypt" className="p-7 bg-gradient-to-br from-amber-50 to-yellow-100/50 border-b">
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center text-lg">📚</div>
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-700">En 2 Minutes</span>
                    </div>
                    <h3 className="font-semibold text-amber-900 mb-3 text-lg">{contenu.decryptage?.titre}</h3>
                    <p className="text-sm text-amber-800 leading-relaxed">{contenu.decryptage?.contenu}</p>
                  </div>
                </div>
              </div>

              {/* LE CHIFFRE MARQUANT (Full Width) */}
              <div id="chiffre" className="bg-gradient-to-r from-[#1a237e] to-[#283593] text-white p-12 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-[#e65100]/10 via-transparent to-[#e65100]/10" />
                <div className="relative z-10">
                  <span className="text-xs font-bold uppercase tracking-[3px] opacity-70">📊 Le Chiffre Marquant</span>
                  <div className="text-7xl sm:text-8xl font-extrabold my-4 text-[#e65100]">
                    {contenu.chiffre_marquant?.valeur}
                  </div>
                  <div className="text-xl font-semibold mb-2">{contenu.chiffre_marquant?.unite}</div>
                  <div className="text-sm opacity-80 max-w-md mx-auto">{contenu.chiffre_marquant?.contexte}</div>
                </div>
              </div>

              {/* À VENIR */}
              <div id="avenir" className="p-7 border-t-4 border-[#e65100]">
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-lg">📅</div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#e65100]">À Venir</span>
                </div>
                <div className="space-y-3">
                  {contenu.a_venir?.map((item, index) => (
                    <div key={index} className="flex items-center gap-4 p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                        item.type === 'evenement' ? 'bg-blue-100' :
                        item.type === 'appel_projets' ? 'bg-green-100' :
                        item.type === 'deploiement' ? 'bg-amber-100' :
                        'bg-purple-100'
                      }`}>
                        {item.type === 'evenement' && '📆'}
                        {item.type === 'appel_projets' && '📢'}
                        {item.type === 'deploiement' && '🚀'}
                        {item.type === 'decision' && '⚖️'}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold">{item.titre}</div>
                        {item.date && <div className="text-sm text-muted-foreground">{item.date}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* FOOTER */}
              <div className="bg-[#1a237e] text-white p-8 text-center">
                <div className="text-xl font-bold mb-2">ANSUT</div>
                <p className="text-sm opacity-80 mb-4">Agence Nationale du Service Universel des Télécommunications</p>
                <a href="https://www.ansut.ci" className="text-[#e65100] hover:text-orange-400 font-semibold text-sm">
                  www.ansut.ci
                </a>
                <div className="mt-6 pt-6 border-t border-white/15 text-xs opacity-50">
                  INNOV'ACTU Newsletter · {format(new Date(newsletter.date_debut), 'MMMM yyyy', { locale: fr })}
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
