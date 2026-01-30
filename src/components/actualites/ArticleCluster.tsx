import { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Share2, MessageSquare, Layers, User, Building, Sparkles, Loader2, ArrowRight, FileText, AlertCircle, Cpu, TrendingUp, Scale, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { calculateFreshness, type Actualite } from '@/hooks/useActualites';
import { cn } from '@/lib/utils';

// Interface pour le JSON d'analyse IA
interface AnalyseIA {
  tags?: string[];
  categorie?: string;
  importance?: number;
  quadrant_dominant?: string;
  quadrant_distribution?: Record<string, number>;
  alertes_declenchees?: string[];
  analyse_summary?: string;
  enrichi_le?: string;
}

// Parser le JSON avec gestion d'erreur
const parseAnalyseIA = (analyseString: string | null | undefined): AnalyseIA | null => {
  if (!analyseString) return null;
  try {
    return JSON.parse(analyseString) as AnalyseIA;
  } catch {
    return null;
  }
};

interface ArticleClusterProps {
  mainArticle: Actualite & {
    entites_personnes?: string[];
    entites_entreprises?: string[];
    score_pertinence?: number;
  };
  relatedArticles: Actualite[];
  onEnrich?: (id: string) => void;
  isEnriching?: boolean;
}

export function ArticleCluster({ 
  mainArticle, 
  relatedArticles, 
  onEnrich,
  isEnriching 
}: ArticleClusterProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const freshness = calculateFreshness(mainArticle.date_publication);
  const score = mainArticle.score_pertinence ?? mainArticle.importance ?? 50;
  
  const people = mainArticle.entites_personnes ?? [];
  const companies = mainArticle.entites_entreprises ?? [];
  
  const needsEnrichment = !mainArticle.importance || mainArticle.importance === 0;

  return (
    <Card className="overflow-hidden border-border/50 bg-card hover:shadow-md transition-shadow">
      {/* Header principal */}
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          {/* Badge de Score + Source */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge 
              variant="default" 
              className={cn(
                "font-bold",
                score >= 80 ? "bg-primary" : score >= 60 ? "bg-primary/80" : "bg-muted-foreground"
              )}
            >
              {score}% Pertinence
            </Badge>
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {mainArticle.source_nom ?? 'Source inconnue'} • {freshness.label}
            </span>
          </div>
          
          {/* Indicateur de clustering */}
          {relatedArticles.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-1 rounded-md hover:bg-primary/20 transition-colors"
            >
              <Layers className="h-3.5 w-3.5" />
              {relatedArticles.length} source{relatedArticles.length > 1 ? 's' : ''} similaire{relatedArticles.length > 1 ? 's' : ''}
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </Button>
          )}
        </div>

        {/* Titre & Résumé */}
        {mainArticle.source_url ? (
          <a 
            href={mainArticle.source_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="group"
          >
            <h3 className="text-lg font-bold text-foreground mb-2 leading-tight group-hover:text-primary transition-colors flex items-start gap-2">
              {mainArticle.titre}
              <ExternalLink className="h-4 w-4 mt-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </h3>
          </a>
        ) : (
          <h3 className="text-lg font-bold text-foreground mb-2 leading-tight">
            {mainArticle.titre}
          </h3>
        )}
        
        {mainArticle.resume && (
          <p className="text-muted-foreground text-sm mb-4 leading-relaxed line-clamp-2">
            {mainArticle.resume}
          </p>
        )}

        {/* Entités extraites */}
        {(people.length > 0 || companies.length > 0) && (
          <div className="flex flex-wrap gap-2 pt-3 border-t border-border/50">
            {people.map(person => (
              <Tooltip key={person}>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-accent text-accent-foreground text-xs font-medium border border-border cursor-default">
                    <User className="h-3 w-3" /> {person}
                  </span>
                </TooltipTrigger>
                <TooltipContent>Personne citée</TooltipContent>
              </Tooltip>
            ))}
            {companies.map(company => (
              <Tooltip key={company}>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-accent text-accent-foreground text-xs font-medium border border-border cursor-default">
                    <Building className="h-3 w-3" /> {company}
                  </span>
                </TooltipTrigger>
                <TooltipContent>Entreprise / Organisation</TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}

        {/* Tags */}
        {mainArticle.tags && mainArticle.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {mainArticle.tags.slice(0, 5).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {mainArticle.tags.length > 5 && (
              <Badge variant="secondary" className="text-xs">
                +{mainArticle.tags.length - 5}
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Zone expandable - articles similaires */}
      {isExpanded && relatedArticles.length > 0 && (
        <div className="bg-muted/50 border-t border-border/50 p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
            Autres couvertures du sujet
          </p>
          {relatedArticles.map((article) => (
            <div key={article.id} className="flex justify-between items-center text-sm group">
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="text-muted-foreground text-xs font-mono shrink-0 w-28 truncate">
                  {article.source_nom}
                </span>
                <span className="text-foreground truncate font-medium">
                  {article.titre}
                </span>
              </div>
              {article.source_url && (
                <a 
                  href={article.source_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:text-primary/80 shrink-0"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Footer Actions - Hiérarchie corrigée */}
      <div className="bg-muted/30 px-5 py-2.5 border-t border-border/50 flex justify-between items-center">
        {/* Actions sociales (inchangées) */}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
            <Share2 className="h-3.5 w-3.5 mr-1" /> Partager
          </Button>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-foreground">
            <MessageSquare className="h-3.5 w-3.5 mr-1" /> Commenter
          </Button>
        </div>
        
        {/* Actions principales (hiérarchie inversée) */}
        <div className="flex items-center gap-2">
          {/* Enrichir = discret maintenant */}
          {onEnrich && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEnrich(mainArticle.id)}
              disabled={isEnriching}
              className="text-xs text-primary hover:bg-primary/10"
            >
              {isEnriching ? (
                <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5 mr-1" />
              )}
              {needsEnrichment ? "Enrichir" : "Ré-analyser"}
            </Button>
          )}
          
          {/* Lire l'analyse = primaire maintenant */}
          <Button 
            variant="default" 
            size="sm" 
            className="text-xs font-bold gap-1"
            onClick={() => setIsAnalysisOpen(true)}
          >
            Lire l'analyse
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Modale d'analyse IA */}
      <Dialog open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Analyse IA
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <h3 className="font-bold text-lg leading-tight">{mainArticle.titre}</h3>
            
            <div className="border-t pt-4">
              {(() => {
                const analyseData = parseAnalyseIA(mainArticle.analyse_ia);
                
                if (analyseData) {
                  return (
                    <div className="space-y-6">
                      {/* Score + Catégorie */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Importance</p>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary transition-all" 
                                style={{ width: `${analyseData.importance ?? 0}%` }}
                              />
                            </div>
                            <span className="font-bold text-sm">{analyseData.importance ?? 0}/100</span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Catégorie</p>
                          <Badge variant="secondary">{analyseData.categorie ?? 'Non définie'}</Badge>
                        </div>
                      </div>

                      {/* Tags */}
                      {analyseData.tags && analyseData.tags.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">
                            Mots-clés détectés ({analyseData.tags.length})
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {analyseData.tags.map(tag => (
                              <Badge key={tag} variant="outline">{tag}</Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Quadrants */}
                      {analyseData.quadrant_distribution && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">Répartition par quadrant</p>
                          <div className="space-y-2">
                            {(() => {
                              const quadrantConfig: Record<string, { icon: React.ElementType; label: string }> = {
                                tech: { icon: Cpu, label: 'Tech' },
                                market: { icon: TrendingUp, label: 'Market' },
                                regulation: { icon: Scale, label: 'Regulation' },
                                reputation: { icon: Star, label: 'Reputation' }
                              };
                              
                              return Object.entries(analyseData.quadrant_distribution).map(([quadrant, score]) => {
                                const config = quadrantConfig[quadrant.toLowerCase()] ?? { 
                                  icon: null, 
                                  label: quadrant 
                                };
                                const IconComponent = config.icon;
                                
                                return (
                                  <div key={quadrant} className="flex items-center gap-2">
                                    <span className="w-28 text-xs flex items-center gap-1.5">
                                      {IconComponent && <IconComponent className="h-3.5 w-3.5 text-muted-foreground" />}
                                      <span className="capitalize">{config.label}</span>
                                    </span>
                                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-primary/70 transition-all" 
                                        style={{ width: `${score}%` }}
                                      />
                                    </div>
                                    <span className="text-xs w-8 text-right">{score}%</span>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}

                      {/* Alertes */}
                      {analyseData.alertes_declenchees && analyseData.alertes_declenchees.length > 0 && (
                        <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/30">
                          <p className="text-xs font-medium text-destructive mb-1">Alertes déclenchées</p>
                          <p className="text-sm">{analyseData.alertes_declenchees.join(', ')}</p>
                        </div>
                      )}

                      {/* Date */}
                      {analyseData.enrichi_le && (
                        <p className="text-xs text-muted-foreground pt-2 border-t">
                          Enrichi le {new Date(analyseData.enrichi_le).toLocaleString('fr-FR')}
                        </p>
                      )}
                    </div>
                  );
                }
                
                return (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 mb-2" />
                    <p className="text-center">
                      Cet article n'a pas encore été analysé.<br />
                      Cliquez sur "Enrichir" pour générer l'analyse.
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
