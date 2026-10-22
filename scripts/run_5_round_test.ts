import fs from "fs";
import path from "path";

// Load .env
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envText = fs.readFileSync(envPath, "utf8");
  for (const line of envText.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "");
  }
}

process.env.DEEPSEEK_TIMEOUT_MS = "3000";
process.env.FORCE_LIVE_DEEPSEEK = "true";

import prisma from "@/lib/prisma";
import { DEFAULT_GAME_ID, seedCampaignGame } from "@/prisma/seed";
import { executeFullTurnCycle } from "@/engine/state-machine";

async function run5RoundTest() {
  console.log("=== STARTING 5-ROUND SIMULATION TEST (GAME TESTER & UI EVALUATION) ===");
  console.log("Re-seeding campaign game:", DEFAULT_GAME_ID);
  await seedCampaignGame(DEFAULT_GAME_ID);

  const roundReports: any[] = [];

  for (let round = 1; round <= 5; round++) {
    const preGame = await prisma.game.findUniqueOrThrow({
      where: { id: DEFAULT_GAME_ID },
    });
    console.log(`\n--- EXECUTING ROUND ${round} (${preGame.currentSeason} ${preGame.currentYear} | Turn ${preGame.turnNumber}) ---`);

    const t0 = Date.now();
    const cycleRes = await executeFullTurnCycle(DEFAULT_GAME_ID);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    const resPhase: any = cycleRes.phaseResults.find(
      (p: any) => p.phaseExecuted === "RESOLUTION"
    );
    const logs = resPhase?.combatLogs ?? [];

    console.log(`[Round ${round} Complete in ${elapsed}s] Executed Orders: ${resPhase?.executedOrdersCount ?? 0}`);
    console.log(`Combat & Attrition Logs (${logs.length}):`);
    for (const log of logs.slice(0, 5)) {
      console.log(`   * ${log}`);
    }

    roundReports.push({
      round,
      turn: preGame.turnNumber,
      season: preGame.currentSeason,
      year: preGame.currentYear,
      elapsedSeconds: elapsed,
      ordersExecuted: resPhase?.executedOrdersCount ?? 0,
      logs: logs,
    });
  }

  const finalGame = await prisma.game.findUniqueOrThrow({
    where: { id: DEFAULT_GAME_ID },
    include: { factions: true, nodes: true },
  });

  console.log("\n=== 5 ROUNDS COMPLETE ===");
  console.log(`Final Game State: Turn ${finalGame.turnNumber} | ${finalGame.currentSeason} ${finalGame.currentYear}`);
  console.log("Saving 5-round report to scratch/five_round_test_report.json...");

  fs.writeFileSync(
    path.resolve(process.cwd(), "scratch/five_round_test_report.json"),
    JSON.stringify({ roundReports, finalGameSummary: { turn: finalGame.turnNumber, season: finalGame.currentSeason, year: finalGame.currentYear } }, null, 2)
  );
}

run5RoundTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Simulation error:", err);
    process.exit(1);
  });
