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

process.env.DEEPSEEK_TIMEOUT_MS = "2000";
process.env.FORCE_LIVE_DEEPSEEK = "true";

import prisma from "@/lib/prisma";
import { seedCampaignGame } from "@/prisma/seed";
import { executeFullTurnCycle, reconcileAndPersistVictoryPoints } from "@/engine/state-machine";
import { ControllerType, BotBehavior, FactionType, RoleType } from "@prisma/client";
import { INITIAL_FACTIONS, INITIAL_UNITS } from "@/prisma/seed-data";

const GAME_ID = "syw-campaign-round8-vp";
const TELEMETRY_DIR = path.resolve(process.cwd(), "scratch");
const TELEMETRY_PATH = path.join(TELEMETRY_DIR, "campaign_round8_telemetry.json");

if (!fs.existsSync(TELEMETRY_DIR)) {
  fs.mkdirSync(TELEMETRY_DIR, { recursive: true });
}

interface HistoricalMilestone {
  turn: number;
  season: string;
  year: number;
  milestone: string;
  targetNode: string;
  expectedController: FactionType;
}

const HISTORICAL_BENCHMARKS: HistoricalMilestone[] = [
  { turn: 2, season: "Summer", year: 1756, milestone: "Capture of Fort Oswego by Montcalm", targetNode: "Fort Oswego", expectedController: FactionType.FRANCE },
  { turn: 6, season: "Summer", year: 1757, milestone: "Fall of Fort William Henry / Lake Champlain", targetNode: "Lake Champlain", expectedController: FactionType.FRANCE },
  { turn: 10, season: "Summer", year: 1758, milestone: "Fall of Fortress Louisbourg to Amherst & Boscawen", targetNode: "Louisbourg", expectedController: FactionType.GREAT_BRITAIN },
  { turn: 11, season: "Autumn", year: 1758, milestone: "Forbes Expedition takes Forks of Ohio / Fort Duquesne", targetNode: "Fort Duquesne", expectedController: FactionType.GREAT_BRITAIN },
  { turn: 14, season: "Summer", year: 1759, milestone: "Fall of Fort Niagara to British & Haudenosaunee", targetNode: "Fort Niagara", expectedController: FactionType.GREAT_BRITAIN },
  { turn: 15, season: "Autumn", year: 1759, milestone: "Battle of Plains of Abraham & Capture of Quebec", targetNode: "Quebec", expectedController: FactionType.GREAT_BRITAIN },
  { turn: 18, season: "Summer", year: 1760, milestone: "Capitulation of Montreal", targetNode: "Montreal", expectedController: FactionType.GREAT_BRITAIN },
  { turn: 20, season: "Winter", year: 1760, milestone: "British Naval Superiority in Atlantic Shipping", targetNode: "Atlantic Shipping Lanes", expectedController: FactionType.GREAT_BRITAIN },
];

async function runCampaignRound8() {
  console.log("==========================================================================");
  console.log("STARTING SIMULATION 8: GAME TESTING VICTORY POINTS IN SCHEMA");
  console.log("Measuring 1756-1760 Campaign Dynamics, VP Progression & Historicity");
  console.log("==========================================================================");

  // 1. Seed fresh campaign game
  console.log(`[Seed] Initializing campaign ${GAME_ID}...`);
  await seedCampaignGame(GAME_ID);

  // 2. Configure all 30 seats to COMPUTER / AUTONOMOUS
  await prisma.factionRole.updateMany({
    where: { faction: { gameId: GAME_ID } },
    data: {
      controller: ControllerType.COMPUTER,
      botBehavior: BotBehavior.AUTONOMOUS,
    },
  });

  // Initial VP check
  const initStandings = await reconcileAndPersistVictoryPoints(GAME_ID);
  console.log(`[Init] Baseline Victory Points initialized:`, JSON.stringify(initStandings, null, 2));

  const TOTAL_TURNS = 20;
  const turnSnapshots: any[] = [];
  const milestoneResults: any[] = [];
  let totalCasualtiesAcrossGame = 0;

  for (let t = 1; t <= TOTAL_TURNS; t++) {
    const preTurnGame = await prisma.game.findUniqueOrThrow({
      where: { id: GAME_ID },
    });
    const year = preTurnGame.currentYear;
    const season = preTurnGame.currentSeason;
    const t0 = Date.now();

    // Execute full 4-phase turn
    const cycleResult = await executeFullTurnCycle(GAME_ID);
    const elapsedMs = Date.now() - t0;

    // Fetch refreshed game state with all relations
    const refreshedGame = await prisma.game.findUniqueOrThrow({
      where: { id: GAME_ID },
      include: {
        factions: {
          include: {
            roles: true,
            nodesControlled: true,
            units: true,
          },
        },
        nodes: { include: { controller: true, units: true } },
        events: { where: { turnRecorded: preTurnGame.turnNumber } },
        orders: { where: { turnNumber: preTurnGame.turnNumber } },
      },
    });

    const resolutionPhase: any = cycleResult.phaseResults.find(
      (r: any) => r.phaseExecuted === "RESOLUTION"
    );
    const combatLogs: string[] = resolutionPhase?.combatLogs ?? [];

    // Tally casualties from combat logs
    let turnCasualties = 0;
    for (const log of combatLogs) {
      const match = log.match(/(\d+)\s+casualties/);
      if (match) turnCasualties += parseInt(match[1], 10);
    }
    totalCasualtiesAcrossGame += turnCasualties;

    // Extract per-faction metrics and victory points
    const factionTelemetry: Record<string, any> = {};
    for (const f of refreshedGame.factions) {
      const totalStrength = f.units.reduce((sum, u) => sum + u.strength, 0);
      const rolesMap: Record<string, { title: string; vp: number; breakdown: any }> = {};

      for (const r of f.roles) {
        rolesMap[r.roleType] = {
          title: r.title,
          vp: r.victoryPoints,
          breakdown: r.victoryPointsBreakdown,
        };
      }

      factionTelemetry[f.type] = {
        treasury: f.treasury,
        debt: f.debt,
        unrestIndex: f.unrestIndex,
        standingPoints: f.standingPoints,
        assemblySupport: f.assemblySupport,
        victoryPoints: f.victoryPoints,
        nodesControlled: f.nodesControlled.map((n) => n.name),
        nodeCount: f.nodesControlled.length,
        totalStrength,
        unitCount: f.units.length,
        roles: rolesMap,
      };
    }

    // Evaluate historical milestones
    const activeMilestones = HISTORICAL_BENCHMARKS.filter((m) => m.turn === t);
    for (const bm of activeMilestones) {
      const targetNode = refreshedGame.nodes.find((n) =>
        n.name.toLowerCase().includes(bm.targetNode.toLowerCase())
      );
      const actualController = targetNode?.controller?.type ?? null;
      const isHistorical = actualController === bm.expectedController;

      milestoneResults.push({
        turn: t,
        season,
        year,
        milestone: bm.milestone,
        targetNode: targetNode?.name ?? bm.targetNode,
        expectedController: bm.expectedController,
        actualController,
        isHistorical,
      });

      console.log(
        `  -> [Milestone T${t} ${season} ${year}] ${bm.milestone}: ${
          isHistorical ? "ACHIEVED (HISTORICAL)" : `DIVERGED (${actualController ?? "None"} held)`
        }`
      );
    }

    const snapshot = {
      turnNumber: t,
      season,
      year,
      elapsedMs,
      combatLogCount: combatLogs.length,
      turnCasualties,
      factions: factionTelemetry,
      victoryPointsStandings: refreshedGame.victoryPointsStandings,
    };
    turnSnapshots.push(snapshot);

    console.log(
      `[Turn ${t}/20] ${season} ${year} resolved in ${elapsedMs}ms | Casualties: ${turnCasualties} | Top VP: ${
        Object.entries(factionTelemetry)
          .sort((a, b) => b[1].victoryPoints - a[1].victoryPoints)
          .slice(0, 3)
          .map(([k, v]) => `${k}:${v.victoryPoints}VP`)
          .join(", ")
      }`
    );
  }

  // Final summary extraction
  const finalGame = await prisma.game.findUniqueOrThrow({
    where: { id: GAME_ID },
    include: {
      factions: {
        include: {
          roles: true,
          nodesControlled: true,
          units: true,
        },
        orderBy: { victoryPoints: "desc" },
      },
      nodes: { include: { controller: true } },
      events: true,
    },
  });

  const finalFactionRankings = finalGame.factions.map((f, idx) => ({
    rank: idx + 1,
    factionType: f.type,
    victoryPoints: f.victoryPoints,
    treasury: f.treasury,
    debt: f.debt,
    unrestIndex: f.unrestIndex,
    standingPoints: f.standingPoints,
    assemblySupport: f.assemblySupport,
    nodesControlledCount: f.nodesControlled.length,
    nodesControlled: f.nodesControlled.map((n) => n.name),
    totalStrength: f.units.reduce((s, u) => s + u.strength, 0),
    roleBreakdown: f.roles.map((r) => ({
      roleType: r.roleType,
      title: r.title,
      victoryPoints: r.victoryPoints,
      breakdown: r.victoryPointsBreakdown,
    })),
  }));

  const fullReport = {
    simulationId: "Simulation_8_Victory_Points_Integration",
    gameId: GAME_ID,
    totalTurns: TOTAL_TURNS,
    timeHorizon: "1756 Spring - 1760 Winter",
    totalCasualtiesAcrossGame,
    finalFactionRankings,
    milestoneEvaluations: milestoneResults,
    turnSnapshots,
  };

  fs.writeFileSync(TELEMETRY_PATH, JSON.stringify(fullReport, null, 2), "utf8");
  console.log(`[Report] Saved complete Simulation 8 telemetry to: ${TELEMETRY_PATH}`);

  console.log("\n==========================================================================");
  console.log("SIMULATION 8 FINAL VICTORY POINTS & FACTION LEDGER STANDINGS");
  console.log("==========================================================================");
  console.table(
    finalFactionRankings.map((r) => ({
      Rank: r.rank,
      Faction: r.factionType,
      "Victory Points": `${r.victoryPoints} / 30 VP`,
      Treasury: `${r.treasury} £`,
      Debt: `${r.debt} £`,
      Unrest: `${r.unrestIndex}%`,
      Standing: `${r.standingPoints} pts`,
      Nodes: r.nodesControlledCount,
      Strength: r.totalStrength,
    }))
  );

  console.log("\n==========================================================================");
  console.log("ROLE SEAT VICTORY POINTS BREAKDOWN (30 SEATS)");
  console.log("==========================================================================");
  for (const f of finalFactionRankings) {
    console.log(`\n--- ${f.factionType} (${f.victoryPoints} Total VP) ---`);
    for (const r of f.roleBreakdown) {
      console.log(`  * ${r.roleType} [${r.title}]: ${r.victoryPoints}/10 VP`);
      if (Array.isArray(r.breakdown)) {
        for (const item of r.breakdown) {
          const obj = item as any;
          console.log(`     - [${obj?.isCompleted ? "COMPLETED" : "INCOMPLETE"}] ${obj?.title} (+${obj?.earnedVP ?? (obj?.isCompleted ? obj?.victoryPoints : 0)}/${obj?.victoryPoints} VP): ${obj?.progressText}`);
        }
      }
    }
  }

  process.exit(0);
}

runCampaignRound8().catch((err) => {
  console.error("FATAL ERROR IN SIMULATION 8:", err);
  process.exit(1);
});
