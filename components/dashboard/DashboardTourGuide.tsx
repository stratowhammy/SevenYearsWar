"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Compass,
  HelpCircle,
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
  ExternalLink,
} from "lucide-react";

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
    id: "step-stepper",
    targetId: "tour-header-stepper",
    title: "Imperial Header & 4-Phase Game Loop Stepper",
    category: "Core Engine Mechanics",
    description:
      "Directs the strategic clock of the Seven Years' War. The campaign advances through 4 sequential seasonal phases: Intel Dispatch (couriers arrive), Diplomatic Trade (tariffs, extraction, and subsidies), Order Submission (human & AI directives), and Resolution (movement, siege, combat, and attrition).",
    keyFunctions: [
      "Turn & Season Counter: Tracks seasonal weather from Spring 1756 to Winter 1762/1763.",
      "Phase Stepper: Visualizes active phase progression across all 10 sovereign nations.",
      "Next Phase (N): Steps the simulation forward to the next discrete phase.",
      "Resolve Full Turn (R): Executes all 4 phases in sequence to simulate a complete season.",
      "Admin Role Seating: Manage controller assignments (HUMAN / COMPUTER) and AI behavior across all 30 seats.",
    ],
    shortcut: "N / R",
    icon: Compass,
    position: "bottom",
  },
  {
    id: "step-offmap",
    targetId: "tour-offmap-ribbon",
    title: "Global Off-Map Theater Telemetry Ribbon",
    category: "Global Geopolitics",
    description:
      "The Seven Years' War was fought across five continents. This telemetry ribbon simulates off-map geopolitical dynamics in Europe, India, and West Africa, dynamically injecting revenue, subsidies, and naval diversions into the American theater.",
    keyFunctions: [
      "Europe Theater: Tracks British continental subsidies to Prussia vs. French field army drains in Saxony.",
      "India Carnatic Theater: Clive and Watson's campaigns in Bengal delivering East India Company revenues.",
      "West Africa & Atlantic: Royal Navy privateering interdictions and Dutch neutral contraband freight bonuses.",
    ],
    icon: Globe,
    position: "bottom",
  },
  {
    id: "step-map",
    targetId: "tour-map-canvas",
    title: "Americas & Caribbean Node-Graph Map",
    category: "Cartography & Navigation",
    description:
      "A high-fidelity cartographic projection bounded between 10°N–55°N and 55°W–100°W. Renders fortified frontier bastions, indigenous council fires, colonial metropolises, and navigable ocean sea zones.",
    keyFunctions: [
      "Interactive Node Graph: Click any fortification or sea zone to inspect garrison strength and yields.",
      "Sea Zone Polygons: Toggle ocean boundaries and privateer hunting grounds on/off.",
      "Seasonal Movement Corridors: Toggle weather hazards (2.5x Winter freeze in St. Lawrence, 1.75x Autumn Caribbean hurricanes).",
      "Covenant Boundaries: Royal purple glowing perimeters indicate nodes protected by the Easton Treaty.",
    ],
    icon: Swords,
    position: "right",
  },
  {
    id: "step-dossier",
    targetId: "tour-node-dossier",
    title: "Selected Node Dossier & Quick Directives",
    category: "Tactical Command",
    description:
      "Provides granular intelligence on the currently selected theater node. Displays garrisoned battalions, resource commodities, and 1-click Quick Directives to immediately stage actions for the active role.",
    keyFunctions: [
      "Garrison Roster: Inspect stationed infantry, rangers, marines, or indigenous war parties.",
      "Economic Yield: View local commodities (Furs, Timber, Sugar, Tobacco) and revenue yields in £/turn.",
      "March Force (MOVE): Pre-fills movement orders toward adjacent connected nodes.",
      "Muster (RECRUIT): Raises provincial levies or regular battalions at the node.",
      "Harvest Yield (EXTRACT): Gathers commodity revenues into the national treasury.",
      "Covenant Boundary: Enacts a legal territorial reservation under indigenous treaty covenants.",
      "Amphibious Assault: Directs naval fleets to bombard and storm coastal bastions.",
      "Courier: Instantly pre-addresses a diplomatic dispatch to the occupying power.",
    ],
    icon: Zap,
    position: "top",
  },
  {
    id: "step-feed",
    targetId: "tour-telemetry-feed",
    title: "Tactical & Environmental Telemetry Feed",
    category: "Battle Reports & Intelligence",
    description:
      "Streams real-time tactical resolutions including wilderness skirmishes, amphibious landings, tropical hurricane gale damage, winter freeze troop losses, and treaty proclamations.",
    keyFunctions: [
      "Live Resolution Logs: Captures attacker/defender strength losses and tactical fort captures.",
      "Weather Attrition: Reports seasonal gale and sub-zero freeze losses in the St. Lawrence and Great Lakes.",
      "Category Filters: Filter feed entries by ALL, ❄ Weather, ⚓ Naval, ⚔ Combat, or 📜 Treaties.",
      "Clear Feed: Clears historical entries to focus exclusively on the newest seasonal turn.",
    ],
    icon: Shield,
    position: "top",
  },
  {
    id: "step-faction",
    targetId: "tour-faction-selector",
    title: "Active Faction & Role Seat Switcher",
    category: "Multi-Agent Architecture",
    description:
      "Allows the player or administrator to switch between all 10 historical factions and their 3 functional cabinet seats. Each role commands specific operational domains with dedicated AI personas.",
    keyFunctions: [
      "10 Sovereign Powers: Great Britain, France, Spain, Portugal, Dutch Republic, German States, Haudenosaunee, Seven Nations of Canada, Western Confederacy, Southeastern Nations.",
      "Executive Seat: Directs grand strategy, war declarations, alliances, and high-level treaties.",
      "Military Seat: Commands field armies, fleets, muster depots, and amphibious sieges.",
      "Diplomatic/Commerce Seat: Manages merchant convoys, trade tariffs, wampum subsidies, and covenants.",
    ],
    icon: Sliders,
    position: "left",
  },
  {
    id: "step-ledger",
    targetId: "tour-faction-ledger",
    title: "National Imperial Ledger",
    category: "Fiscal & Domestic State",
    description:
      "Monitors the five core domestic indicators governing imperial stability, military capacity, and diplomatic leverage.",
    keyFunctions: [
      "Treasury (£): Liquid bullion available for recruitment, subsidies, and trade missions.",
      "Debt (£): Sovereign debt accumulated through deficit spending; charges 5% interest each turn.",
      "Unrest (%): Civil tension and war weariness; unrest ≥ 70% triggers colonial assembly strikes or mutinies.",
      "Standing Points (0-10): International prestige and covenant treaty credibility.",
      "Assembly Support (%): Legislative approval for levying colonial taxes and provincial regiments.",
    ],
    icon: BookOpen,
    position: "left",
  },
  {
    id: "step-doctrine",
    targetId: "tour-role-doctrine",
    title: "Role Persona & Campaign Objectives",
    category: "Strategic Direction",
    description:
      "Anchors the active seat in its authentic 18th-century cognitive mindset. Displays historical persona instructions, active strategic objectives with turn deadlines, and one-click AI consultation.",
    keyFunctions: [
      "1756 Persona Doctrine: Historical role brief (e.g. Earl of Loudoun, Marquis de Vaudreuil, Sir William Johnson).",
      "Strategic Campaign Objective: Pinned multi-turn objective node with success reward and deadline.",
      "Consult AI Button: Generates an instant, concise 150-word strategic advisory briefing.",
      "Controller Badge: Indicates whether this seat is controlled by HUMAN or COMPUTER (ADVISOR/AUTONOMOUS).",
    ],
    icon: Sparkles,
    position: "left",
  },
  {
    id: "step-tabs",
    targetId: "tour-command-tabs",
    title: "Command Workspaces Navigation",
    category: "Interface Navigation",
    description:
      "Toggles between four specialized command workspaces in the right-hand console.",
    keyFunctions: [
      "Orders Tab: Formulate and submit formal military, economic, and diplomatic directives.",
      "DeepSeek AI Tab: Direct interaction with autonomous and advisor LLM controllers.",
      "Couriers Tab: Manage the diplomatic courier network and dispatch queues in transit.",
      "Chronicle Tab: Inspect historical event records and the database event reconciler.",
    ],
    icon: BookOpen,
    position: "left",
  },
  {
    id: "step-orders",
    targetId: "tour-orders-matrix",
    tabSwitch: "ORDERS",
    title: "Operational Directives Action Matrix",
    category: "Order Submission Phase",
    description:
      "The primary operational engine. Issue up to 11 distinct orders spanning three grand domains: Military, Sovereignty, and Economy.",
    keyFunctions: [
      "Military & Naval: MOVE (March force), RECRUIT (Muster troops), AMPHIBIOUS_ASSAULT (Fleet landing), RAID (Frontier attack).",
      "Sovereignty & Treaties: COVENANT_BOUNDARY (Treaty line), DECLARE_WAR (Open war), TREATY_CONFERENCE (Peace talks).",
      "Economy & Governance: EXTRACT (Harvest yield), TRADE (Merchant convoy), SUBSIDIZE (War bullion), ASSEMBLY_NEGOTIATION (Lobby legislature).",
      "Order Parameters: Dynamic source node, target node, troop selection, and allocated treasury sliders.",
    ],
    shortcut: "Tab: Orders",
    icon: Swords,
    position: "left",
  },
  {
    id: "step-ai",
    targetId: "tour-ai-advisor",
    tabSwitch: "ADVISOR",
    title: "Token-Bounded Hybrid DeepSeek AI Controller",
    category: "Artificial Intelligence",
    description:
      "Houses the hybrid model router. Autonomous Executive roles route to deepseek-v4-pro with thinking enabled. Military, Commercial, and Advisor roles route to deepseek-flash with JSON mode, strictly bounded under 1,500 tokens.",
    keyFunctions: [
      "Advisor Briefing: Generates an authentic 150-word strategic report analyzing events, unrest, and priorities.",
      "Autonomous Orders: Invokes live DeepSeek to formulate up to 3 valid action orders adhering to AutonomousOrderSchema.",
      "Persist Orders Toggle: Automatically stages generated AI orders into the database for the active turn.",
      "Token Budget Meter: Monitors live prompt token consumption to preserve $O(1)$ efficiency.",
    ],
    shortcut: "Tab: DeepSeek AI",
    icon: Sparkles,
    position: "left",
  },
  {
    id: "step-dispatches",
    targetId: "tour-courier-system",
    tabSwitch: "DISPATCHES",
    title: "Imperial Courier Dispatch Network",
    category: "Asynchronous Diplomacy",
    description:
      "Recreates authentic 18th-century communication delays. Diplomatic letters travel via horse courier or transatlantic packet boat with realistic 1 to 3 turn transit delays, vulnerable to privateer interception.",
    keyFunctions: [
      "Dispatch Courier Form: Compose diplomatic offers, ultimatum letters, or subsidy requests.",
      "Courier In-Transit Queue: Tracks active letters moving across the Atlantic or wilderness with countdown timers.",
      "Interception Risk: Coastal privateers and frontier scouts can intercept dispatches before delivery.",
      "Archived Messages: Review delivered diplomatic agreements, treaties, and threats.",
    ],
    shortcut: "Tab: Couriers",
    icon: Send,
    position: "left",
  },
  {
    id: "step-chronicle",
    targetId: "tour-chronicle-sql",
    tabSwitch: "CHRONICLE",
    title: "Imperial Chronicle & SQL Event Reconciler",
    category: "Historical Database Ledger",
    description:
      "A complete historical ledger powered by PostgreSQL transactional reconciliation. Logs all declarations of war, fort captures, treaties, and off-map pulses.",
    keyFunctions: [
      "Transactional Reconciler: Capturing a fort automatically supersedes expired sieges and prior garrison orders.",
      "Turn Filtering: Review events by specific seasonal turns or categories (MILITARY, DIPLOMACY, COMMERCE, TREATY).",
      "Historical Fidelity: Tracks real Seven Years' War events (Fall of Oswego, Louisbourg Expedition, Treaty of Easton).",
    ],
    shortcut: "Tab: Events SQL",
    icon: ScrollText,
    position: "left",
  },
];

interface DashboardTourGuideProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: "ORDERS" | "ADVISOR" | "DISPATCHES" | "CHRONICLE";
  setActiveTab: (tab: "ORDERS" | "ADVISOR" | "DISPATCHES" | "CHRONICLE") => void;
}

export default function DashboardTourGuide({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
}: DashboardTourGuideProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [showHandbookModal, setShowHandbookModal] = useState(false);

  const step = TOUR_STEPS[currentStepIndex];

  // Update target rect on step change or window resize
  const updateTargetRect = useCallback(() => {
    if (!step) return;
    const el = document.getElementById(step.targetId);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      // Smoothly scroll the element into view if not fully visible
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

    // If step requests tab switch, switch tab immediately
    if (step.tabSwitch && step.tabSwitch !== activeTab) {
      setActiveTab(step.tabSwitch);
    }

    // Wait for DOM render if tab switched
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

  // Keyboard navigation: Left/Right arrows, Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentStepIndex]);

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

  // Calculate tooltip position relative to target element
  const getTooltipStyle = () => {
    if (!targetRect) {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const margin = 16;
    const tooltipWidth = 440;
    const preferredPos = step.position || "bottom";

    let top = 0;
    let left = 0;

    if (preferredPos === "bottom") {
      top = targetRect.bottom + margin;
      left = Math.max(margin, Math.min(targetRect.left, window.innerWidth - tooltipWidth - margin));
    } else if (preferredPos === "top") {
      top = Math.max(margin, targetRect.top - 460 - margin);
      left = Math.max(margin, Math.min(targetRect.left, window.innerWidth - tooltipWidth - margin));
    } else if (preferredPos === "left") {
      top = Math.max(margin, Math.min(targetRect.top, window.innerHeight - 480));
      left = Math.max(margin, targetRect.left - tooltipWidth - margin);
    } else if (preferredPos === "right") {
      top = Math.max(margin, Math.min(targetRect.top, window.innerHeight - 480));
      left = Math.min(window.innerWidth - tooltipWidth - margin, targetRect.right + margin);
    } else {
      // Center fallback
      top = Math.max(margin, (window.innerHeight - 460) / 2);
      left = Math.max(margin, (window.innerWidth - tooltipWidth) / 2);
    }

    // Guard bounds so tooltip is always visible
    top = Math.max(12, Math.min(top, window.innerHeight - 480));
    left = Math.max(12, Math.min(left, window.innerWidth - tooltipWidth - 12));

    return { top: `${top}px`, left: `${left}px` };
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-auto">
      {/* Semi-transparent Backdrop */}
      <div
        className="fixed inset-0 bg-stone-950/80 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Target Element Spotlight Aperture & Glowing Animated Ring */}
      {targetRect && (
        <div
          className="fixed pointer-events-none transition-all duration-300 z-50"
          style={{
            top: `${Math.max(0, targetRect.top - 8)}px`,
            left: `${Math.max(0, targetRect.left - 8)}px`,
            width: `${targetRect.width + 16}px`,
            height: `${targetRect.height + 16}px`,
          }}
        >
          {/* Pulsing Animated Border */}
          <div className="w-full h-full rounded-2xl border-2 border-amber-400 ring-4 ring-amber-500/40 shadow-[0_0_50px_rgba(245,158,11,0.5)] animate-pulse" />

          {/* Attention Badge Beacon */}
          <div className="absolute -top-3.5 -left-3.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500 text-stone-950 text-[10px] font-mono font-bold shadow-lg">
            <Sparkles className="w-3 h-3 animate-spin" />
            <span>Target Active</span>
          </div>
        </div>
      )}

      {/* Floating Animated Guide Card */}
      <div
        className="fixed z-50 w-[440px] max-w-[calc(100vw-24px)] bg-stone-900/98 border border-amber-500/80 rounded-2xl p-5 shadow-2xl text-stone-100 flex flex-col justify-between transition-all duration-300 backdrop-blur-md"
        style={getTooltipStyle()}
      >
        <div>
          {/* Card Header: Step Counter & Badges */}
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
                onClick={() => setShowHandbookModal(true)}
                className="p-1 rounded text-stone-400 hover:text-amber-300 hover:bg-stone-800 transition cursor-pointer"
                title="Open Complete Reference Handbook"
              >
                <BookOpen className="w-4 h-4" />
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

          {/* Card Title & Description */}
          <div className="mt-3.5 space-y-2">
            <h3 className="text-base font-serif font-bold text-amber-100 leading-snug">
              {step.title}
            </h3>
            <p className="text-xs text-stone-300 leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Key Function Bullets */}
          <div className="mt-3.5 pt-3 border-t border-stone-800/80 space-y-1.5 max-h-48 overflow-y-auto pr-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 font-bold block mb-1">
              Core Capabilities:
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
            <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-stone-400 bg-stone-950 px-2.5 py-1 rounded border border-stone-800">
              <span className="flex items-center gap-1 text-amber-300/90">
                <Keyboard className="w-3 h-3" /> Keyboard Shortcut:
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
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </button>

            <button
              type="button"
              onClick={handleNext}
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-stone-950 shadow-md transition cursor-pointer"
            >
              {currentStepIndex === TOUR_STEPS.length - 1 ? (
                <>
                  <Check className="w-3.5 h-3.5" /> Finish Tour
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

      {/* Complete Reference Handbook Modal */}
      {showHandbookModal && (
        <div className="fixed inset-0 z-60 bg-stone-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-700 rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-amber-950 border border-amber-600 text-amber-300">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-serif font-bold text-amber-100">
                    Seven Years&apos; War Dashboard Reference Handbook
                  </h2>
                  <p className="text-xs text-stone-400">
                    Complete reference guide to all simulator functions, mechanics, and keyboard shortcuts
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHandbookModal(false)}
                className="p-1.5 rounded-lg text-stone-400 hover:text-stone-200 hover:bg-stone-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
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

                    {s.shortcut && (
                      <div className="pl-8 pt-1 text-[10px] font-mono text-amber-400/90">
                        Keyboard Shortcut: <span className="bg-stone-900 px-1.5 py-0.5 rounded border border-stone-700">{s.shortcut}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="p-4 border-t border-stone-800 bg-stone-950/80 flex justify-between items-center text-xs">
              <span className="text-stone-400">
                Tip: Press <kbd className="px-1.5 py-0.5 bg-stone-800 rounded border border-stone-700 text-amber-200 font-mono">?</kbd> or click Dashboard Guide anytime to launch the animated overlay.
              </span>
              <button
                type="button"
                onClick={() => setShowHandbookModal(false)}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold transition cursor-pointer"
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
