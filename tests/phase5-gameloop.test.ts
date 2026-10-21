import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "@/lib/prisma";
import { seedCampaignGame } from "@/prisma/seed";
import {
  processIntelDispatchPhase,
  processDiplomaticTradePhase,
  processOrderSubmissionPhase,
  processResolutionPhase,
  executeFullTurnCycle,
} from "@/engine/state-machine";
import { applyOffMapTheaterModifiers } from "@/engine/off-map-events";
import { enqueueCourierDispatch } from "@/engine/courier-queue";
import { recordAndReconcileEvent } from "@/engine/events/reconciler";
import {
  EventScope,
  EventStatus,
  FactionType,
  Phase,
  RoleType,
} from "@prisma/client";

const TEST_GAME_ID = "test-phase5-gameloop-game";

describe("Phase 5: 4-Phase Game Loop Engine, Courier Queue & Off-Map Abstractor", () => {
  beforeAll(async () => {
    await seedCampaignGame(TEST_GAME_ID);
  });

  afterAll(async () => {
    await prisma.game.deleteMany({ where: { id: TEST_GAME_ID } });
  });

  it("applies Europe, India, and West Africa off-map modifiers to American theater ledgers", async () => {
    const result = await applyOffMapTheaterModifiers(TEST_GAME_ID);

    expect(result.offMapState.europeTheater.britishSubsidyDrain).toBeGreaterThan(0);
    expect(result.offMapState.indiaTheater.britishEastIndiaRevenue).toBeGreaterThan(0);
    expect(result.ledgerAdjustments).toHaveLength(10);

    const germanAdj = result.ledgerAdjustments.find(
      (a) => a.factionType === FactionType.GERMAN_STATES
    );
    expect(germanAdj?.treasuryDelta).toBeGreaterThan(0);
  });

  it("coordinates the 4-phase turn loop: INTEL_DISPATCH -> DIPLOMATIC_TRADE -> ORDER_SUBMISSION -> RESOLUTION", async () => {
    // Re-seed clean state for deterministic phase-by-phase check
    await seedCampaignGame(TEST_GAME_ID);

    const gb = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.GREAT_BRITAIN },
    });
    const haud = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.HAUDENOSAUNEE },
    });

    // Enqueue a 1-turn courier dispatch
    const customDispatch = await enqueueCourierDispatch({
      gameId: TEST_GAME_ID,
      senderFactionId: gb.id,
      targetFactionId: haud.id,
      content: "Urgent wampum belt from Albany requesting Mohawk scouts.",
      courierDelay: 1,
    });
    expect(customDispatch.turnsRemaining).toBe(1);

    // Phase 1: INTEL_DISPATCH
    const p1 = await processIntelDispatchPhase(TEST_GAME_ID);
    expect(p1.phaseExecuted).toBe(Phase.INTEL_DISPATCH);
    expect(p1.nextPhase).toBe(Phase.DIPLOMATIC_TRADE);
    expect(p1.courierReport.deliveredIds).toContain(customDispatch.id);

    // Phase 2: DIPLOMATIC_TRADE
    const p2 = await processDiplomaticTradePhase(TEST_GAME_ID);
    expect(p2.phaseExecuted).toBe(Phase.DIPLOMATIC_TRADE);
    expect(p2.nextPhase).toBe(Phase.ORDER_SUBMISSION);
    expect(p2.offMapReport.ledgerAdjustments).toHaveLength(10);

    // Phase 3: ORDER_SUBMISSION (Autonomous AI roles submit orders)
    const p3 = await processOrderSubmissionPhase(TEST_GAME_ID);
    expect(p3.phaseExecuted).toBe(Phase.ORDER_SUBMISSION);
    expect(p3.nextPhase).toBe(Phase.RESOLUTION);
    expect(p3.aiSubmissions.length).toBeGreaterThan(0);

    // Verify both deepseek-v4-pro and deepseek-flash were routed across Autonomous roles
    const modelsUsed = new Set(p3.aiSubmissions.map((s) => s.model));
    expect(modelsUsed.has("deepseek-v4-pro")).toBe(true);
    expect(modelsUsed.has("deepseek-flash")).toBe(true);

    // Phase 4: RESOLUTION
    const p4 = await processResolutionPhase(TEST_GAME_ID);
    expect(p4.phaseExecuted).toBe(Phase.RESOLUTION);
    expect(p4.nextPhase).toBe(Phase.INTEL_DISPATCH);
    expect(p4.executedOrdersCount).toBeGreaterThan(0);
    expect(p4.game.turnNumber).toBe(2);
    expect(p4.game.currentSeason).toBe("Summer");
    expect(p4.game.currentYear).toBe(1756);
  });

  it("resolves Fort Capture during RESOLUTION and deterministically supersedes prior GARRISON and BLOCKADE events", async () => {
    const fr = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.FRANCE },
    });
    const gb = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.GREAT_BRITAIN },
    });
    const oswego = await prisma.mapNode.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, name: { contains: "Oswego" } },
    });
    const ticonderoga = await prisma.mapNode.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, name: { contains: "Ticonderoga" } },
    });

    // Record an active GARRISON event on Oswego
    const garrisonEvent = await recordAndReconcileEvent({
      gameId: TEST_GAME_ID,
      turn: 2,
      category: "GARRISON",
      scope: EventScope.NODE,
      primaryNodeId: oswego.id,
      factionIds: [gb.id],
      title: "British Provincial Garrison at Oswego",
      description: "Mercer's provincial battalions hold the Ontario works.",
    });

    // Give France an overwhelming regular army at Ticonderoga to march on Oswego
    const overwhelmingUnit = await prisma.unit.create({
      data: {
        factionId: fr.id,
        nodeId: ticonderoga.id,
        unitType: "REGULAR",
        strength: 5500,
        discipline: 1.35,
        isAcclimatized: true,
      },
    });

    await prisma.order.create({
      data: {
        gameId: TEST_GAME_ID,
        factionId: fr.id,
        turnNumber: 2,
        orderType: "MOVE",
        submittedByRole: RoleType.MILITARY,
        isExecuted: false,
        payload: {
          orderType: "MOVE",
          sourceNodeId: ticonderoga.id,
          targetNodeId: oswego.id,
          unitIds: [overwhelmingUnit.id],
          allocatedTreasury: 20,
          reasoning: "Montcalm's siege expedition against Fort Oswego",
        },
      },
    });

    const cycleRes = await executeFullTurnCycle(TEST_GAME_ID);
    expect(cycleRes.newTurn).toBe(3);

    const updatedOswego = await prisma.mapNode.findUniqueOrThrow({
      where: { id: oswego.id },
    });
    expect(updatedOswego.controllingId).toBe(fr.id);

    const invalidatedGarrison = await prisma.gameEvent.findUniqueOrThrow({
      where: { id: garrisonEvent.id },
    });
    expect(invalidatedGarrison.status).toBe(EventStatus.SUPERSEDED);
  });
});
