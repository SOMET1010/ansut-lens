import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { TrendingUp, TrendingDown, Minus, Loader2 } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ChartDataPoint {
  date: string;
  total: number;
  invitations: number;
  roles: number;
  passwords: number;
  autres: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ChartDataPoint }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
        <p className="text-xs text-muted-foreground mb-2">
          {format(new Date(data.date), "EEEE d MMMM", { locale: fr })}
        </p>
        <p className="font-bold text-primary">
          {data.total} action{data.total > 1 ? "s" : ""}
        </p>
        {data.total > 0 && (
          <div className="text-xs mt-1 space-y-1">
            {data.invitations > 0 && (
              <p className="text-emerald-400">• {data.invitations} invitation{data.invitations > 1 ? "s" : ""}</p>
            )}
            {data.roles > 0 && (
              <p className="text-blue-400">• {data.roles} rôle{data.roles > 1 ? "s" : ""}</p>
            )}
            {data.passwords > 0 && (
              <p className="text-purple-400">• {data.passwords} MDP</p>
            )}
            {data.autres > 0 && (
              <p className="text-muted-foreground">• {data.autres} autre{data.autres > 1 ? "s" : ""}</p>
            )}
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function AuditActivityChart() {
  const thirtyDaysAgo = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    date.setHours(0, 0, 0, 0);
    return date;
  }, []);

  const { data: chartLogs, isLoading } = useQuery({
    queryKey: ["audit-logs-chart"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_logs")
        .select("action, created_at")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const chartData = useMemo(() => {
    const dayMap = new Map<string, ChartDataPoint>();

    // Initialize all 30 days
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = format(d, "yyyy-MM-dd");
      dayMap.set(key, {
        date: key,
        total: 0,
        invitations: 0,
        roles: 0,
        passwords: 0,
        autres: 0,
      });
    }

    // Fill with actual data
    if (chartLogs) {
      chartLogs.forEach((log) => {
        const dayKey = format(new Date(log.created_at), "yyyy-MM-dd");
        const entry = dayMap.get(dayKey);
        if (entry) {
          entry.total++;
          if (log.action === "user_invited") entry.invitations++;
          else if (log.action === "role_changed") entry.roles++;
          else if (log.action.includes("password")) entry.passwords++;
          else entry.autres++;
        }
      });
    }

    return Array.from(dayMap.values());
  }, [chartLogs]);

  const tendance = useMemo(() => {
    if (chartData.length < 30) return 0;
    const recent = chartData.slice(-15).reduce((sum, d) => sum + d.total, 0);
    const previous = chartData.slice(0, 15).reduce((sum, d) => sum + d.total, 0);
    if (previous === 0) return recent > 0 ? 100 : 0;
    return Math.round(((recent - previous) / previous) * 100);
  }, [chartData]);

  const totalActions = chartData.reduce((sum, d) => sum + d.total, 0);

  const TrendIcon = tendance > 0 ? TrendingUp : tendance < 0 ? TrendingDown : Minus;

  return (
    <Card className="glass">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            Activité sur 30 jours
            <span className="text-muted-foreground font-normal">
              ({totalActions} action{totalActions > 1 ? "s" : ""})
            </span>
          </CardTitle>
          <Badge
            variant="outline"
            className={
              tendance > 0
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                : tendance < 0
                ? "bg-red-500/20 text-red-400 border-red-500/30"
                : "bg-muted text-muted-foreground"
            }
          >
            <TrendIcon className="h-3 w-3 mr-1" />
            {tendance >= 0 ? "+" : ""}
            {tendance}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-48 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAuditTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) => format(new Date(d), "dd/MM")}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  tickLine={false}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                  interval="preserveStartEnd"
                  minTickGap={40}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorAuditTotal)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
