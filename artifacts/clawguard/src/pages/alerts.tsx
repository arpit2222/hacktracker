import React, { useState } from "react";
import { useListAlerts } from "@workspace/api-client-react";
import { RiskBadge } from "@/components/RiskBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { ExternalLink, Send } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type RiskLevel, getListAlertsQueryKey } from "@workspace/api-client-react";

export default function Alerts() {
  const [riskFilter, setRiskFilter] = useState<string>("ALL");

  const params = riskFilter !== "ALL"
    ? { limit: 50, riskLevel: riskFilter as RiskLevel }
    : { limit: 50 };

  const { data: alertsData, isLoading } = useListAlerts(params, {
    query: { refetchInterval: 10000, queryKey: getListAlertsQueryKey(params) },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">Alert History</h1>
          <p className="text-muted-foreground mt-1">Immutable ledger of detected anomalies</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-[150px] font-mono border-primary/50 text-primary">
              <SelectValue placeholder="Risk Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">ALL LEVELS</SelectItem>
              <SelectItem value="HIGH">HIGH</SelectItem>
              <SelectItem value="MEDIUM">MEDIUM</SelectItem>
              <SelectItem value="LOW">LOW</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="bg-card/50 backdrop-blur border-border/50">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground font-mono animate-pulse">
              LOADING LEDGER DATA...
            </div>
          ) : alertsData?.alerts && alertsData.alerts.length > 0 ? (
            <div className="divide-y divide-border/50">
              {alertsData.alerts.map((alert) => (
                <div key={alert.id} className="p-4 hover:bg-muted/10 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <RiskBadge level={alert.riskLevel} />
                      <span className="text-xs text-muted-foreground font-mono">
                        {format(new Date(alert.createdAt), 'MMM dd, yyyy HH:mm:ss')}
                      </span>
                    </div>
                    {alert.telegramSent && (
                      <span className="text-xs text-primary flex items-center gap-1 font-mono">
                        <Send className="h-3 w-3" />
                        TELEGRAM SENT
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-foreground my-3">{alert.analysis}</p>
                  <div className="flex items-center gap-6 text-xs text-muted-foreground font-mono">
                    <div>NEAR BLOCK: <span className="text-foreground">{alert.nearBlockHeight}</span></div>
                    <div>XRPL LEDGER: <span className="text-foreground">{alert.xrplLedgerIndex}</span></div>
                    {alert.xrplTxHash && (
                      <a
                        href={`https://testnet.xrpl.org/transactions/${alert.xrplTxHash}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        TX: {alert.xrplTxHash.substring(0, 8)}... <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
              <div className="text-muted-foreground font-mono">NO ALERTS FOUND</div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}