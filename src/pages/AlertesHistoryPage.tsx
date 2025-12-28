import { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, Bell, Check, Eye, Search, Filter } from 'lucide-react';
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

const NIVEAU_CONFIG = {
  critical: {
    icon: AlertTriangle,
    label: 'Critique',
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
  warning: {
    icon: AlertCircle,
    label: 'Avertissement',
    className: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  },
  info: {
    icon: Info,
    label: 'Information',
    className: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
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
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            Historique des Alertes
          </h1>
          <p className="text-muted-foreground">
            {stats.unread > 0
              ? `${stats.unread} alerte${stats.unread > 1 ? 's' : ''} non lue${stats.unread > 1 ? 's' : ''}`
              : 'Toutes les alertes sont lues'}
          </p>
        </div>
        <Button variant="outline" onClick={markAllAsRead} disabled={stats.unread === 0}>
          <Check className="h-4 w-4 mr-2" />
          Tout marquer comme lu
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Critiques</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <span className="text-2xl font-bold">{stats.critical}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avertissements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <span className="text-2xl font-bold">{stats.warning}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Informations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{stats.info}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total période</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.total}</span>
            </div>
          </CardContent>
        </Card>
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
                <div key={i} className="flex items-start gap-4 p-4 border rounded-lg">
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
                      className={`flex items-start gap-4 p-4 border rounded-lg transition-colors ${
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
                              <Badge variant="outline" className="text-xs text-green-600 border-green-600/20">
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
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
