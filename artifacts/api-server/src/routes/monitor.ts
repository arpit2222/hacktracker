// monitor.ts — REST API routes for ClawGuard monitoring dashboard

import { Router } from "express";
import { db } from "@workspace/db";
import { alertsTable } from "@workspace/db";
import { desc, eq, gte, count, sql } from "drizzle-orm";
import {
  getMonitorState,
  runMonitorCycle,
} from "../monitor/monitorService.js";
import { getNearStats } from "../monitor/nearStats.js";
import { getXrplStats } from "../monitor/xrplStats.js";

const router = Router();

// GET /api/monitor/status
router.get("/status", async (req, res) => {
  const state = getMonitorState();
  res.json({
    isRunning: state.isRunning,
    lastCycleAt: state.lastCycleAt?.toISOString() ?? null,
    currentRiskLevel: state.currentRiskLevel ?? "LOW",
    currentAnalysis: state.currentAnalysis ?? "Monitor initializing...",
    cycleCount: state.cycleCount,
    alertCount: state.alertCount,
    uptimeSince: state.uptimeSince.toISOString(),
  });
});

// GET /api/monitor/alerts
router.get("/alerts", async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const riskLevel = req.query.riskLevel as string | undefined;

  const query = db
    .select()
    .from(alertsTable)
    .orderBy(desc(alertsTable.createdAt))
    .limit(limit);

  const alerts = riskLevel
    ? await db
        .select()
        .from(alertsTable)
        .where(eq(alertsTable.riskLevel, riskLevel))
        .orderBy(desc(alertsTable.createdAt))
        .limit(limit)
    : await query;

  const totalResult = await db.select({ count: count() }).from(alertsTable);
  const total = totalResult[0]?.count ?? 0;

  res.json({ alerts, total });
});

// GET /api/monitor/stats
router.get("/stats", async (req, res) => {
  const state = getMonitorState();

  // Return cached stats if fresh (< 25s old), otherwise fetch new ones
  const cacheAge = state.lastCycleAt
    ? Date.now() - state.lastCycleAt.getTime()
    : Infinity;

  if (cacheAge < 25000 && state.lastNearStats && state.lastXrplStats) {
    res.json({
      nearStats: state.lastNearStats,
      xrplStats: state.lastXrplStats,
      fetchedAt: state.lastCycleAt!.toISOString(),
    });
    return;
  }

  const [nearStats, xrplStats] = await Promise.all([
    getNearStats(),
    getXrplStats(),
  ]);

  res.json({
    nearStats,
    xrplStats,
    fetchedAt: new Date().toISOString(),
  });
});

// POST /api/monitor/trigger
router.post("/trigger", async (req, res) => {
  req.log.info("Manual monitor cycle triggered");
  try {
    const result = await runMonitorCycle();
    res.json({
      success: true,
      message: `Cycle complete. Risk: ${result.riskLevel}`,
      riskLevel: result.riskLevel,
      analysis: result.analysis,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cycle failed";
    res.status(500).json({ success: false, message });
  }
});

// GET /api/monitor/summary
router.get("/summary", async (req, res) => {
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [totalResult, riskBreakdown, last24hResult, lastXrplLog] = await Promise.all([
    db.select({ count: count() }).from(alertsTable),
    db
      .select({ riskLevel: alertsTable.riskLevel, count: count() })
      .from(alertsTable)
      .groupBy(alertsTable.riskLevel),
    db
      .select({ count: count() })
      .from(alertsTable)
      .where(gte(alertsTable.createdAt, twentyFourHoursAgo)),
    db
      .select({ txHash: alertsTable.xrplTxHash })
      .from(alertsTable)
      .where(sql`${alertsTable.xrplTxHash} IS NOT NULL`)
      .orderBy(desc(alertsTable.createdAt))
      .limit(1),
  ]);

  const byRisk: Record<string, number> = {};
  for (const row of riskBreakdown) {
    byRisk[row.riskLevel] = Number(row.count);
  }

  res.json({
    totalAlerts: Number(totalResult[0]?.count ?? 0),
    highRiskCount: byRisk["HIGH"] ?? 0,
    mediumRiskCount: byRisk["MEDIUM"] ?? 0,
    lowRiskCount: byRisk["LOW"] ?? 0,
    last24hAlerts: Number(last24hResult[0]?.count ?? 0),
    averageCycleIntervalMs: 30000,
    lastXrplTxHash: lastXrplLog[0]?.txHash ?? null,
  });
});

export default router;
