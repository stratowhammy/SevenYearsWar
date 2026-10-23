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
import { ControllerType, BotBehavior, FactionType } from "@prisma/client";

const TELEMETRY_DIR = path.resolve(process.cwd(), "scratch");
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

async function runSingleSimulation(simIndex: number) {
  const gameId = `syw-campaign-sim${simIndex}-vp`;
  const telemetryPath = path.join(TELEMETRY_DIR, `campaign_round${simIndex}_telemetry.json`);

  console.log(`\n==========================================================================`);
  console.log(`STARTING SIMULATION ${simIndex} (Game ID: ${gameId})`);
  console.log(`Testing Calibrated Tiered Victory Point Model (20 Turns, 1756-1760)`);
  console.log(`==========================================================================`);

  await seedCampaignGame(gameId);

  await prisma.factionRole.updateMany({
    where: { faction: { gameId } },
    data: {
      controller: ControllerType.COMPUTER,
      botBehavior: BotBehavior.AUTONOMOUS,
    },
  });

  const initStandings = await reconcileAndPersistVictoryPoints(gameId);

  const TOTAL_TURNS = 20;
  const turnSnapshots: any[] = [];
  const milestoneResults: any[] = [];
  let totalCasualtiesAcrossGame = 0;
  let totalRaids = 0;
  let totalCombatEvents = 0;

  for (let t = 1; t <= TOTAL_TURNS; t++) {
    const preTurnGame = await prisma.game.findUniqueOrThrow({
      where: { id: gameId },
    });
    const year = preTurnGame.currentYear;
    const season = preTurnGame.currentSeason;
    const t0 = Date.now();

    const cycleResult = await executeFullTurnCycle(gameId);
    const elapsedMs = Date.now() - t0;

    const refreshedGame = await prisma.game.findUniqueOrThrow({
      where: { id: gameId },
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

    let turnCasualties = 0;
    for (const log of combatLogs) {
      const match = log.match(/(\d+)\s+casualties/);
      if (match) turnCasualties += parseInt(match[1], 10);
      if (log.toLowerCase().includes("raid")) totalRaids++;
      if (log.toLowerCase().includes("battle") || log.toLowerCase().includes("assault")) totalCombatEvents++;
    }
    totalCasualtiesAcrossGame += turnCasualties;

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

    // Milestones check
    for (const b of HISTORICAL_BENCHMARKS) {
      if (b.turn === t) {
        const node = refreshedGame.nodes.find((n) =>
          n.name.toLowerCase().includes(b.targetNode.toLowerCase())
        );
        const actualController = (node?.controller?.type ?? null) as FactionType | null;
        const matched = actualController === b.expectedController;
        milestoneResults.push({
          turn: t,
          season,
          year,
          milestone: b.milestone,
          targetNode: b.targetNode,
          expectedController: b.expectedController,
          actualController,
          matched,
        });
      }
    }

    turnSnapshots.push({
      turn: t,
      year,
      season,
      turnCasualties,
      cumulativeCasualties: totalCasualtiesAcrossGame,
      ordersExecuted: refreshedGame.orders.length,
      factions: factionTelemetry,
      durationMs: elapsedMs,
    });

    console.log(
      `[Sim ${simIndex} | T${t} ${season} ${year}] ${refreshedGame.orders.length} orders, ${turnCasualties} casualties (${elapsedMs}ms)`
    );
  }

  // End of game audit
  const finalGame = await prisma.game.findUniqueOrThrow({
    where: { id: gameId },
    include: {
      factions: {
        include: {
          roles: true,
          nodesControlled: true,
          units: true,
        },
      },
      nodes: true,
    },
  });

  const finalStandings = (finalGame.victoryPointsStandings as any) ?? {};
  const finalFactionRankings = finalGame.factions
    .map((f) => ({
      factionType: f.type,
      victoryPoints: f.victoryPoints,
      treasury: f.treasury,
      debt: f.debt,
      unrestIndex: f.unrestIndex,
      standingPoints: f.standingPoints,
      assemblySupport: f.assemblySupport,
      nodesControlled: f.nodesControlled.map((n) => n.name),
      nodeCount: f.nodesControlled.length,
      totalStrength: f.units.reduce((s, u) => s + u.strength, 0),
      roleBreakdown: f.roles.map((r) => ({
        roleType: r.roleType,
        title: r.title,
        victoryPoints: r.victoryPoints,
        breakdown: r.victoryPointsBreakdown,
      })),
    }))
    .sort((a, b) => b.victoryPoints - a.victoryPoints);

  const matchedCount = milestoneResults.filter((m) => m.matched).length;
  const historicalFidelityScore = Math.round((matchedCount / HISTORICAL_BENCHMARKS.length) * 100);

  const telemetryData = {
    simulationIndex: simIndex,
    gameId,
    timestamp: new Date().toISOString(),
    totalTurns: TOTAL_TURNS,
    totalCasualties: totalCasualtiesAcrossGame,
    totalRaids,
    totalCombatEvents,
    historicalFidelityScore,
    milestoneResults,
    finalFactionRankings,
    turnSnapshots,
  };

  fs.writeFileSync(telemetryPath, JSON.stringify(telemetryData, null, 2));
  console.log(`[Sim ${simIndex}] Telemetry written to ${telemetryPath}`);
  console.log(`[Sim ${simIndex}] Fidelity Score: ${historicalFidelityScore}% (${matchedCount}/${HISTORICAL_BENCHMARKS.length})`);
  console.log(`[Sim ${simIndex}] Top 3 Factions by VP:`);
  finalFactionRankings.slice(0, 3).forEach((f, idx) => {
    console.log(`  ${idx + 1}. ${f.factionType}: ${f.victoryPoints}/30 VP (Nodes: ${f.nodeCount}, Treasury: £${f.treasury})`);
  });

  return {
    simIndex,
    gameId,
    historicalFidelityScore,
    totalCasualties: totalCasualtiesAcrossGame,
    totalRaids,
    totalCombatEvents,
    rankings: finalFactionRankings,
    milestones: milestoneResults,
  };
}

async function main() {
  const simResults: any[] = [];
  for (let s = 9; s <= 12; s++) {
    const res = await runSingleSimulation(s);
    simResults.push(res);
  }

  const summaryPath = path.join(TELEMETRY_DIR, "simulations_9_to_12_telemetry.json");
  fs.writeFileSync(summaryPath, JSON.stringify(simResults, null, 2));
  console.log(`\n==========================================================================`);
  console.log(`ALL 4 SIMULATIONS (9, 10, 11, 12) COMPLETE!`);
  console.log(`Summary written to ${summaryPath}`);
  console.log(`==========================================================================`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Batch simulation run failed:", err);
  process.exit(1);
});
