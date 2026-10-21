import { describe, it, expect, beforeAll, afterAll } from "vitest";
import prisma from "@/lib/prisma";
import { seedCampaignGame } from "@/prisma/seed";
import {
  AutonomousOrderSchema,
  getRoleContextPayload,
} from "@/engine/ai-agents/serializer";
import {
  getModelConfig,
  invokeRoleAIController,
} from "@/engine/ai-agents/controller";
import {
  BotBehavior,
  EventScope,
  FactionType,
  RoleType,
} from "@prisma/client";
import { recordAndReconcileEvent } from "@/engine/events/reconciler";

const TEST_GAME_ID = "test-phase4-ai-game";

describe("Phase 4: Token-Bounded AI Controller & Hybrid DeepSeek Model Router", () => {
  beforeAll(async () => {
    await seedCampaignGame(TEST_GAME_ID);
  });

  afterAll(async () => {
    await prisma.game.deleteMany({ where: { id: TEST_GAME_ID } });
  });

  it("routes Autonomous Executive roles exclusively to deepseek-v4-pro with thinking enabled and Military/Commercial/Advisor roles to deepseek-flash with thinking disabled", () => {
    // 1. Autonomous Executive -> deepseek-v4-pro + thinking enabled
    const execAuto = getModelConfig(RoleType.EXECUTIVE, BotBehavior.AUTONOMOUS);
    expect(execAuto.model).toBe("deepseek-v4-pro");
    expect(execAuto.extra_body).toEqual({ thinking: { type: "enabled" } });
    expect(execAuto.temperature).toBe(0.6);
    expect(execAuto.max_tokens).toBe(1500);

    // 2. Autonomous Military -> deepseek-flash + thinking disabled + json_object
    const milAuto = getModelConfig(RoleType.MILITARY, BotBehavior.AUTONOMOUS);
    expect(milAuto.model).toBe("deepseek-flash");
    expect(milAuto.extra_body).toEqual({ thinking: { type: "disabled" } });
    expect(milAuto.response_format).toEqual({ type: "json_object" });
    expect(milAuto.temperature).toBe(0.3);
    expect(milAuto.max_tokens).toBe(450);

    // 3. Autonomous Commercial -> deepseek-flash + thinking disabled + json_object
    const commAuto = getModelConfig(
      RoleType.DIPLOMATIC_COMMERCE,
      BotBehavior.AUTONOMOUS
    );
    expect(commAuto.model).toBe("deepseek-flash");
    expect(commAuto.extra_body).toEqual({ thinking: { type: "disabled" } });
    expect(commAuto.response_format).toEqual({ type: "json_object" });

    // 4. Advisor (even for Executive) -> deepseek-flash + thinking disabled + undefined response_format
    const execAdvisor = getModelConfig(RoleType.EXECUTIVE, BotBehavior.ADVISOR);
    expect(execAdvisor.model).toBe("deepseek-flash");
    expect(execAdvisor.extra_body).toEqual({ thinking: { type: "disabled" } });
    expect(execAdvisor.response_format).toBeUndefined();
    expect(execAdvisor.max_tokens).toBe(450);
  });

  it("caps recentActiveEvents at 6 in getRoleContextPayload and maintains O(1) token budget (<1,500 tokens)", async () => {
    const france = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.FRANCE },
    });

    // Insert 10 active events for France to test the hard take: 6 cap
    for (let i = 1; i <= 10; i++) {
      await recordAndReconcileEvent({
        gameId: TEST_GAME_ID,
        turn: i,
        category: "MILITARY",
        scope: EventScope.FACTION,
        factionIds: [france.id],
        title: `Frontier Skirmish Report #${i}`,
        description: `Canadian militia and allied scouts engaged British outposts during turn ${i}.`,
      });
    }

    const payload = await getRoleContextPayload(
      TEST_GAME_ID,
      france.id,
      RoleType.EXECUTIVE
    );

    expect(payload.recentActiveEvents.length).toBeLessThanOrEqual(6);
    expect(payload.recentActiveEvents[0]).toContain("[Turn 10]");
  });

  it("validates AutonomousOrderSchema and persists autonomous orders for Executive and Military roles", async () => {
    const france = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.FRANCE },
    });

    const execResult = await invokeRoleAIController({
      gameId: TEST_GAME_ID,
      factionId: france.id,
      roleType: RoleType.EXECUTIVE,
      behavior: BotBehavior.AUTONOMOUS,
      persistOrders: true,
    });

    expect(execResult.modelConfig.model).toBe("deepseek-v4-pro");
    expect(execResult.estimatedPromptTokens).toBeLessThan(1500);
    expect(execResult.orders).not.toBeNull();
    const parsedExec = AutonomousOrderSchema.parse(execResult.orders);
    expect(parsedExec.actionOrders.length).toBeGreaterThan(0);
    expect(parsedExec.actionOrders.length).toBeLessThanOrEqual(3);
    expect(execResult.persistedOrderIds.length).toBe(
      parsedExec.actionOrders.length
    );

    const milResult = await invokeRoleAIController({
      gameId: TEST_GAME_ID,
      factionId: france.id,
      roleType: RoleType.MILITARY,
      behavior: BotBehavior.AUTONOMOUS,
      persistOrders: true,
    });

    expect(milResult.modelConfig.model).toBe("deepseek-flash");
    const parsedMil = AutonomousOrderSchema.parse(milResult.orders);
    expect(parsedMil.actionOrders.length).toBeGreaterThan(0);
  });

  it("generates Advisor briefings under 150 words using deepseek-flash with thinking disabled", async () => {
    const gb = await prisma.faction.findFirstOrThrow({
      where: { gameId: TEST_GAME_ID, type: FactionType.GREAT_BRITAIN },
    });

    const advisorResult = await invokeRoleAIController({
      gameId: TEST_GAME_ID,
      factionId: gb.id,
      roleType: RoleType.MILITARY,
      behavior: BotBehavior.ADVISOR,
    });

    expect(advisorResult.modelConfig.model).toBe("deepseek-flash");
    expect(advisorResult.modelConfig.extra_body).toEqual({
      thinking: { type: "disabled" },
    });
    expect(advisorResult.advisorBriefing).toBeTruthy();

    const wordCount = advisorResult
      .advisorBriefing!.trim()
      .split(/\s+/).length;
    expect(wordCount).toBeLessThanOrEqual(150);
  });
});
