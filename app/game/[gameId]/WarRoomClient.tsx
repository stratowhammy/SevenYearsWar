"use client";

import React, { useState, useTransition, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  BotBehavior,
  ControllerType,
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
  Filter,
  HelpCircle,
  Target,
  Circle,
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
      <div className="w-full h-[560px] rounded-xl bg-stone-900/90 border border-amber-900/40 flex items-center justify-center text-amber-200 text-sm font-serif">
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

  return (
    <div className="syw-shell">
      {/* Top Imperial Command Header */}
      <header id="tour-header-stepper" className="syw-header">
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-950/80 border border-amber-700/60 text-amber-300">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg md:text-xl font-serif font-bold text-amber-100">
                  {game.name}
                </h1>
                <span className="px-2 py-0.5 rounded text-xs font-mono bg-amber-900/60 text-amber-200 border border-amber-700/50">
                  Turn {game.turnNumber} • {game.currentSeason}{" "}
                  {game.currentYear}
                </span>
              </div>
              <p className="text-xs text-stone-400">
                1756 Seven Years&apos; War Simulator • Americas &amp; Caribbean
                Theater (10°N–55°N, 55°W–100°W)
              </p>
            </div>
          </div>

          {/* 4-Phase Turn Loop Stepper & Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="hidden xl:flex items-center gap-1 bg-stone-950 px-3 py-1.5 rounded-lg border border-stone-800">
              {PHASES.map((p, idx) => {
                const isActive = game.currentPhase === p;
                return (
                  <React.Fragment key={p}>
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                        isActive
                          ? "bg-amber-600 text-stone-950 font-bold"
                          : "text-stone-400"
                      }`}
                    >
                      {idx + 1}. {p}
                    </span>
                    {idx < PHASES.length - 1 && (
                      <span className="text-stone-600 text-xs">→</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            <button
              type="button"
              disabled={isPending}
              onClick={handleAdvancePhase}
              data-testid="warroom-advance-phase"
              className="syw-btn-secondary"
              title="Advance to next phase (Shortcut: N)"
            >
              <Play className="w-3.5 h-3.5" /> Next Phase
              <span className="text-[10px] font-mono text-amber-400/80 bg-stone-950 px-1.5 py-0.2 rounded border border-stone-700">
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
              <span className="text-[10px] font-mono text-stone-950 bg-amber-300/90 px-1.5 py-0.2 rounded font-bold">
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
              <HelpCircle className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Player Guide &amp; VPs</span>
              <span className="text-[10px] font-mono text-amber-300 bg-stone-950 px-1.5 py-0.2 rounded border border-amber-700/60">
                ?
              </span>
            </button>

            <Link
              href={`/admin/${game.id}/roles`}
              data-testid="link-admin-roles"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-indigo-950 hover:bg-indigo-900 text-indigo-200 border border-indigo-700/70 transition"
            >
              <Sliders className="w-3.5 h-3.5" /> Admin Role Seating (30 Seats)
            </Link>
          </div>
        </div>
      </header>

      {/* Off-Map Theater Abstractor Telemetry Ribbon */}
      <div
        id="tour-offmap-ribbon"
        className="bg-stone-900/60 border-b border-stone-800/80 px-6 py-2"
      >
        <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="flex items-start gap-2 bg-stone-950/70 px-3 py-1.5 rounded border border-stone-800">
            <Globe className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300">
                Europe Theater:{" "}
              </span>
              <span className="text-stone-300">
                {offMap?.europeTheater?.status ?? "ACTIVE"} (GB Drain: -
                {offMap?.europeTheater?.britishSubsidyDrain ?? 20}£, FR Drain: -
                {offMap?.europeTheater?.frenchContinentalDrain ?? 25}£)
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-stone-950/70 px-3 py-1.5 rounded border border-stone-800">
            <Globe className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-emerald-300">
                India Theater:{" "}
              </span>
              <span className="text-stone-300">
                {offMap?.indiaTheater?.status ?? "CARNATIC_STANDOFF"} (EIC: +
                {offMap?.indiaTheater?.britishEastIndiaRevenue ?? 15}£, French
                Indies: +{offMap?.indiaTheater?.frenchCompagnieRevenue ?? 10}£)
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-stone-950/70 px-3 py-1.5 rounded border border-stone-800">
            <Globe className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-cyan-300">
                West Africa &amp; Atlantic:{" "}
              </span>
              <span className="text-stone-300">
                Dutch Neutral Freight Bonus: +
                {offMap?.westAfricaTheater?.dutchNeutralFreightBonus ?? 12}£
              </span>
            </div>
          </div>
        </div>
      </div>

      {game.isPeaceTreatyConcluded && (
        <div
          className="max-w-[1600px] w-full mx-auto px-6 pt-3"
          data-testid="treaty-of-paris-banner"
        >
          <div className="px-4 py-2.5 rounded-lg bg-emerald-950/90 border border-emerald-600/80 text-emerald-100 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold">
                1763 Treaty of Paris Concluded:
              </span>
              <span>
                {game.treatyTerms?.summary ??
                  "Imperial peace ratified; 35% sovereign debt relief applied."}
              </span>
            </div>
            <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-900/80 text-emerald-200">
              PEACE RATIFIED
            </span>
          </div>
        </div>
      )}

      {toast && (
        <div className="max-w-[1600px] w-full mx-auto px-6 pt-3">
          <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-amber-950/80 border border-amber-700 text-amber-200 text-xs">
            <div className="flex items-center gap-2">
              {isPending && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>{toast}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-stone-400 hover:text-stone-200"
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
          <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-900/80 px-4 py-2.5 rounded-xl border border-stone-800">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-stone-400 font-medium">Map Layers:</span>
              <button
                type="button"
                onClick={toggleSeaPolygons}
                className={`px-2.5 py-1 rounded border text-xs cursor-pointer ${
                  showSeaPolygons
                    ? "bg-sky-950/80 border-sky-700 text-sky-200"
                    : "bg-stone-950 border-stone-800 text-stone-400"
                }`}
              >
                Sea Zone Polygons ({showSeaPolygons ? "ON" : "OFF"})
              </button>
              <button
                type="button"
                onClick={toggleSeasonalEdges}
                className={`px-2.5 py-1 rounded border text-xs cursor-pointer ${
                  showSeasonalEdges
                    ? "bg-amber-950/80 border-amber-700 text-amber-200"
                    : "bg-stone-950 border-stone-800 text-stone-400"
                }`}
              >
                Seasonal Corridors ({showSeasonalEdges ? "ON" : "OFF"})
              </button>
            </div>
            <div className="text-xs font-mono text-stone-400">
              Selected Node:{" "}
              <span className="text-amber-300 font-bold">
                {selectedNode?.name ?? "None"}
              </span>
            </div>
          </div>

          <div className="h-[560px] relative isolate z-0">
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
              className="bg-stone-900/80 border border-stone-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs"
            >
              <div>
                <span className="text-[10px] font-mono uppercase text-stone-400">
                  Selected Theater Node
                </span>
                <h3 className="text-base font-bold text-amber-200 mt-0.5">
                  {selectedNode.name}
                </h3>
                <p className="text-stone-400 mt-1">
                  Type: <span className="text-stone-200">{selectedNode.nodeType}</span> •
                  Region: <span className="text-stone-200">{selectedNode.region}</span>
                </p>
                <p className="text-stone-400">
                  Coords:{" "}
                  <span className="font-mono text-stone-300">
                    {selectedNode.lat.toFixed(2)}°N,{" "}
                    {Math.abs(selectedNode.lng).toFixed(2)}°W
                  </span>
                </p>
                {covenantedNodeIds.includes(selectedNode.id) && (
                  <span className="inline-block mt-1.5 px-2 py-0.5 rounded bg-amber-950/90 border border-amber-700/80 text-amber-300 font-mono text-[10px]">
                    Protected by Easton / Council Covenant
                  </span>
                )}
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-stone-400">
                  Control &amp; Resource Yield
                </span>
                <div className="mt-1 font-semibold text-stone-100">
                  Controller:{" "}
                  <span className="text-amber-300">
                    {selectedNode.controller?.type ?? "Neutral / Contested"}
                  </span>
                </div>
                <div className="mt-1 text-stone-300">
                  Commodity:{" "}
                  <span className="font-mono text-emerald-300">
                    {selectedNode.resourceType ?? "NONE"} (+
                    {selectedNode.resourceYield} £/turn)
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-stone-400">
                  Stationed Units ({selectedNode.units?.length ?? 0})
                </span>
                <div className="mt-1 space-y-1 max-h-24 overflow-y-auto">
                  {selectedNode.units?.length > 0 ? (
                    selectedNode.units.map((u: any) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between bg-stone-950 px-2 py-1 rounded border border-stone-800 font-mono text-[11px]"
                      >
                        <span>{u.unitType}</span>
                        <span className="text-amber-300">
                          {u.strength} str • {u.discipline}x
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-stone-500 italic">
                      No garrisoned formations
                    </div>
                  )}
                </div>
              </div>

              {/* Node Quick-Action Command Strip */}
              <div className="md:col-span-3 pt-2.5 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-stone-400">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span className="uppercase tracking-wider font-bold text-amber-200">
                    Quick Directive:
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleQuickAction("MOVE")}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-amber-200 border border-stone-700 text-[11px] font-semibold cursor-pointer transition shadow-sm hover:border-amber-600"
                    title="Pre-fill movement order to adjacent node"
                  >
                    <Swords className="w-3 h-3 text-red-400" /> March Force
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAction("RECRUIT")}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-amber-200 border border-stone-700 text-[11px] font-semibold cursor-pointer transition shadow-sm hover:border-amber-600"
                    title="Muster provincial militia or garrison"
                  >
                    <Users className="w-3 h-3 text-emerald-400" /> Muster
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAction("EXTRACT")}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-amber-200 border border-stone-700 text-[11px] font-semibold cursor-pointer transition shadow-sm hover:border-amber-600"
                    title="Harvest regional commodity revenue"
                  >
                    <Wheat className="w-3 h-3 text-amber-400" /> Harvest Yield
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickAction("COVENANT_BOUNDARY")}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-stone-800 hover:bg-stone-700 text-purple-200 border border-purple-800/80 text-[11px] font-semibold cursor-pointer transition shadow-sm hover:border-purple-600"
                    title="Establish protective covenant line"
                  >
                    <ShieldCheck className="w-3 h-3 text-purple-400" /> Covenant
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
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-sky-950/80 hover:bg-sky-900 text-sky-200 border border-sky-700 text-[11px] font-semibold cursor-pointer transition shadow-sm hover:border-sky-500"
                      title="Launch naval landing & bombardment"
                    >
                      <Anchor className="w-3 h-3 text-sky-400" /> Amphibious
                    </button>
                  )}
                  {selectedNode.controller?.id !== activeFaction.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("DISPATCHES");
                        if (selectedNode.controller?.id) {
                          setDispatchTargetFactionId(selectedNode.controller.id);
                        }
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-700 text-[11px] font-semibold cursor-pointer transition shadow-sm hover:border-indigo-500"
                      title="Send diplomatic courier to occupying faction"
                    >
                      <Send className="w-3 h-3 text-indigo-400" /> Courier
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
              className="bg-stone-900/90 border border-amber-800/50 rounded-xl p-3.5 space-y-2.5 text-xs shadow-xl"
              data-testid="tactical-combat-attrition-feed"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold uppercase tracking-wider text-amber-300 text-[11px] flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    Tactical &amp; Environmental Telemetry ({combatLogs.length})
                  </span>
                  <div className="flex items-center gap-1 bg-stone-950 px-1.5 py-0.5 rounded border border-stone-800 text-[10px] font-mono">
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
                            ? "bg-amber-600 text-stone-950 font-bold"
                            : "text-stone-400 hover:text-stone-200"
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
                  className="text-[10px] text-stone-400 hover:text-stone-200 font-mono underline"
                >
                  Clear Feed
                </button>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto font-mono text-[11px] pr-1">
                {filteredCombatLogs.length > 0 ? (
                  filteredCombatLogs.map((log, i) => (
                    <div
                      key={i}
                      className={`px-2.5 py-1 rounded border flex items-start justify-between gap-2 ${
                        log.includes("[Winter Freeze]") ||
                        log.includes("[Hurricane]")
                          ? "bg-cyan-950/60 border-cyan-800 text-cyan-200"
                          : log.includes("[Naval Blockade]") ||
                            log.includes("[Naval Interception]")
                          ? "bg-sky-950/60 border-sky-800 text-sky-200"
                          : log.includes("[Covenant Violation]") ||
                            log.includes("[Declaration of War]")
                          ? "bg-red-950/60 border-red-800 text-red-200"
                          : "bg-stone-950 border-stone-800 text-stone-200"
                      }`}
                    >
                      <span>{log}</span>
                      <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-bold shrink-0 bg-stone-900 border border-stone-700 text-stone-400">
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
                  <div className="text-stone-500 italic py-1 text-center">
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
          <div id="tour-faction-selector" className="syw-card space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1">
                  Active Faction (10 Powers)
                </label>
                <select
                  value={selectedFactionType}
                  onChange={(e) =>
                    setSelectedFactionType(e.target.value as FactionType)
                  }
                  className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 text-xs font-semibold text-amber-100"
                >
                  {game.factions.map((f: any) => (
                    <option key={f.id} value={f.type}>
                      {f.type} ({f.nodesControlled?.length ?? 0} nodes)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-400 mb-1">
                  Role Seat (3 per Faction)
                </label>
                <select
                  value={selectedRoleType}
                  onChange={(e) =>
                    setSelectedRoleType(e.target.value as RoleType)
                  }
                  className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 text-xs font-semibold text-amber-100"
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
                <div className="syw-ledger-stat">
                  <div className="text-[10px] text-stone-400 flex items-center gap-1">
                    <Coins className="w-3 h-3 text-amber-400" /> Treasury
                  </div>
                  <div className="text-sm font-bold text-amber-300">
                    {activeFaction.treasury} £
                  </div>
                </div>
                <div className="syw-ledger-stat">
                  <div className="text-[10px] text-stone-400">Debt</div>
                  <div className="text-sm font-bold text-red-300">
                    {activeFaction.debt} £
                  </div>
                </div>
                <div className="syw-ledger-stat">
                  <div className="text-[10px] text-stone-400 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-400" /> Unrest
                  </div>
                  <div className="text-sm font-bold text-orange-300">
                    {activeFaction.unrestIndex}%
                  </div>
                </div>
                <div className="syw-ledger-stat">
                  <div className="text-[10px] text-stone-400 flex items-center gap-1">
                    <Award className="w-3 h-3 text-emerald-400" /> Standing
                  </div>
                  <div className="text-sm font-bold text-emerald-300">
                    {activeFaction.standingPoints} pts
                  </div>
                </div>
                <div className="syw-ledger-stat">
                  <div className="text-[10px] text-stone-400">Assembly</div>
                  <div className="text-sm font-bold text-sky-300">
                    {activeFaction.assemblySupport ?? 50}%
                  </div>
                </div>
              </div>
            )}

            {activeRole && (
              <div
                id="tour-role-doctrine"
                className="syw-subcard text-xs space-y-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-serif font-bold text-amber-200 text-sm">
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
                    <span className="block text-[11px] text-stone-300 mt-0.5 leading-snug">
                      {activeCharacterGuide.playerBriefing}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab("ADVISOR");
                        handleInvokeAI(BotBehavior.ADVISOR);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/80 text-indigo-200 font-mono text-[10px] cursor-pointer transition"
                      title="Request immediate 150-word AI strategy briefing"
                    >
                      <Sparkles className="w-3 h-3 text-indigo-400" /> Consult AI
                    </button>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-stone-800 text-stone-200 border border-stone-700">
                      {activeRole.controller} • {activeRole.botBehavior}
                    </span>
                  </div>
                </div>

                {/* Character Victory Point Objectives Checklist */}
                <div
                  className="pt-2 border-t border-stone-800/80 space-y-1.5"
                  data-testid="character-objectives-panel"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-amber-300/90 font-bold">
                    <span>Your Character Objectives &amp; Victory Points</span>
                    <span className="text-stone-400">
                      Complete Goals to Score VP
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {evaluatedCharacterObjectives.map((obj) => (
                      <div
                        key={obj.id}
                        className={
                          obj.isCompleted
                            ? "syw-objective-card-completed"
                            : "syw-objective-card"
                        }
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 font-semibold text-stone-100">
                            {obj.isCompleted ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            )}
                            <span>{obj.title}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-[10px] font-mono text-stone-400">
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
                        <p className="text-[11px] text-stone-300 leading-snug pl-5">
                          {obj.description}
                        </p>
                        <div className="text-[10px] font-mono text-emerald-300/90 pl-5">
                          How to Achieve: {obj.howToComplete}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {activeRole.strategicObjective && (
                  <div
                    className="flex items-center justify-between pt-1.5 border-t border-stone-800/80 text-[11px] font-mono text-purple-300"
                    data-testid="role-strategic-objective"
                  >
                    <span>
                      Campaign:{" "}
                      {activeRole.strategicObjective.campaignName ??
                        activeRole.strategicObjective.objectiveType}
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-950 border border-purple-800 text-[10px]">
                      {activeRole.strategicObjective.status} (T
                      {activeRole.strategicObjective.targetDeadlineTurn ?? "?"})
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div
            id="tour-command-tabs"
            className="grid grid-cols-4 gap-1 bg-stone-900 p-1 rounded-xl border border-stone-800 text-xs font-semibold"
          >
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
                      ? "bg-amber-600 text-stone-950 font-bold"
                      : "text-stone-400 hover:text-stone-200"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {t.label}
                </button>
              );
            })}
          </div>

          {/* Tab Content Area */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-4 flex-1 flex flex-col justify-between">
            {activeTab === "ORDERS" && (
              <div id="tour-orders-matrix" className="space-y-4">
                <form onSubmit={handleSubmitOrder} className="space-y-3.5 text-xs">
                  <div className="flex items-center justify-between border-b border-stone-800 pb-2">
                    <div className="font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-amber-400" />
                      Issue Operational Directive ({selectedRoleType})
                    </div>
                    <span className="text-[10px] font-mono text-stone-400">
                      Active: <span className="text-amber-200 font-bold">{orderType}</span>
                    </span>
                  </div>

                  {/* Categorized Action Matrix */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-stone-400">
                      Select Order Classification &amp; Operational Objective
                    </label>

                    {/* Operational Categories Tabs / Grid */}
                    <div className="space-y-2.5">
                      {[
                        {
                          category: "Military & Naval Operations",
                          badge: "Field & Fleet",
                          color: "text-amber-300 border-amber-900/60",
                          actions: [
                            { type: "MOVE" as const, label: "March Force", desc: "Advance battalions", icon: Swords },
                            { type: "RECRUIT" as const, label: "Muster Troops", desc: "Levy provincials", icon: Users },
                            { type: "AMPHIBIOUS_ASSAULT" as const, label: "Amphibious", desc: "Landing & fleet guns", icon: Anchor },
                            { type: "RAID" as const, label: "Frontier Raid", desc: "Irregular war party", icon: Crosshair },
                          ],
                        },
                        {
                          category: "Sovereignty & Treaties",
                          badge: "Crown & Council",
                          color: "text-purple-300 border-purple-900/60",
                          actions: [
                            { type: "COVENANT_BOUNDARY" as const, label: "Covenant Line", desc: "Easton reservation", icon: ShieldCheck },
                            { type: "DECLARE_WAR" as const, label: "Declare War", desc: "Open hostilities", icon: ShieldAlert },
                            { type: "TREATY_CONFERENCE" as const, label: "Peace Congress", desc: "Convene peace talks", icon: Flag },
                          ],
                        },
                        {
                          category: "Economy & Governance",
                          badge: "Customs & Bullion",
                          color: "text-emerald-300 border-emerald-900/60",
                          actions: [
                            { type: "EXTRACT" as const, label: "Harvest Yield", desc: "Collect furs & timber", icon: Wheat },
                            { type: "TRADE" as const, label: "Merchant Convoy", desc: "Dispatch trade mission", icon: Coins },
                            { type: "SUBSIDIZE" as const, label: "Allied Subsidies", desc: "Transfer war bullion", icon: Award },
                            { type: "ASSEMBLY_NEGOTIATION" as const, label: "Assembly", desc: "Lobby legislature", icon: Landmark },
                          ],
                        },
                      ].map((cat) => (
                        <div key={cat.category} className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono text-stone-400">
                            <span className={cat.color.split(" ")[0]}>
                              {cat.category}
                            </span>
                            <span className="text-stone-500">{cat.badge}</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                            {cat.actions.map((act) => {
                              const isSelected = orderType === act.type;
                              const Icon = act.icon;
                              return (
                                <button
                                  key={act.type}
                                  type="button"
                                  onClick={() => setOrderType(act.type)}
                                  className={`p-2 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                                    isSelected
                                      ? "bg-amber-950/80 border-amber-500 ring-1 ring-amber-500/60 text-amber-100 shadow-md"
                                      : "bg-stone-950 hover:bg-stone-850 border-stone-800 text-stone-300 hover:border-stone-700"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-1 mb-1">
                                    <span className="font-semibold text-[11px] flex items-center gap-1">
                                      <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-amber-400" : "text-stone-400"}`} />
                                      {act.label}
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-stone-400 leading-tight">
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
                        className="w-full px-2.5 py-1.5 rounded bg-stone-950 border border-stone-800 text-[11px] text-stone-300"
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
                      <label className="block text-stone-400 mb-1 text-[11px]">
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
                          className="w-full px-2.5 py-2 rounded bg-stone-950 border border-stone-700 text-stone-100 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setAllocatedTreasury((prev) => Math.max(0, prev - 5))}
                          className="px-2 py-2 rounded bg-stone-850 hover:bg-stone-800 border border-stone-700 text-stone-300 font-mono cursor-pointer"
                        >
                          -5
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setAllocatedTreasury((prev) =>
                              Math.min(activeFaction?.treasury ?? 200, prev + 5)
                            )
                          }
                          className="px-2 py-2 rounded bg-stone-850 hover:bg-stone-800 border border-stone-700 text-stone-300 font-mono cursor-pointer"
                        >
                          +5
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-stone-400 mb-1 text-[11px]">
                        Source Theater Node (Staging Base)
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={selectedNode?.name ?? ""}
                        className="w-full px-2.5 py-2 rounded bg-stone-950/80 border border-stone-800 text-amber-300 font-semibold"
                      />
                    </div>
                  </div>

                  {/* Target Corridor Node with Adjacent Quick-Pills */}
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-stone-400 text-[11px]">
                      Target Corridor Node (Operational Destination)
                    </label>

                    {adjacentNodes.length > 0 && (
                      <div className="space-y-1 bg-stone-950/60 p-2 rounded-lg border border-stone-850">
                        <div className="text-[10px] font-mono uppercase text-stone-400 flex items-center justify-between">
                          <span>Connected Adjacent Corridors:</span>
                          <span className="text-stone-500">1-Click Quick Select</span>
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
                                className={`px-2 py-1 rounded text-[11px] font-mono border transition cursor-pointer flex items-center gap-1 ${
                                  isTarget
                                    ? "bg-amber-600 text-stone-950 font-bold border-amber-400 shadow-sm"
                                    : "bg-stone-950 hover:bg-stone-850 text-stone-200 border-stone-750"
                                }`}
                              >
                                <span>{adj.name}</span>
                                {isFrozen && (
                                  <span title="Winter Freeze (2.5x Cost)">❄</span>
                                )}
                                {isHurricane && (
                                  <span title="Hurricane Risk (1.75x Cost)">🌀</span>
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
                      className="w-full px-2.5 py-2 rounded bg-stone-950 border border-stone-700 text-stone-100 text-xs"
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
                    <label className="block text-stone-400 mb-1 text-[11px]">
                      Strategic Reasoning (&le;100 chars)
                    </label>
                    <input
                      type="text"
                      maxLength={100}
                      value={reasoning}
                      onChange={(e) => setReasoning(e.target.value)}
                      className="w-full px-2.5 py-2 rounded bg-stone-950 border border-stone-700 text-stone-100 text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full py-2.5 rounded-lg font-bold bg-amber-600 hover:bg-amber-500 text-stone-950 transition cursor-pointer shadow-lg hover:shadow-amber-900/30 flex items-center justify-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Commit Order to Turn {game.turnNumber} Queue
                  </button>
                </form>

                {/* Queued Orders List */}
                <div className="border-t border-stone-800 pt-3">
                  <div className="text-[11px] font-mono uppercase text-stone-400 mb-2 flex items-center justify-between">
                    <span>
                      Turn {game.turnNumber} Queued Orders ({game.orders?.length ?? 0})
                    </span>
                    <span className="text-stone-500 text-[10px]">
                      Phase: {game.currentPhase}
                    </span>
                  </div>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 font-mono text-[11px]">
                    {game.orders?.slice(0, 10).map((o: any) => (
                      <div
                        key={o.id}
                        className="p-2 rounded bg-stone-950 border border-stone-800 text-xs flex items-center justify-between"
                      >
                        <div>
                          <span className="font-mono font-bold text-amber-300">
                            [{o.orderType}]
                          </span>{" "}
                          <span className="text-stone-300">
                            {o.payload?.reasoning || "Tactical directive"}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                            o.isExecuted
                              ? "bg-emerald-950 text-emerald-300"
                              : "bg-amber-950 text-amber-300"
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
                  <div className="font-bold uppercase tracking-wider text-amber-300">
                    Token-Bounded DeepSeek AI Controller (O(1) ~1,500 Token Budget)
                  </div>
                  <p className="text-stone-400">
                    Autonomous Executive seats route to{" "}
                    <code className="text-purple-300">
                      deepseek-v4-pro (thinking: enabled)
                    </code>
                    . Military, Commercial, and Advisor briefings route to{" "}
                    <code className="text-cyan-300">
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
                    className="py-2.5 px-3 rounded-lg font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition cursor-pointer"
                  >
                    Request 150-Word Advisor Briefing
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleInvokeAI(BotBehavior.AUTONOMOUS)}
                    data-testid="btn-generate-autonomous-orders"
                    className="py-2.5 px-3 rounded-lg font-bold bg-purple-600 hover:bg-purple-500 text-white transition cursor-pointer"
                  >
                    Execute Autonomous JSON Orders
                  </button>
                </div>

                {aiResponse && (
                  <div className="bg-stone-950 border border-stone-800 rounded-lg p-3 space-y-2.5 max-h-80 overflow-y-auto">
                    <div className="flex items-center justify-between border-b border-stone-800 pb-2 font-mono text-[11px]">
                      <span className="text-amber-300 font-bold">
                        Model: {aiResponse.modelConfig?.model} (thinking:{" "}
                        {aiResponse.modelConfig?.extra_body?.thinking?.type})
                      </span>
                      <span className="text-emerald-300">
                        Prompt Budget: {aiResponse.estimatedPromptTokens} tokens
                        (Top {aiResponse.contextPayload?.recentActiveEvents?.length ?? 0}{" "}
                        active events)
                      </span>
                    </div>

                    {aiResponse.reasoningScratchpad && (
                      <div className="p-2 rounded bg-purple-950/40 border border-purple-800/60 text-purple-200 font-mono text-[11px]">
                        {aiResponse.reasoningScratchpad}
                      </div>
                    )}

                    {aiResponse.advisorBriefing && (
                      <div className="text-stone-200 leading-relaxed font-serif text-sm">
                        {aiResponse.advisorBriefing}
                      </div>
                    )}

                    {aiResponse.orders && (
                      <pre className="text-[11px] font-mono text-cyan-200 overflow-x-auto bg-stone-900 p-2 rounded">
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
                  <div className="font-bold uppercase tracking-wider text-amber-300">
                    Asynchronous Diplomatic Courier Service
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-400 mb-1">
                        Recipient Faction
                      </label>
                      <select
                        value={dispatchTargetFactionId}
                        onChange={(e) =>
                          setDispatchTargetFactionId(e.target.value)
                        }
                        className="w-full px-2.5 py-2 rounded bg-stone-950 border border-stone-700 text-stone-100"
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
                      <label className="block text-stone-400 mb-1">
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
                        className="w-full px-2.5 py-2 rounded bg-stone-950 border border-stone-700 text-stone-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-stone-400 mb-1">
                      Encrypted Diplomatic Missive
                    </label>
                    <textarea
                      rows={3}
                      value={dispatchContent}
                      onChange={(e) => setDispatchContent(e.target.value)}
                      className="w-full px-2.5 py-2 rounded bg-stone-950 border border-stone-700 text-stone-100"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="submit"
                      disabled={isPending}
                      className="py-2 rounded-lg font-bold bg-amber-600 hover:bg-amber-500 text-stone-950 cursor-pointer"
                    >
                      Send Courier Packet
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={handleSignTreaty}
                      className="py-2 rounded-lg font-bold bg-emerald-700 hover:bg-emerald-600 text-white cursor-pointer"
                    >
                      Ratify Peace Treaty (Supersede War)
                    </button>
                  </div>
                </form>

                <div className="border-t border-stone-800 pt-3">
                  <div className="text-[11px] font-mono uppercase text-stone-400 mb-2">
                    Courier Dispatches ({game.dispatches?.length ?? 0})
                  </div>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto">
                    {game.dispatches?.map((d: any) => (
                      <div
                        key={d.id}
                        className="p-2 rounded bg-stone-950 border border-stone-800 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between font-mono text-[10px]">
                          <span className="text-amber-300">
                            Delay: {d.courierDelay}t • Remaining:{" "}
                            {d.turnsRemaining}t
                          </span>
                          <span
                            className={
                              d.intercepted
                                ? "text-red-400"
                                : d.turnsRemaining === 0
                                ? "text-emerald-400"
                                : "text-sky-400"
                            }
                          >
                            {d.intercepted
                              ? "INTERCEPTED"
                              : d.turnsRemaining === 0
                              ? "DELIVERED"
                              : "IN TRANSIT"}
                          </span>
                        </div>
                        <p className="text-stone-300">{d.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "CHRONICLE" && (
              <div id="tour-chronicle-sql" className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-amber-300">
                    Deterministic SQL Event Ledger
                  </span>
                  <span className="text-[11px] font-mono text-stone-400">
                    ACTIVE vs SUPERSEDED / EXPIRED
                  </span>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {game.events?.map((ev: any) => {
                    const isActive = ev.status === EventStatus.ACTIVE;
                    return (
                      <div
                        key={ev.id}
                        className={`p-2.5 rounded-lg border ${
                          isActive
                            ? "bg-stone-950 border-stone-800"
                            : "bg-stone-950/40 border-stone-900 opacity-60"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-stone-100">
                            [Turn {ev.turnRecorded}] {ev.title}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono ${
                              ev.status === EventStatus.ACTIVE
                                ? "bg-emerald-950 text-emerald-300 border border-emerald-700/60"
                                : ev.status === EventStatus.SUPERSEDED
                                ? "bg-purple-950 text-purple-300 border border-purple-700/60"
                                : "bg-stone-800 text-stone-400"
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
                        <p className="text-stone-400 mt-1">{ev.description}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[10px] font-mono text-stone-500">
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
