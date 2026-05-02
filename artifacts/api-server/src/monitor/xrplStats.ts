// xrplStats.ts — Fetches live stats from the XRP Ledger via WebSocket

import { logger } from "../lib/logger.js";

export interface XrplStats {
  ledgerIndex: number;
  baseFee: string;
  txCount: number;
  serverState: string;
  loadFactor: number;
  reserveBase: string;
  error?: string;
}

const XRPL_WS_URL = "wss://s.altnet.rippletest.net:51233"; // testnet

export async function getXrplStats(): Promise<XrplStats> {
  logger.info("🔍 [ClawGuard] Fetching XRPL blockchain stats...");

  return new Promise((resolve) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        logger.warn("⏱️ [ClawGuard] XRPL stats timeout — using fallback");
        resolve({
          ledgerIndex: 0,
          baseFee: "0",
          txCount: 0,
          serverState: "unknown",
          loadFactor: 1,
          reserveBase: "0",
          error: "Connection timeout",
        });
      }
    }, 12000);

    try {
      // Use dynamic import to handle ESM xrpl package
      import("xrpl").then(({ Client }) => {
        const client = new Client(XRPL_WS_URL);

        client.connect().then(async () => {
          try {
            const [serverInfo, ledgerInfo] = await Promise.all([
              client.request({ command: "server_info" }),
              client.request({ command: "ledger", ledger_index: "current", transactions: true }),
            ]);

            const info = serverInfo.result.info;
            const ledger = ledgerInfo.result.ledger;

            const stats: XrplStats = {
              ledgerIndex: info.validated_ledger?.seq ?? 0,
              baseFee: String(info.validated_ledger?.base_fee_xrp ?? "0.00001"),
              txCount: Array.isArray(ledger.transactions) ? ledger.transactions.length : 0,
              serverState: info.server_state ?? "unknown",
              loadFactor: info.load_factor ?? 1,
              reserveBase: String(info.validated_ledger?.reserve_base_xrp ?? "10"),
            };

            logger.info(
              { ledgerIndex: stats.ledgerIndex, serverState: stats.serverState },
              "✅ [ClawGuard] XRPL stats fetched successfully"
            );

            clearTimeout(timeout);
            settled = true;
            await client.disconnect();
            resolve(stats);
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            logger.error({ err }, "❌ [ClawGuard] XRPL request error");
            clearTimeout(timeout);
            settled = true;
            await client.disconnect().catch(() => {});
            resolve({
              ledgerIndex: 0,
              baseFee: "0.00001",
              txCount: 0,
              serverState: "unknown",
              loadFactor: 1,
              reserveBase: "10",
              error: message,
            });
          }
        }).catch((err) => {
          const message = err instanceof Error ? err.message : String(err);
          logger.error({ err }, "❌ [ClawGuard] XRPL connect error");
          clearTimeout(timeout);
          settled = true;
          resolve({
            ledgerIndex: 0,
            baseFee: "0.00001",
            txCount: 0,
            serverState: "offline",
            loadFactor: 1,
            reserveBase: "10",
            error: message,
          });
        });
      }).catch((err) => {
        const message = err instanceof Error ? err.message : String(err);
        clearTimeout(timeout);
        settled = true;
        resolve({
          ledgerIndex: 0,
          baseFee: "0",
          txCount: 0,
          serverState: "unknown",
          loadFactor: 1,
          reserveBase: "0",
          error: message,
        });
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      clearTimeout(timeout);
      settled = true;
      resolve({
        ledgerIndex: 0,
        baseFee: "0",
        txCount: 0,
        serverState: "unknown",
        loadFactor: 1,
        reserveBase: "0",
        error: message,
      });
    }
  });
}
