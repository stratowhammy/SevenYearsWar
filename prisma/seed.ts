import prisma from "@/lib/prisma";
import {
  INITIAL_EVENTS_TEMPLATE,
  INITIAL_FACTIONS,
  INITIAL_MAP_NODES,
  INITIAL_OFF_MAP_MODIFIERS,
  INITIAL_UNITS,
} from "./seed-data";
import { EventStatus, FactionType, Phase } from "@prisma/client";
import { reconcileAndPersistVictoryPoints } from "@/engine/state-machine";

export const DEFAULT_GAME_ID = "syw-1756-grand-campaign";

export async function seedCampaignGame(customGameId: string = DEFAULT_GAME_ID) {
  // Delete existing campaign with this ID to make seeding idempotent
  await prisma.game.deleteMany({
    where: { id: customGameId },
  });

  const game = await prisma.game.create({
    data: {
      id: customGameId,
      name: "1756 Grand Campaign: Crucible of Empire",
      currentYear: 1756,
      currentSeason: "Spring",
      currentPhase: Phase.INTEL_DISPATCH,
      phaseDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24),
      turnNumber: 1,
      offMapModifiers: INITIAL_OFF_MAP_MODIFIERS,
    },
  });

  const factionMap = new Map<FactionType, string>();

  // Create all 10 factions and their 3 roles (30 total seats)
  for (const facTemplate of INITIAL_FACTIONS) {
    const createdFaction = await prisma.faction.create({
      data: {
        gameId: game.id,
        type: facTemplate.type,
        treasury: facTemplate.treasury,
        debt: facTemplate.debt,
        unrestIndex: facTemplate.unrestIndex,
        standingPoints: facTemplate.standingPoints,
        roles: {
          create: facTemplate.roles.map((r) => ({
            roleType: r.roleType,
            title: r.title,
            controller: r.controller,
            botBehavior: r.botBehavior,
            aiPersonaPrompt: r.aiPersonaPrompt,
          })),
        },
      },
    });
    factionMap.set(facTemplate.type, createdFaction.id);
  }

  // First pass: create MapNodes without adjacentNodeIds
  const nodeKeyToId = new Map<string, string>();
  for (const nodeTemplate of INITIAL_MAP_NODES) {
    const controllingId = nodeTemplate.controllingFaction
      ? factionMap.get(nodeTemplate.controllingFaction) ?? null
      : null;

    const createdNode = await prisma.mapNode.create({
      data: {
        gameId: game.id,
        name: nodeTemplate.name,
        nodeType: nodeTemplate.nodeType,
        region: nodeTemplate.region,
        lat: nodeTemplate.lat,
        lng: nodeTemplate.lng,
        resourceType: nodeTemplate.resourceType,
        resourceYield: nodeTemplate.resourceYield,
        controllingId,
        adjacentNodeIds: [],
      },
    });
    nodeKeyToId.set(nodeTemplate.key, createdNode.id);
  }

  // Second pass: wire adjacentNodeIds using actual database IDs
  for (const nodeTemplate of INITIAL_MAP_NODES) {
    const nodeId = nodeKeyToId.get(nodeTemplate.key)!;
    const adjacentIds = nodeTemplate.adjacentKeys
      .map((k) => nodeKeyToId.get(k))
      .filter((id): id is string => Boolean(id));

    await prisma.mapNode.update({
      where: { id: nodeId },
      data: { adjacentNodeIds: adjacentIds },
    });
  }

  // Create initial units
  for (const unitTemplate of INITIAL_UNITS) {
    const factionId = factionMap.get(unitTemplate.factionType);
    const nodeId = nodeKeyToId.get(unitTemplate.nodeKey);
    if (!factionId || !nodeId) continue;

    await prisma.unit.create({
      data: {
        factionId,
        nodeId,
        unitType: unitTemplate.unitType,
        strength: unitTemplate.strength,
        discipline: unitTemplate.discipline,
        isAcclimatized: unitTemplate.isAcclimatized,
      },
    });
  }

  // Create initial historical events
  for (const ev of INITIAL_EVENTS_TEMPLATE) {
    const factionIds = ev.factions
      .map((ft) => factionMap.get(ft))
      .filter((id): id is string => Boolean(id));
    const primaryNodeId = ev.nodeKey ? nodeKeyToId.get(ev.nodeKey) : undefined;

    await prisma.gameEvent.create({
      data: {
        gameId: game.id,
        turnRecorded: 1,
        validUntilTurn: ev.validUntilTurn ?? undefined,
        status: EventStatus.ACTIVE,
        scope: ev.scope,
        category: ev.category,
        primaryNodeId,
        factionIds,
        title: ev.title,
        description: ev.description,
      },
    });
  }

  // Create initial diplomatic dispatches in transit
  const gbId = factionMap.get(FactionType.GREAT_BRITAIN)!;
  const haudId = factionMap.get(FactionType.HAUDENOSAUNEE)!;
  const frId = factionMap.get(FactionType.FRANCE)!;
  const westId = factionMap.get(FactionType.WESTERN_CONFEDERACY)!;

  await prisma.dispatch.createMany({
    data: [
      {
        gameId: game.id,
        senderFactionId: gbId,
        targetFactionId: haudId,
        content:
          "From Sir William Johnson to the Grand Council at Onondaga: His Majesty offers 40 chests of trade goods and gunpowder if the Six Nations bar French coureurs de bois from the Oswego portage.",
        courierDelay: 1,
        turnsRemaining: 1,
        intercepted: false,
      },
      {
        gameId: game.id,
        senderFactionId: frId,
        targetFactionId: westId,
        content:
          "From Marquis de Vaudreuil at Montreal to the War Captains at Scioto: Supply convoys from Fort Niagara are underway to Fort Duquesne to sustain raids along the Cumberland valley.",
        courierDelay: 2,
        turnsRemaining: 1,
        intercepted: false,
      },
    ],
  });

  // Calculate and persist initial baseline Victory Points across all 10 factions & 30 roles
  await reconcileAndPersistVictoryPoints(game.id);

  return prisma.game.findUniqueOrThrow({
    where: { id: game.id },
    include: {
      factions: { include: { roles: true, units: true, nodesControlled: true } },
      nodes: { include: { units: true, controller: true } },
      events: { orderBy: { createdAt: "desc" } },
      orders: true,
      dispatches: true,
    },
  });
}

export async function ensureDefaultGameExists() {
  const existing = await prisma.game.findUnique({
    where: { id: DEFAULT_GAME_ID },
  });
  if (existing) return existing;
  return seedCampaignGame(DEFAULT_GAME_ID);
}

if (require.main === module) {
  seedCampaignGame()
    .then((g) => {
      console.log(
        `Seeded game "${g.name}" (${g.id}) with ${g.factions.length} factions and ${g.nodes.length} nodes.`
      );
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
