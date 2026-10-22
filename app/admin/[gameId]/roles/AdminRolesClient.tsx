"use client";

import React, { useState, useTransition } from "react";
import {
  BotBehavior,
  ControllerType,
  FactionType,
  Phase,
  RoleType,
} from "@prisma/client";
import {
  toggleRoleControllerAction,
  setRoleBotBehaviorAction,
  updateRolePersonaAction,
  recalculateLedgersAction,
  injectOffMapEventAction,
  forceResolveTurnAction,
} from "./actions";
import {
  Bot,
  User,
  Sliders,
  Play,
  Globe,
  Calculator,
  Sparkles,
  Cpu,
  Shield,
  Crown,
  Scale,
  Check,
  X,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";

interface RoleData {
  id: string;
  roleType: RoleType;
  title: string;
  controller: ControllerType;
  botBehavior: BotBehavior;
  assignedUserId: string | null;
  aiPersonaPrompt: string | null;
}

interface FactionData {
  id: string;
  type: FactionType;
  treasury: number;
  debt: number;
  unrestIndex: number;
  standingPoints: number;
  roles: RoleData[];
}

interface AdminRolesClientProps {
  game: {
    id: string;
    name: string;
    currentYear: number;
    currentSeason: string;
    currentPhase: Phase;
    turnNumber: number;
    offMapModifiers: any;
  };
  initialFactions: FactionData[];
}

const FACTION_LABELS: Record<
  FactionType,
  { name: string; group: "European Powers" | "Native American Confederations"; badgeColor: string }
> = {
  GREAT_BRITAIN: {
    name: "Great Britain",
    group: "European Powers",
    badgeColor: "bg-red-950/80 text-red-200 border-red-700/60",
  },
  FRANCE: {
    name: "Kingdom of France",
    group: "European Powers",
    badgeColor: "bg-blue-950/80 text-blue-200 border-blue-700/60",
  },
  SPAIN: {
    name: "Spanish Empire",
    group: "European Powers",
    badgeColor: "bg-amber-950/80 text-amber-200 border-amber-700/60",
  },
  PORTUGAL: {
    name: "Kingdom of Portugal",
    group: "European Powers",
    badgeColor: "bg-emerald-950/80 text-emerald-200 border-emerald-700/60",
  },
  DUTCH_REPUBLIC: {
    name: "Dutch Republic",
    group: "European Powers",
    badgeColor: "bg-orange-950/80 text-orange-200 border-orange-700/60",
  },
  GERMAN_STATES: {
    name: "German States (Prussia/Austria)",
    group: "European Powers",
    badgeColor: "bg-slate-800 text-slate-200 border-slate-600",
  },
  HAUDENOSAUNEE: {
    name: "Haudenosaunee Confederacy",
    group: "Native American Confederations",
    badgeColor: "bg-purple-950/80 text-purple-200 border-purple-700/60",
  },
  SEVEN_NATIONS: {
    name: "Seven Nations of Canada",
    group: "Native American Confederations",
    badgeColor: "bg-sky-950/80 text-sky-200 border-sky-700/60",
  },
  WESTERN_CONFEDERACY: {
    name: "Western Confederacy",
    group: "Native American Confederations",
    badgeColor: "bg-green-950/80 text-green-200 border-green-700/60",
  },
  SOUTHEASTERN_NATIONS: {
    name: "Southeastern Nations",
    group: "Native American Confederations",
    badgeColor: "bg-yellow-950/80 text-yellow-200 border-yellow-700/60",
  },
};

const ROLE_ORDER: RoleType[] = [
  RoleType.EXECUTIVE,
  RoleType.MILITARY,
  RoleType.DIPLOMATIC_COMMERCE,
];

export default function AdminRolesClient({
  game,
  initialFactions,
}: AdminRolesClientProps) {
  const [factions, setFactions] = useState<FactionData[]>(initialFactions);
  const [turnMeta, setTurnMeta] = useState({
    turnNumber: game.turnNumber,
    currentSeason: game.currentSeason,
    currentYear: game.currentYear,
    currentPhase: game.currentPhase,
  });
  const [isPending, startTransition] = useTransition();
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Persona Modal State
  const [editingRole, setEditingRole] = useState<{
    role: RoleData;
    factionName: string;
  } | null>(null);
  const [personaDraft, setPersonaDraft] = useState("");
  const [assignedUserDraft, setAssignedUserDraft] = useState("");

  // Off-Map Event Modal State
  const [showOffMapModal, setShowOffMapModal] = useState(false);
  const [offMapTheater, setOffMapTheater] = useState<
    "EUROPE" | "INDIA" | "WEST_AFRICA"
  >("EUROPE");
  const [offMapTitle, setOffMapTitle] = useState(
    "Prussian Victory at Rossbach & Westminster Subsidy Surge"
  );
  const [offMapDesc, setOffMapDesc] = useState(
    "Frederick the Great routs the Franco-Imperial army; French treasury drained by continental commitments while German auxiliaries reinforce British America."
  );
  const [offMapFaction, setOffMapFaction] = useState<FactionType>(
    FactionType.FRANCE
  );
  const [offMapTreasuryDelta, setOffMapTreasuryDelta] = useState<number>(-30);
  const [offMapUnrestDelta, setOffMapUnrestDelta] = useState<number>(6);

  const handleToggleController = (
    roleId: string,
    targetController: ControllerType
  ) => {
    startTransition(async () => {
      const updated = await toggleRoleControllerAction(
        roleId,
        targetController
      );
      setFactions((prev) =>
        prev.map((f) => ({
          ...f,
          roles: f.roles.map((r) =>
            r.id === roleId
              ? {
                  ...r,
                  controller: updated.controller,
                  botBehavior: updated.botBehavior,
                }
              : r
          ),
        }))
      );
      setStatusBanner(
        `Updated seat "${updated.title}" to ${updated.controller} (${updated.botBehavior}).`
      );
    });
  };

  const handleSetBotBehavior = (roleId: string, behavior: BotBehavior) => {
    startTransition(async () => {
      const updated = await setRoleBotBehaviorAction(roleId, behavior);
      setFactions((prev) =>
        prev.map((f) => ({
          ...f,
          roles: f.roles.map((r) =>
            r.id === roleId
              ? {
                  ...r,
                  controller: updated.controller,
                  botBehavior: updated.botBehavior,
                }
              : r
          ),
        }))
      );
      setStatusBanner(
        `Configured bot behavior for "${updated.title}" -> ${updated.botBehavior}.`
      );
    });
  };

  const openPersonaEditor = (role: RoleData, factionName: string) => {
    setEditingRole({ role, factionName });
    setPersonaDraft(role.aiPersonaPrompt ?? "");
    setAssignedUserDraft(role.assignedUserId ?? "");
  };

  const handleSavePersona = () => {
    if (!editingRole) return;
    const roleId = editingRole.role.id;
    startTransition(async () => {
      const updated = await updateRolePersonaAction(
        roleId,
        personaDraft,
        assignedUserDraft || null
      );
      setFactions((prev) =>
        prev.map((f) => ({
          ...f,
          roles: f.roles.map((r) =>
            r.id === roleId
              ? {
                  ...r,
                  aiPersonaPrompt: updated.aiPersonaPrompt,
                  assignedUserId: updated.assignedUserId,
                }
              : r
          ),
        }))
      );
      setEditingRole(null);
      setStatusBanner(`Saved custom persona prompt for "${updated.title}".`);
    });
  };

  const handleRecalculateLedgers = () => {
    startTransition(async () => {
      const updatedList = await recalculateLedgersAction(game.id);
      setFactions((prev) =>
        prev.map((f) => {
          const match = updatedList.find((u) => u.id === f.id);
          return match
            ? {
                ...f,
                treasury: match.treasury,
                debt: match.debt,
                unrestIndex: match.unrestIndex,
                standingPoints: match.standingPoints,
              }
            : f;
        })
      );
      setStatusBanner(
        "Recalculated all 10 faction ledgers from node yields, naval/army upkeep, debt interest, and off-map modifiers."
      );
    });
  };

  const handleForceResolveTurn = () => {
    startTransition(async () => {
      const res: any = await forceResolveTurnAction(game.id);
      if (res?.game) {
        setTurnMeta({
          turnNumber: res.game.turnNumber,
          currentSeason: res.game.currentSeason,
          currentYear: res.game.currentYear,
          currentPhase: res.game.currentPhase,
        });
      } else if (res?.turnNumber) {
        setTurnMeta({
          turnNumber: res.turnNumber,
          currentSeason: res.currentSeason,
          currentYear: res.currentYear,
          currentPhase: res.currentPhase,
        });
      }
      const refreshedLedgers = await recalculateLedgersAction(game.id);
      setFactions((prev) =>
        prev.map((f) => {
          const match = refreshedLedgers.find((u) => u.id === f.id);
          return match
            ? {
                ...f,
                treasury: match.treasury,
                debt: match.debt,
                unrestIndex: match.unrestIndex,
                standingPoints: match.standingPoints,
              }
            : f;
        })
      );
      setStatusBanner(
        `Force resolved turn! Advanced campaign to Turn ${
          res?.game?.turnNumber ?? res?.turnNumber ?? turnMeta.turnNumber + 1
        } (${res?.game?.currentSeason ?? res?.currentSeason ?? ""}).`
      );
    });
  };

  const handleInjectOffMapSubmit = () => {
    startTransition(async () => {
      const ev = await injectOffMapEventAction(game.id, {
        theater: offMapTheater,
        title: offMapTitle,
        description: offMapDesc,
        targetFactionType: offMapFaction,
        treasuryDelta: Number(offMapTreasuryDelta),
        unrestDelta: Number(offMapUnrestDelta),
      });
      const updatedList = await recalculateLedgersAction(game.id);
      setFactions((prev) =>
        prev.map((f) => {
          const match = updatedList.find((u) => u.id === f.id);
          return match
            ? {
                ...f,
                treasury: match.treasury,
                debt: match.debt,
                unrestIndex: match.unrestIndex,
                standingPoints: match.standingPoints,
              }
            : f;
        })
      );
      setShowOffMapModal(false);
      setStatusBanner(`Injected Off-Map Event: "${ev.title}"`);
    });
  };

  const getRoleIcon = (roleType: RoleType) => {
    switch (roleType) {
      case RoleType.EXECUTIVE:
        return <Crown className="w-4 h-4 text-amber-400" />;
      case RoleType.MILITARY:
        return <Shield className="w-4 h-4 text-red-400" />;
      case RoleType.DIPLOMATIC_COMMERCE:
        return <Scale className="w-4 h-4 text-emerald-400" />;
    }
  };

  const getModelBadge = (role: RoleData) => {
    if (role.controller === ControllerType.HUMAN) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-stone-800 text-stone-300 border border-stone-700">
          <User className="w-3 h-3" /> Human Seat
        </span>
      );
    }
    if (
      role.botBehavior === BotBehavior.AUTONOMOUS &&
      role.roleType === RoleType.EXECUTIVE
    ) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-purple-950/90 text-purple-200 border border-purple-700/70">
          <Sparkles className="w-3 h-3 text-purple-400" /> deepseek-v4-pro
          (Thinking)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono bg-cyan-950/90 text-cyan-200 border border-cyan-700/70">
        <Cpu className="w-3 h-3 text-cyan-400" /> deepseek-flash (
        {role.botBehavior === BotBehavior.AUTONOMOUS ? "JSON" : "150w Memo"})
      </span>
    );
  };

  return (
    <div className="syw-shell p-6">
      <div className="max-w-7xl mx-auto space-y-6 w-full">
        {/* Top Header & Navigation */}
        <div className="syw-header rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Link
                href={`/game/${game.id}`}
                className="syw-btn-secondary"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Return to War Room Map
              </Link>
              <span className="text-xs font-mono uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 font-bold">
                Turn {turnMeta.turnNumber} • {turnMeta.currentSeason}{" "}
                {turnMeta.currentYear} • {turnMeta.currentPhase}
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-serif font-bold tracking-tight text-amber-50 mt-2">
              Game Master Control &amp; Role Seating Matrix
            </h1>
            <p className="text-sm text-amber-200/80">
              {game.name} — Configure Human vs. AI Controller seats (10 Factions ×
              3 Roles = 30 Seats) &amp; Hybrid DeepSeek Routing
            </p>
          </div>

          {/* 5. Turn Control Panel */}
          <div className="flex flex-wrap items-center gap-2.5 bg-slate-950/80 p-3 rounded-xl border border-amber-500/40">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-200 mr-1">
              Turn Control:
            </span>
            <button
              type="button"
              disabled={isPending}
              onClick={handleForceResolveTurn}
              data-testid="btn-force-resolve-turn"
              className="syw-btn-primary"
            >
              <Play className="w-3.5 h-3.5" /> Force Resolve Turn
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setShowOffMapModal(true)}
              data-testid="btn-inject-offmap-event"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-indigo-900 hover:bg-indigo-800 text-indigo-100 border border-indigo-500/60 transition disabled:opacity-50 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" /> Inject Off-Map Event
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={handleRecalculateLedgers}
              data-testid="btn-recalculate-ledgers"
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-900 hover:bg-emerald-800 text-emerald-100 border border-emerald-500/60 transition disabled:opacity-50 cursor-pointer"
            >
              <Calculator className="w-3.5 h-3.5" /> Recalculate Ledgers
            </button>
          </div>
        </div>

        {/* Status Feedback Banner */}
        {statusBanner && (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-amber-950/60 border border-amber-700/60 text-amber-200 text-xs">
            <div className="flex items-center gap-2">
              {isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
              ) : (
                <Check className="w-4 h-4 text-emerald-400" />
              )}
              <span>{statusBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-stone-400 hover:text-stone-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Responsive Table / Faction Grid for all 10 Factions and their 3 Roles */}
        <div className="bg-stone-900/70 border border-stone-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-stone-800 bg-stone-900/95 text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                  <th className="py-3.5 px-4">Faction & Imperial Ledger</th>
                  <th className="py-3.5 px-4">Role & Historical Title</th>
                  <th className="py-3.5 px-4">Controller Selector</th>
                  <th className="py-3.5 px-4">Bot Mode Selector</th>
                  <th className="py-3.5 px-4">DeepSeek Model Tier</th>
                  <th className="py-3.5 px-4 text-right">AI Persona Prompt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800/70 text-sm">
                {factions.map((faction) => {
                  const meta = FACTION_LABELS[faction.type];
                  const sortedRoles = [...faction.roles].sort(
                    (a, b) =>
                      ROLE_ORDER.indexOf(a.roleType) -
                      ROLE_ORDER.indexOf(b.roleType)
                  );

                  return sortedRoles.map((role, idx) => (
                    <tr
                      key={role.id}
                      data-testid={`role-row-${faction.type}-${role.roleType}`}
                      className="hover:bg-stone-800/40 transition-colors"
                    >
                      {idx === 0 && (
                        <td
                          rowSpan={sortedRoles.length}
                          className="py-4 px-4 align-top border-r border-stone-800/80 bg-stone-950/40 w-64"
                        >
                          <div className="space-y-2">
                            <span className="text-[10px] uppercase tracking-widest text-stone-400 block">
                              {meta.group}
                            </span>
                            <div
                              className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${meta.badgeColor}`}
                            >
                              {meta.name}
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 pt-2 text-xs font-mono">
                              <div className="bg-stone-900 px-2 py-1 rounded border border-stone-800">
                                <span className="text-stone-400 block text-[10px]">
                                  Treasury
                                </span>
                                <span className="text-amber-300 font-bold">
                                  {faction.treasury} £
                                </span>
                              </div>
                              <div className="bg-stone-900 px-2 py-1 rounded border border-stone-800">
                                <span className="text-stone-400 block text-[10px]">
                                  Debt
                                </span>
                                <span className="text-red-300 font-bold">
                                  {faction.debt} £
                                </span>
                              </div>
                              <div className="bg-stone-900 px-2 py-1 rounded border border-stone-800">
                                <span className="text-stone-400 block text-[10px]">
                                  Unrest
                                </span>
                                <span className="text-orange-300 font-bold">
                                  {faction.unrestIndex}%
                                </span>
                              </div>
                              <div className="bg-stone-900 px-2 py-1 rounded border border-stone-800">
                                <span className="text-stone-400 block text-[10px]">
                                  Standing
                                </span>
                                <span className="text-emerald-300 font-bold">
                                  {faction.standingPoints} pts
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Role & Title */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="flex items-center gap-2">
                          {getRoleIcon(role.roleType)}
                          <span className="text-xs font-mono font-semibold uppercase tracking-wider text-stone-300">
                            {role.roleType}
                          </span>
                        </div>
                        <div className="text-xs text-stone-400 mt-0.5 font-medium">
                          {role.title}
                        </div>
                      </td>

                      {/* 2. Controller Selector: Segmented control for HUMAN vs COMPUTER */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="inline-flex rounded-lg p-0.5 bg-stone-950 border border-stone-800">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              handleToggleController(
                                role.id,
                                ControllerType.HUMAN
                              )
                            }
                            data-testid={`btn-human-${role.id}`}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                              role.controller === ControllerType.HUMAN
                                ? "bg-amber-600 text-stone-950 font-bold shadow"
                                : "text-stone-400 hover:text-stone-200"
                            }`}
                          >
                            <User className="w-3 h-3" /> HUMAN
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() =>
                              handleToggleController(
                                role.id,
                                ControllerType.COMPUTER
                              )
                            }
                            data-testid={`btn-computer-${role.id}`}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                              role.controller === ControllerType.COMPUTER
                                ? "bg-cyan-600 text-stone-950 font-bold shadow"
                                : "text-stone-400 hover:text-stone-200"
                            }`}
                          >
                            <Bot className="w-3 h-3" /> COMPUTER
                          </button>
                        </div>
                      </td>

                      {/* 3. Bot Mode Selector: When COMPUTER is selected, enable ADVISOR or AUTONOMOUS */}
                      <td className="py-3.5 px-4 align-middle">
                        <div
                          className={`inline-flex rounded-lg p-0.5 bg-stone-950 border border-stone-800 ${
                            role.controller === ControllerType.HUMAN
                              ? "opacity-40 pointer-events-none"
                              : ""
                          }`}
                        >
                          <button
                            type="button"
                            disabled={
                              isPending ||
                              role.controller === ControllerType.HUMAN
                            }
                            onClick={() =>
                              handleSetBotBehavior(role.id, BotBehavior.ADVISOR)
                            }
                            data-testid={`btn-advisor-${role.id}`}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                              role.botBehavior === BotBehavior.ADVISOR
                                ? "bg-indigo-600 text-white font-semibold shadow"
                                : "text-stone-400 hover:text-stone-200"
                            }`}
                          >
                            ADVISOR
                          </button>
                          <button
                            type="button"
                            disabled={
                              isPending ||
                              role.controller === ControllerType.HUMAN
                            }
                            onClick={() =>
                              handleSetBotBehavior(
                                role.id,
                                BotBehavior.AUTONOMOUS
                              )
                            }
                            data-testid={`btn-autonomous-${role.id}`}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                              role.botBehavior === BotBehavior.AUTONOMOUS
                                ? "bg-purple-600 text-white font-semibold shadow"
                                : "text-stone-400 hover:text-stone-200"
                            }`}
                          >
                            AUTONOMOUS
                          </button>
                        </div>
                      </td>

                      {/* Model Tier indicator */}
                      <td className="py-3.5 px-4 align-middle">
                        {getModelBadge(role)}
                      </td>

                      {/* 4. Persona Editor Modal Trigger */}
                      <td className="py-3.5 px-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className="text-xs text-stone-400 max-w-[200px] truncate hidden lg:inline-block"
                            title={role.aiPersonaPrompt ?? ""}
                          >
                            {role.aiPersonaPrompt || "Default historical doctrine"}
                          </span>
                          <button
                            type="button"
                            onClick={() => openPersonaEditor(role, meta.name)}
                            data-testid={`btn-persona-${role.id}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-stone-800 hover:bg-stone-700 text-amber-200 border border-stone-700 transition cursor-pointer"
                          >
                            <Sliders className="w-3.5 h-3.5" /> Edit Persona
                          </button>
                        </div>
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Persona Editor Modal */}
        {editingRole && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
            <div className="bg-stone-900 border border-stone-700 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div>
                  <span className="text-xs font-mono uppercase text-amber-400">
                    {editingRole.factionName} • {editingRole.role.roleType}
                  </span>
                  <h3 className="text-lg font-bold text-stone-100">
                    {editingRole.role.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="text-stone-400 hover:text-stone-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-300 mb-1">
                    Assigned Player ID / Handle (Optional)
                  </label>
                  <input
                    type="text"
                    value={assignedUserDraft}
                    onChange={(e) => setAssignedUserDraft(e.target.value)}
                    placeholder="e.g., player_pitt_1756"
                    className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-stone-300 mb-1">
                    Custom AI Persona & Strategic Doctrine Prompt
                  </label>
                  <textarea
                    rows={4}
                    value={personaDraft}
                    onChange={(e) => setPersonaDraft(e.target.value)}
                    placeholder="Prussia-leaning; minimize naval expenditure; aggressively subsidize inland raids"
                    data-testid="textarea-persona-prompt"
                    className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[11px] text-stone-400 mt-1">
                    Injected directly into the constant O(1) system prompt for{" "}
                    {editingRole.role.roleType === RoleType.EXECUTIVE
                      ? "deepseek-v4-pro (Thinking)"
                      : "deepseek-flash"}{" "}
                    during Advisor briefings and Autonomous order generation.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-stone-800 hover:bg-stone-700 text-stone-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleSavePersona}
                  data-testid="btn-save-persona"
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-stone-950 cursor-pointer"
                >
                  Save Persona Configuration
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Off-Map Event Injection Modal */}
        {showOffMapModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
            <div className="bg-stone-900 border border-stone-700 rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div>
                  <span className="text-xs font-mono uppercase text-indigo-400">
                    Off-Map Abstractor Override
                  </span>
                  <h3 className="text-lg font-bold text-stone-100">
                    Inject Global Theater Event (Europe / India / West Africa)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowOffMapModal(false)}
                  className="text-stone-400 hover:text-stone-200"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-stone-300 mb-1">
                      Off-Map Theater
                    </label>
                    <select
                      value={offMapTheater}
                      onChange={(e) =>
                        setOffMapTheater(
                          e.target.value as "EUROPE" | "INDIA" | "WEST_AFRICA"
                        )
                      }
                      className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 text-sm text-stone-100"
                    >
                      <option value="EUROPE">Europe (Silesia / Hanover / Minorca)</option>
                      <option value="INDIA">India (Bengal / Carnatic)</option>
                      <option value="WEST_AFRICA">West Africa (Senegal / Gorée)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-stone-300 mb-1">
                      Primary Affected Faction
                    </label>
                    <select
                      value={offMapFaction}
                      onChange={(e) =>
                        setOffMapFaction(e.target.value as FactionType)
                      }
                      className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 text-sm text-stone-100"
                    >
                      {Object.keys(FACTION_LABELS).map((ft) => (
                        <option key={ft} value={ft}>
                          {FACTION_LABELS[ft as FactionType].name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-stone-300 mb-1">
                    Event Title
                  </label>
                  <input
                    type="text"
                    value={offMapTitle}
                    onChange={(e) => setOffMapTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 text-sm text-stone-100"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-stone-300 mb-1">
                    Historical Dispatch Description
                  </label>
                  <textarea
                    rows={3}
                    value={offMapDesc}
                    onChange={(e) => setOffMapDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 text-sm text-stone-100"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold uppercase text-stone-300 mb-1">
                      Treasury Modifier (£)
                    </label>
                    <input
                      type="number"
                      value={offMapTreasuryDelta}
                      onChange={(e) =>
                        setOffMapTreasuryDelta(Number(e.target.value))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 text-sm text-stone-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold uppercase text-stone-300 mb-1">
                      Unrest Modifier (%)
                    </label>
                    <input
                      type="number"
                      value={offMapUnrestDelta}
                      onChange={(e) =>
                        setOffMapUnrestDelta(Number(e.target.value))
                      }
                      className="w-full px-3 py-2 rounded-lg bg-stone-950 border border-stone-700 text-sm text-stone-100"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOffMapModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-stone-800 hover:bg-stone-700 text-stone-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleInjectOffMapSubmit}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
                >
                  Inject Off-Map Modifier
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
