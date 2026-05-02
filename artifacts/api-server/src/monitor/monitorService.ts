// monitorService.ts — Main ClawGuard monitoring loop
// Runs a 30-second cycle: fetch stats → AI analysis → alert → log on-chain

import { logger } from "../lib/logger.js";
import { getNearStats, type NearStats } from "./nearStats.js";
import { getXrplStats, type XrplStats } from "./xrplStats.js";
import { analyzeWithOpenClaw, type RiskLevel, type RiskAnalysis } from "./openclawReasoner.js";
import { sendTelegramAlert } from "./telegramAlert.js";
import { logAlertOnXrpl } from "./xrplLogger.js";
import { db } from "@workspace/db";
import { alertsTable } from "@workspace/db";

export interface MonitorState {
  isRunning: boolean;
  lastCycleAt: Date | null;
  currentRiskLevel: RiskLevel | null;
  currentAnalysis: string | null;
  cycleCount: number;
  alertCount: number;
  uptimeSince: Date;
  lastNearStats: NearStats | null;
  lastXrplStats: XrplStats | null;
}

const state: MonitorState = {
  isRunning: false,
  lastCycleAt: null,
  currentRiskLevel: null,
  currentAnalysis: null,
  cycleCount: 0,
  alertCount: 0,
  uptimeSince: new Date(),
  lastNearStats: null,
  lastXrplStats: null,
};

export function getMonitorState(): Readonly<MonitorState> {
  return state;
}

export async function runMonitorCycle(): Promise<RiskAnalysis & { nearStats: NearStats; xrplStats: XrplStats }> {
  logger.info("🦞 [ClawGuard] Cycle starting...");

  // Step 1: Fetch blockchain stats in parallel
  const [nearStats, xrplStats] = await Promise.all([
    getNearStats(),
    getXrplStats(),
  ]);

  state.lastNearStats = nearStats;
  state.lastXrplStats = xrplStats;

  // Step 2: AI risk analysis
  const analysis = await analyzeWithOpenClaw(nearStats, xrplStats);

  logger.info(
    { riskLevel: analysis.riskLevel, analysis: analysis.analysis },
    "📊 [ClawGuard] Risk analysis result"
  );

  state.currentRiskLevel = analysis.riskLevel;
  state.currentAnalysis = analysis.analysis;
  state.cycleCount++;
  state.lastCycleAt = new Date();

  // Step 3: Alert and log for MEDIUM/HIGH risk
  let xrplTxHash: string | undefined;
  let telegramSent = false;

  if (analysis.riskLevel === "MEDIUM" || analysis.riskLevel === "HIGH") {
    state.alertCount++;
    logger.warn(
      { riskLevel: analysis.riskLevel },
      "🚨 [ClawGuard] Elevated risk detected — sending alerts"
    );

    // Fire both in parallel
    const [telegramResult, xrplResult] = await Promise.all([
      sendTelegramAlert(
        analysis.riskLevel,
        analysis.analysis,
        nearStats.blockHeight,
        xrplStats.ledgerIndex
      ),
      logAlertOnXrpl(analysis.riskLevel, analysis.analysis),
    ]);

    telegramSent = telegramResult;
    xrplTxHash = xrplResult.txHash;

    // Persist alert to DB
    try {
      await db.insert(alertsTable).values({
        riskLevel: analysis.riskLevel,
        analysis: analysis.analysis,
        nearBlockHeight: nearStats.blockHeight,
        xrplLedgerIndex: xrplStats.ledgerIndex,
        xrplTxHash: xrplTxHash ?? null,
        telegramSent,
      });
      logger.info("💾 [ClawGuard] Alert persisted to database");
    } catch (err) {
      logger.error({ err }, "❌ [ClawGuard] Failed to persist alert to database");
    }
  } else {
    // Still log LOW risk cycles occasionally
    try {
      if (state.cycleCount % 10 === 0) {
        await db.insert(alertsTable).values({
          riskLevel: "LOW",
          analysis: analysis.analysis,
          nearBlockHeight: nearStats.blockHeight,
          xrplLedgerIndex: xrplStats.ledgerIndex,
          telegramSent: false,
        });
      }
    } catch {
      // Ignore low-risk DB errors
    }
  }

  logger.info(
    { cycleCount: state.cycleCount, riskLevel: analysis.riskLevel },
    "✅ [ClawGuard] Cycle complete. Next check in 30 seconds."
  );

  return { ...analysis, nearStats, xrplStats };
}

let monitorInterval: NodeJS.Timeout | null = null;

export function startMonitor(): void {
  if (state.isRunning) {
    logger.warn("⚠️ [ClawGuard] Monitor already running");
    return;
  }

  state.isRunning = true;
  state.uptimeSince = new Date();
  logger.info("🚀 [ClawGuard] Starting autonomous monitor...");

  // Run immediately then every 30 seconds
  runMonitorCycle().catch((err) => {
    logger.error({ err }, "❌ [ClawGuard] Initial cycle failed");
  });

  monitorInterval = setInterval(() => {
    runMonitorCycle().catch((err) => {
      logger.error({ err }, "❌ [ClawGuard] Monitor cycle failed");
    });
  }, 30000);
}

export function stopMonitor(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
  }
  state.isRunning = false;
  logger.info("🛑 [ClawGuard] Monitor stopped");
}
