import React, { useState, useCallback, useRef } from 'react';
import { 
  Copy, Check, Linkedin, Twitter, Mail, FileText, Newspaper, 
  Send, Sparkles, ArrowRight, RefreshCw, Clock, AlertCircle,
  Megaphone, Lightbulb, Target, MessageSquare, ExternalLink, Globe
} from 'lucide-react';
import { ReactionAnalyzerSection } from '@/components/communication/ReactionAnalyzerSection';
import { SujetsValorisationSection } from '@/components/communication/SujetsValorisationSection';
import { PostsAmplifierSection } from '@/components/communication/PostsAmplifierSection';
import { NavLink } from 'react-router-dom';
import {
  MediaImpactWidget,
  SocialPulseWidget,
  ShareOfVoiceWidget,
  EchoResonanceWidget,
} from '@/components/radar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useMatinalePreview, useMatinaleSend } from '@/hooks/useMatinale';

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success(`${label} copié !`);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copié' : 'Copier'}
    </Button>
  );
}

function TonaliteBadge({ tonalite }: { tonalite: string }) {
  const config = {
    positif: { label: '✅ Positif', variant: 'default' as const, className: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
    negatif: { label: '🔴 Négatif', variant: 'destructive' as const, className: '' },
    neutre: { label: '🟡 Neutre', variant: 'secondary' as const, className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  }[tonalite] || { label: tonalite, variant: 'secondary' as const, className: '' };
  return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
}

// --- Section 1: Matinale Briefing ---
function MatinaleBriefingSection() {
  const { mutate: generatePreview, data, isPending } = useMatinalePreview();
  const { mutate: sendMatinale, isPending: isSending } = useMatinaleSend();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Newspaper className="h-5 w-5 text-primary" />
            Briefing du matin
          </h2>
          <p className="text-sm text-muted-foreground">
            Flash info, e-réputation et posts prêts à publier
          </p>
        </div>
        <Button onClick={() => generatePreview()} disabled={isPending} className="gap-2">
          {isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isPending ? 'Génération…' : 'Générer le briefing'}
        </Button>
      </div>

      {isPending && (
        <div className="grid gap-4 md:grid-cols-3">
          {[1,2,3].map(i => (
            <Card key={i}><CardContent className="p-4 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
            </CardContent></Card>
          ))}
        </div>
      )}

      {data?.matinale && (
        <div className="space-y-6">
          {/* Flash Info */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
              ⚡ Flash Info <Badge variant="secondary">{data.matinale.flash_info.length}</Badge>
            </h3>
            <div className="grid gap-3 md:grid-cols-3">
              {data.matinale.flash_info.map((item, i) => (
                <Card key={i} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <p className="font-medium text-sm mb-1">{item.titre}</p>
                    <p className="text-xs text-muted-foreground mb-2">{item.resume}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground/70">Source : {item.source}</span>
                      {item.source_url && (
                        <a
                          href={item.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 p-1 rounded-md hover:bg-accent transition-colors"
                          title="Voir la source"
                        >
                          <ExternalLink className="h-3.5 w-3.5 text-primary" />
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Veille Réputation */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-1.5">
                  🎯 Veille Réputation ANSUT
                </CardTitle>
                <TonaliteBadge tonalite={data.matinale.veille_reputation.tonalite} />
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <p className="text-sm">{data.matinale.veille_reputation.resume}</p>
              
              {/* Preuves avec liens */}
              {data.matinale.veille_reputation.preuves && data.matinale.veille_reputation.preuves.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Preuves — Articles mentionnant l'ANSUT
                  </p>
                  {data.matinale.veille_reputation.preuves.map((preuve, i) => {
                    const sentColor = preuve.sentiment_article === 'positif' 
                      ? 'border-l-emerald-500' 
                      : preuve.sentiment_article === 'negatif' 
                        ? 'border-l-destructive' 
                        : 'border-l-amber-500';
                    return (
                      <div key={i} className={`p-3 rounded-lg bg-muted/50 border-l-4 ${sentColor}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{preuve.titre}</p>
                            <p className="text-xs text-muted-foreground italic mt-0.5">« {preuve.extrait} »</p>
                            <div className="flex items-center gap-2 mt-1.5">
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">{preuve.source}</Badge>
                              <TonaliteBadge tonalite={preuve.sentiment_article} />
                            </div>
                          </div>
                          {preuve.url && (
                            <a
                              href={preuve.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="shrink-0 p-1.5 rounded-md hover:bg-accent transition-colors"
                              title="Voir l'article source"
                            >
                              <ExternalLink className="h-3.5 w-3.5 text-primary" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 rounded-lg bg-amber-500/5 border border-dashed border-amber-500/20">
                  <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Aucune mention directe de l'ANSUT détectée dans les médias sur les dernières 24h
                  </p>
                </div>
              )}

              {data.matinale.veille_reputation.mentions_cles.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {data.matinale.veille_reputation.mentions_cles.map((m, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">{m}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Posts prêts à publier */}
          <div>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1.5">
              📝 Prêt-à-Poster
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              {/* LinkedIn */}
              <Card className="border-l-4 border-l-blue-600">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-1.5">
                      <Linkedin className="h-4 w-4 text-blue-600" /> LinkedIn
                    </CardTitle>
                    <CopyButton text={data.matinale.pret_a_poster.linkedin} label="Post LinkedIn" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm whitespace-pre-line mb-2">{data.matinale.pret_a_poster.linkedin}</p>
                  <p className="text-xs text-muted-foreground italic">💡 {data.matinale.pret_a_poster.angle}</p>
                </CardContent>
              </Card>

              {/* X / Twitter */}
              <Card className="border-l-4 border-l-foreground">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm flex items-center gap-1.5">
                      <Twitter className="h-4 w-4" /> X (Twitter)
                    </CardTitle>
                    <CopyButton text={data.matinale.pret_a_poster.x_post || ''} label="Post X" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm whitespace-pre-line mb-2">
                    {data.matinale.pret_a_poster.x_post || 'Non disponible – régénérez le briefing'}
                  </p>
                  {data.matinale.pret_a_poster.x_post && (
                    <p className="text-xs text-muted-foreground">
                      {data.matinale.pret_a_poster.x_post.length}/280 caractères
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <p className="text-[10px] text-muted-foreground text-center">
            Généré à partir de {data.articles_count} articles • {format(new Date(data.generated_at), "HH:mm 'le' d MMMM", { locale: fr })}
          </p>
        </div>
      )}

      {!data && !isPending && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Newspaper className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              Cliquez sur « Générer le briefing » pour obtenir votre matinale du jour
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// --- Section 2: Content Generator ---
function ContentGeneratorSection({ sujetRef }: { sujetRef?: React.MutableRefObject<((text: string) => void) | null> }) {
  const [sujet, setSujet] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Expose setSujet to parent
  if (sujetRef) sujetRef.current = (text: string) => setSujet(text);

  const generateKit = async () => {
    if (!sujet.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const { data, error } = await supabase.functions.invoke('assistant-ia', {
        body: {
          messages: [{ role: 'user', content: sujet }],
          mode: 'communication',
        },
      });

      if (error) throw error;

      // Handle streaming response
      if (data instanceof ReadableStream) {
        const reader = data.getReader();
        const decoder = new TextDecoder();
        let full = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
          for (const line of lines) {
            const json = line.slice(6);
            if (json === '[DONE]') continue;
            try {
              const parsed = JSON.parse(json);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) full += delta;
            } catch {}
          }
        }
        setResult(full);
      } else if (typeof data === 'string') {
        setResult(data);
      } else {
        setResult(JSON.stringify(data));
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur de génération');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          Kit Communication
        </h2>
        <p className="text-sm text-muted-foreground">
          Décrivez un sujet ou un projet à valoriser, l'IA prépare un dossier complet
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Textarea
            value={sujet}
            onChange={e => setSujet(e.target.value)}
            placeholder="Ex: Valoriser le projet de connectivité rurale de l'ANSUT dans la région du Zanzan…"
            className="min-h-[80px] resize-none"
          />
          <div className="flex items-center justify-between">
            <div className="flex gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Target className="h-3 w-3" /> Messages clés</span>
              <span className="flex items-center gap-1"><Linkedin className="h-3 w-3" /> Post LinkedIn</span>
              <span className="flex items-center gap-1"><Twitter className="h-3 w-3" /> Post X</span>
              <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email DG</span>
            </div>
            <Button onClick={generateKit} disabled={loading || !sujet.trim()} className="gap-2">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? 'Génération…' : 'Générer le kit'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">📋 Dossier Communication</CardTitle>
              <CopyButton text={result} label="Dossier" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-line text-sm">
              {result}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// --- Section 3: Quick Tools ---
function QuickToolsSection() {
  const shortcuts = [
    { label: 'Studio Publication', icon: FileText, to: '/dossiers', desc: 'Notes et dossiers' },
    { label: 'Assistant IA', icon: MessageSquare, to: '/assistant', desc: 'Copilote intelligence' },
    { label: 'Centre de Veille', icon: Newspaper, to: '/radar', desc: 'Flux en temps réel' },
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-primary" />
        Accès rapide
      </h2>
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        {shortcuts.map(s => (
          <NavLink key={s.to} to={s.to}>
            <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <s.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
                <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
              </CardContent>
            </Card>
          </NavLink>
        ))}
      </div>
    </div>
  );
}

// --- Main Page ---
export default function CommunicationPage() {
  const sujetSetterRef = useRef<((text: string) => void) | null>(null);

  const handleGeneratePost = useCallback((text: string) => {
    sujetSetterRef.current?.(text);
    // Scroll to kit section
    document.getElementById('kit-communication')?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Megaphone className="h-6 w-6 text-primary" />
          Espace Communication
        </h1>
        <p className="text-muted-foreground">
          Votre bureau quotidien : briefing, génération de contenus et outils rapides
        </p>
      </div>

      {/* E-Réputation & Médias Sociaux */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            E-Réputation & Médias Sociaux
          </h2>
          <p className="text-sm text-muted-foreground">
            Suivi quotidien de votre présence en ligne et couverture médiatique
          </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <MediaImpactWidget />
          <SocialPulseWidget />
          <ShareOfVoiceWidget />
          <EchoResonanceWidget />
        </div>
      </div>

      <Separator />

      {/* Analyseur de Réactions */}
      <ReactionAnalyzerSection />

      <Separator />

      {/* Sujets à Valoriser */}
      <SujetsValorisationSection onGeneratePost={handleGeneratePost} />

      <Separator />

      {/* Posts à Amplifier */}
      <PostsAmplifierSection onPrepareResponse={handleGeneratePost} />

      <Separator />
      <MatinaleBriefingSection />
      <Separator />
      <div id="kit-communication">
        <ContentGeneratorSection sujetRef={sujetSetterRef} />
      </div>
      <Separator />
      <QuickToolsSection />
    </div>
  );
}
