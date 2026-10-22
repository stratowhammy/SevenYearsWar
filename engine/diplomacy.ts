import prisma from "@/lib/prisma";
import { EventStatus, FactionType } from "@prisma/client";

export type DiplomaticStance = "AT_WAR" | "ALLIED" | "AUXILIARY" | "NEUTRAL";

const PAIRWISE_1756_DEFAULTS: Array<{
  a: FactionType;
  b: FactionType;
  stance: DiplomaticStance;
}> = [
  // Anglo-French Imperial War
  { a: FactionType.GREAT_BRITAIN, b: FactionType.FRANCE, stance: "AT_WAR" },
  { a: FactionType.FRANCE, b: FactionType.GERMAN_STATES, stance: "AT_WAR" },
  {
    a: FactionType.GREAT_BRITAIN,
    b: FactionType.WESTERN_CONFEDERACY,
    stance: "AT_WAR",
  },
  {
    a: FactionType.GREAT_BRITAIN,
    b: FactionType.SEVEN_NATIONS,
    stance: "AT_WAR",
  },

  // Convention of Westminster & Anglo-Portuguese Coalition
  {
    a: FactionType.GREAT_BRITAIN,
    b: FactionType.GERMAN_STATES,
    stance: "ALLIED",
  },
  { a: FactionType.GREAT_BRITAIN, b: FactionType.PORTUGAL, stance: "ALLIED" },

  // Franco-Indigenous Alliances in New France & the Ohio Country
  { a: FactionType.FRANCE, b: FactionType.SEVEN_NATIONS, stance: "ALLIED" },
  {
    a: FactionType.FRANCE,
    b: FactionType.WESTERN_CONFEDERACY,
    stance: "ALLIED",
  },
  {
    a: FactionType.SEVEN_NATIONS,
    b: FactionType.WESTERN_CONFEDERACY,
    stance: "ALLIED",
  },
];

export function getBaseline1756Stance(
  typeA: FactionType,
  typeB: FactionType
): DiplomaticStance {
  if (typeA === typeB) return "ALLIED";
  for (const row of PAIRWISE_1756_DEFAULTS) {
    if (
      (row.a === typeA && row.b === typeB) ||
      (row.a === typeB && row.b === typeA)
    ) {
      return row.stance;
    }
  }
  return "NEUTRAL";
}

export async function getPairwiseDiplomaticStance(
  gameId: string,
  factionA: { id: string; type: FactionType },
  factionB: { id: string; type: FactionType }
): Promise<DiplomaticStance> {
  if (factionA.id === factionB.id || factionA.type === factionB.type) {
    return "ALLIED";
  }

  // Check active diplomatic events (TREATY or WAR_DECLARATION) between these two factions
  const latestDipEvent = await prisma.gameEvent.findFirst({
    where: {
      gameId,
      status: EventStatus.ACTIVE,
      category: { in: ["TREATY", "WAR_DECLARATION"] },
      factionIds: { hasEvery: [factionA.id, factionB.id] },
    },
    orderBy: { turnRecorded: "desc" },
  });

  if (latestDipEvent) {
    if (latestDipEvent.category === "TREATY") {
      return "NEUTRAL";
    }
    if (latestDipEvent.category === "WAR_DECLARATION") {
      return "AT_WAR";
    }
  }

  return getBaseline1756Stance(factionA.type, factionB.type);
}

export function clampUnrest(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function clampStanding(value: number): number {
  return Math.max(1, Math.min(10, Math.round(value)));
}

export function getFactionManpowerCap(factionType: FactionType): number {
  switch (factionType) {
    case FactionType.HAUDENOSAUNEE:
    case FactionType.SEVEN_NATIONS:
    case FactionType.WESTERN_CONFEDERACY:
    case FactionType.SOUTHEASTERN_NATIONS:
      return 5000;
    default:
      return 12000;
  }
}

export function isNavalUnitType(unitType: string): boolean {
  return unitType === "SHIP_OF_THE_LINE" || unitType === "MERCHANTMAN";
}

/**
 * Phase 7: Dynamic Peace Conference & Treaty Settlement Engine (Treaty of Paris 1763)
 * Triggers when primary combatants reach exhaustion (debt >= 300 or unrest >= 80) or Turn >= 25.
 */
export async function evaluateTreatyConference(gameId: string): Promise<{
  triggered: boolean;
  event?: any;
  treatySummary?: string;
}> {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: { factions: true },
  });
  if (!game || game.isPeaceTreatyConcluded) {
    return { triggered: false };
  }

  const gb = game.factions.find((f) => f.type === FactionType.GREAT_BRITAIN);
  const fr = game.factions.find((f) => f.type === FactionType.FRANCE);

  const shouldTrigger =
    game.turnNumber >= 25 ||
    (gb && fr && (gb.debt >= 300 || gb.unrestIndex >= 80) && (fr.debt >= 300 || fr.unrestIndex >= 80));

  if (!shouldTrigger) {
    return { triggered: false };
  }

  // 1. Write off 35% of outstanding European sovereign debt in debt restructuring
  const europeanFactions = game.factions.filter(
    (f) =>
      f.type === FactionType.GREAT_BRITAIN ||
      f.type === FactionType.FRANCE ||
      f.type === FactionType.GERMAN_STATES ||
      f.type === FactionType.SPAIN ||
      f.type === FactionType.PORTUGAL
  );

  for (const fac of europeanFactions) {
    const debtRelief = Math.round(fac.debt * 0.35);
    await prisma.faction.update({
      where: { id: fac.id },
      data: {
        debt: Math.max(0, fac.debt - debtRelief),
        unrestIndex: clampUnrest(fac.unrestIndex - 20),
        standingPoints: clampStanding(fac.standingPoints + 1),
      },
    });
  }

  // 2. Conclude peace treaty between Great Britain and France
  if (gb && fr) {
    await prisma.gameEvent.create({
      data: {
        gameId,
        turnRecorded: game.turnNumber,
        status: EventStatus.ACTIVE,
        scope: "GLOBAL",
        category: "TREATY",
        factionIds: [gb.id, fr.id],
        title: "1763 Treaty of Paris: Plenipotentiaries Conclude Imperial Settlement",
        description:
          "Exhausted by sovereign debt and colonial attrition, Great Britain, France, and Spain sign the Treaty of Paris, ratifying territorial boundaries and restructuring wartime debt.",
      },
    });
  }

  const summary = `1763 Treaty of Paris ratified: Warring European empires conclude peace, writing off 35% sovereign debt and stabilizing unrest.`;

  await prisma.game.update({
    where: { id: gameId },
    data: {
      isPeaceTreatyConcluded: true,
      treatyTerms: {
        ratifiedTurn: game.turnNumber,
        summary,
        debtReliefRatio: 0.35,
      },
    },
  });

  return { triggered: true, treatySummary: summary };
}

/**
 * Phase 7: Dynamic War Declaration between two factions
 */
export async function declareWarBetweenFactions(
  gameId: string,
  factionAId: string,
  factionBId: string,
  reason: string = "Diplomatic breakdown and boundary aggression"
) {
  const [fA, fB, game] = await Promise.all([
    prisma.faction.findUniqueOrThrow({ where: { id: factionAId } }),
    prisma.faction.findUniqueOrThrow({ where: { id: factionBId } }),
    prisma.game.findUniqueOrThrow({ where: { id: gameId } }),
  ]);

  return prisma.gameEvent.create({
    data: {
      gameId,
      turnRecorded: game.turnNumber,
      status: EventStatus.ACTIVE,
      scope: "THEATER",
      category: "WAR_DECLARATION",
      factionIds: [fA.id, fB.id],
      title: `War Declared: ${fA.type} vs. ${fB.type}`,
      description: `${fA.type} has issued a formal declaration of war against ${fB.type}. Cause: ${reason}.`,
    },
  });
}

/**
 * Phase 7: Historical Third Family Compact Escalation (1761-1762)
 * Automatically escalates Spain to AT_WAR with Great Britain if entering 1762 (Turn 24+)
 */
export async function evaluateFamilyCompactEscalation(
  gameId: string,
  currentTurn: number
): Promise<string | null> {
  if (currentTurn < 24) return null;

  const [spain, gb] = await Promise.all([
    prisma.faction.findFirst({
      where: { gameId, type: FactionType.SPAIN },
    }),
    prisma.faction.findFirst({
      where: { gameId, type: FactionType.GREAT_BRITAIN },
    }),
  ]);

  if (!spain || !gb) return null;

  const currentStance = await getPairwiseDiplomaticStance(gameId, spain, gb);
  if (currentStance === "NEUTRAL") {
    await declareWarBetweenFactions(
      gameId,
      spain.id,
      gb.id,
      "Bourbon Family Compact treaty activation following British Caribbean naval pressure"
    );
    return `Third Family Compact activated: SPAIN and GREAT_BRITAIN are now AT_WAR!`;
  }
  return null;
}

/**
 * Phase 7: Indigenous Boundary Covenant Violation Checker (Treaty of Easton / Proclamation Line)
 */
export async function checkCovenantViolation(
  gameId: string,
  factionId: string,
  targetNodeId: string
): Promise<{ violated: boolean; log?: string }> {
  const [actorFaction, node] = await Promise.all([
    prisma.faction.findUnique({ where: { id: factionId } }),
    prisma.mapNode.findUnique({ where: { id: targetNodeId } }),
  ]);

  if (!actorFaction || !node) return { violated: false };

  // Only European incursions into native-covenanted nodes trigger violations
  const isEuropean =
    actorFaction.type === FactionType.GREAT_BRITAIN ||
    actorFaction.type === FactionType.FRANCE ||
    actorFaction.type === FactionType.GERMAN_STATES ||
    actorFaction.type === FactionType.SPAIN;

  if (!isEuropean) return { violated: false };

  // Check if any native confederacy has covenanted this node
  const nativeFactions = await prisma.faction.findMany({
    where: {
      gameId,
      type: {
        in: [
          FactionType.HAUDENOSAUNEE,
          FactionType.WESTERN_CONFEDERACY,
          FactionType.SOUTHEASTERN_NATIONS,
        ],
      },
    },
  });

  const protectingFaction = nativeFactions.find((nf) =>
    nf.covenantBoundaries.includes(node.id)
  );

  if (!protectingFaction) return { violated: false };

  // Apply unrest penalty to European offender
  await prisma.faction.update({
    where: { id: actorFaction.id },
    data: { unrestIndex: clampUnrest(actorFaction.unrestIndex + 12) },
  });

  // Rally native defense war party
  const nativeUnit = await prisma.unit.findFirst({
    where: { factionId: protectingFaction.id, nodeId: node.id },
  });

  if (nativeUnit) {
    await prisma.unit.update({
      where: { id: nativeUnit.id },
      data: { strength: { increment: 500 } },
    });
  } else {
    await prisma.unit.create({
      data: {
        factionId: protectingFaction.id,
        nodeId: node.id,
        unitType: "NATIVE_WAR_PARTY",
        strength: 500,
        discipline: 1.1,
        isAcclimatized: true,
      },
    });
  }

  const log = `[Covenant Violation] ${actorFaction.type} encroached upon covenanted frontier node ${node.name}! ${protectingFaction.type} rallied 500 warriors and colonial unrest rose +12.`;
  return { violated: true, log };
}
