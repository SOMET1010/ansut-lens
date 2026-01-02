import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  Building2, MapPin, Star, AlertTriangle, Bell, 
  Twitter, Linkedin, Newspaper, ExternalLink,
  Wifi, Wallet, Landmark, GraduationCap, Activity
} from 'lucide-react';
import { CERCLE_LABELS, SOUS_CATEGORIE_LABELS } from '@/hooks/usePersonnalites';
import { 
  useDerniereMetriqueSPDI, 
  useRecommandationsSPDI, 
  useToggleSuiviSPDI,
  INTERPRETATION_LABELS,
} from '@/hooks/usePresenceDigitale';
import { SPDIGaugeCard, SPDIRecommandations } from '@/components/spdi';
import type { Personnalite, CercleStrategique, Tendance } from '@/types';
import { cn } from '@/lib/utils';

interface ActeurDetailProps {
  personnalite: Personnalite | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getCercleColors = (cercle: CercleStrategique) => {
  switch (cercle) {
    case 1: return { bg: 'bg-blue-500/10', text: 'text-blue-500', border: 'border-blue-500' };
    case 2: return { bg: 'bg-orange-500/10', text: 'text-orange-500', border: 'border-orange-500' };
    case 3: return { bg: 'bg-green-500/10', text: 'text-green-500', border: 'border-green-500' };
    case 4: return { bg: 'bg-purple-500/10', text: 'text-purple-500', border: 'border-purple-500' };
  }
};

const getCategorieIcon = (categorie?: string) => {
  switch (categorie) {
    case 'fai': return Wifi;
    case 'fintech': return Wallet;
    case 'regulateur':
    case 'politique': return Landmark;
    case 'expert': return GraduationCap;
    default: return Building2;
  }
};

export function ActeurDetail({ personnalite, open, onOpenChange }: ActeurDetailProps) {
  const toggleSuivi = useToggleSuiviSPDI();
  
  // Récupérer les données SPDI si le suivi est actif (accès direct aux champs optionnels)
  const { data: metriqueSPDI } = useDerniereMetriqueSPDI(
    personnalite?.suivi_spdi_actif ? personnalite?.id : undefined
  );
  const { data: recommandationsSPDI } = useRecommandationsSPDI(
    personnalite?.suivi_spdi_actif ? personnalite?.id : undefined
  );
  
  if (!personnalite) return null;

  const cercleColors = getCercleColors(personnalite.cercle);
  const CategorieIcon = getCategorieIcon(personnalite.categorie);
  const initials = `${personnalite.prenom?.[0] || ''}${personnalite.nom[0]}`.toUpperCase();
  const stars = Math.round((personnalite.score_influence / 100) * 5);
  const cercleInfo = CERCLE_LABELS[personnalite.cercle];
  
  // Accès direct aux champs SPDI optionnels (sans cast)
  const suiviSPDIActif = personnalite.suivi_spdi_actif ?? false;
  const scoreSPDI = personnalite.score_spdi_actuel ?? 0;
  const tendanceSPDI = (personnalite.tendance_spdi ?? 'stable') as Tendance;
  
  const handleToggleSuivi = () => {
    toggleSuivi.mutate({ 
      personnaliteId: personnalite.id, 
      actif: !suiviSPDIActif 
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-hidden">
        <ScrollArea className="h-full pr-4">
          <SheetHeader className="text-left pb-4">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                {personnalite.photo_url && (
                  <AvatarImage src={personnalite.photo_url} alt={personnalite.nom} />
                )}
                <AvatarFallback className={cn(cercleColors.bg, cercleColors.text, 'font-bold text-lg')}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <SheetTitle className="text-xl">
                  {personnalite.prenom} {personnalite.nom}
                </SheetTitle>
                <SheetDescription className="text-sm mt-1">
                  {personnalite.fonction}
                </SheetDescription>
                {personnalite.organisation && (
                  <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                    <Building2 className="h-3.5 w-3.5" />
                    {personnalite.organisation}
                  </div>
                )}
              </div>
            </div>
          </SheetHeader>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            <Badge className={cn('gap-1', cercleColors.bg, cercleColors.text, 'border', cercleColors.border)}>
              Cercle {personnalite.cercle}
            </Badge>
            {personnalite.categorie && (
              <Badge variant="secondary" className="gap-1">
                <CategorieIcon className="h-3 w-3" />
                {personnalite.categorie}
              </Badge>
            )}
            {personnalite.sous_categorie && (
              <Badge variant="outline">
                {SOUS_CATEGORIE_LABELS[personnalite.sous_categorie] || personnalite.sous_categorie}
              </Badge>
            )}
            {personnalite.niveau_alerte && personnalite.niveau_alerte !== 'normal' && (
              <Badge variant={personnalite.niveau_alerte === 'critique' ? 'destructive' : 'default'} className="gap-1">
                <AlertTriangle className="h-3 w-3" />
                Alerte {personnalite.niveau_alerte}
              </Badge>
            )}
          </div>

          {/* Localisation */}
          {(personnalite.pays || personnalite.zone) && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
              <MapPin className="h-4 w-4" />
              {personnalite.pays}{personnalite.zone && ` • ${personnalite.zone}`}
            </div>
          )}

          {/* Score d'influence */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg mb-4">
            <span className="text-sm font-medium">Score d'influence</span>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'h-4 w-4',
                      i < stars ? 'fill-secondary text-secondary' : 'text-muted-foreground/30'
                    )}
                  />
                ))}
              </div>
              <span className="text-sm font-bold">{personnalite.score_influence}%</span>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Bio */}
          {personnalite.bio && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2">Biographie</h3>
              <p className="text-sm text-muted-foreground">{personnalite.bio}</p>
            </div>
          )}

          {/* Thématiques */}
          {personnalite.thematiques && personnalite.thematiques.length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2">Thématiques suivies</h3>
              <div className="flex flex-wrap gap-1.5">
                {personnalite.thematiques.map((theme) => (
                  <Badge key={theme} variant="outline" className="text-xs">
                    {theme}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Réseaux sociaux */}
          {personnalite.reseaux && Object.keys(personnalite.reseaux).length > 0 && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2">Réseaux sociaux</h3>
              <div className="space-y-2">
                {Object.entries(personnalite.reseaux).map(([network, url]) => (
                  <a
                    key={network}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {network === 'twitter' && <Twitter className="h-4 w-4" />}
                    {network === 'linkedin' && <Linkedin className="h-4 w-4" />}
                    {!['twitter', 'linkedin'].includes(network) && <ExternalLink className="h-4 w-4" />}
                    <span className="capitalize">{network}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          <Separator className="my-4" />

          {/* Section SPDI - Présence Digitale Institutionnelle */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Présence Digitale Institutionnelle
            </h3>
            
            {/* Toggle suivi SPDI */}
            <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg mb-3">
              <div>
                <Label className="text-sm font-medium">Suivi SPDI</Label>
                <p className="text-xs text-muted-foreground">Activer le suivi de présence digitale</p>
              </div>
              <Switch 
                checked={suiviSPDIActif} 
                onCheckedChange={handleToggleSuivi}
                disabled={toggleSuivi.isPending}
              />
            </div>
            
            {/* Afficher les métriques si suivi actif */}
            {suiviSPDIActif && metriqueSPDI && (
              <div className="space-y-3">
                <SPDIGaugeCard 
                  score={metriqueSPDI.score_final}
                  tendance={tendanceSPDI}
                  compact
                />
                
                {recommandationsSPDI && recommandationsSPDI.length > 0 && (
                  <SPDIRecommandations 
                    recommandations={recommandationsSPDI.slice(0, 2)} 
                    compact 
                  />
                )}
              </div>
            )}
            
            {suiviSPDIActif && !metriqueSPDI && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Aucune métrique disponible. Les données seront collectées prochainement.
              </p>
            )}
          </div>

          <Separator className="my-4" />

          {/* Configuration des alertes */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Bell className="h-4 w-4" />
              Configuration des alertes
            </h3>
            <div className="space-y-3">
              {[
                { key: 'changement_position', label: 'Changement de position' },
                { key: 'annonce_majeure', label: 'Annonce majeure' },
                { key: 'polemique', label: 'Polémique / Controverse' },
                { key: 'financement', label: 'Financement / Régulation' },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={key} className="text-sm">{label}</Label>
                  <Switch
                    id={key}
                    checked={personnalite.alertes_config?.[key as keyof typeof personnalite.alertes_config] ?? true}
                    disabled
                  />
                </div>
              ))}

              {/* Alertes spécifiques FAI */}
              {personnalite.categorie === 'fai' && (
                <>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Panne de service</Label>
                    <Switch checked={personnalite.alertes_config?.panne_service ?? true} disabled />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Retrait d'une zone</Label>
                    <Switch checked={personnalite.alertes_config?.retrait_zone ?? true} disabled />
                  </div>
                </>
              )}

              {/* Alertes spécifiques Fintech */}
              {personnalite.categorie === 'fintech' && (
                <>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Incident de paiement</Label>
                    <Switch checked={personnalite.alertes_config?.incident_paiement ?? true} disabled />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Controverse réglementaire</Label>
                    <Switch checked={personnalite.alertes_config?.controverse_reglementaire ?? true} disabled />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Notes internes */}
          {personnalite.notes && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold mb-2">Notes internes</h3>
              <p className="text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg">
                {personnalite.notes}
              </p>
            </div>
          )}

          {/* Cercle info */}
          <div className={cn('p-3 rounded-lg border', cercleColors.border, cercleColors.bg)}>
            <h3 className={cn('text-sm font-semibold mb-1', cercleColors.text)}>
              Cercle {personnalite.cercle} — {cercleInfo.label}
            </h3>
            <p className="text-xs text-muted-foreground">{cercleInfo.description}</p>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
