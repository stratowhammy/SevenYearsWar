import { RoleType, BotBehavior } from "@prisma/client";
import prisma from "@/lib/prisma";
import {
  AutonomousOrderSchema,
  AutonomousOrderPayload,
  buildBoundedPromptMessages,
  getRoleContextPayload,
} from "@/engine/ai-agents/serializer";

export function getModelConfig(roleType: RoleType, behavior: BotBehavior) {
  if (behavior === "AUTONOMOUS" && roleType === "EXECUTIVE") {
    return {
      model: "deepseek-v4-pro",
      extra_body: {
        thinking: { type: "enabled" },
      },
      temperature: 0.6,
      max_tokens: 1500, // Accommodates reasoning scratchpad + strategic directives
    };
  }

  return {
    model: "deepseek-flash",
    extra_body: {
      thinking: { type: "disabled" },
    },
    response_format:
      behavior === "AUTONOMOUS" ? { type: "json_object" } : undefined,
    temperature: 0.3,
    max_tokens: 450, // Capped O(1) budget for direct JSON orders or 150-word advisor memos
  };
}

function synthesizeDeterministicAutonomousOrders(
  contextPayload: Awaited<ReturnType<typeof getRoleContextPayload>>,
  roleType: RoleType
): { orders: AutonomousOrderPayload; reasoningScratchpad?: string } {
  const nodes = contextPayload.controlledNodes;
  const units = contextPayload.activeUnits;
  const treasury = contextPayload.factionState.treasury ?? 100;
  const debt = contextPayload.factionState.debt ?? 0;
  const unrest = contextPayload.factionState.unrest ?? 0;
  const primaryNode = nodes[0];
  const primaryUnit = units[0];
  const activeObjective = (contextPayload.strategicObjective ?? null) as {
    objectiveNodeId?: string;
    objectiveType?: string;
    status?: string;
  } | null;

  const isIndigenous =
    contextPayload.factionType?.includes("NATIONS") ||
    contextPayload.factionType === "HAUDENOSAUNEE" ||
    contextPayload.factionType === "WESTERN_CONFEDERACY";

  const actionOrders: AutonomousOrderPayload["actionOrders"] = [];

  if (roleType === RoleType.EXECUTIVE) {
    if (debt >= 300 && unrest >= 80 && primaryNode) {
      actionOrders.push({
        orderType: "TREATY_CONFERENCE",
        sourceNodeId: primaryNode.id,
        allocatedTreasury: 0,
        reasoning: `Convene plenipotentiaries to negotiate peace and sovereign debt relief`.slice(
          0,
          100
        ),
      });
    } else if (isIndigenous && primaryNode) {
      actionOrders.push({
        orderType: "COVENANT_BOUNDARY",
        sourceNodeId: primaryNode.id,
        allocatedTreasury: 0,
        reasoning: `Proclaim sacred treaty covenant boundary at ${primaryNode.name}`.slice(
          0,
          100
        ),
      });
    } else if (!isIndigenous && unrest >= 45 && primaryNode) {
      actionOrders.push({
        orderType: "ASSEMBLY_NEGOTIATION",
        sourceNodeId: primaryNode.id,
        allocatedTreasury: Math.min(20, Math.floor(treasury * 0.2)),
        reasoning: `Negotiate provincial assembly war appropriations and redress grievances at ${primaryNode.name}`.slice(
          0,
          100
        ),
      });
    } else if (primaryNode) {
      actionOrders.push({
        orderType: "SUBSIDIZE",
        sourceNodeId: primaryNode.id,
        targetNodeId: primaryNode.adjacentNodeIds[0] ?? primaryNode.id,
        allocatedTreasury: Math.min(25, Math.floor(treasury * 0.15)),
        reasoning: `Reinforce sovereign credit and allied war councils from ${primaryNode.name}`.slice(
          0,
          100
        ),
      });
    }
    if (nodes.length > 1) {
      actionOrders.push({
        orderType: "EXTRACT",
        sourceNodeId: nodes[1].id,
        allocatedTreasury: 10,
        reasoning: `Mobilize fiscal extraction at ${nodes[1].name} to offset debt`.slice(
          0,
          100
        ),
      });
    }
    return {
      orders: AutonomousOrderSchema.parse({ actionOrders: actionOrders.slice(0, 3) }),
      reasoningScratchpad: `[deepseek-v4-pro Thinking Trace] Evaluated ${contextPayload.factionType} grand strategy across ${nodes.length} nodes and ${contextPayload.recentActiveEvents.length} active events. Prioritizing fiscal stability (${treasury} £ treasury, ${debt} £ debt) and multi-turn campaign alignment.`,
    };
  }

  if (roleType === RoleType.MILITARY) {
    if (primaryUnit && primaryNode) {
      const preferredTarget =
        activeObjective?.status === "IN_PROGRESS" &&
        activeObjective.objectiveNodeId &&
        primaryUnit.adjacentNodeIds.includes(activeObjective.objectiveNodeId)
          ? activeObjective.objectiveNodeId
          : primaryNode.adjacentNodeIds[0] ?? primaryUnit.nodeId;

      const hasNavalFleet = units.some(
        (u) => u.type === "SHIP_OF_THE_LINE" || u.type === "MERCHANTMAN"
      );

      actionOrders.push({
        orderType: isIndigenous
          ? "RAID"
          : hasNavalFleet && primaryUnit.type === "SHIP_OF_THE_LINE"
          ? "AMPHIBIOUS_ASSAULT"
          : "MOVE",
        sourceNodeId: primaryUnit.nodeId,
        targetNodeId: preferredTarget,
        unitIds: [primaryUnit.id],
        allocatedTreasury: Math.min(15, Math.floor(treasury * 0.1)),
        reasoning: `Advance ${primaryUnit.type} from ${primaryUnit.location} toward operational objective`.slice(
          0,
          100
        ),
      });
    }
    if (primaryNode && treasury >= 30) {
      actionOrders.push({
        orderType: "RECRUIT",
        sourceNodeId: primaryNode.id,
        allocatedTreasury: 20,
        reasoning: `Muster provincial and auxiliary reinforcements at ${primaryNode.name}`.slice(
          0,
          100
        ),
      });
    }
    return {
      orders: AutonomousOrderSchema.parse({ actionOrders: actionOrders.slice(0, 3) }),
    };
  }

  // DIPLOMATIC_COMMERCE
  if (primaryNode) {
    actionOrders.push({
      orderType: "EXTRACT",
      sourceNodeId: primaryNode.id,
      allocatedTreasury: 10,
      reasoning: `Maximize ${primaryNode.resourceType || "colonial"} yield at ${primaryNode.name}`.slice(
        0,
        100
      ),
    });
    if (primaryNode.adjacentNodeIds[0]) {
      actionOrders.push({
        orderType: "TRADE",
        sourceNodeId: primaryNode.id,
        targetNodeId: primaryNode.adjacentNodeIds[0],
        allocatedTreasury: Math.min(15, Math.floor(treasury * 0.1)),
        reasoning: `Dispatch merchant convoy from ${primaryNode.name} to adjacent entrepot`.slice(
          0,
          100
        ),
      });
    }
  }

  return {
    orders: AutonomousOrderSchema.parse({ actionOrders }),
  };
}

function synthesizeDeterministicAdvisorBriefing(
  contextPayload: Awaited<ReturnType<typeof getRoleContextPayload>>,
  roleType: RoleType
): string {
  const topEvents =
    contextPayload.recentActiveEvents.slice(0, 2).join(" | ") ||
    "No immediate crisis dispatches.";
  const unitSummary = `${contextPayload.activeUnits.length} field/naval formations`;
  const nodeSummary = `${contextPayload.controlledNodes.length} strategic nodes`;

  const rawBriefing = `MEMORANDUM FROM ${contextPayload.roleTitle.toUpperCase()} (${roleType}): Treasury stands at ${contextPayload.factionState.treasury} £ with ${contextPayload.factionState.debt} £ debt and ${contextPayload.factionState.unrest}% unrest across ${nodeSummary} and ${unitSummary}. Doctrine Directive: ${contextPayload.personaPrompt} Priority Intelligence: ${topEvents} Recommendation: Consolidate supply corridors before seasonal weather degrades movement, protect high-yield resource nodes, and allocate no more than 20% of liquid treasury to forward operations this turn.`;

  const words = rawBriefing.split(/\s+/);
  return words.slice(0, 145).join(" ");
}

export async function invokeRoleAIController(params: {
  gameId: string;
  factionId: string;
  roleType: RoleType;
  behavior: BotBehavior;
  persistOrders?: boolean;
}) {
  const { gameId, factionId, roleType, behavior, persistOrders = true } = params;
  const modelConfig = getModelConfig(roleType, behavior);
  const contextPayload = await getRoleContextPayload(
    gameId,
    factionId,
    roleType
  );
  const effectiveBehavior =
    behavior === BotBehavior.NONE ? "ADVISOR" : behavior;
  const promptBundle = buildBoundedPromptMessages(
    contextPayload,
    roleType,
    effectiveBehavior
  );

  const { extra_body, ...restModelConfig } = modelConfig;
  const deepseekRequestPayload = {
    ...restModelConfig,
    ...(extra_body ?? {}),
    max_tokens:
      modelConfig.model === "deepseek-v4-pro"
        ? Math.max(modelConfig.max_tokens, 4096)
        : modelConfig.max_tokens,
    messages: promptBundle.messages,
  };

  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

  let parsedOrders: AutonomousOrderPayload | null = null;
  let advisorBriefing: string | null = null;
  let reasoningScratchpad: string | undefined;
  let usedLiveApi = false;

  const shouldCallLiveNetwork =
    Boolean(apiKey && apiKey.trim().length > 0) &&
    (process.env.VITEST !== "true" ||
      process.env.FORCE_LIVE_DEEPSEEK === "true");

  if (shouldCallLiveNetwork) {
    try {
      const timeoutMs =
        Number(process.env.DEEPSEEK_TIMEOUT_MS) ||
        (modelConfig.model === "deepseek-v4-pro" ? 15000 : 8000);
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(deepseekRequestPayload),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (response.ok) {
        const data = await response.json();
        const content: string = data?.choices?.[0]?.message?.content ?? "";
        reasoningScratchpad =
          data?.choices?.[0]?.message?.reasoning_content ?? undefined;
        usedLiveApi = true;

        if (effectiveBehavior === "AUTONOMOUS") {
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          const candidate = jsonMatch
            ? JSON.parse(jsonMatch[0])
            : JSON.parse(content);
          if (Array.isArray(candidate?.actionOrders)) {
            candidate.actionOrders = candidate.actionOrders
              .slice(0, 3)
              .map((o: any) => ({
                ...o,
                reasoning: String(o?.reasoning ?? "").slice(0, 100),
              }));
          }
          parsedOrders = AutonomousOrderSchema.parse(candidate);
        } else {
          const words = content.trim().split(/\s+/);
          advisorBriefing = words.slice(0, 150).join(" ");
        }
      }
    } catch {
      // Fall back to deterministic historical tactical synthesizer
    }
  }

  if (effectiveBehavior === "AUTONOMOUS" && !parsedOrders) {
    const synth = synthesizeDeterministicAutonomousOrders(
      contextPayload,
      roleType
    );
    parsedOrders = synth.orders;
    reasoningScratchpad = synth.reasoningScratchpad;
  }

  if (effectiveBehavior === "ADVISOR" && !advisorBriefing) {
    advisorBriefing = synthesizeDeterministicAdvisorBriefing(
      contextPayload,
      roleType
    );
  }

  const createdOrderRecords = [];
  if (effectiveBehavior === "AUTONOMOUS" && parsedOrders && persistOrders) {
    const game = await prisma.game.findUniqueOrThrow({
      where: { id: gameId },
    });

    // Persist or refresh multi-turn strategicObjective in FactionRole memory
    const existingObj = (contextPayload.strategicObjective ?? null) as {
      objectiveNodeId?: string;
      status?: string;
      targetDeadlineTurn?: number;
    } | null;

    if (
      !existingObj ||
      existingObj.status === "ACCOMPLISHED" ||
      (existingObj.targetDeadlineTurn &&
        existingObj.targetDeadlineTurn < game.turnNumber)
    ) {
      const firstOrderTarget =
        parsedOrders.actionOrders[0]?.targetNodeId ??
        parsedOrders.actionOrders[0]?.sourceNodeId ??
        contextPayload.controlledNodes[0]?.adjacentNodeIds[0] ??
        contextPayload.controlledNodes[0]?.id;

      if (firstOrderTarget) {
        await prisma.factionRole.updateMany({
          where: { factionId, roleType },
          data: {
            strategicObjective: {
              objectiveNodeId: firstOrderTarget,
              objectiveType:
                roleType === RoleType.MILITARY ? "CAPTURE" : "CONSOLIDATE",
              targetDeadlineTurn: game.turnNumber + 4,
              status: "IN_PROGRESS",
              campaignName: `${contextPayload.factionType} ${roleType} Operational Directive`,
            },
          },
        });
      }
    }

    for (const actionOrder of parsedOrders.actionOrders) {
      const saved = await prisma.order.create({
        data: {
          gameId,
          factionId,
          turnNumber: game.turnNumber,
          orderType: actionOrder.orderType,
          payload: actionOrder,
          submittedByRole: roleType,
          isExecuted: false,
        },
      });
      createdOrderRecords.push(saved);
    }
  }

  return {
    modelConfig,
    deepseekEndpoint: `${baseUrl}/chat/completions`,
    usedLiveApi,
    estimatedPromptTokens: promptBundle.estimatedPromptTokens,
    contextPayload,
    reasoningScratchpad,
    orders: parsedOrders,
    persistedOrderIds: createdOrderRecords.map((o) => o.id),
    advisorBriefing,
  };
}
