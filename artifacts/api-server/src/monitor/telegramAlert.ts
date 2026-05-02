// telegramAlert.ts — Sends risk alerts to a Telegram bot
// Only fires for MEDIUM or HIGH risk levels

import { logger } from "../lib/logger.js";
import type { RiskLevel } from "./openclawReasoner.js";

export async function sendTelegramAlert(
  riskLevel: RiskLevel,
  analysis: string,
  nearBlockHeight: number,
  xrplLedgerIndex: number
): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    logger.warn("⚠️ [ClawGuard] Telegram not configured — skipping alert");
    return false;
  }

  if (riskLevel === "LOW") {
    logger.info("ℹ️ [ClawGuard] Risk is LOW — no Telegram alert needed");
    return false;
  }

  const emoji = riskLevel === "HIGH" ? "🚨" : "⚠️";
  const message = `${emoji} *ClawGuard Alert — ${riskLevel} Risk*

${analysis}

📦 NEAR Block: \`${nearBlockHeight}\`
🔗 XRPL Ledger: \`${xrplLedgerIndex}\`
🕐 Time: \`${new Date().toISOString()}\`

_Powered by ClawGuard AI Monitor_`;

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Telegram API error ${response.status}: ${body}`);
    }

    logger.info({ riskLevel }, "📱 [ClawGuard] Telegram alert sent successfully");
    return true;
  } catch (err) {
    logger.error({ err }, "❌ [ClawGuard] Failed to send Telegram alert");
    return false;
  }
}
