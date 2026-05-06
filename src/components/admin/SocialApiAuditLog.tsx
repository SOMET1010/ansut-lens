import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Loader2, History, RotateCw, Plus, Pencil, Trash2, CalendarIcon, X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type AuditAction = 'create' | 'update' | 'rotate' | 'delete';

type AuditRow = {
  id: string;
  connector: string;
  secret_name: string;
  action: AuditAction;
  performed_by: string | null;
  value_preview: string | null;
  notes: string | null;
  created_at: string;
};

const ACTION_META: Record<AuditAction, { label: string; className: string; Icon: typeof Plus }> = {
  create: { label: 'Création', className: 'bg-emerald-100 text-emerald-800 border-emerald-300', Icon: Plus },
  update: { label: 'Mise à jour', className: 'bg-blue-100 text-blue-800 border-blue-300', Icon: Pencil },
  rotate: { label: 'Rotation', className: 'bg-purple-100 text-purple-800 border-purple-300', Icon: RotateCw },
  delete: { label: 'Suppression', className: 'bg-red-100 text-red-800 border-red-300', Icon: Trash2 },
};

const PAGE_SIZE = 20;

export function SocialApiAuditLog({ refreshKey = 0 }: { refreshKey?: number }) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [connectors, setConnectors] = useState<string[]>([]);
  const [connectorFilter, setConnectorFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [page, setPage] = useState(0);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(0);
  }, [connectorFilter, actionFilter, search, dateFrom, dateTo, refreshKey]);

  // Load distinct connectors for the dropdown
  useEffect(() => {
    supabase
      .from('social_api_audit_log')
      .select('connector')
      .limit(1000)
      .then(({ data }) => {
        const set = new Set<string>();
        (data || []).forEach((r: any) => r.connector && set.add(r.connector));
        setConnectors(Array.from(set).sort());
      });
  }, [refreshKey]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      let q = supabase
        .from('social_api_audit_log')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      if (connectorFilter !== 'all') q = q.eq('connector', connectorFilter);
      if (actionFilter !== 'all') q = q.eq('action', actionFilter);
      if (dateFrom) q = q.gte('created_at', new Date(dateFrom.setHours(0, 0, 0, 0)).toISOString());
      if (dateTo) {
        const end = new Date(dateTo);
        end.setHours(23, 59, 59, 999);
        q = q.lte('created_at', end.toISOString());
      }
      if (search.trim()) {
        const s = search.trim().replace(/[%,]/g, '');
        q = q.or(`secret_name.ilike.%${s}%,connector.ilike.%${s}%,notes.ilike.%${s}%`);
      }

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      const { data, error, count } = await q.range(from, to);
      if (cancelled) return;
      if (error) {
        setRows([]);
        setTotal(0);
        setLoading(false);
        return;
      }
      const list = (data || []) as AuditRow[];
      setRows(list);
      setTotal(count || 0);

      const ids = Array.from(new Set(list.map((r) => r.performed_by).filter(Boolean) as string[]));
      const missing = ids.filter((id) => !(id in profiles));
      if (missing.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', missing);
        const map: Record<string, string> = { ...profiles };
        (profs || []).forEach((p: any) => {
          map[p.id] = p.full_name || p.id.slice(0, 8);
        });
        if (!cancelled) setProfiles(map);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey, connectorFilter, actionFilter, search, dateFrom, dateTo, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = connectorFilter !== 'all' || actionFilter !== 'all' || !!search || !!dateFrom || !!dateTo;

  const resetFilters = () => {
    setConnectorFilter('all');
    setActionFilter('all');
    setSearch('');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <History className="h-5 w-5 text-primary" />
          Journal d'audit — paramètres API sociaux
        </CardTitle>
        <CardDescription>
          Toute modification (création, mise à jour, rotation, suppression) est enregistrée.
          Les valeurs des secrets ne sont jamais affichées en clair (uniquement les 4 derniers caractères).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Filter bar */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <Input
            placeholder="Recherche (nom secret, notes…)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:col-span-2"
          />

          <Select value={connectorFilter} onValueChange={setConnectorFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Connecteur" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les connecteurs</SelectItem>
              {connectors.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les actions</SelectItem>
              <SelectItem value="create">Création</SelectItem>
              <SelectItem value="update">Mise à jour</SelectItem>
              <SelectItem value="rotate">Rotation</SelectItem>
              <SelectItem value="delete">Suppression</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('flex-1 justify-start text-left font-normal text-xs', !dateFrom && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-1 h-3.5 w-3.5" />
                  {dateFrom ? format(dateFrom, 'dd/MM/yy') : 'Du'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className={cn('p-3 pointer-events-auto')} />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('flex-1 justify-start text-left font-normal text-xs', !dateTo && 'text-muted-foreground')}>
                  <CalendarIcon className="mr-1 h-3.5 w-3.5" />
                  {dateTo ? format(dateTo, 'dd/MM/yy') : 'Au'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className={cn('p-3 pointer-events-auto')} />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {loading ? 'Chargement…' : `${total} entrée${total > 1 ? 's' : ''} — page ${page + 1}/${totalPages}`}
          </span>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-xs">
              <X className="h-3 w-3 mr-1" /> Réinitialiser les filtres
            </Button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Aucune action ne correspond à ces critères.
          </p>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {rows.map((r) => {
              const meta = ACTION_META[r.action] || ACTION_META.update;
              const Icon = meta.Icon;
              const who = r.performed_by ? profiles[r.performed_by] || r.performed_by.slice(0, 8) : 'Système';
              return (
                <div
                  key={r.id}
                  className="flex items-start justify-between gap-3 border rounded-md px-3 py-2 text-sm bg-muted/20"
                >
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <Badge className={`${meta.className} gap-1 border shrink-0`}>
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </Badge>
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {r.connector} · <code className="text-xs">{r.secret_name}</code>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        par <strong>{who}</strong>
                        {r.value_preview && (
                          <>
                            {' '}· valeur <code>{r.value_preview}</code>
                          </>
                        )}
                        {r.notes && <> · {r.notes}</>}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {new Date(r.created_at).toLocaleString('fr-FR')}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Précédent
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page + 1} sur {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Suivant <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
