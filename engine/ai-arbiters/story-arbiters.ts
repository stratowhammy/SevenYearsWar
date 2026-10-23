import { FactionType, RoleType, EventScope } from "@prisma/client";
import prisma from "@/lib/prisma";
import { recordAndReconcileEvent } from "@/engine/events/reconciler";
import { clampUnrest, clampStanding } from "@/engine/diplomacy";

export * from "@/lib/story-arbiters-data";
import { StoryArbiter, STORY_ARBITERS, selectActiveStoryArbiter } from "@/lib/story-arbiters-data";

export interface ArbiterAssaultRuling {
  outcome:
    | "DECISIVE_BREACH"
    | "PROTRACTED_SIEGE"
    | "BLOODY_REPULSE"
    | "HONOURS_OF_WAR_SURRENDER";
  nodeCaptured: boolean;
  attackerCasualties: number;
  defenderCasualties: number;
  unrestDeltaAttacker: number;
  unrestDeltaDefender: number;
  standingDeltaAttacker: number;
  standingDeltaDefender: number;
  rulingTitle: string;
  rulingDispatch: string;
  arbiterName: string;
  isProbabilisticIntervention: boolean;
}

export async function arbitrateContestedAssault(params: {
  gameId: string;
  turnNumber: number;
  season: string;
  year: number;
  targetNode: any;
  attackerFaction: any;
  defenderFaction: any;
  movingUnits: any[];
  defenderUnits: any[];
  baseAttackPower: number;
  baseDefensePower: number;
  isAmphibious?: boolean;
}): Promise<ArbiterAssaultRuling> {
  const {
    gameId,
    turnNumber,
    season,
    year,
    targetNode,
    attackerFaction,
    defenderFaction,
    movingUnits,
    defenderUnits,
    baseAttackPower,
    baseDefensePower,
    isAmphibious = false,
  } = params;

  const arbiter = selectActiveStoryArbiter(
    turnNumber,
    "SIEGE",
    attackerFaction.type,
    defenderFaction?.type
  );

  const totalAtkStrength = movingUnits.reduce((s, u) => s + u.strength, 0);
  const totalDefStrength = defenderUnits.reduce((s, u) => s + u.strength, 0);
  const ratio =
    baseDefensePower > 0 ? baseAttackPower / baseDefensePower : 999.0;

  // Pseudo-random deterministic seed based on gameId, turn, and forces
  const rollSeed =
    (turnNumber * 37 +
      totalAtkStrength * 17 +
      totalDefStrength * 13 +
      season.length * 7) %
    100;

  let outcome: ArbiterAssaultRuling["outcome"];
  let nodeCaptured = false;
  let attackerLossFactor = 0.15;
  let defenderLossFactor = 0.45;
  let unrestAtk = 0;
  let unrestDef = 0;
  let standingAtk = 0;
  let standingDef = 0;
  let isProbabilisticIntervention = false;

  if (ratio >= 2.5 || baseDefensePower === 0) {
    outcome = "DECISIVE_BREACH";
    nodeCaptured = true;
    attackerLossFactor = 0.12;
    defenderLossFactor = 0.8;
    unrestDef = 6;
    standingAtk = 1;
  } else if (ratio <= 0.55) {
    outcome = "BLOODY_REPULSE";
    nodeCaptured = false;
    attackerLossFactor = 0.38;
    defenderLossFactor = 0.1;
    unrestAtk = 8;
    standingDef = 1;
  } else {
    // AMBIGUOUS CONTESTED SIEGE ZONE (0.55 < ratio < 2.5)
    isProbabilisticIntervention = true;

    // Apply Arbiter Doctrine Bias & Stochastic Roll
    if (arbiter.id === "arbiter-amherst") {
      // Amherst's heavy sapping pushes for breach or total surrender
      if (rollSeed > 40) {
        outcome = "DECISIVE_BREACH";
        nodeCaptured = true;
        attackerLossFactor = 0.18;
        defenderLossFactor = 0.65;
        standingAtk = 1;
        unrestDef = 8;
      } else {
        outcome = "PROTRACTED_SIEGE";
        nodeCaptured = false;
        attackerLossFactor = 0.15;
        defenderLossFactor = 0.25;
      }
    } else if (arbiter.id === "arbiter-montcalm") {
      // Montcalm's defensive ramparts repel direct storms unless overwhelmed
      if (rollSeed < 45) {
        outcome = "BLOODY_REPULSE";
        nodeCaptured = false;
        attackerLossFactor = 0.35;
        defenderLossFactor = 0.12;
        standingDef = 1;
        unrestAtk = 6;
      } else if (rollSeed < 75) {
        outcome = "HONOURS_OF_WAR_SURRENDER";
        nodeCaptured = true;
        attackerLossFactor = 0.1;
        defenderLossFactor = 0.15; // garrison marches out with colors flying
      } else {
        outcome = "DECISIVE_BREACH";
        nodeCaptured = true;
        attackerLossFactor = 0.2;
        defenderLossFactor = 0.5;
      }
    } else if (arbiter.id === "arbiter-loudoun") {
      // Loudoun settles into methodical siege trenches
      if (ratio > 1.2 && rollSeed > 60) {
        outcome = "DECISIVE_BREACH";
        nodeCaptured = true;
        attackerLossFactor = 0.16;
        defenderLossFactor = 0.5;
      } else {
        outcome = "PROTRACTED_SIEGE";
        nodeCaptured = false;
        attackerLossFactor = 0.12;
        defenderLossFactor = 0.18;
      }
    } else {
      // Default Wolfe or General Umpire
      if (ratio >= 1.0 && rollSeed > 45) {
        outcome = "DECISIVE_BREACH";
        nodeCaptured = true;
        attackerLossFactor = 0.22;
        defenderLossFactor = 0.6;
        standingAtk = 1;
      } else {
        outcome = "BLOODY_REPULSE";
        nodeCaptured = false;
        attackerLossFactor = 0.28;
        defenderLossFactor = 0.15;
        standingDef = 1;
      }
    }
  }

  const attackerCasualties = Math.max(
    50,
    Math.round(totalAtkStrength * attackerLossFactor)
  );
  const defenderCasualties = Math.max(
    30,
    Math.round(totalDefStrength * defenderLossFactor)
  );

  let rulingTitle = `[Arbiter Ruling: ${arbiter.name}] `;
  let rulingDispatch = "";

  if (outcome === "DECISIVE_BREACH") {
    rulingTitle += `Breach & Fall of ${targetNode.name}`;
    rulingDispatch = `RULING FROM ${arbiter.name.toUpperCase()} (${season} ${year}): The attacking column of ${attackerFaction.type} (${totalAtkStrength.toLocaleString()} men) has successfully shattered the bastion works of ${targetNode.name}. Defending garrisons under ${defenderFaction?.type ?? "unclaimed forces"} suffered ${defenderCasualties.toLocaleString()} casualties and surrendered the works. The citadel now flies the colors of ${attackerFaction.type}.`;
  } else if (outcome === "PROTRACTED_SIEGE") {
    rulingTitle += `Protracted Siege at ${targetNode.name}`;
    rulingDispatch = `RULING FROM ${arbiter.name.toUpperCase()} (${season} ${year}): The ramparts of ${targetNode.name} have resisted direct storming. Attacking battalions have commenced regular sapping and parallel trenches under heavy fire (${attackerCasualties.toLocaleString()} losses). The garrison holds behind stone works, enduring siege attrition (${defenderCasualties.toLocaleString()} losses) while awaiting seasonal relief.`;
  } else if (outcome === "BLOODY_REPULSE") {
    rulingTitle += `Disastrous Repulse at ${targetNode.name}`;
    rulingDispatch = `RULING FROM ${arbiter.name.toUpperCase()} (${season} ${year}): The assault on ${targetNode.name} was shattered against entrenched defensive positions, echoing Montcalm's triumph at Carillon. Forces of ${attackerFaction.type} sustained catastrophic slaughter (${attackerCasualties.toLocaleString()} casualties) and fell back in disarray. Defending morale stands unbroken.`;
  } else {
    rulingTitle += `Honours of War Capitulation at ${targetNode.name}`;
    rulingDispatch = `RULING FROM ${arbiter.name.toUpperCase()} (${season} ${year}): After spirited defense, the garrison of ${targetNode.name} treated for terms. In accordance with the customs of civilized European warfare, ${defenderFaction?.type} surrendered the fortress with the full Honours of War—drums beating and colors displayed—marching to nearest allied territory with minimal casualties (${defenderCasualties.toLocaleString()}).`;
  }

  // Record Chronicle Event in Database
  await recordAndReconcileEvent({
    gameId,
    turn: turnNumber,
    category: "ARBITER_RULING",
    scope: EventScope.NODE,
    primaryNodeId: targetNode.id,
    factionIds: defenderFaction
      ? [attackerFaction.id, defenderFaction.id]
      : [attackerFaction.id],
    title: rulingTitle,
    description: rulingDispatch,
    validUntilTurn: turnNumber + (outcome === "PROTRACTED_SIEGE" ? 2 : 4),
  });

  return {
    outcome,
    nodeCaptured,
    attackerCasualties,
    defenderCasualties,
    unrestDeltaAttacker: unrestAtk,
    unrestDeltaDefender: unrestDef,
    standingDeltaAttacker: standingAtk,
    standingDeltaDefender: standingDef,
    rulingTitle,
    rulingDispatch,
    arbiterName: arbiter.name,
    isProbabilisticIntervention,
  };
}

export interface ArbiterRaidRuling {
  outcome: "PANIC_STORM" | "BORDER_SKIRMISH" | "SCOUT_AMBUSH";
  plunderTreasury: number;
  unrestDeltaDefender: number;
  raiderCasualties: number;
  rulingTitle: string;
  rulingDispatch: string;
  arbiterName: string;
}

export async function arbitrateFrontierRaid(params: {
  gameId: string;
  turnNumber: number;
  season: string;
  year: number;
  sourceNode: any;
  targetNode: any;
  raidingFaction: any;
  targetFaction: any;
}): Promise<ArbiterRaidRuling> {
  const {
    gameId,
    turnNumber,
    season,
    year,
    sourceNode,
    targetNode,
    raidingFaction,
    targetFaction,
  } = params;

  const arbiter = selectActiveStoryArbiter(
    turnNumber,
    "RAID",
    raidingFaction.type,
    targetFaction?.type
  );

  const roll = (turnNumber * 41 + targetNode.name.length * 13) % 100;

  let outcome: ArbiterRaidRuling["outcome"] = "BORDER_SKIRMISH";
  let plunder = 10;
  let unrestDelta = 4;
  let raiderLosses = 0;

  if (roll > 65) {
    outcome = "PANIC_STORM";
    plunder = 18;
    unrestDelta = 8;
    raiderLosses = 15;
  } else if (roll < 30) {
    outcome = "SCOUT_AMBUSH";
    plunder = 5;
    unrestDelta = 2;
    raiderLosses = 65;
  }

  let rulingTitle = `[Arbiter Ruling: ${arbiter.name}] `;
  let rulingDispatch = "";

  if (outcome === "PANIC_STORM") {
    rulingTitle += `Backcountry Panic off ${targetNode.name}`;
    rulingDispatch = `RULING FROM ${arbiter.name.toUpperCase()} (${season} ${year}): Swift war parties from ${raidingFaction.type} struck colonial settlements near ${targetNode.name}. Backcountry settlers fled eastward in terror, burning grain mills (+${unrestDelta}% Unrest in provincial assemblies) and abandoning £${plunder} in livestock and munitions.`;
  } else if (outcome === "SCOUT_AMBUSH") {
    rulingTitle += `Frontier Ambush Repulsed at ${targetNode.name}`;
    rulingDispatch = `RULING FROM ${arbiter.name.toUpperCase()} (${season} ${year}): Vigilant allied scouts and provincial rangers anticipated ${raidingFaction.type} raiders at ${targetNode.name}. The raiding band was ambushed at a river portage, taking ${raiderLosses} casualties and securing minimal forage (£${plunder}).`;
  } else {
    rulingTitle += `Frontier Incursion at ${targetNode.name}`;
    rulingDispatch = `RULING FROM ${arbiter.name.toUpperCase()} (${season} ${year}): Frontier war parties harried supply roads between ${sourceNode?.name ?? "the wilderness"} and ${targetNode.name}, levying £${plunder} in forage and raising colonial border tension (+${unrestDelta}% Unrest).`;
  }

  await recordAndReconcileEvent({
    gameId,
    turn: turnNumber,
    category: "ARBITER_RULING",
    scope: EventScope.NODE,
    primaryNodeId: targetNode.id,
    factionIds: [raidingFaction.id, targetFaction.id],
    title: rulingTitle,
    description: rulingDispatch,
    validUntilTurn: turnNumber + 2,
  });

  return {
    outcome,
    plunderTreasury: plunder,
    unrestDeltaDefender: unrestDelta,
    raiderCasualties: raiderLosses,
    rulingTitle,
    rulingDispatch,
    arbiterName: arbiter.name,
  };
}

export interface ArbiterAssemblyRuling {
  outcome: "FULL_APPROPRIATION" | "PATRONAGE_COMPROMISE" | "ASSEMBLY_DEADLOCK";
  treasuryGained: number;
  unrestDelta: number;
  assemblySupportDelta: number;
  rulingTitle: string;
  rulingDispatch: string;
  arbiterName: string;
}

export async function arbitrateAssemblyNegotiation(params: {
  gameId: string;
  turnNumber: number;
  season: string;
  year: number;
  faction: any;
  allocatedSpend: number;
}): Promise<ArbiterAssemblyRuling> {
  const { gameId, turnNumber, season, year, faction, allocatedSpend } = params;

  const arbiter = selectActiveStoryArbiter(
    turnNumber,
    "ASSEMBLY",
    faction.type
  );

  let outcome: ArbiterAssemblyRuling["outcome"];
  let treasuryGained = 0;
  let unrestDelta = 0;
  let supportDelta = 0;

  if (allocatedSpend > 0) {
    outcome = "PATRONAGE_COMPROMISE";
    treasuryGained = 0;
    unrestDelta = -10;
    supportDelta = 15;
  } else {
    outcome = "FULL_APPROPRIATION";
    treasuryGained = 40;
    unrestDelta = 5;
    supportDelta = 0;
  }

  let rulingTitle = `[Arbiter Ruling: ${arbiter.name}] `;
  let rulingDispatch = "";

  if (allocatedSpend > 0) {
    rulingTitle += `Patronage Conciliation for ${faction.type}`;
    rulingDispatch = `RULING FROM ${arbiter.name.toUpperCase()} (${season} ${year}): Through backroom patronage and redress of colonial grievances, provincial delegates voted conciliation (-10% Unrest, +15% Assembly Support).`;
  } else {
    rulingTitle += `Emergency Provincial Supply for ${faction.type}`;
    rulingDispatch = `RULING FROM ${arbiter.name.toUpperCase()} (${season} ${year}): Colonial assembly delegates ratified emergency war appropriations yielding £40 in provincial scrip, though civilian war weariness increased (+5% Unrest).`;
  }

  await recordAndReconcileEvent({
    gameId,
    turn: turnNumber,
    category: "ARBITER_RULING",
    scope: EventScope.FACTION,
    factionIds: [faction.id],
    title: rulingTitle,
    description: rulingDispatch,
    validUntilTurn: turnNumber + 2,
  });

  return {
    outcome,
    treasuryGained,
    unrestDelta,
    assemblySupportDelta: supportDelta,
    rulingTitle,
    rulingDispatch,
    arbiterName: arbiter.name,
  };
}

export interface ArbiterNavalRuling {
  outcome:
    | "LINE_OF_BATTLE_VICTORY"
    | "CONVOY_SCATTERED"
    | "TACTICAL_STANDOFF"
    | "DISMASTED_WITHDRAWAL";
  seaZoneSecured: boolean;
  attackerCasualties: number;
  defenderCasualties: number;
  unrestDeltaAttacker: number;
  unrestDeltaDefender: number;
  standingDeltaAttacker: number;
  standingDeltaDefender: number;
  rulingTitle: string;
  rulingDispatch: string;
  arbiterName: string;
}

export async function arbitrateNavalEngagement(params: {
  gameId: string;
  turnNumber: number;
  season: string;
  year: number;
  targetNode: any;
  attackerFaction: any;
  defenderFaction: any;
  movingUnits: any[];
  defenderUnits: any[];
  baseAttackPower: number;
  baseDefensePower: number;
}): Promise<ArbiterNavalRuling> {
  const {
    gameId,
    turnNumber,
    season,
    year,
    targetNode,
    attackerFaction,
    defenderFaction,
    movingUnits,
    defenderUnits,
    baseAttackPower,
    baseDefensePower,
  } = params;

  const arbiter = selectActiveStoryArbiter(
    turnNumber,
    "NAVAL",
    attackerFaction.type,
    defenderFaction?.type
  );

  const totalAtkStrength = movingUnits.reduce((s, u) => s + u.strength, 0);
  const totalDefStrength = defenderUnits.reduce((s, u) => s + u.strength, 0);
  const ratio =
    baseDefensePower > 0 ? baseAttackPower / baseDefensePower : 999.0;

  const rollSeed =
    (turnNumber * 43 +
      totalAtkStrength * 19 +
      totalDefStrength * 11 +
      targetNode.name.length * 7) %
    100;

  let outcome: ArbiterNavalRuling["outcome"];
  let seaZoneSecured = false;
  let attackerLossFactor = 0.1;
  let defenderLossFactor = 0.25;
  let unrestAtk = 0;
  let unrestDef = 0;
  let standingAtk = 0;
  let standingDef = 0;

  if (ratio >= 2.0 || baseDefensePower === 0) {
    outcome = "LINE_OF_BATTLE_VICTORY";
    seaZoneSecured = true;
    attackerLossFactor = 0.08;
    defenderLossFactor = 0.45;
    standingAtk = 1;
    unrestDef = 4;
  } else if (ratio <= 0.5) {
    outcome = "DISMASTED_WITHDRAWAL";
    seaZoneSecured = false;
    attackerLossFactor = 0.35;
    defenderLossFactor = 0.08;
    standingDef = 1;
    unrestAtk = 5;
  } else {
    // Contested naval action
    if (arbiter.id === "arbiter-boscawen") {
      if (rollSeed > 35) {
        outcome = "LINE_OF_BATTLE_VICTORY";
        seaZoneSecured = true;
        attackerLossFactor = 0.12;
        defenderLossFactor = 0.35;
        standingAtk = 1;
      } else {
        outcome = "TACTICAL_STANDOFF";
        seaZoneSecured = false;
        attackerLossFactor = 0.15;
        defenderLossFactor = 0.15;
      }
    } else if (arbiter.id === "arbiter-conflans") {
      if (rollSeed < 40) {
        outcome = "CONVOY_SCATTERED";
        seaZoneSecured = true;
        attackerLossFactor = 0.1;
        defenderLossFactor = 0.25;
      } else {
        outcome = "TACTICAL_STANDOFF";
        seaZoneSecured = false;
        attackerLossFactor = 0.12;
        defenderLossFactor = 0.12;
      }
    } else {
      if (ratio >= 1.0 && rollSeed > 50) {
        outcome = "LINE_OF_BATTLE_VICTORY";
        seaZoneSecured = true;
        attackerLossFactor = 0.14;
        defenderLossFactor = 0.3;
        standingAtk = 1;
      } else {
        outcome = "TACTICAL_STANDOFF";
        seaZoneSecured = false;
        attackerLossFactor = 0.12;
        defenderLossFactor = 0.12;
      }
    }
  }

  const attackerCasualties = Math.max(
    30,
    Math.round(totalAtkStrength * attackerLossFactor)
  );
  const defenderCasualties = Math.max(
    20,
    Math.round(totalDefStrength * defenderLossFactor)
  );

  let rulingTitle = `[Arbiter Ruling: ${arbiter.name}] `;
  let rulingDispatch = "";

  if (outcome === "LINE_OF_BATTLE_VICTORY") {
    rulingTitle += `Naval Mastery in ${targetNode.name}`;
    rulingDispatch = `RULING FROM ${arbiter.name.toUpperCase()} (${season} ${year}): The battle squadrons of ${attackerFaction.type} gained the weather gage in ${targetNode.name}, delivering devastating broadsides that broke the enemy line. Defending squadrons under ${defenderFaction?.type ?? "hostile flags"} sustained heavy spar damage and ${defenderCasualties.toLocaleString()} naval casualties before falling back to port. The sea corridor is now secured by ${attackerFaction.type}.`;
  } else if (outcome === "DISMASTED_WITHDRAWAL") {
    rulingTitle += `Naval Repulse in ${targetNode.name}`;
    rulingDispatch = `RULING FROM ${arbiter.name.toUpperCase()} (${season} ${year}): Heavy crossfire from entrenched shoreline batteries and defending warships repulsed ${attackerFaction.type} in ${targetNode.name}. The attacking van suffered ${attackerCasualties.toLocaleString()} casualties and rigging damage, forcing a withdrawal out of range.`;
  } else if (outcome === "CONVOY_SCATTERED") {
    rulingTitle += `Merchant Convoy Disrupted in ${targetNode.name}`;
    rulingDispatch = `RULING FROM ${arbiter.name.toUpperCase()} (${season} ${year}): Aggressive privateering and cruiser action in ${targetNode.name} scattered enemy merchantmen, capturing prizes and severing naval supply lines.`;
  } else {
    rulingTitle += `Indecisive Fleet Action in ${targetNode.name}`;
    rulingDispatch = `RULING FROM ${arbiter.name.toUpperCase()} (${season} ${year}): Long-range gunnery duels in ${targetNode.name} ended in a tactical draw amid shifting winds and dense powder smoke. Both fleets maintained formation with moderate rigging damage (${attackerCasualties.toLocaleString()} atk / ${defenderCasualties.toLocaleString()} def casualties).`;
  }

  await recordAndReconcileEvent({
    gameId,
    turn: turnNumber,
    category: "ARBITER_RULING",
    scope: EventScope.NODE,
    primaryNodeId: targetNode.id,
    factionIds: defenderFaction
      ? [attackerFaction.id, defenderFaction.id]
      : [attackerFaction.id],
    title: rulingTitle,
    description: rulingDispatch,
    validUntilTurn: turnNumber + 2,
  });

  return {
    outcome,
    seaZoneSecured,
    attackerCasualties,
    defenderCasualties,
    unrestDeltaAttacker: unrestAtk,
    unrestDeltaDefender: unrestDef,
    standingDeltaAttacker: standingAtk,
    standingDeltaDefender: standingDef,
    rulingTitle,
    rulingDispatch,
    arbiterName: arbiter.name,
  };
}
