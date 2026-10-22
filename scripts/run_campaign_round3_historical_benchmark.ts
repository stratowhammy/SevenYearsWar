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

process.env.DEEPSEEK_TIMEOUT_MS = "4500";
process.env.FORCE_LIVE_DEEPSEEK = "true";

import prisma from "@/lib/prisma";
import { seedCampaignGame } from "@/prisma/seed";
import { executeFullTurnCycle } from "@/engine/state-machine";
import { ControllerType, BotBehavior, FactionType } from "@prisma/client";

const BENCHMARK_GAME_ID = "syw-campaign-round3-historical";
const TELEMETRY_DIR = path.resolve(process.cwd(), "scratch");
const TELEMETRY_PATH = path.join(TELEMETRY_DIR, "campaign_round3_telemetry.json");

if (!fs.existsSync(TELEMETRY_DIR)) {
  fs.mkdirSync(TELEMETRY_DIR, { recursive: true });
}

interface HistoricalMilestone {
  turn: number;
  season: string;
  year: number;
  milestone: string;
  expectedController: { nodeName: string; faction: FactionType };
  category: "TERRITORIAL" | "DIPLOMATIC" | "FISCAL" | "ENVIRONMENTAL";
}

// Actual historical timeline milestones across 28 turns (1756-1763)
const HISTORICAL_BENCHMARKS: HistoricalMilestone[] = [
  { turn: 2, season: "Summer", year: 1756, milestone: "Montcalm captures Fort Oswego", expectedController: { nodeName: "Fort Oswego", faction: FactionType.FRANCE }, category: "TERRITORIAL" },
  { turn: 6, season: "Summer", year: 1757, milestone: "French siege and fall of Fort William Henry (Lake George / Champlain)", expectedController: { nodeName: "Lake Champlain & Richelieu Portage", faction: FactionType.FRANCE }, category: "TERRITORIAL" },
  { turn: 10, season: "Summer", year: 1758, milestone: "Amphibious fall of Fortress Louisbourg to Amherst & Boscawen", expectedController: { nodeName: "Fortress Louisbourg", faction: FactionType.GREAT_BRITAIN }, category: "TERRITORIAL" },
  { turn: 11, season: "Autumn", year: 1758, milestone: "Forbes Expedition forces French evacuation of Fort Duquesne", expectedController: { nodeName: "Fort Duquesne (Forks of the Ohio)", faction: FactionType.GREAT_BRITAIN }, category: "TERRITORIAL" },
  { turn: 11, season: "Autumn", year: 1758, milestone: "Treaty of Easton signed neutralizing Ohio Native hostility", expectedController: { nodeName: "Logstown & Upper Ohio", faction: FactionType.WESTERN_CONFEDERACY }, category: "DIPLOMATIC" },
  { turn: 14, season: "Summer", year: 1759, milestone: "Siege and surrender of Fort Niagara to Prideaux and Johnson", expectedController: { nodeName: "Fort Niagara", faction: FactionType.GREAT_BRITAIN }, category: "TERRITORIAL" },
  { turn: 15, season: "Autumn", year: 1759, milestone: "Battle of the Plains of Abraham and Fall of Quebec to Wolfe", expectedController: { nodeName: "Quebec (Citadel & Port)", faction: FactionType.GREAT_BRITAIN }, category: "TERRITORIAL" },
  { turn: 18, season: "Summer", year: 1760, milestone: "British three-pronged advance forces capitulation of Montreal", expectedController: { nodeName: "Montreal", faction: FactionType.GREAT_BRITAIN }, category: "TERRITORIAL" },
  { turn: 25, season: "Spring", year: 1762, milestone: "British amphibious expedition seizes French Martinique", expectedController: { nodeName: "Martinique & Windward Islands", faction: FactionType.GREAT_BRITAIN }, category: "TERRITORIAL" },
  { turn: 26, season: "Summer", year: 1762, milestone: "British siege and amphibious conquest of Spanish Havana", expectedController: { nodeName: "Havana & Western Cuba", faction: FactionType.GREAT_BRITAIN }, category: "TERRITORIAL" },
  { turn: 28, season: "Winter", year: 1762, milestone: "Treaty of Paris concluded, ratifying peace and debt relief", expectedController: { nodeName: "Quebec (Citadel & Port)", faction: FactionType.GREAT_BRITAIN }, category: "DIPLOMATIC" },
];

async function runCampaignRound3() {
  console.log("==========================================================================");
  console.log("STARTING ROUND 3: 7-YEAR HISTORICAL BENCHMARK CAMPAIGN (1756-1763)");
  console.log("Measuring Gameplay Dynamics & Historical Narrative Convergence");
  console.log("==========================================================================");

  await seedCampaignGame(BENCHMARK_GAME_ID);

  // Configure all 30 seats to COMPUTER / AUTONOMOUS with historical behavioral weighting
  await prisma.factionRole.updateMany({
    where: { faction: { gameId: BENCHMARK_GAME_ID } },
    data: {
      controller: ControllerType.COMPUTER,
      botBehavior: BotBehavior.AUTONOMOUS,
    },
  });

  const TOTAL_TURNS = 28;
  const turnTelemetry: any[] = [];
  const milestoneEvaluations: any[] = [];

  for (let t = 1; t <= TOTAL_TURNS; t++) {
    const preTurnGame = await prisma.game.findUniqueOrThrow({
      where: { id: BENCHMARK_GAME_ID },
    });
    const year = preTurnGame.currentYear;
    const season = preTurnGame.currentSeason;
    const t0 = Date.now();

    const cycleResult = await executeFullTurnCycle(BENCHMARK_GAME_ID);
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
      where: { gameId: BENCHMARK_GAME_ID },
      include: {
        nodesControlled: true,
        units: true,
      },
      orderBy: { type: "asc" },
    });

    const allNodes = await prisma.mapNode.findMany({
      where: { gameId: BENCHMARK_GAME_ID },
      include: { controller: true },
    });

    const newEvents = await prisma.gameEvent.findMany({
      where: { gameId: BENCHMARK_GAME_ID, turnRecorded: preTurnGame.turnNumber },
      orderBy: { createdAt: "asc" },
    });

    // Check relevant historical milestones for this turn
    const currentMilestones = HISTORICAL_BENCHMARKS.filter((m) => m.turn === t);
    for (const m of currentMilestones) {
      const targetNode = allNodes.find((n) => n.name.includes(m.expectedController.nodeName) || m.expectedController.nodeName.includes(n.name));
      const actualFaction = targetNode?.controller?.type ?? null;
      const isMatch = actualFaction === m.expectedController.faction;
      milestoneEvaluations.push({
        turn: t,
        season,
        year,
        milestone: m.milestone,
        expectedFaction: m.expectedController.faction,
        actualFaction,
        isMatch,
        category: m.category,
      });
    }

    const turnData = {
      turn: t,
      year,
      season,
      elapsedMs,
      liveApiHits,
      totalSubmissions: submissions.length,
      executedOrders: resolutionPhase?.executedOrdersCount ?? 0,
      combatLogs: resolutionPhase?.combatLogs ?? [],
      offMapReport: diplomaticTradePhase?.offMapReport ?? null,
      factions: factions.map((f) => ({
        type: f.type,
        treasury: f.treasury,
        debt: f.debt,
        unrest: f.unrestIndex,
        standing: f.standingPoints,
        assemblySupport: f.assemblySupport,
        covenants: f.covenantBoundaries,
        nodes: f.nodesControlled.map((n) => n.name),
        unitsCount: f.units.length,
        totalStrength: f.units.reduce((s, u) => s + u.strength, 0),
      })),
      newEvents: newEvents.map((e) => ({
        title: e.title,
        status: e.status,
        category: e.category,
      })),
    };

    turnTelemetry.push(turnData);

    console.log(
      `[Turn ${t.toString().padStart(2, "0")}/28 | ${season.padEnd(6)} ${year}] ${(elapsedMs / 1000).toFixed(1)}s | Live AI: ${liveApiHits} | Executed: ${turnData.executedOrders} | Logs: ${turnData.combatLogs.length}`
    );
    if (turnData.combatLogs.length > 0) {
      console.log(`   Telemetry sample: ${turnData.combatLogs[0]}`);
    }
  }

  // Calculate final historical accuracy metrics
  const totalMilestones = milestoneEvaluations.length;
  const matchedMilestones = milestoneEvaluations.filter((m) => m.isMatch).length;
  const milestoneAccuracy = Math.round((matchedMilestones / totalMilestones) * 100);

  const finalGame = await prisma.game.findUniqueOrThrow({
    where: { id: BENCHMARK_GAME_ID },
  });

  const finalOutput = {
    gameId: BENCHMARK_GAME_ID,
    totalTurns: TOTAL_TURNS,
    isPeaceTreatyConcluded: finalGame.isPeaceTreatyConcluded,
    milestoneAccuracyPercentage: milestoneAccuracy,
    milestoneEvaluations,
    turnTelemetry,
  };

  fs.writeFileSync(TELEMETRY_PATH, JSON.stringify(finalOutput, null, 2));
  console.log("==========================================================================");
  console.log(`CAMPAIGN SIMULATION COMPLETE! Milestone Accuracy: ${milestoneAccuracy}% (${matchedMilestones}/${totalMilestones})`);
  console.log(`Telemetry saved to: ${TELEMETRY_PATH}`);
  console.log("==========================================================================");
}

runCampaignRound3()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FATAL ERROR IN ROUND 3 CAMPAIGN:", err);
    process.exit(1);
  });
