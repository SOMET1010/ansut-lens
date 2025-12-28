import { useState } from 'react';
import { Newspaper, FileText, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import type { Actualite } from '@/hooks/useActualites';
import type { Dossier } from '@/hooks/useDossiers';

interface ContextSelectorProps {
  actualites: Actualite[];
  dossiers: Dossier[];
  selectedActualites: Set<string>;
  selectedDossiers: Set<string>;
  onToggleActualite: (id: string) => void;
  onToggleDossier: (id: string) => void;
  onSelectAllActualites: () => void;
  onSelectAllDossiers: () => void;
  onClearAll: () => void;
}

export function ContextSelector({
  actualites,
  dossiers,
  selectedActualites,
  selectedDossiers,
  onToggleActualite,
  onToggleDossier,
  onSelectAllActualites,
  onSelectAllDossiers,
  onClearAll,
}: ContextSelectorProps) {
  const [actualitesOpen, setActualitesOpen] = useState(true);
  const [dossiersOpen, setDossiersOpen] = useState(true);

  const publishedDossiers = dossiers.filter(d => d.statut === 'publie');
  const totalSelected = selectedActualites.size + selectedDossiers.size;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">Contexte sélectionné</span>
        {totalSelected > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
            onClick={onClearAll}
          >
            <X className="h-3 w-3 mr-1" />
            Effacer
          </Button>
        )}
      </div>

      {/* Actualités Section */}
      <Collapsible open={actualitesOpen} onOpenChange={setActualitesOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between h-8 px-2 hover:bg-blue-500/10"
          >
            <div className="flex items-center gap-2">
              <Newspaper className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-xs font-medium">Actualités</span>
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {selectedActualites.size}/{actualites.length}
              </Badge>
            </div>
            {actualitesOpen ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="pt-1 space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-6 px-2 text-xs text-muted-foreground"
              onClick={onSelectAllActualites}
            >
              <Check className="h-3 w-3 mr-1" />
              {selectedActualites.size === actualites.length ? 'Tout désélectionner' : 'Tout sélectionner'}
            </Button>
            <ScrollArea className="max-h-32">
              <div className="space-y-0.5">
                {actualites.map((actu) => (
                  <label
                    key={actu.id}
                    className="flex items-start gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer group"
                  >
                    <Checkbox
                      checked={selectedActualites.has(actu.id)}
                      onCheckedChange={() => onToggleActualite(actu.id)}
                      className="mt-0.5 h-3.5 w-3.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate leading-tight group-hover:text-primary transition-colors">
                        {actu.titre}
                      </p>
                      {actu.source_nom && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          {actu.source_nom}
                        </p>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </ScrollArea>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Dossiers Section */}
      <Collapsible open={dossiersOpen} onOpenChange={setDossiersOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-between h-8 px-2 hover:bg-purple-500/10"
          >
            <div className="flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 text-purple-500" />
              <span className="text-xs font-medium">Dossiers</span>
              <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                {selectedDossiers.size}/{publishedDossiers.length}
              </Badge>
            </div>
            {dossiersOpen ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="pt-1 space-y-1">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start h-6 px-2 text-xs text-muted-foreground"
              onClick={onSelectAllDossiers}
            >
              <Check className="h-3 w-3 mr-1" />
              {selectedDossiers.size === publishedDossiers.length ? 'Tout désélectionner' : 'Tout sélectionner'}
            </Button>
            <ScrollArea className="max-h-32">
              <div className="space-y-0.5">
                {publishedDossiers.map((dossier) => (
                  <label
                    key={dossier.id}
                    className="flex items-start gap-2 p-1.5 rounded hover:bg-muted/50 cursor-pointer group"
                  >
                    <Checkbox
                      checked={selectedDossiers.has(dossier.id)}
                      onCheckedChange={() => onToggleDossier(dossier.id)}
                      className="mt-0.5 h-3.5 w-3.5"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate leading-tight group-hover:text-primary transition-colors">
                        {dossier.titre}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {dossier.categorie}
                      </p>
                    </div>
                  </label>
                ))}
                {publishedDossiers.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Aucun dossier publié
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
