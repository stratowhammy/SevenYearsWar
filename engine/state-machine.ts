import prisma from "@/lib/prisma";
import {
  BotBehavior,
  ControllerType,
  EventScope,
  Phase,
  RoleType,
} from "@prisma/client";
import { expireTurnEvents, recordAndReconcileEvent } from "./events/reconciler";
import { processCourierQueueForTurn } from "./courier-queue";
import { applyOffMapTheaterModifiers } from "./off-map-events";
import { invokeRoleAIController } from "@/engine/ai-agents/controller";
import {
  clampStanding,
  clampUnrest,
  getFactionManpowerCap,
  getPairwiseDiplomaticStance,
  isNavalUnitType,
  evaluateTreatyConference,
  evaluateFamilyCompactEscalation,
  checkCovenantViolation,
  declareWarBetweenFactions,
} from "./diplomacy";
import { computeEdgeConstraint } from "@/components/map/map-geometry";
import {
  getCharacterRoleGuide,
  evaluateCharacterObjectives,
} from "@/lib/character-objectives";

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
 * - Harvests unrest-adjusted node resource yields
 * - Deducts per-turn army/naval upkeep and 5% debt interest
 * - Triggers colonial mutiny / desertion if unrestIndex >= 80
 */
export async function processDiplomaticTradePhase(gameId: string) {
  // 1. Apply Europe, India, and West Africa off-map theater modifiers
  const offMapReport = await applyOffMapTheaterModifiers(gameId);

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

  // 2. Credit unrest-adjusted resource yields and deduct unit upkeep + 5% debt interest
  for (const faction of game.factions) {
    const clampedUnrest = clampUnrest(faction.unrestIndex);
    const unrestTaxModifier = Math.max(0.25, 1 - clampedUnrest / 150);

    const rawResourceIncome = faction.nodesControlled.reduce(
      (sum, node) => sum + (node.resourceYield || 0),
      0
    );
    const effectiveResourceIncome = Math.round(
      rawResourceIncome * unrestTaxModifier
    );

    const unitUpkeep = faction.units.reduce((sum, u) => {
      if (u.unitType === "SHIP_OF_THE_LINE")
        return sum + Math.round(u.strength * 0.025);
      if (u.unitType === "REGULAR") return sum + Math.round(u.strength * 0.015);
      if (u.unitType === "MILITIA" || u.unitType === "MERCHANTMAN")
        return sum + Math.round(u.strength * 0.008);
      return sum + Math.round(u.strength * 0.005);
    }, 0);

    const debtInterest = Math.round(faction.debt * 0.05);
    const netFiscalDelta = effectiveResourceIncome - unitUpkeep - debtInterest;

    let nextTreasury = faction.treasury + netFiscalDelta;
    let nextDebt = faction.debt;
    let nextUnrest = clampedUnrest;

    if (nextTreasury < 0) {
      nextDebt += Math.abs(nextTreasury);
      nextTreasury = 0;
      nextUnrest = clampUnrest(nextUnrest + 4);
    }

    await prisma.faction.update({
      where: { id: faction.id },
      data: {
        treasury: nextTreasury,
        debt: nextDebt,
        unrestIndex: nextUnrest,
        standingPoints: clampStanding(faction.standingPoints),
      },
    });

    // If unrest reaches >= 80%, record a COLONIAL_MUTINY event and apply 10% desertion to largest unit
    if (nextUnrest >= 80 && faction.units.length > 0) {
      const largestUnit = [...faction.units].sort(
        (a, b) => b.strength - a.strength
      )[0];
      if (largestUnit && largestUnit.strength > 200) {
        await prisma.unit.update({
          where: { id: largestUnit.id },
          data: {
            strength: Math.max(150, Math.floor(largestUnit.strength * 0.9)),
          },
        });
      }
      await recordAndReconcileEvent({
        gameId,
        turn: game.turnNumber,
        category: "UNREST",
        scope: EventScope.FACTION,
        factionIds: [faction.id],
        title: `Colonial Mutiny & Desertion (${faction.type})`,
        description: `Severe war exhaustion and fiscal strain (${nextUnrest}% unrest) triggered desertions among ${faction.type} garrisons.`,
        validUntilTurn: game.turnNumber + 2,
      });
    }
  }

  // Phase 7: Evaluate Third Family Compact Escalation (Turn 24+)
  const familyCompactNotice = await evaluateFamilyCompactEscalation(
    gameId,
    game.turnNumber
  );

  // Phase 7: Evaluate Treaty of Paris Peace Conference
  const treatyEvaluation = await evaluateTreatyConference(gameId);

  const updatedGame = await prisma.game.update({
    where: { id: gameId },
    data: { currentPhase: Phase.ORDER_SUBMISSION },
  });

  return {
    phaseExecuted: Phase.DIPLOMATIC_TRADE,
    nextPhase: updatedGame.currentPhase,
    offMapReport,
    familyCompactNotice,
    treatyEvaluation,
  };
}

/**
 * Phase 3 of Turn Loop: ORDER_SUBMISSION
 * - Uses a staggered worker pool (CONCURRENCY_LIMIT = 5) prioritizing EXECUTIVE roles first
 *   to prevent upstream API burst rate-limiting
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

  const pendingRoleTasks: Array<{
    factionId: string;
    factionType: string;
    roleType: RoleType;
  }> = [];

  for (const faction of game.factions) {
    for (const role of faction.roles) {
      if (
        role.controller === ControllerType.COMPUTER &&
        role.botBehavior === BotBehavior.AUTONOMOUS
      ) {
        const key = `${faction.id}:${role.roleType}`;
        if (!existingRoleSubmissions.has(key)) {
          pendingRoleTasks.push({
            factionId: faction.id,
            factionType: faction.type,
            roleType: role.roleType,
          });
        }
      }
    }
  }

  // Prioritize EXECUTIVE roles first so grand strategy precedes military/commercial execution
  pendingRoleTasks.sort((a, b) =>
    a.roleType === RoleType.EXECUTIVE && b.roleType !== RoleType.EXECUTIVE
      ? -1
      : a.roleType !== RoleType.EXECUTIVE && b.roleType === RoleType.EXECUTIVE
      ? 1
      : 0
  );

  const CONCURRENCY_LIMIT = 5;
  const aiSubmissions: Array<{
    factionId: string;
    factionType: string;
    roleType: RoleType;
    model: string;
    usedLiveApi: boolean;
    orderCount: number;
    orders: any[];
    reasoningScratchpad?: string;
  }> = [];

  for (let i = 0; i < pendingRoleTasks.length; i += CONCURRENCY_LIMIT) {
    const batch = pendingRoleTasks.slice(i, i + CONCURRENCY_LIMIT);
    const batchResults = await Promise.all(
      batch.map(async (task) => {
        const aiRes = await invokeRoleAIController({
          gameId,
          factionId: task.factionId,
          roleType: task.roleType,
          behavior: BotBehavior.AUTONOMOUS,
          persistOrders: true,
        });
        return {
          factionId: task.factionId,
          factionType: task.factionType,
          roleType: task.roleType,
          model: aiRes.modelConfig.model,
          usedLiveApi: aiRes.usedLiveApi,
          orderCount: aiRes.persistedOrderIds.length,
          orders: aiRes.orders?.actionOrders ?? [],
          reasoningScratchpad: aiRes.reasoningScratchpad,
        };
      })
    );
    aiSubmissions.push(...batchResults);
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
 * - Executes all pending orders with diplomatic stance rules, bilateral subsidies,
 *   manpower caps, graph adjacency validation, land/sea domain checks, and seasonal attrition.
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

  const allNodesMap = new Map(game.nodes.map((n) => [n.id, n]));
  const seaZoneIds = new Set(
    game.nodes.filter((n) => n.nodeType === "SEA_ZONE").map((n) => n.id)
  );

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
      include: { units: true },
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
        const unrestMod = Math.max(0.25, 1 - clampUnrest(faction.unrestIndex) / 150);
        const bonusYield = Math.max(
          8,
          Math.round(node.resourceYield * 0.5 * unrestMod)
        );
        await prisma.faction.update({
          where: { id: faction.id },
          data: { treasury: { increment: bonusYield } },
        });
      }
    } else if (order.orderType === "RECRUIT" && payload.sourceNodeId) {
      // Enforce historical faction manpower ceiling with diminishing returns
      const currentTotalStrength = faction.units.reduce(
        (sum, u) => sum + u.strength,
        0
      );
      const manpowerCap = getFactionManpowerCap(faction.type);
      const remainingHeadroom = Math.max(0, manpowerCap - currentTotalStrength);

      if (remainingHeadroom > 0) {
        const diminishingFactor = Math.max(
          0.15,
          1 - currentTotalStrength / manpowerCap
        );
        const rawRecruit = Math.max(100, Math.round(actualSpend * 8 * diminishingFactor));
        const addedStrength = Math.min(remainingHeadroom, rawRecruit);

        const existingUnit = await prisma.unit.findFirst({
          where: {
            factionId: faction.id,
            nodeId: payload.sourceNodeId,
          },
        });

        if (existingUnit) {
          await prisma.unit.update({
            where: { id: existingUnit.id },
            data: { strength: { increment: addedStrength } },
          });
        } else {
          const sourceNode = allNodesMap.get(payload.sourceNodeId);
          const defaultUnitType =
            sourceNode?.nodeType === "SEA_ZONE"
              ? "MERCHANTMAN"
              : faction.type.includes("NATIONS") ||
                faction.type === "HAUDENOSAUNEE" ||
                faction.type === "WESTERN_CONFEDERACY"
              ? "NATIVE_WAR_PARTY"
              : "MILITIA";

          await prisma.unit.create({
            data: {
              factionId: faction.id,
              nodeId: payload.sourceNodeId,
              unitType: defaultUnitType,
              strength: addedStrength,
              discipline: 1.0,
              isAcclimatized: true,
            },
          });
        }
      }
    } else if (order.orderType === "SUBSIDIZE") {
      // Bilateral SUBSIDIZE: transfers bullion to allied/target faction or pacifies local unrest
      const targetNode = payload.targetNodeId
        ? await prisma.mapNode.findUnique({
            where: { id: payload.targetNodeId },
          })
        : null;

      if (
        targetNode?.controllingId &&
        targetNode.controllingId !== faction.id &&
        actualSpend > 0
      ) {
        await prisma.faction.update({
          where: { id: targetNode.controllingId },
          data: { treasury: { increment: actualSpend } },
        });
      } else {
        const unrestReduction = Math.max(2, Math.floor(actualSpend / 10));
        await prisma.faction.update({
          where: { id: faction.id },
          data: {
            unrestIndex: clampUnrest(faction.unrestIndex - unrestReduction),
          },
        });
      }

      await prisma.faction.update({
        where: { id: faction.id },
        data: {
          standingPoints: clampStanding(faction.standingPoints + 1),
        },
      });
    } else if (order.orderType === "TRADE" && payload.sourceNodeId) {
      const sourceNode = await prisma.mapNode.findUnique({
        where: { id: payload.sourceNodeId },
      });
      // Check if adjacent sea zones have hostile Ships of the Line blockading trade
      const adjacentSeaIds = (sourceNode?.adjacentNodeIds ?? []).filter((id) =>
        seaZoneIds.has(id)
      );
      let isBlockaded = false;
      if (adjacentSeaIds.length > 0) {
        const seaShips = await prisma.unit.findMany({
          where: {
            nodeId: { in: adjacentSeaIds },
            unitType: "SHIP_OF_THE_LINE",
            factionId: { not: faction.id },
          },
          include: { faction: true },
        });
        for (const ship of seaShips) {
          const stance = await getPairwiseDiplomaticStance(
            gameId,
            { id: faction.id, type: faction.type },
            { id: ship.faction.id, type: ship.faction.type }
          );
          if (stance === "AT_WAR") {
            isBlockaded = true;
            break;
          }
        }
      }

      const baseReturn =
        Math.round(actualSpend * 1.25) +
        Math.round((sourceNode?.resourceYield ?? 15) * 0.4);
      const finalReturn = isBlockaded
        ? Math.round(baseReturn * 0.5)
        : baseReturn;

      if (isBlockaded) {
        combatLogs.push(
          `[Naval Blockade] Hostile ships of the line intercepted merchant convoys off ${sourceNode?.name ?? "coast"}, reducing trade yields by 50%`
        );
      }

      await prisma.faction.update({
        where: { id: faction.id },
        data: { treasury: { increment: finalReturn } },
      });
    } else if (
      (order.orderType === "MOVE" || order.orderType === "RAID") &&
      payload.targetNodeId
    ) {
      const targetNode = await prisma.mapNode.findUnique({
        where: { id: payload.targetNodeId },
        include: { units: true, controller: true },
      });

      if (targetNode) {
        const candidateUnits = await prisma.unit.findMany({
          where: {
            factionId: faction.id,
            ...(payload.unitIds && payload.unitIds.length > 0
              ? { id: { in: payload.unitIds } }
              : payload.sourceNodeId
              ? { nodeId: payload.sourceNodeId }
              : {}),
          },
          include: { node: true },
          take: 2,
        });

        const sourceNode =
          (payload.sourceNodeId
            ? await prisma.mapNode.findUnique({
                where: { id: payload.sourceNodeId },
              })
            : null) ?? candidateUnits[0]?.node;

        // 1. Validate Graph Adjacency (must be connected in adjacentNodeIds)
        const isAdjacent =
          sourceNode &&
          (sourceNode.id === targetNode.id ||
            sourceNode.adjacentNodeIds.includes(targetNode.id));

        if (!isAdjacent) {
          combatLogs.push(
            `Move rejected: ${sourceNode?.name ?? "Unknown"} is not adjacent to ${targetNode.name}`
          );
        } else {
          // Phase 7: Check Indigenous Boundary Covenant Violation
          const covCheck = await checkCovenantViolation(
            gameId,
            faction.id,
            targetNode.id
          );
          if (covCheck.violated && covCheck.log) {
            combatLogs.push(covCheck.log);
          }

          // 2. Filter units by Land/Sea Domain eligibility
          const targetIsCoastalOrSea =
            targetNode.nodeType === "SEA_ZONE" ||
            targetNode.adjacentNodeIds.some((id) => seaZoneIds.has(id));

          const hasNavalEscort = faction.units.some(
            (u) =>
              isNavalUnitType(u.unitType) &&
              (u.nodeId === sourceNode.id || u.nodeId === targetNode.id)
          );

          const movingUnits = candidateUnits.filter((u) => {
            if (isNavalUnitType(u.unitType)) {
              return targetIsCoastalOrSea;
            }
            if (targetNode.nodeType === "SEA_ZONE") {
              return hasNavalEscort;
            }
            return true;
          });

          // 3. Apply Seasonal Movement Attrition (Winter St. Lawrence Freeze / Caribbean Hurricane)
          const edge = computeEdgeConstraint(
            sourceNode,
            targetNode,
            game.currentSeason
          );

          for (const u of movingUnits) {
            let seasonalMultiplier = 1.0;
            if (edge.isFrozen) {
              seasonalMultiplier =
                u.unitType === "NATIVE_WAR_PARTY" ? 0.95 : 0.85;
            } else if (edge.hasHurricaneRisk && isNavalUnitType(u.unitType)) {
              seasonalMultiplier = 0.88;
            }

            if (seasonalMultiplier < 1.0) {
              const postAttrition = Math.max(
                100,
                Math.floor(u.strength * seasonalMultiplier)
              );
              const casualties = u.strength - postAttrition;
              u.strength = postAttrition;
              await prisma.unit.update({
                where: { id: u.id },
                data: { strength: postAttrition },
              });
              if (edge.isFrozen) {
                combatLogs.push(
                  `[Winter Freeze] Ice in ${targetNode.region} inflicted ${casualties} casualties on ${u.unitType} marching to ${targetNode.name}`
                );
              } else if (edge.hasHurricaneRisk) {
                combatLogs.push(
                  `[Hurricane] Tropical gale off ${targetNode.name} damaged ${u.unitType} with ${casualties} naval losses`
                );
              }
            }
          }

          // 4. Evaluate Diplomatic Stance with Target Node Controller
          const targetController = targetNode.controller;
          const diplomaticStance = targetController
            ? await getPairwiseDiplomaticStance(
                gameId,
                { id: faction.id, type: faction.type },
                { id: targetController.id, type: targetController.type }
              )
            : "AT_WAR";

          if (
            order.orderType === "RAID" &&
            targetNode.controllingId &&
            targetNode.controllingId !== faction.id
          ) {
            if (diplomaticStance === "ALLIED" || diplomaticStance === "AUXILIARY") {
              combatLogs.push(
                `Raid blocked: ${faction.type} is allied with ${targetController?.type}`
              );
            } else {
              const targetFac = await prisma.faction.findUnique({
                where: { id: targetNode.controllingId },
              });
              if (targetFac) {
                await prisma.faction.update({
                  where: { id: targetFac.id },
                  data: {
                    treasury: Math.max(0, targetFac.treasury - 10),
                    unrestIndex: clampUnrest(targetFac.unrestIndex + 4),
                  },
                });
              }

              // If previously NEUTRAL, a cross-border raid opens formal hostilities
              if (diplomaticStance === "NEUTRAL") {
                await recordAndReconcileEvent({
                  gameId,
                  turn: game.turnNumber,
                  category: "WAR_DECLARATION",
                  scope: EventScope.FACTION,
                  primaryNodeId: targetNode.id,
                  factionIds: [faction.id, targetNode.controllingId],
                  title: `Hostilities Opened at ${targetNode.name}`,
                  description: `${faction.type} frontier raids on ${targetNode.name} provoked open warfare with ${targetController?.type}.`,
                });
              } else {
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
              }
            }
          } else if (movingUnits.length > 0) {
            if (
              targetNode.controllingId === faction.id ||
              diplomaticStance === "ALLIED" ||
              diplomaticStance === "AUXILIARY"
            ) {
              // Friendly / Coalition Reinforcement Movement (No Friendly-Fire Capture!)
              for (const u of movingUnits) {
                await prisma.unit.update({
                  where: { id: u.id },
                  data: { nodeId: targetNode.id },
                });
              }
              combatLogs.push(
                `${faction.type} reinforced allied garrison at ${targetNode.name}`
              );
            } else if (diplomaticStance === "NEUTRAL" && targetNode.controllingId) {
              combatLogs.push(
                `Move blocked: ${faction.type} is NEUTRAL toward ${targetController?.type} at ${targetNode.name} (requires WAR_DECLARATION)`
              );
            } else {
              // Hostile Engagement (AT_WAR or unclaimed node)
              const defenderUnits = targetNode.units.filter(
                (u) => u.factionId !== faction.id
              );

              const attackerUnrestPenalty = Math.max(
                0.5,
                1 - clampUnrest(faction.unrestIndex) / 200
              );
              const defenderUnrestPenalty = targetController
                ? Math.max(
                    0.5,
                    1 - clampUnrest(targetController.unrestIndex) / 200
                  )
                : 1.0;

              const attackPower = movingUnits.reduce(
                (sum, u) =>
                  sum +
                  u.strength *
                    u.discipline *
                    attackerUnrestPenalty *
                    (targetNode.region === "CARIBBEAN" && !u.isAcclimatized
                      ? 0.85
                      : 1.0),
                0
              );
              const defensePower = defenderUnits.reduce(
                (sum, u) =>
                  sum +
                  u.strength * u.discipline * defenderUnrestPenalty * 1.1,
                0
              );

              if (defensePower === 0 || attackPower > defensePower) {
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
                      strength: Math.max(
                        150,
                        Math.floor(atkUnit.strength * 0.88)
                      ),
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
                for (const atkUnit of movingUnits) {
                  await prisma.unit.update({
                    where: { id: atkUnit.id },
                    data: {
                      strength: Math.max(
                        150,
                        Math.floor(atkUnit.strength * 0.78)
                      ),
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
      }
    } else if (
      order.orderType === "COVENANT_BOUNDARY" &&
      payload.sourceNodeId
    ) {
      const covenantedNode = await prisma.mapNode.findUnique({
        where: { id: payload.sourceNodeId },
      });
      if (covenantedNode) {
        const existingBounds = faction.covenantBoundaries || [];
        if (!existingBounds.includes(covenantedNode.id)) {
          await prisma.faction.update({
            where: { id: faction.id },
            data: { covenantBoundaries: { push: covenantedNode.id } },
          });
          await recordAndReconcileEvent({
            gameId,
            turn: game.turnNumber,
            category: "TREATY",
            scope: EventScope.NODE,
            primaryNodeId: covenantedNode.id,
            factionIds: [faction.id],
            title: `Easton Covenant Boundary Proclaimed at ${covenantedNode.name}`,
            description: `${faction.type} grand council proclaimed a sacred boundary over ${covenantedNode.name}, barring colonial encroachment under treaty covenant.`,
          });
          combatLogs.push(
            `[Covenant Proclamation] ${faction.type} established a sovereign boundary over ${covenantedNode.name} under the Treaty of Easton / Council Covenants.`
          );
        }
      }
    } else if (
      order.orderType === "AMPHIBIOUS_ASSAULT" &&
      payload.targetNodeId
    ) {
      const targetNode = await prisma.mapNode.findUnique({
        where: { id: payload.targetNodeId },
        include: { units: true, controller: true },
      });

      if (targetNode) {
        const adjacentSeaIds = (targetNode.adjacentNodeIds ?? []).filter((id) =>
          seaZoneIds.has(id)
        );
        const hasNavalFleet = faction.units.some(
          (u) =>
            isNavalUnitType(u.unitType) &&
            (u.nodeId === targetNode.id || adjacentSeaIds.includes(u.nodeId))
        );

        if (!hasNavalFleet) {
          combatLogs.push(
            `Amphibious assault rejected: ${faction.type} lacks naval escort near ${targetNode.name}`
          );
        } else {
          // Check for defending hostile Ships of the Line in adjacent waters
          const hostileSeaShips = await prisma.unit.findMany({
            where: {
              nodeId: { in: adjacentSeaIds },
              unitType: "SHIP_OF_THE_LINE",
              factionId: { not: faction.id },
            },
          });

          let fleetRepulsed = false;
          if (hostileSeaShips.length > 0) {
            const defendingFleetPower = hostileSeaShips.reduce(
              (s, u) => s + u.strength * u.discipline,
              0
            );
            const attackingFleetPower = faction.units
              .filter(
                (u) =>
                  isNavalUnitType(u.unitType) &&
                  adjacentSeaIds.includes(u.nodeId)
              )
              .reduce((s, u) => s + u.strength * u.discipline, 0);

            if (defendingFleetPower > attackingFleetPower * 1.25) {
              fleetRepulsed = true;
              combatLogs.push(
                `[Naval Interception] Hostile fleet in adjacent waters intercepted and repulsed ${faction.type} amphibious expedition against ${targetNode.name}!`
              );
            }
          }

          if (!fleetRepulsed) {
            combatLogs.push(
              `[Amphibious Assault] ${faction.type} fleet conducted preliminary naval bombardment on ${targetNode.name}!`
            );

            const candidateLandUnits = await prisma.unit.findMany({
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
            const attackPower =
              (candidateLandUnits.reduce(
                (sum, u) => sum + u.strength * u.discipline,
                0
              ) || 1200) * 1.35; // 35% preliminary bombardment advantage
            const defensePower = defenderUnits.reduce(
              (sum, u) => sum + u.strength * u.discipline,
              0
            );

            if (defensePower === 0 || attackPower > defensePower) {
              const previousOwnerId = targetNode.controllingId;
              for (const defUnit of defenderUnits) {
                await prisma.unit.delete({ where: { id: defUnit.id } });
              }
              for (const atkUnit of candidateLandUnits) {
                await prisma.unit.update({
                  where: { id: atkUnit.id },
                  data: {
                    nodeId: targetNode.id,
                    strength: Math.max(150, Math.floor(atkUnit.strength * 0.9)),
                  },
                });
              }
              await prisma.mapNode.update({
                where: { id: targetNode.id },
                data: { controllingId: faction.id },
              });
              combatLogs.push(
                `${faction.type} captured ${targetNode.name} via combined amphibious assault`
              );

              if (previousOwnerId && previousOwnerId !== faction.id) {
                await recordAndReconcileEvent({
                  gameId,
                  turn: game.turnNumber,
                  category: "MILITARY",
                  scope: EventScope.NODE,
                  primaryNodeId: targetNode.id,
                  factionIds: [faction.id, previousOwnerId],
                  title: `Amphibious Fall of ${targetNode.name}`,
                  description: `${faction.type} forces stormed ashore under heavy naval gunfire, capturing ${targetNode.name}.`,
                });
              }
            } else {
              combatLogs.push(
                `Amphibious assault on ${targetNode.name} by ${faction.type} was repulsed`
              );
            }
          }
        }
      }
    } else if (order.orderType === "DECLARE_WAR" && payload.targetNodeId) {
      const targetNode = await prisma.mapNode.findUnique({
        where: { id: payload.targetNodeId },
        include: { controller: true },
      });
      if (targetNode?.controller && targetNode.controller.id !== faction.id) {
        await declareWarBetweenFactions(
          gameId,
          faction.id,
          targetNode.controller.id,
          payload.reasoning || "Formal declaration of war"
        );
        combatLogs.push(
          `[Declaration of War] ${faction.type} formally declared war on ${targetNode.controller.type}!`
        );
      }
    } else if (order.orderType === "ASSEMBLY_NEGOTIATION") {
      if (actualSpend > 0) {
        await prisma.faction.update({
          where: { id: faction.id },
          data: {
            unrestIndex: clampUnrest(faction.unrestIndex - 10),
            assemblySupport: Math.min(100, (faction.assemblySupport ?? 50) + 15),
          },
        });
        combatLogs.push(
          `[Assembly Negotiation] ${faction.type} granted patronages to colonial assembly (-10% unrest, +15 assembly support).`
        );
      } else {
        await prisma.faction.update({
          where: { id: faction.id },
          data: {
            treasury: { increment: 40 },
            unrestIndex: clampUnrest(faction.unrestIndex + 5),
          },
        });
        combatLogs.push(
          `[Assembly Negotiation] ${faction.type} secured 40 £ emergency supply credits from provincial assembly (+5% unrest).`
        );
      }
    } else if (order.orderType === "TREATY_CONFERENCE") {
      const treatyRes = await evaluateTreatyConference(gameId);
      if (treatyRes.triggered) {
        combatLogs.push(
          treatyRes.treatySummary ||
            `[Treaty Conference] Plenipotentiaries ratified the 1763 Treaty of Paris.`
        );
      } else {
        combatLogs.push(
          `[Treaty Conference] Peace envoys convened; preliminary truce guidelines affirmed.`
        );
      }
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { isExecuted: true },
    });
    executedCount++;
  }

  // Phase 7: Evaluate Multi-Turn Strategic Objectives on Faction Roles
  const militaryRoles = await prisma.factionRole.findMany({
    where: {
      faction: { gameId },
      roleType: RoleType.MILITARY,
      strategicObjective: { not: null as any },
    },
    include: { faction: { include: { nodesControlled: true } } },
  });

  for (const role of militaryRoles) {
    const obj = role.strategicObjective as any;
    if (obj && obj.objectiveNodeId && obj.status === "IN_PROGRESS") {
      const controlsObj = role.faction.nodesControlled.some(
        (n) => n.id === obj.objectiveNodeId
      );
      if (controlsObj) {
        await prisma.factionRole.update({
          where: { id: role.id },
          data: {
            strategicObjective: {
              ...obj,
              status: "ACCOMPLISHED",
              completedTurn: game.turnNumber,
            },
          },
        });
        await prisma.faction.update({
          where: { id: role.faction.id },
          data: {
            standingPoints: clampStanding(role.faction.standingPoints + 1),
          },
        });
        combatLogs.push(
          `[Strategic Objective Accomplished] ${role.faction.type} secured target objective node!`
        );
      }
    }
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

  // Evaluate and persist Victory Points across all 10 factions & 30 character seats
  const vpStandings = await reconcileAndPersistVictoryPoints(gameId);

  const updatedGame = await prisma.game.update({
    where: { id: gameId },
    data: {
      turnNumber: nextTurn,
      currentSeason: nextSeason,
      currentYear: nextYear,
      currentPhase: Phase.INTEL_DISPATCH,
      victoryPointsStandings: vpStandings,
    },
  });

  return {
    phaseExecuted: Phase.RESOLUTION,
    nextPhase: updatedGame.currentPhase,
    executedOrdersCount: executedCount,
    combatLogs,
    game: updatedGame,
    victoryPointsStandings: vpStandings,
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

/**
 * Evaluates all 30 character role objectives, calculates victory points,
 * and persists them directly into FactionRole.victoryPoints, Faction.victoryPoints,
 * and Game.victoryPointsStandings
 */
export async function reconcileAndPersistVictoryPoints(gameId: string) {
  const game = await prisma.game.findUniqueOrThrow({
    where: { id: gameId },
    include: {
      factions: {
        include: {
          roles: true,
          nodesControlled: true,
          units: true,
        },
      },
      nodes: true,
      orders: true,
      dispatches: true,
      events: true,
    },
  });

  const standings: Record<string, { factionVP: number; roles: Record<string, number> }> = {};

  for (const faction of game.factions) {
    let factionTotalVP = 0;
    const roleScores: Record<string, number> = {};

    for (const role of faction.roles) {
      const guide = getCharacterRoleGuide(faction.type, role.roleType);
      const evalResult = evaluateCharacterObjectives(guide, game, faction);

      roleScores[role.roleType] = evalResult.earnedVP;
      factionTotalVP += evalResult.earnedVP;

      await prisma.factionRole.update({
        where: { id: role.id },
        data: {
          victoryPoints: evalResult.earnedVP,
          victoryPointsBreakdown: evalResult.evaluatedObjectives.map((obj) => ({
            id: obj.id,
            title: obj.title,
            victoryPoints: obj.victoryPoints,
            earnedVP: (obj as any).earnedVP ?? (obj.isCompleted ? obj.victoryPoints : 0),
            isCompleted: obj.isCompleted,
            progressText: obj.progressText,
            progressPercent: obj.progressPercent,
          })),
        },
      });
    }

    await prisma.faction.update({
      where: { id: faction.id },
      data: {
        victoryPoints: factionTotalVP,
      },
    });

    standings[faction.type] = {
      factionVP: factionTotalVP,
      roles: roleScores,
    };
  }

  await prisma.game.update({
    where: { id: gameId },
    data: {
      victoryPointsStandings: standings,
    },
  });

  return standings;
}
