import { NextRequest, NextResponse } from "next/server";
import {
  STORY_ARBITERS,
  selectActiveStoryArbiter,
  arbitrateContestedAssault,
  arbitrateFrontierRaid,
  arbitrateAssemblyNegotiation,
} from "@/engine/ai-arbiters/story-arbiters";
import prisma from "@/lib/prisma";
import { FactionType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const turnNumber = parseInt(searchParams.get("turnNumber") || "1", 10);
  const category = (searchParams.get("category") || "SIEGE") as
    | "SIEGE"
    | "RAID"
    | "ASSEMBLY"
    | "DIPLOMACY"
    | "FOG_OF_WAR";
  const attackerFaction = searchParams.get("attackerFaction") as
    | FactionType
    | undefined;
  const defenderFaction = searchParams.get("defenderFaction") as
    | FactionType
    | undefined;

  const activeArbiter = selectActiveStoryArbiter(
    turnNumber,
    category,
    attackerFaction,
    defenderFaction
  );

  return NextResponse.json({
    activeArbiter,
    allArbiters: STORY_ARBITERS,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      gameId,
      turnNumber = 1,
      season = "Summer",
      year = 1758,
      nodeId,
      attackerFactionId,
      defenderFactionId,
      allocatedSpend = 0,
    } = body;

    if (!gameId) {
      return NextResponse.json(
        { error: "Missing required parameter: gameId" },
        { status: 400 }
      );
    }

    if (action === "ARBITRATE_ASSAULT") {
      const node = await prisma.mapNode.findUniqueOrThrow({
        where: { id: nodeId },
        include: { units: true, controller: true },
      });
      const attackerFaction = await prisma.faction.findUniqueOrThrow({
        where: { id: attackerFactionId },
        include: { units: true },
      });
      const defenderFaction = node.controller;

      const movingUnits = attackerFaction.units.slice(0, 2);
      const defenderUnits = node.units;

      const baseAttackPower = movingUnits.reduce(
        (s, u) => s + u.strength * u.discipline,
        0
      );
      const baseDefensePower = defenderUnits.reduce(
        (s, u) => s + u.strength * u.discipline,
        0
      );

      const ruling = await arbitrateContestedAssault({
        gameId,
        turnNumber,
        season,
        year,
        targetNode: node,
        attackerFaction,
        defenderFaction,
        movingUnits,
        defenderUnits,
        baseAttackPower,
        baseDefensePower,
      });

      return NextResponse.json({ ruling });
    }

    if (action === "ARBITRATE_RAID") {
      const node = await prisma.mapNode.findUniqueOrThrow({
        where: { id: nodeId },
        include: { controller: true },
      });
      const raidingFaction = await prisma.faction.findUniqueOrThrow({
        where: { id: attackerFactionId },
      });
      const targetFaction = node.controller ?? raidingFaction;

      const ruling = await arbitrateFrontierRaid({
        gameId,
        turnNumber,
        season,
        year,
        sourceNode: node,
        targetNode: node,
        raidingFaction,
        targetFaction,
      });

      return NextResponse.json({ ruling });
    }

    if (action === "ARBITRATE_ASSEMBLY") {
      const faction = await prisma.faction.findUniqueOrThrow({
        where: { id: attackerFactionId },
      });

      const ruling = await arbitrateAssemblyNegotiation({
        gameId,
        turnNumber,
        season,
        year,
        faction,
        allocatedSpend,
      });

      return NextResponse.json({ ruling });
    }

    return NextResponse.json(
      { error: `Unknown arbitration action: ${action}` },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to execute story arbitration" },
      { status: 500 }
    );
  }
}
