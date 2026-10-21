"use server";

import prisma from "@/lib/prisma";
import {
  BotBehavior,
  ControllerType,
  EventScope,
  FactionType,
  Phase,
} from "@prisma/client";
import { recordAndReconcileEvent, expireTurnEvents } from "@/engine/events/reconciler";
import { revalidatePath } from "next/cache";

function safeRevalidate(gameId: string) {
  try {
    revalidatePath(`/admin/${gameId}/roles`);
    revalidatePath(`/game/${gameId}`);
    revalidatePath(`/`);
  } catch {
    // Ignored when invoked outside Next.js request context (e.g. Vitest test runner)
  }
}

export async function toggleRoleControllerAction(
  roleId: string,
  controller: ControllerType
) {
  const existing = await prisma.factionRole.findUniqueOrThrow({
    where: { id: roleId },
    include: { faction: true },
  });

  const nextBotBehavior =
    controller === ControllerType.HUMAN
      ? BotBehavior.NONE
      : existing.botBehavior === BotBehavior.NONE
      ? BotBehavior.AUTONOMOUS
      : existing.botBehavior;

  const updated = await prisma.factionRole.update({
    where: { id: roleId },
    data: {
      controller,
      botBehavior: nextBotBehavior,
    },
  });

  safeRevalidate(existing.faction.gameId);
  return updated;
}

export async function setRoleBotBehaviorAction(
  roleId: string,
  botBehavior: BotBehavior
) {
  const existing = await prisma.factionRole.findUniqueOrThrow({
    where: { id: roleId },
    include: { faction: true },
  });

  const nextController =
    botBehavior === BotBehavior.NONE
      ? ControllerType.HUMAN
      : ControllerType.COMPUTER;

  const updated = await prisma.factionRole.update({
    where: { id: roleId },
    data: {
      controller: nextController,
      botBehavior,
    },
  });

  safeRevalidate(existing.faction.gameId);
  return updated;
}

export async function updateRolePersonaAction(
  roleId: string,
  aiPersonaPrompt: string,
  assignedUserId?: string | null
) {
  const existing = await prisma.factionRole.findUniqueOrThrow({
    where: { id: roleId },
    include: { faction: true },
  });

  const updated = await prisma.factionRole.update({
    where: { id: roleId },
    data: {
      aiPersonaPrompt: aiPersonaPrompt.trim(),
      ...(assignedUserId !== undefined ? { assignedUserId } : {}),
    },
  });

  safeRevalidate(existing.faction.gameId);
  return updated;
}

export async function recalculateLedgersAction(gameId: string) {
  const game = await prisma.game.findUniqueOrThrow({
    where: { id: gameId },
    include: {
      factions: {
        include: {
          nodesControlled: true,
          units: true,
        },
      },
    },
  });

  const offMap = (game.offMapModifiers ?? {}) as Record<string, any>;
  const europeDrainGB = Number(offMap?.europeTheater?.britishSubsidyDrain ?? 20);
  const europeDrainFR = Number(offMap?.europeTheater?.frenchContinentalDrain ?? 25);
  const germanSubsidy = Number(offMap?.europeTheater?.germanSubsidyInflow ?? 20);
  const eicBonusGB = Number(offMap?.indiaTheater?.britishEastIndiaRevenue ?? 15);
  const indiaBonusFR = Number(offMap?.indiaTheater?.frenchCompagnieRevenue ?? 10);
  const dutchFreightBonus = Number(
    offMap?.westAfricaTheater?.dutchNeutralFreightBonus ?? 12
  );

  const updatedFactions = [];

  for (const faction of game.factions) {
    const nodeIncome = faction.nodesControlled.reduce(
      (sum, n) => sum + (n.resourceYield || 0),
      0
    );

    const unitUpkeep = faction.units.reduce((sum, u) => {
      if (u.unitType === "SHIP_OF_THE_LINE") return sum + Math.round(u.strength * 0.025);
      if (u.unitType === "REGULAR") return sum + Math.round(u.strength * 0.015);
      if (u.unitType === "MILITIA" || u.unitType === "MERCHANTMAN")
        return sum + Math.round(u.strength * 0.008);
      return sum + Math.round(u.strength * 0.005);
    }, 0);

    const debtInterest = Math.round(faction.debt * 0.05);

    let offMapDelta = 0;
    if (faction.type === FactionType.GREAT_BRITAIN) {
      offMapDelta = eicBonusGB - europeDrainGB;
    } else if (faction.type === FactionType.FRANCE) {
      offMapDelta = indiaBonusFR - europeDrainFR;
    } else if (faction.type === FactionType.GERMAN_STATES) {
      offMapDelta = germanSubsidy;
    } else if (faction.type === FactionType.DUTCH_REPUBLIC) {
      offMapDelta = dutchFreightBonus;
    }

    const netDelta = nodeIncome + offMapDelta - unitUpkeep - debtInterest;
    let nextTreasury = faction.treasury + netDelta;
    let nextDebt = faction.debt;
    let nextUnrest = faction.unrestIndex;

    if (nextTreasury < 0) {
      const deficit = Math.abs(nextTreasury);
      nextDebt += deficit;
      nextTreasury = 0;
      nextUnrest = Math.min(100, nextUnrest + 5);
    }

    const nextStanding = Math.max(
      1,
      Math.min(
        10,
        Math.round(
          2 +
            faction.nodesControlled.length * 0.8 +
            (nextTreasury > 150 ? 1 : 0) -
            (nextUnrest > 40 ? 1 : 0)
        )
      )
    );

    const updated = await prisma.faction.update({
      where: { id: faction.id },
      data: {
        treasury: nextTreasury,
        debt: nextDebt,
        unrestIndex: nextUnrest,
        standingPoints: nextStanding,
      },
    });
    updatedFactions.push(updated);
  }

  safeRevalidate(gameId);
  return updatedFactions;
}

export async function injectOffMapEventAction(
  gameId: string,
  params: {
    theater: "EUROPE" | "INDIA" | "WEST_AFRICA";
    title: string;
    description: string;
    targetFactionType?: FactionType;
    treasuryDelta?: number;
    unrestDelta?: number;
  }
) {
  const game = await prisma.game.findUniqueOrThrow({
    where: { id: gameId },
    include: { factions: true },
  });

  const targetFactionIds: string[] = [];
  if (params.targetFactionType) {
    const targetFaction = game.factions.find(
      (f) => f.type === params.targetFactionType
    );
    if (targetFaction) {
      targetFactionIds.push(targetFaction.id);
      await prisma.faction.update({
        where: { id: targetFaction.id },
        data: {
          treasury: Math.max(0, targetFaction.treasury + (params.treasuryDelta ?? 0)),
          unrestIndex: Math.max(
            0,
            Math.min(100, targetFaction.unrestIndex + (params.unrestDelta ?? 0))
          ),
        },
      });
    }
  } else {
    targetFactionIds.push(...game.factions.slice(0, 2).map((f) => f.id));
  }

  const currentModifiers = (game.offMapModifiers ?? {}) as Record<string, any>;
  const theaterKey =
    params.theater === "EUROPE"
      ? "europeTheater"
      : params.theater === "INDIA"
      ? "indiaTheater"
      : "westAfricaTheater";

  const updatedModifiers = {
    ...currentModifiers,
    [theaterKey]: {
      ...(currentModifiers[theaterKey] ?? {}),
      lastInjectedEvent: params.title,
      narrative: params.description,
      updatedAtTurn: game.turnNumber,
    },
  };

  await prisma.game.update({
    where: { id: gameId },
    data: { offMapModifiers: updatedModifiers },
  });

  const event = await recordAndReconcileEvent({
    gameId,
    turn: game.turnNumber,
    category: "DIPLOMACY",
    scope: EventScope.GLOBAL,
    factionIds: targetFactionIds,
    title: `[${params.theater} THEATER] ${params.title}`,
    description: params.description,
    validUntilTurn: game.turnNumber + 4,
  });

  safeRevalidate(gameId);
  return event;
}

export async function forceResolveTurnAction(gameId: string) {
  // Dynamically delegates to full state machine if available, or executes atomic turn advancement
  try {
    const { executeFullTurnCycle } = await import("@/engine/state-machine");
    const res = await executeFullTurnCycle(gameId);
    safeRevalidate(gameId);
    return res;
  } catch {
    const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });
    const seasons = ["Spring", "Summer", "Autumn", "Winter"];
    const currentIdx = seasons.indexOf(game.currentSeason);
    const nextIdx = (currentIdx + 1) % seasons.length;
    const nextYear =
      nextIdx === 0 ? game.currentYear + 1 : game.currentYear;
    const nextTurn = game.turnNumber + 1;

    await expireTurnEvents(gameId, nextTurn);
    await recalculateLedgersAction(gameId);

    const updatedGame = await prisma.game.update({
      where: { id: gameId },
      data: {
        turnNumber: nextTurn,
        currentSeason: seasons[nextIdx],
        currentYear: nextYear,
        currentPhase: Phase.INTEL_DISPATCH,
      },
    });
    safeRevalidate(gameId);
    return updatedGame;
  }
}
