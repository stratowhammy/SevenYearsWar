import Redis from "ioredis";
import prisma from "@/lib/prisma";
import { EventScope } from "@prisma/client";
import { recordAndReconcileEvent } from "./events/reconciler";

let redisClient: Redis | null = null;

export function getRedisClient(): Redis | null {
  if (redisClient) return redisClient;
  try {
    const url = process.env.REDIS_URL || "redis://localhost:6379";
    redisClient = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    redisClient.on("error", () => {
      // Handled gracefully if Redis is unavailable
    });
    return redisClient;
  } catch {
    return null;
  }
}

export async function enqueueCourierDispatch(params: {
  gameId: string;
  senderFactionId: string;
  targetFactionId: string;
  content: string;
  courierDelay?: number;
}) {
  const delay = Math.max(1, params.courierDelay ?? 1);

  const dispatch = await prisma.dispatch.create({
    data: {
      gameId: params.gameId,
      senderFactionId: params.senderFactionId,
      targetFactionId: params.targetFactionId,
      content: params.content,
      courierDelay: delay,
      turnsRemaining: delay,
      intercepted: false,
    },
  });

  // Mirror active courier packet in Redis queue for turn scheduler telemetry
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.connect().catch(() => {});
      await redis.hset(
        `syw:game:${params.gameId}:couriers`,
        dispatch.id,
        JSON.stringify({
          id: dispatch.id,
          senderFactionId: dispatch.senderFactionId,
          targetFactionId: dispatch.targetFactionId,
          turnsRemaining: dispatch.turnsRemaining,
        })
      );
    } catch {
      // Non-blocking Redis telemetry sync
    }
  }

  return dispatch;
}

export async function processCourierQueueForTurn(
  gameId: string,
  currentTurn: number
) {
  const inTransit = await prisma.dispatch.findMany({
    where: {
      gameId,
      turnsRemaining: { gt: 0 },
      intercepted: false,
    },
  });

  // Check if Royal Navy / hostile ships of the line create high naval interception pressure
  const shipsOfTheLine = await prisma.unit.count({
    where: {
      faction: { gameId },
      unitType: "SHIP_OF_THE_LINE",
    },
  });

  const delivered: string[] = [];
  const interceptedIds: string[] = [];
  const stillInTransit: string[] = [];

  for (const disp of inTransit) {
    const nextRemaining = Math.max(0, disp.turnsRemaining - 1);

    // Deterministic interception check based on courier delay & naval blockade density
    const deterministicHash =
      (disp.id.charCodeAt(0) + currentTurn + shipsOfTheLine) % 13;
    const isIntercepted = disp.courierDelay >= 3 && deterministicHash === 0;

    if (isIntercepted) {
      await prisma.dispatch.update({
        where: { id: disp.id },
        data: {
          turnsRemaining: 0,
          intercepted: true,
        },
      });
      interceptedIds.push(disp.id);

      await recordAndReconcileEvent({
        gameId,
        turn: currentTurn,
        category: "DIPLOMACY",
        scope: EventScope.FACTION,
        factionIds: [disp.senderFactionId, disp.targetFactionId],
        title: "Courier Packet Intercepted at Sea",
        description: `Patrol sloops intercepted a diplomatic dispatch in transit: "${disp.content.slice(
          0,
          90
        )}..."`,
        validUntilTurn: currentTurn + 3,
      });
    } else if (nextRemaining === 0) {
      await prisma.dispatch.update({
        where: { id: disp.id },
        data: { turnsRemaining: 0 },
      });
      delivered.push(disp.id);

      await recordAndReconcileEvent({
        gameId,
        turn: currentTurn,
        category: "DIPLOMACY",
        scope: EventScope.FACTION,
        factionIds: [disp.senderFactionId, disp.targetFactionId],
        title: "Diplomatic Courier Arrived",
        description: disp.content,
        validUntilTurn: currentTurn + 4,
      });
    } else {
      await prisma.dispatch.update({
        where: { id: disp.id },
        data: { turnsRemaining: nextRemaining },
      });
      stillInTransit.push(disp.id);
    }
  }

  // Update Redis queue state
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.connect().catch(() => {});
      for (const id of [...delivered, ...interceptedIds]) {
        await redis.hdel(`syw:game:${gameId}:couriers`, id);
      }
    } catch {
      // Non-blocking
    }
  }

  return {
    processedCount: inTransit.length,
    deliveredIds: delivered,
    interceptedIds,
    stillInTransitIds: stillInTransit,
  };
}
