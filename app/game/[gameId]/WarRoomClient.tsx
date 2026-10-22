"use client";

import React, { useState, useTransition, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  BotBehavior,
  EventStatus,
  FactionType,
  Phase,
  RoleType,
} from "@prisma/client";
import { useWarRoomStore } from "@/store/useWarRoomStore";
import {
  submitPlayerOrderAction,
  sendCourierDispatchAction,
  advanceSinglePhaseAction,
  executeFullTurnCycleAction,
  requestAIControllerAction,
  signPeaceTreatyAction,
} from "./actions";
import {
  Compass,
  Shield,
  Send,
  Sparkles,
  ScrollText,
  Sliders,
  Play,
  FastForward,
  Globe,
  Coins,
  Flame,
  Award,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Swords,
  Anchor,
  Landmark,
  Wheat,
  ShieldAlert,
  Zap,
  Crosshair,
  Users,
  Flag,
  ShieldCheck,
  HelpCircle,
  Target,
  Circle,
  Sun,
  Moon,
} from "lucide-react";
import DashboardTourGuide from "@/components/dashboard/DashboardTourGuide";
import {
  getCharacterRoleGuide,
  evaluateCharacterObjectives,
} from "@/lib/character-objectives";

const DynamicMapViewer = dynamic(
  () => import("@/components/map/MapViewer"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[560px] rounded-2xl bg-[#162544] border-2 border-amber-600/60 flex items-center justify-center text-amber-100 text-sm font-serif shadow-xl">
        Unrolling 1756 Americas &amp; Caribbean Strategic Chart...
      </div>
    ),
  }
);

interface WarRoomClientProps {
  initialGame: any;
}

const PHASES: Phase[] = [
  Phase.INTEL_DISPATCH,
  Phase.DIPLOMATIC_TRADE,
  Phase.ORDER_SUBMISSION,
  Phase.RESOLUTION,
];

export default function WarRoomClient({ initialGame }: WarRoomClientProps) {
  const [game, setGame] = useState(initialGame);
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<any | null>(null);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<"parchment" | "admiralty">(
    "parchment"
  );

  const isDark = themeMode === "admiralty";

  const {
    selectedNodeId,
    selectedFactionType,
    selectedRoleType,
    activeTab,
    showSeaPolygons,
    showSeasonalEdges,
    setSelectedNodeId,
    setSelectedFactionType,
    setSelectedRoleType,
    setActiveTab,
    toggleSeaPolygons,
    toggleSeasonalEdges,
  } = useWarRoomStore();

  const activeFaction = useMemo(
    () =>
      game.factions.find((f: any) => f.type === selectedFactionType) ??
      game.factions[0],
    [game.factions, selectedFactionType]
  );

  const activeRole = useMemo(
    () =>
      activeFaction?.roles.find((r: any) => r.roleType === selectedRoleType) ??
      activeFaction?.roles[0],
    [activeFaction, selectedRoleType]
  );

  const activeCharacterGuide = useMemo(() => {
    const fType = (activeFaction?.type ??
      FactionType.GREAT_BRITAIN) as FactionType;
    const rType = (activeRole?.roleType ?? RoleType.EXECUTIVE) as RoleType;
    return getCharacterRoleGuide(fType, rType);
  }, [activeFaction?.type, activeRole?.roleType]);

  const roleEvalResult = useMemo(() => {
    if (!activeFaction) {
      return {
        earnedVP: 0,
        totalRoleVP: activeCharacterGuide.totalRoleVP,
        evaluatedObjectives: [],
      };
    }
    return evaluateCharacterObjectives(
      activeCharacterGuide,
      game,
      activeFaction
    );
  }, [game, activeFaction, activeCharacterGuide]);

  const evaluatedCharacterObjectives = roleEvalResult.evaluatedObjectives;
  const earnedRoleVP = roleEvalResult.earnedVP;

  const earnedFactionVP = useMemo(() => {
    if (!activeFaction) return 0;
    const roles: RoleType[] = [
      RoleType.EXECUTIVE,
      RoleType.MILITARY,
      RoleType.DIPLOMATIC_COMMERCE,
    ];
    return roles.reduce((total, rType) => {
      const g = getCharacterRoleGuide(
        activeFaction.type as FactionType,
        rType
      );
      const res = evaluateCharacterObjectives(g, game, activeFaction);
      return total + res.earnedVP;
    }, 0);
  }, [game, activeFaction]);

  const selectedNode = useMemo(
    () =>
      game.nodes.find((n: any) => n.id === selectedNodeId) ??
      activeFaction?.nodesControlled?.[0] ??
      game.nodes[0],
    [game.nodes, selectedNodeId, activeFaction]
  );

  const adjacentNodes = useMemo(() => {
    if (!selectedNode?.adjacentNodeIds) return [];
    return game.nodes.filter((n: any) =>
      selectedNode.adjacentNodeIds.includes(n.id)
    );
  }, [game.nodes, selectedNode]);

  // Order submission form state
  const [orderType, setOrderType] = useState<
    | "MOVE"
    | "RECRUIT"
    | "EXTRACT"
    | "TRADE"
    | "SUBSIDIZE"
    | "RAID"
    | "AMPHIBIOUS_ASSAULT"
    | "DECLARE_WAR"
    | "ASSEMBLY_NEGOTIATION"
    | "COVENANT_BOUNDARY"
    | "TREATY_CONFERENCE"
  >("MOVE");
  const [targetNodeId, setTargetNodeId] = useState<string>("");
  const [allocatedTreasury, setAllocatedTreasury] = useState<number>(15);
  const [reasoning, setReasoning] = useState<string>(
    "Secure strategic river portage before winter freeze."
  );
  const [combatLogs, setCombatLogs] = useState<string[]>([]);
  const [feedFilter, setFeedFilter] = useState<
    "ALL" | "WEATHER" | "NAVAL" | "COMBAT" | "DIPLOMACY"
  >("ALL");

  const filteredCombatLogs = useMemo(() => {
    if (feedFilter === "ALL") return combatLogs;
    if (feedFilter === "WEATHER") {
      return combatLogs.filter(
        (l) => l.includes("[Winter Freeze]") || l.includes("[Hurricane]")
      );
    }
    if (feedFilter === "NAVAL") {
      return combatLogs.filter(
        (l) =>
          l.includes("[Naval Blockade]") ||
          l.includes("[Naval Interception]") ||
          l.includes("[Amphibious Assault]") ||
          l.toLowerCase().includes("fleet")
      );
    }
    if (feedFilter === "COMBAT") {
      return combatLogs.filter(
        (l) =>
          l.includes("[Casualties]") ||
          l.includes("[Field Engagement]") ||
          l.includes("[Frontier Raid]") ||
          l.includes("[Covenant Violation]")
      );
    }
    if (feedFilter === "DIPLOMACY") {
      return combatLogs.filter(
        (l) =>
          l.includes("[Treaty]") ||
          l.includes("[Declaration of War]") ||
          l.includes("[Assembly]") ||
          l.includes("[Covenant]")
      );
    }
    return combatLogs;
  }, [combatLogs, feedFilter]);

  const handleQuickAction = (actionType: typeof orderType) => {
    if (!selectedNode) return;
    setOrderType(actionType);
    setActiveTab("ORDERS");
    if (actionType === "MOVE" || actionType === "RAID") {
      const firstAdj = adjacentNodes[0];
      if (firstAdj) {
        setTargetNodeId(firstAdj.id);
        setReasoning(
          `Advance forces from ${selectedNode.name} to ${firstAdj.name}`
        );
      }
    } else if (actionType === "RECRUIT") {
      setTargetNodeId(selectedNode.id);
      setReasoning(`Muster provincial units at ${selectedNode.name}`);
      setAllocatedTreasury(20);
    } else if (actionType === "EXTRACT") {
      setTargetNodeId(selectedNode.id);
      setReasoning(`Extract colonial yields at ${selectedNode.name}`);
      setAllocatedTreasury(0);
    } else if (actionType === "COVENANT_BOUNDARY") {
      setTargetNodeId(selectedNode.id);
      setReasoning(
        `Proclaim boundary covenant guaranteeing ${selectedNode.name}`
      );
      setAllocatedTreasury(10);
    } else if (actionType === "AMPHIBIOUS_ASSAULT") {
      const seaTarget =
        adjacentNodes.find((n: any) => n.nodeType === "SEA_ZONE") ||
        adjacentNodes[0];
      if (seaTarget) setTargetNodeId(seaTarget.id);
      setReasoning(
        `Amphibious naval landing & bombardment against ${selectedNode.name}`
      );
      setAllocatedTreasury(25);
    } else if (actionType === "ASSEMBLY_NEGOTIATION") {
      setTargetNodeId(selectedNode.id);
      setReasoning(
        `Negotiate provincial war supply appropriation with assembly`
      );
      setAllocatedTreasury(15);
    }
  };

  const covenantedNodeIds = useMemo(() => {
    const ids: string[] = [];
    for (const f of game.factions ?? []) {
      if (Array.isArray(f.covenantBoundaries)) {
        ids.push(...f.covenantBoundaries);
      }
    }
    return Array.from(new Set(ids));
  }, [game.factions]);

  // Courier dispatch form state
  const [dispatchTargetFactionId, setDispatchTargetFactionId] =
    useState<string>(game.factions[1]?.id ?? "");
  const [dispatchDelay, setDispatchDelay] = useState<number>(1);
  const [dispatchContent, setDispatchContent] = useState<string>(
    "Secret Covenant Proposal: Mutual convoy protection and powder subsidies in the Ohio Valley."
  );

  const refreshPageData = async () => {
    const res = await fetch(`/api/game/${game.id}`);
    if (res.ok) {
      const updated = await res.json();
      setGame(updated);
    }
  };

  const handleAdvancePhase = () => {
    startTransition(async () => {
      const res: any = await advanceSinglePhaseAction(game.id);
      if (Array.isArray(res?.combatLogs) && res.combatLogs.length > 0) {
        setCombatLogs(res.combatLogs);
      }
      await refreshPageData();
      setToast(
        `Completed Phase ${res.phaseExecuted} -> Now in ${res.nextPhase}.`
      );
    });
  };

  const handleExecuteFullTurn = () => {
    startTransition(async () => {
      const res: any = await executeFullTurnCycleAction(game.id);
      const resolutionStep = res?.phaseResults?.find(
        (p: any) => p.phaseExecuted === "RESOLUTION"
      );
      if (
        Array.isArray(resolutionStep?.combatLogs) &&
        resolutionStep.combatLogs.length > 0
      ) {
        setCombatLogs(resolutionStep.combatLogs);
      }
      await refreshPageData();
      setToast(
        `Resolved Turn ${res.completedTurn}! Campaign advanced to Turn ${res.newTurn} (${res.season} ${res.year}).`
      );
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPending) return;
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (e.key === "n" || e.key === "N") {
        e.preventDefault();
        handleAdvancePhase();
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        handleExecuteFullTurn();
      } else if (e.key === "?" || e.key === "h" || e.key === "H") {
        e.preventDefault();
        setIsTourOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [game.id, isPending]);

  const handleSubmitOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFaction || !selectedNode) return;
    startTransition(async () => {
      await submitPlayerOrderAction({
        gameId: game.id,
        factionId: activeFaction.id,
        submittedByRole: selectedRoleType,
        orderType,
        sourceNodeId: selectedNode.id,
        targetNodeId:
          targetNodeId || selectedNode.adjacentNodeIds?.[0] || selectedNode.id,
        unitIds: selectedNode.units
          ?.filter((u: any) => u.factionId === activeFaction.id)
          .map((u: any) => u.id),
        allocatedTreasury,
        reasoning,
      });
      await refreshPageData();
      setToast(
        `Submitted ${orderType} order from ${selectedNode.name} (${selectedRoleType}).`
      );
    });
  };

  const handleSendDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFaction || !dispatchTargetFactionId) return;
    startTransition(async () => {
      await sendCourierDispatchAction({
        gameId: game.id,
        senderFactionId: activeFaction.id,
        targetFactionId: dispatchTargetFactionId,
        content: dispatchContent,
        courierDelay: dispatchDelay,
      });
      await refreshPageData();
      setToast(
        `Courier packet dispatched (Delay: ${dispatchDelay} turn${
          dispatchDelay > 1 ? "s" : ""
        }).`
      );
    });
  };

  const handleInvokeAI = (behavior: BotBehavior) => {
    if (!activeFaction) return;
    startTransition(async () => {
      const res = await requestAIControllerAction({
        gameId: game.id,
        factionId: activeFaction.id,
        roleType: selectedRoleType,
        behavior,
      });
      setAiResponse(res);
      await refreshPageData();
      setToast(
        `Invoked ${res.modelConfig.model} (${behavior}) — Prompt Budget: ${res.estimatedPromptTokens} tokens.`
      );
    });
  };

  const handleSignTreaty = () => {
    if (!activeFaction || !dispatchTargetFactionId) return;
    startTransition(async () => {
      const targetFac = game.factions.find(
        (f: any) => f.id === dispatchTargetFactionId
      );
      await signPeaceTreatyAction({
        gameId: game.id,
        factionAId: activeFaction.id,
        factionBId: dispatchTargetFactionId,
        treatyTitle: `Treaty of Amity (${activeFaction.type} & ${
          targetFac?.type ?? "Ally"
        })`,
        treatyDescription:
          "Formal cessation of hostilities and mutual recognition of frontier posts; supersedes prior war declarations.",
      });
      await refreshPageData();
      setToast(
        "Treaty recorded! Prior WAR_DECLARATION events between parties deterministically marked SUPERSEDED."
      );
    });
  };

  const offMap = (game.offMapModifiers ?? {}) as Record<string, any>;

  const cardClass = isDark ? "syw-card-dark" : "syw-card";
  const subcardClass = isDark ? "syw-subcard-dark" : "syw-subcard";
  const ledgerStatClass = isDark ? "syw-ledger-stat-dark" : "syw-ledger-stat";
  const selectClass = isDark ? "syw-select-dark" : "syw-select";
  const inputClass = isDark ? "syw-input-dark" : "syw-input";

  return (
    <div className={isDark ? "syw-shell-dark" : "syw-shell"}>
      {/* Top Royal Admiralty & Parchment Command Header */}
      <header id="tour-header-stepper" className="syw-header">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-400/70 text-amber-300 shadow-inner">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg md:text-xl font-serif font-bold text-amber-50 tracking-wide">
                  {game.name}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500 text-slate-950 shadow-xs">
                  Turn {game.turnNumber} • {game.currentSeason}{" "}
                  {game.currentYear}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/50">
                  Role VP: {earnedRoleVP}/{activeCharacterGuide.totalRoleVP} •
                  Nation VP: {earnedFactionVP}/30
                </span>
              </div>
              <p className="text-xs text-amber-200/80 font-medium">
                1756 Seven Years&apos; War Simulator • Playing as{" "}
                <strong className="text-amber-100">
                  {activeCharacterGuide.roleTitle} (
                  {activeCharacterGuide.factionDisplayName})
                </strong>
              </p>
            </div>
          </div>

          {/* 4-Phase Turn Loop Stepper & Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="hidden xl:flex items-center gap-1 bg-slate-950/90 px-3 py-1.5 rounded-xl border border-amber-500/30">
              {PHASES.map((p, idx) => {
                const isActive = game.currentPhase === p;
                return (
                  <React.Fragment key={p}>
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-md ${
                        isActive
                          ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                          : "text-slate-400"
                      }`}
                    >
                      {idx + 1}. {p}
                    </span>
                    {idx < PHASES.length - 1 && (
                      <span className="text-slate-600 text-xs">→</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() =>
                setThemeMode((prev) =>
                  prev === "parchment" ? "admiralty" : "parchment"
                )
              }
              className="syw-btn-secondary"
              title="Switch between Imperial Parchment and Admiralty Night themes"
            >
              {isDark ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-300" /> Parchment Theme
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-amber-300" /> Admiralty Night
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={handleAdvancePhase}
              data-testid="warroom-advance-phase"
              className="syw-btn-secondary"
              title="Advance to next phase (Shortcut: N)"
            >
              <Play className="w-3.5 h-3.5" /> Next Phase
              <span className="text-[10px] font-mono text-amber-300 bg-slate-950 px-1.5 py-0.2 rounded border border-slate-700">
                N
              </span>
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={handleExecuteFullTurn}
              data-testid="warroom-resolve-turn"
              className="syw-btn-primary"
              title="Resolve entire turn cycle (Shortcut: R)"
            >
              <FastForward className="w-3.5 h-3.5" /> Resolve Full Turn
              <span className="text-[10px] font-mono text-slate-950 bg-amber-200 px-1.5 py-0.2 rounded font-bold">
                R
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsTourOpen(true)}
              data-testid="btn-dashboard-tour"
              className="syw-btn-guide"
              title="Interactive Player Guide & Character Victory Points (Shortcut: ?)"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
              <span>Player Guide &amp; VPs</span>
              <span className="text-[10px] font-mono text-amber-100 bg-red-950 px-1.5 py-0.2 rounded border border-amber-400/50">
                ?
              </span>
            </button>

            <Link
              href={`/admin/${game.id}/roles`}
              data-testid="link-admin-roles"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-900 hover:bg-indigo-800 text-indigo-100 border border-indigo-400/50 transition shadow-sm"
            >
              <Sliders className="w-3.5 h-3.5" /> Admin Role Seating (30 Seats)
            </Link>
          </div>
        </div>
      </header>

      {/* Off-Map Theater Abstractor Telemetry Ribbon */}
      <div id="tour-offmap-ribbon" className="syw-ribbon">
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="syw-ribbon-pill">
            <Globe className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300">
                Europe Theater:{" "}
              </span>
              <span className="text-slate-200">
                {offMap?.europeTheater?.status ?? "ACTIVE"} (GB Drain: -
                {offMap?.europeTheater?.britishSubsidyDrain ?? 20}£, FR Drain: -
                {offMap?.europeTheater?.frenchContinentalDrain ?? 25}£)
              </span>
            </div>
          </div>
          <div className="syw-ribbon-pill">
            <Globe className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-300">
                India Theater:{" "}
              </span>
              <span className="text-slate-200">
                {offMap?.indiaTheater?.status ?? "CARNATIC_STANDOFF"} (EIC: +
                {offMap?.indiaTheater?.britishEastIndiaRevenue ?? 15}£, French
                Indies: +{offMap?.indiaTheater?.frenchCompagnieRevenue ?? 10}£)
              </span>
            </div>
          </div>
          <div className="syw-ribbon-pill">
            <Globe className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-cyan-300">
                West Africa &amp; Atlantic:{" "}
              </span>
              <span className="text-slate-200">
                Dutch Neutral Freight Bonus: +
                {offMap?.westAfricaTheater?.dutchNeutralFreightBonus ?? 12}£
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Prominent Player Character Mission & Victory Point Scoreboard Banner */}
      <section className="max-w-[1600px] w-full mx-auto px-6 pt-5">
        <div
          className={
            isDark ? "syw-character-banner-dark" : "syw-character-banner"
          }
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-amber-800/20">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold uppercase bg-[#121e36] text-amber-300 border border-amber-500/50">
                  {activeCharacterGuide.factionDisplayName} •{" "}
                  {activeCharacterGuide.roleType}
                </span>
                <h2
                  className={`text-base md:text-lg font-serif font-bold ${
                    isDark ? "text-amber-100" : "text-slate-900"
                  }`}
                >
                  Your Character: {activeCharacterGuide.roleTitle} —{" "}
                  <span
                    className={isDark ? "text-amber-300" : "text-amber-900"}
                  >
                    {activeCharacterGuide.characterPersonaName}
                  </span>
                </h2>
              </div>
              <p
                className={`text-xs leading-relaxed max-w-4xl ${
                  isDark ? "text-slate-300" : "text-slate-700"
                }`}
              >
                {activeCharacterGuide.playerBriefing}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <div className="px-3.5 py-2 rounded-xl bg-[#121e36] text-amber-50 border border-amber-500/60 shadow-sm text-right">
                <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300">
                  Your Seat Victory Points
                </div>
                <div className="text-base font-mono font-bold text-amber-400">
                  {earnedRoleVP} / {activeCharacterGuide.totalRoleVP} VP{" "}
                  <span className="text-xs text-slate-300 font-normal">
                    (Nation: {earnedFactionVP}/30 VP)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 3 Character Objectives Horizontal Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
            {evaluatedCharacterObjectives.map((obj, idx) => (
              <div
                key={obj.id}
                className={
                  obj.isCompleted
                    ? "syw-objective-card-completed"
                    : isDark
                    ? "syw-objective-card-dark"
                    : "syw-objective-card"
                }
              >
                <div className="space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {obj.isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Target className="w-4 h-4 text-amber-700 shrink-0" />
                      )}
                      <span
                        className={`text-xs font-serif font-bold ${
                          isDark && !obj.isCompleted
                            ? "text-amber-100"
                            : "text-slate-900"
                        }`}
                      >
                        Goal {idx + 1}: {obj.title}
                      </span>
                    </div>
                    <span
                      className={
                        obj.isCompleted
                          ? "syw-vp-badge-completed"
                          : "syw-vp-badge"
                      }
                    >
                      +{obj.victoryPoints} VP
                    </span>
                  </div>

                  <p
                    className={`text-[11px] leading-snug ${
                      isDark && !obj.isCompleted
                        ? "text-slate-300"
                        : "text-slate-700"
                    }`}
                  >
                    {obj.description}
                  </p>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span
                      className={
                        obj.isCompleted
                          ? "text-emerald-800 font-bold"
                          : isDark
                          ? "text-amber-300 font-semibold"
                          : "text-amber-900 font-semibold"
                      }
                    >
                      {obj.progressText}
                    </span>
                    <span
                      className={
                        isDark && !obj.isCompleted
                          ? "text-slate-400"
                          : "text-slate-600"
                      }
                    >
                      {obj.progressPercent}%
                    </span>
                  </div>
                  <div className="syw-progress-track">
                    <div
                      className={
                        obj.isCompleted
                          ? "syw-progress-fill-completed"
                          : "syw-progress-fill"
                      }
                      style={{ width: `${Math.max(6, obj.progressPercent)}%` }}
                    />
                  </div>
                  <div
                    className={`text-[10px] font-mono leading-tight pt-0.5 ${
                      isDark && !obj.isCompleted
                        ? "text-emerald-300"
                        : "text-emerald-900 font-medium"
                    }`}
                  >
                    <strong>How to Score:</strong> {obj.howToComplete}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {game.isPeaceTreatyConcluded && (
        <div
          className="max-w-[1600px] w-full mx-auto px-6 pt-3"
          data-testid="treaty-of-paris-banner"
        >
          <div className="px-4 py-2.5 rounded-xl bg-emerald-900 border border-emerald-500 text-emerald-50 text-xs flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              <span className="font-bold">
                1763 Treaty of Paris Concluded:
              </span>
              <span>
                {game.treatyTerms?.summary ??
                  "Imperial peace ratified; 35% sovereign debt relief applied."}
              </span>
            </div>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-200">
              PEACE RATIFIED
            </span>
          </div>
        </div>
      )}

      {toast && (
        <div className="max-w-[1600px] w-full mx-auto px-6 pt-3">
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#121e36] border border-amber-500 text-amber-100 text-xs shadow-md">
            <div className="flex items-center gap-2">
              {isPending && (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
              )}
              <span>{toast}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-amber-300 hover:text-white cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Main Split Workspace: Map Canvas (Left 7 cols) + Role Command Desk (Right 5 cols) */}
      <main className="max-w-[1600px] w-full mx-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
        {/* Left Column: Americas & Caribbean MapViewer + Node Inspector */}
        <div id="tour-map-canvas" className="lg:col-span-7 flex flex-col gap-4">
          <div
            className={`${cardClass} !py-2.5 !px-4 flex flex-wrap items-center justify-between gap-2`}
          >
            <div className="flex items-center gap-2 text-xs">
              <span className="font-serif font-bold">Cartographic Layers:</span>
              <button
                type="button"
                onClick={toggleSeaPolygons}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition ${
                  showSeaPolygons
                    ? "bg-sky-900 border-sky-500 text-sky-100 shadow-xs"
                    : "bg-slate-200 border-slate-400 text-slate-700"
                }`}
              >
                Sea Zone Polygons ({showSeaPolygons ? "ON" : "OFF"})
              </button>
              <button
                type="button"
                onClick={toggleSeasonalEdges}
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition ${
                  showSeasonalEdges
                    ? "bg-amber-800 border-amber-500 text-amber-50 shadow-xs"
                    : "bg-slate-200 border-slate-400 text-slate-700"
                }`}
              >
                Seasonal Corridors ({showSeasonalEdges ? "ON" : "OFF"})
              </button>
            </div>
            <div className="text-xs font-mono">
              Selected Node:{" "}
              <span className="font-bold text-red-800 bg-amber-200/80 px-2 py-0.5 rounded border border-amber-600/50">
                {selectedNode?.name ?? "None"}
              </span>
            </div>
          </div>

          <div className="h-[560px] relative isolate z-0 rounded-2xl shadow-xl ring-2 ring-amber-900/30">
            <DynamicMapViewer
              nodes={game.nodes}
              season={game.currentSeason}
              year={game.currentYear}
              selectedNodeId={selectedNode?.id}
              onSelectNode={(id) => setSelectedNodeId(id)}
              showSeaPolygons={showSeaPolygons}
              showSeasonalEdges={showSeasonalEdges}
              covenantedNodeIds={covenantedNodeIds}
            />
          </div>

          {/* Selected Node Tactical Dossier */}
          {selectedNode && (
            <div
              id="tour-node-dossier"
              className={`${cardClass} grid grid-cols-1 md:grid-cols-3 gap-4 text-xs`}
            >
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-800 font-bold">
                  Selected Theater Node
                </span>
                <h3 className="text-base font-serif font-bold mt-0.5">
                  {selectedNode.name}
                </h3>
                <p className="mt-1 opacity-85">
                  Type: <span className="font-semibold">{selectedNode.nodeType}</span>{" "}
                  • Region:{" "}
                  <span className="font-semibold">{selectedNode.region}</span>
                </p>
                <p className="opacity-80">
                  Coords:{" "}
                  <span className="font-mono">
                    {selectedNode.lat.toFixed(2)}°N,{" "}
                    {Math.abs(selectedNode.lng).toFixed(2)}°W
                  </span>
                </p>
                {covenantedNodeIds.includes(selectedNode.id) && (
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded bg-purple-900 text-purple-100 border border-purple-500 font-mono text-[10px]">
                    Protected by Easton / Council Covenant
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-800 font-bold">
                  Control &amp; Resource Yield
                </span>
                <div className="mt-1 font-semibold">
                  Controller:{" "}
                  <span className="font-bold text-red-800">
                    {selectedNode.controller?.type ?? "Neutral / Contested"}
                  </span>
                </div>
                <div className="mt-1">
                  Commodity:{" "}
                  <span className="font-mono font-bold text-emerald-800">
                    {selectedNode.resourceType ?? "NONE"} (+
                    {selectedNode.resourceYield} £/turn)
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-amber-800 font-bold">
                  Stationed Units ({selectedNode.units?.length ?? 0})
                </span>
                <div className="mt-1 space-y-1 max-h-24 overflow-y-auto">
                  {selectedNode.units?.length > 0 ? (
                    selectedNode.units.map((u: any) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between bg-[#121e36] text-amber-50 px-2.5 py-1 rounded-lg border border-amber-500/40 font-mono text-[11px]"
                      >
                        <span>{u.unitType}</span>
                        <span className="text-amber-300 font-bold">
                          {u.strength} str • {u.discipline}x
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="italic opacity-60">
                      No garrisoned formations
                    </div>
                  )}
                </div>
              </div>

              {/* Node Quick-Action Command Strip */}
              <div className="md:col-span-3 pt-2.5 border-t border-amber-900/20 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-mono">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span className="uppercase tracking-wider font-bold">
                    1-Click Quick Directive:
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickAction("MOVE")}
                    className="syw-btn-quick"
                    title="Pre-fill movement order to adjacent node"
                  >
                    <Swords className="w-3 h-3 text-red-400" /> March Force
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAction("RECRUIT")}
                    className="syw-btn-quick"
                    title="Muster provincial militia or garrison"
                  >
                    <Users className="w-3 h-3 text-emerald-400" /> Muster
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAction("EXTRACT")}
                    className="syw-btn-quick"
                    title="Harvest regional commodity revenue"
                  >
                    <Wheat className="w-3 h-3 text-amber-400" /> Harvest Yield
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAction("COVENANT_BOUNDARY")}
                    className="syw-btn-quick"
                    title="Establish protective covenant line"
                  >
                    <ShieldCheck className="w-3 h-3 text-purple-300" /> Covenant
                  </button>
                  {(selectedNode.nodeType === "SEA_ZONE" ||
                    selectedNode.region === "CARIBBEAN" ||
                    selectedNode.region === "MARITIMES" ||
                    selectedNode.name.includes("Louisbourg") ||
                    selectedNode.name.includes("Havana") ||
                    selectedNode.name.includes("Quebec") ||
                    selectedNode.name.includes("Boston") ||
                    selectedNode.name.includes("New York")) && (
                    <button
                      type="button"
                      onClick={() => handleQuickAction("AMPHIBIOUS_ASSAULT")}
                      className="syw-btn-quick"
                      title="Launch naval landing & bombardment"
                    >
                      <Anchor className="w-3 h-3 text-sky-300" /> Amphibious
                    </button>
                  )}
                  {selectedNode.controller?.id !== activeFaction.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("DISPATCHES");
                        if (selectedNode.controller?.id) {
                          setDispatchTargetFactionId(
                            selectedNode.controller.id
                          );
                        }
                      }}
                      className="syw-btn-quick"
                      title="Send diplomatic courier to occupying faction"
                    >
                      <Send className="w-3 h-3 text-indigo-300" /> Courier
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Live Tactical Combat & Weather Attrition Telemetry Feed */}
          {combatLogs.length > 0 && (
            <div
              id="tour-telemetry-feed"
              className="bg-[#121e36] border-2 border-amber-500/60 rounded-2xl p-4 space-y-2.5 text-xs text-slate-100 shadow-xl"
              data-testid="tactical-combat-attrition-feed"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold uppercase tracking-wider text-amber-300 text-[11px] flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    Tactical &amp; Environmental Telemetry ({combatLogs.length})
                  </span>
                  <div className="flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 rounded-lg border border-slate-700 text-[10px] font-mono">
                    {(
                      [
                        { id: "ALL", label: `ALL (${combatLogs.length})` },
                        { id: "WEATHER", label: "❄ Weather" },
                        { id: "NAVAL", label: "⚓ Naval" },
                        { id: "COMBAT", label: "⚔ Combat" },
                        { id: "DIPLOMACY", label: "📜 Treaties" },
                      ] as const
                    ).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setFeedFilter(f.id)}
                        className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                          feedFilter === f.id
                            ? "bg-amber-500 text-slate-950 font-bold"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCombatLogs([])}
                  className="text-[10px] text-amber-300 hover:text-white font-mono underline cursor-pointer"
                >
                  Clear Feed
                </button>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto font-mono text-[11px] pr-1">
                {filteredCombatLogs.length > 0 ? (
                  filteredCombatLogs.map((log, i) => (
                    <div
                      key={i}
                      className={`px-2.5 py-1.5 rounded-lg border flex items-start justify-between gap-2 ${
                        log.includes("[Winter Freeze]") ||
                        log.includes("[Hurricane]")
                          ? "bg-cyan-950/80 border-cyan-700 text-cyan-100"
                          : log.includes("[Naval Blockade]") ||
                            log.includes("[Naval Interception]")
                          ? "bg-sky-950/80 border-sky-700 text-sky-100"
                          : log.includes("[Covenant Violation]") ||
                            log.includes("[Declaration of War]")
                          ? "bg-red-950/80 border-red-700 text-red-100"
                          : "bg-slate-900 border-slate-700 text-slate-100"
                      }`}
                    >
                      <span>{log}</span>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-bold shrink-0 bg-slate-950 border border-slate-700 text-amber-300">
                        {log.includes("[Winter Freeze]")
                          ? "FREEZE"
                          : log.includes("[Hurricane]")
                          ? "STORM"
                          : log.includes("[Naval")
                          ? "NAVAL"
                          : log.includes("[Covenant")
                          ? "COVENANT"
                          : "DISPATCH"}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 italic py-1 text-center">
                    No entries matching filter &quot;{feedFilter}&quot;
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Faction & Role Command Console */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Active Faction & Role Selector Card */}
          <div id="tour-faction-selector" className={`${cardClass} space-y-3`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider font-bold text-amber-900 mb-1">
                  Active Faction (10 Powers)
                </label>
                <select
                  value={selectedFactionType}
                  onChange={(e) =>
                    setSelectedFactionType(e.target.value as FactionType)
                  }
                  className={selectClass}
                >
                  {game.factions.map((f: any) => (
                    <option key={f.id} value={f.type}>
                      {f.type} ({f.nodesControlled?.length ?? 0} nodes)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider font-bold text-amber-900 mb-1">
                  Role Seat (3 per Faction)
                </label>
                <select
                  value={selectedRoleType}
                  onChange={(e) =>
                    setSelectedRoleType(e.target.value as RoleType)
                  }
                  className={selectClass}
                >
                  <option value={RoleType.EXECUTIVE}>
                    EXECUTIVE (Grand Strategy)
                  </option>
                  <option value={RoleType.MILITARY}>
                    MILITARY (Field &amp; Fleet)
                  </option>
                  <option value={RoleType.DIPLOMATIC_COMMERCE}>
                    DIPLOMATIC_COMMERCE (Trade &amp; Treaties)
                  </option>
                </select>
              </div>
            </div>

            {/* Faction Metrics Bar */}
            {activeFaction && (
              <div
                id="tour-faction-ledger"
                className="grid grid-cols-5 gap-2 pt-1 text-xs font-mono"
              >
                <div className={ledgerStatClass}>
                  <div className="text-[10px] opacity-75 flex items-center gap-1 font-bold">
                    <Coins className="w-3 h-3 text-amber-600" /> Treasury
                  </div>
                  <div className="text-sm font-bold text-amber-700">
                    {activeFaction.treasury} £
                  </div>
                </div>
                <div className={ledgerStatClass}>
                  <div className="text-[10px] opacity-75 font-bold">Debt</div>
                  <div className="text-sm font-bold text-red-700">
                    {activeFaction.debt} £
                  </div>
                </div>
                <div className={ledgerStatClass}>
                  <div className="text-[10px] opacity-75 flex items-center gap-1 font-bold">
                    <Flame className="w-3 h-3 text-orange-600" /> Unrest
                  </div>
                  <div className="text-sm font-bold text-orange-700">
                    {activeFaction.unrestIndex}%
                  </div>
                </div>
                <div className={ledgerStatClass}>
                  <div className="text-[10px] opacity-75 flex items-center gap-1 font-bold">
                    <Award className="w-3 h-3 text-emerald-700" /> Standing
                  </div>
                  <div className="text-sm font-bold text-emerald-800">
                    {activeFaction.standingPoints} pts
                  </div>
                </div>
                <div className={ledgerStatClass}>
                  <div className="text-[10px] opacity-75 font-bold">
                    Assembly
                  </div>
                  <div className="text-sm font-bold text-sky-800">
                    {activeFaction.assemblySupport ?? 50}%
                  </div>
                </div>
              </div>
            )}

            {activeRole && (
              <div
                id="tour-role-doctrine"
                className={`${subcardClass} text-xs space-y-2.5`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-serif font-bold text-sm">
                        {activeRole.title}
                      </span>
                      <span
                        className="syw-vp-badge"
                        data-testid="role-victory-points-badge"
                      >
                        <Target className="w-3 h-3" /> Role VP: {earnedRoleVP}/
                        {activeCharacterGuide.totalRoleVP} • Nation VP:{" "}
                        {earnedFactionVP}/30
                      </span>
                    </div>
                    <span className="block text-[11px] opacity-85 mt-0.5 leading-snug">
                      <strong>Playstyle Strategy:</strong>{" "}
                      {activeCharacterGuide.strategicPlaystyle}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("ADVISOR");
                        handleInvokeAI(BotBehavior.ADVISOR);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#121e36] hover:bg-[#1e325c] border border-amber-500/50 text-amber-200 font-mono text-[10px] font-bold cursor-pointer transition shadow-xs"
                      title="Request immediate 150-word AI strategy briefing"
                    >
                      <Sparkles className="w-3 h-3 text-amber-400" /> Consult AI
                    </button>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#121e36] text-amber-100 border border-slate-700">
                      {activeRole.controller} • {activeRole.botBehavior}
                    </span>
                  </div>
                </div>

                {/* Compact Role Objectives Checklist inside Command Desk */}
                <div
                  className="pt-2 border-t border-amber-900/20 space-y-1.5"
                  data-testid="character-objectives-panel"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider font-bold">
                    <span>Active Character Objectives Checklist</span>
                    <button
                      type="button"
                      onClick={() => setIsTourOpen(true)}
                      className="text-red-800 hover:underline cursor-pointer font-bold"
                    >
                      View All 30 Character VPs →
                    </button>
                  </div>
                  <div className="space-y-1">
                    {evaluatedCharacterObjectives.map((obj) => (
                      <div
                        key={obj.id}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg bg-[#fffdf9] border border-amber-900/20 text-slate-900"
                      >
                        <div className="flex items-center gap-1.5 font-semibold text-[11px] truncate">
                          {obj.isCompleted ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <Circle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          )}
                          <span className="truncate">{obj.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono text-slate-600">
                            {obj.progressText}
                          </span>
                          <span
                            className={
                              obj.isCompleted
                                ? "syw-vp-badge-completed"
                                : "syw-vp-badge"
                            }
                          >
                            +{obj.victoryPoints} VP
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {activeRole.strategicObjective && (
                  <div
                    className="flex items-center justify-between pt-1.5 border-t border-amber-900/20 text-[11px] font-mono font-semibold text-purple-900"
                    data-testid="role-strategic-objective"
                  >
                    <span>
                      Campaign:{" "}
                      {activeRole.strategicObjective.campaignName ??
                        activeRole.strategicObjective.objectiveType}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-purple-900 text-purple-100 text-[10px]">
                      {activeRole.strategicObjective.status} (T
                      {activeRole.strategicObjective.targetDeadlineTurn ?? "?"})
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div id="tour-command-tabs" className="syw-tab-bar">
            {(
              [
                { id: "ORDERS", label: "Orders", icon: Shield },
                { id: "ADVISOR", label: "DeepSeek AI", icon: Sparkles },
                { id: "DISPATCHES", label: "Couriers", icon: Send },
                { id: "CHRONICLE", label: "Events SQL", icon: ScrollText },
              ] as const
            ).map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center justify-center gap-1.5 py-2 rounded-lg transition cursor-pointer ${
                    activeTab === t.id
                      ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                      : "text-amber-100/80 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content Area */}
          <div
            className={`${cardClass} flex-1 flex flex-col justify-between`}
          >
            {activeTab === "ORDERS" && (
              <div id="tour-orders-matrix" className="space-y-4">
                <form
                  onSubmit={handleSubmitOrder}
                  className="space-y-3.5 text-xs"
                >
                  <div className="flex items-center justify-between border-b border-amber-900/20 pb-2">
                    <div className="font-serif font-bold uppercase tracking-wider text-red-900 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-red-800" />
                      Issue Operational Directive ({selectedRoleType})
                    </div>
                    <span className="text-[11px] font-mono">
                      Active:{" "}
                      <span className="font-bold text-red-900 bg-amber-200 px-1.5 py-0.5 rounded">
                        {orderType}
                      </span>
                    </span>
                  </div>

                  {/* Categorized Action Matrix */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono uppercase tracking-wider font-bold opacity-75">
                      Select Order Classification &amp; Operational Objective
                    </label>

                    <div className="space-y-2.5">
                      {[
                        {
                          category: "Military & Naval Operations",
                          badge: "Field & Fleet",
                          color: "text-red-900",
                          actions: [
                            {
                              type: "MOVE" as const,
                              label: "March Force",
                              desc: "Advance battalions",
                              icon: Swords,
                            },
                            {
                              type: "RECRUIT" as const,
                              label: "Muster Troops",
                              desc: "Levy provincials",
                              icon: Users,
                            },
                            {
                              type: "AMPHIBIOUS_ASSAULT" as const,
                              label: "Amphibious",
                              desc: "Landing & fleet guns",
                              icon: Anchor,
                            },
                            {
                              type: "RAID" as const,
                              label: "Frontier Raid",
                              desc: "Irregular war party",
                              icon: Crosshair,
                            },
                          ],
                        },
                        {
                          category: "Sovereignty & Treaties",
                          badge: "Crown & Council",
                          color: "text-purple-900",
                          actions: [
                            {
                              type: "COVENANT_BOUNDARY" as const,
                              label: "Covenant Line",
                              desc: "Easton reservation",
                              icon: ShieldCheck,
                            },
                            {
                              type: "DECLARE_WAR" as const,
                              label: "Declare War",
                              desc: "Open hostilities",
                              icon: ShieldAlert,
                            },
                            {
                              type: "TREATY_CONFERENCE" as const,
                              label: "Peace Congress",
                              desc: "Convene peace talks",
                              icon: Flag,
                            },
                          ],
                        },
                        {
                          category: "Economy & Governance",
                          badge: "Customs & Bullion",
                          color: "text-emerald-900",
                          actions: [
                            {
                              type: "EXTRACT" as const,
                              label: "Harvest Yield",
                              desc: "Collect furs & timber",
                              icon: Wheat,
                            },
                            {
                              type: "TRADE" as const,
                              label: "Merchant Convoy",
                              desc: "Dispatch trade mission",
                              icon: Coins,
                            },
                            {
                              type: "SUBSIDIZE" as const,
                              label: "Allied Subsidies",
                              desc: "Transfer war bullion",
                              icon: Award,
                            },
                            {
                              type: "ASSEMBLY_NEGOTIATION" as const,
                              label: "Assembly",
                              desc: "Lobby legislature",
                              icon: Landmark,
                            },
                          ],
                        },
                      ].map((cat) => (
                        <div key={cat.category} className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                            <span className={cat.color}>{cat.category}</span>
                            <span className="opacity-65">{cat.badge}</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {cat.actions.map((act) => {
                              const isSelected = orderType === act.type;
                              const Icon = act.icon;
                              const tileClass = isSelected
                                ? isDark
                                  ? "syw-action-tile-selected-dark"
                                  : "syw-action-tile-selected"
                                : isDark
                                ? "syw-action-tile-dark"
                                : "syw-action-tile";
                              return (
                                <button
                                  key={act.type}
                                  type="button"
                                  onClick={() => setOrderType(act.type)}
                                  className={tileClass}
                                >
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span className="font-bold text-[11px] flex items-center gap-1">
                                      <Icon
                                        className={`w-3.5 h-3.5 ${
                                          isSelected
                                            ? "text-red-800"
                                            : "text-amber-700"
                                        }`}
                                      />
                                      {act.label}
                                    </span>
                                  </div>
                                  <span className="text-[10px] opacity-75 leading-tight">
                                    {act.desc}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Compact Synchronized Select for programmatic / testing compatibility */}
                    <div className="pt-1">
                      <select
                        value={orderType}
                        onChange={(e) => setOrderType(e.target.value as any)}
                        className={selectClass}
                      >
                        <option value="MOVE">MOVE (Advance Formation)</option>
                        <option value="RECRUIT">RECRUIT (Muster Troops)</option>
                        <option value="EXTRACT">EXTRACT (Harvest Yield)</option>
                        <option value="TRADE">TRADE (Merchant Convoy)</option>
                        <option value="SUBSIDIZE">SUBSIDIZE (Allied Gift)</option>
                        <option value="RAID">RAID (Frontier War Party)</option>
                        <option value="AMPHIBIOUS_ASSAULT">
                          AMPHIBIOUS_ASSAULT (Naval Landing &amp; Bombardment)
                        </option>
                        <option value="DECLARE_WAR">
                          DECLARE_WAR (Open Hostilities vs Neutral)
                        </option>
                        <option value="ASSEMBLY_NEGOTIATION">
                          ASSEMBLY_NEGOTIATION (Colonial Legislature)
                        </option>
                        <option value="COVENANT_BOUNDARY">
                          COVENANT_BOUNDARY (Easton / Council Line)
                        </option>
                        <option value="TREATY_CONFERENCE">
                          TREATY_CONFERENCE (Convene Peace Congress)
                        </option>
                      </select>
                    </div>
                  </div>

                  {/* Treasury Allocation & Source Node */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block font-semibold mb-1 text-[11px]">
                        Allocated Treasury (£)
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          max={activeFaction?.treasury ?? 200}
                          value={allocatedTreasury}
                          onChange={(e) =>
                            setAllocatedTreasury(Number(e.target.value))
                          }
                          className={`${inputClass} font-mono`}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setAllocatedTreasury((prev) => Math.max(0, prev - 5))
                          }
                          className="px-2.5 py-2 rounded-lg bg-[#121e36] text-amber-100 font-mono cursor-pointer"
                        >
                          -5
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setAllocatedTreasury((prev) =>
                              Math.min(
                                activeFaction?.treasury ?? 200,
                                prev + 5
                              )
                            )
                          }
                          className="px-2.5 py-2 rounded-lg bg-[#121e36] text-amber-100 font-mono cursor-pointer"
                        >
                          +5
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block font-semibold mb-1 text-[11px]">
                        Source Theater Node (Staging Base)
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={selectedNode?.name ?? ""}
                        className={`${inputClass} font-bold text-red-900`}
                      />
                    </div>
                  </div>

                  {/* Target Corridor Node with Adjacent Quick-Pills */}
                  <div className="space-y-1.5 pt-1">
                    <label className="block font-semibold text-[11px]">
                      Target Corridor Node (Operational Destination)
                    </label>

                    {adjacentNodes.length > 0 && (
                      <div className={`${subcardClass} space-y-1.5`}>
                        <div className="text-[10px] font-mono uppercase font-bold flex items-center justify-between">
                          <span>Connected Adjacent Corridors:</span>
                          <span className="opacity-70">
                            1-Click Quick Select
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {adjacentNodes.map((adj: any) => {
                            const isFrozen =
                              game.currentSeason === "Winter" &&
                              ((selectedNode.name.includes("Quebec") &&
                                adj.name.includes("Montreal")) ||
                                (selectedNode.name.includes("Montreal") &&
                                  adj.name.includes("Quebec")) ||
                                adj.name.includes("Champlain") ||
                                adj.name.includes("Frontenac"));
                            const isHurricane =
                              game.currentSeason === "Autumn" &&
                              (adj.nodeType === "SEA_ZONE" ||
                                adj.region === "CARIBBEAN");
                            const isTarget = targetNodeId === adj.id;

                            return (
                              <button
                                key={adj.id}
                                type="button"
                                onClick={() => setTargetNodeId(adj.id)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition cursor-pointer flex items-center gap-1 ${
                                  isTarget
                                    ? "bg-red-800 text-amber-50 font-bold border-red-950 shadow-sm"
                                    : "bg-[#fffdf9] hover:bg-amber-100 text-slate-900 border-amber-900/30"
                                }`}
                              >
                                <span>{adj.name}</span>
                                {isFrozen && (
                                  <span title="Winter Freeze (2.5x Cost)">
                                    ❄
                                  </span>
                                )}
                                {isHurricane && (
                                  <span title="Hurricane Risk (1.75x Cost)">
                                    🌀
                                  </span>
                                )}
                                {adj.nodeType === "SEA_ZONE" && (
                                  <span title="Naval Sea Lane">⚓</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <select
                      value={targetNodeId}
                      onChange={(e) => setTargetNodeId(e.target.value)}
                      className={selectClass}
                    >
                      <option value="">Adjacent Default Corridor</option>
                      {adjacentNodes.length > 0 && (
                        <optgroup label="Directly Connected Corridors">
                          {adjacentNodes.map((n: any) => (
                            <option key={n.id} value={n.id}>
                              ★ {n.name} ({n.region}) [Adjacent]
                            </option>
                          ))}
                        </optgroup>
                      )}
                      <optgroup label="Other Theater Nodes">
                        {game.nodes
                          .filter(
                            (n: any) =>
                              !selectedNode?.adjacentNodeIds?.includes(n.id)
                          )
                          .map((n: any) => (
                            <option key={n.id} value={n.id}>
                              {n.name} ({n.region})
                            </option>
                          ))}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1 text-[11px]">
                      Strategic Reasoning (&le;100 chars)
                    </label>
                    <input
                      type="text"
                      maxLength={100}
                      value={reasoning}
                      onChange={(e) => setReasoning(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full py-2.5 rounded-xl font-bold bg-gradient-to-r from-red-800 via-red-700 to-red-800 hover:from-red-700 hover:to-red-600 text-amber-50 border border-amber-400/60 transition cursor-pointer shadow-lg flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Commit Order to Turn {game.turnNumber} Queue
                  </button>
                </form>

                {/* Queued Orders List */}
                <div className="border-t border-amber-900/20 pt-3">
                  <div className="text-[11px] font-mono uppercase font-bold mb-2 flex items-center justify-between">
                    <span>
                      Turn {game.turnNumber} Queued Orders (
                      {game.orders?.length ?? 0})
                    </span>
                    <span className="opacity-70 text-[10px]">
                      Phase: {game.currentPhase}
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 font-mono text-[11px]">
                    {game.orders?.slice(0, 10).map((o: any) => (
                      <div
                        key={o.id}
                        className="p-2 rounded-lg bg-[#fffdf9] border border-amber-900/25 text-slate-900 text-xs flex items-center justify-between"
                      >
                        <div>
                          <span className="font-mono font-bold text-red-800">
                            [{o.orderType}]
                          </span>{" "}
                          <span className="text-slate-700">
                            {o.payload?.reasoning || "Tactical directive"}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            o.isExecuted
                              ? "bg-emerald-100 text-emerald-900 border border-emerald-500"
                              : "bg-amber-100 text-amber-950 border border-amber-500"
                          }`}
                        >
                          {o.isExecuted ? "EXECUTED" : "PENDING"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "ADVISOR" && (
              <div id="tour-ai-advisor" className="space-y-4 text-xs">
                <div className="space-y-1">
                  <div className="font-serif font-bold uppercase tracking-wider text-red-900">
                    Token-Bounded DeepSeek AI Controller (O(1) ~1,500 Token
                    Budget)
                  </div>
                  <p className="opacity-80">
                    Autonomous Executive seats route to{" "}
                    <code className="font-bold text-purple-900">
                      deepseek-v4-pro (thinking: enabled)
                    </code>
                    . Military, Commercial, and Advisor briefings route to{" "}
                    <code className="font-bold text-sky-900">
                      deepseek-flash (thinking: disabled)
                    </code>
                    .
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleInvokeAI(BotBehavior.ADVISOR)}
                    data-testid="btn-generate-advisor-briefing"
                    className="py-2.5 px-3 rounded-xl font-bold bg-[#121e36] hover:bg-[#1d3158] text-amber-100 border border-amber-500/50 transition cursor-pointer shadow-md"
                  >
                    Request 150-Word Advisor Briefing
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleInvokeAI(BotBehavior.AUTONOMOUS)}
                    data-testid="btn-generate-autonomous-orders"
                    className="py-2.5 px-3 rounded-xl font-bold bg-purple-900 hover:bg-purple-800 text-purple-50 border border-purple-400/50 transition cursor-pointer shadow-md"
                  >
                    Execute Autonomous JSON Orders
                  </button>
                </div>

                {aiResponse && (
                  <div className="bg-[#121e36] text-slate-100 border-2 border-amber-500/60 rounded-xl p-3.5 space-y-2.5 max-h-80 overflow-y-auto shadow-inner">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-2 font-mono text-[11px]">
                      <span className="text-amber-300 font-bold">
                        Model: {aiResponse.modelConfig?.model} (thinking:{" "}
                        {aiResponse.modelConfig?.extra_body?.thinking?.type})
                      </span>
                      <span className="text-emerald-300">
                        Prompt Budget: {aiResponse.estimatedPromptTokens} tokens
                        (Top{" "}
                        {aiResponse.contextPayload?.recentActiveEvents
                          ?.length ?? 0}{" "}
                        active events)
                      </span>
                    </div>

                    {aiResponse.reasoningScratchpad && (
                      <div className="p-2 rounded bg-purple-950/60 border border-purple-700 text-purple-200 font-mono text-[11px]">
                        {aiResponse.reasoningScratchpad}
                      </div>
                    )}

                    {aiResponse.advisorBriefing && (
                      <div className="text-amber-50 leading-relaxed font-serif text-sm">
                        {aiResponse.advisorBriefing}
                      </div>
                    )}

                    {aiResponse.orders && (
                      <pre className="text-[11px] font-mono text-cyan-200 overflow-x-auto bg-slate-950 p-2 rounded">
                        {JSON.stringify(aiResponse.orders, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === "DISPATCHES" && (
              <div id="tour-courier-system" className="space-y-4 text-xs">
                <form onSubmit={handleSendDispatch} className="space-y-3">
                  <div className="font-serif font-bold uppercase tracking-wider text-red-900">
                    Asynchronous Diplomatic Courier Service
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold mb-1">
                        Recipient Faction
                      </label>
                      <select
                        value={dispatchTargetFactionId}
                        onChange={(e) =>
                          setDispatchTargetFactionId(e.target.value)
                        }
                        className={selectClass}
                      >
                        {game.factions
                          .filter((f: any) => f.id !== activeFaction?.id)
                          .map((f: any) => (
                            <option key={f.id} value={f.id}>
                              {f.type}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">
                        Courier Transit Delay (Turns)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={4}
                        value={dispatchDelay}
                        onChange={(e) =>
                          setDispatchDelay(Number(e.target.value))
                        }
                        className={inputClass}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">
                      Encrypted Diplomatic Missive
                    </label>
                    <textarea
                      rows={3}
                      value={dispatchContent}
                      onChange={(e) => setDispatchContent(e.target.value)}
                      className={inputClass}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="syw-btn-primary py-2.5"
                    >
                      Send Courier Packet
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={handleSignTreaty}
                      className="py-2.5 rounded-lg font-bold bg-emerald-800 hover:bg-emerald-700 text-white cursor-pointer shadow-md"
                    >
                      Ratify Peace Treaty (Supersede War)
                    </button>
                  </div>
                </form>

                <div className="border-t border-amber-900/20 pt-3">
                  <div className="text-[11px] font-mono uppercase font-bold mb-2">
                    Courier Dispatches ({game.dispatches?.length ?? 0})
                  </div>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto">
                    {game.dispatches?.map((d: any) => (
                      <div
                        key={d.id}
                        className="p-2.5 rounded-xl bg-[#fffdf9] border border-amber-900/25 text-slate-900 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between font-mono text-[10px]">
                          <span className="font-bold text-amber-900">
                            Delay: {d.courierDelay}t • Remaining:{" "}
                            {d.turnsRemaining}t
                          </span>
                          <span
                            className={`font-bold px-2 py-0.5 rounded-full ${
                              d.intercepted
                                ? "bg-red-100 text-red-900"
                                : d.turnsRemaining === 0
                                ? "bg-emerald-100 text-emerald-900"
                                : "bg-sky-100 text-sky-900"
                            }`}
                          >
                            {d.intercepted
                              ? "INTERCEPTED"
                              : d.turnsRemaining === 0
                              ? "DELIVERED"
                              : "IN TRANSIT"}
                          </span>
                        </div>
                        <p className="text-slate-700">{d.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "CHRONICLE" && (
              <div id="tour-chronicle-sql" className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-serif font-bold uppercase tracking-wider text-red-900">
                    Deterministic SQL Event Ledger
                  </span>
                  <span className="text-[11px] font-mono opacity-75">
                    ACTIVE vs SUPERSEDED / EXPIRED
                  </span>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {game.events?.map((ev: any) => {
                    const isActive = ev.status === EventStatus.ACTIVE;
                    return (
                      <div
                        key={ev.id}
                        className={`p-3 rounded-xl border ${
                          isActive
                            ? "bg-[#fffdf9] border-amber-900/30 text-slate-900 shadow-xs"
                            : "bg-slate-200/60 border-slate-400/50 text-slate-600 opacity-70"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-serif font-bold">
                            [Turn {ev.turnRecorded}] {ev.title}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              ev.status === EventStatus.ACTIVE
                                ? "bg-emerald-100 text-emerald-900 border border-emerald-600"
                                : ev.status === EventStatus.SUPERSEDED
                                ? "bg-purple-100 text-purple-900 border border-purple-600"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {ev.status === EventStatus.ACTIVE ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : ev.status === EventStatus.SUPERSEDED ? (
                              <XCircle className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            {ev.status}
                          </span>
                        </div>
                        <p className="mt-1 opacity-85">{ev.description}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono opacity-70">
                          <span>Category: {ev.category}</span>
                          <span>Scope: {ev.scope}</span>
                          {ev.validUntilTurn && (
                            <span>Valid Until Turn: {ev.validUntilTurn}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Interactive Guided Tour with Overlay Spotlight Animations */}
      <DashboardTourGuide
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        game={game}
        activeFaction={activeFaction}
        activeRole={activeRole}
      />
    </div>
  );
}
