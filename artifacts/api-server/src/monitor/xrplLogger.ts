// xrplLogger.ts — Logs risk alerts immutably on the XRP Ledger as memos
// Only fires for MEDIUM or HIGH risk levels — creates an on-chain audit trail

import { logger } from "../lib/logger.js";
import type { RiskLevel } from "./openclawReasoner.js";

export interface XrplLogResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export async function logAlertOnXrpl(
  riskLevel: RiskLevel,
  analysis: string
): Promise<XrplLogResult> {
  const secret = process.env.XRPL_SECRET;
  const address = process.env.XRPL_ADDRESS;

  if (!secret || !address) {
    logger.warn("⚠️ [ClawGuard] XRPL credentials not configured — skipping on-chain log");
    return { success: false, error: "XRPL credentials not configured" };
  }

  if (riskLevel === "LOW") {
    return { success: false, error: "LOW risk — no on-chain log needed" };
  }

  logger.info({ riskLevel }, "🔗 [ClawGuard] Logging alert on XRPL...");

  try {
    const { Client, Wallet } = await import("xrpl");
    const client = new Client("wss://s.altnet.rippletest.net:51233");

    await client.connect();

    const wallet = Wallet.fromSeed(secret);

    // Encode alert as memo data (hex)
    const memoData = Buffer.from(
      JSON.stringify({
        app: "ClawGuard",
        riskLevel,
        analysis: analysis.slice(0, 200),
        timestamp: new Date().toISOString(),
      })
    ).toString("hex");

    const tx = await client.autofill({
      TransactionType: "Payment",
      Account: wallet.address,
      Destination: address,
      Amount: "1", // 1 drop = minimum payment
      Memos: [
        {
          Memo: {
            MemoType: Buffer.from("ClawGuard/Alert").toString("hex"),
            MemoData: memoData,
          },
        },
      ],
    });

    const signed = wallet.sign(tx);
    const result = await client.submitAndWait(signed.tx_blob);

    await client.disconnect();

    const txHash = signed.hash;
    logger.info(
      { txHash, riskLevel },
      "✅ [ClawGuard] Alert logged on XRPL ledger"
    );

    return { success: true, txHash };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error({ err }, "❌ [ClawGuard] Failed to log alert on XRPL");
    return { success: false, error: message };
  }
}
