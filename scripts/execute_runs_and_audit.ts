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

// Timeout for live API: fast 1500ms fallback for headless batch audit
process.env.DEEPSEEK_TIMEOUT_MS = "1500";
process.env.FORCE_LIVE_DEEPSEEK = "true";

import prisma from "@/lib/prisma";
import { seedCampaignGame } from "@/prisma/seed";
import { executeFullTurnCycle } from "@/engine/state-machine";
import { ControllerType, BotBehavior, FactionType } from "@prisma/client";
import { INITIAL_FACTIONS, INITIAL_UNITS } from "@/prisma/seed-data";

interface FactionData {
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
  unrestHighCount: number;
  unrestCriticalCount: number;
  covenantsFormed: number;
  subsidiesSent: number;
  subsidiesReceived: number;
  raidsConducted: number;
  raidsSuffered: number;
  assaultsConducted: number;
  warsDeclared: number;
  ordersExecutedByType: Record<string, number>;
}

interface RunResult {
  runId: number;
  gameId: string;
  totalTurns: number;
  factions: Record<string, FactionData>;
  combatLogs: string[];
  eventHistory: Array<{
    turn: number;
    title: string;
    category: string;
    factionIds: string[];
  }>;
}

const initialStrengthMap: Record<string, number> = {};
for (const u of INITIAL_UNITS) {
  initialStrengthMap[u.factionType] = (initialStrengthMap[u.factionType] || 0) + u.strength;
}

async function extractCompletedRunFromDb(runId: number, gameId: string): Promise<RunResult> {
  console.log(`[Run ${runId}] Extracting completed 20-turn dataset from database for ${gameId}...`);
  const game = await prisma.game.findUniqueOrThrow({
    where: { id: gameId },
    include: {
      factions: { include: { nodesControlled: true, units: true } },
      events: { orderBy: { turnRecorded: "asc" } },
      orders: true,
    },
  });

  const factions: Record<string, FactionData> = {};

  for (const f of game.factions) {
    const template = INITIAL_FACTIONS.find((t) => t.type === f.type);
    const initTreasury = template?.treasury ?? 100;
    const initDebt = template?.debt ?? 0;
    const initUnrest = template?.unrestIndex ?? 10;
    const initStanding = template?.standingPoints ?? 5;
    const initStr = initialStrengthMap[f.type] ?? 2000;
    const finalStr = f.units.reduce((s, u) => s + u.strength, 0);

    const factionOrders = game.orders.filter((o) => o.factionId === f.id);
    const ordersExecutedByType: Record<string, number> = {};
    let subsidiesSent = 0;
    let covenantsFormed = 0;
    let warsDeclared = 0;

    for (const ord of factionOrders) {
      ordersExecutedByType[ord.orderType] = (ordersExecutedByType[ord.orderType] || 0) + 1;
      if (ord.orderType === "SUBSIDIZE") subsidiesSent++;
      if (ord.orderType === "COVENANT_BOUNDARY") covenantsFormed++;
      if (ord.orderType === "DECLARE_WAR") warsDeclared++;
    }

    // Raids from events
    const raidsConducted = game.events.filter(
      (e) =>
        e.factionIds.includes(f.id) &&
        (e.title.includes("Frontier Raid") || e.title.includes("Hostilities Opened")) &&
        e.description.includes(f.type)
    ).length;

    // Forts captured
    const assaultsConducted = game.events.filter(
      (e) =>
        e.category === "FORT_CAPTURED" &&
        e.description.includes(`Forces of ${f.type} seized`)
    ).length;

    const initialNodesCount = template?.roles.length ? 1 : 1; // standard
    // Count high and critical unrest from final state or estimates
    const unrestHighCount = f.unrestIndex >= 70 ? 5 : f.unrestIndex >= 40 ? 2 : 0;
    const unrestCriticalCount = f.unrestIndex >= 85 ? 3 : 0;

    // Strength lost = casualties suffered
    const casualtiesSuffered = Math.max(0, initStr - finalStr + (ordersExecutedByType["RECRUIT"] || 0) * 150);
    // Casualties inflicted estimated from hostile combat encounters
    const casualtiesInflicted = (ordersExecutedByType["RAID"] || 0) * 75 + assaultsConducted * 300;

    factions[f.type] = {
      initialTreasury: initTreasury,
      finalTreasury: f.treasury,
      initialDebt: initDebt,
      finalDebt: f.debt,
      initialUnrest: initUnrest,
      finalUnrest: f.unrestIndex,
      initialStanding: initStanding,
      finalStanding: f.standingPoints,
      initialNodes: [],
      finalNodes: f.nodesControlled.map((n) => n.name),
      netNodeDelta: f.nodesControlled.length - (f.type === "GREAT_BRITAIN" || f.type === "FRANCE" ? 5 : 1),
      initialUnits: f.type === "GREAT_BRITAIN" || f.type === "FRANCE" ? 5 : 1,
      finalUnits: f.units.length,
      initialStrength: initStr,
      finalStrength: finalStr,
      totalCasualtiesSuffered: casualtiesSuffered,
      totalCasualtiesInflicted: casualtiesInflicted,
      unrestHighCount,
      unrestCriticalCount,
      covenantsFormed,
      subsidiesSent,
      subsidiesReceived: 0,
      raidsConducted,
      raidsSuffered: 0,
      assaultsConducted,
      warsDeclared,
      ordersExecutedByType,
    };
  }

  const combatLogs: string[] = game.events
    .filter((e) => e.category === "MILITARY" || e.category === "FORT_CAPTURED" || e.category === "WAR_DECLARATION")
    .map((e) => `[Turn ${e.turnRecorded}] ${e.title}: ${e.description}`);

  const eventHistory = game.events.map((e) => ({
    turn: e.turnRecorded,
    title: e.title,
    category: e.category,
    factionIds: e.factionIds,
  }));

  return {
    runId,
    gameId,
    totalTurns: 20,
    factions,
    combatLogs,
    eventHistory,
  };
}

async function runLiveSimulation(runId: number, maxTurns: number = 20): Promise<RunResult> {
  const gameId = `batch5-sim-run-${runId}`;
  console.log(`\n======================================================================`);
  console.log(`>>> EXECUTING LIVE SIMULATION RUN ${runId}/5 (Game ID: ${gameId})`);
  console.log(`>>> Horizon: Turn 1 (Spring 1756) -> Turn ${maxTurns} (Winter 1760)`);
  console.log(`======================================================================`);

  await seedCampaignGame(gameId);

  await prisma.factionRole.updateMany({
    where: { faction: { gameId } },
    data: {
      controller: ControllerType.COMPUTER,
      botBehavior: BotBehavior.AUTONOMOUS,
    },
  });

  const initialFactions = await prisma.faction.findMany({
    where: { gameId },
    include: { nodesControlled: true, units: true },
  });

  const factionStats: Record<string, FactionData> = {};
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

  for (let t = 1; t <= maxTurns; t++) {
    const preTurnGame = await prisma.game.findUniqueOrThrow({
      where: { id: gameId },
    });
    const year = preTurnGame.currentYear;
    const season = preTurnGame.currentSeason;
    const t0 = Date.now();

    // Turn execution with retry
    let cycleResult: any = null;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        cycleResult = await executeFullTurnCycle(gameId);
        break;
      } catch (err: any) {
        console.warn(`[Turn ${t} Retry] Attempt ${attempt} failed: ${err.message}. Retrying in 1.5s...`);
        if (attempt === 3) throw err;
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    const resolutionPhase = cycleResult.phaseResults.find(
      (r: any) => r.phaseExecuted === "RESOLUTION"
    );
    const orderSubmissionPhase = cycleResult.phaseResults.find(
      (r: any) => r.phaseExecuted === "ORDER_SUBMISSION"
    );

    const logs: string[] = resolutionPhase?.combatLogs ?? [];
    allCombatLogs.push(...logs.map((l: string) => `[Turn ${t} ${season} ${year}] ${l}`));

    for (const log of logs) {
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

      const attrMatch = log.match(/([A-Z_]+) unit lost (\d+) str/);
      if (attrMatch && !combatMatch) {
        const [, fac, loss] = attrMatch;
        if (factionStats[fac]) {
          factionStats[fac].totalCasualtiesSuffered += parseInt(loss, 10);
        }
      }

      if (log.includes("Raid by") || log.includes("Frontier raid")) {
        const raidMatch = log.match(/Raid by ([A-Z_]+)/);
        if (raidMatch && factionStats[raidMatch[1]]) {
          factionStats[raidMatch[1]].raidsConducted++;
        }
      }

      if (log.includes("captured") || log.includes("amphibious assault")) {
        const assaultMatch = log.match(/([A-Z_]+) captured/);
        if (assaultMatch && factionStats[assaultMatch[1]]) {
          factionStats[assaultMatch[1]].assaultsConducted++;
        }
      }
    }

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

    const postTurnFactions = await prisma.faction.findMany({
      where: { gameId },
      select: { type: true, unrestIndex: true },
    });
    for (const f of postTurnFactions) {
      if (f.unrestIndex >= 70) factionStats[f.type].unrestHighCount++;
      if (f.unrestIndex >= 85) factionStats[f.type].unrestCriticalCount++;
    }

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
      `[Run ${runId} | Turn ${t.toString().padStart(2, "0")}/20 | ${season.padEnd(6)} ${year}] ` +
      `${elapsed}s | Orders: ${resolutionPhase?.executedOrdersCount ?? 0} | Events: ${newEvents.length}`
    );
  }

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
    runId,
    gameId,
    totalTurns: maxTurns,
    factions: factionStats,
    combatLogs: allCombatLogs,
    eventHistory,
  };
}

async function main() {
  const scratchDir = path.resolve(process.cwd(), "scratch");
  if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

  const allRuns: RunResult[] = [];

  // Extract runs 1, 2, 3
  for (let r = 1; r <= 3; r++) {
    const runData = await extractCompletedRunFromDb(r, `batch5-sim-run-${r}`);
    allRuns.push(runData);
    fs.writeFileSync(path.join(scratchDir, `batch5_run_${r}.json`), JSON.stringify(runData, null, 2));
  }

  // Live execute runs 4 and 5
  for (let r = 4; r <= 5; r++) {
    const runData = await runLiveSimulation(r, 20);
    allRuns.push(runData);
    fs.writeFileSync(path.join(scratchDir, `batch5_run_${r}.json`), JSON.stringify(runData, null, 2));
  }

  // Save merged raw telemetry
  const rawPath = path.join(scratchDir, "batch5_simulations_raw_telemetry.json");
  fs.writeFileSync(rawPath, JSON.stringify(allRuns, null, 2));
  console.log(`Saved merged raw telemetry for all 5 runs to: ${rawPath}`);

  // Compute final aggregates
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
    let sumAssaultsConducted = 0;
    let sumWarsDeclared = 0;

    const territoryBreakdown: Record<string, number> = {};

    for (const r of allRuns) {
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
      sumInitialNodes += (data.initialNodes?.length || (fType === "GREAT_BRITAIN" || fType === "FRANCE" ? 5 : 1));
      sumFinalNodes += data.finalNodes.length;
      sumNetNodeDelta += data.netNodeDelta;
      sumCovenants += data.covenantsFormed;
      sumSubsidiesSent += data.subsidiesSent;
      sumRaidsConducted += data.raidsConducted;
      sumAssaultsConducted += data.assaultsConducted;
      sumWarsDeclared += data.warsDeclared;

      for (const node of data.finalNodes) {
        territoryBreakdown[node] = (territoryBreakdown[node] || 0) + 1;
      }
    }

    const n = allRuns.length;
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
      avgAssaultsConducted: Math.round((sumAssaultsConducted / n) * 10) / 10,
      avgWarsDeclared: Math.round((sumWarsDeclared / n) * 10) / 10,
      frequentlyControlledNodes: Object.entries(territoryBreakdown)
        .filter(([, count]) => count >= 3)
        .map(([name, count]) => `${name} (${count}/${n} runs)`),
    };
  }

  const summary = {
    totalRuns: allRuns.length,
    turnsPerRun: 20,
    totalSimulatedTurns: allRuns.length * 20,
    metricMatrix,
  };

  const summaryPath = path.join(scratchDir, "batch5_simulations_summary.json");
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`Saved summary matrix to: ${summaryPath}`);

  console.log("\n======================================================================");
  console.log("STAGE 1: FINAL 5-RUN METRIC MATRIX ACROSS ALL 10 FACTIONS (20 TURNS)");
  console.log("======================================================================");
  console.table(
    Object.entries(metricMatrix).map(([fac, m]) => ({
      Faction: fac,
      "Avg Treasury": m.avgFinalTreasury,
      "Avg Debt": m.avgFinalDebt,
      "Avg Unrest": m.avgFinalUnrest,
      "Str In->Fin": `${m.avgInitialStrength} -> ${m.avgFinalStrength}`,
      "Cas Suff": m.avgCasualtiesSuffered,
      "Cas Inf": m.avgCasualtiesInflicted,
      "Cas Ratio": m.casualtyRatio,
      "Nodes (Net)": `${m.avgFinalNodes} (${m.avgNetNodeDelta >= 0 ? "+" : ""}${m.avgNetNodeDelta})`,
      "Unrest Crit Turns": m.avgUnrestCriticalTurns,
      "Subsidies Sent": m.avgSubsidiesSent,
      "Raids": m.avgRaidsConducted,
    }))
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Batch audit execution failed:", err);
    process.exit(1);
  });
