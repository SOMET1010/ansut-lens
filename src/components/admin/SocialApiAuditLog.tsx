import { useEffect, useState } from 'react';
import { Loader2, History, RotateCw, Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type AuditRow = {
  id: string;
  connector: string;
  secret_name: string;
  action: 'create' | 'update' | 'rotate' | 'delete';
  performed_by: string | null;
  value_preview: string | null;
  notes: string | null;
  created_at: string;
};

const ACTION_META: Record<AuditRow['action'], { label: string; className: string; Icon: typeof Plus }> = {
  create: { label: 'Création', className: 'bg-emerald-100 text-emerald-800 border-emerald-300', Icon: Plus },
  update: { label: 'Mise à jour', className: 'bg-blue-100 text-blue-800 border-blue-300', Icon: Pencil },
  rotate: { label: 'Rotation', className: 'bg-purple-100 text-purple-800 border-purple-300', Icon: RotateCw },
  delete: { label: 'Suppression', className: 'bg-red-100 text-red-800 border-red-300', Icon: Trash2 },
};

export function SocialApiAuditLog({ refreshKey = 0 }: { refreshKey?: number }) {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from('social_api_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (cancelled) return;
      if (error) {
        setRows([]);
        setLoading(false);
        return;
      }
      const list = (data || []) as AuditRow[];
      setRows(list);

      const ids = Array.from(new Set(list.map((r) => r.performed_by).filter(Boolean) as string[]));
      if (ids.length) {
        const { data: profs } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', ids);
        const map: Record<string, string> = {};
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
  }, [refreshKey]);

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
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Aucune action enregistrée pour le moment.
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
      </CardContent>
    </Card>
  );
}
