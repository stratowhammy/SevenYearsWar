import fs from "fs";
import path from "path";

// 1. Load environment variables
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const envText = fs.readFileSync(envPath, "utf8");
  for (const line of envText.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^"|"$/g, "");
  }
}

// Timeout for live API: 1800ms allows responsive calls while preventing stalls
process.env.DEEPSEEK_TIMEOUT_MS = "1800";
process.env.FORCE_LIVE_DEEPSEEK = "true";

import prisma from "@/lib/prisma";
import { seedCampaignGame } from "@/prisma/seed";
import { executeFullTurnCycle, reconcileAndPersistVictoryPoints } from "@/engine/state-machine";
import { ControllerType, BotBehavior, FactionType, RoleType } from "@prisma/client";
import { INITIAL_FACTIONS, INITIAL_UNITS } from "@/prisma/seed-data";

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
  { turn: 18, season: "Summer", year: 1760, milestone: "Capitulation of French Forces in St. Lawrence Corridor", targetNode: "Quebec", expectedController: FactionType.GREAT_BRITAIN },
  { turn: 20, season: "Winter", year: 1760, milestone: "British Naval Superiority in Atlantic Shipping", targetNode: "Atlantic Shipping Lanes", expectedController: FactionType.GREAT_BRITAIN },
  { turn: 24, season: "Winter", year: 1761, milestone: "Bourbon Alliance Solidified (Third Family Compact active)", targetNode: "Havana", expectedController: FactionType.SPAIN },
  { turn: 26, season: "Summer", year: 1762, milestone: "British Caribbean Expedition Threatens Havana", targetNode: "Havana", expectedController: FactionType.GREAT_BRITAIN },
  { turn: 28, season: "Winter", year: 1762, milestone: "British Hegemony in Lake Ontario & St. Lawrence", targetNode: "Fort Niagara", expectedController: FactionType.GREAT_BRITAIN },
];

export interface CampaignRunTelemetry {
  runIndex: number;
  gameId: string;
  timestamp: string;
  totalTurns: number;
  durationSeconds: number;
  totalCasualties: number;
  totalRaids: number;
  totalCombatEvents: number;
  totalFortCaptures: number;
  totalArbiterRulings: number;
  totalMutinies: number;
  historicalFidelityScore: number;
  orderDistribution: Record<string, number>;
  liveApiHitsCount: number;
  syntheticOrdersCount: number;
  milestoneResults: Array<{
    turn: number;
    season: string;
    year: number;
    milestone: string;
    targetNode: string;
    expectedController: FactionType;
    actualController: FactionType | null;
    matched: boolean;
  }>;
  arbiterRulingsBreakdown: Record<string, { count: number; outcomes: Record<string, number> }>;
  finalFactionRankings: Array<{
    factionType: string;
    victoryPoints: number;
    treasury: number;
    debt: number;
    unrestIndex: number;
    standingPoints: number;
    assemblySupport: number;
    nodesControlled: string[];
    nodeCount: number;
    totalStrength: number;
    unitCount: number;
    roleBreakdown: Array<{
      roleType: RoleType;
      title: string;
      victoryPoints: number;
      breakdown: any;
    }>;
  }>;
  turnSnapshots: Array<{
    turn: number;
    year: number;
    season: string;
    turnCasualties: number;
    cumulativeCasualties: number;
    ordersExecuted: number;
    liveApiHits: number;
    ordersByType: Record<string, number>;
    fortCaptures: string[];
    arbiterRulings: Array<{ arbiter: string; title: string; category: string }>;
    factions: Record<string, {
      treasury: number;
      debt: number;
      unrestIndex: number;
      standingPoints: number;
      assemblySupport: number;
      victoryPoints: number;
      nodesControlled: string[];
      nodeCount: number;
      totalStrength: number;
    }>;
    durationMs: number;
  }>;
}

async function runSingleCampaign(runIndex: number): Promise<CampaignRunTelemetry> {
  const gameId = `syw-campaign-run${runIndex}-7yr`;
  const telemetryPath = path.join(TELEMETRY_DIR, `campaign_run_${runIndex}_7yr_telemetry.json`);
  const campaignStartTime = Date.now();

  console.log(`\n==========================================================================`);
  console.log(`>>> STARTING 7-YEAR CAMPAIGN ${runIndex}/5 (Game ID: ${gameId})`);
  console.log(`>>> Horizon: 28 Seasonal Turns (Spring 1756 -> Winter 1762) | 10 Factions, 30 Roles`);
  console.log(`==========================================================================`);

  // 1. Seed fresh campaign
  await seedCampaignGame(gameId);

  // 2. Set all 30 seats to COMPUTER / AUTONOMOUS
  const seatUpdate = await prisma.factionRole.updateMany({
    where: { faction: { gameId } },
    data: {
      controller: ControllerType.COMPUTER,
      botBehavior: BotBehavior.AUTONOMOUS,
    },
  });
  console.log(`[Campaign ${runIndex}] Configured ${seatUpdate.count}/30 character seats to COMPUTER / AUTONOMOUS.`);

  // 3. Initialize baseline VP standings
  await reconcileAndPersistVictoryPoints(gameId);

  const TOTAL_TURNS = 28;
  const turnSnapshots: CampaignRunTelemetry["turnSnapshots"] = [];
  const milestoneResults: CampaignRunTelemetry["milestoneResults"] = [];
  const orderDistribution: Record<string, number> = {};
  const arbiterRulingsBreakdown: Record<string, { count: number; outcomes: Record<string, number> }> = {};

  let totalCasualtiesAcrossGame = 0;
  let totalRaids = 0;
  let totalCombatEvents = 0;
  let totalFortCaptures = 0;
  let totalArbiterRulings = 0;
  let totalMutinies = 0;
  let totalLiveApiHits = 0;
  let totalSyntheticOrders = 0;

  for (let t = 1; t <= TOTAL_TURNS; t++) {
    const preTurnGame = await prisma.game.findUniqueOrThrow({
      where: { id: gameId },
    });
    const year = preTurnGame.currentYear;
    const season = preTurnGame.currentSeason;
    const t0 = Date.now();

    // Execute full 4-phase turn cycle
    const cycleResult = await executeFullTurnCycle(gameId);
    const elapsedMs = Date.now() - t0;

    const orderSubPhase: any = cycleResult.phaseResults.find(
      (r: any) => r.phaseExecuted === "ORDER_SUBMISSION"
    );
    const resolutionPhase: any = cycleResult.phaseResults.find(
      (r: any) => r.phaseExecuted === "RESOLUTION"
    );

    const submissions: any[] = orderSubPhase?.aiSubmissions ?? [];
    const liveHitsThisTurn = submissions.filter((s) => s.usedLiveApi).length;
    const syntheticThisTurn = submissions.length - liveHitsThisTurn;
    totalLiveApiHits += liveHitsThisTurn;
    totalSyntheticOrders += syntheticThisTurn;

    // Track order types this turn
    const turnOrdersByType: Record<string, number> = {};
    for (const sub of submissions) {
      for (const ord of (sub.orders ?? [])) {
        const type = ord.orderType || "UNKNOWN";
        turnOrdersByType[type] = (turnOrdersByType[type] || 0) + 1;
        orderDistribution[type] = (orderDistribution[type] || 0) + 1;
      }
    }

    const combatLogs: string[] = resolutionPhase?.combatLogs ?? [];
    let turnCasualties = 0;
    const fortCapturesThisTurn: string[] = [];

    for (const log of combatLogs) {
      const match = log.match(/(\d+)\s+casualties/i);
      if (match) turnCasualties += parseInt(match[1], 10);
      if (log.toLowerCase().includes("raid")) totalRaids++;
      if (log.toLowerCase().includes("battle") || log.toLowerCase().includes("assault")) totalCombatEvents++;
      if (log.includes("[Fort Captured]") || log.includes("Breach & Fall") || log.includes("Honours of War")) {
        totalFortCaptures++;
        fortCapturesThisTurn.push(log);
      }
      if (log.includes("Colonial Mutiny")) totalMutinies++;
    }
    totalCasualtiesAcrossGame += turnCasualties;

    // Retrieve events recorded this turn
    const turnEvents = await prisma.gameEvent.findMany({
      where: { gameId, turnRecorded: preTurnGame.turnNumber },
    });

    const turnArbiterRulings: Array<{ arbiter: string; title: string; category: string }> = [];
    for (const ev of turnEvents) {
      if (ev.category === "ARBITER_RULING" || ev.title.includes("Arbiter Ruling")) {
        totalArbiterRulings++;
        const arbiterMatch = ev.title.match(/\[Arbiter Ruling:\s*([^\]]+)\]/);
        const arbiterName = arbiterMatch ? arbiterMatch[1].trim() : "Story Arbiter";
        
        let outcome = "GENERAL";
        if (ev.description.includes("DECISIVE_BREACH") || ev.title.includes("Breach & Fall")) outcome = "DECISIVE_BREACH";
        else if (ev.description.includes("BLOODY_REPULSE") || ev.title.includes("Disastrous Repulse")) outcome = "BLOODY_REPULSE";
        else if (ev.description.includes("PROTRACTED_SIEGE") || ev.title.includes("Protracted Siege")) outcome = "PROTRACTED_SIEGE";
        else if (ev.description.includes("HONOURS_OF_WAR") || ev.title.includes("Honours of War")) outcome = "HONOURS_OF_WAR";
        else if (ev.description.includes("PANIC_STORM") || ev.title.includes("Backcountry Panic")) outcome = "PANIC_STORM";
        else if (ev.description.includes("SCOUT_AMBUSH") || ev.title.includes("Frontier Ambush")) outcome = "SCOUT_AMBUSH";
        else if (ev.description.includes("FULL_APPROPRIATION")) outcome = "FULL_APPROPRIATION";
        else if (ev.description.includes("ASSEMBLY_DEADLOCK")) outcome = "ASSEMBLY_DEADLOCK";
        else if (ev.description.includes("PATRONAGE_COMPROMISE")) outcome = "PATRONAGE_COMPROMISE";

        if (!arbiterRulingsBreakdown[arbiterName]) {
          arbiterRulingsBreakdown[arbiterName] = { count: 0, outcomes: {} };
        }
        arbiterRulingsBreakdown[arbiterName].count++;
        arbiterRulingsBreakdown[arbiterName].outcomes[outcome] =
          (arbiterRulingsBreakdown[arbiterName].outcomes[outcome] || 0) + 1;

        turnArbiterRulings.push({
          arbiter: arbiterName,
          title: ev.title,
          category: ev.category,
        });
      }
    }

    // Refresh game state
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
        nodes: { include: { controller: true } },
      },
    });

    const factionTelemetry: Record<string, any> = {};
    for (const f of refreshedGame.factions) {
      const totalStrength = f.units.reduce((sum, u) => sum + u.strength, 0);
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
      };
    }

    // Check historical milestones
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
      ordersExecuted: resolutionPhase?.executedOrdersCount ?? 0,
      liveApiHits: liveHitsThisTurn,
      ordersByType: turnOrdersByType,
      fortCaptures: fortCapturesThisTurn,
      arbiterRulings: turnArbiterRulings,
      factions: factionTelemetry,
      durationMs: elapsedMs,
    });

    console.log(
      `[Run ${runIndex} | T${t.toString().padStart(2, "0")} ${season.padEnd(6)} ${year}] Orders: ${(resolutionPhase?.executedOrdersCount ?? 0).toString().padStart(2)} | Cas: ${turnCasualties.toString().padStart(4)} | Forts: ${refreshedGame.nodes.filter(n => n.controller).length}/23 | Live AI: ${liveHitsThisTurn}/30 (${elapsedMs}ms)`
    );
  }

  // End of Campaign Audit
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
    },
  });

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
      unitCount: f.units.length,
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
  const durationSeconds = Math.round((Date.now() - campaignStartTime) / 1000);

  const telemetry: CampaignRunTelemetry = {
    runIndex,
    gameId,
    timestamp: new Date().toISOString(),
    totalTurns: TOTAL_TURNS,
    durationSeconds,
    totalCasualties: totalCasualtiesAcrossGame,
    totalRaids,
    totalCombatEvents,
    totalFortCaptures,
    totalArbiterRulings,
    totalMutinies,
    historicalFidelityScore,
    orderDistribution,
    liveApiHitsCount: totalLiveApiHits,
    syntheticOrdersCount: totalSyntheticOrders,
    milestoneResults,
    arbiterRulingsBreakdown,
    finalFactionRankings,
    turnSnapshots,
  };

  fs.writeFileSync(telemetryPath, JSON.stringify(telemetry, null, 2));
  console.log(`\n>>> CAMPAIGN ${runIndex} FINISHED in ${durationSeconds}s`);
  console.log(`>>> Fidelity: ${historicalFidelityScore}% (${matchedCount}/${HISTORICAL_BENCHMARKS.length} milestones)`);
  console.log(`>>> Total Casualties: ${totalCasualtiesAcrossGame.toLocaleString()} | Captures: ${totalFortCaptures} | Rulings: ${totalArbiterRulings}`);
  console.log(`>>> Top 3 Factions:`);
  finalFactionRankings.slice(0, 3).forEach((f, idx) => {
    console.log(`    ${idx + 1}. ${f.factionType}: ${f.victoryPoints}/30 VP (Nodes: ${f.nodeCount}, Treasury: £${f.treasury}, Debt: £${f.debt})`);
  });

  return telemetry;
}

async function main() {
  console.log("==========================================================================");
  console.log("7-YEAR AUTONOMOUS AI CAMPAIGN SUITE: 5 FULL 28-TURN SIMULATIONS (1756-1763)");
  console.log("Testing Historical Narrative Plausibility, Story Arbiters & Core Mechanics");
  console.log("==========================================================================");

  const suiteStartTime = Date.now();
  const allCampaigns: CampaignRunTelemetry[] = [];

  for (let run = 1; run <= 5; run++) {
    const res = await runSingleCampaign(run);
    allCampaigns.push(res);
  }

  // Aggregate Analysis
  const aggregate = {
    timestamp: new Date().toISOString(),
    totalCampaigns: 5,
    totalTurnsExecuted: 5 * 28, // 140 turns
    totalDurationSeconds: Math.round((Date.now() - suiteStartTime) / 1000),
    campaignSummaries: allCampaigns.map((c) => ({
      runIndex: c.runIndex,
      gameId: c.gameId,
      fidelityScore: c.historicalFidelityScore,
      durationSeconds: c.durationSeconds,
      totalCasualties: c.totalCasualties,
      totalCaptures: c.totalFortCaptures,
      totalArbiterRulings: c.totalArbiterRulings,
      totalMutinies: c.totalMutinies,
      topFaction: c.finalFactionRankings[0]?.factionType,
      topFactionVP: c.finalFactionRankings[0]?.victoryPoints,
      britishVP: c.finalFactionRankings.find(f => f.factionType === "GREAT_BRITAIN")?.victoryPoints,
      frenchVP: c.finalFactionRankings.find(f => f.factionType === "FRANCE")?.victoryPoints,
      spanishVP: c.finalFactionRankings.find(f => f.factionType === "SPAIN")?.victoryPoints,
      haudenosauneeVP: c.finalFactionRankings.find(f => f.factionType === "HAUDENOSAUNEE")?.victoryPoints,
    })),
    aggregateAverages: {
      avgFidelityScore: Math.round(allCampaigns.reduce((s, c) => s + c.historicalFidelityScore, 0) / 5),
      avgCasualties: Math.round(allCampaigns.reduce((s, c) => s + c.totalCasualties, 0) / 5),
      avgCaptures: Math.round(allCampaigns.reduce((s, c) => s + c.totalFortCaptures, 0) / 5),
      avgArbiterRulings: Math.round(allCampaigns.reduce((s, c) => s + c.totalArbiterRulings, 0) / 5),
      avgMutinies: Math.round(allCampaigns.reduce((s, c) => s + c.totalMutinies, 0) / 5),
    },
    benchmarkPassRates: HISTORICAL_BENCHMARKS.map((b) => {
      const passes = allCampaigns.filter((c) =>
        c.milestoneResults.some((m) => m.turn === b.turn && m.milestone === b.milestone && m.matched)
      ).length;
      return {
        turn: b.turn,
        season: b.season,
        year: b.year,
        milestone: b.milestone,
        expectedController: b.expectedController,
        targetNode: b.targetNode,
        passCount: passes,
        passRatePercent: Math.round((passes / 5) * 100),
      };
    }),
    totalOrdersExecutedAcrossAllCampaigns: allCampaigns.reduce(
      (s, c) => s + Object.values(c.orderDistribution).reduce((a, b) => a + b, 0),
      0
    ),
    aggregateOrderDistribution: allCampaigns.reduce((acc, c) => {
      for (const [k, v] of Object.entries(c.orderDistribution)) {
        acc[k] = (acc[k] || 0) + v;
      }
      return acc;
    }, {} as Record<string, number>),
  };

  const aggregatePath = path.join(TELEMETRY_DIR, "five_campaigns_7yr_aggregate_telemetry.json");
  fs.writeFileSync(aggregatePath, JSON.stringify({ aggregate, campaigns: allCampaigns }, null, 2));

  console.log("\n==========================================================================");
  console.log(`ALL 5 FULL 7-YEAR CAMPAIGNS SUCCESSFULLY COMPLETED in ${aggregate.totalDurationSeconds}s!`);
  console.log(`Total Turns Executed: 140 (28 turns × 5 campaigns)`);
  console.log(`Total Autonomous Orders: ${aggregate.totalOrdersExecutedAcrossAllCampaigns.toLocaleString()}`);
  console.log(`Average Historical Fidelity Score: ${aggregate.aggregateAverages.avgFidelityScore}%`);
  console.log(`Aggregate Telemetry Saved To: ${aggregatePath}`);
  console.log("==========================================================================");
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error during 5-campaign execution:", err);
  process.exit(1);
});
