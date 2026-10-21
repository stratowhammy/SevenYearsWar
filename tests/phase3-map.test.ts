import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "@/lib/prisma";
import { seedCampaignGame } from "@/prisma/seed";
import {
  AMERICAS_CARIBBEAN_BOUNDS,
  SEA_ZONE_POLYGONS,
  buildGraphEdges,
  classifyNodeIconType,
  isWithinAmericasBounds,
} from "@/components/map/map-geometry";
import { useWarRoomStore } from "@/store/useWarRoomStore";
import { FactionType } from "@prisma/client";

const TEST_GAME_ID = "test-phase3-map-game";

describe("Phase 3: Americas & Caribbean Node Graph Map & Seasonal Constraints", () => {
  beforeAll(async () => {
    await seedCampaignGame(TEST_GAME_ID);
  });

  afterAll(async () => {
    await prisma.game.deleteMany({ where: { id: TEST_GAME_ID } });
  });

  it("strictly bounds all MapNodes and Sea Zone Polygons within 10°N–55°N and 55°W–100°W", async () => {
    const nodes = await prisma.mapNode.findMany({
      where: { gameId: TEST_GAME_ID },
    });

    expect(nodes.length).toBeGreaterThanOrEqual(20);
    expect(AMERICAS_CARIBBEAN_BOUNDS.south).toBe(10);
    expect(AMERICAS_CARIBBEAN_BOUNDS.north).toBe(55);
    expect(AMERICAS_CARIBBEAN_BOUNDS.west).toBe(-100);
    expect(AMERICAS_CARIBBEAN_BOUNDS.east).toBe(-55);

    for (const node of nodes) {
      expect(
        isWithinAmericasBounds(node.lat, node.lng),
        `Node ${node.name} (${node.lat}, ${node.lng}) must be inside 10°N–55°N, 55°W–100°W`
      ).toBe(true);
    }

    for (const [zoneName, poly] of Object.entries(SEA_ZONE_POLYGONS)) {
      for (const [lat, lng] of poly.coordinates) {
        expect(
          isWithinAmericasBounds(lat, lng),
          `Sea zone ${zoneName} vertex (${lat}, ${lng}) must be inside 10°N–55°N, 55°W–100°W`
        ).toBe(true);
      }
    }
  });

  it("classifies Forts, Cities, Native Council Centers, River Passes, and Sea Zones accurately", async () => {
    const nodes = await prisma.mapNode.findMany({
      where: { gameId: TEST_GAME_ID },
    });

    const categories = nodes.map((n) => ({
      name: n.name,
      category: classifyNodeIconType(n),
    }));

    expect(
      categories.find((c) => c.name.includes("Duquesne"))?.category
    ).toBe("FORT");
    expect(
      categories.find((c) => c.name.includes("Ticonderoga"))?.category
    ).toBe("FORT");
    expect(
      categories.find((c) => c.name.includes("Louisbourg"))?.category
    ).toBe("FORT");
    expect(
      categories.find((c) => c.name.includes("Onondaga"))?.category
    ).toBe("COUNCIL_CENTER");
    expect(
      categories.find((c) => c.name.includes("Quebec"))?.category
    ).toBe("CITY");
    expect(
      categories.find((c) => c.name.includes("Gulf of St. Lawrence"))?.category
    ).toBe("SEA_ZONE");
  });

  it("computes connecting edges and applies Winter freeze and Autumn hurricane seasonal movement constraints", async () => {
    const nodes = await prisma.mapNode.findMany({
      where: { gameId: TEST_GAME_ID },
    });

    const winterEdges = buildGraphEdges(nodes, "Winter");
    expect(winterEdges.length).toBeGreaterThan(20);

    const frozenEdges = winterEdges.filter((e) => e.isFrozen);
    expect(frozenEdges.length).toBeGreaterThan(0);
    expect(frozenEdges[0].movementCostMultiplier).toBe(2.5);

    const autumnEdges = buildGraphEdges(nodes, "Autumn");
    const hurricaneEdges = autumnEdges.filter((e) => e.hasHurricaneRisk);
    expect(hurricaneEdges.length).toBeGreaterThan(0);
    expect(hurricaneEdges[0].movementCostMultiplier).toBe(1.75);
  });

  it("manages interactive selection state in Zustand useWarRoomStore", () => {
    const store = useWarRoomStore.getState();
    store.setSelectedNodeId("node-duquesne");
    store.setSelectedFactionType(FactionType.FRANCE);
    expect(useWarRoomStore.getState().selectedNodeId).toBe("node-duquesne");
    expect(useWarRoomStore.getState().selectedFactionType).toBe(
      FactionType.FRANCE
    );
  });
});
