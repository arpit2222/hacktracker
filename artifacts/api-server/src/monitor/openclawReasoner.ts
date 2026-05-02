// openclawReasoner.ts — AI-powered risk analysis using OpenAI (via Replit AI Integrations)
// Analyzes NEAR and XRPL blockchain stats and returns a risk level + explanation.

import { logger } from "../lib/logger.js";
import { openai } from "@workspace/integrations-openai-ai-server";
import type { NearStats } from "./nearStats.js";
import type { XrplStats } from "./xrplStats.js";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface RiskAnalysis {
  riskLevel: RiskLevel;
  analysis: string;
}

function buildPrompt(nearStats: NearStats, xrplStats: XrplStats): string {
  return `You are ClawGuard, an autonomous blockchain risk monitor. Analyze the following live blockchain stats and assess the current risk level.

## NEAR Protocol Stats
- Block Height: ${nearStats.blockHeight}
- Epoch ID: ${nearStats.epochId}
- Active Validators: ${nearStats.validators}
- Gas Price: ${nearStats.gasPrice}
- Transaction Rate: ~${nearStats.transactionRate} TPS
- Total Stake: ${nearStats.totalStake} NEAR
${nearStats.error ? `- WARN Data fetch error: ${nearStats.error}` : ""}

## XRP Ledger Stats
- Ledger Index: ${xrplStats.ledgerIndex}
- Base Fee: ${xrplStats.baseFee} XRP
- Transactions in current ledger: ${xrplStats.txCount}
- Server State: ${xrplStats.serverState}
- Load Factor: ${xrplStats.loadFactor}
- Reserve Base: ${xrplStats.reserveBase} XRP
${xrplStats.error ? `- WARN Data fetch error: ${xrplStats.error}` : ""}

## Instructions
Based on these metrics, assess the RISK LEVEL as exactly one of: LOW, MEDIUM, or HIGH.
Consider: validator count drops, gas spikes, load factor > 1, server state anomalies, fetch errors, unusual transaction counts.

Respond ONLY in valid JSON with this exact structure:
{"riskLevel": "LOW"|"MEDIUM"|"HIGH", "analysis": "2-3 sentence explanation"}`;
}

function fallbackAnalysis(nearStats: NearStats, xrplStats: XrplStats): RiskAnalysis {
  logger.warn("Using fallback risk analysis (no AI configured)");

  let score = 0;
  const issues: string[] = [];

  if (nearStats.error) { score += 2; issues.push("NEAR RPC unavailable"); }
  if (xrplStats.error) { score += 2; issues.push("XRPL connection failed"); }
  if (nearStats.validators > 0 && nearStats.validators < 50) { score += 1; issues.push("Low NEAR validator count"); }
  if (xrplStats.loadFactor > 2) { score += 2; issues.push("High XRPL load factor"); }
  if (xrplStats.serverState !== "full" && xrplStats.serverState !== "unknown") {
    score += 1;
    issues.push(`XRPL server state: ${xrplStats.serverState}`);
  }

  const riskLevel: RiskLevel = score >= 4 ? "HIGH" : score >= 2 ? "MEDIUM" : "LOW";
  const analysis = issues.length > 0
    ? `Fallback analysis detected: ${issues.join(", ")}. Risk assessed as ${riskLevel}.`
    : "Networks appear stable. NEAR validators and XRPL ledger operating within normal parameters.";

  return { riskLevel, analysis };
}

export async function analyzeWithOpenClaw(
  nearStats: NearStats,
  xrplStats: XrplStats
): Promise<RiskAnalysis> {
  logger.info("Running AI risk analysis with OpenClaw...");

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      max_completion_tokens: 300,
      messages: [
        {
          role: "system",
          content: "You are a blockchain network health analyst. Respond only with valid JSON. No markdown, no extra text.",
        },
        {
          role: "user",
          content: buildPrompt(nearStats, xrplStats),
        },
      ],
    });

    const content = response.choices[0]?.message?.content ?? "";
    logger.info({ content }, "AI response received");

    // Extract JSON even if wrapped in markdown code blocks
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON found in response");

    const parsed = JSON.parse(jsonMatch[0]) as { riskLevel: string; analysis: string };
    const riskLevel = (["LOW", "MEDIUM", "HIGH"].includes(parsed.riskLevel)
      ? parsed.riskLevel
      : "LOW") as RiskLevel;

    logger.info({ riskLevel }, "Risk analysis complete");
    return { riskLevel, analysis: parsed.analysis };
  } catch (err) {
    logger.error({ err }, "AI analysis failed — using fallback");
    return fallbackAnalysis(nearStats, xrplStats);
  }
}
