import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "@/lib/prisma";
import { seedCampaignGame } from "@/prisma/seed";
import {
  processDiplomaticTradePhase,
  processResolutionPhase,
} from "@/engine/state-machine";
import {
  getRoleContextPayload,
  buildBoundedPromptMessages,
} from "@/engine/ai-agents/serializer";
import {
  getPairwiseDiplomaticStance,
  getFactionManpowerCap,
} from "@/engine/diplomacy";
import { FactionType, Phase, RoleType } from "@prisma/client";

const TEST_GAME_ID = "test-phase6-realism-game";

describe("Phase 6: Historical Realism & Simulation Mechanics Overhaul", () => {
  beforeAll(async () => {
    await seedCampaignGame(TEST_GAME_ID);
  });

  afterAll(async () => {
    await prisma.game.deleteMany({ where: { id: TEST_GAME_ID } });
  });

  it("Module 1: prevents allied factions (GERMAN_STATES & GREAT_BRITAIN) from capturing each other's cities and reinforces instead", async () => {
    const gb = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.GREAT_BRITAIN },
    });
    const german = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.GERMAN_STATES },
    });

    const stance = await getPairwiseDiplomaticStance(TEST_GAME_ID, gb, german);
    expect(stance).toBe("ALLIED");

    const philly = await prisma.mapNode.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, name: { contains: "Philadelphia" } },
    });
    const boston = await prisma.mapNode.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, name: { contains: "Boston" } },
    });

    // Order German States regulars in Philadelphia to MOVE to British Boston
    await prisma.order.create({
      data: {
        gameId: TEST_GAME_ID,
        factionId: german.id,
        turnNumber: 1,
        orderType: "MOVE",
        submittedByRole: RoleType.MILITARY,
        isExecuted: false,
        payload: {
          orderType: "MOVE",
          sourceNodeId: philly.id,
          targetNodeId: boston.id,
          allocatedTreasury: 0,
          reasoning: "March Royal American battalion to reinforce Boston",
        },
      },
    });

    const res = await processResolutionPhase(TEST_GAME_ID);
    expect(
      res.combatLogs.some((l) => l.includes("reinforced allied garrison at Boston"))
    ).toBe(true);

    // Verify Boston is STILL controlled by GREAT_BRITAIN
    const updatedBoston = await prisma.mapNode.findUniqueOrThrow({
      where: { id: boston.id },
    });
    expect(updatedBoston.controllingId).toBe(gb.id);
  });

  it("Module 2: enriches getRoleContextPayload with adjacentNodes (name, nodeType, owner) while staying under 1,500 tokens", async () => {
    const gb = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.GREAT_BRITAIN },
    });

    const payload = await getRoleContextPayload(
      TEST_GAME_ID,
      gb.id,
      RoleType.EXECUTIVE
    );
    expect(payload.controlledNodes.length).toBeGreaterThan(0);
    const firstNode = payload.controlledNodes[0];
    expect(firstNode.adjacentNodes.length).toBeGreaterThan(0);
    expect(firstNode.adjacentNodes[0]).toHaveProperty("name");
    expect(firstNode.adjacentNodes[0]).toHaveProperty("nodeType");
    expect(firstNode.adjacentNodes[0]).toHaveProperty("owner");

    const promptBundle = buildBoundedPromptMessages(
      payload,
      RoleType.EXECUTIVE,
      "AUTONOMOUS"
    );
    expect(promptBundle.estimatedPromptTokens).toBeLessThan(1500);
  });

  it("Module 3: executes bilateral SUBSIDIZE transfers from Great Britain to German States at Philadelphia and clamps standingPoints <= 10", async () => {
    const gbBefore = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.GREAT_BRITAIN },
    });
    const germanBefore = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.GERMAN_STATES },
    });
    const boston = await prisma.mapNode.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, name: { contains: "Boston" } },
    });
    const philly = await prisma.mapNode.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, name: { contains: "Philadelphia" } },
    });

    await prisma.order.create({
      data: {
        gameId: TEST_GAME_ID,
        factionId: gbBefore.id,
        turnNumber: 2,
        orderType: "SUBSIDIZE",
        submittedByRole: RoleType.EXECUTIVE,
        isExecuted: false,
        payload: {
          orderType: "SUBSIDIZE",
          sourceNodeId: boston.id,
          targetNodeId: philly.id,
          allocatedTreasury: 40,
          reasoning: "Westminster subsidy remittance to German States",
        },
      },
    });

    await processResolutionPhase(TEST_GAME_ID);

    const gbAfter = await prisma.faction.findUniqueOrThrow({
      where: { id: gbBefore.id },
    });
    const germanAfter = await prisma.faction.findUniqueOrThrow({
      where: { id: germanBefore.id },
    });

    expect(gbAfter.treasury).toBe(gbBefore.treasury - 40);
    expect(germanAfter.treasury).toBe(germanBefore.treasury + 40);
    expect(gbAfter.standingPoints).toBeLessThanOrEqual(10);
  });

  it("Modules 4 & 6: enforces faction manpower ceilings on RECRUIT and clamps unrestIndex to <= 100 during DIPLOMATIC_TRADE", async () => {
    const haud = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.HAUDENOSAUNEE },
    });
    const onondaga = await prisma.mapNode.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, name: { contains: "Onondaga" } },
    });

    expect(getFactionManpowerCap(FactionType.HAUDENOSAUNEE)).toBe(5000);

    // Give Haudenosaunee high treasury and attempt massive recruitment
    await prisma.faction.update({
      where: { id: haud.id },
      data: { treasury: 2000, unrestIndex: 99 },
    });

    await prisma.order.create({
      data: {
        gameId: TEST_GAME_ID,
        factionId: haud.id,
        turnNumber: 3,
        orderType: "RECRUIT",
        submittedByRole: RoleType.MILITARY,
        isExecuted: false,
        payload: {
          orderType: "RECRUIT",
          sourceNodeId: onondaga.id,
          allocatedTreasury: 1500,
          reasoning: "Muster Six Nations warriors up to Confederacy ceiling",
        },
      },
    });

    await processResolutionPhase(TEST_GAME_ID);

    const haudUnits = await prisma.unit.findMany({
      where: { factionId: haud.id },
    });
    const totalStr = haudUnits.reduce((sum, u) => sum + u.strength, 0);
    expect(totalStr).toBeLessThanOrEqual(5000);

    // Test unrest clamping and mutiny check in processDiplomaticTradePhase
    await prisma.faction.update({
      where: { id: haud.id },
      data: { unrestIndex: 120 },
    });
    await processDiplomaticTradePhase(TEST_GAME_ID);

    const haudClamped = await prisma.faction.findUniqueOrThrow({
      where: { id: haud.id },
    });
    expect(haudClamped.unrestIndex).toBeLessThanOrEqual(100);
  });

  it("Module 5: rejects non-adjacent MOVE orders and applies Winter freeze attrition in the St. Lawrence corridor", async () => {
    const fr = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.FRANCE },
    });
    const quebec = await prisma.mapNode.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, name: { contains: "Quebec" } },
    });
    const havana = await prisma.mapNode.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, name: { contains: "Havana" } },
    });
    const champlain = await prisma.mapNode.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, name: { contains: "Lake Champlain" } },
    });

    // Set season to Winter
    await prisma.game.update({
      where: { id: TEST_GAME_ID },
      data: { currentSeason: "Winter", currentPhase: Phase.RESOLUTION },
    });

    const quebecUnit = await prisma.unit.findFirstOrThrow({
      where: { factionId: fr.id, nodeId: quebec.id },
    });
    const initialStr = quebecUnit.strength;

    // 1) Non-adjacent move (Quebec -> Havana) should be rejected
    await prisma.order.create({
      data: {
        gameId: TEST_GAME_ID,
        factionId: fr.id,
        turnNumber: 4,
        orderType: "MOVE",
        submittedByRole: RoleType.MILITARY,
        isExecuted: false,
        payload: {
          orderType: "MOVE",
          sourceNodeId: quebec.id,
          targetNodeId: havana.id,
          unitIds: [quebecUnit.id],
          allocatedTreasury: 0,
          reasoning: "Invalid non-adjacent move to Havana",
        },
      },
    });

    // 2) Adjacent Winter move (Quebec -> Lake Champlain) should incur 15% winter freeze attrition
    await prisma.order.create({
      data: {
        gameId: TEST_GAME_ID,
        factionId: fr.id,
        turnNumber: 4,
        orderType: "MOVE",
        submittedByRole: RoleType.MILITARY,
        isExecuted: false,
        payload: {
          orderType: "MOVE",
          sourceNodeId: quebec.id,
          targetNodeId: champlain.id,
          unitIds: [quebecUnit.id],
          allocatedTreasury: 0,
          reasoning: "Winter march from Quebec to Lake Champlain",
        },
      },
    });

    const res = await processResolutionPhase(TEST_GAME_ID);
    expect(
      res.combatLogs.some((l) => l.includes("Move rejected: Quebec is not adjacent to Havana"))
    ).toBe(true);

    const movedUnit = await prisma.unit.findUniqueOrThrow({
      where: { id: quebecUnit.id },
    });
    expect(movedUnit.nodeId).toBe(champlain.id);
    expect(movedUnit.strength).toBe(Math.floor(initialStr * 0.85));
  });
});
