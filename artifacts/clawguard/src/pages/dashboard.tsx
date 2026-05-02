import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMonitorStatus,
  getGetMonitorStatusQueryKey,
  useGetMonitorSummary,
  useListAlerts,
  getListAlertsQueryKey,
  useTriggerMonitorCycle,
} from "@workspace/api-client-react";
import { RiskBadge } from "@/components/RiskBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, ShieldAlert, Zap, Clock, Server, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

export default function Dashboard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: status, isLoading: isStatusLoading } = useGetMonitorStatus({
    query: {
      refetchInterval: 5000,
      queryKey: getGetMonitorStatusQueryKey(),
    },
  });

  const { data: summary, isLoading: isSummaryLoading } = useGetMonitorSummary();

  const alertsParams = { limit: 5 };
  const { data: alertsData, isLoading: isAlertsLoading } = useListAlerts(
    alertsParams,
    {
      query: {
        refetchInterval: 5000,
        queryKey: getListAlertsQueryKey(alertsParams),
      },
    }
  );

  const triggerMutation = useTriggerMonitorCycle();

  const handleTrigger = () => {
    triggerMutation.mutate(undefined, {
      onSuccess: (res) => {
        toast({
          title: "Cycle Triggered",
          description: res.message,
        });
        queryClient.invalidateQueries({ queryKey: getGetMonitorStatusQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListAlertsQueryKey() });
      },
      onError: (err) => {
        toast({
          title: "Failed to trigger cycle",
          description: String(err),
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">System Status</h1>
          <p className="text-muted-foreground mt-1">Real-time risk monitoring across NEAR & XRPL</p>
        </div>
        <Button
          onClick={handleTrigger}
          disabled={triggerMutation.isPending || (status && status.isRunning)}
          className="border border-primary text-primary hover:bg-primary/10 bg-transparent font-mono tracking-wider glow-cyan"
        >
          {triggerMutation.isPending || (status && status.isRunning) ? (
            <>
              <Activity className="mr-2 h-4 w-4 animate-spin" />
              ANALYZING...
            </>
          ) : (
            <>
              <Zap className="mr-2 h-4 w-4" />
              FORCE CYCLE
            </>
          )}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Risk Level</CardTitle>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mt-2">
              {isStatusLoading ? (
                <span className="text-muted-foreground">LOADING...</span>
              ) : status ? (
                <RiskBadge level={status.currentRiskLevel || "LOW"} pulse={true} className="text-lg px-3 py-1" />
              ) : (
                "UNKNOWN"
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              Last check: {status?.lastCycleAt ? format(new Date(status.lastCycleAt), 'HH:mm:ss') : 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Uptime</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mt-2 font-mono text-foreground">
              {isStatusLoading ? "..." : status?.uptimeSince ? format(new Date(status.uptimeSince), 'MM/dd HH:mm') : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              Total cycles: {status?.cycleCount || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold mt-2 font-mono text-foreground">
              {isSummaryLoading ? "..." : summary?.totalAlerts || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-2 font-mono">
              Last 24h: {summary?.last24hAlerts || 0}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur border-border/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Risk Distribution</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between mt-2 font-mono">
              <div className="text-center">
                <div className="text-destructive font-bold">{isSummaryLoading ? "-" : summary?.highRiskCount || 0}</div>
                <div className="text-[10px] text-muted-foreground">HIGH</div>
              </div>
              <div className="text-center">
                <div className="text-accent font-bold">{isSummaryLoading ? "-" : summary?.mediumRiskCount || 0}</div>
                <div className="text-[10px] text-muted-foreground">MED</div>
              </div>
              <div className="text-center">
                <div className="text-primary font-bold">{isSummaryLoading ? "-" : summary?.lowRiskCount || 0}</div>
                <div className="text-[10px] text-muted-foreground">LOW</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="col-span-2 bg-card/50 backdrop-blur border-border/50">
          <CardHeader>
            <CardTitle className="uppercase tracking-wider">Recent Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            {isAlertsLoading ? (
              <div className="flex flex-col gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 w-full animate-pulse bg-muted rounded-md" />
                ))}
              </div>
            ) : alertsData?.alerts && alertsData.alerts.length > 0 ? (
              <div className="space-y-4">
                {alertsData.alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start justify-between p-4 border border-border/50 rounded-md bg-background/50">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <RiskBadge level={alert.riskLevel} />
                        <span className="text-xs text-muted-foreground font-mono">
                          {format(new Date(alert.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mt-2">{alert.analysis}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground font-mono">
                NO ALERTS DETECTED
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}