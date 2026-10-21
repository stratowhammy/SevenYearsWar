import { NextRequest, NextResponse } from "next/server";
import { RoleType, BotBehavior } from "@prisma/client";
import {
  getModelConfig,
  invokeRoleAIController,
} from "@/engine/ai-agents/controller";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roleType =
    (searchParams.get("roleType") as RoleType) || RoleType.EXECUTIVE;
  const behavior =
    (searchParams.get("behavior") as BotBehavior) || BotBehavior.AUTONOMOUS;

  return NextResponse.json(getModelConfig(roleType, behavior));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      gameId,
      factionId,
      roleType,
      behavior,
      persistOrders = true,
    } = body as {
      gameId: string;
      factionId: string;
      roleType: RoleType;
      behavior: BotBehavior;
      persistOrders?: boolean;
    };

    if (!gameId || !factionId || !roleType || !behavior) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: gameId, factionId, roleType, behavior",
        },
        { status: 400 }
      );
    }

    const result = await invokeRoleAIController({
      gameId,
      factionId,
      roleType,
      behavior,
      persistOrders,
    });

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to execute AI controller" },
      { status: 500 }
    );
  }
}
