import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "@/lib/prisma";
import { seedCampaignGame } from "@/prisma/seed";
import {
  STORY_ARBITERS,
  selectActiveStoryArbiter,
  arbitrateContestedAssault,
  arbitrateFrontierRaid,
  arbitrateAssemblyNegotiation,
  arbitrateNavalEngagement,
} from "@/engine/ai-arbiters/story-arbiters";
import { processResolutionPhase } from "@/engine/state-machine";
import { FactionType, RoleType, EventStatus } from "@prisma/client";
import { findNextHopTowardObjective } from "@/engine/ai-agents/controller";
import {
  getCharacterRoleGuide,
  evaluateCharacterObjectives,
} from "@/lib/character-objectives";

const TEST_GAME_ID = "test-phase8-story-arbiters-game";

describe("Phase 8: AI Story Arbiters & Probabilistic Ambiguity Resolution", () => {
  beforeAll(async () => {
    await seedCampaignGame(TEST_GAME_ID);
  });

  afterAll(async () => {
    await prisma.game.deleteMany({ where: { id: TEST_GAME_ID } });
  });

  it("Module 1: verifies the complete roster of 9 historical Story Arbiters", () => {
    expect(STORY_ARBITERS).toHaveLength(9);

    const arbiterIds = STORY_ARBITERS.map((a) => a.id);
    expect(arbiterIds).toContain("arbiter-loudoun");
    expect(arbiterIds).toContain("arbiter-amherst");
    expect(arbiterIds).toContain("arbiter-wolfe");
    expect(arbiterIds).toContain("arbiter-montcalm");
    expect(arbiterIds).toContain("arbiter-vaudreuil");
    expect(arbiterIds).toContain("arbiter-johnson");
    expect(arbiterIds).toContain("arbiter-shingas");
    expect(arbiterIds).toContain("arbiter-boscawen");
    expect(arbiterIds).toContain("arbiter-conflans");

    const loudoun = STORY_ARBITERS.find((a) => a.id === "arbiter-loudoun");
    expect(loudoun?.name).toContain("Earl of Loudoun");
    expect(loudoun?.activeUntilTurn).toBe(8);

    const amherst = STORY_ARBITERS.find((a) => a.id === "arbiter-amherst");
    expect(amherst?.name).toContain("Jeffery Amherst");
    expect(amherst?.activeFromTurn).toBe(9);

    const boscawen = STORY_ARBITERS.find((a) => a.id === "arbiter-boscawen");
    expect(boscawen?.name).toContain("Edward Boscawen");
    expect(boscawen?.activeFromTurn).toBe(9);

    const conflans = STORY_ARBITERS.find((a) => a.id === "arbiter-conflans");
    expect(conflans?.name).toContain("Comte de Conflans");
  });

  it("Module 2: selects era-appropriate arbiters based on campaign timeline and theater context", () => {
    // 1756 Early War British Commander -> General Loudoun
    const earlyArbiter = selectActiveStoryArbiter(
      2,
      "SIEGE",
      FactionType.GREAT_BRITAIN,
      FactionType.FRANCE
    );
    expect(earlyArbiter.id).toBe("arbiter-loudoun");

    // 1758 High War British Commander -> General Amherst
    const midArbiter = selectActiveStoryArbiter(
      10,
      "SIEGE",
      FactionType.GREAT_BRITAIN,
      FactionType.FRANCE
    );
    expect(midArbiter.id).toBe("arbiter-amherst");

    // 1759 Quebec Expedition -> General Wolfe
    const wolfeArbiter = selectActiveStoryArbiter(
      15,
      "SIEGE",
      FactionType.GREAT_BRITAIN,
      FactionType.FRANCE
    );
    expect(wolfeArbiter.id).toBe("arbiter-wolfe");

    // Frontier Raid in Ohio Country -> War Chiefs Shingas & Pontiac
    const ohioArbiter = selectActiveStoryArbiter(
      5,
      "RAID",
      FactionType.WESTERN_CONFEDERACY,
      FactionType.GREAT_BRITAIN
    );
    expect(ohioArbiter.id).toBe("arbiter-shingas");

    // Northern Borderlands Diplomacy -> Sir William Johnson
    const frontierArbiter = selectActiveStoryArbiter(
      4,
      "DIPLOMACY",
      FactionType.HAUDENOSAUNEE,
      FactionType.GREAT_BRITAIN
    );
    expect(frontierArbiter.id).toBe("arbiter-johnson");
  });

  it("Module 3: arbitrates contested fort assaults and resolves ambiguous siege outcomes", async () => {
    const gb = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.GREAT_BRITAIN },
    });
    const fr = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.FRANCE },
    });
    const louisbourg = await prisma.mapNode.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, name: { contains: "Louisbourg" } },
    });

    const mockAttackerUnits = [
      { id: "u-atk-1", strength: 3000, discipline: 1.25, isAcclimatized: true },
    ];
    const mockDefenderUnits = [
      { id: "u-def-1", strength: 2200, discipline: 1.15, isAcclimatized: true },
    ];

    // Contested assault under General Amherst in 1758 (Turn 10)
    const ruling = await arbitrateContestedAssault({
      gameId: TEST_GAME_ID,
      turnNumber: 10,
      season: "Summer",
      year: 1758,
      targetNode: louisbourg,
      attackerFaction: gb,
      defenderFaction: fr,
      movingUnits: mockAttackerUnits,
      defenderUnits: mockDefenderUnits,
      baseAttackPower: 3750,
      baseDefensePower: 2530,
    });

    expect(ruling).toHaveProperty("outcome");
    expect(ruling.attackerCasualties).toBeGreaterThan(0);
    expect(ruling.defenderCasualties).toBeGreaterThan(0);
    expect(ruling.rulingTitle).toContain("Arbiter Ruling");
    expect(ruling.rulingDispatch.length).toBeGreaterThan(50);
    expect(ruling.arbiterName).toContain("Amherst");

    // Verify Chronicle Event was written to database
    const arbiterEvent = await prisma.gameEvent.findFirst({
      where: {
        gameId: TEST_GAME_ID,
        category: "ARBITER_RULING",
        primaryNodeId: louisbourg.id,
      },
    });
    expect(arbiterEvent).not.toBeNull();
    expect(arbiterEvent?.status).toBe(EventStatus.ACTIVE);
  });

  it("Module 4: arbitrates frontier raiding and generates probabilistic backcountry friction", async () => {
    const west = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.WESTERN_CONFEDERACY },
    });
    const gb = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.GREAT_BRITAIN },
    });
    const oswego = await prisma.mapNode.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, name: { contains: "Oswego" } },
    });

    const ruling = await arbitrateFrontierRaid({
      gameId: TEST_GAME_ID,
      turnNumber: 4,
      season: "Winter",
      year: 1756,
      sourceNode: oswego,
      targetNode: oswego,
      raidingFaction: west,
      targetFaction: gb,
    });

    expect(ruling.plunderTreasury).toBeGreaterThanOrEqual(5);
    expect(ruling.unrestDeltaDefender).toBeGreaterThanOrEqual(2);
    expect(ruling.rulingTitle).toContain("Arbiter Ruling");
    expect(ruling.rulingDispatch).toContain("RULING FROM");
  });

  it("Module 5: executes full state-machine turn resolution with Story Arbiter chronicle logging", async () => {
    const gb = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.GREAT_BRITAIN },
    });
    const boston = await prisma.mapNode.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, name: { contains: "Boston" } },
    });

    // Submit an assembly negotiation order
    await prisma.order.create({
      data: {
        gameId: TEST_GAME_ID,
        factionId: gb.id,
        turnNumber: 1,
        orderType: "ASSEMBLY_NEGOTIATION",
        submittedByRole: RoleType.EXECUTIVE,
        isExecuted: false,
        payload: {
          orderType: "ASSEMBLY_NEGOTIATION",
          sourceNodeId: boston.id,
          allocatedTreasury: 20,
          reasoning: "Lord Loudoun's provincial patronage negotiation",
        },
      },
    });

    const res = await processResolutionPhase(TEST_GAME_ID);
    expect(res.executedOrdersCount).toBeGreaterThan(0);

    // Verify Arbiter log appears in combatLogs
    expect(
      res.combatLogs.some((l) => l.includes("[Arbiter:") || l.includes("granted patronages"))
    ).toBe(true);

    // Verify Arbiter ruling event in database
    const events = await prisma.gameEvent.findMany({
      where: { gameId: TEST_GAME_ID, category: "ARBITER_RULING" },
    });
    expect(events.length).toBeGreaterThan(0);
  });

  it("Module 6: arbitrates naval squadron actions in sea zones without terrestrial bastion terminology", async () => {
    const gb = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.GREAT_BRITAIN },
    });
    const fr = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.FRANCE },
    });
    const seaZone = await prisma.mapNode.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, name: { contains: "Atlantic Shipping" } },
    });

    const ruling = await arbitrateNavalEngagement({
      gameId: TEST_GAME_ID,
      turnNumber: 10,
      season: "Summer",
      year: 1758,
      targetNode: seaZone,
      attackerFaction: gb,
      defenderFaction: fr,
      movingUnits: [{ id: "u-gb-fleet", strength: 1800, discipline: 1.2 }],
      defenderUnits: [{ id: "u-fr-fleet", strength: 800, discipline: 1.0 }],
      baseAttackPower: 2160,
      baseDefensePower: 800,
    });

    expect(ruling.arbiterName).toContain("Edward Boscawen");
    expect(ruling.seaZoneSecured).toBe(true);
    expect(ruling.rulingTitle).toContain("Naval Mastery");
    expect(ruling.rulingDispatch).not.toContain("bastion works");
    expect(ruling.rulingDispatch).toContain("broadsides");
  });

  it("Module 7: multi-hop BFS pathfinding resolves next waypoint toward distant campaign objectives", () => {
    const mockNetwork = [
      { id: "node-boston", adjacentNodeIds: ["node-albany", "node-halifax"] },
      { id: "node-albany", adjacentNodeIds: ["node-boston", "node-champlain"] },
      { id: "node-champlain", adjacentNodeIds: ["node-albany", "node-quebec"] },
      { id: "node-halifax", adjacentNodeIds: ["node-boston", "node-louisbourg"] },
      { id: "node-louisbourg", adjacentNodeIds: ["node-halifax"] },
      { id: "node-quebec", adjacentNodeIds: ["node-champlain"] },
    ];

    // Direct neighbor
    const directHop = findNextHopTowardObjective(
      "node-boston",
      "node-halifax",
      mockNetwork
    );
    expect(directHop).toBe("node-halifax");

    // 2-hop path to Louisbourg: Boston -> Halifax -> Louisbourg
    const louisbourgHop = findNextHopTowardObjective(
      "node-boston",
      "node-louisbourg",
      mockNetwork
    );
    expect(louisbourgHop).toBe("node-halifax");

    // 3-hop path to Quebec: Boston -> Albany -> Champlain -> Quebec
    const quebecHop = findNextHopTowardObjective(
      "node-boston",
      "node-quebec",
      mockNetwork
    );
    expect(quebecHop).toBe("node-albany");
  });

  it("Module 8: frontier raids on neutral territory log frontier incidents without triggering full war declarations", async () => {
    const haudenosaunee = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.HAUDENOSAUNEE },
    });
    const gb = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.GREAT_BRITAIN },
    });
    const onondaga = await prisma.mapNode.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, name: { contains: "Onondaga" } },
    });
    const oswego = await prisma.mapNode.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, name: { contains: "Fort Oswego" } },
    });

    // Haudenosaunee and GB start at peace (NEUTRAL stance)
    // Issue a RAID order targeting adjacent Onondaga from Fort Oswego
    await prisma.order.create({
      data: {
        gameId: TEST_GAME_ID,
        factionId: gb.id,
        turnNumber: 1,
        orderType: "RAID",
        submittedByRole: RoleType.MILITARY,
        isExecuted: false,
        payload: {
          orderType: "RAID",
          sourceNodeId: oswego.id,
          targetNodeId: onondaga.id,
          reasoning: "Frontier reconnaissance into Iroquois borderland",
        },
      },
    });

    const res = await processResolutionPhase(TEST_GAME_ID);
    expect(res.executedOrdersCount).toBeGreaterThan(0);

    // Verify no WAR_DECLARATION event between GB and Haudenosaunee was created
    const warEvents = await prisma.gameEvent.findMany({
      where: {
        gameId: TEST_GAME_ID,
        category: "WAR_DECLARATION",
        factionIds: { hasEvery: [gb.id, haudenosaunee.id] },
      },
    });
    expect(warEvents.length).toBe(0);

    // Verify incident event was recorded
    const incidentEvents = await prisma.gameEvent.findMany({
      where: {
        gameId: TEST_GAME_ID,
        category: "DIPLOMACY",
        title: { contains: "Frontier Skirmish" },
      },
    });
    expect(incidentEvents.length).toBeGreaterThan(0);
  });

  it("Module 9: VP recalibration scores British naval blockades and Dutch diplomatic mediation accurately", () => {
    // 1. Test Great Britain Military Naval Dominance VP scoring
    const gbMilGuide = getCharacterRoleGuide(
      FactionType.GREAT_BRITAIN,
      RoleType.MILITARY
    );
    const seaObj = gbMilGuide.objectives.find((o) => o.id === "gb-mil-3");
    expect(seaObj).toBeDefined();

    // Context with Atlantic Shipping Lanes held and 2 naval orders
    const mockGbContext = {
      game: {},
      faction: {
        id: "f-gb",
        nodesControlled: [{ name: "Atlantic Shipping Lanes" }],
      },
      allNodes: [],
      factionOrders: [
        { orderType: "MOVE" },
        { orderType: "AMPHIBIOUS_ASSAULT" },
      ],
      factionDispatches: [],
      factionEvents: [],
    };
    const evalGb = seaObj!.evaluate(mockGbContext as any);
    expect(evalGb.earnedVP).toBe(2); // 2 VP for Atlantic + 2 naval orders
    expect(evalGb.progressPercent).toBe(66);

    // 2. Test Dutch Republic Executive Mediation VP scoring
    const dutchGuide = getCharacterRoleGuide(
      FactionType.DUTCH_REPUBLIC,
      RoleType.EXECUTIVE
    );
    const goldenRockObj = dutchGuide.objectives.find((o) => o.id === "nl-exec-1");
    expect(goldenRockObj).toBeDefined();

    // Dutch context with £320 treasury but zero mediator dispatches
    const mockDutchNoDispatches = {
      game: {},
      faction: { id: "f-dutch", treasury: 350 },
      allNodes: [],
      factionOrders: [
        { orderType: "EXTRACT" },
        { orderType: "TRADE" },
      ],
      factionDispatches: [],
      factionEvents: [],
    };
    const evalDutchZero = goldenRockObj!.evaluate(mockDutchNoDispatches as any);
    expect(evalDutchZero.isCompleted).toBe(false);
    expect(evalDutchZero.earnedVP).toBe(2); // Tiered: £320 without dispatch yields only 2 VP instead of 4

    // Dutch context with active mediator dispatches
    const mockDutchActive = {
      game: {},
      faction: { id: "f-dutch", treasury: 350 },
      allNodes: [],
      factionOrders: [
        { orderType: "EXTRACT" },
        { orderType: "TRADE" },
        { orderType: "SUBSIDIZE" },
      ],
      factionDispatches: [{ id: "disp-1" }],
      factionEvents: [],
    };
    const evalDutchActive = goldenRockObj!.evaluate(mockDutchActive as any);
    expect(evalDutchActive.isCompleted).toBe(true);
    expect(evalDutchActive.earnedVP).toBe(4);
  });
});
