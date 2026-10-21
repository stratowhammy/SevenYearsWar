import prisma from "@/lib/prisma";
import {
  BotBehavior,
  ControllerType,
  EventScope,
  Phase,
} from "@prisma/client";
import { expireTurnEvents, recordAndReconcileEvent } from "./events/reconciler";
import { processCourierQueueForTurn } from "./courier-queue";
import { applyOffMapTheaterModifiers } from "./off-map-events";
import { invokeRoleAIController } from "@/engine/ai-agents/controller";

const PHASE_SEQUENCE: Phase[] = [
  Phase.INTEL_DISPATCH,
  Phase.DIPLOMATIC_TRADE,
  Phase.ORDER_SUBMISSION,
  Phase.RESOLUTION,
];

const SEASON_SEQUENCE = ["Spring", "Summer", "Autumn", "Winter"];

/**
 * Phase 1 of Turn Loop: INTEL_DISPATCH
 * - Processes courier dispatches in transit (deliveries & naval interceptions)
 * - Deterministically expires outdated turn events via SQL invalidation
 */
export async function processIntelDispatchPhase(gameId: string) {
  const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });

  await expireTurnEvents(gameId, game.turnNumber);
  const courierReport = await processCourierQueueForTurn(
    gameId,
    game.turnNumber
  );

  const updatedGame = await prisma.game.update({
    where: { id: gameId },
    data: { currentPhase: Phase.DIPLOMATIC_TRADE },
  });

  return {
    phaseExecuted: Phase.INTEL_DISPATCH,
    nextPhase: updatedGame.currentPhase,
    courierReport,
  };
}

/**
 * Phase 2 of Turn Loop: DIPLOMATIC_TRADE
 * - Applies Europe, India, and West Africa off-map modifiers to American theater ledgers
 * - Harvests base node resource yields and processes diplomatic subsidies / trade orders
 */
export async function processDiplomaticTradePhase(gameId: string) {
  const game = await prisma.game.findUniqueOrThrow({
    where: { id: gameId },
    include: {
      factions: { include: { nodesControlled: true } },
    },
  });

  // 1. Apply Europe, India, and West Africa off-map theater modifiers
  const offMapReport = await applyOffMapTheaterModifiers(gameId);

  // 2. Credit controlled node resource yields (SUGAR, FURS, TIMBER, SILVER)
  for (const faction of game.factions) {
    const resourceIncome = faction.nodesControlled.reduce(
      (sum, node) => sum + (node.resourceYield || 0),
      0
    );
    if (resourceIncome > 0) {
      await prisma.faction.update({
        where: { id: faction.id },
        data: { treasury: { increment: resourceIncome } },
      });
    }
  }

  const updatedGame = await prisma.game.update({
    where: { id: gameId },
    data: { currentPhase: Phase.ORDER_SUBMISSION },
  });

  return {
    phaseExecuted: Phase.DIPLOMATIC_TRADE,
    nextPhase: updatedGame.currentPhase,
    offMapReport,
  };
}

/**
 * Phase 3 of Turn Loop: ORDER_SUBMISSION
 * - Iterates over all COMPUTER roles configured as AUTONOMOUS and invokes the Hybrid DeepSeek Controller
 *   (deepseek-v4-pro for Executive, deepseek-flash for Military/Commercial)
 * - Generates Advisor briefings for COMPUTER + ADVISOR seats
 */
export async function processOrderSubmissionPhase(gameId: string) {
  const game = await prisma.game.findUniqueOrThrow({
    where: { id: gameId },
    include: {
      factions: { include: { roles: true } },
      orders: {
        where: { isExecuted: false },
      },
    },
  });

  const existingRoleSubmissions = new Set(
    game.orders
      .filter((o) => o.turnNumber === game.turnNumber)
      .map((o) => `${o.factionId}:${o.submittedByRole}`)
  );

  const aiSubmissions: Array<{
    factionId: string;
    roleType: string;
    model: string;
    orderCount: number;
  }> = [];

  for (const faction of game.factions) {
    for (const role of faction.roles) {
      if (
        role.controller === ControllerType.COMPUTER &&
        role.botBehavior === BotBehavior.AUTONOMOUS
      ) {
        const key = `${faction.id}:${role.roleType}`;
        if (!existingRoleSubmissions.has(key)) {
          const aiRes = await invokeRoleAIController({
            gameId,
            factionId: faction.id,
            roleType: role.roleType,
            behavior: BotBehavior.AUTONOMOUS,
            persistOrders: true,
          });
          aiSubmissions.push({
            factionId: faction.id,
            roleType: role.roleType,
            model: aiRes.modelConfig.model,
            orderCount: aiRes.persistedOrderIds.length,
          });
        }
      }
    }
  }

  const updatedGame = await prisma.game.update({
    where: { id: gameId },
    data: { currentPhase: Phase.RESOLUTION },
  });

  return {
    phaseExecuted: Phase.ORDER_SUBMISSION,
    nextPhase: updatedGame.currentPhase,
    aiSubmissions,
  };
}

/**
 * Phase 4 of Turn Loop: RESOLUTION
 * - Executes all pending orders (MOVE, RECRUIT, EXTRACT, TRADE, SUBSIDIZE, RAID)
 * - Resolves tactical battles and fort captures (triggering recordAndReconcileEvent FORT_CAPTURED invalidation)
 * - Advances season, year, and turnNumber
 */
export async function processResolutionPhase(gameId: string) {
  const game = await prisma.game.findUniqueOrThrow({
    where: { id: gameId },
    include: {
      factions: true,
      nodes: { include: { units: true } },
      orders: {
        where: { isExecuted: false },
        orderBy: { id: "asc" },
      },
    },
  });

  let executedCount = 0;
  const combatLogs: string[] = [];

  for (const order of game.orders) {
    const payload = (order.payload ?? {}) as {
      orderType?: string;
      sourceNodeId?: string;
      targetNodeId?: string;
      unitIds?: string[];
      allocatedTreasury?: number;
      reasoning?: string;
    };

    const alloc = Math.max(0, Number(payload.allocatedTreasury ?? 0));
    const faction = await prisma.faction.findUnique({
      where: { id: order.factionId },
    });
    if (!faction) continue;

    // Deduct allocated treasury if available
    const actualSpend = Math.min(faction.treasury, alloc);
    if (actualSpend > 0) {
      await prisma.faction.update({
        where: { id: faction.id },
        data: { treasury: { decrement: actualSpend } },
      });
    }

    if (order.orderType === "EXTRACT" && payload.sourceNodeId) {
      const node = await prisma.mapNode.findUnique({
        where: { id: payload.sourceNodeId },
      });
      if (node && node.controllingId === faction.id) {
        const bonusYield = Math.max(10, Math.round(node.resourceYield * 0.5));
        await prisma.faction.update({
          where: { id: faction.id },
          data: { treasury: { increment: bonusYield } },
        });
      }
    } else if (order.orderType === "RECRUIT" && payload.sourceNodeId) {
      const existingUnit = await prisma.unit.findFirst({
        where: {
          factionId: faction.id,
          nodeId: payload.sourceNodeId,
        },
      });
      const addedStrength = Math.max(150, actualSpend * 12);
      if (existingUnit) {
        await prisma.unit.update({
          where: { id: existingUnit.id },
          data: { strength: { increment: addedStrength } },
        });
      } else {
        await prisma.unit.create({
          data: {
            factionId: faction.id,
            nodeId: payload.sourceNodeId,
            unitType: "MILITIA",
            strength: addedStrength,
            discipline: 1.0,
            isAcclimatized: true,
          },
        });
      }
    } else if (
      (order.orderType === "TRADE" || order.orderType === "SUBSIDIZE") &&
      payload.sourceNodeId
    ) {
      const returnGain = Math.round(actualSpend * 1.35) + 12;
      await prisma.faction.update({
        where: { id: faction.id },
        data: {
          treasury: { increment: returnGain },
          standingPoints: { increment: order.orderType === "SUBSIDIZE" ? 1 : 0 },
        },
      });
    } else if (
      (order.orderType === "MOVE" || order.orderType === "RAID") &&
      payload.targetNodeId
    ) {
      const targetNode = await prisma.mapNode.findUnique({
        where: { id: payload.targetNodeId },
        include: { units: true },
      });

      if (targetNode) {
        const movingUnits = await prisma.unit.findMany({
          where: {
            factionId: faction.id,
            ...(payload.unitIds && payload.unitIds.length > 0
              ? { id: { in: payload.unitIds } }
              : payload.sourceNodeId
              ? { nodeId: payload.sourceNodeId }
              : {}),
          },
          take: 2,
        });

        const defenderUnits = targetNode.units.filter(
          (u) => u.factionId !== faction.id
        );

        const attackPower = movingUnits.reduce(
          (sum, u) =>
            sum +
            u.strength *
              u.discipline *
              (targetNode.region === "CARIBBEAN" && !u.isAcclimatized
                ? 0.85
                : 1.0),
          0
        );
        const defensePower = defenderUnits.reduce(
          (sum, u) => sum + u.strength * u.discipline * 1.1,
          0
        );

        if (order.orderType === "RAID" && targetNode.controllingId && targetNode.controllingId !== faction.id) {
          await prisma.faction.update({
            where: { id: targetNode.controllingId },
            data: {
              treasury: { decrement: 10 },
              unrestIndex: { increment: 4 },
            },
          });
          await recordAndReconcileEvent({
            gameId,
            turn: game.turnNumber,
            category: "MILITARY",
            scope: EventScope.NODE,
            primaryNodeId: targetNode.id,
            factionIds: [faction.id, targetNode.controllingId],
            title: `Frontier Raid on ${targetNode.name}`,
            description: `${faction.type} raiding parties struck supply depots around ${targetNode.name}.`,
            validUntilTurn: game.turnNumber + 3,
          });
        } else if (movingUnits.length > 0) {
          if (defensePower === 0 || attackPower > defensePower) {
            // Attacker wins and captures node!
            const previousOwnerId = targetNode.controllingId;

            for (const defUnit of defenderUnits) {
              const surviving = Math.floor(defUnit.strength * 0.55);
              if (surviving < 150) {
                await prisma.unit.delete({ where: { id: defUnit.id } });
              } else {
                await prisma.unit.update({
                  where: { id: defUnit.id },
                  data: { strength: surviving },
                });
              }
            }

            for (const atkUnit of movingUnits) {
              await prisma.unit.update({
                where: { id: atkUnit.id },
                data: {
                  nodeId: targetNode.id,
                  strength: Math.max(200, Math.floor(atkUnit.strength * 0.88)),
                },
              });
            }

            if (previousOwnerId !== faction.id) {
              await prisma.mapNode.update({
                where: { id: targetNode.id },
                data: { controllingId: faction.id },
              });

              const involvedFactions = previousOwnerId
                ? [faction.id, previousOwnerId]
                : [faction.id];

              await recordAndReconcileEvent({
                gameId,
                turn: game.turnNumber,
                category: "FORT_CAPTURED",
                scope: EventScope.NODE,
                primaryNodeId: targetNode.id,
                factionIds: involvedFactions,
                title: `Capture of ${targetNode.name}`,
                description: `Forces of ${faction.type} seized ${targetNode.name}, superseding prior garrison and siege orders.`,
              });

              combatLogs.push(
                `${faction.type} captured ${targetNode.name}`
              );
            }
          } else {
            // Repulsed assault
            for (const atkUnit of movingUnits) {
              await prisma.unit.update({
                where: { id: atkUnit.id },
                data: {
                  strength: Math.max(150, Math.floor(atkUnit.strength * 0.78)),
                },
              });
            }
            combatLogs.push(
              `Assault on ${targetNode.name} by ${faction.type} was repulsed`
            );
          }
        }
      }
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { isExecuted: true },
    });
    executedCount++;
  }

  // Advance season, year, and turnNumber
  const currentSeasonIdx = SEASON_SEQUENCE.indexOf(game.currentSeason);
  const nextSeasonIdx =
    currentSeasonIdx === -1
      ? 0
      : (currentSeasonIdx + 1) % SEASON_SEQUENCE.length;
  const nextSeason = SEASON_SEQUENCE[nextSeasonIdx];
  const nextYear =
    nextSeasonIdx === 0 ? game.currentYear + 1 : game.currentYear;
  const nextTurn = game.turnNumber + 1;

  await expireTurnEvents(gameId, nextTurn);

  const updatedGame = await prisma.game.update({
    where: { id: gameId },
    data: {
      turnNumber: nextTurn,
      currentSeason: nextSeason,
      currentYear: nextYear,
      currentPhase: Phase.INTEL_DISPATCH,
    },
  });

  return {
    phaseExecuted: Phase.RESOLUTION,
    nextPhase: updatedGame.currentPhase,
    executedOrdersCount: executedCount,
    combatLogs,
    game: updatedGame,
  };
}

export async function advanceSinglePhase(gameId: string) {
  const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });

  switch (game.currentPhase) {
    case Phase.INTEL_DISPATCH:
      return processIntelDispatchPhase(gameId);
    case Phase.DIPLOMATIC_TRADE:
      return processDiplomaticTradePhase(gameId);
    case Phase.ORDER_SUBMISSION:
      return processOrderSubmissionPhase(gameId);
    case Phase.RESOLUTION:
      return processResolutionPhase(gameId);
    default:
      return processIntelDispatchPhase(gameId);
  }
}

export async function executeFullTurnCycle(gameId: string) {
  const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId } });
  const startIdx = PHASE_SEQUENCE.indexOf(game.currentPhase);
  const results = [];

  for (let i = Math.max(0, startIdx); i < PHASE_SEQUENCE.length; i++) {
    const stepResult = await advanceSinglePhase(gameId);
    results.push(stepResult);
  }

  const finalGame = await prisma.game.findUniqueOrThrow({
    where: { id: gameId },
  });

  return {
    completedTurn: game.turnNumber,
    newTurn: finalGame.turnNumber,
    season: finalGame.currentSeason,
    year: finalGame.currentYear,
    phaseResults: results,
    game: finalGame,
  };
}
