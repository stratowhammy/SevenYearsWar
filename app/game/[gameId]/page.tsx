import React from "react";
import prisma from "@/lib/prisma";
import { seedCampaignGame } from "@/prisma/seed";
import WarRoomClient from "./WarRoomClient";

export const dynamic = "force-dynamic";

export default async function GameWarRoomPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
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

  return <WarRoomClient initialGame={game} />;
}
