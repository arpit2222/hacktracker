import React from "react";
import { useGetCurrentStats, getGetCurrentStatsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Database, Zap } from "lucide-react";
import { format } from "date-fns";

export default function Stats() {
  const { data: stats, isLoading } = useGetCurrentStats({
    query: {
      refetchInterval: 15000,
      queryKey: getGetCurrentStatsQueryKey(),
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">Network Metrics</h1>
          <p className="text-muted-foreground mt-1">Live telemetry from observed blockchains</p>
        </div>
        <div className="text-xs text-muted-foreground font-mono flex items-center gap-2">
          <Activity className="h-3 w-3 animate-pulse text-primary" />
          {stats?.fetchedAt ? `LAST SYNC: ${format(new Date(stats.fetchedAt), 'HH:mm:ss')}` : 'SYNCING...'}
        </div>
      </div>

      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="h-64 bg-muted animate-pulse rounded-md" />
          <div className="h-64 bg-muted animate-pulse rounded-md" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* NEAR Stats */}
          <Card className="bg-card/50 backdrop-blur border-primary/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Database className="w-32 h-32" />
            </div>
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-xl flex items-center gap-2 uppercase tracking-widest text-primary">
                <Database className="h-5 w-5" />
                NEAR Protocol
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6 font-mono relative z-10">
              {stats?.nearStats?.error ? (
                <div className="text-destructive">ERROR: {stats.nearStats.error}</div>
              ) : (
                <>
                  <div className="flex justify-between items-center border-b border-border/50 pb-2">
                    <span className="text-muted-foreground text-sm">BLOCK HEIGHT</span>
                    <span className="text-foreground text-lg font-bold">{stats?.nearStats?.blockHeight?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/50 pb-2">
                    <span className="text-muted-foreground text-sm">EPOCH ID</span>
                    <span className="text-foreground truncate max-w-[150px]" title={stats?.nearStats?.epochId}>
                      {stats?.nearStats?.epochId}
                    </span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/50 pb-2">
                    <span className="text-muted-foreground text-sm">VALIDATORS</span>
                    <span className="text-foreground">{stats?.nearStats?.validators}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/50 pb-2">
                    <span className="text-muted-foreground text-sm">GAS PRICE</span>
                    <span className="text-foreground">{stats?.nearStats?.gasPrice}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2">
                    <span className="text-muted-foreground text-sm">TX RATE</span>
                    <span className="text-primary font-bold">{stats?.nearStats?.transactionRate} tx/s</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* XRPL Stats */}
          <Card className="bg-card/50 backdrop-blur border-accent/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <Zap className="w-32 h-32" />
            </div>
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-xl flex items-center gap-2 uppercase tracking-widest text-accent">
                <Zap className="h-5 w-5" />
                XRP Ledger
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6 font-mono relative z-10">
              {stats?.xrplStats?.error ? (
                <div className="text-destructive">ERROR: {stats.xrplStats.error}</div>
              ) : (
                <>
                  <div className="flex justify-between items-center border-b border-border/50 pb-2">
                    <span className="text-muted-foreground text-sm">LEDGER INDEX</span>
                    <span className="text-foreground text-lg font-bold">{stats?.xrplStats?.ledgerIndex?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/50 pb-2">
                    <span className="text-muted-foreground text-sm">TX COUNT</span>
                    <span className="text-foreground">{stats?.xrplStats?.txCount}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/50 pb-2">
                    <span className="text-muted-foreground text-sm">BASE FEE</span>
                    <span className="text-foreground">{stats?.xrplStats?.baseFee} drops</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/50 pb-2">
                    <span className="text-muted-foreground text-sm">SERVER STATE</span>
                    <span className="text-foreground">{stats?.xrplStats?.serverState}</span>
                  </div>
                  <div className="flex justify-between items-center pb-2">
                    <span className="text-muted-foreground text-sm">LOAD FACTOR</span>
                    <span className="text-accent font-bold">{stats?.xrplStats?.loadFactor}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}