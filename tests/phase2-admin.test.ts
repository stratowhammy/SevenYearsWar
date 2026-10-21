import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "@/lib/prisma";
import { seedCampaignGame } from "@/prisma/seed";
import {
  toggleRoleControllerAction,
  setRoleBotBehaviorAction,
  updateRolePersonaAction,
  recalculateLedgersAction,
  injectOffMapEventAction,
  forceResolveTurnAction,
} from "@/app/admin/[gameId]/roles/actions";
import {
  BotBehavior,
  ControllerType,
  FactionType,
  RoleType,
} from "@prisma/client";

const TEST_GAME_ID = "test-phase2-admin-game";

describe("Phase 2: Admin Dashboard & Seating Controls Server Actions", () => {
  beforeAll(async () => {
    await seedCampaignGame(TEST_GAME_ID);
  });

  afterAll(async () => {
    await prisma.game.deleteMany({ where: { id: TEST_GAME_ID } });
  });

  it("toggles a role between HUMAN and COMPUTER and updates BotBehavior appropriately", async () => {
    const gbExec = await prisma.factionRole.findFirstOrThrow({
      where: {
        roleType: RoleType.EXECUTIVE,
        faction: { gameId: TEST_GAME_ID, type: FactionType.GREAT_BRITAIN },
      },
    });

    // Initially HUMAN + NONE
    expect(gbExec.controller).toBe(ControllerType.HUMAN);
    expect(gbExec.botBehavior).toBe(BotBehavior.NONE);

    // Toggle to COMPUTER -> defaults to AUTONOMOUS when transitioning from NONE
    const asComputer = await toggleRoleControllerAction(
      gbExec.id,
      ControllerType.COMPUTER
    );
    expect(asComputer.controller).toBe(ControllerType.COMPUTER);
    expect(asComputer.botBehavior).toBe(BotBehavior.AUTONOMOUS);

    // Set BotBehavior to ADVISOR
    const asAdvisor = await setRoleBotBehaviorAction(
      gbExec.id,
      BotBehavior.ADVISOR
    );
    expect(asAdvisor.controller).toBe(ControllerType.COMPUTER);
    expect(asAdvisor.botBehavior).toBe(BotBehavior.ADVISOR);

    // Toggle back to HUMAN -> resets BotBehavior to NONE
    const backToHuman = await toggleRoleControllerAction(
      gbExec.id,
      ControllerType.HUMAN
    );
    expect(backToHuman.controller).toBe(ControllerType.HUMAN);
    expect(backToHuman.botBehavior).toBe(BotBehavior.NONE);
  });

  it("saves custom persona prompts via updateRolePersonaAction", async () => {
    const germanExec = await prisma.factionRole.findFirstOrThrow({
      where: {
        roleType: RoleType.EXECUTIVE,
        faction: { gameId: TEST_GAME_ID, type: FactionType.GERMAN_STATES },
      },
    });

    const customPrompt =
      "Prussia-leaning; minimize naval expenditure; aggressively subsidize inland raids";
    const updated = await updateRolePersonaAction(
      germanExec.id,
      customPrompt,
      "gm_frederick_ii"
    );

    expect(updated.aiPersonaPrompt).toBe(customPrompt);
    expect(updated.assignedUserId).toBe("gm_frederick_ii");
  });

  it("executes Turn Control Panel overrides: Recalculate Ledgers, Inject Off-Map Event, and Force Resolve Turn", async () => {
    const ledgers = await recalculateLedgersAction(TEST_GAME_ID);
    expect(ledgers).toHaveLength(10);

    const injectedEvent = await injectOffMapEventAction(TEST_GAME_ID, {
      theater: "EUROPE",
      title: "Fall of Minorca to Marshal Richelieu",
      description:
        "Admiral Byng fails to relieve Port Mahon; British naval prestige shaken in the Mediterranean.",
      targetFactionType: FactionType.GREAT_BRITAIN,
      treasuryDelta: -15,
      unrestDelta: 5,
    });
    expect(injectedEvent.title).toContain("[EUROPE THEATER]");

    const resolved: any = await forceResolveTurnAction(TEST_GAME_ID);
    const nextTurn = resolved?.game?.turnNumber ?? resolved?.turnNumber;
    expect(nextTurn).toBeGreaterThanOrEqual(2);
  });
});
