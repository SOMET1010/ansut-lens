import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  ArrowLeft, 
  ClipboardList, 
  UserPlus, 
  Shield, 
  UserX, 
  UserCheck, 
  Trash2, 
  Filter, 
  Loader2, 
  Download, 
  CalendarIcon, 
  X, 
  KeyRound,
  Search,
  Users
} from "lucide-react";
import AuditActivityChart from "@/components/admin/AuditActivityChart";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

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
  password_reset_requested: { label: "Lien MDP envoyé", icon: KeyRound, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  password_reset_completed: { label: "MDP réinitialisé", icon: KeyRound, color: "bg-green-500/20 text-green-400 border-green-500/30" },
};

const roleLabels: Record<string, string> = {
  admin: "Administrateur",
  user: "Utilisateur",
  council_user: "Membre Conseil",
  guest: "Invité",
};

const getInitials = (name: string | null | undefined): string => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export default function AuditLogsPage() {
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [actionFilter, startDate, endDate, searchQuery]);

  const { data: logsData, isLoading } = useQuery({
    queryKey: ["admin-audit-logs", actionFilter, startDate?.toISOString(), endDate?.toISOString(), page],
    queryFn: async () => {
      let query = supabase
        .from("admin_audit_logs")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }

      if (startDate) {
        query = query.gte("created_at", startDate.toISOString());
      }

      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        query = query.lte("created_at", endOfDay.toISOString());
      }

      // Pagination
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
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

      const enrichedLogs = data.map((log) => ({
        ...log,
        admin_profile: profileMap.get(log.admin_id),
        target_profile: log.target_user_id ? profileMap.get(log.target_user_id) : null,
      })) as AuditLog[];

      return {
        logs: enrichedLogs,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / PAGE_SIZE),
      };
    },
  });

  const logs = logsData?.logs ?? [];
  const totalCount = logsData?.total ?? 0;
  const totalPages = logsData?.totalPages ?? 1;

  // Calculate stats from current page logs
  const stats = useMemo(() => {
    return {
      total: totalCount,
      invitations: logs.filter((l) => l.action === "user_invited").length,
      roleChanges: logs.filter((l) => l.action === "role_changed").length,
      passwordResets: logs.filter(
        (l) => l.action === "password_reset_requested" || l.action === "password_reset_completed"
      ).length,
    };
  }, [logs, totalCount]);

  // Client-side text filtering
  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    if (!searchQuery.trim()) return logs;
    const query = searchQuery.toLowerCase();
    return logs.filter(
      (log) =>
        log.admin_profile?.full_name?.toLowerCase().includes(query) ||
        log.target_profile?.full_name?.toLowerCase().includes(query) ||
        (log.details?.target_name as string)?.toLowerCase().includes(query) ||
        (log.details?.target_email as string)?.toLowerCase().includes(query) ||
        (log.details?.email as string)?.toLowerCase().includes(query)
    );
  }, [logs, searchQuery]);

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
        return (details.target_name as string) || "";
      case "password_reset_requested":
        return `Email envoyé à ${(details.target_email as string) || "l'utilisateur"}`;
      case "password_reset_completed":
        return `Via ${details.method === "recovery_link" ? "lien de récupération" : (details.method as string) || "lien"}`;
      default:
        return JSON.stringify(details);
    }
  };

  const exportToCSV = () => {
    if (!filteredLogs || filteredLogs.length === 0) return;

    const headers = ["Date", "Administrateur", "Action", "Utilisateur cible", "Détails"];

    const rows = filteredLogs.map((log) => [
      format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: fr }),
      log.admin_profile?.full_name || "Inconnu",
      actionConfig[log.action]?.label || log.action,
      log.target_profile?.full_name ||
        (log.details?.target_name as string) ||
        (log.details?.full_name as string) ||
        "",
      formatDetails(log),
    ]);

    const csvContent =
      "\uFEFF" +
      [headers.join(";"), ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))].join(
        "\n"
      );

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setStartDate(undefined);
    setEndDate(undefined);
    setSearchQuery("");
    setActionFilter("all");
  };

  const hasActiveFilters = startDate || endDate || searchQuery || actionFilter !== "all";

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    
    // Always show first page
    pages.push(1);
    
    // Show ellipsis if current page is far from start
    if (page > 3) {
      pages.push("ellipsis");
    }
    
    // Show pages around current page
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      if (!pages.includes(i)) {
        pages.push(i);
      }
    }
    
    // Show ellipsis if current page is far from end
    if (page < totalPages - 2) {
      pages.push("ellipsis");
    }
    
    // Always show last page if more than 1 page
    if (totalPages > 1 && !pages.includes(totalPages)) {
      pages.push(totalPages);
    }
    
    return pages;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <ClipboardList className="h-8 w-8 text-primary/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Invitations</p>
                <p className="text-2xl font-bold">{stats.invitations}</p>
              </div>
              <UserPlus className="h-8 w-8 text-emerald-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rôles modifiés</p>
                <p className="text-2xl font-bold">{stats.roleChanges}</p>
              </div>
              <Shield className="h-8 w-8 text-blue-500/50" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resets MDP</p>
                <p className="text-2xl font-bold">{stats.passwordResets}</p>
              </div>
              <KeyRound className="h-8 w-8 text-purple-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Chart */}
      <AuditActivityChart />

      {/* Filters Card */}
      <Card className="glass">
        <CardContent className="pt-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Action Filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground hidden sm:block" />
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-full lg:w-[180px]">
                  <SelectValue placeholder="Type d'action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les actions</SelectItem>
                  <SelectItem value="user_invited">Invitations</SelectItem>
                  <SelectItem value="role_changed">Changements de rôle</SelectItem>
                  <SelectItem value="user_disabled">Désactivations</SelectItem>
                  <SelectItem value="user_enabled">Réactivations</SelectItem>
                  <SelectItem value="user_deleted">Suppressions</SelectItem>
                  <SelectItem value="password_reset_requested">Liens MDP envoyés</SelectItem>
                  <SelectItem value="password_reset_completed">MDP réinitialisés</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-[130px] justify-start text-left font-normal",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "dd/MM/yyyy") : "Début"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    disabled={(date) => (endDate ? date > endDate : false)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      "w-[130px] justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "dd/MM/yyyy") : "Fin"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => (startDate ? date < startDate : false)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2">
                  <X className="h-4 w-4 mr-1" />
                  Effacer
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                disabled={!filteredLogs || filteredLogs.length === 0}
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card className="glass">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5" />
              Actions récentes
            </CardTitle>
            <Badge variant="secondary" className="font-normal">
              {totalCount} résultat{totalCount > 1 ? "s" : ""} • Page {page}/{totalPages}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filteredLogs && filteredLogs.length > 0 ? (
            <>
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
                  {filteredLogs.map((log) => {
                    const config = actionConfig[log.action] || {
                      label: log.action,
                      icon: ClipboardList,
                      color: "bg-muted text-muted-foreground",
                    };
                    const Icon = config.icon;

                    return (
                      <TableRow key={log.id}>
                        <TableCell className="font-mono text-sm">
                          {format(new Date(log.created_at), "dd/MM/yy HH:mm", { locale: fr })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {getInitials(log.admin_profile?.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">
                              {log.admin_profile?.full_name || "Inconnu"}
                            </span>
                          </div>
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-6 flex flex-col items-center gap-2">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPage((p) => Math.max(1, p - 1))}
                          className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>

                      {getPageNumbers().map((pageNum, idx) =>
                        pageNum === "ellipsis" ? (
                          <PaginationItem key={`ellipsis-${idx}`}>
                            <PaginationEllipsis />
                          </PaginationItem>
                        ) : (
                          <PaginationItem key={pageNum}>
                            <PaginationLink
                              onClick={() => setPage(pageNum)}
                              isActive={page === pageNum}
                              className="cursor-pointer"
                            >
                              {pageNum}
                            </PaginationLink>
                          </PaginationItem>
                        )
                      )}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                          className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>

                  <p className="text-xs text-muted-foreground">
                    Page {page} sur {totalPages} • {totalCount} résultat{totalCount > 1 ? "s" : ""}
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? "Aucun résultat pour cette recherche" : "Aucune action enregistrée"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
