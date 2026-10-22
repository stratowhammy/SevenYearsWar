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

// Ensure live DeepSeek API timeout is set reasonably
process.env.DEEPSEEK_TIMEOUT_MS = "4500";
// Ensure controller knows it's allowed to call live DeepSeek
process.env.FORCE_LIVE_DEEPSEEK = "true";

import prisma from "@/lib/prisma";
import { seedCampaignGame } from "@/prisma/seed";
import { executeFullTurnCycle } from "@/engine/state-machine";
import { ControllerType, BotBehavior } from "@prisma/client";

const ROUND2_GAME_ID = "syw-campaign-round2";
const TELEMETRY_PATH = path.resolve(
  "/Users/sean/.gemini/antigravity/brain/4c10babe-6041-4c87-85b7-7435598dcf9c/scratch/campaign_round2_telemetry.json"
);

async function runCampaignRound2() {
  console.log("=== STARTING ROUND 2: 7-YEAR AUTONOMOUS AI CAMPAIGN (1756-1763) ===");
  console.log("Seeding fresh campaign with ID:", ROUND2_GAME_ID);

  await seedCampaignGame(ROUND2_GAME_ID);

  // Set ALL 30 roles across all 10 factions to COMPUTER and AUTONOMOUS
  const updatedRoles = await prisma.factionRole.updateMany({
    where: { faction: { gameId: ROUND2_GAME_ID } },
    data: {
      controller: ControllerType.COMPUTER,
      botBehavior: BotBehavior.AUTONOMOUS,
    },
  });
  console.log(`Configured ${updatedRoles.count}/30 seats to COMPUTER / AUTONOMOUS.`);

  const TOTAL_TURNS = 28;
  const turnSnapshots: any[] = [];

  for (let t = 1; t <= TOTAL_TURNS; t++) {
    const preTurnGame = await prisma.game.findUniqueOrThrow({
      where: { id: ROUND2_GAME_ID },
    });
    const year = preTurnGame.currentYear;
    const season = preTurnGame.currentSeason;
    const t0 = Date.now();

    const cycleResult = await executeFullTurnCycle(ROUND2_GAME_ID);
    const elapsedMs = Date.now() - t0;

    const orderSubPhase: any = cycleResult.phaseResults.find(
      (r: any) => r.phaseExecuted === "ORDER_SUBMISSION"
    );
    const resolutionPhase: any = cycleResult.phaseResults.find(
      (r: any) => r.phaseExecuted === "RESOLUTION"
    );
    const diplomaticTradePhase: any = cycleResult.phaseResults.find(
      (r: any) => r.phaseExecuted === "DIPLOMATIC_TRADE"
    );

    const submissions: any[] = orderSubPhase?.aiSubmissions ?? [];
    const liveApiHits = submissions.filter((s) => s.usedLiveApi).length;

    const factions = await prisma.faction.findMany({
      where: { gameId: ROUND2_GAME_ID },
      include: {
        nodesControlled: true,
        units: true,
      },
      orderBy: { type: "asc" },
    });

    const eventCounts = await prisma.gameEvent.groupBy({
      by: ["status"],
      where: { gameId: ROUND2_GAME_ID },
      _count: { id: true },
    });

    const newEventsThisTurn = await prisma.gameEvent.findMany({
      where: { gameId: ROUND2_GAME_ID, turnRecorded: preTurnGame.turnNumber },
      orderBy: { createdAt: "asc" },
    });

    const sampleOrders = submissions.flatMap((s) =>
      (s.orders ?? []).map((o: any) => ({
        faction: s.factionType,
        role: s.roleType,
        model: s.model,
        usedLiveApi: s.usedLiveApi,
        orderType: o.orderType,
        allocatedTreasury: o.allocatedTreasury,
        reasoning: o.reasoning,
      }))
    );

    // Group order types submitted
    const orderTypeCounts: Record<string, number> = {};
    for (const ord of sampleOrders) {
      orderTypeCounts[ord.orderType] = (orderTypeCounts[ord.orderType] || 0) + 1;
    }

    const snapshot = {
      turn: t,
      year,
      season,
      elapsedMs,
      totalRoleSubmissions: submissions.length,
      liveApiHits,
      orderTypeCounts,
      executedOrdersCount: resolutionPhase?.executedOrdersCount ?? 0,
      combatLogs: resolutionPhase?.combatLogs ?? [],
      offMapReport: diplomaticTradePhase?.offMapReport ?? null,
      eventStatusCounts: Object.fromEntries(
        eventCounts.map((ec) => [ec.status, ec._count.id])
      ),
      notableEvents: newEventsThisTurn.map((e) => ({
        category: e.category,
        scope: e.scope,
        title: e.title,
        description: e.description,
        status: e.status,
      })),
      factions: factions.map((f) => ({
        type: f.type,
        treasury: f.treasury,
        debt: f.debt,
        unrest: f.unrestIndex,
        standing: f.standingPoints,
        nodesCount: f.nodesControlled.length,
        nodeNames: f.nodesControlled.map((n) => n.name),
        unitCount: f.units.length,
        totalStrength: f.units.reduce((sum, u) => sum + u.strength, 0),
      })),
      sampleOrders: sampleOrders.slice(0, 15),
      executiveScratchpads: submissions
        .filter((s) => s.roleType === "EXECUTIVE" && s.reasoningScratchpad)
        .slice(0, 4)
        .map((s) => ({
          faction: s.factionType,
          usedLiveApi: s.usedLiveApi,
          scratchpadExcerpt: String(s.reasoningScratchpad).slice(0, 280),
        })),
    };

    turnSnapshots.push(snapshot);
    fs.writeFileSync(
      TELEMETRY_PATH,
      JSON.stringify({ completedTurns: t, totalTurns: TOTAL_TURNS, turnSnapshots }, null, 2)
    );

    console.log(
      `[Turn ${t}/28 | ${season} ${year}] Duration: ${(elapsedMs / 1000).toFixed(
        1
      )}s | Live AI: ${liveApiHits}/${submissions.length} | Executed: ${
        snapshot.executedOrdersCount
      } | Combat/Events: ${snapshot.combatLogs.length}`
    );
    if (snapshot.combatLogs.length > 0) {
      console.log(`   Combat logs: ${snapshot.combatLogs.slice(0, 3).join("; ")}`);
    }
  }

  console.log("=== ROUND 2 CAMPAIGN FINISHED (28 TURNS) ===");
}

runCampaignRound2()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FATAL CAMPAIGN ERROR:", err);
    process.exit(1);
  });
