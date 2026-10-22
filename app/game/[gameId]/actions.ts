"use server";

import prisma from "@/lib/prisma";
import { BotBehavior, EventScope, RoleType } from "@prisma/client";
import {
  advanceSinglePhase,
  executeFullTurnCycle,
} from "@/engine/state-machine";
import { enqueueCourierDispatch } from "@/engine/courier-queue";
import { invokeRoleAIController } from "@/engine/ai-agents/controller";
import { recordAndReconcileEvent } from "@/engine/events/reconciler";
import { revalidatePath } from "next/cache";

function safeRevalidate(gameId: string) {
  try {
    revalidatePath(`/game/${gameId}`);
    revalidatePath(`/admin/${gameId}/roles`);
    revalidatePath(`/`);
  } catch {
    // Safe fallback outside request context
  }
}

export async function submitPlayerOrderAction(params: {
  gameId: string;
  factionId: string;
  submittedByRole: RoleType;
  orderType:
    | "MOVE"
    | "RECRUIT"
    | "EXTRACT"
    | "TRADE"
    | "SUBSIDIZE"
    | "RAID"
    | "AMPHIBIOUS_ASSAULT"
    | "DECLARE_WAR"
    | "ASSEMBLY_NEGOTIATION"
    | "COVENANT_BOUNDARY"
    | "TREATY_CONFERENCE";
  sourceNodeId: string;
  targetNodeId?: string;
  unitIds?: string[];
  allocatedTreasury: number;
  reasoning: string;
}) {
  const game = await prisma.game.findUniqueOrThrow({
    where: { id: params.gameId },
  });

  const order = await prisma.order.create({
    data: {
      gameId: params.gameId,
      factionId: params.factionId,
      turnNumber: game.turnNumber,
      orderType: params.orderType,
      submittedByRole: params.submittedByRole,
      isExecuted: false,
      payload: {
        orderType: params.orderType,
        sourceNodeId: params.sourceNodeId,
        targetNodeId: params.targetNodeId,
        unitIds: params.unitIds ?? [],
        allocatedTreasury: params.allocatedTreasury,
        reasoning: params.reasoning.slice(0, 100),
      },
    },
  });

  safeRevalidate(params.gameId);
  return order;
}

export async function sendCourierDispatchAction(params: {
  gameId: string;
  senderFactionId: string;
  targetFactionId: string;
  content: string;
  courierDelay: number;
}) {
  const dispatch = await enqueueCourierDispatch(params);
  safeRevalidate(params.gameId);
  return dispatch;
}

export async function signPeaceTreatyAction(params: {
  gameId: string;
  factionAId: string;
  factionBId: string;
  treatyTitle: string;
  treatyDescription: string;
}) {
  const game = await prisma.game.findUniqueOrThrow({
    where: { id: params.gameId },
  });

  const treatyEvent = await recordAndReconcileEvent({
    gameId: params.gameId,
    turn: game.turnNumber,
    category: "TREATY",
    scope: EventScope.GLOBAL,
    factionIds: [params.factionAId, params.factionBId],
    title: params.treatyTitle,
    description: params.treatyDescription,
  });

  safeRevalidate(params.gameId);
  return treatyEvent;
}

export async function advanceSinglePhaseAction(gameId: string) {
  const result = await advanceSinglePhase(gameId);
  safeRevalidate(gameId);
  return result;
}

export async function executeFullTurnCycleAction(gameId: string) {
  const result = await executeFullTurnCycle(gameId);
  safeRevalidate(gameId);
  return result;
}

export async function requestAIControllerAction(params: {
  gameId: string;
  factionId: string;
  roleType: RoleType;
  behavior: BotBehavior;
}) {
  const result = await invokeRoleAIController({
    ...params,
    persistOrders: params.behavior === BotBehavior.AUTONOMOUS,
  });
  safeRevalidate(params.gameId);
  return result;
}
