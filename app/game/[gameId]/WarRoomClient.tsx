"use client";

import React, { useState, useTransition, useMemo } from "react";
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
} from "lucide-react";

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

  const selectedNode = useMemo(
    () =>
      game.nodes.find((n: any) => n.id === selectedNodeId) ??
      activeFaction?.nodesControlled?.[0] ??
      game.nodes[0],
    [game.nodes, selectedNodeId, activeFaction]
  );

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
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col">
      {/* Top Imperial Command Header */}
      <header className="border-b border-stone-800 bg-stone-900/95 px-6 py-3.5">
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
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-amber-200 border border-stone-700 transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5" /> Next Phase
            </button>

            <button
              type="button"
              disabled={isPending}
              onClick={handleExecuteFullTurn}
              data-testid="warroom-resolve-turn"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-stone-950 transition cursor-pointer"
            >
              <FastForward className="w-3.5 h-3.5" /> Resolve Full Turn
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
      <div className="bg-stone-900/60 border-b border-stone-800/80 px-6 py-2">
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
        <div className="lg:col-span-7 flex flex-col gap-4">
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

          <div className="h-[560px]">
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
            <div className="bg-stone-900/80 border border-stone-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
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
            </div>
          )}

          {/* Live Tactical Combat & Weather Attrition Telemetry Feed */}
          {combatLogs.length > 0 && (
            <div
              className="bg-stone-900/90 border border-amber-800/50 rounded-xl p-3.5 space-y-2 text-xs"
              data-testid="tactical-combat-attrition-feed"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold uppercase tracking-wider text-amber-300 text-[11px]">
                  Tactical Resolution &amp; Weather Attrition Telemetry ({combatLogs.length})
                </span>
                <button
                  type="button"
                  onClick={() => setCombatLogs([])}
                  className="text-[10px] text-stone-400 hover:text-stone-200 font-mono"
                >
                  Clear Feed
                </button>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto font-mono text-[11px]">
                {combatLogs.map((log, i) => (
                  <div
                    key={i}
                    className={`px-2.5 py-1 rounded border ${
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
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Faction & Role Command Console */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Active Faction & Role Selector Card */}
          <div className="bg-stone-900/90 border border-stone-800 rounded-xl p-4 space-y-3">
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
              <div className="grid grid-cols-5 gap-2 pt-1 text-xs font-mono">
                <div className="bg-stone-950 p-2 rounded border border-stone-800">
                  <div className="text-[10px] text-stone-400 flex items-center gap-1">
                    <Coins className="w-3 h-3 text-amber-400" /> Treasury
                  </div>
                  <div className="text-sm font-bold text-amber-300">
                    {activeFaction.treasury} £
                  </div>
                </div>
                <div className="bg-stone-950 p-2 rounded border border-stone-800">
                  <div className="text-[10px] text-stone-400">Debt</div>
                  <div className="text-sm font-bold text-red-300">
                    {activeFaction.debt} £
                  </div>
                </div>
                <div className="bg-stone-950 p-2 rounded border border-stone-800">
                  <div className="text-[10px] text-stone-400 flex items-center gap-1">
                    <Flame className="w-3 h-3 text-orange-400" /> Unrest
                  </div>
                  <div className="text-sm font-bold text-orange-300">
                    {activeFaction.unrestIndex}%
                  </div>
                </div>
                <div className="bg-stone-950 p-2 rounded border border-stone-800">
                  <div className="text-[10px] text-stone-400 flex items-center gap-1">
                    <Award className="w-3 h-3 text-emerald-400" /> Standing
                  </div>
                  <div className="text-sm font-bold text-emerald-300">
                    {activeFaction.standingPoints} pts
                  </div>
                </div>
                <div className="bg-stone-950 p-2 rounded border border-stone-800">
                  <div className="text-[10px] text-stone-400">Assembly</div>
                  <div className="text-sm font-bold text-sky-300">
                    {activeFaction.assemblySupport ?? 50}%
                  </div>
                </div>
              </div>
            )}

            {activeRole && (
              <div className="text-xs bg-stone-950/90 px-3 py-2 rounded border border-stone-800/90 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-amber-200">
                      {activeRole.title}
                    </span>
                    <span className="block text-[11px] text-stone-400 truncate max-w-xs">
                      {activeRole.aiPersonaPrompt}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-stone-800 text-stone-200 border border-stone-700">
                    {activeRole.controller} • {activeRole.botBehavior}
                  </span>
                </div>
                {activeRole.strategicObjective && (
                  <div
                    className="flex items-center justify-between pt-1 border-t border-stone-800/80 text-[11px] font-mono text-purple-300"
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
          <div className="grid grid-cols-4 gap-1 bg-stone-900 p-1 rounded-xl border border-stone-800 text-xs font-semibold">
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
              <div className="space-y-4">
                <form onSubmit={handleSubmitOrder} className="space-y-3 text-xs">
                  <div className="font-bold uppercase tracking-wider text-amber-300">
                    Issue Tactical / Economic Order ({selectedRoleType})
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-400 mb-1">
                        Order Type
                      </label>
                      <select
                        value={orderType}
                        onChange={(e) =>
                          setOrderType(e.target.value as any)
                        }
                        className="w-full px-2.5 py-2 rounded bg-stone-950 border border-stone-700 text-stone-100"
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
                    <div>
                      <label className="block text-stone-400 mb-1">
                        Allocated Treasury (£)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={activeFaction?.treasury ?? 200}
                        value={allocatedTreasury}
                        onChange={(e) =>
                          setAllocatedTreasury(Number(e.target.value))
                        }
                        className="w-full px-2.5 py-2 rounded bg-stone-950 border border-stone-700 text-stone-100"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-stone-400 mb-1">
                        Source Node (Click Map to Select)
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={selectedNode?.name ?? ""}
                        className="w-full px-2.5 py-2 rounded bg-stone-950/60 border border-stone-800 text-amber-300"
                      />
                    </div>
                    <div>
                      <label className="block text-stone-400 mb-1">
                        Target Corridor Node
                      </label>
                      <select
                        value={targetNodeId}
                        onChange={(e) => setTargetNodeId(e.target.value)}
                        className="w-full px-2.5 py-2 rounded bg-stone-950 border border-stone-700 text-stone-100"
                      >
                        <option value="">Adjacent Default</option>
                        {game.nodes.map((n: any) => (
                          <option key={n.id} value={n.id}>
                            {n.name} ({n.region})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-stone-400 mb-1">
                      Strategic Reasoning (&le;100 chars)
                    </label>
                    <input
                      type="text"
                      maxLength={100}
                      value={reasoning}
                      onChange={(e) => setReasoning(e.target.value)}
                      className="w-full px-2.5 py-2 rounded bg-stone-950 border border-stone-700 text-stone-100"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full py-2.5 rounded-lg font-bold bg-amber-600 hover:bg-amber-500 text-stone-950 transition cursor-pointer"
                  >
                    Commit Order to Turn {game.turnNumber} Queue
                  </button>
                </form>

                {/* Queued Orders List */}
                <div className="border-t border-stone-800 pt-3">
                  <div className="text-[11px] font-mono uppercase text-stone-400 mb-2">
                    Turn {game.turnNumber} Queued Orders ({game.orders?.length ?? 0})
                  </div>
                  <div className="space-y-1.5 max-h-44 overflow-y-auto">
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
              <div className="space-y-4 text-xs">
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
              <div className="space-y-4 text-xs">
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
              <div className="space-y-3 text-xs">
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
    </div>
  );
}
