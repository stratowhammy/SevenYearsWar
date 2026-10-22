import { FactionType, RoleType } from "@prisma/client";

export interface CharacterObjectiveDefinition {
  id: string;
  title: string;
  description: string;
  howToComplete: string;
  victoryPoints: number;
  category: "TERRITORIAL" | "MILITARY" | "DIPLOMATIC" | "ECONOMIC" | "SOVEREIGNTY";
  evaluate: (context: ObjectiveEvalContext) => {
    isCompleted: boolean;
    progressText: string;
    progressPercent: number;
  };
}

export interface CharacterRoleGuide {
  factionType: FactionType;
  factionDisplayName: string;
  roleType: RoleType;
  roleTitle: string;
  characterPersonaName: string;
  playerBriefing: string;
  strategicPlaystyle: string;
  totalRoleVP: number;
  objectives: CharacterObjectiveDefinition[];
}

export interface ObjectiveEvalContext {
  game: any;
  faction: any;
  allNodes: any[];
  factionOrders: any[];
  factionDispatches: any[];
  factionEvents: any[];
}

function hasNodeControl(ctx: ObjectiveEvalContext, nodeNameSubstrings: string[]): {
  controlledCount: number;
  totalRequired: number;
  allControlled: boolean;
} {
  const controlledNames: string[] = (ctx.faction?.nodesControlled ?? []).map((n: any) =>
    (n.name ?? "").toLowerCase()
  );
  let count = 0;
  for (const target of nodeNameSubstrings) {
    const tLower = target.toLowerCase();
    if (controlledNames.some((cn) => cn.includes(tLower))) {
      count++;
    }
  }
  return {
    controlledCount: count,
    totalRequired: nodeNameSubstrings.length,
    allControlled: count >= nodeNameSubstrings.length,
  };
}

function getTotalStrength(ctx: ObjectiveEvalContext): number {
  return (ctx.faction?.units ?? []).reduce(
    (sum: number, u: any) => sum + (u.strength ?? 0),
    0
  );
}

function countOrdersOfType(ctx: ObjectiveEvalContext, types: string[]): number {
  return (ctx.factionOrders ?? []).filter((o: any) =>
    types.includes(o.orderType)
  ).length;
}

export const CHARACTER_ROLE_GUIDES: CharacterRoleGuide[] = [
  // ============================================================================
  // 1. GREAT BRITAIN
  // ============================================================================
  {
    factionType: FactionType.GREAT_BRITAIN,
    factionDisplayName: "Great Britain",
    roleType: RoleType.EXECUTIVE,
    roleTitle: "Governor-General of British North America",
    characterPersonaName: "Whitehall Crown Ministry (Newcastle & Pitt)",
    playerBriefing:
      "You direct British imperial grand strategy across North America and the Caribbean. Your mission is to break French encirclement of the Thirteen Colonies while keeping provincial assemblies compliant and funding continental allies in Europe.",
    strategicPlaystyle:
      "Coordinate naval blockades with colonial legislative diplomacy; unlock provincial tax supply before launching major amphibious invasions against Louisbourg and Quebec.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "gb-exec-1",
        title: "Conquest of Canada (Louisbourg & Quebec)",
        description:
          "Shatter French imperial power in North America by capturing both Fortress Louisbourg and the Citadel of Quebec.",
        howToComplete:
          "Coordinate with your Military Commander to issue AMPHIBIOUS_ASSAULT and MOVE directives against Fortress Louisbourg and Quebec.",
        victoryPoints: 5,
        category: "TERRITORIAL",
        evaluate: (ctx) => {
          const res = hasNodeControl(ctx, ["Louisbourg", "Quebec"]);
          return {
            isCompleted: res.allControlled,
            progressText: `${res.controlledCount} / ${res.totalRequired} Citadels Captured`,
            progressPercent: Math.round((res.controlledCount / res.totalRequired) * 100),
          };
        },
      },
      {
        id: "gb-exec-2",
        title: "Colonial Assembly Supply Consensus",
        description:
          "Maintain Colonial Assembly Support at 65% or higher while keeping domestic Unrest at or below 20%.",
        howToComplete:
          "Select Boston or Philadelphia and submit ASSEMBLY_NEGOTIATION orders in the Economy & Governance matrix.",
        victoryPoints: 3,
        category: "SOVEREIGNTY",
        evaluate: (ctx) => {
          const support = ctx.faction?.assemblySupport ?? 50;
          const unrest = ctx.faction?.unrestIndex ?? 0;
          const done = support >= 65 && unrest <= 20;
          const pct = Math.min(100, Math.round((support / 65) * 100));
          return {
            isCompleted: done,
            progressText: `Assembly: ${support}% (≥65%) • Unrest: ${unrest}% (≤20%)`,
            progressPercent: done ? 100 : pct,
          };
        },
      },
      {
        id: "gb-exec-3",
        title: "Imperial Hegemony (7+ Controlled Nodes)",
        description:
          "Expand British territorial sovereignty to control at least 7 theater nodes across the map.",
        howToComplete:
          "Capture contested forts (Fort Duquesne, Fort Niagara, Fort Ticonderoga) while defending Boston, Oswego, and Port Royal.",
        victoryPoints: 2,
        category: "TERRITORIAL",
        evaluate: (ctx) => {
          const count = ctx.faction?.nodesControlled?.length ?? 0;
          return {
            isCompleted: count >= 7,
            progressText: `${count} / 7 Nodes Controlled`,
            progressPercent: Math.min(100, Math.round((count / 7) * 100)),
          };
        },
      },
    ],
  },
  {
    factionType: FactionType.GREAT_BRITAIN,
    factionDisplayName: "Great Britain",
    roleType: RoleType.MILITARY,
    roleTitle: "Commander-in-Chief, North America (Lord Loudoun)",
    characterPersonaName: "John Campbell, Earl of Loudoun & Gen. Jeffery Amherst",
    playerBriefing:
      "You command His Majesty's regular redcoat battalions, provincial levies, and Royal Navy squadrons in American waters. You must drill undisciplined colonial militia and reduce French frontier bastions through methodical siegecraft.",
    strategicPlaystyle:
      "Build overwhelming troop strength along the Hudson-Albany and Atlantic corridors, then strike Fort Ticonderoga, Fort Duquesne, and Louisbourg.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "gb-mil-1",
        title: "Secure the Forks of the Ohio & Niagara",
        description:
          "Wrest control of Fort Duquesne and Fort Niagara from France to sever their Great Lakes supply line.",
        howToComplete:
          "Muster forces at Fort Oswego and Philadelphia, then issue MOVE orders to assault Fort Niagara and Fort Duquesne.",
        victoryPoints: 4,
        category: "MILITARY",
        evaluate: (ctx) => {
          const res = hasNodeControl(ctx, ["Duquesne", "Niagara"]);
          return {
            isCompleted: res.allControlled,
            progressText: `${res.controlledCount} / 2 Frontier Forts Secured`,
            progressPercent: Math.round((res.controlledCount / 2) * 100),
          };
        },
      },
      {
        id: "gb-mil-2",
        title: "Muster the Grand Expeditionary Army (5,500+ Strength)",
        description:
          "Build total British regular, naval, and provincial troop strength across the theater to at least 5,500 men.",
        howToComplete:
          "Issue RECRUIT (Muster Troops) orders at Boston, Port Royal, or Fort Oswego during the Order Submission phase.",
        victoryPoints: 3,
        category: "MILITARY",
        evaluate: (ctx) => {
          const str = getTotalStrength(ctx);
          return {
            isCompleted: str >= 5500,
            progressText: `${str.toLocaleString()} / 5,500 Total Strength`,
            progressPercent: Math.min(100, Math.round((str / 5500) * 100)),
          };
        },
      },
      {
        id: "gb-mil-3",
        title: "Rule Britannia: Command the Sea Lanes",
        description:
          "Hold both the Atlantic Shipping Lanes and the Gulf of St. Lawrence simultaneously to throttle French reinforcements.",
        howToComplete:
          "Use AMPHIBIOUS_ASSAULT or naval MOVE orders from Atlantic Shipping Lanes into the Gulf of St. Lawrence.",
        victoryPoints: 3,
        category: "MILITARY",
        evaluate: (ctx) => {
          const res = hasNodeControl(ctx, ["Atlantic Shipping Lanes", "Gulf of St. Lawrence"]);
          return {
            isCompleted: res.allControlled,
            progressText: `${res.controlledCount} / 2 Strategic Sea Zones Held`,
            progressPercent: Math.round((res.controlledCount / 2) * 100),
          };
        },
      },
    ],
  },
  {
    factionType: FactionType.GREAT_BRITAIN,
    factionDisplayName: "Great Britain",
    roleType: RoleType.DIPLOMATIC_COMMERCE,
    roleTitle: "President of the Board of Trade & Northern Superintendent",
    characterPersonaName: "Sir William Johnson (Warraghiyagey) & Lord Halifax",
    playerBriefing:
      "You oversee the mercantilist wealth of the British Atlantic Empire and manage the delicate Covenant Chain with the Haudenosaunee Six Nations at Albany. Without Indian allies and sugar trade revenues, Britain's war machine will stall.",
    strategicPlaystyle:
      "Harvest high-value sugar and timber yields at Port Royal and Boston, send wampum subsidies to Onondaga, and proclaim Easton Covenant boundaries to pacify the frontier.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "gb-dip-1",
        title: "Polish the Silver Covenant Chain",
        description:
          "Establish at least 1 protected Covenant Boundary and execute 2+ SUBSIDIZE or diplomatic courier missions to Native confederacies.",
        howToComplete:
          "Issue COVENANT_BOUNDARY on a frontier node and use SUBSIDIZE or the Couriers tab to send gifts to HAUDENOSAUNEE or WESTERN_CONFEDERACY.",
        victoryPoints: 4,
        category: "DIPLOMATIC",
        evaluate: (ctx) => {
          const covs = ctx.faction?.covenantBoundaries?.length ?? 0;
          const subs = countOrdersOfType(ctx, ["SUBSIDIZE", "COVENANT_BOUNDARY"]);
          const done = covs >= 1 && subs >= 2;
          return {
            isCompleted: done,
            progressText: `${covs} Covenant(s) • ${subs}/2 Diplomatic Orders`,
            progressPercent: Math.min(100, Math.round(((Math.min(1, covs) + Math.min(2, subs)) / 3) * 100)),
          };
        },
      },
      {
        id: "gb-dip-2",
        title: "Mercantilist War Chest (£280+ Treasury)",
        description:
          "Accumulate at least £280 in the British Imperial Treasury through Caribbean sugar convoys and North American timber extraction.",
        howToComplete:
          "Issue EXTRACT and TRADE orders at Port Royal / Kingston and Boston.",
        victoryPoints: 3,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const t = ctx.faction?.treasury ?? 0;
          return {
            isCompleted: t >= 280,
            progressText: `£${t} / £280 Treasury Reserve`,
            progressPercent: Math.min(100, Math.round((t / 280) * 100)),
          };
        },
      },
      {
        id: "gb-dip-3",
        title: "Prestige of the Crown (7+ Standing Points)",
        description:
          "Elevate Great Britain's international Standing Points to 7 or higher through treaty adherence and strategic victories.",
        howToComplete:
          "Honor covenant boundaries, fulfill role campaign objectives, and avoid unprovoked attacks on neutral powers.",
        victoryPoints: 3,
        category: "DIPLOMATIC",
        evaluate: (ctx) => {
          const pts = ctx.faction?.standingPoints ?? 0;
          return {
            isCompleted: pts >= 7,
            progressText: `${pts} / 7 Standing Points`,
            progressPercent: Math.min(100, Math.round((pts / 7) * 100)),
          };
        },
      },
    ],
  },

  // ============================================================================
  // 2. KINGDOM OF FRANCE
  // ============================================================================
  {
    factionType: FactionType.FRANCE,
    factionDisplayName: "Kingdom of France",
    roleType: RoleType.EXECUTIVE,
    roleTitle: "Governor-General of New France (Marquis de Vaudreuil)",
    characterPersonaName: "Pierre de Rigaud, Marquis de Vaudreuil-Cavagnial",
    playerBriefing:
      "Born in Canada, you know that New France cannot defeat Britain in a symmetric war of attrition. Your strategy relies on interior river mobility, relentless frontier raids (la petite guerre), and deep alliances with the Seven Nations and Western Confederacy.",
    strategicPlaystyle:
      "Keep the St. Lawrence heartland inviolate, subsidize Indigenous allies with powder and trade goods, and bleed British frontier colonies into exhaustion.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "fr-exec-1",
        title: "Inviolable St. Lawrence Heartland",
        description:
          "Retain unbroken French sovereignty over Quebec, Fortress Louisbourg, and Fort Ticonderoga simultaneously.",
        howToComplete:
          "Reinforce garrisons at Quebec, Louisbourg, and Ticonderoga and repel British amphibious or overland expeditions.",
        victoryPoints: 4,
        category: "TERRITORIAL",
        evaluate: (ctx) => {
          const res = hasNodeControl(ctx, ["Quebec", "Louisbourg", "Ticonderoga"]);
          return {
            isCompleted: res.allControlled,
            progressText: `${res.controlledCount} / 3 Heartland Bastions Held`,
            progressPercent: Math.round((res.controlledCount / 3) * 100),
          };
        },
      },
      {
        id: "fr-exec-2",
        title: "Grand Pays d'en Haut Coalition",
        description:
          "Execute at least 3 SUBSIDIZE or diplomatic courier orders to keep the Seven Nations and Western Confederacy armed and allied.",
        howToComplete:
          "Use SUBSIDIZE in the Orders tab or dispatch couriers to SEVEN_NATIONS and WESTERN_CONFEDERACY.",
        victoryPoints: 3,
        category: "DIPLOMATIC",
        evaluate: (ctx) => {
          const count = countOrdersOfType(ctx, ["SUBSIDIZE"]) + (ctx.factionDispatches?.length ?? 0);
          return {
            isCompleted: count >= 3,
            progressText: `${count} / 3 Alliance Subsidies & Dispatches`,
            progressPercent: Math.min(100, Math.round((count / 3) * 100)),
          };
        },
      },
      {
        id: "fr-exec-3",
        title: "Master of New France (8+ Controlled Nodes)",
        description:
          "Expand French territorial control across the St. Lawrence, Great Lakes, and Mississippi to 8 or more nodes.",
        howToComplete:
          "Hold your starting 7 nodes and capture Fort Oswego, Boston, or Ohio River Portage.",
        victoryPoints: 3,
        category: "TERRITORIAL",
        evaluate: (ctx) => {
          const count = ctx.faction?.nodesControlled?.length ?? 0;
          return {
            isCompleted: count >= 8,
            progressText: `${count} / 8 Nodes Controlled`,
            progressPercent: Math.min(100, Math.round((count / 8) * 100)),
          };
        },
      },
    ],
  },
  {
    factionType: FactionType.FRANCE,
    factionDisplayName: "Kingdom of France",
    roleType: RoleType.MILITARY,
    roleTitle: "Commander of the Troupes de Terre (Marquis de Montcalm)",
    characterPersonaName: "Louis-Joseph de Montcalm-Gozon, Marquis de Saint-Véran",
    playerBriefing:
      "You command the professional French regular battalions (Troupes de Terre) dispatched by King Louis XV. Strike forward decisively to destroy British forward staging posts at Fort Oswego and Lake Champlain before British numbers overwhelm Canada.",
    strategicPlaystyle:
      "Concentrate regular infantry for forward sieges against Fort Oswego, then entrench along the Lake Champlain-Ticonderoga line.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "fr-mil-1",
        title: "Forward Siege Triumph: Capture Fort Oswego",
        description:
          "Eliminate Britain's foothold on Lake Ontario by capturing Fort Oswego while holding Fort Niagara and Fort Duquesne.",
        howToComplete:
          "Issue MOVE orders from Fort Niagara or Fort Ticonderoga to assault and capture Fort Oswego.",
        victoryPoints: 4,
        category: "MILITARY",
        evaluate: (ctx) => {
          const res = hasNodeControl(ctx, ["Oswego", "Niagara", "Duquesne"]);
          return {
            isCompleted: res.allControlled,
            progressText: `${res.controlledCount} / 3 Great Lakes & Ohio Forts Held`,
            progressPercent: Math.round((res.controlledCount / 3) * 100),
          };
        },
      },
      {
        id: "fr-mil-2",
        title: "La Petite Guerre: Frontier Raiding Campaign",
        description:
          "Conduct at least 2 cross-border RAID or offensive MOVE operations against British colonial nodes.",
        howToComplete:
          "Select Fort Duquesne or Fort Ticonderoga and issue RAID or MOVE orders targeting Philadelphia, Boston, or Fort Oswego.",
        victoryPoints: 3,
        category: "MILITARY",
        evaluate: (ctx) => {
          const raids = countOrdersOfType(ctx, ["RAID", "MOVE", "AMPHIBIOUS_ASSAULT"]);
          return {
            isCompleted: raids >= 2,
            progressText: `${raids} / 2 Offensive Operations Launched`,
            progressPercent: Math.min(100, Math.round((raids / 2) * 100)),
          };
        },
      },
      {
        id: "fr-mil-3",
        title: "Bastion of the Fleur-de-Lis (5,500+ Garrison Strength)",
        description:
          "Maintain a combined French regular and Canadian militia force of at least 5,500 strength.",
        howToComplete:
          "Issue RECRUIT orders at Quebec, New Orleans, and Fortress Louisbourg and avoid winter freeze attrition.",
        victoryPoints: 3,
        category: "MILITARY",
        evaluate: (ctx) => {
          const str = getTotalStrength(ctx);
          return {
            isCompleted: str >= 5500,
            progressText: `${str.toLocaleString()} / 5,500 Total Strength`,
            progressPercent: Math.min(100, Math.round((str / 5500) * 100)),
          };
        },
      },
    ],
  },
  {
    factionType: FactionType.FRANCE,
    factionDisplayName: "Kingdom of France",
    roleType: RoleType.DIPLOMATIC_COMMERCE,
    roleTitle: "Royal Intendant of New France & Antilles Trade",
    characterPersonaName: "François Bigot, Royal Intendant at Quebec",
    playerBriefing:
      "You control the royal granaries, fur trade licenses (congés), and financial lifelines of New France. You must keep the colony solvent, prevent famine riots in Quebec, and extract wealth from the fur country and Caribbean sugar islands.",
    strategicPlaystyle:
      "Continuously harvest yields from Quebec, Fort Duquesne, and New Orleans, keep debt manageable, and run merchant convoys through the Windward Passage.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "fr-dip-1",
        title: "King's Magazine & Fur Monopoly (£220+ Treasury)",
        description:
          "Build the French colonial treasury to £220 or higher through fur extraction and Antillean trade.",
        howToComplete:
          "Submit EXTRACT and TRADE orders from Quebec, New Orleans, and Fort Niagara.",
        victoryPoints: 4,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const t = ctx.faction?.treasury ?? 0;
          return {
            isCompleted: t >= 220,
            progressText: `£${t} / £220 Treasury`,
            progressPercent: Math.min(100, Math.round((t / 220) * 100)),
          };
        },
      },
      {
        id: "fr-dip-2",
        title: "Domestic Bread Peace (Unrest ≤ 15%)",
        description:
          "Prevent famine bread riots in Quebec and Montreal by reducing French domestic Unrest to 15% or lower.",
        howToComplete:
          "Use ASSEMBLY_NEGOTIATION or keep treasury positive to prevent deficit unrest spikes.",
        victoryPoints: 3,
        category: "SOVEREIGNTY",
        evaluate: (ctx) => {
          const u = ctx.faction?.unrestIndex ?? 0;
          return {
            isCompleted: u <= 15,
            progressText: `Unrest: ${u}% (Target ≤ 15%)`,
            progressPercent: u <= 15 ? 100 : Math.max(0, 100 - (u - 15) * 3),
          };
        },
      },
      {
        id: "fr-dip-3",
        title: "Lifeline of the Windward Passage",
        description:
          "Maintain control of New Orleans and the Windward Passage while executing at least 2 commercial EXTRACT/TRADE orders.",
        howToComplete:
          "Defend New Orleans and Windward Passage and issue TRADE or EXTRACT directives.",
        victoryPoints: 3,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const nodes = hasNodeControl(ctx, ["New Orleans", "Windward Passage"]);
          const trades = countOrdersOfType(ctx, ["EXTRACT", "TRADE"]);
          const done = nodes.allControlled && trades >= 2;
          return {
            isCompleted: done,
            progressText: `${nodes.controlledCount}/2 Nodes • ${trades}/2 Trade Orders`,
            progressPercent: Math.min(
              100,
              Math.round(((nodes.controlledCount + Math.min(2, trades)) / 4) * 100)
            ),
          };
        },
      },
    ],
  },

  // ============================================================================
  // 3. SPANISH EMPIRE
  // ============================================================================
  {
    factionType: FactionType.SPAIN,
    factionDisplayName: "Spanish Empire",
    roleType: RoleType.EXECUTIVE,
    roleTitle: "Viceroy of New Spain & Captain-General of Cuba",
    characterPersonaName: "King Ferdinand VI & Marqués de la Ensenada",
    playerBriefing:
      "You govern the richest bullion empire in the Americas from Havana and Mexico. Under Ferdinand VI, your policy is armed neutrality: build an impregnable Caribbean bastion, accumulate vast silver reserves, and strike only when British or French weakness offers decisive gain.",
    strategicPlaystyle:
      "Fortify Havana and the Gulf of Mexico, amass silver bullion, and keep domestic unrest near zero.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "sp-exec-1",
        title: "Key of the New World: Hold Havana & Gulf of Mexico",
        description:
          "Maintain sovereign Spanish control over both Havana and the Gulf of Mexico sea zone.",
        howToComplete:
          "Keep strong naval and regular garrisons stationed at Havana and move squadrons into the Gulf of Mexico.",
        victoryPoints: 4,
        category: "TERRITORIAL",
        evaluate: (ctx) => {
          const res = hasNodeControl(ctx, ["Havana", "Gulf of Mexico"]);
          return {
            isCompleted: res.allControlled,
            progressText: `${res.controlledCount} / 2 Caribbean Anchors Controlled`,
            progressPercent: Math.round((res.controlledCount / 2) * 100),
          };
        },
      },
      {
        id: "sp-exec-2",
        title: "Bourbon Imperial Prestige (6+ Standing Points)",
        description:
          "Increase Spain's international Standing Points to 6 or higher through armed neutrality and diplomatic statecraft.",
        howToComplete:
          "Fulfill strategic objectives, send diplomatic subsidies, and preserve treaty credibility.",
        victoryPoints: 3,
        category: "DIPLOMATIC",
        evaluate: (ctx) => {
          const pts = ctx.faction?.standingPoints ?? 0;
          return {
            isCompleted: pts >= 6,
            progressText: `${pts} / 6 Standing Points`,
            progressPercent: Math.min(100, Math.round((pts / 6) * 100)),
          };
        },
      },
      {
        id: "sp-exec-3",
        title: "Pax Hispanica (Unrest ≤ 10%)",
        description:
          "Keep civil unrest across the Viceroyalty at 10% or lower while maintaining zero new sovereign debt.",
        howToComplete:
          "Avoid deficit spending and use ASSEMBLY_NEGOTIATION if colonial unrest rises.",
        victoryPoints: 3,
        category: "SOVEREIGNTY",
        evaluate: (ctx) => {
          const u = ctx.faction?.unrestIndex ?? 0;
          const d = ctx.faction?.debt ?? 0;
          const done = u <= 10 && d <= 25;
          return {
            isCompleted: done,
            progressText: `Unrest: ${u}% (≤10%) • Debt: £${d} (≤£25)`,
            progressPercent: done ? 100 : 60,
          };
        },
      },
    ],
  },
  {
    factionType: FactionType.SPAIN,
    factionDisplayName: "Spanish Empire",
    roleType: RoleType.MILITARY,
    roleTitle: "Commander of the Armada de Barlovento",
    characterPersonaName: "Don Juan de Prado & Admiral Reggio",
    playerBriefing:
      "You command the Windward Fleet (Armada de Barlovento) and the fortress guns of El Morro at Havana. Your duty is to make Havana unconquerable and dominate the Caribbean sea lanes.",
    strategicPlaystyle:
      "Muster warships and garrison regulars at Havana, patrol the Gulf of Mexico, and shelter fleets during Autumn hurricane season.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "sp-mil-1",
        title: "Impregnable Morro Castle (3,500+ Strength)",
        description:
          "Build Spanish combined naval and land forces to at least 3,500 total strength.",
        howToComplete:
          "Issue RECRUIT orders at Havana to expand the Armada de Barlovento and regular regiments.",
        victoryPoints: 4,
        category: "MILITARY",
        evaluate: (ctx) => {
          const str = getTotalStrength(ctx);
          return {
            isCompleted: str >= 3500,
            progressText: `${str.toLocaleString()} / 3,500 Fleet & Garrison Strength`,
            progressPercent: Math.min(100, Math.round((str / 3500) * 100)),
          };
        },
      },
      {
        id: "sp-mil-2",
        title: "Dominion of the Spanish Main (2+ Nodes Controlled)",
        description:
          "Expand Spanish control to at least 2 strategic nodes in the Caribbean / Gulf region.",
        howToComplete:
          "Move forces from Havana to secure the Gulf of Mexico or Windward Passage.",
        victoryPoints: 3,
        category: "TERRITORIAL",
        evaluate: (ctx) => {
          const count = ctx.faction?.nodesControlled?.length ?? 0;
          return {
            isCompleted: count >= 2,
            progressText: `${count} / 2 Nodes Controlled`,
            progressPercent: Math.min(100, Math.round((count / 2) * 100)),
          };
        },
      },
      {
        id: "sp-mil-3",
        title: "Guardacostas Readiness",
        description:
          "Execute at least 2 military RECRUIT or naval patrol MOVE directives to deter British privateers.",
        howToComplete:
          "Submit RECRUIT or MOVE orders from Havana.",
        victoryPoints: 3,
        category: "MILITARY",
        evaluate: (ctx) => {
          const count = countOrdersOfType(ctx, ["RECRUIT", "MOVE", "AMPHIBIOUS_ASSAULT"]);
          return {
            isCompleted: count >= 2,
            progressText: `${count} / 2 Naval & Garrison Directives`,
            progressPercent: Math.min(100, Math.round((count / 2) * 100)),
          };
        },
      },
    ],
  },
  {
    factionType: FactionType.SPAIN,
    factionDisplayName: "Spanish Empire",
    roleType: RoleType.DIPLOMATIC_COMMERCE,
    roleTitle: "Consulado of Seville & Veracruz Bullion Intendant",
    characterPersonaName: "Marqués de Cruillas & Casa de Contratación",
    playerBriefing:
      "You oversee the Carrera de Indias — the legendary Spanish silver treasure fleets. Havana yields £50 of silver per turn, the richest single node on the map. Your task is to amass an unmatched bullion reserve in the royal treasury.",
    strategicPlaystyle:
      "Harvest silver yields from Havana every turn and use strategic bullion subsidies to shape the balance of power.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "sp-dip-1",
        title: "Treasure of the Flota (£320+ Silver Treasury)",
        description:
          "Accumulate at least £320 in the Spanish Treasury through Havana silver extraction and trade convoys.",
        howToComplete:
          "Issue EXTRACT and TRADE orders at Havana.",
        victoryPoints: 5,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const t = ctx.faction?.treasury ?? 0;
          return {
            isCompleted: t >= 320,
            progressText: `£${t} / £320 Silver Bullion Reserve`,
            progressPercent: Math.min(100, Math.round((t / 320) * 100)),
          };
        },
      },
      {
        id: "sp-dip-2",
        title: "Carrera de Indias Convoy Operations",
        description:
          "Execute at least 2 EXTRACT or TRADE directives to load and dispatch the royal treasure fleet.",
        howToComplete:
          "Select Havana and submit EXTRACT (Harvest Yield) or TRADE (Merchant Convoy) orders.",
        victoryPoints: 3,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const count = countOrdersOfType(ctx, ["EXTRACT", "TRADE"]);
          return {
            isCompleted: count >= 2,
            progressText: `${count} / 2 Treasure Convoy Orders`,
            progressPercent: Math.min(100, Math.round((count / 2) * 100)),
          };
        },
      },
      {
        id: "sp-dip-3",
        title: "Bullion Diplomacy",
        description:
          "Send at least 1 SUBSIDIZE gift or diplomatic courier to influence the Anglo-French struggle.",
        howToComplete:
          "Submit a SUBSIDIZE order or send a diplomatic dispatch via the Couriers tab.",
        victoryPoints: 2,
        category: "DIPLOMATIC",
        evaluate: (ctx) => {
          const count = countOrdersOfType(ctx, ["SUBSIDIZE"]) + (ctx.factionDispatches?.length ?? 0);
          return {
            isCompleted: count >= 1,
            progressText: `${count} / 1 Diplomatic Bullion Action`,
            progressPercent: Math.min(100, count * 100),
          };
        },
      },
    ],
  },

  // ============================================================================
  // 4. KINGDOM OF PORTUGAL
  // ============================================================================
  {
    factionType: FactionType.PORTUGAL,
    factionDisplayName: "Kingdom of Portugal",
    roleType: RoleType.EXECUTIVE,
    roleTitle: "Viceroy of Brazil & Pombaline Overseas Minister",
    characterPersonaName: "Sebastião José de Carvalho e Melo, Marquis of Pombal",
    playerBriefing:
      "Following the devastating 1755 Lisbon Earthquake, you are rebuilding Portugal through enlightened mercantilism and Brazilian trade monopolies. Preserve your historic alliance with Britain without provoking a Franco-Spanish invasion.",
    strategicPlaystyle:
      "Defend Belém do Pará, harvest sugar and dyewood wealth, and build state reserves for Lisbon's reconstruction.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "pt-exec-1",
        title: "Pombaline Reconstruction Fund (£210+ Treasury)",
        description:
          "Build Portugal's treasury to £210 or higher to finance the reconstruction of Lisbon.",
        howToComplete:
          "Issue EXTRACT and TRADE orders from Belém do Pará (Atlantic Entrepôt).",
        victoryPoints: 4,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const t = ctx.faction?.treasury ?? 0;
          return {
            isCompleted: t >= 210,
            progressText: `£${t} / £210 Reconstruction Treasury`,
            progressPercent: Math.min(100, Math.round((t / 210) * 100)),
          };
        },
      },
      {
        id: "pt-exec-2",
        title: "Sovereignty of Grão-Pará & Brazil",
        description:
          "Maintain unbroken Portuguese control of Belém do Pará while keeping domestic Unrest at or below 12%.",
        howToComplete:
          "Station garrison troops at Belém do Pará and avoid war weariness.",
        victoryPoints: 3,
        category: "SOVEREIGNTY",
        evaluate: (ctx) => {
          const res = hasNodeControl(ctx, ["Belém"]);
          const u = ctx.faction?.unrestIndex ?? 0;
          const done = res.allControlled && u <= 12;
          return {
            isCompleted: done,
            progressText: `Belém Held: ${res.allControlled ? "Yes" : "No"} • Unrest: ${u}% (≤12%)`,
            progressPercent: done ? 100 : res.allControlled ? 65 : 0,
          };
        },
      },
      {
        id: "pt-exec-3",
        title: "Methuen Treaty Statecraft (5+ Standing Points)",
        description:
          "Elevate Portugal's international Standing Points to 5 or higher.",
        howToComplete:
          "Send trade convoys, honor neutrality, and support allied commerce.",
        victoryPoints: 3,
        category: "DIPLOMATIC",
        evaluate: (ctx) => {
          const pts = ctx.faction?.standingPoints ?? 0;
          return {
            isCompleted: pts >= 5,
            progressText: `${pts} / 5 Standing Points`,
            progressPercent: Math.min(100, Math.round((pts / 5) * 100)),
          };
        },
      },
    ],
  },
  {
    factionType: FactionType.PORTUGAL,
    factionDisplayName: "Kingdom of Portugal",
    roleType: RoleType.MILITARY,
    roleTitle: "Admiral of the South Atlantic Convoy Escort",
    characterPersonaName: "Dom Marcos de Noronha, Conde dos Arcos",
    playerBriefing:
      "You command the Portuguese South Atlantic squadron and colonial garrisons protecting Brazil's northern approaches at Belém do Pará. Deter foreign privateers and safeguard the sugar fleets.",
    strategicPlaystyle:
      "Muster coastal defense forces at Belém do Pará and patrol the Atlantic Shipping Lanes.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "pt-mil-1",
        title: "Amazonian Bastion (1,500+ Garrison & Fleet Strength)",
        description:
          "Expand Portuguese naval and garrison forces to at least 1,500 total strength.",
        howToComplete:
          "Submit RECRUIT (Muster Troops) orders at Belém do Pará.",
        victoryPoints: 4,
        category: "MILITARY",
        evaluate: (ctx) => {
          const str = getTotalStrength(ctx);
          return {
            isCompleted: str >= 1500,
            progressText: `${str.toLocaleString()} / 1,500 Strength`,
            progressPercent: Math.min(100, Math.round((str / 1500) * 100)),
          };
        },
      },
      {
        id: "pt-mil-2",
        title: "South Atlantic Convoy Escort",
        description:
          "Execute at least 2 military RECRUIT or naval patrol MOVE directives.",
        howToComplete:
          "Issue RECRUIT or MOVE orders from Belém do Pará.",
        victoryPoints: 3,
        category: "MILITARY",
        evaluate: (ctx) => {
          const count = countOrdersOfType(ctx, ["RECRUIT", "MOVE"]);
          return {
            isCompleted: count >= 2,
            progressText: `${count} / 2 Escort Directives`,
            progressPercent: Math.min(100, Math.round((count / 2) * 100)),
          };
        },
      },
      {
        id: "pt-mil-3",
        title: "Unbroken Brazilian Perimeter",
        description:
          "Never lose control of Belém do Pará to any foreign power.",
        howToComplete:
          "Keep a strong garrison stationed in Belém do Pará at all times.",
        victoryPoints: 3,
        category: "TERRITORIAL",
        evaluate: (ctx) => {
          const res = hasNodeControl(ctx, ["Belém"]);
          return {
            isCompleted: res.allControlled,
            progressText: res.allControlled ? "Perimeter Secure (1/1)" : "Perimeter Breached",
            progressPercent: res.allControlled ? 100 : 0,
          };
        },
      },
    ],
  },
  {
    factionType: FactionType.PORTUGAL,
    factionDisplayName: "Kingdom of Portugal",
    roleType: RoleType.DIPLOMATIC_COMMERCE,
    roleTitle: "Director of the Grão-Pará and Maranhão Company",
    characterPersonaName: "Companhia Geral do Grão-Pará e Maranhão",
    playerBriefing:
      "Chartered by Pombal in 1755, your monopolistic trading company controls the export of Amazonian cacao, sugar, timber, and spices to Europe. War between Britain and France drives commodity prices sky-high—profit from every season!",
    strategicPlaystyle:
      "Execute EXTRACT and TRADE orders every turn and establish commercial treaties via courier.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "pt-dip-1",
        title: "Chartered Monopoly Dividends",
        description:
          "Execute at least 3 EXTRACT or TRADE orders from Belém do Pará.",
        howToComplete:
          "Use the Economy & Governance matrix to issue EXTRACT and TRADE orders.",
        victoryPoints: 4,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const count = countOrdersOfType(ctx, ["EXTRACT", "TRADE"]);
          return {
            isCompleted: count >= 3,
            progressText: `${count} / 3 Commercial Directives`,
            progressPercent: Math.min(100, Math.round((count / 3) * 100)),
          };
        },
      },
      {
        id: "pt-dip-2",
        title: "Solvency of the Crown (Debt ≤ £25 & Treasury ≥ £180)",
        description:
          "Keep Portuguese national debt at or below £25 while growing the treasury to at least £180.",
        howToComplete:
          "Harvest yields regularly and avoid costly foreign wars.",
        victoryPoints: 3,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const d = ctx.faction?.debt ?? 0;
          const t = ctx.faction?.treasury ?? 0;
          const done = d <= 25 && t >= 180;
          return {
            isCompleted: done,
            progressText: `Treasury: £${t}/£180 • Debt: £${d} (≤£25)`,
            progressPercent: Math.min(100, Math.round((t / 180) * 100)),
          };
        },
      },
      {
        id: "pt-dip-3",
        title: "Atlantic Trade Diplomacy",
        description:
          "Send at least 1 diplomatic courier or commercial subsidy to a trading partner.",
        howToComplete:
          "Use the Couriers tab or SUBSIDIZE order to cement commercial ties.",
        victoryPoints: 3,
        category: "DIPLOMATIC",
        evaluate: (ctx) => {
          const count = countOrdersOfType(ctx, ["SUBSIDIZE"]) + (ctx.factionDispatches?.length ?? 0);
          return {
            isCompleted: count >= 1,
            progressText: `${count} / 1 Diplomatic Trade Mission`,
            progressPercent: Math.min(100, count * 100),
          };
        },
      },
    ],
  },

  // ============================================================================
  // 5. DUTCH REPUBLIC
  // ============================================================================
  {
    factionType: FactionType.DUTCH_REPUBLIC,
    factionDisplayName: "Dutch Republic",
    roleType: RoleType.EXECUTIVE,
    roleTitle: "Director-General of Curaçao & St. Eustatius",
    characterPersonaName: "Isaac Faesch & The States-General",
    playerBriefing:
      "From the bustling harbor of Willemstad on Curaçao, you champion the Dutch doctrine of 'Free Ships, Free Goods.' While Britain and France bleed each other dry, you turn the Dutch Antilles into the indispensable trading emporium of the Americas.",
    strategicPlaystyle:
      "Maintain strict armed neutrality, defend Willemstad, and amass the largest merchant treasury in the Western Hemisphere.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "nl-exec-1",
        title: "Golden Rock Emporium (£300+ Treasury)",
        description:
          "Grow the Dutch Republic's treasury to £300 or higher through neutral freight bonuses and Caribbean arbitrage.",
        howToComplete:
          "Maintain neutrality to collect the West Africa/Atlantic Freight Bonus and issue EXTRACT/TRADE orders at Willemstad.",
        victoryPoints: 4,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const t = ctx.faction?.treasury ?? 0;
          return {
            isCompleted: t >= 300,
            progressText: `£${t} / £300 Dutch Treasury`,
            progressPercent: Math.min(100, Math.round((t / 300) * 100)),
          };
        },
      },
      {
        id: "nl-exec-2",
        title: "Free Ships, Free Goods (Hold Willemstad & Unrest ≤ 10%)",
        description:
          "Retain control of Willemstad (Curaçao) with civil unrest at 10% or lower.",
        howToComplete:
          "Keep Willemstad well-garrisoned and avoid entangling offensive wars.",
        victoryPoints: 3,
        category: "SOVEREIGNTY",
        evaluate: (ctx) => {
          const res = hasNodeControl(ctx, ["Willemstad"]);
          const u = ctx.faction?.unrestIndex ?? 0;
          const done = res.allControlled && u <= 10;
          return {
            isCompleted: done,
            progressText: `Willemstad Held • Unrest: ${u}% (≤10%)`,
            progressPercent: done ? 100 : res.allControlled ? 70 : 0,
          };
        },
      },
      {
        id: "nl-exec-3",
        title: "Arbiter of the Antilles (6+ Standing Points)",
        description:
          "Raise the Dutch Republic's international Standing Points to 6 or higher.",
        howToComplete:
          "Trade with all belligerents, send financial subsidies, and uphold neutral maritime law.",
        victoryPoints: 3,
        category: "DIPLOMATIC",
        evaluate: (ctx) => {
          const pts = ctx.faction?.standingPoints ?? 0;
          return {
            isCompleted: pts >= 6,
            progressText: `${pts} / 6 Standing Points`,
            progressPercent: Math.min(100, Math.round((pts / 6) * 100)),
          };
        },
      },
    ],
  },
  {
    factionType: FactionType.DUTCH_REPUBLIC,
    factionDisplayName: "Dutch Republic",
    roleType: RoleType.MILITARY,
    roleTitle: "Commander of the West India Squadron",
    characterPersonaName: "Rear-Admiral Willem Crul & Fort Amsterdam Command",
    playerBriefing:
      "British privateers enforcing the 'Rule of 1756' seek to seize Dutch merchantmen carrying French sugar. Your naval squadron must escort Dutch convoys and make Fort Amsterdam at Willemstad too strong to attack.",
    strategicPlaystyle:
      "Muster escort frigates and harbor troops at Willemstad to deter British or French aggression.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "nl-mil-1",
        title: "Armed Neutrality Deterrent (1,600+ Strength)",
        description:
          "Build Dutch naval escort and garrison strength at Willemstad to at least 1,600 men.",
        howToComplete:
          "Issue RECRUIT orders at Willemstad (Curaçao).",
        victoryPoints: 4,
        category: "MILITARY",
        evaluate: (ctx) => {
          const str = getTotalStrength(ctx);
          return {
            isCompleted: str >= 1600,
            progressText: `${str.toLocaleString()} / 1,600 Squadron Strength`,
            progressPercent: Math.min(100, Math.round((str / 1600) * 100)),
          };
        },
      },
      {
        id: "nl-mil-2",
        title: "Fort Amsterdam Harbor Defense",
        description:
          "Keep Willemstad under uninterrupted Dutch sovereignty while issuing at least 2 military/escort directives.",
        howToComplete:
          "Station all recruited units at Willemstad and issue RECRUIT or patrol orders.",
        victoryPoints: 3,
        category: "MILITARY",
        evaluate: (ctx) => {
          const res = hasNodeControl(ctx, ["Willemstad"]);
          const count = countOrdersOfType(ctx, ["RECRUIT", "MOVE"]);
          const done = res.allControlled && count >= 2;
          return {
            isCompleted: done,
            progressText: `Harbor Held • ${count}/2 Defense Orders`,
            progressPercent: Math.min(100, Math.round(((res.controlledCount + Math.min(2, count)) / 3) * 100)),
          };
        },
      },
      {
        id: "nl-mil-3",
        title: "Zero Fleet Losses to Hurricanes",
        description:
          "Maintain at least 1 active unit formation at full combat readiness in the Caribbean.",
        howToComplete:
          "Keep merchantmen and warships sheltered in Willemstad during Autumn hurricane turns.",
        victoryPoints: 3,
        category: "MILITARY",
        evaluate: (ctx) => {
          const units = ctx.faction?.units?.length ?? 0;
          return {
            isCompleted: units >= 1 && getTotalStrength(ctx) >= 1000,
            progressText: `${units} Active Formation(s) (${getTotalStrength(ctx)} str)`,
            progressPercent: units >= 1 ? 100 : 0,
          };
        },
      },
    ],
  },
  {
    factionType: FactionType.DUTCH_REPUBLIC,
    factionDisplayName: "Dutch Republic",
    roleType: RoleType.DIPLOMATIC_COMMERCE,
    roleTitle: "Chief Factor of the Dutch West India Company (WIC)",
    characterPersonaName: "Geoctroyeerde Westindische Compagnie (WIC)",
    playerBriefing:
      "You are the master commercial arbitrageur of the Caribbean. Transship French Antillean sugar, smuggle European gunpowder, and extend credit across the Atlantic to turn wartime scarcity into Dutch gold.",
    strategicPlaystyle:
      "Submit TRADE and EXTRACT orders every turn and use SUBSIDIZE to finance lucrative trade partners.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "nl-dip-1",
        title: "Contraband Arbitrage Master (3+ Trade/Extract Orders)",
        description:
          "Execute at least 3 TRADE or EXTRACT orders from Willemstad.",
        howToComplete:
          "Select Willemstad and submit TRADE (Merchant Convoy) and EXTRACT (Harvest Yield) orders.",
        victoryPoints: 4,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const count = countOrdersOfType(ctx, ["TRADE", "EXTRACT"]);
          return {
            isCompleted: count >= 3,
            progressText: `${count} / 3 WIC Commercial Orders`,
            progressPercent: Math.min(100, Math.round((count / 3) * 100)),
          };
        },
      },
      {
        id: "nl-dip-2",
        title: "Amsterdam Credit House (Debt ≤ £15)",
        description:
          "Keep Dutch national debt at or below £15 while extending at least 1 financial subsidy or courier dispatch.",
        howToComplete:
          "Avoid deficit spending and issue a SUBSIDIZE order or diplomatic courier.",
        victoryPoints: 3,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const d = ctx.faction?.debt ?? 0;
          const subs = countOrdersOfType(ctx, ["SUBSIDIZE"]) + (ctx.factionDispatches?.length ?? 0);
          const done = d <= 15 && subs >= 1;
          return {
            isCompleted: done,
            progressText: `Debt: £${d} (≤£15) • ${subs}/1 Credit Dispatch`,
            progressPercent: done ? 100 : d <= 15 ? 50 : 20,
          };
        },
      },
      {
        id: "nl-dip-3",
        title: "entrepôt Prosperity (£260+ Treasury)",
        description:
          "Maintain at least £260 in liquid treasury coin.",
        howToComplete:
          "Harvest Willemstad's £40/turn sugar yield and collect Atlantic freight bonuses.",
        victoryPoints: 3,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const t = ctx.faction?.treasury ?? 0;
          return {
            isCompleted: t >= 260,
            progressText: `£${t} / £260 Liquid Treasury`,
            progressPercent: Math.min(100, Math.round((t / 260) * 100)),
          };
        },
      },
    ],
  },

  // ============================================================================
  // 6. GERMAN STATES
  // ============================================================================
  {
    factionType: FactionType.GERMAN_STATES,
    factionDisplayName: "German States (Prussia & Auxiliaries)",
    roleType: RoleType.EXECUTIVE,
    roleTitle: "Minister Plenipotentiary of the German Chancellery",
    characterPersonaName: "Frederick the Great's Westminster Envoy",
    playerBriefing:
      "Aligned with Great Britain through the 1756 Convention of Westminster, your German riflemen and engineering officers form the backbone of the 60th Royal American Regiment at Philadelphia while British bullion sustains Prussia in Europe.",
    strategicPlaystyle:
      "Defend Philadelphia, support British campaigns against Fort Duquesne, and maintain strong treasury and standing.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "ge-exec-1",
        title: "Keystone of the Colonies: Hold Philadelphia & Expand",
        description:
          "Maintain control of Philadelphia and expand German/Coalition control to at least 2 nodes (or secure Fort Duquesne).",
        howToComplete:
          "Defend Philadelphia and march forces toward Fort Duquesne or contested frontier nodes.",
        victoryPoints: 4,
        category: "TERRITORIAL",
        evaluate: (ctx) => {
          const count = ctx.faction?.nodesControlled?.length ?? 0;
          const hasPhilly = hasNodeControl(ctx, ["Philadelphia"]).allControlled;
          const done = hasPhilly && count >= 2;
          return {
            isCompleted: done,
            progressText: `Philadelphia: ${hasPhilly ? "Held" : "Lost"} • ${count}/2 Nodes`,
            progressPercent: done ? 100 : hasPhilly ? 60 : 0,
          };
        },
      },
      {
        id: "ge-exec-2",
        title: "Convention of Westminster Prestige (6+ Standing)",
        description:
          "Increase German States Standing Points to 6 or higher through coalition fidelity.",
        howToComplete:
          "Support British operations, fulfill military objectives, and send coalition dispatches.",
        victoryPoints: 3,
        category: "DIPLOMATIC",
        evaluate: (ctx) => {
          const pts = ctx.faction?.standingPoints ?? 0;
          return {
            isCompleted: pts >= 6,
            progressText: `${pts} / 6 Standing Points`,
            progressPercent: Math.min(100, Math.round((pts / 6) * 100)),
          };
        },
      },
      {
        id: "ge-exec-3",
        title: "Pennsylvania Civic Order (Unrest ≤ 15%)",
        description:
          "Keep unrest in Philadelphia and the Pennsylvania backcountry at 15% or lower.",
        howToComplete:
          "Protect Philadelphia from frontier raids and use ASSEMBLY_NEGOTIATION when needed.",
        victoryPoints: 3,
        category: "SOVEREIGNTY",
        evaluate: (ctx) => {
          const u = ctx.faction?.unrestIndex ?? 0;
          return {
            isCompleted: u <= 15,
            progressText: `Unrest: ${u}% (Target ≤ 15%)`,
            progressPercent: u <= 15 ? 100 : Math.max(0, 100 - (u - 15) * 3),
          };
        },
      },
    ],
  },
  {
    factionType: FactionType.GERMAN_STATES,
    factionDisplayName: "German States (Prussia & Auxiliaries)",
    roleType: RoleType.MILITARY,
    roleTitle: "Colonel-Commandant, 60th Royal American & Jaeger Battalions",
    characterPersonaName: "Col. Henri Bouquet & Col. Frederick Haldimand",
    playerBriefing:
      "You command the elite 60th Royal American Regiment and German Jaeger riflemen at Philadelphia. Unlike rigid European line infantry, your troops combine Prussian discipline with frontier bushfighting and military road engineering.",
    strategicPlaystyle:
      "Muster Jaeger and Royal American battalions at Philadelphia and march west across the Alleghenies toward Fort Duquesne.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "ge-mil-1",
        title: "Muster the 60th Royal Americans (2,000+ Strength)",
        description:
          "Build your German Jaeger and Royal American forces to at least 2,000 total strength.",
        howToComplete:
          "Submit RECRUIT orders at Philadelphia.",
        victoryPoints: 4,
        category: "MILITARY",
        evaluate: (ctx) => {
          const str = getTotalStrength(ctx);
          return {
            isCompleted: str >= 2000,
            progressText: `${str.toLocaleString()} / 2,000 Regiment Strength`,
            progressPercent: Math.min(100, Math.round((str / 2000) * 100)),
          };
        },
      },
      {
        id: "ge-mil-2",
        title: "Forbes Road Expedition",
        description:
          "Execute at least 2 military MOVE or RECRUIT directives to project power from Philadelphia.",
        howToComplete:
          "Issue MOVE or RECRUIT orders from Philadelphia toward Fort Duquesne or Boston.",
        victoryPoints: 3,
        category: "MILITARY",
        evaluate: (ctx) => {
          const count = countOrdersOfType(ctx, ["MOVE", "RECRUIT"]);
          return {
            isCompleted: count >= 2,
            progressText: `${count} / 2 Field Directives Executed`,
            progressPercent: Math.min(100, Math.round((count / 2) * 100)),
          };
        },
      },
      {
        id: "ge-mil-3",
        title: "Defense of the Delaware",
        description:
          "Maintain unbroken control of Philadelphia with a stationed garrison.",
        howToComplete:
          "Keep at least 1 strong regiment garrisoned in Philadelphia.",
        victoryPoints: 3,
        category: "TERRITORIAL",
        evaluate: (ctx) => {
          const res = hasNodeControl(ctx, ["Philadelphia"]);
          return {
            isCompleted: res.allControlled,
            progressText: res.allControlled ? "Philadelphia Secure" : "Philadelphia Lost",
            progressPercent: res.allControlled ? 100 : 0,
          };
        },
      },
    ],
  },
  {
    factionType: FactionType.GERMAN_STATES,
    factionDisplayName: "German States (Prussia & Auxiliaries)",
    roleType: RoleType.DIPLOMATIC_COMMERCE,
    roleTitle: "Continental Subsidy & Mercenary Commissary",
    characterPersonaName: "Baron von Knyphausen & Commissariat",
    playerBriefing:
      "You manage the commissariat contracts, timber revenues of Philadelphia, and Westminster subsidy remittances between London, Philadelphia, and Berlin.",
    strategicPlaystyle:
      "Harvest Philadelphia's £35/turn timber yield, trade with British ports, and transfer war subsidies.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "ge-dip-1",
        title: "Continental War Chest (£190+ Treasury)",
        description:
          "Grow the German States treasury to £190 or higher through timber extraction and subsidy management.",
        howToComplete:
          "Issue EXTRACT and TRADE orders at Philadelphia.",
        victoryPoints: 4,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const t = ctx.faction?.treasury ?? 0;
          return {
            isCompleted: t >= 190,
            progressText: `£${t} / £190 Commissariat Treasury`,
            progressPercent: Math.min(100, Math.round((t / 190) * 100)),
          };
        },
      },
      {
        id: "ge-dip-2",
        title: "Commissariat Supply Runs (2+ Extract/Trade Orders)",
        description:
          "Submit at least 2 EXTRACT or TRADE directives to equip auxiliary regiments.",
        howToComplete:
          "Select Philadelphia and issue EXTRACT or TRADE orders.",
        victoryPoints: 3,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const count = countOrdersOfType(ctx, ["EXTRACT", "TRADE"]);
          return {
            isCompleted: count >= 2,
            progressText: `${count} / 2 Supply Directives`,
            progressPercent: Math.min(100, Math.round((count / 2) * 100)),
          };
        },
      },
      {
        id: "ge-dip-3",
        title: "Allied Coalition Remittance",
        description:
          "Execute at least 1 SUBSIDIZE order or send a diplomatic courier to Great Britain or Haudenosaunee.",
        howToComplete:
          "Submit a SUBSIDIZE order or send a courier via the Couriers tab.",
        victoryPoints: 3,
        category: "DIPLOMATIC",
        evaluate: (ctx) => {
          const count = countOrdersOfType(ctx, ["SUBSIDIZE"]) + (ctx.factionDispatches?.length ?? 0);
          return {
            isCompleted: count >= 1,
            progressText: `${count} / 1 Coalition Remittance`,
            progressPercent: Math.min(100, count * 100),
          };
        },
      },
    ],
  },

  // ============================================================================
  // 7. HAUDENOSAUNEE (SIX NATIONS CONFEDERACY)
  // ============================================================================
  {
    factionType: FactionType.HAUDENOSAUNEE,
    factionDisplayName: "Haudenosaunee (Six Nations Confederacy)",
    roleType: RoleType.EXECUTIVE,
    roleTitle: "Speaker of the Grand Council at Onondaga",
    characterPersonaName: "Tadodaho & Theyanoguin (King Hendrick)",
    playerBriefing:
      "You speak for the Grand Council of the Six Nations (Mohawk, Oneida, Onondaga, Cayuga, Seneca, Tuscarora) at the sacred Onondaga Council Fire. Holding the geographic pivot between Albany, Oswego, and Niagara, you play Britain and France against one another to defend Confederacy homelands.",
    strategicPlaystyle:
      "Guard Onondaga, enact sacred Covenant Boundaries to bar colonial encroachment, and demand wampum and gunpowder gifts from both empires.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "hd-exec-1",
        title: "Sacred Tree of Peace: Hold Onondaga & Covenant Protection",
        description:
          "Maintain unbroken control of Onondaga Council Fire and establish at least 1 protected Covenant Boundary.",
        howToComplete:
          "Defend Onondaga and issue a COVENANT_BOUNDARY directive in the Sovereignty & Treaties matrix.",
        victoryPoints: 4,
        category: "SOVEREIGNTY",
        evaluate: (ctx) => {
          const hasOnondaga = hasNodeControl(ctx, ["Onondaga"]).allControlled;
          const covs = ctx.faction?.covenantBoundaries?.length ?? 0;
          const done = hasOnondaga && covs >= 1;
          return {
            isCompleted: done,
            progressText: `Onondaga: ${hasOnondaga ? "Held" : "Lost"} • ${covs}/1 Covenant Line`,
            progressPercent: done ? 100 : hasOnondaga ? 50 : 0,
          };
        },
      },
      {
        id: "hd-exec-2",
        title: "Iroquoia Expansion (2+ Controlled Nodes)",
        description:
          "Expand Six Nations territorial control to at least 2 nodes (e.g., Onondaga plus Fort Oswego or Fort Niagara).",
        howToComplete:
          "March war parties to reclaim ancestral hunting and portage grounds at Fort Oswego or Fort Niagara.",
        victoryPoints: 3,
        category: "TERRITORIAL",
        evaluate: (ctx) => {
          const count = ctx.faction?.nodesControlled?.length ?? 0;
          return {
            isCompleted: count >= 2,
            progressText: `${count} / 2 Confederacy Nodes Controlled`,
            progressPercent: Math.min(100, Math.round((count / 2) * 100)),
          };
        },
      },
      {
        id: "hd-exec-3",
        title: "Harmony of the Longhouse (Unrest ≤ 15% & Standing ≥ 6)",
        description:
          "Keep Confederacy domestic Unrest at 15% or lower while achieving 6+ Standing Points.",
        howToComplete:
          "Distribute wampum gifts via SUBSIDIZE/TRADE and protect council towns.",
        victoryPoints: 3,
        category: "DIPLOMATIC",
        evaluate: (ctx) => {
          const u = ctx.faction?.unrestIndex ?? 0;
          const s = ctx.faction?.standingPoints ?? 0;
          const done = u <= 15 && s >= 6;
          return {
            isCompleted: done,
            progressText: `Unrest: ${u}% (≤15%) • Standing: ${s}/6`,
            progressPercent: done ? 100 : Math.min(90, Math.round((s / 6) * 80)),
          };
        },
      },
    ],
  },
  {
    factionType: FactionType.HAUDENOSAUNEE,
    factionDisplayName: "Haudenosaunee (Six Nations Confederacy)",
    roleType: RoleType.MILITARY,
    roleTitle: "Principal War Chief of the Mohawk & Seneca Doors",
    characterPersonaName: "Sayenqueraghta (Old Smoke) & Mohawk War Captains",
    playerBriefing:
      "You guard the Eastern (Mohawk) and Western (Seneca) Doors of the Longhouse. Your warriors excel in forest ambushes, lightning raids on supply portages, and mourning-war captive expeditions.",
    strategicPlaystyle:
      "Launch frontier raids against encroaching European forts and muster war parties at Onondaga.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "hd-mil-1",
        title: "Guardians of the Eastern & Western Doors (2,200+ Strength)",
        description:
          "Muster Haudenosaunee warrior strength to at least 2,200 braves.",
        howToComplete:
          "Issue RECRUIT (Muster Troops) orders at Onondaga Council Fire.",
        victoryPoints: 4,
        category: "MILITARY",
        evaluate: (ctx) => {
          const str = getTotalStrength(ctx);
          return {
            isCompleted: str >= 2200,
            progressText: `${str.toLocaleString()} / 2,200 Warrior Strength`,
            progressPercent: Math.min(100, Math.round((str / 2200) * 100)),
          };
        },
      },
      {
        id: "hd-mil-2",
        title: "Mourning-War Raiding Campaign (2+ Raids)",
        description:
          "Execute at least 2 frontier RAID directives against rival border posts to seize supplies and captives.",
        howToComplete:
          "Select Onondaga and issue RAID orders targeting adjacent French or British forts.",
        victoryPoints: 3,
        category: "MILITARY",
        evaluate: (ctx) => {
          const count = countOrdersOfType(ctx, ["RAID"]);
          return {
            isCompleted: count >= 2,
            progressText: `${count} / 2 Frontier Raids Launched`,
            progressPercent: Math.min(100, Math.round((count / 2) * 100)),
          };
        },
      },
      {
        id: "hd-mil-3",
        title: "Defend the Onondaga Council Fire",
        description:
          "Ensure Onondaga Council Fire never falls to foreign occupation.",
        howToComplete:
          "Maintain a strong warrior garrison at Onondaga.",
        victoryPoints: 3,
        category: "TERRITORIAL",
        evaluate: (ctx) => {
          const res = hasNodeControl(ctx, ["Onondaga"]);
          return {
            isCompleted: res.allControlled,
            progressText: res.allControlled ? "Onondaga Unconquered" : "Onondaga Lost",
            progressPercent: res.allControlled ? 100 : 0,
          };
        },
      },
    ],
  },
  {
    factionType: FactionType.HAUDENOSAUNEE,
    factionDisplayName: "Haudenosaunee (Six Nations Confederacy)",
    roleType: RoleType.DIPLOMATIC_COMMERCE,
    roleTitle: "Wampum Keeper of the Covenant Chain",
    characterPersonaName: "Clan Matrons & Wampum Keepers of Onondaga",
    playerBriefing:
      "You hold the sacred wampum belts that record every treaty with Albany and Montreal. You barter prime Iroquois beaver pelts for European muskets, powder, lead, and brass kettles.",
    strategicPlaystyle:
      "Harvest Onondaga's £30/turn fur yield, trade for European munitions, and send condolence wampum gifts.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "hd-dip-1",
        title: "Lake Ontario Fur Primacy (£160+ Treasury)",
        description:
          "Build the Confederacy treasury to £160 or higher through beaver peltry extraction and trade.",
        howToComplete:
          "Issue EXTRACT and TRADE orders at Onondaga Council Fire.",
        victoryPoints: 4,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const t = ctx.faction?.treasury ?? 0;
          return {
            isCompleted: t >= 160,
            progressText: `£${t} / £160 Peltry & Wampum Treasury`,
            progressPercent: Math.min(100, Math.round((t / 160) * 100)),
          };
        },
      },
      {
        id: "hd-dip-2",
        title: "Wampum Condolence Diplomacy (2+ Subsidize/Trade Orders)",
        description:
          "Execute at least 2 SUBSIDIZE or TRADE directives to distribute wampum and secure gunpowder.",
        howToComplete:
          "Use SUBSIDIZE and TRADE orders in the Economy & Governance matrix.",
        victoryPoints: 3,
        category: "DIPLOMATIC",
        evaluate: (ctx) => {
          const count = countOrdersOfType(ctx, ["SUBSIDIZE", "TRADE", "EXTRACT"]);
          return {
            isCompleted: count >= 2,
            progressText: `${count} / 2 Wampum & Trade Directives`,
            progressPercent: Math.min(100, Math.round((count / 2) * 100)),
          };
        },
      },
      {
        id: "hd-dip-3",
        title: "Sovereign Debt Freedom (Zero Debt)",
        description:
          "Maintain zero sovereign debt (£0) so the Six Nations remain beholden to no European crown.",
        howToComplete:
          "Fund all warrior musters and gifts strictly from peltry revenues and subsidies.",
        victoryPoints: 3,
        category: "SOVEREIGNTY",
        evaluate: (ctx) => {
          const d = ctx.faction?.debt ?? 0;
          return {
            isCompleted: d === 0,
            progressText: `Debt: £${d} (Target: £0)`,
            progressPercent: d === 0 ? 100 : 0,
          };
        },
      },
    ],
  },

  // ============================================================================
  // 8. SEVEN NATIONS OF CANADA
  // ============================================================================
  {
    factionType: FactionType.SEVEN_NATIONS,
    factionDisplayName: "Seven Nations of Canada",
    roleType: RoleType.EXECUTIVE,
    roleTitle: "Grand Council Speaker at Kahnawake",
    characterPersonaName: "Kahnawake, Kanesatake & Odanak Council Chiefs",
    playerBriefing:
      "You lead the Seven Nations of Canada from Kahnawake along the St. Lawrence River. Allied with New France by kinship and treaty—yet fiercely independent—you protect the mission towns and command the vital river approaches to Montreal and Quebec.",
    strategicPlaystyle:
      "Defend Kahnawake, support French defense of the St. Lawrence while preserving warrior autonomy, and raid British salients.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "sn-exec-1",
        title: "Sanctuary of Kahnawake & St. Lawrence",
        description:
          "Maintain unbroken control of Kahnawake (Seven Nations Council) while keeping Unrest at or below 15%.",
        howToComplete:
          "Garrison Kahnawake and distribute wampum subsidies to keep mission towns united.",
        victoryPoints: 4,
        category: "SOVEREIGNTY",
        evaluate: (ctx) => {
          const held = hasNodeControl(ctx, ["Kahnawake"]).allControlled;
          const u = ctx.faction?.unrestIndex ?? 0;
          const done = held && u <= 15;
          return {
            isCompleted: done,
            progressText: `Kahnawake: ${held ? "Held" : "Lost"} • Unrest: ${u}% (≤15%)`,
            progressPercent: done ? 100 : held ? 60 : 0,
          };
        },
      },
      {
        id: "sn-exec-2",
        title: "Northern Confederacy Prestige (6+ Standing Points)",
        description:
          "Raise the Seven Nations' Standing Points to 6 or higher.",
        howToComplete:
          "Conduct successful frontier raids, honor alliance treaties, and proclaim covenant boundaries.",
        victoryPoints: 3,
        category: "DIPLOMATIC",
        evaluate: (ctx) => {
          const pts = ctx.faction?.standingPoints ?? 0;
          return {
            isCompleted: pts >= 6,
            progressText: `${pts} / 6 Standing Points`,
            progressPercent: Math.min(100, Math.round((pts / 6) * 100)),
          };
        },
      },
      {
        id: "sn-exec-3",
        title: "Mission Town Sovereignty (1+ Covenant or 2+ Nodes)",
        description:
          "Proclaim at least 1 Covenant Boundary over Kahnawake OR expand control to 2+ nodes.",
        howToComplete:
          "Issue COVENANT_BOUNDARY at Kahnawake or capture an adjacent portage node.",
        victoryPoints: 3,
        category: "TERRITORIAL",
        evaluate: (ctx) => {
          const covs = ctx.faction?.covenantBoundaries?.length ?? 0;
          const nodes = ctx.faction?.nodesControlled?.length ?? 0;
          const done = covs >= 1 || nodes >= 2;
          return {
            isCompleted: done,
            progressText: `${covs} Covenant(s) • ${nodes} Node(s) Controlled`,
            progressPercent: done ? 100 : 50,
          };
        },
      },
    ],
  },
  {
    factionType: FactionType.SEVEN_NATIONS,
    factionDisplayName: "Seven Nations of Canada",
    roleType: RoleType.MILITARY,
    roleTitle: "Principal War Captain of the St. Lawrence Corridor",
    characterPersonaName: "Abenaki & Caughnawaga War Captains",
    playerBriefing:
      "Your warriors are masters of canoe mobility and winter snowshoe raids along Lake Champlain and the New England frontier. Strike British supply lines and ambush careless regular columns.",
    strategicPlaystyle:
      "Launch lightning RAID operations from Kahnawake against British frontier forts and muster war parties.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "sn-mil-1",
        title: "Champlain Raiding Terror (2+ Frontier Raids)",
        description:
          "Conduct at least 2 RAID operations against enemy-controlled frontier nodes.",
        howToComplete:
          "Select Kahnawake and submit RAID directives targeting Fort Oswego, Boston, or British posts.",
        victoryPoints: 4,
        category: "MILITARY",
        evaluate: (ctx) => {
          const count = countOrdersOfType(ctx, ["RAID"]);
          return {
            isCompleted: count >= 2,
            progressText: `${count} / 2 Frontier Raids Executed`,
            progressPercent: Math.min(100, Math.round((count / 2) * 100)),
          };
        },
      },
      {
        id: "sn-mil-2",
        title: "St. Lawrence War Host (1,800+ Warrior Strength)",
        description:
          "Muster Seven Nations warrior strength to at least 1,800 braves.",
        howToComplete:
          "Submit RECRUIT orders at Kahnawake.",
        victoryPoints: 3,
        category: "MILITARY",
        evaluate: (ctx) => {
          const str = getTotalStrength(ctx);
          return {
            isCompleted: str >= 1800,
            progressText: `${str.toLocaleString()} / 1,800 Warrior Strength`,
            progressPercent: Math.min(100, Math.round((str / 1800) * 100)),
          };
        },
      },
      {
        id: "sn-mil-3",
        title: "Shield of the Mission Villages",
        description:
          "Keep Kahnawake defended and under Seven Nations control.",
        howToComplete:
          "Station war parties at Kahnawake to repel any invasion.",
        victoryPoints: 3,
        category: "TERRITORIAL",
        evaluate: (ctx) => {
          const res = hasNodeControl(ctx, ["Kahnawake"]);
          return {
            isCompleted: res.allControlled,
            progressText: res.allControlled ? "Kahnawake Secure" : "Kahnawake Lost",
            progressPercent: res.allControlled ? 100 : 0,
          };
        },
      },
    ],
  },
  {
    factionType: FactionType.SEVEN_NATIONS,
    factionDisplayName: "Seven Nations of Canada",
    roleType: RoleType.DIPLOMATIC_COMMERCE,
    roleTitle: "Keeper of the Montreal-Albany Fur Conduit",
    characterPersonaName: "Kahnawake Fur & Wampum Intermediaries",
    playerBriefing:
      "You direct the lucrative cross-border fur trade between Montreal and Albany. Even in wartime, your canoe convoys carry prime northern beaver pelts in exchange for powder, silver, and cloth.",
    strategicPlaystyle:
      "Harvest Kahnawake's £25/turn fur yield, execute trade missions, and distribute gifts to keep unrest low.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "sn-dip-1",
        title: "Northern Peltry Reserve (£130+ Treasury)",
        description:
          "Build the Seven Nations treasury to £130 or higher through fur extraction and trade.",
        howToComplete:
          "Issue EXTRACT and TRADE orders at Kahnawake.",
        victoryPoints: 4,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const t = ctx.faction?.treasury ?? 0;
          return {
            isCompleted: t >= 130,
            progressText: `£${t} / £130 Peltry Treasury`,
            progressPercent: Math.min(100, Math.round((t / 130) * 100)),
          };
        },
      },
      {
        id: "sn-dip-2",
        title: "Montreal-Albany Conduit (2+ Trade/Subsidize Orders)",
        description:
          "Execute at least 2 EXTRACT, TRADE, or SUBSIDIZE directives.",
        howToComplete:
          "Submit EXTRACT, TRADE, or SUBSIDIZE orders from Kahnawake.",
        victoryPoints: 3,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const count = countOrdersOfType(ctx, ["EXTRACT", "TRADE", "SUBSIDIZE"]);
          return {
            isCompleted: count >= 2,
            progressText: `${count} / 2 Conduit Orders`,
            progressPercent: Math.min(100, Math.round((count / 2) * 100)),
          };
        },
      },
      {
        id: "sn-dip-3",
        title: "Kinship Diplomacy with Onondaga & France",
        description:
          "Send at least 1 diplomatic courier or wampum subsidy to an allied or neighboring faction.",
        howToComplete:
          "Use the Couriers tab or SUBSIDIZE order.",
        victoryPoints: 3,
        category: "DIPLOMATIC",
        evaluate: (ctx) => {
          const count = countOrdersOfType(ctx, ["SUBSIDIZE"]) + (ctx.factionDispatches?.length ?? 0);
          return {
            isCompleted: count >= 1,
            progressText: `${count} / 1 Kinship Dispatch`,
            progressPercent: Math.min(100, count * 100),
          };
        },
      },
    ],
  },

  // ============================================================================
  // 9. WESTERN CONFEDERACY (OHIO & PAYS D'EN HAUT)
  // ============================================================================
  {
    factionType: FactionType.WESTERN_CONFEDERACY,
    factionDisplayName: "Western Confederacy (Ohio & Pays d'en Haut)",
    roleType: RoleType.EXECUTIVE,
    roleTitle: "Speaker of the Shawnee, Delaware & Miami Council at Scioto",
    characterPersonaName: "Shingas, Teedyuscung & Pontiac",
    playerBriefing:
      "You lead the Shawnee, Delaware (Lenape), Miami, and Wyandot nations of the Ohio Country. Both British land speculators and French fort-builders covet your fertile river valleys. Drive back colonial encroachment and secure permanent sovereignty over the Ohio Country!",
    strategicPlaystyle:
      "Hold Scioto Council Towns and the Ohio River Portage, proclaim Easton Covenant boundaries, and distribute gifts to prevent tribal unrest.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "wc-exec-1",
        title: "Sovereigns of the Ohio Country (Hold Scioto & Ohio Forks)",
        description:
          "Maintain Western Confederacy control over both Scioto Council Towns and Ohio River Portage & Forks.",
        howToComplete:
          "Defend Scioto and Ohio River Portage with strong war parties.",
        victoryPoints: 4,
        category: "TERRITORIAL",
        evaluate: (ctx) => {
          const res = hasNodeControl(ctx, ["Scioto", "Ohio River Portage"]);
          return {
            isCompleted: res.allControlled,
            progressText: `${res.controlledCount} / 2 Ohio Heartland Nodes Held`,
            progressPercent: Math.round((res.controlledCount / 2) * 100),
          };
        },
      },
      {
        id: "wc-exec-2",
        title: "Treaty of Easton Boundary Line",
        description:
          "Establish at least 1 sacred Covenant Boundary over your Ohio Country territories to bar colonial settlement.",
        howToComplete:
          "Select Scioto Council Towns or Ohio River Portage and issue a COVENANT_BOUNDARY directive.",
        victoryPoints: 3,
        category: "SOVEREIGNTY",
        evaluate: (ctx) => {
          const covs = ctx.faction?.covenantBoundaries?.length ?? 0;
          return {
            isCompleted: covs >= 1,
            progressText: `${covs} / 1 Easton Covenant Proclaimed`,
            progressPercent: Math.min(100, covs * 100),
          };
        },
      },
      {
        id: "wc-exec-3",
        title: "Council Fire Unity (Unrest ≤ 35% & Standing ≥ 6)",
        description:
          "Keep Confederacy domestic Unrest at or below 35% while achieving 6+ Standing Points.",
        howToComplete:
          "Distribute trade goods via SUBSIDIZE/TRADE to cool border war weariness.",
        victoryPoints: 3,
        category: "DIPLOMATIC",
        evaluate: (ctx) => {
          const u = ctx.faction?.unrestIndex ?? 0;
          const s = ctx.faction?.standingPoints ?? 0;
          const done = u <= 35 && s >= 6;
          return {
            isCompleted: done,
            progressText: `Unrest: ${u}% (≤35%) • Standing: ${s}/6`,
            progressPercent: done ? 100 : Math.min(85, Math.round((s / 6) * 75)),
          };
        },
      },
    ],
  },
  {
    factionType: FactionType.WESTERN_CONFEDERACY,
    factionDisplayName: "Western Confederacy (Ohio & Pays d'en Haut)",
    roleType: RoleType.MILITARY,
    roleTitle: "Principal War Chief of the Ohio Forks",
    characterPersonaName: "Captain Jacobs, Shingas the Terrible & Bemino",
    playerBriefing:
      "Your Delaware, Shawnee, and Mingo war parties struck terror into Braddock's column and rolled back the Pennsylvania and Virginia frontier by a hundred miles. Keep up the pressure on colonial settlements and defend the Ohio River passes.",
    strategicPlaystyle:
      "Execute fierce RAID operations against Philadelphia or frontier forts and muster war parties at Scioto.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "wc-mil-1",
        title: "Scourge of the Allegheny Frontier (2+ Raids)",
        description:
          "Launch at least 2 frontier RAID directives against enemy-controlled settlements or forts.",
        howToComplete:
          "Select Scioto or Ohio River Portage and issue RAID orders against Philadelphia or hostile forts.",
        victoryPoints: 4,
        category: "MILITARY",
        evaluate: (ctx) => {
          const count = countOrdersOfType(ctx, ["RAID"]);
          return {
            isCompleted: count >= 2,
            progressText: `${count} / 2 Frontier Raids Executed`,
            progressPercent: Math.min(100, Math.round((count / 2) * 100)),
          };
        },
      },
      {
        id: "wc-mil-2",
        title: "Warriors of the Pays d'en Haut (2,200+ Strength)",
        description:
          "Muster Western Confederacy warrior strength to at least 2,200 braves.",
        howToComplete:
          "Submit RECRUIT (Muster Troops) orders at Scioto Council Towns.",
        victoryPoints: 3,
        category: "MILITARY",
        evaluate: (ctx) => {
          const str = getTotalStrength(ctx);
          return {
            isCompleted: str >= 2200,
            progressText: `${str.toLocaleString()} / 2,200 Warrior Strength`,
            progressPercent: Math.min(100, Math.round((str / 2200) * 100)),
          };
        },
      },
      {
        id: "wc-mil-3",
        title: "Reclaim the Forks (3+ Controlled Nodes)",
        description:
          "Expand Western Confederacy territorial control to 3 or more nodes (e.g. capturing Fort Duquesne or Fort Niagara).",
        howToComplete:
          "March war parties using MOVE orders to capture an adjacent fort.",
        victoryPoints: 3,
        category: "TERRITORIAL",
        evaluate: (ctx) => {
          const count = ctx.faction?.nodesControlled?.length ?? 0;
          return {
            isCompleted: count >= 3,
            progressText: `${count} / 3 Nodes Controlled`,
            progressPercent: Math.min(100, Math.round((count / 3) * 100)),
          };
        },
      },
    ],
  },
  {
    factionType: FactionType.WESTERN_CONFEDERACY,
    factionDisplayName: "Western Confederacy (Ohio & Pays d'en Haut)",
    roleType: RoleType.DIPLOMATIC_COMMERCE,
    roleTitle: "Clan Keeper of the Ohio Peltry & Powder Trade",
    characterPersonaName: "White Eyes, Pisquetomen & Ohio Peltry Factors",
    playerBriefing:
      "Your warriors cannot fight without European gunpowder, lead shot, and vermilion, nor can your villages thrive without trade textiles. Leverage the rich fur yields of the Scioto and Ohio valleys to keep your confederacy wealthy and well-armed.",
    strategicPlaystyle:
      "Harvest fur yields from Scioto and Ohio River Portage every turn and barter for munitions.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "wc-dip-1",
        title: "Ohio Valley Peltry Wealth (£160+ Treasury)",
        description:
          "Accumulate at least £160 in the Western Confederacy treasury from Ohio fur extraction and trade.",
        howToComplete:
          "Issue EXTRACT and TRADE orders at Scioto Council Towns and Ohio River Portage.",
        victoryPoints: 4,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const t = ctx.faction?.treasury ?? 0;
          return {
            isCompleted: t >= 160,
            progressText: `£${t} / £160 Peltry Treasury`,
            progressPercent: Math.min(100, Math.round((t / 160) * 100)),
          };
        },
      },
      {
        id: "wc-dip-2",
        title: "Powder & Lead Barter (2+ Extract/Trade Orders)",
        description:
          "Execute at least 2 EXTRACT or TRADE directives to keep hunters and war captains supplied.",
        howToComplete:
          "Submit EXTRACT and TRADE orders in the Economy & Governance matrix.",
        victoryPoints: 3,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const count = countOrdersOfType(ctx, ["EXTRACT", "TRADE"]);
          return {
            isCompleted: count >= 2,
            progressText: `${count} / 2 Peltry & Powder Orders`,
            progressPercent: Math.min(100, Math.round((count / 2) * 100)),
          };
        },
      },
      {
        id: "wc-dip-3",
        title: "Council Gift Reciprocity",
        description:
          "Execute at least 1 SUBSIDIZE gift distribution or send a diplomatic courier.",
        howToComplete:
          "Submit a SUBSIDIZE order or send a courier via the Couriers tab.",
        victoryPoints: 3,
        category: "DIPLOMATIC",
        evaluate: (ctx) => {
          const count = countOrdersOfType(ctx, ["SUBSIDIZE"]) + (ctx.factionDispatches?.length ?? 0);
          return {
            isCompleted: count >= 1,
            progressText: `${count} / 1 Council Gift Action`,
            progressPercent: Math.min(100, count * 100),
          };
        },
      },
    ],
  },

  // ============================================================================
  // 10. SOUTHEASTERN NATIONS (CHEROKEE & CREEK CONFEDERACY)
  // ============================================================================
  {
    factionType: FactionType.SOUTHEASTERN_NATIONS,
    factionDisplayName: "Southeastern Nations (Cherokee & Creek Confederacy)",
    roleType: RoleType.EXECUTIVE,
    roleTitle: "Beloved Man & First Speaker at Chota",
    characterPersonaName: "Attakullakulla (Little Carpenter) & Conocotocko (Standing Turkey)",
    playerBriefing:
      "From the sacred council house at Chota in the Overhill towns, you guide the Cherokee and Creek Confederacy. Situated between British Carolina/Virginia and French Louisiana, you play both European empires off each other to defend the southern Appalachian mountains.",
    strategicPlaystyle:
      "Protect Chota, establish a sovereign Covenant Boundary, and maintain high Confederacy standing.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "se-exec-1",
        title: "Sacred Mother Town of Chota",
        description:
          "Maintain unbroken control of Chota (Overhill Council Center) and establish at least 1 Covenant Boundary.",
        howToComplete:
          "Defend Chota and submit a COVENANT_BOUNDARY order in the Sovereignty & Treaties matrix.",
        victoryPoints: 4,
        category: "SOVEREIGNTY",
        evaluate: (ctx) => {
          const held = hasNodeControl(ctx, ["Chota"]).allControlled;
          const covs = ctx.faction?.covenantBoundaries?.length ?? 0;
          const done = held && covs >= 1;
          return {
            isCompleted: done,
            progressText: `Chota: ${held ? "Held" : "Lost"} • ${covs}/1 Covenant Line`,
            progressPercent: done ? 100 : held ? 50 : 0,
          };
        },
      },
      {
        id: "se-exec-2",
        title: "Southern Mountain Hegemony (6+ Standing Points)",
        description:
          "Elevate Southeastern Nations Standing Points to 6 or higher.",
        howToComplete:
          "Conduct successful border diplomacy, defend tribal lands, and fulfill role objectives.",
        victoryPoints: 3,
        category: "DIPLOMATIC",
        evaluate: (ctx) => {
          const pts = ctx.faction?.standingPoints ?? 0;
          return {
            isCompleted: pts >= 6,
            progressText: `${pts} / 6 Standing Points`,
            progressPercent: Math.min(100, Math.round((pts / 6) * 100)),
          };
        },
      },
      {
        id: "se-exec-3",
        title: "Peace of the Overhill Towns (Unrest ≤ 20%)",
        description:
          "Keep internal Confederacy Unrest at 20% or lower.",
        howToComplete:
          "Prevent foreign occupation of Chota and maintain steady trade goods distribution.",
        victoryPoints: 3,
        category: "SOVEREIGNTY",
        evaluate: (ctx) => {
          const u = ctx.faction?.unrestIndex ?? 0;
          return {
            isCompleted: u <= 20,
            progressText: `Unrest: ${u}% (Target ≤ 20%)`,
            progressPercent: u <= 20 ? 100 : Math.max(0, 100 - (u - 20) * 3),
          };
        },
      },
    ],
  },
  {
    factionType: FactionType.SOUTHEASTERN_NATIONS,
    factionDisplayName: "Southeastern Nations (Cherokee & Creek Confederacy)",
    roleType: RoleType.MILITARY,
    roleTitle: "Red War Chief of the Overhill Towns",
    characterPersonaName: "Oconostota (Great Warrior of Chota) & Mortar of the Creeks",
    playerBriefing:
      "You are the Red War Chief of Chota. When frontier settlers or soldiers violate Cherokee blood law or encroach upon mountain hunting grounds, you lead swift, devastating war parties across the southern passes.",
    strategicPlaystyle:
      "Muster Cherokee and Creek warriors at Chota and launch frontier raids or territorial expansions.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "se-mil-1",
        title: "Overhill War Host (2,200+ Warrior Strength)",
        description:
          "Muster Cherokee and Creek warrior strength to at least 2,200 braves.",
        howToComplete:
          "Issue RECRUIT (Muster Troops) orders at Chota (Overhill Council Center).",
        victoryPoints: 4,
        category: "MILITARY",
        evaluate: (ctx) => {
          const str = getTotalStrength(ctx);
          return {
            isCompleted: str >= 2200,
            progressText: `${str.toLocaleString()} / 2,200 Warrior Strength`,
            progressPercent: Math.min(100, Math.round((str / 2200) * 100)),
          };
        },
      },
      {
        id: "se-mil-2",
        title: "Blood Law Retaliation (2+ Frontier Raids)",
        description:
          "Execute at least 2 frontier RAID operations from Chota.",
        howToComplete:
          "Select Chota and submit RAID directives targeting adjacent rival nodes.",
        victoryPoints: 3,
        category: "MILITARY",
        evaluate: (ctx) => {
          const count = countOrdersOfType(ctx, ["RAID"]);
          return {
            isCompleted: count >= 2,
            progressText: `${count} / 2 Frontier Raids Executed`,
            progressPercent: Math.min(100, Math.round((count / 2) * 100)),
          };
        },
      },
      {
        id: "se-mil-3",
        title: "Guardians of the Southern Passes",
        description:
          "Hold Chota and expand or project military force into at least 1 adjacent corridor.",
        howToComplete:
          "Keep Chota garrisoned and issue MOVE or RAID orders.",
        victoryPoints: 3,
        category: "TERRITORIAL",
        evaluate: (ctx) => {
          const held = hasNodeControl(ctx, ["Chota"]).allControlled;
          const moves = countOrdersOfType(ctx, ["MOVE", "RAID"]);
          const done = held && moves >= 1;
          return {
            isCompleted: done,
            progressText: `Chota Held • ${moves}/1 Mountain Expedition`,
            progressPercent: done ? 100 : held ? 50 : 0,
          };
        },
      },
    ],
  },
  {
    factionType: FactionType.SOUTHEASTERN_NATIONS,
    factionDisplayName: "Southeastern Nations (Cherokee & Creek Confederacy)",
    roleType: RoleType.DIPLOMATIC_COMMERCE,
    roleTitle: "Keeper of the Deerskin & Southern Path Trade",
    characterPersonaName: "Overhill Deerskin Traders & Creek Balance-of-Power Envoys",
    playerBriefing:
      "You control the lucrative Southern Path deerskin trade connecting Chota with Charles Town and French New Orleans. By playing British and French merchants against each other, you keep your towns supplied with muskets, powder, and wool matchcoats.",
    strategicPlaystyle:
      "Harvest Chota's £28/turn deerskin yield, dispatch trade convoys, and maintain zero foreign debt.",
    totalRoleVP: 10,
    objectives: [
      {
        id: "se-dip-1",
        title: "Southern Deerskin Emporium (£150+ Treasury)",
        description:
          "Accumulate at least £150 in the Confederacy treasury through deerskin extraction and trade.",
        howToComplete:
          "Submit EXTRACT and TRADE orders at Chota.",
        victoryPoints: 4,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const t = ctx.faction?.treasury ?? 0;
          return {
            isCompleted: t >= 150,
            progressText: `£${t} / £150 Deerskin Treasury`,
            progressPercent: Math.min(100, Math.round((t / 150) * 100)),
          };
        },
      },
      {
        id: "se-dip-2",
        title: "Southern Path Caravans (2+ Extract/Trade Orders)",
        description:
          "Execute at least 2 EXTRACT or TRADE directives from Chota.",
        howToComplete:
          "Use the Economy & Governance matrix to issue EXTRACT and TRADE orders.",
        victoryPoints: 3,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const count = countOrdersOfType(ctx, ["EXTRACT", "TRADE"]);
          return {
            isCompleted: count >= 2,
            progressText: `${count} / 2 Caravan Directives`,
            progressPercent: Math.min(100, Math.round((count / 2) * 100)),
          };
        },
      },
      {
        id: "se-dip-3",
        title: "Two-Fire Diplomacy (1+ Subsidy or Courier)",
        description:
          "Send at least 1 diplomatic courier or gift subsidy to leverage British and French rivalry.",
        howToComplete:
          "Use the Couriers tab or issue a SUBSIDIZE directive.",
        victoryPoints: 3,
        category: "DIPLOMATIC",
        evaluate: (ctx) => {
          const count = countOrdersOfType(ctx, ["SUBSIDIZE"]) + (ctx.factionDispatches?.length ?? 0);
          return {
            isCompleted: count >= 1,
            progressText: `${count} / 1 Diplomatic Envoy Action`,
            progressPercent: Math.min(100, count * 100),
          };
        },
      },
    ],
  },
];

export function getCharacterRoleGuide(
  factionType: FactionType,
  roleType: RoleType
): CharacterRoleGuide {
  return (
    CHARACTER_ROLE_GUIDES.find(
      (g) => g.factionType === factionType && g.roleType === roleType
    ) ?? CHARACTER_ROLE_GUIDES[0]
  );
}

export function evaluateCharacterObjectives(
  guide: CharacterRoleGuide,
  game: any,
  faction: any
) {
  const allNodes = game?.nodes ?? [];
  const factionOrders = (game?.orders ?? []).filter(
    (o: any) => o.factionId === faction?.id
  );
  const factionDispatches = (game?.dispatches ?? []).filter(
    (d: any) => d.senderFactionId === faction?.id
  );
  const factionEvents = (game?.events ?? []).filter((e: any) =>
    (e.factionIds ?? []).includes(faction?.id)
  );

  const ctx: ObjectiveEvalContext = {
    game,
    faction,
    allNodes,
    factionOrders,
    factionDispatches,
    factionEvents,
  };

  let earnedVP = 0;
  const evaluatedObjectives = guide.objectives.map((obj) => {
    const res = obj.evaluate(ctx);
    if (res.isCompleted) {
      earnedVP += obj.victoryPoints;
    }
    return {
      ...obj,
      ...res,
    };
  });

  return {
    earnedVP,
    totalRoleVP: guide.totalRoleVP,
    evaluatedObjectives,
  };
}
