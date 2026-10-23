import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "@/lib/prisma";
import { seedCampaignGame } from "@/prisma/seed";
import {
  STORY_ARBITERS,
  selectActiveStoryArbiter,
  arbitrateContestedAssault,
  arbitrateFrontierRaid,
  arbitrateAssemblyNegotiation,
} from "@/engine/ai-arbiters/story-arbiters";
import { processResolutionPhase } from "@/engine/state-machine";
import { FactionType, RoleType, EventStatus } from "@prisma/client";

const TEST_GAME_ID = "test-phase8-story-arbiters-game";

describe("Phase 8: AI Story Arbiters & Probabilistic Ambiguity Resolution", () => {
  beforeAll(async () => {
    await seedCampaignGame(TEST_GAME_ID);
  });

  afterAll(async () => {
    await prisma.game.deleteMany({ where: { id: TEST_GAME_ID } });
  });

  it("Module 1: verifies the complete roster of 7 historical Story Arbiters", () => {
    expect(STORY_ARBITERS).toHaveLength(7);

    const arbiterIds = STORY_ARBITERS.map((a) => a.id);
    expect(arbiterIds).toContain("arbiter-loudoun");
    expect(arbiterIds).toContain("arbiter-amherst");
    expect(arbiterIds).toContain("arbiter-wolfe");
    expect(arbiterIds).toContain("arbiter-montcalm");
    expect(arbiterIds).toContain("arbiter-vaudreuil");
    expect(arbiterIds).toContain("arbiter-johnson");
    expect(arbiterIds).toContain("arbiter-shingas");

    const loudoun = STORY_ARBITERS.find((a) => a.id === "arbiter-loudoun");
    expect(loudoun?.name).toContain("Earl of Loudoun");
    expect(loudoun?.activeUntilTurn).toBe(8);

    const amherst = STORY_ARBITERS.find((a) => a.id === "arbiter-amherst");
    expect(amherst?.name).toContain("Jeffery Amherst");
    expect(amherst?.activeFromTurn).toBe(9);
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
});
