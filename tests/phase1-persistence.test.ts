import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "@/lib/prisma";
import { seedCampaignGame } from "@/prisma/seed";
import {
  recordAndReconcileEvent,
  expireTurnEvents,
} from "@/engine/events/reconciler";
import { EventScope, EventStatus, FactionType } from "@prisma/client";

const TEST_GAME_ID = "test-phase1-game";

describe("Phase 1: Persistence Layer & Deterministic Event Invalidation", () => {
  beforeAll(async () => {
    await seedCampaignGame(TEST_GAME_ID);
  });

  afterAll(async () => {
    await prisma.game.deleteMany({ where: { id: TEST_GAME_ID } });
  });

  it("creates the game with all 10 factions and 30 distinct role seats (3 per faction)", async () => {
    const game = await prisma.game.findUniqueOrThrow({
      where: { id: TEST_GAME_ID },
      include: {
        factions: { include: { roles: true, units: true } },
        nodes: true,
      },
    });

    expect(game.currentYear).toBe(1756);
    expect(game.currentSeason).toBe("Spring");
    expect(game.factions).toHaveLength(10);

    const totalRoles = game.factions.reduce(
      (acc, f) => acc + f.roles.length,
      0
    );
    expect(totalRoles).toBe(30);

    // Verify all 6 European Powers and 4 Native Confederations exist
    const factionTypes = game.factions.map((f) => f.type);
    expect(factionTypes).toEqual(
      expect.arrayContaining([
        FactionType.GREAT_BRITAIN,
        FactionType.FRANCE,
        FactionType.SPAIN,
        FactionType.PORTUGAL,
        FactionType.DUTCH_REPUBLIC,
        FactionType.GERMAN_STATES,
        FactionType.HAUDENOSAUNEE,
        FactionType.SEVEN_NATIONS,
        FactionType.WESTERN_CONFEDERACY,
        FactionType.SOUTHEASTERN_NATIONS,
      ])
    );
  });

  it("supersedes prior WAR_DECLARATION events when a TREATY event is recorded between the same factions", async () => {
    const factions = await prisma.faction.findMany({
      where: {
        gameId: TEST_GAME_ID,
        type: { in: [FactionType.GREAT_BRITAIN, FactionType.FRANCE] },
      },
    });
    const factionIds = factions.map((f) => f.id);

    // Ensure there is an ACTIVE WAR_DECLARATION between Great Britain and France
    const warDeclaration = await recordAndReconcileEvent({
      gameId: TEST_GAME_ID,
      turn: 1,
      category: "WAR_DECLARATION",
      scope: EventScope.GLOBAL,
      factionIds,
      title: "Anglo-French Maritime Hostilities",
      description: "Open naval warfare declared across the Atlantic.",
    });

    expect(warDeclaration.status).toBe(EventStatus.ACTIVE);

    // Record a TREATY between those same factions on Turn 2
    const treatyEvent = await recordAndReconcileEvent({
      gameId: TEST_GAME_ID,
      turn: 2,
      category: "TREATY",
      scope: EventScope.GLOBAL,
      factionIds,
      title: "Preliminary Truce of Fontainebleau",
      description: "Hostilities suspended pending colonial boundary commission.",
    });

    expect(treatyEvent.status).toBe(EventStatus.ACTIVE);

    // Verify the prior WAR_DECLARATION was deterministically marked SUPERSEDED
    const updatedWarEvent = await prisma.gameEvent.findUniqueOrThrow({
      where: { id: warDeclaration.id },
    });
    expect(updatedWarEvent.status).toBe(EventStatus.SUPERSEDED);
    expect(updatedWarEvent.supersededById).toBe(treatyEvent.id);
  });

  it("supersedes prior GARRISON, SIEGE_ORDER, and BLOCKADE events on a node when FORT_CAPTURED is recorded", async () => {
    const oswego = await prisma.mapNode.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, name: { contains: "Oswego" } },
    });
    const gb = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.GREAT_BRITAIN },
    });
    const fr = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.FRANCE },
    });

    const garrisonEv = await recordAndReconcileEvent({
      gameId: TEST_GAME_ID,
      turn: 1,
      category: "GARRISON",
      scope: EventScope.NODE,
      primaryNodeId: oswego.id,
      factionIds: [gb.id],
      title: "Provincial Garrison Fortifies Oswego",
      description: "Shirley's and Pepperrell's regiments garrison the Ontario trading post.",
    });

    const siegeEv = await recordAndReconcileEvent({
      gameId: TEST_GAME_ID,
      turn: 2,
      category: "SIEGE_ORDER",
      scope: EventScope.NODE,
      primaryNodeId: oswego.id,
      factionIds: [fr.id],
      title: "Montcalm Invests Fort Oswego",
      description: "French siege batteries open trenches overlooking Fort Ontario.",
    });

    const blockadeEv = await recordAndReconcileEvent({
      gameId: TEST_GAME_ID,
      turn: 2,
      category: "BLOCKADE",
      scope: EventScope.NODE,
      primaryNodeId: oswego.id,
      factionIds: [fr.id],
      title: "Lake Ontario Schooner Blockade",
      description: "French armed barks cut British supply lines across Lake Ontario.",
    });

    // Now record FORT_CAPTURED on Fort Oswego
    const captureEv = await recordAndReconcileEvent({
      gameId: TEST_GAME_ID,
      turn: 3,
      category: "FORT_CAPTURED",
      scope: EventScope.NODE,
      primaryNodeId: oswego.id,
      factionIds: [fr.id, gb.id],
      title: "Fall of Fort Oswego",
      description: "Montcalm captures Fort Oswego, seizing 1,700 prisoners and British lake vessels.",
    });

    const invalidated = await prisma.gameEvent.findMany({
      where: {
        id: { in: [garrisonEv.id, siegeEv.id, blockadeEv.id] },
      },
    });

    expect(invalidated).toHaveLength(3);
    for (const ev of invalidated) {
      expect(ev.status).toBe(EventStatus.SUPERSEDED);
      expect(ev.supersededById).toBe(captureEv.id);
    }
  });

  it("expires events whose validUntilTurn is strictly less than currentTurn via expireTurnEvents", async () => {
    const gb = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.GREAT_BRITAIN },
    });

    const shortLivedEvent = await recordAndReconcileEvent({
      gameId: TEST_GAME_ID,
      turn: 1,
      category: "UNREST",
      scope: EventScope.FACTION,
      factionIds: [gb.id],
      title: "Quartering Riots in Albany",
      description: "Colonial assemblies resist quartering British regulars.",
      validUntilTurn: 3,
    });

    // At turn 3, validUntilTurn (3) is NOT < 3, so it stays ACTIVE
    await expireTurnEvents(TEST_GAME_ID, 3);
    let checkEv = await prisma.gameEvent.findUniqueOrThrow({
      where: { id: shortLivedEvent.id },
    });
    expect(checkEv.status).toBe(EventStatus.ACTIVE);

    // At turn 4, validUntilTurn (3) < 4, so it transitions to EXPIRED
    await expireTurnEvents(TEST_GAME_ID, 4);
    checkEv = await prisma.gameEvent.findUniqueOrThrow({
      where: { id: shortLivedEvent.id },
    });
    expect(checkEv.status).toBe(EventStatus.EXPIRED);
  });
});
