import { describe, it, expect, beforeEach, afterAll } from "vitest";
import prisma from "@/lib/prisma";
import { seedCampaignGame } from "@/prisma/seed";
import {
  processResolutionPhase,
  processDiplomaticTradePhase,
} from "@/engine/state-machine";
import {
  evaluateTreatyConference,
  declareWarBetweenFactions,
  getPairwiseDiplomaticStance,
} from "@/engine/diplomacy";
import { FactionType, Phase, RoleType } from "@prisma/client";

const TEST_GAME_ID = "test-phase7-recommendations-game";

describe("Phase 7: Comprehensive Implementation of All 7 Report Recommendations", () => {
  beforeEach(async () => {
    await seedCampaignGame(TEST_GAME_ID);
  });

  afterAll(async () => {
    await prisma.game.deleteMany({ where: { id: TEST_GAME_ID } });
  });

  it("Recommendation 1: evaluates dynamic Treaty of Paris peace conference, granting 35% debt relief and setting isPeaceTreatyConcluded", async () => {
    const gb = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.GREAT_BRITAIN },
    });
    const fr = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.FRANCE },
    });

    // Set high debt and unrest simulating late-war exhaustion
    await prisma.faction.update({
      where: { id: gb.id },
      data: { debt: 400, unrestIndex: 85 },
    });
    await prisma.faction.update({
      where: { id: fr.id },
      data: { debt: 600, unrestIndex: 90 },
    });

    const treatyRes = await evaluateTreatyConference(TEST_GAME_ID);
    expect(treatyRes.triggered).toBe(true);
    expect(treatyRes.treatySummary).toContain("1763 Treaty of Paris ratified");

    const updatedGame = await prisma.game.findUniqueOrThrow({
      where: { id: TEST_GAME_ID },
    });
    expect(updatedGame.isPeaceTreatyConcluded).toBe(true);

    const updatedGb = await prisma.faction.findUniqueOrThrow({
      where: { id: gb.id },
    });
    const updatedFr = await prisma.faction.findUniqueOrThrow({
      where: { id: fr.id },
    });

    // Verify 35% debt write-down (400 -> 260, 600 -> 390)
    expect(updatedGb.debt).toBe(260);
    expect(updatedFr.debt).toBe(390);
    expect(updatedGb.unrestIndex).toBe(65); // 85 - 20
  });

  it("Recommendation 2: surfaces explicit tactical feed combat logs for Winter freeze and naval blockades", async () => {
    const fr = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.FRANCE },
    });
    const gb = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.GREAT_BRITAIN },
    });
    const quebec = await prisma.mapNode.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, name: { contains: "Quebec" } },
    });
    const champlain = await prisma.mapNode.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, name: { contains: "Lake Champlain" } },
    });
    const gulfStLawrence = await prisma.mapNode.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, name: { contains: "Gulf of St. Lawrence" } },
    });

    // Set Winter season
    await prisma.game.update({
      where: { id: TEST_GAME_ID },
      data: { currentSeason: "Winter" },
    });

    // 1. Move in Winter through St. Lawrence corridor
    const frUnit = await prisma.unit.findFirstOrThrow({
      where: { factionId: fr.id, nodeId: quebec.id },
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
          sourceNodeId: quebec.id,
          targetNodeId: champlain.id,
          unitIds: [frUnit.id],
          allocatedTreasury: 0,
          reasoning: "Winter march to Richelieu portage",
        },
      },
    });

    // 2. Put British Ship of the Line in Gulf of St. Lawrence to blockade Quebec trade
    await prisma.unit.create({
      data: {
        factionId: gb.id,
        nodeId: gulfStLawrence.id,
        unitType: "SHIP_OF_THE_LINE",
        strength: 1200,
      },
    });

    await prisma.order.create({
      data: {
        gameId: TEST_GAME_ID,
        factionId: fr.id,
        turnNumber: 2,
        orderType: "TRADE",
        submittedByRole: RoleType.DIPLOMATIC_COMMERCE,
        isExecuted: false,
        payload: {
          orderType: "TRADE",
          sourceNodeId: quebec.id,
          allocatedTreasury: 20,
          reasoning: "Attempt merchant convoy from Quebec under blockade",
        },
      },
    });

    const res = await processResolutionPhase(TEST_GAME_ID);

    // Verify explicit weather and blockade logs
    expect(res.combatLogs.some((l) => l.includes("[Winter Freeze]"))).toBe(true);
    expect(res.combatLogs.some((l) => l.includes("[Naval Blockade]"))).toBe(true);
  });

  it("Recommendation 3: enforces Indigenous Boundary Covenants and penalizes European violations", async () => {
    const haud = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.HAUDENOSAUNEE },
    });
    const gb = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.GREAT_BRITAIN },
    });
    const onondaga = await prisma.mapNode.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, name: { contains: "Onondaga" } },
    });
    const oswego = await prisma.mapNode.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, name: { contains: "Oswego" } },
    });

    // Haudenosaunee issues a COVENANT_BOUNDARY order on Onondaga
    await prisma.order.create({
      data: {
        gameId: TEST_GAME_ID,
        factionId: haud.id,
        turnNumber: 3,
        orderType: "COVENANT_BOUNDARY",
        submittedByRole: RoleType.EXECUTIVE,
        isExecuted: false,
        payload: {
          orderType: "COVENANT_BOUNDARY",
          sourceNodeId: onondaga.id,
          allocatedTreasury: 0,
          reasoning: "Proclaim Onondaga council lands covenanted under Treaty of Easton",
        },
      },
    });

    await processResolutionPhase(TEST_GAME_ID);

    const haudAfter = await prisma.faction.findUniqueOrThrow({
      where: { id: haud.id },
    });
    expect(haudAfter.covenantBoundaries).toContain(onondaga.id);

    // Now a British unit in Oswego attempts to MOVE into covenanted Onondaga
    const gbUnit = await prisma.unit.findFirstOrThrow({
      where: { factionId: gb.id },
    });
    const gbUnrestBefore = (await prisma.faction.findUniqueOrThrow({ where: { id: gb.id } })).unrestIndex;

    await prisma.order.create({
      data: {
        gameId: TEST_GAME_ID,
        factionId: gb.id,
        turnNumber: 4,
        orderType: "MOVE",
        submittedByRole: RoleType.MILITARY,
        isExecuted: false,
        payload: {
          orderType: "MOVE",
          sourceNodeId: oswego.id,
          targetNodeId: onondaga.id,
          unitIds: [gbUnit.id],
          allocatedTreasury: 0,
          reasoning: "Encroaching march across the covenant line",
        },
      },
    });

    const res = await processResolutionPhase(TEST_GAME_ID);
    expect(res.combatLogs.some((l) => l.includes("[Covenant Violation]"))).toBe(true);

    const gbAfterViolation = await prisma.faction.findUniqueOrThrow({ where: { id: gb.id } });
    expect(gbAfterViolation.unrestIndex).toBeGreaterThan(gbUnrestBefore);
  });

  it("Recommendation 4: executes combined AMPHIBIOUS_ASSAULT with preliminary naval bombardment", async () => {
    const gb = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.GREAT_BRITAIN },
    });
    const fr = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.FRANCE },
    });
    const louisbourg = await prisma.mapNode.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, name: { contains: "Louisbourg" } },
    });
    const gulfStLawrence = await prisma.mapNode.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, name: { contains: "Gulf of St. Lawrence" } },
    });

    // Ensure Louisbourg is controlled by France with a defender unit
    await prisma.mapNode.update({
      where: { id: louisbourg.id },
      data: { controllingId: fr.id },
    });
    await prisma.unit.deleteMany({ where: { nodeId: louisbourg.id } });
    await prisma.unit.create({
      data: {
        factionId: fr.id,
        nodeId: louisbourg.id,
        unitType: "REGULAR",
        strength: 500,
        discipline: 1.0,
      },
    });

    // Position British Ships of the Line in Gulf of St. Lawrence
    await prisma.unit.create({
      data: {
        factionId: gb.id,
        nodeId: gulfStLawrence.id,
        unitType: "SHIP_OF_THE_LINE",
        strength: 2000,
        discipline: 1.2,
      },
    });

    // Create British landing regular regiment
    const landRegiment = await prisma.unit.create({
      data: {
        factionId: gb.id,
        nodeId: gulfStLawrence.id,
        unitType: "REGULAR",
        strength: 2500,
        discipline: 1.2,
      },
    });

    await prisma.order.create({
      data: {
        gameId: TEST_GAME_ID,
        factionId: gb.id,
        turnNumber: 5,
        orderType: "AMPHIBIOUS_ASSAULT",
        submittedByRole: RoleType.MILITARY,
        isExecuted: false,
        payload: {
          orderType: "AMPHIBIOUS_ASSAULT",
          sourceNodeId: gulfStLawrence.id,
          targetNodeId: louisbourg.id,
          unitIds: [landRegiment.id],
          allocatedTreasury: 20,
          reasoning: "Amphibious landing at Gabarus Bay with fleet gunfire support",
        },
      },
    });

    const res = await processResolutionPhase(TEST_GAME_ID);
    expect(res.combatLogs.some((l) => l.includes("[Amphibious Assault]"))).toBe(true);
    expect(res.combatLogs.some((l) => l.includes("captured Fortress Louisbourg via combined amphibious assault"))).toBe(true);

    const updatedLouisbourg = await prisma.mapNode.findUniqueOrThrow({
      where: { id: louisbourg.id },
    });
    expect(updatedLouisbourg.controllingId).toBe(gb.id);
  });

  it("Recommendation 5: processes DECLARE_WAR orders and dynamic war escalation against neutrals", async () => {
    const gb = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.GREAT_BRITAIN },
    });
    const spain = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.SPAIN },
    });
    const havana = await prisma.mapNode.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, name: { contains: "Havana" } },
    });

    // Initially Spain and Great Britain are NEUTRAL
    const initialStance = await getPairwiseDiplomaticStance(TEST_GAME_ID, gb, spain);
    expect(initialStance).toBe("NEUTRAL");

    // British Executive issues a formal DECLARE_WAR order targeting Spanish Havana
    await prisma.order.create({
      data: {
        gameId: TEST_GAME_ID,
        factionId: gb.id,
        turnNumber: 6,
        orderType: "DECLARE_WAR",
        submittedByRole: RoleType.EXECUTIVE,
        isExecuted: false,
        payload: {
          orderType: "DECLARE_WAR",
          sourceNodeId: havana.id,
          targetNodeId: havana.id,
          allocatedTreasury: 0,
          reasoning: "Interdict Spanish flota and declare war following Third Family Compact",
        },
      },
    });

    const res = await processResolutionPhase(TEST_GAME_ID);
    expect(res.combatLogs.some((l) => l.includes("[Declaration of War]"))).toBe(true);

    const updatedStance = await getPairwiseDiplomaticStance(TEST_GAME_ID, gb, spain);
    expect(updatedStance).toBe("AT_WAR");
  });

  it("Recommendation 6: resolves ASSEMBLY_NEGOTIATION granting provincial supply credits or political conciliation", async () => {
    const gb = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.GREAT_BRITAIN },
    });
    const boston = await prisma.mapNode.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, name: { contains: "Boston" } },
    });

    const treasuryBefore = gb.treasury;
    const unrestBefore = gb.unrestIndex;

    // 1. Emergency Supply request (alloc: 0) -> +40 £ treasury, +5 unrest
    await prisma.order.create({
      data: {
        gameId: TEST_GAME_ID,
        factionId: gb.id,
        turnNumber: 7,
        orderType: "ASSEMBLY_NEGOTIATION",
        submittedByRole: RoleType.EXECUTIVE,
        isExecuted: false,
        payload: {
          orderType: "ASSEMBLY_NEGOTIATION",
          sourceNodeId: boston.id,
          allocatedTreasury: 0,
          reasoning: "Request emergency war credits from Massachusetts General Court",
        },
      },
    });

    const res = await processResolutionPhase(TEST_GAME_ID);
    expect(res.combatLogs.some((l) => l.includes("secured 40 £ emergency supply credits"))).toBe(true);

    const gbAfter = await prisma.faction.findUniqueOrThrow({ where: { id: gb.id } });
    expect(gbAfter.treasury).toBe(treasuryBefore + 40);
    expect(gbAfter.unrestIndex).toBe(unrestBefore + 5);
  });

  it("Recommendation 7: tracks and accomplishes multi-turn strategic campaigns stored in FactionRole memory", async () => {
    const gb = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.GREAT_BRITAIN },
    });
    const ticonderoga = await prisma.mapNode.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, name: { contains: "Ticonderoga" } },
    });

    const gbMilitary = await prisma.factionRole.findFirstOrThrow({
      where: { factionId: gb.id, roleType: RoleType.MILITARY },
    });

    // Assign persistent strategic objective in FactionRole memory
    await prisma.factionRole.update({
      where: { id: gbMilitary.id },
      data: {
        strategicObjective: {
          objectiveNodeId: ticonderoga.id,
          objectiveType: "CAPTURE",
          targetDeadlineTurn: 12,
          status: "IN_PROGRESS",
          campaignName: "Loudoun-Amherst Lake Champlain Offensive",
        },
      },
    });

    // Ensure Great Britain controls Ticonderoga
    await prisma.mapNode.update({
      where: { id: ticonderoga.id },
      data: { controllingId: gb.id },
    });

    const res = await processResolutionPhase(TEST_GAME_ID);
    expect(res.combatLogs.some((l) => l.includes("[Strategic Objective Accomplished]"))).toBe(true);

    const updatedRole = await prisma.factionRole.findUniqueOrThrow({
      where: { id: gbMilitary.id },
    });
    const obj = updatedRole.strategicObjective as any;
    expect(obj.status).toBe("ACCOMPLISHED");
    expect(obj.completedTurn).toBeGreaterThan(0);
  });
});
