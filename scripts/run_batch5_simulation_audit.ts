import fs from "fs";
import path from "path";

// Load environment variables
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

interface RunResult {
  runId: number;
  gameId: string;
  totalTurns: number;
  factions: {
    [key: string]: {
      initialTreasury: number;
      finalTreasury: number;
      initialDebt: number;
      finalDebt: number;
      initialUnrest: number;
      finalUnrest: number;
      initialStanding: number;
      finalStanding: number;
      initialNodes: string[];
      finalNodes: string[];
      netNodeDelta: number;
      initialUnits: number;
      finalUnits: number;
      initialStrength: number;
      finalStrength: number;
      totalCasualtiesSuffered: number;
      totalCasualtiesInflicted: number;
      unrestHighCount: number; // turns unrest >= 70
      unrestCriticalCount: number; // turns unrest >= 85
      covenantsFormed: number;
      subsidiesSent: number;
      subsidiesReceived: number;
      raidsConducted: number;
      raidsSuffered: number;
      assaultsConducted: number;
      warsDeclared: number;
      ordersExecutedByType: Record<string, number>;
    };
  };
  combatLogs: string[];
  eventHistory: Array<{
    turn: number;
    title: string;
    category: string;
    factionIds: string[];
  }>;
  turnLedgers: Array<{
    turn: number;
    year: number;
    season: string;
    factionStates: Array<{
      type: string;
      treasury: number;
      debt: number;
      unrest: number;
      standing: number;
      nodeCount: number;
      unitStrength: number;
    }>;
  }>;
}

async function runSingleSimulation(runIndex: number, maxTurns: number = 20): Promise<RunResult> {
  const gameId = `batch5-sim-run-${runIndex}`;
  console.log(`\n======================================================================`);
  console.log(`>>> STARTING HEADLESS SIMULATION RUN ${runIndex}/5 (Game ID: ${gameId})`);
  console.log(`>>> Horizon: Turn 1 (Spring 1756) -> Turn ${maxTurns} (Winter 1760)`);
  console.log(`======================================================================`);

  await seedCampaignGame(gameId);

  // Set all 30 seats across 10 factions to autonomous computer controllers
  await prisma.factionRole.updateMany({
    where: { faction: { gameId } },
    data: {
      controller: ControllerType.COMPUTER,
      botBehavior: BotBehavior.AUTONOMOUS,
    },
  });

  // Track initial state
  const initialFactions = await prisma.faction.findMany({
    where: { gameId },
    include: { nodesControlled: true, units: true },
  });

  const factionStats: RunResult["factions"] = {};
  for (const f of initialFactions) {
    const totalStr = f.units.reduce((acc, u) => acc + u.strength, 0);
    factionStats[f.type] = {
      initialTreasury: f.treasury,
      finalTreasury: f.treasury,
      initialDebt: f.debt,
      finalDebt: f.debt,
      initialUnrest: f.unrestIndex,
      finalUnrest: f.unrestIndex,
      initialStanding: f.standingPoints,
      finalStanding: f.standingPoints,
      initialNodes: f.nodesControlled.map((n) => n.name),
      finalNodes: [],
      netNodeDelta: 0,
      initialUnits: f.units.length,
      finalUnits: 0,
      initialStrength: totalStr,
      finalStrength: 0,
      totalCasualtiesSuffered: 0,
      totalCasualtiesInflicted: 0,
      unrestHighCount: 0,
      unrestCriticalCount: 0,
      covenantsFormed: 0,
      subsidiesSent: 0,
      subsidiesReceived: 0,
      raidsConducted: 0,
      raidsSuffered: 0,
      assaultsConducted: 0,
      warsDeclared: 0,
      ordersExecutedByType: {},
    };
  }

  const allCombatLogs: string[] = [];
  const eventHistory: RunResult["eventHistory"] = [];
  const turnLedgers: RunResult["turnLedgers"] = [];

  for (let t = 1; t <= maxTurns; t++) {
    const preTurnGame = await prisma.game.findUniqueOrThrow({
      where: { id: gameId },
    });
    const year = preTurnGame.currentYear;
    const season = preTurnGame.currentSeason;
    const t0 = Date.now();

    const cycleResult = await executeFullTurnCycle(gameId);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);

    const resolutionPhase: any = cycleResult.phaseResults.find(
      (r: any) => r.phaseExecuted === "RESOLUTION"
    );
    const orderSubmissionPhase: any = cycleResult.phaseResults.find(
      (r: any) => r.phaseExecuted === "ORDER_SUBMISSION"
    );

    const logs: string[] = resolutionPhase?.combatLogs ?? [];
    allCombatLogs.push(...logs.map((l) => `[Turn ${t} ${season} ${year}] ${l}`));

    // Parse casualty metrics and actions from logs
    for (const log of logs) {
      // Casualties parsing
      // e.g. "Battle at Fort Duquesne: Attacker GREAT_BRITAIN lost 2 str, Defender FRANCE lost 3 str."
      const combatMatch = log.match(/Attacker ([A-Z_]+) lost (\d+) str(?:, Defender ([A-Z_]+) lost (\d+) str)?/);
      if (combatMatch) {
        const [, attFac, attLoss, defFac, defLoss] = combatMatch;
        const aLoss = parseInt(attLoss, 10) || 0;
        const dLoss = parseInt(defLoss || "0", 10) || 0;
        if (factionStats[attFac]) {
          factionStats[attFac].totalCasualtiesSuffered += aLoss;
          factionStats[attFac].totalCasualtiesInflicted += dLoss;
        }
        if (defFac && factionStats[defFac]) {
          factionStats[defFac].totalCasualtiesSuffered += dLoss;
          factionStats[defFac].totalCasualtiesInflicted += aLoss;
        }
      }

      // Attrition / winter loss parsing
      // e.g. "Winter Freeze attrition in St. Lawrence River: FRANCE unit lost 2 str."
      const attrMatch = log.match(/([A-Z_]+) unit lost (\d+) str/);
      if (attrMatch && !combatMatch) {
        const [, fac, loss] = attrMatch;
        if (factionStats[fac]) {
          factionStats[fac].totalCasualtiesSuffered += parseInt(loss, 10);
        }
      }

      // Raid parsing
      const raidMatch = log.match(/Raid by ([A-Z_]+) on ([^:]+):/);
      if (raidMatch) {
        const [, rFac] = raidMatch;
        if (factionStats[rFac]) factionStats[rFac].raidsConducted++;
      }

      // Amphibious assault parsing
      if (log.includes("Amphibious assault") || log.includes("AMPHIBIOUS_ASSAULT")) {
        const assaultMatch = log.match(/([A-Z_]+) launches amphibious assault/);
        if (assaultMatch && factionStats[assaultMatch[1]]) {
          factionStats[assaultMatch[1]].assaultsConducted++;
        }
      }
    }

    // Tally executed orders from submissions
    const submissions: any[] = orderSubmissionPhase?.aiSubmissions ?? [];
    for (const sub of submissions) {
      const orders = sub.orders?.actionOrders ?? [];
      const fType = sub.factionType;
      if (!factionStats[fType]) continue;
      for (const ord of orders) {
        const ot = ord.orderType || "UNKNOWN";
        factionStats[fType].ordersExecutedByType[ot] =
          (factionStats[fType].ordersExecutedByType[ot] || 0) + 1;
        if (ot === "SUBSIDIZE") factionStats[fType].subsidiesSent++;
        if (ot === "COVENANT_BOUNDARY") factionStats[fType].covenantsFormed++;
        if (ot === "DECLARE_WAR") factionStats[fType].warsDeclared++;
      }
    }

    // Inspect current turn end faction ledgers
    const postTurnFactions = await prisma.faction.findMany({
      where: { gameId },
      include: { nodesControlled: true, units: true },
    });

    const turnSnapshot = {
      turn: t,
      year,
      season,
      factionStates: postTurnFactions.map((f) => {
        if (f.unrestIndex >= 70) factionStats[f.type].unrestHighCount++;
        if (f.unrestIndex >= 85) factionStats[f.type].unrestCriticalCount++;
        const totalStr = f.units.reduce((acc, u) => acc + u.strength, 0);
        return {
          type: f.type,
          treasury: f.treasury,
          debt: f.debt,
          unrest: f.unrestIndex,
          standing: f.standingPoints,
          nodeCount: f.nodesControlled.length,
          unitStrength: totalStr,
        };
      }),
    };
    turnLedgers.push(turnSnapshot);

    // Track new events
    const newEvents = await prisma.gameEvent.findMany({
      where: { gameId, turnRecorded: t },
      select: { turnRecorded: true, title: true, category: true, factionIds: true },
    });
    for (const ev of newEvents) {
      eventHistory.push({
        turn: ev.turnRecorded,
        title: ev.title,
        category: ev.category,
        factionIds: ev.factionIds,
      });
    }

    console.log(
      `[Run ${runIndex} | Turn ${t.toString().padStart(2, "0")}/20 | ${season.padEnd(6)} ${year}] ` +
      `${elapsed}s | Executed Orders: ${resolutionPhase?.executedOrdersCount ?? 0} | Events: ${newEvents.length}`
    );
  }

  // Final ledger capture
  const finalFactions = await prisma.faction.findMany({
    where: { gameId },
    include: { nodesControlled: true, units: true },
  });

  for (const f of finalFactions) {
    const stat = factionStats[f.type];
    if (!stat) continue;
    stat.finalTreasury = f.treasury;
    stat.finalDebt = f.debt;
    stat.finalUnrest = f.unrestIndex;
    stat.finalStanding = f.standingPoints;
    stat.finalNodes = f.nodesControlled.map((n) => n.name);
    stat.netNodeDelta = f.nodesControlled.length - stat.initialNodes.length;
    stat.finalUnits = f.units.length;
    stat.finalStrength = f.units.reduce((acc, u) => acc + u.strength, 0);
  }

  return {
    runId: runIndex,
    gameId,
    totalTurns: maxTurns,
    factions: factionStats,
    combatLogs: allCombatLogs,
    eventHistory,
    turnLedgers,
  };
}

async function runBatch5SimulationAudit() {
  const TOTAL_RUNS = 5;
  const TURNS_PER_RUN = 20;
  const startTime = Date.now();

  console.log(`======================================================================`);
  console.log(`SEVEN YEARS WAR SIMULATOR — STAGE 1: BATCH 5 SIMULATION AUDIT`);
  console.log(`Executing ${TOTAL_RUNS} runs x ${TURNS_PER_RUN} turns headless (100 total simulated turns)`);
  console.log(`======================================================================`);

  const runResults: RunResult[] = [];

  for (let r = 1; r <= TOTAL_RUNS; r++) {
    const res = await runSingleSimulation(r, TURNS_PER_RUN);
    runResults.push(res);
  }

  const totalElapsedMin = ((Date.now() - startTime) / 1000 / 60).toFixed(2);
  console.log(`\n======================================================================`);
  console.log(`ALL 5 SIMULATION RUNS COMPLETE IN ${totalElapsedMin} MINUTES`);
  console.log(`Compiling Statistical Aggregates and Telemetry...`);
  console.log(`======================================================================`);

  // Write raw telemetry to scratch
  const scratchDir = path.resolve(process.cwd(), "scratch");
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  const rawPath = path.join(scratchDir, "batch5_simulations_raw_telemetry.json");
  fs.writeFileSync(rawPath, JSON.stringify(runResults, null, 2));
  console.log(`Saved full raw telemetry to: ${rawPath}`);

  // Calculate comparative metric matrix
  const allFactionTypes = Object.values(FactionType);
  const metricMatrix: Record<string, any> = {};

  for (const fType of allFactionTypes) {
    let sumFinalTreasury = 0;
    let sumFinalDebt = 0;
    let sumFinalUnrest = 0;
    let sumFinalStanding = 0;
    let sumInitialStrength = 0;
    let sumFinalStrength = 0;
    let sumCasualtiesSuffered = 0;
    let sumCasualtiesInflicted = 0;
    let sumUnrestHigh = 0;
    let sumUnrestCritical = 0;
    let sumInitialNodes = 0;
    let sumFinalNodes = 0;
    let sumNetNodeDelta = 0;
    let sumCovenants = 0;
    let sumSubsidiesSent = 0;
    let sumRaidsConducted = 0;

    const territoryBreakdown: Record<string, number> = {};

    for (const r of runResults) {
      const data = r.factions[fType];
      if (!data) continue;
      sumFinalTreasury += data.finalTreasury;
      sumFinalDebt += data.finalDebt;
      sumFinalUnrest += data.finalUnrest;
      sumFinalStanding += data.finalStanding;
      sumInitialStrength += data.initialStrength;
      sumFinalStrength += data.finalStrength;
      sumCasualtiesSuffered += data.totalCasualtiesSuffered;
      sumCasualtiesInflicted += data.totalCasualtiesInflicted;
      sumUnrestHigh += data.unrestHighCount;
      sumUnrestCritical += data.unrestCriticalCount;
      sumInitialNodes += data.initialNodes.length;
      sumFinalNodes += data.finalNodes.length;
      sumNetNodeDelta += data.netNodeDelta;
      sumCovenants += data.covenantsFormed;
      sumSubsidiesSent += data.subsidiesSent;
      sumRaidsConducted += data.raidsConducted;

      for (const node of data.finalNodes) {
        territoryBreakdown[node] = (territoryBreakdown[node] || 0) + 1;
      }
    }

    const n = TOTAL_RUNS;
    const avgCasualtiesSuffered = Math.round((sumCasualtiesSuffered / n) * 10) / 10;
    const avgCasualtiesInflicted = Math.round((sumCasualtiesInflicted / n) * 10) / 10;
    const casualtyRatio = avgCasualtiesSuffered > 0
      ? Math.round((avgCasualtiesInflicted / avgCasualtiesSuffered) * 100) / 100
      : avgCasualtiesInflicted > 0 ? 999 : 1.0;

    metricMatrix[fType] = {
      avgFinalTreasury: Math.round(sumFinalTreasury / n),
      avgFinalDebt: Math.round(sumFinalDebt / n),
      avgFinalUnrest: Math.round((sumFinalUnrest / n) * 10) / 10,
      avgFinalStanding: Math.round((sumFinalStanding / n) * 10) / 10,
      avgInitialStrength: Math.round(sumInitialStrength / n),
      avgFinalStrength: Math.round(sumFinalStrength / n),
      avgCasualtiesSuffered,
      avgCasualtiesInflicted,
      casualtyRatio,
      avgUnrestHighTurns: Math.round((sumUnrestHigh / n) * 10) / 10,
      avgUnrestCriticalTurns: Math.round((sumUnrestCritical / n) * 10) / 10,
      avgInitialNodes: Math.round(sumInitialNodes / n),
      avgFinalNodes: Math.round((sumFinalNodes / n) * 10) / 10,
      avgNetNodeDelta: Math.round((sumNetNodeDelta / n) * 10) / 10,
      avgCovenantsFormed: Math.round((sumCovenants / n) * 10) / 10,
      avgSubsidiesSent: Math.round((sumSubsidiesSent / n) * 10) / 10,
      avgRaidsConducted: Math.round((sumRaidsConducted / n) * 10) / 10,
      frequentlyControlledNodes: Object.entries(territoryBreakdown)
        .filter(([, count]) => count >= 3)
        .map(([name, count]) => `${name} (${count}/${n} runs)`),
    };
  }

  const summary = {
    totalRuns: TOTAL_RUNS,
    turnsPerRun: TURNS_PER_RUN,
    totalSimulatedTurns: TOTAL_RUNS * TURNS_PER_RUN,
    elapsedMinutes: totalElapsedMin,
    metricMatrix,
  };

  const summaryPath = path.join(scratchDir, "batch5_simulations_summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`Saved aggregated summary matrix to: ${summaryPath}`);

  console.log("\n======================================================================");
  console.log("BATCH 5 AUDIT SUMMARY METRIC MATRIX (AVERAGES ACROSS 5 RUNS):");
  console.log("======================================================================");
  console.table(
    Object.entries(metricMatrix).map(([fac, m]) => ({
      Faction: fac,
      "Avg Treasury": m.avgFinalTreasury,
      "Avg Debt": m.avgFinalDebt,
      "Avg Unrest": m.avgFinalUnrest,
      "Str In->Fin": `${m.avgInitialStrength} -> ${m.avgFinalStrength}`,
      "Cas Suff->Inf": `${m.avgCasualtiesSuffered} -> ${m.avgCasualtiesInflicted}`,
      "Cas Ratio": m.casualtyRatio,
      "Nodes In->Fin": `${m.avgInitialNodes} -> ${m.avgFinalNodes} (${m.avgNetNodeDelta >= 0 ? "+" : ""}${m.avgNetNodeDelta})`,
      "Unrest Crit Turns": m.avgUnrestCriticalTurns,
      "Subsidies Sent": m.avgSubsidiesSent,
    }))
  );
}

runBatch5SimulationAudit()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Batch simulation error:", err);
    process.exit(1);
  });
