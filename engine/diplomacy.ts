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
