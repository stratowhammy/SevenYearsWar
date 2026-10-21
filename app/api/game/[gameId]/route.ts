import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { seedCampaignGame } from "@/prisma/seed";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  let game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      factions: {
        include: {
          roles: true,
          units: true,
          nodesControlled: true,
        },
        orderBy: { type: "asc" },
      },
      nodes: {
        include: {
          units: true,
          controller: true,
        },
      },
      events: {
        orderBy: { turnRecorded: "desc" },
      },
      orders: {
        orderBy: { turnNumber: "desc" },
      },
      dispatches: true,
    },
  });

  if (!game) {
    game = await seedCampaignGame(gameId);
  }

  return NextResponse.json(game);
}
