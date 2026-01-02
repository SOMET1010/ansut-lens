import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, ClipboardList, UserPlus, Shield, UserX, UserCheck, Trash2, Filter, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AuditLog {
  id: string;
  admin_id: string;
  target_user_id: string | null;
  action: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
  admin_profile?: { full_name: string | null };
  target_profile?: { full_name: string | null };
}

const actionConfig: Record<string, { label: string; icon: typeof UserPlus; color: string }> = {
  user_invited: { label: "Invitation", icon: UserPlus, color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  role_changed: { label: "Rôle modifié", icon: Shield, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  user_disabled: { label: "Désactivation", icon: UserX, color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
  user_enabled: { label: "Réactivation", icon: UserCheck, color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  user_deleted: { label: "Suppression", icon: Trash2, color: "bg-red-500/20 text-red-400 border-red-500/30" },
};

const roleLabels: Record<string, string> = {
  admin: "Administrateur",
  user: "Utilisateur",
  council_user: "Membre Conseil",
  guest: "Invité",
};

export default function AuditLogsPage() {
  const [actionFilter, setActionFilter] = useState<string>("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-audit-logs", actionFilter],
    queryFn: async () => {
      let query = supabase
        .from("admin_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch admin and target profiles
      const adminIds = [...new Set(data.map((log) => log.admin_id))];
      const targetIds = [...new Set(data.map((log) => log.target_user_id).filter(Boolean))];
      const allUserIds = [...new Set([...adminIds, ...targetIds])];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", allUserIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      return data.map((log) => ({
        ...log,
        admin_profile: profileMap.get(log.admin_id),
        target_profile: log.target_user_id ? profileMap.get(log.target_user_id) : null,
      })) as AuditLog[];
    },
  });

  const formatDetails = (log: AuditLog): string => {
    const details = log.details || {};
    switch (log.action) {
      case "user_invited":
        return `${details.email || ""} • Rôle: ${roleLabels[details.role as string] || details.role}`;
      case "role_changed":
        return `${roleLabels[details.old_role as string] || details.old_role} → ${roleLabels[details.new_role as string] || details.new_role}`;
      case "user_disabled":
      case "user_enabled":
      case "user_deleted":
        return details.target_name as string || "";
      default:
        return JSON.stringify(details);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Link to="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-primary" />
            Historique d'audit
          </h1>
          <p className="text-muted-foreground">Traçabilité des actions administratives</p>
        </div>
      </div>

      <Card className="glass">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Actions récentes</CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrer par action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les actions</SelectItem>
                  <SelectItem value="user_invited">Invitations</SelectItem>
                  <SelectItem value="role_changed">Changements de rôle</SelectItem>
                  <SelectItem value="user_disabled">Désactivations</SelectItem>
                  <SelectItem value="user_enabled">Réactivations</SelectItem>
                  <SelectItem value="user_deleted">Suppressions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : logs && logs.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Date</TableHead>
                  <TableHead>Administrateur</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Utilisateur cible</TableHead>
                  <TableHead>Détails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const config = actionConfig[log.action] || { 
                    label: log.action, 
                    icon: ClipboardList, 
                    color: "bg-muted text-muted-foreground" 
                  };
                  const Icon = config.icon;

                  return (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: fr })}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {log.admin_profile?.full_name || "Inconnu"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={config.color}>
                          <Icon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {log.target_profile?.full_name || 
                         (log.details?.target_name as string) || 
                         (log.details?.full_name as string) || 
                         "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[300px] truncate">
                        {formatDetails(log)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Aucune action enregistrée
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
