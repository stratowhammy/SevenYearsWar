import React from "react";
import prisma from "@/lib/prisma";
import { seedCampaignGame } from "@/prisma/seed";
import AdminRolesClient from "./AdminRolesClient";

export const dynamic = "force-dynamic";

export default async function AdminRolesPage({
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
        },
        orderBy: { type: "asc" },
      },
    },
  });

  if (!game) {
    game = await seedCampaignGame(gameId);
  }

  return (
    <AdminRolesClient
      game={{
        id: game.id,
        name: game.name,
        currentYear: game.currentYear,
        currentSeason: game.currentSeason,
        currentPhase: game.currentPhase,
        turnNumber: game.turnNumber,
        offMapModifiers: game.offMapModifiers,
      }}
      initialFactions={game.factions}
    />
  );
}
