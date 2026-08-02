import { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, Bell, Check, Eye, Search, Filter, BellRing } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  useAlertesHistory,
  type NiveauFilter,
  type PeriodeFilter,
  type EtatFilter,
} from '@/hooks/useAlertesHistory';
import { PageContainer, PageHeader, ChiffreCle } from '@/components/common';

/**
 * Formule la phrase de lecture d'un compteur d'alertes.
 *
 * Les phrases generees mecaniquement donnaient « 0 alerte de niveau critique »,
 * tournure que personne n'emploie a l'oral. L'absence est enoncee comme telle,
 * et le singulier est ecrit en mots plutot qu'en chiffre.
 */
function lireAlertes(valeur: number, qualificatif: string): string {
  if (valeur === 0) return `Aucune alerte ${qualificatif}`;
  if (valeur === 1) return `Une alerte ${qualificatif}`;
  return `${valeur} alertes ${qualificatif}`;
}

const NIVEAU_CONFIG = {
  critical: {
    icon: AlertTriangle,
    label: 'Critique',
    className: 'bg-destructive/10 text-[hsl(var(--signal-critical))] border-destructive/20',
  },
  warning: {
    icon: AlertCircle,
    label: 'Avertissement',
    className: 'bg-accent/10 text-[hsl(var(--signal-warning))] border-accent/20',
  },
  info: {
    icon: Info,
    label: 'Information',
    className: 'bg-primary/10 text-primary border-primary/20',
  },
};

export default function AlertesHistoryPage() {
  const [niveau, setNiveau] = useState<NiveauFilter>('all');
  const [periode, setPeriode] = useState<PeriodeFilter>('7d');
  const [etat, setEtat] = useState<EtatFilter>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { alertes, total, totalPages, stats, isLoading, markAsRead, markAsTreated, markAllAsRead } =
    useAlertesHistory({ niveau, periode, etat, search, page });

  return (
    <PageContainer>
      <div className="w-full py-6 space-y-6">
        {/* Header */}
        <PageHeader
          titre="Alertes"
          description="Historique des alertes déclenchées par la surveillance, et suivi de leur traitement."
          icon={BellRing}
          actions={
            <Button variant="outline" onClick={markAllAsRead} disabled={stats.unread === 0} className="min-h-11 sm:min-h-9">
              <Check className="h-4 w-4 mr-2" />
              Tout marquer comme lu
            </Button>
          }
        />

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ChiffreCle
            libelle="Critiques"
            valeur={stats.critical}
            lecture={lireAlertes(stats.critical, 'critique')}
            icon={AlertTriangle}
            isLoading={isLoading}
          />
          <ChiffreCle
            libelle="Avertissements"
            valeur={stats.warning}
            lecture={lireAlertes(stats.warning, 'd’avertissement')}
            icon={AlertCircle}
            isLoading={isLoading}
          />
          <ChiffreCle
            libelle="Informations"
            valeur={stats.info}
            lecture={lireAlertes(stats.info, 'd’information')}
            icon={Info}
            isLoading={isLoading}
          />
          <ChiffreCle
            libelle="Total période"
            valeur={stats.total}
            lecture={
              stats.total === 0
                ? 'Aucune alerte sur la période'
                : stats.total === 1
                  ? 'Une alerte au total sur la période'
                  : `${stats.total} alertes au total sur la période`
            }
            icon={Bell}
            isLoading={isLoading}
          />
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher dans les alertes..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <Select value={niveau} onValueChange={(v) => { setNiveau(v as NiveauFilter); setPage(1); }}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Niveau" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous niveaux</SelectItem>
                  <SelectItem value="critical">Critique</SelectItem>
                  <SelectItem value="warning">Avertissement</SelectItem>
                  <SelectItem value="info">Information</SelectItem>
                </SelectContent>
              </Select>
              <Select value={periode} onValueChange={(v) => { setPeriode(v as PeriodeFilter); setPage(1); }}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Période" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24h">24 heures</SelectItem>
                  <SelectItem value="7d">7 jours</SelectItem>
                  <SelectItem value="30d">30 jours</SelectItem>
                  <SelectItem value="all">Tout</SelectItem>
                </SelectContent>
              </Select>
              <Select value={etat} onValueChange={(v) => { setEtat(v as EtatFilter); setPage(1); }}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="État" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes</SelectItem>
                  <SelectItem value="unread">Non lues</SelectItem>
                  <SelectItem value="read">Lues</SelectItem>
                  <SelectItem value="treated">Traitées</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Alerts List */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-start gap-4 p-4 border border-border rounded-lg">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : alertes.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium">Aucune alerte</h3>
                <p className="text-muted-foreground">
                  Aucune alerte ne correspond à vos critères de recherche
                </p>
              </div>
            ) : (
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {alertes.map((alerte) => {
                    const config = NIVEAU_CONFIG[alerte.niveau as keyof typeof NIVEAU_CONFIG] ?? NIVEAU_CONFIG.info;
                    const Icon = config.icon;

                    return (
                      <div
                        key={alerte.id}
                        className={`flex items-start gap-4 p-4 border border-border rounded-lg transition-colors ${
                          !alerte.lue ? 'bg-accent/50' : ''
                        }`}
                      >
                        <div className={`p-2 rounded-full ${config.className}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-medium">{alerte.titre}</h4>
                              <p className="text-sm text-muted-foreground line-clamp-2">{alerte.message}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {!alerte.lue && (
                                <Badge variant="secondary" className="text-xs">
                                  Non lue
                                </Badge>
                              )}
                              {alerte.traitee && (
                                <Badge variant="outline" className="text-xs text-primary border-primary/20">
                                  Traitée
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <span
                              className="text-xs text-muted-foreground"
                              title={format(new Date(alerte.created_at), 'PPpp', { locale: fr })}
                            >
                              {formatDistanceToNow(new Date(alerte.created_at), {
                                addSuffix: true,
                                locale: fr,
                              })}
                            </span>
                            <div className="flex items-center gap-2">
                              {!alerte.lue && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsRead(alerte.id)}
                                  aria-label="Marquer l'alerte comme lue"
                                  className="min-h-11 sm:min-h-9"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  Marquer lue
                                </Button>
                              )}
                              {!alerte.traitee && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => markAsTreated(alerte.id)}
                                  aria-label="Traiter l'alerte"
                                  className="min-h-11 sm:min-h-9"
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Traiter
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  aria-label="Page précédente"
                />
              </PaginationItem>
              {[...Array(Math.min(5, totalPages))].map((_, i) => {
                const pageNum = i + 1;
                return (
                  <PaginationItem key={pageNum}>
                    <PaginationLink
                      onClick={() => setPage(pageNum)}
                      isActive={page === pageNum}
                      className="cursor-pointer"
                      aria-label={`Aller à la page ${pageNum}`}
                    >
                      {pageNum}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  aria-label="Page suivante"
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </PageContainer>
  );
}
