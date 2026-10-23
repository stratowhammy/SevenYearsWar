"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { FactionType, RoleType } from "@prisma/client";
import {
  Compass,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  Zap,
  BookOpen,
  Check,
  Shield,
  Globe,
  Swords,
  ScrollText,
  Send,
  Sliders,
  Keyboard,
  Award,
  Target,
  CheckCircle2,
  Circle,
  Users,
} from "lucide-react";
import {
  CHARACTER_ROLE_GUIDES,
  getCharacterRoleGuide,
  evaluateCharacterObjectives,
} from "@/lib/character-objectives";

export interface TourStep {
  id: string;
  targetId: string;
  title: string;
  category: string;
  tabSwitch?: "ORDERS" | "ADVISOR" | "DISPATCHES" | "CHRONICLE";
  description: string;
  keyFunctions: string[];
  shortcut?: string;
  icon: React.ComponentType<{ className?: string }>;
  position?: "bottom" | "top" | "left" | "right" | "center";
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "step-doctrine",
    targetId: "tour-role-doctrine",
    title: "Your Character Identity, Mission & Victory Points (10 VP)",
    category: "1. Who You Are & How You Win",
    description:
      "You are stepping into the boots of an 18th-century historical leader. Every character seat has 3 personal Objectives worth 10 Victory Points (VP) total (and 30 VP across your faction's 3-seat cabinet). Completing these goals proves your leadership and wins the campaign.",
    keyFunctions: [
      "Your 3 Character Objectives: Each goal awards +3 VP to +4 VP upon completion and updates live as you play.",
      "How to Complete Hints: Every objective tells you the exact dashboard orders (e.g., MOVE, EXTRACT, COVENANT_BOUNDARY) needed to score those Victory Points.",
      "Historical Persona Brief: Keeps your decisions grounded in your character's real 1756 worldview and constraints.",
      "Consult AI Advisor: Click 'Consult AI' anytime for a 150-word strategic recommendation tailored to your character.",
    ],
    shortcut: "? (Open Guide)",
    icon: Award,
    position: "left",
  },
  {
    id: "step-faction",
    targetId: "tour-faction-selector",
    title: "Choosing Your Nation & Cabinet Seat",
    category: "2. Character Selection",
    description:
      "Switch between any of the 10 sovereign powers and 3 cabinet roles per nation (30 playable characters in total). In a multiplayer or hybrid campaign, you command your assigned seat while humans or AI personas command the others.",
    keyFunctions: [
      "Executive Seat (10 VP): Directs grand strategy, war declarations, alliances, assembly negotiations, and peace treaties.",
      "Military Seat (10 VP): Commands field armies, naval squadrons, fort sieges, frontier raids, and muster depots.",
      "Diplomatic & Commerce Seat (10 VP): Manages merchant convoys, fur/sugar extraction, wampum gifts, and covenant boundaries.",
      "10 Playable Factions: Great Britain, France, Spain, Portugal, Dutch Republic, German States, Haudenosaunee, Seven Nations, Western Confederacy, and Southeastern Nations.",
    ],
    icon: Users,
    position: "left",
  },
  {
    id: "step-ledger",
    targetId: "tour-faction-ledger",
    title: "Your National Ledger: Bullion, Debt, Unrest & Standing",
    category: "3. Resources & Survival",
    description:
      "Before issuing orders, check your five vital signs. Many of your character's Victory Point objectives require hitting specific Treasury, Unrest, Standing, or Assembly targets.",
    keyFunctions: [
      "Treasury (£): Your liquid gold and wampum for mustering troops, sending subsidies, and funding campaigns.",
      "Debt (£): Borrowed war chest; high debt charges 5% seasonal interest and can trigger a fiscal crisis.",
      "Unrest (%): Civil and village war weariness; if Unrest hits 70%+, colonial assemblies strike and troops desert!",
      "Standing Points: Your international prestige and treaty credibility—essential for Executive and Diplomatic Victory Points.",
      "Assembly Support (%): Legislative backing that boosts your colonial tax yields and provincial recruitment.",
    ],
    icon: BookOpen,
    position: "left",
  },
  {
    id: "step-map",
    targetId: "tour-map-canvas",
    title: "Surveying the Theater Map (Americas & Caribbean)",
    category: "4. Strategic Cartography",
    description:
      "This is your war room map spanning 10°N–55°N and 55°W–100°W. Click any fort, port, indigenous council fire, or ocean sea zone to inspect its garrison and stage your character's orders.",
    keyFunctions: [
      "Click Any Node: Inspect who controls a fort, how many troops are stationed there, and its £/turn commodity value.",
      "Sea Zone Polygons Toggle: Reveal naval hunting grounds where your fleets blockade enemies or escort treasure convoys.",
      "Seasonal Corridors Toggle: Watch out for cyan Winter Freeze routes (2.5x cost, -15% attrition) and orange Autumn Hurricane lanes (-12% fleet attrition).",
      "Covenant Halos: Gold/purple dashed rings mark indigenous territories protected by formal Covenant Boundaries.",
    ],
    icon: Swords,
    position: "right",
  },
  {
    id: "step-dossier",
    targetId: "tour-node-dossier",
    title: "Selected Node Dossier & 1-Click Quick Directives",
    category: "5. Fast Tactical Orders",
    description:
      "Whenever you click a location on the map, this dossier shows you everything inside that node and gives you 1-click Quick Directive buttons to immediately set up your turn's action.",
    keyFunctions: [
      "March Force (MOVE): Pre-fills an advance from the selected node toward an adjacent fort or river pass.",
      "Muster (RECRUIT): Raises new regiments, provincial militia, or indigenous war parties at this location.",
      "Harvest Yield (EXTRACT): Collects furs, sugar, tobacco, or timber into your Treasury to hit Economic VP goals.",
      "Covenant: Proclaims a protected boundary line around the node to earn Indigenous & Diplomatic Victory Points.",
      "Amphibious & Courier: Launch coastal naval landings or send a diplomatic packet directly to the node's owner.",
    ],
    icon: Zap,
    position: "top",
  },
  {
    id: "step-tabs",
    targetId: "tour-command-tabs",
    title: "Your Four Command Workspaces",
    category: "6. Console Navigation",
    description:
      "Use these four tabs to switch between issuing orders, consulting your AI chief of staff, sending diplomatic couriers, and auditing the historical event chronicle.",
    keyFunctions: [
      "Orders Tab: Your main action board for submitting military, diplomatic, and economic directives.",
      "DeepSeek AI Tab: Ask your AI advisor for help or let the AI generate orders for your seat.",
      "Couriers Tab: Write secret letters, send alliance offers, and ratify peace treaties.",
      "Events SQL Tab: Track active wars, captured forts, and superseded treaties across the campaign.",
    ],
    icon: Sliders,
    position: "left",
  },
  {
    id: "step-orders",
    targetId: "tour-orders-matrix",
    tabSwitch: "ORDERS",
    title: "Issuing Orders to Earn Your Victory Points",
    category: "7. Submitting Directives",
    description:
      "During the ORDER_SUBMISSION phase, pick any of the 11 operational directives here, choose your target corridor, allocate Treasury (£), and click 'Commit Order' to lock it into the current turn.",
    keyFunctions: [
      "Military & Naval (MOVE, RECRUIT, AMPHIBIOUS_ASSAULT, RAID): Capture key forts and sea zones for Military VP goals.",
      "Sovereignty & Treaties (COVENANT_BOUNDARY, DECLARE_WAR, TREATY_CONFERENCE): Shape borders and peace terms for Executive VP goals.",
      "Economy & Governance (EXTRACT, TRADE, SUBSIDIZE, ASSEMBLY_NEGOTIATION): Build wealth and alliances for Diplomatic/Commerce VP goals.",
      "1-Click Adjacent Corridors: Click any connected node pill to set your destination and see weather hazard icons (❄/🌀/⚓).",
    ],
    shortcut: "Tab: Orders",
    icon: Shield,
    position: "left",
  },
  {
    id: "step-ai",
    targetId: "tour-ai-advisor",
    tabSwitch: "ADVISOR",
    title: "AI Co-Pilot & Historical Story Arbiters (Loudoun, Amherst & Montcalm)",
    category: "8. Strategic Assistance & Arbiters",
    description:
      "Your strategic workspace combines character-driven AI advisory with 7 autonomous Historical Story Arbiters (including General Loudoun, Major-General Jeffery Amherst, Marquis de Montcalm, and Sir William Johnson) who resolve ambiguous battle outcomes through probabilistic mechanics.",
    keyFunctions: [
      "In-Character Advisor Briefing: Request concise ~150-word counsel aligned with your cabinet role and VP objectives.",
      "Autonomous JSON Execution: DeepSeek AI formulates and executes valid multi-order operational plans.",
      "Historical Story Arbiters: High-command umpires (1756–1763) preside over each era, applying unique doctrine biases to sieges, raids, and appropriations.",
      "Probabilistic Contested Battles: Sieges with close odds (0.55–2.5× force ratio) trigger stochastic rolls determining Decisive Breaches vs Protracted Sieges vs Bloody Repulses.",
    ],
    shortcut: "Tab: DeepSeek AI",
    icon: Sparkles,
    position: "left",
  },
  {
    id: "step-dispatches",
    targetId: "tour-courier-system",
    tabSwitch: "DISPATCHES",
    title: "Sending Diplomatic Couriers & Ratifying Treaties",
    category: "9. Diplomacy & Peace",
    description:
      "In 1756, messages travel by horse courier or sailing packet. Send dispatches to coordinate with allies, demand concessions, or ratify a formal Treaty of Amity.",
    keyFunctions: [
      "Send Courier Packet: Choose a recipient faction and transit delay (1–4 turns); beware of naval or frontier interception!",
      "Ratify Peace Treaty: Formally ends hostilities between two nations and automatically marks old war declarations SUPERSEDED.",
      "In-Transit Queue: Monitor when your dispatches arrive or whether enemy scouts intercepted them.",
    ],
    shortcut: "Tab: Couriers",
    icon: Send,
    position: "left",
  },
  {
    id: "step-chronicle",
    targetId: "tour-chronicle-sql",
    tabSwitch: "CHRONICLE",
    title: "Reviewing the Imperial Chronicle & Arbiter Rulings",
    category: "10. Campaign History & Decrees",
    description:
      "Every battle, fort capture, war declaration, and peace treaty is recorded in this deterministic SQL ledger. Contested events feature distinctive golden Arbiter Ruling decrees issued by historical commanders.",
    keyFunctions: [
      "Arbiter Decrees: Special golden entries documenting historical judgements on contested sieges, frontier skirmishes, and assembly friction.",
      "ACTIVE Events: Ongoing wars, active sieges, and standing treaties that currently modify the strategic state.",
      "SUPERSEDED Events: Prior sieges or war declarations that have been overturned by a new conquest or peace treaty.",
      "Turn-by-Turn Audit: Trace how your character's choices reshaped the Seven Years' War.",
    ],
    shortcut: "Tab: Events SQL",
    icon: ScrollText,
    position: "left",
  },
  {
    id: "step-stepper",
    targetId: "tour-header-stepper",
    title: "Advancing the Clock: Phases & Seasonal Turns",
    category: "11. Turn Progression",
    description:
      "Once you have submitted your character's orders and dispatches, use the top command bar to advance the game clock through the 4 seasonal phases or resolve the entire turn at once.",
    keyFunctions: [
      "4 Seasonal Phases: 1. INTEL_DISPATCH → 2. DIPLOMATIC_TRADE → 3. ORDER_SUBMISSION → 4. RESOLUTION.",
      "Next Phase (Shortcut N): Advances one phase at a time so you can inspect intermediate trade yields or intelligence.",
      "Resolve Full Turn (Shortcut R): Runs all 4 phases, executes combat and movement, and advances to the next season.",
      "Admin Role Seating: Configure which of the 30 character seats are played by Humans vs. AI.",
    ],
    shortcut: "N / R",
    icon: Compass,
    position: "bottom",
  },
  {
    id: "step-offmap",
    targetId: "tour-offmap-ribbon",
    title: "Watching Global Off-Map Theaters (Europe, India, Africa)",
    category: "12. Global Context",
    description:
      "Events across the Atlantic directly affect your war chest. Keep an eye on this ribbon each turn to see how European land wars, East India Company revenues, and Atlantic shipping shift your finances.",
    keyFunctions: [
      "Europe Theater: Tracks British subsidies to Prussia and French continental army expenses.",
      "India Carnatic Theater: Adds East India Company and Compagnie des Indes trade windfalls.",
      "West Africa & Atlantic: Tracks neutral Dutch freight bonuses and Atlantic naval pressure.",
    ],
    icon: Globe,
    position: "bottom",
  },
];

interface DashboardTourGuideProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: "ORDERS" | "ADVISOR" | "DISPATCHES" | "CHRONICLE";
  setActiveTab: (tab: "ORDERS" | "ADVISOR" | "DISPATCHES" | "CHRONICLE") => void;
  game?: any;
  activeFaction?: any;
  activeRole?: any;
}

export default function DashboardTourGuide({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  game,
  activeFaction,
  activeRole,
}: DashboardTourGuideProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [showHandbookModal, setShowHandbookModal] = useState(false);
  const [handbookTab, setHandbookTab] = useState<"OBJECTIVES" | "FUNCTIONS">(
    "OBJECTIVES"
  );
  const [selectedHandbookFaction, setSelectedHandbookFaction] = useState<
    FactionType | "ALL"
  >("ALL");

  const step = TOUR_STEPS[currentStepIndex];

  const activeRoleGuide = useMemo(() => {
    const fType = (activeFaction?.type ?? FactionType.GREAT_BRITAIN) as FactionType;
    const rType = (activeRole?.roleType ?? RoleType.EXECUTIVE) as RoleType;
    return getCharacterRoleGuide(fType, rType);
  }, [activeFaction?.type, activeRole?.roleType]);

  const evaluationResult = useMemo(() => {
    if (!game || !activeFaction) {
      return {
        earnedVP: 0,
        totalRoleVP: activeRoleGuide.totalRoleVP,
        evaluatedObjectives: activeRoleGuide.objectives.map((o) => ({
          ...o,
          isCompleted: false,
          progressText: "In Progress",
          progressPercent: 0,
        })),
      };
    }
    return evaluateCharacterObjectives(activeRoleGuide, game, activeFaction);
  }, [game, activeFaction, activeRoleGuide]);

  const evaluatedObjectives = evaluationResult.evaluatedObjectives;
  const earnedVP = evaluationResult.earnedVP;

  // Update target rect on step change or window resize
  const updateTargetRect = useCallback(() => {
    if (!step) return;
    const el = document.getElementById(step.targetId);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      const isVisible =
        rect.top >= 0 &&
        rect.bottom <= window.innerHeight &&
        rect.left >= 0 &&
        rect.right <= window.innerWidth;
      if (!isVisible) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else {
      setTargetRect(null);
    }
  }, [step]);

  useEffect(() => {
    if (!isOpen) return;

    if (step.tabSwitch && step.tabSwitch !== activeTab) {
      setActiveTab(step.tabSwitch);
    }

    const timer = setTimeout(() => {
      updateTargetRect();
    }, 150);

    const handleResize = () => updateTargetRect();
    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleResize, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleResize, true);
    };
  }, [isOpen, currentStepIndex, step, activeTab, setActiveTab, updateTargetRect]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showHandbookModal) {
          setShowHandbookModal(false);
        } else {
          onClose();
        }
      } else if (e.key === "ArrowRight" && !showHandbookModal) {
        handleNext();
      } else if (e.key === "ArrowLeft" && !showHandbookModal) {
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStepIndex, showHandbookModal]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const Icon = step.icon;

  const getTooltipStyle = () => {
    if (!targetRect) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const margin = 16;
    const tooltipWidth = 460;
    const preferredPos = step.position || "bottom";

    let top = 0;
    let left = 0;

    if (preferredPos === "bottom") {
      top = targetRect.bottom + margin;
      if (targetRect.width > 600) {
        left = Math.max(
          margin,
          Math.min(
            targetRect.right - tooltipWidth - margin,
            window.innerWidth - tooltipWidth - margin
          )
        );
      } else {
        left = Math.max(
          margin,
          Math.min(targetRect.left, window.innerWidth - tooltipWidth - margin)
        );
      }
    } else if (preferredPos === "top") {
      top = Math.max(margin, targetRect.top - 480 - margin);
      if (targetRect.width > 600) {
        left = Math.max(
          margin,
          Math.min(
            targetRect.right - tooltipWidth - margin,
            window.innerWidth - tooltipWidth - margin
          )
        );
      } else {
        left = Math.max(
          margin,
          Math.min(targetRect.left, window.innerWidth - tooltipWidth - margin)
        );
      }
    } else if (preferredPos === "left") {
      top = Math.max(margin, Math.min(targetRect.top, window.innerHeight - 500));
      left = Math.max(margin, targetRect.left - tooltipWidth - margin);
    } else if (preferredPos === "right") {
      top = Math.max(margin, Math.min(targetRect.top, window.innerHeight - 500));
      left = Math.min(
        window.innerWidth - tooltipWidth - margin,
        targetRect.right + margin
      );
    } else {
      top = Math.max(margin, (window.innerHeight - 480) / 2);
      left = Math.max(margin, (window.innerWidth - tooltipWidth) / 2);
    }

    top = Math.max(12, Math.min(top, window.innerHeight - 500));
    left = Math.max(12, Math.min(left, window.innerWidth - tooltipWidth - 12));

    return { top: `${top}px`, left: `${left}px` };
  };

  const filteredHandbookGuides =
    selectedHandbookFaction === "ALL"
      ? CHARACTER_ROLE_GUIDES
      : CHARACTER_ROLE_GUIDES.filter(
          (g) => g.factionType === selectedHandbookFaction
        );

  return (
    <div className="fixed inset-0 z-[99999] pointer-events-auto">
      {/* Semi-transparent Backdrop */}
      <div
        className="fixed inset-0 z-[99998] bg-stone-950/80 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Target Element Spotlight Aperture & Glowing Animated Ring */}
      {targetRect && (
        <div
          className="fixed pointer-events-none transition-all duration-300 z-[99999]"
          style={{
            top: `${Math.max(0, targetRect.top - 8)}px`,
            left: `${Math.max(0, targetRect.left - 8)}px`,
            width: `${targetRect.width + 16}px`,
            height: `${targetRect.height + 16}px`,
          }}
        >
          <div className="syw-tour-spotlight" />

          <div className="absolute -top-3.5 -left-3.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500 text-stone-950 text-[10px] font-mono font-bold shadow-lg">
            <Sparkles className="w-3 h-3 animate-spin" />
            <span>Your Command Focus</span>
          </div>
        </div>
      )}

      {/* Floating Animated Player Guide Card */}
      <div className="syw-tour-card" style={getTooltipStyle()}>
        <div>
          {/* Card Header */}
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-950 border border-amber-600/70 text-amber-300">
                <Icon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-mono uppercase text-amber-400 font-bold tracking-wider">
                  {step.category}
                </span>
                <span className="text-stone-400 text-xs ml-2">
                  Step {currentStepIndex + 1} of {TOUR_STEPS.length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  setHandbookTab("OBJECTIVES");
                  setShowHandbookModal(true);
                }}
                className="px-2 py-1 rounded text-[10px] font-mono font-bold bg-amber-950/90 text-amber-300 border border-amber-700/70 hover:bg-amber-900 transition cursor-pointer flex items-center gap-1"
                title="View All 30 Character Objectives & Victory Points"
              >
                <Target className="w-3 h-3" /> All Character VPs
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded text-stone-400 hover:text-stone-200 hover:bg-stone-800 transition cursor-pointer"
                title="Exit Guided Tour (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Character Banner on Step 1 */}
          {currentStepIndex === 0 && (
            <div className="mt-3 p-2.5 rounded-xl bg-amber-950/40 border border-amber-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-200">
                  Playing As: {activeRoleGuide.roleTitle} (
                  {activeRoleGuide.characterPersonaName})
                </span>
                <span className="syw-vp-badge">
                  {earnedVP} / {activeRoleGuide.totalRoleVP} VP Earned
                </span>
              </div>
              <p className="text-[11px] text-stone-300 leading-snug">
                {activeRoleGuide.playerBriefing}
              </p>
              <div className="space-y-1 pt-1">
                {evaluatedObjectives.map((obj) => (
                  <div
                    key={obj.id}
                    className="flex items-center justify-between text-[10px] bg-stone-950/80 px-2 py-1 rounded border border-stone-800"
                  >
                    <span className="flex items-center gap-1.5 text-stone-200 font-medium truncate">
                      {obj.isCompleted ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                      ) : (
                        <Circle className="w-3 h-3 text-amber-400 shrink-0" />
                      )}
                      {obj.title}
                    </span>
                    <span
                      className={
                        obj.isCompleted
                          ? "syw-vp-badge-completed"
                          : ((obj as any).earnedVP ?? 0) > 0
                          ? "syw-vp-badge-completed bg-amber-500/20 text-amber-200 border-amber-500/40"
                          : "syw-vp-badge"
                      }
                    >
                      +{((obj as any).earnedVP !== undefined ? (obj as any).earnedVP : (obj.isCompleted ? obj.victoryPoints : 0))} / {obj.victoryPoints} VP
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Card Title & Description */}
          <div className="mt-3 space-y-1.5">
            <h3 className="text-base font-serif font-bold text-amber-100 leading-snug">
              {step.title}
            </h3>
            <p className="text-xs text-stone-300 leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Key Function Bullets */}
          <div className="mt-3 pt-2.5 border-t border-stone-800/80 space-y-1.5 max-h-40 overflow-y-auto pr-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold block mb-1">
              How You Use This as a Player:
            </span>
            {step.keyFunctions.map((fn, idx) => {
              const parts = fn.split(":");
              return (
                <div
                  key={idx}
                  className="flex items-start gap-1.5 text-[11px] text-stone-300 bg-stone-950/60 px-2 py-1.5 rounded border border-stone-800/60"
                >
                  <Check className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    {parts.length > 1 ? (
                      <>
                        <strong className="text-amber-200">{parts[0]}:</strong>
                        <span>{parts.slice(1).join(":")}</span>
                      </>
                    ) : (
                      <span>{fn}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {step.shortcut && (
            <div className="mt-2.5 flex items-center justify-between text-[10px] font-mono text-stone-400 bg-stone-950 px-2.5 py-1 rounded border border-stone-800">
              <span className="flex items-center gap-1 text-amber-300/90">
                <Keyboard className="w-3 h-3" /> Player Shortcut:
              </span>
              <span className="px-1.5 py-0.5 rounded bg-stone-850 text-amber-200 font-bold border border-stone-700">
                {step.shortcut}
              </span>
            </div>
          )}
        </div>

        {/* Card Footer: Stepper Controls & Dots */}
        <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            {TOUR_STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStepIndex(idx)}
                className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
                  currentStepIndex === idx
                    ? "w-4 bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
                    : "bg-stone-700 hover:bg-stone-500"
                }`}
                title={`Jump to step ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentStepIndex === 0}
              onClick={handlePrev}
              className="syw-btn-secondary !px-3 !py-1.5"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="syw-btn-primary !px-3.5 !py-1.5"
            >
              {currentStepIndex === TOUR_STEPS.length - 1 ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Enter War Room
                </>
              ) : (
                <>
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Complete Player Handbook & 30-Character Victory Points Directory Modal */}
      {showHandbookModal && (
        <div className="fixed inset-0 z-[100001] bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-5xl w-full max-h-[88vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-stone-800 bg-stone-950/90">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-950 border border-amber-600 text-amber-300">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-serif font-bold text-amber-100">
                    Player&apos;s Character Objectives &amp; Command Handbook
                  </h2>
                  <p className="text-xs text-stone-400">
                    Every playable character&apos;s mission, Victory Point (VP) goals, and War Room controls
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-stone-900 p-1 rounded-lg border border-stone-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setHandbookTab("OBJECTIVES")}
                    className={`px-3 py-1 rounded-md font-semibold cursor-pointer transition ${
                      handbookTab === "OBJECTIVES"
                        ? "bg-amber-600 text-stone-950 font-bold"
                        : "text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    Character Objectives &amp; VPs (30 Seats)
                  </button>
                  <button
                    type="button"
                    onClick={() => setHandbookTab("FUNCTIONS")}
                    className={`px-3 py-1 rounded-md font-semibold cursor-pointer transition ${
                      handbookTab === "FUNCTIONS"
                        ? "bg-amber-600 text-stone-950 font-bold"
                        : "text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    Dashboard Controls (12 Steps)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowHandbookModal(false)}
                  className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {handbookTab === "OBJECTIVES" ? (
                <>
                  {/* Faction Filter Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-stone-950 p-3 rounded-xl border border-stone-800">
                    <div className="text-xs text-stone-300">
                      <span className="font-bold text-amber-300">
                        Victory Point System:
                      </span>{" "}
                      Each character seat commands{" "}
                      <span className="font-mono font-bold text-amber-200">
                        3 Objectives = 10 VP
                      </span>{" "}
                      (30 VP per Nation across all 3 seats).
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-stone-400 font-mono text-[11px]">
                        Filter Nation:
                      </span>
                      <select
                        value={selectedHandbookFaction}
                        onChange={(e) =>
                          setSelectedHandbookFaction(e.target.value as any)
                        }
                        className="px-2.5 py-1.5 rounded bg-stone-900 border border-stone-700 text-amber-100 text-xs font-semibold"
                      >
                        <option value="ALL">All 10 Factions (30 Characters)</option>
                        {Object.values(FactionType).map((ft) => (
                          <option key={ft} value={ft}>
                            {ft}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Character Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredHandbookGuides.map((guide) => {
                      const isCurrentSeat =
                        activeFaction?.type === guide.factionType &&
                        activeRole?.roleType === guide.roleType;

                      return (
                        <div
                          key={`${guide.factionType}-${guide.roleType}`}
                          className={`rounded-xl p-4 border space-y-3 transition ${
                            isCurrentSeat
                              ? "bg-amber-950/25 border-amber-500 ring-1 ring-amber-500/50"
                              : "bg-stone-950/90 border-stone-800 hover:border-stone-700"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 border-b border-stone-800 pb-2.5">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-stone-800 text-amber-300 font-bold">
                                  {guide.factionDisplayName}
                                </span>
                                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-stone-900 border border-stone-700 text-stone-300">
                                  {guide.roleType}
                                </span>
                                {isCurrentSeat && (
                                  <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500 text-stone-950 font-bold">
                                    Your Seat
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-serif font-bold text-amber-100 mt-1.5">
                                {guide.roleTitle} — {guide.characterPersonaName}
                              </h4>
                            </div>
                            <span className="syw-vp-badge shrink-0">
                              {guide.totalRoleVP} VP Total
                            </span>
                          </div>

                          <p className="text-xs text-stone-300 leading-relaxed">
                            {guide.playerBriefing}
                          </p>

                          <div className="text-[11px] text-amber-200/90 bg-stone-900/90 px-2.5 py-1.5 rounded border border-stone-800">
                            <strong className="text-amber-300">
                              Playstyle Tip:
                            </strong>{" "}
                            {guide.strategicPlaystyle}
                          </div>

                          <div className="space-y-2 pt-1">
                            <div className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold">
                              Character Objectives &amp; Victory Points:
                            </div>
                            {guide.objectives.map((obj) => (
                              <div
                                key={obj.id}
                                className="p-2.5 rounded-lg bg-stone-900/80 border border-stone-800/90 space-y-1"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-bold text-stone-100">
                                    {obj.title}
                                  </span>
                                  <span className="syw-vp-badge shrink-0">
                                    +{obj.victoryPoints} VP
                                  </span>
                                </div>
                                <p className="text-[11px] text-stone-300">
                                  {obj.description}
                                </p>
                                <p className="text-[10px] font-mono text-emerald-300/90">
                                  How to Complete: {obj.howToComplete}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  {TOUR_STEPS.map((s, idx) => {
                    const StepIcon = s.icon;
                    return (
                      <div
                        key={s.id}
                        className="bg-stone-950/80 border border-stone-800 rounded-xl p-4 space-y-2 hover:border-amber-600/50 transition"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-amber-950 border border-amber-700 text-amber-300 flex items-center justify-center font-mono text-xs font-bold">
                              {idx + 1}
                            </span>
                            <StepIcon className="w-4 h-4 text-amber-400" />
                            <h4 className="font-bold text-amber-200 text-sm">
                              {s.title}
                            </h4>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-stone-800 text-stone-300">
                            {s.category}
                          </span>
                        </div>

                        <p className="text-xs text-stone-300 leading-relaxed pl-8">
                          {s.description}
                        </p>

                        <div className="pl-8 pt-1 space-y-1">
                          {s.keyFunctions.map((fn, fIdx) => (
                            <div
                              key={fIdx}
                              className="text-[11px] text-stone-400 flex items-start gap-1.5"
                            >
                              <span className="text-amber-400 font-bold">•</span>
                              <span>{fn}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-stone-800 bg-stone-950/90 flex justify-between items-center text-xs">
              <span className="text-stone-400">
                Tip: Press{" "}
                <kbd className="px-1.5 py-0.5 bg-stone-800 rounded border border-stone-700 text-amber-200 font-mono">
                  ?
                </kbd>{" "}
                anytime to toggle this interactive player guide.
              </span>
              <button
                type="button"
                onClick={() => setShowHandbookModal(false)}
                className="syw-btn-primary"
              >
                Close Handbook
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
