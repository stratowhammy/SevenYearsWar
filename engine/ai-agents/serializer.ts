import { EventScope, EventStatus, RoleType } from "@prisma/client";
import prisma from "@/lib/prisma";
import { z } from "zod";

export const AutonomousOrderSchema = z.object({
  actionOrders: z
    .array(
      z.object({
        orderType: z.enum([
          "MOVE",
          "RECRUIT",
          "EXTRACT",
          "TRADE",
          "SUBSIDIZE",
          "RAID",
        ]),
        sourceNodeId: z.string(),
        targetNodeId: z.string().optional(),
        unitIds: z.array(z.string()).optional(),
        allocatedTreasury: z.number().default(0),
        reasoning: z.string().max(100),
      })
    )
    .max(3),
});

export type AutonomousOrderPayload = z.infer<typeof AutonomousOrderSchema>;

export async function getRoleContextPayload(
  gameId: string,
  factionId: string,
  role: string
) {
  const [faction, allNodes, activeEvents] = await Promise.all([
    prisma.faction.findUnique({
      where: { id: factionId },
      include: {
        roles: true,
        nodesControlled: true,
        units: { include: { node: true } },
      },
    }),
    prisma.mapNode.findMany({
      where: { gameId },
      include: { controller: true },
    }),
    // Fetch only ACTIVE, relevant events (Hard take: 6 upper limit guarantees O(1) token consumption)
    prisma.gameEvent.findMany({
      where: {
        gameId,
        status: EventStatus.ACTIVE,
        OR: [{ factionIds: { has: factionId } }, { scope: EventScope.GLOBAL }],
      },
      orderBy: { turnRecorded: "desc" },
      take: 6,
    }),
  ]);

  const nodeLookup = new Map(
    allNodes.map((n) => [
      n.id,
      {
        id: n.id,
        name: n.name,
        nodeType: n.nodeType,
        region: n.region,
        owner: n.controller?.type ?? "NEUTRAL",
      },
    ])
  );

  const matchingRole = faction?.roles.find((r) => r.roleType === role);

  return {
    factionId,
    factionType: faction?.type,
    role,
    roleTitle: matchingRole?.title ?? role,
    personaPrompt:
      matchingRole?.aiPersonaPrompt ??
      "Act according to 1756 historical strategic priorities.",
    factionState: {
      treasury: faction?.treasury,
      debt: faction?.debt,
      unrest: faction?.unrestIndex,
      points: faction?.standingPoints,
    },
    controlledNodes:
      faction?.nodesControlled.map((n) => ({
        id: n.id,
        name: n.name,
        nodeType: n.nodeType,
        resourceType: n.resourceType,
        yield: n.resourceYield,
        adjacentNodeIds: n.adjacentNodeIds.slice(0, 4),
        adjacentNodes: n.adjacentNodeIds.slice(0, 3).map((adjId) => {
          const adj = nodeLookup.get(adjId);
          return {
            id: adjId,
            name: adj?.name ?? adjId,
            nodeType: adj?.nodeType ?? "TERRESTRIAL",
            owner: adj?.owner ?? "NEUTRAL",
          };
        }),
      })) ?? [],
    activeUnits:
      faction?.units.map((u) => ({
        id: u.id,
        type: u.unitType,
        strength: u.strength,
        nodeId: u.nodeId,
        location: u.node.name,
        adjacentNodeIds: u.node.adjacentNodeIds.slice(0, 3),
      })) ?? [],
    recentActiveEvents: activeEvents.map(
      (e) => `[Turn ${e.turnRecorded}] ${e.title}: ${e.description}`
    ),
  };
}

export function estimateTokenCount(text: string): number {
  // Standard ~4 chars per token approximation for English + JSON
  return Math.ceil(text.length / 4);
}

export function buildBoundedPromptMessages(
  contextPayload: Awaited<ReturnType<typeof getRoleContextPayload>>,
  roleType: RoleType,
  behavior: "ADVISOR" | "AUTONOMOUS"
) {
  const systemInstruction =
    behavior === "AUTONOMOUS"
      ? `You are the ${contextPayload.roleTitle} (${roleType}) for ${contextPayload.factionType} in the 1756 Seven Years' War Simulator.
Doctrine: ${contextPayload.personaPrompt}
Keep internal reasoning brief (<250 words) and output strictly valid JSON matching AutonomousOrderSchema: { "actionOrders": [{ "orderType": "MOVE"|"RECRUIT"|"EXTRACT"|"TRADE"|"SUBSIDIZE"|"RAID", "sourceNodeId": string, "targetNodeId"?: string, "unitIds"?: string[], "allocatedTreasury": number, "reasoning": string (<=100 chars) }] } (max 3 orders). Choose targetNodeId from adjacentNodes.`
      : `You are the ${contextPayload.roleTitle} (${roleType} Advisor) for ${contextPayload.factionType} in the 1756 Seven Years' War Simulator.
Doctrine: ${contextPayload.personaPrompt}
Write a concise strategic briefing of AT MOST 150 words analyzing the top active events, treasury/unrest balance, and recommended next priorities.`;

  const serializedContext = JSON.stringify({
    factionState: contextPayload.factionState,
    controlledNodes: contextPayload.controlledNodes.slice(0, 5),
    activeUnits: contextPayload.activeUnits.slice(0, 5),
    recentActiveEvents: contextPayload.recentActiveEvents,
  });

  const messages = [
    { role: "system" as const, content: systemInstruction },
    { role: "user" as const, content: serializedContext },
  ];

  const totalTokens = estimateTokenCount(
    systemInstruction + "\n" + serializedContext
  );

  return {
    messages,
    estimatedPromptTokens: totalTokens,
  };
}
