import { EventScope, EventStatus } from "@prisma/client";
import prisma from "@/lib/prisma";

export async function recordAndReconcileEvent(params: {
  gameId: string;
  turn: number;
  category: string;
  scope: EventScope;
  primaryNodeId?: string;
  factionIds: string[];
  title: string;
  description: string;
  validUntilTurn?: number;
}) {
  return await prisma.$transaction(async (tx) => {
    // 1. Create the new event
    const newEvent = await tx.gameEvent.create({
      data: {
        gameId: params.gameId,
        turnRecorded: params.turn,
        category: params.category,
        scope: params.scope,
        primaryNodeId: params.primaryNodeId,
        factionIds: params.factionIds,
        title: params.title,
        description: params.description,
        validUntilTurn: params.validUntilTurn,
        status: EventStatus.ACTIVE,
      },
    });

    // 2. Rule: Treaty/Peace supersedes prior war declarations between parties
    if (params.category === "TREATY") {
      await tx.gameEvent.updateMany({
        where: {
          gameId: params.gameId,
          status: EventStatus.ACTIVE,
          category: "WAR_DECLARATION",
          factionIds: { hasEvery: params.factionIds },
        },
        data: {
          status: EventStatus.SUPERSEDED,
          supersededById: newEvent.id,
        },
      });
    }

    // 3. Rule: Fort capture supersedes prior garrisons and blockades on that node
    if (params.category === "FORT_CAPTURED" && params.primaryNodeId) {
      await tx.gameEvent.updateMany({
        where: {
          gameId: params.gameId,
          primaryNodeId: params.primaryNodeId,
          status: EventStatus.ACTIVE,
          category: { in: ["GARRISON", "SIEGE_ORDER", "BLOCKADE"] },
        },
        data: {
          status: EventStatus.SUPERSEDED,
          supersededById: newEvent.id,
        },
      });
    }

    return newEvent;
  });
}

export async function expireTurnEvents(gameId: string, currentTurn: number) {
  return await prisma.gameEvent.updateMany({
    where: {
      gameId,
      status: EventStatus.ACTIVE,
      validUntilTurn: { lt: currentTurn },
    },
    data: {
      status: EventStatus.EXPIRED,
    },
  });
}
