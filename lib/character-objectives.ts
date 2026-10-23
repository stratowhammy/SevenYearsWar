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
    earnedVP?: number;
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
  controlledList: string[];
} {
  const controlledNames: string[] = (ctx.faction?.nodesControlled ?? []).map((n: any) =>
    (n.name ?? "").toLowerCase()
  );
  let count = 0;
  const list: string[] = [];
  for (const target of nodeNameSubstrings) {
    const tLower = target.toLowerCase();
    if (controlledNames.some((cn) => cn.includes(tLower))) {
      count++;
      list.push(target);
    }
  }
  return {
    controlledCount: count,
    totalRequired: nodeNameSubstrings.length,
    allControlled: count >= nodeNameSubstrings.length,
    controlledList: list,
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
          "Shatter French imperial power in North America by capturing Fortress Louisbourg or the Citadel of Quebec (or both).",
        howToComplete:
          "Coordinate with your Military Commander to issue AMPHIBIOUS_ASSAULT and MOVE directives against Fortress Louisbourg and Quebec.",
        victoryPoints: 5,
        category: "TERRITORIAL",
        evaluate: (ctx) => {
          const res = hasNodeControl(ctx, ["Louisbourg", "Quebec"]);
          const hasAtlantic = hasNodeControl(ctx, ["Atlantic Shipping Lanes"]).controlledCount >= 1;
          const moves = countOrdersOfType(ctx, ["MOVE", "AMPHIBIOUS_ASSAULT"]);
          const pts = res.allControlled ? 5 : res.controlledCount >= 1 ? 3 : (hasAtlantic && moves >= 4) ? 2 : 0;
          return {
            isCompleted: res.allControlled,
            earnedVP: pts,
            progressText: res.allControlled
              ? "2 / 2 Citadels Captured (+5/5 VP)"
              : res.controlledCount >= 1
              ? `${res.controlledCount} / 2 Citadels Captured (+3/5 VP)`
              : pts > 0
              ? `Maritime Blockade of New France Active (+2/5 VP)`
              : `0 / 2 Citadels Captured (+0/5 VP)`,
            progressPercent: res.allControlled ? 100 : res.controlledCount >= 1 ? 60 : pts > 0 ? 40 : 0,
          };
        },
      },
      {
        id: "gb-exec-2",
        title: "Colonial Assembly Supply & Backcountry Order",
        description:
          "Maintain Colonial Assembly Support at 60% or higher while keeping domestic Unrest at or below 45%.",
        howToComplete:
          "Select Boston or Port Royal and submit ASSEMBLY_NEGOTIATION orders in the Economy & Governance matrix.",
        victoryPoints: 3,
        category: "SOVEREIGNTY",
        evaluate: (ctx) => {
          const support = ctx.faction?.assemblySupport ?? 50;
          const unrest = ctx.faction?.unrestIndex ?? 0;
          const full = support >= 60 && unrest <= 45;
          const partial = support >= 55 || unrest <= 50;
          const pts = full ? 3 : partial ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `Assembly: ${support}% (≥60%) • Unrest: ${unrest}% (≤45%)`,
            progressPercent: full ? 100 : Math.min(90, Math.round((support / 60) * 80)),
          };
        },
      },
      {
        id: "gb-exec-3",
        title: "Imperial Hegemony (6+ Controlled Nodes)",
        description:
          "Expand British territorial sovereignty to control at least 6 theater nodes across North America and the Atlantic.",
        howToComplete:
          "Capture contested forts (Fort Duquesne, Fort Niagara, Fort Ticonderoga) while defending Boston, Fort Oswego, and Port Royal.",
        victoryPoints: 2,
        category: "TERRITORIAL",
        evaluate: (ctx) => {
          const count = ctx.faction?.nodesControlled?.length ?? 0;
          const full = count >= 6;
          const pts = full ? 2 : count >= 5 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${count} / 6 Nodes Controlled`,
            progressPercent: Math.min(100, Math.round((count / 6) * 100)),
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
          "Wrest control of Fort Duquesne or Fort Niagara (or both) from France to sever their Great Lakes supply line.",
        howToComplete:
          "Muster forces at Fort Oswego and Philadelphia, then issue MOVE orders to assault Fort Niagara and Fort Duquesne.",
        victoryPoints: 4,
        category: "MILITARY",
        evaluate: (ctx) => {
          const res = hasNodeControl(ctx, ["Duquesne", "Niagara"]);
          const hasOswego = hasNodeControl(ctx, ["Fort Oswego"]).controlledCount >= 1;
          const str = getTotalStrength(ctx);
          const pts = res.allControlled ? 4 : res.controlledCount >= 1 ? 2 : (hasOswego && str >= 4000) ? 1 : 0;
          return {
            isCompleted: res.allControlled,
            earnedVP: pts,
            progressText: `${res.controlledCount} / 2 Frontier Forts Secured (+${pts}/4 VP)`,
            progressPercent: Math.round((res.controlledCount / 2) * 100),
          };
        },
      },
      {
        id: "gb-mil-2",
        title: "Muster the Grand Expeditionary Army (5,000+ Strength)",
        description:
          "Build total British regular, naval, and provincial troop strength across the theater to at least 5,000 men.",
        howToComplete:
          "Issue RECRUIT (Muster Troops) orders at Boston, Port Royal, or Fort Oswego during the Order Submission phase.",
        victoryPoints: 3,
        category: "MILITARY",
        evaluate: (ctx) => {
          const str = getTotalStrength(ctx);
          const full = str >= 5000;
          const pts = full ? 3 : str >= 4500 ? 2 : str >= 3500 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${str.toLocaleString()} / 5,000 Total Strength (+${pts}/3 VP)`,
            progressPercent: Math.min(100, Math.round((str / 5000) * 100)),
          };
        },
      },
      {
        id: "gb-mil-3",
        title: "Rule Britannia: Command the Sea Lanes",
        description:
          "Dominate North American waters by holding Atlantic Shipping Lanes and projecting naval power into the Gulf of St. Lawrence.",
        howToComplete:
          "Use AMPHIBIOUS_ASSAULT or naval MOVE orders from Atlantic Shipping Lanes into the Gulf of St. Lawrence.",
        victoryPoints: 3,
        category: "MILITARY",
        evaluate: (ctx) => {
          const res = hasNodeControl(ctx, ["Atlantic Shipping Lanes", "Gulf of St. Lawrence"]);
          const hasAtlantic = hasNodeControl(ctx, ["Atlantic Shipping Lanes"]).allControlled;
          const navalOrders = countOrdersOfType(ctx, ["AMPHIBIOUS_ASSAULT", "MOVE"]);
          let pts = 0;
          if (res.allControlled) {
            pts = 3;
          } else if (hasAtlantic && navalOrders >= 2) {
            pts = 2;
          } else if (hasAtlantic) {
            pts = 1;
          }
          return {
            isCompleted: res.allControlled,
            earnedVP: pts,
            progressText: `${res.controlledCount} / 2 Sea Zones Held (+${pts}/3 VP)`,
            progressPercent: res.allControlled ? 100 : hasAtlantic ? 66 : 0,
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
          const full = covs >= 1 && subs >= 2;
          const partial = covs >= 1 || subs >= 1;
          const pts = full ? 4 : partial ? 2 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${covs} Covenant(s) • ${subs}/2 Diplomatic Orders (+${pts}/4 VP)`,
            progressPercent: full ? 100 : partial ? 60 : 0,
          };
        },
      },
      {
        id: "gb-dip-2",
        title: "Mercantilist War Finance & Maritime Trade",
        description:
          "Maintain positive British Treasury reserves (≥£130, or ≥£70 with 2+ trade directives) while funding colonial expeditions.",
        howToComplete:
          "Issue EXTRACT and TRADE orders at Port Royal / Kingston and Boston.",
        victoryPoints: 3,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const t = ctx.faction?.treasury ?? 0;
          const trades = countOrdersOfType(ctx, ["EXTRACT", "TRADE"]);
          const full = t >= 130 || (t >= 70 && trades >= 2);
          const partial = t >= 50 && trades >= 1;
          const pts = full ? 3 : partial ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `£${t} Treasury • ${trades} Trade/Extract Orders (+${pts}/3 VP)`,
            progressPercent: full ? 100 : Math.min(90, Math.round((t / 130) * 100)),
          };
        },
      },
      {
        id: "gb-dip-3",
        title: "Prestige of the Crown (6+ Standing Points)",
        description:
          "Elevate Great Britain's international Standing Points to 6 or higher through treaty adherence and strategic victories.",
        howToComplete:
          "Honor covenant boundaries, fulfill role campaign objectives, and avoid unprovoked attacks on neutral powers.",
        victoryPoints: 3,
        category: "DIPLOMATIC",
        evaluate: (ctx) => {
          const pts = ctx.faction?.standingPoints ?? 0;
          const full = pts >= 6;
          const earned = full ? 3 : pts >= 5 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: earned,
            progressText: `${pts} / 6 Standing Points (+${earned}/3 VP)`,
            progressPercent: Math.min(100, Math.round((pts / 6) * 100)),
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
          "Retain unbroken French sovereignty over Quebec, Fortress Louisbourg, and Fort Ticonderoga.",
        howToComplete:
          "Reinforce garrisons at Quebec, Louisbourg, and Ticonderoga and repel British amphibious or overland expeditions.",
        victoryPoints: 4,
        category: "TERRITORIAL",
        evaluate: (ctx) => {
          const res = hasNodeControl(ctx, ["Quebec", "Louisbourg", "Ticonderoga"]);
          const pts = res.allControlled ? 4 : res.controlledCount >= 2 ? 2 : res.controlledCount >= 1 ? 1 : 0;
          return {
            isCompleted: res.allControlled,
            earnedVP: pts,
            progressText: `${res.controlledCount} / 3 Heartland Bastions Held (+${pts}/4 VP)`,
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
          const full = count >= 3;
          const pts = full ? 3 : count >= 1 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${count} / 3 Alliance Subsidies & Dispatches (+${pts}/3 VP)`,
            progressPercent: Math.min(100, Math.round((count / 3) * 100)),
          };
        },
      },
      {
        id: "fr-exec-3",
        title: "Master of New France (7+ Controlled Nodes)",
        description:
          "Maintain French territorial control across the St. Lawrence, Great Lakes, and Mississippi at 7 or more nodes.",
        howToComplete:
          "Hold your starting 7 nodes or capture Fort Oswego, Boston, or Ohio River Portage.",
        victoryPoints: 3,
        category: "TERRITORIAL",
        evaluate: (ctx) => {
          const count = ctx.faction?.nodesControlled?.length ?? 0;
          const full = count >= 7;
          const pts = full ? 3 : count >= 6 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${count} / 7 Nodes Controlled (+${pts}/3 VP)`,
            progressPercent: Math.min(100, Math.round((count / 7) * 100)),
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
        title: "Forward Defense: Fort Oswego, Niagara & Duquesne",
        description:
          "Eliminate Britain's Lake Ontario staging post at Fort Oswego while securing Fort Niagara and Fort Duquesne.",
        howToComplete:
          "Issue MOVE orders from Fort Niagara or Fort Ticonderoga to assault and capture Fort Oswego.",
        victoryPoints: 4,
        category: "MILITARY",
        evaluate: (ctx) => {
          const res = hasNodeControl(ctx, ["Oswego", "Niagara", "Duquesne"]);
          const pts = res.allControlled ? 4 : res.controlledCount >= 2 ? 2 : res.controlledCount >= 1 ? 1 : 0;
          return {
            isCompleted: res.allControlled,
            earnedVP: pts,
            progressText: `${res.controlledCount} / 3 Great Lakes & Ohio Forts Held (+${pts}/4 VP)`,
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
          const full = raids >= 2;
          const pts = full ? 3 : raids >= 1 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${raids} / 2 Offensive Operations Launched (+${pts}/3 VP)`,
            progressPercent: Math.min(100, Math.round((raids / 2) * 100)),
          };
        },
      },
      {
        id: "fr-mil-3",
        title: "Bastion of the Fleur-de-Lis (4,800+ Garrison Strength)",
        description:
          "Maintain a combined French regular, Canadian militia, and marine force of at least 4,800 strength.",
        howToComplete:
          "Issue RECRUIT orders at Quebec, New Orleans, and Fortress Louisbourg and avoid winter freeze attrition.",
        victoryPoints: 3,
        category: "MILITARY",
        evaluate: (ctx) => {
          const str = getTotalStrength(ctx);
          const full = str >= 4800;
          const pts = full ? 3 : str >= 3500 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${str.toLocaleString()} / 4,800 Total Strength (+${pts}/3 VP)`,
            progressPercent: Math.min(100, Math.round((str / 4800) * 100)),
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
        title: "King's Magazine & Fur Monopoly (£160+ Treasury)",
        description:
          "Build the French colonial treasury to £160 or higher through fur extraction and Antillean trade.",
        howToComplete:
          "Submit EXTRACT and TRADE orders from Quebec, New Orleans, and Fort Niagara.",
        victoryPoints: 4,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const t = ctx.faction?.treasury ?? 0;
          const full = t >= 160;
          const pts = full ? 4 : t >= 100 ? 2 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `£${t} / £160 Treasury (+${pts}/4 VP)`,
            progressPercent: Math.min(100, Math.round((t / 160) * 100)),
          };
        },
      },
      {
        id: "fr-dip-2",
        title: "Domestic Bread Peace (Unrest ≤ 25%)",
        description:
          "Prevent famine bread riots in Quebec and Montreal by keeping French domestic Unrest at 25% or lower.",
        howToComplete:
          "Use ASSEMBLY_NEGOTIATION or keep treasury positive to prevent deficit unrest spikes.",
        victoryPoints: 3,
        category: "SOVEREIGNTY",
        evaluate: (ctx) => {
          const u = ctx.faction?.unrestIndex ?? 0;
          const full = u <= 25;
          const pts = full ? 3 : u <= 35 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `Unrest: ${u}% (Target ≤ 25%) (+${pts}/3 VP)`,
            progressPercent: full ? 100 : Math.max(0, 100 - (u - 25) * 3),
          };
        },
      },
      {
        id: "fr-dip-3",
        title: "Lifeline of the Windward Passage & New Orleans",
        description:
          "Maintain control of New Orleans and the Windward Passage while executing at least 2 commercial EXTRACT/TRADE orders.",
        howToComplete:
          "Defend New Orleans and Windward Passage and issue TRADE or EXTRACT directives.",
        victoryPoints: 3,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const nodes = hasNodeControl(ctx, ["New Orleans", "Windward Passage"]);
          const trades = countOrdersOfType(ctx, ["EXTRACT", "TRADE"]);
          const full = nodes.allControlled && trades >= 2;
          const partial = nodes.allControlled || (nodes.controlledCount >= 1 && trades >= 1);
          const pts = full ? 3 : partial ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${nodes.controlledCount}/2 Nodes • ${trades}/2 Trade Orders (+${pts}/3 VP)`,
            progressPercent: full ? 100 : partial ? 60 : 0,
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
        title: "Key of the New World: Hold Havana & Patrol Gulf",
        description:
          "Maintain sovereign Spanish control over Havana and the Gulf of Mexico, supported by at least 2 naval patrol or trade orders.",
        howToComplete:
          "Keep garrisons stationed at Havana and issue naval MOVE or TRADE orders into the Gulf of Mexico.",
        victoryPoints: 4,
        category: "TERRITORIAL",
        evaluate: (ctx) => {
          const res = hasNodeControl(ctx, ["Havana", "Gulf of Mexico"]);
          const orders = countOrdersOfType(ctx, ["MOVE", "TRADE", "AMPHIBIOUS_ASSAULT"]);
          const full = res.allControlled && orders >= 2;
          const partial = res.allControlled;
          const pts = full ? 4 : partial ? 2 : res.controlledCount >= 1 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${res.controlledCount}/2 Held • ${orders}/2 Directives (+${pts}/4 VP)`,
            progressPercent: full ? 100 : partial ? 65 : 30,
          };
        },
      },
      {
        id: "sp-exec-2",
        title: "Bourbon Family Compact & Diplomacy",
        description:
          "Increase Spain's Standing Points to 7 or higher and execute at least 2 diplomatic subsidies or dispatches.",
        howToComplete:
          "Fulfill strategic objectives, send diplomatic subsidies, and preserve treaty credibility.",
        victoryPoints: 3,
        category: "DIPLOMATIC",
        evaluate: (ctx) => {
          const pts = ctx.faction?.standingPoints ?? 0;
          const dispatches = countOrdersOfType(ctx, ["SUBSIDIZE"]) + (ctx.factionDispatches?.length ?? 0);
          const full = pts >= 7 && dispatches >= 2;
          const partial = pts >= 6 && dispatches >= 1;
          const earned = full ? 3 : partial ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: earned,
            progressText: `${pts}/7 Standing • ${dispatches}/2 Envoys (+${earned}/3 VP)`,
            progressPercent: full ? 100 : partial ? 60 : 30,
          };
        },
      },
      {
        id: "sp-exec-3",
        title: "Pax Hispanica: Order & Solvency",
        description:
          "Keep civil unrest at or below 12% and debt at or below £25 while issuing at least 2 economic or assembly directives.",
        howToComplete:
          "Avoid deficit spending and use ASSEMBLY_NEGOTIATION or EXTRACT orders.",
        victoryPoints: 3,
        category: "SOVEREIGNTY",
        evaluate: (ctx) => {
          const u = ctx.faction?.unrestIndex ?? 0;
          const d = ctx.faction?.debt ?? 0;
          const orders = countOrdersOfType(ctx, ["ASSEMBLY_NEGOTIATION", "EXTRACT"]);
          const full = u <= 12 && d <= 25 && orders >= 2;
          const partial = u <= 15 && d <= 30;
          const pts = full ? 3 : partial ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `Unrest: ${u}% • Debt: £${d} • ${orders}/2 Orders (+${pts}/3 VP)`,
            progressPercent: full ? 100 : partial ? 60 : 20,
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
        title: "Armada de Barlovento Expansion (4,500+ Strength)",
        description:
          "Build Spanish combined naval and land forces to at least 4,500 total strength.",
        howToComplete:
          "Issue RECRUIT orders at Havana to expand the Armada de Barlovento and regular regiments.",
        victoryPoints: 4,
        category: "MILITARY",
        evaluate: (ctx) => {
          const str = getTotalStrength(ctx);
          const full = str >= 4500;
          const pts = full ? 4 : str >= 3500 ? 2 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${str.toLocaleString()} / 4,500 Total Strength (+${pts}/4 VP)`,
            progressPercent: Math.min(100, Math.round((str / 4500) * 100)),
          };
        },
      },
      {
        id: "sp-mil-2",
        title: "Dominion of the Spanish Main",
        description:
          "Expand Spanish territorial control to 3+ nodes, OR execute 4+ naval patrol MOVE directives across the Caribbean.",
        howToComplete:
          "Move forces from Havana to secure the Gulf of Mexico or Windward Passage.",
        victoryPoints: 3,
        category: "TERRITORIAL",
        evaluate: (ctx) => {
          const count = ctx.faction?.nodesControlled?.length ?? 0;
          const moves = countOrdersOfType(ctx, ["MOVE", "AMPHIBIOUS_ASSAULT"]);
          const full = count >= 3 || moves >= 4;
          const partial = count >= 2 && moves >= 2;
          const pts = full ? 3 : partial ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${count} Nodes • ${moves} Naval Patrols (+${pts}/3 VP)`,
            progressPercent: full ? 100 : partial ? 60 : 25,
          };
        },
      },
      {
        id: "sp-mil-3",
        title: "Guardacostas Anti-Smuggling Directives",
        description:
          "Execute at least 3 military RECRUIT or naval patrol MOVE directives to deter British privateers.",
        howToComplete:
          "Submit RECRUIT or MOVE orders from Havana.",
        victoryPoints: 3,
        category: "MILITARY",
        evaluate: (ctx) => {
          const count = countOrdersOfType(ctx, ["RECRUIT", "MOVE", "AMPHIBIOUS_ASSAULT"]);
          const full = count >= 3;
          const pts = full ? 3 : count >= 1 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${count} / 3 Directives (+${pts}/3 VP)`,
            progressPercent: Math.min(100, Math.round((count / 3) * 100)),
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
        title: "Silver Flota Delivery (£350+ Treasury)",
        description:
          "Accumulate at least £350 in the Spanish Treasury through Havana silver extraction and trade convoys.",
        howToComplete:
          "Issue EXTRACT and TRADE orders at Havana.",
        victoryPoints: 5,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const t = ctx.faction?.treasury ?? 0;
          const extracts = countOrdersOfType(ctx, ["EXTRACT"]);
          const full = t >= 350 && extracts >= 3;
          const partial = t >= 280 && extracts >= 2;
          const pts = full ? 5 : partial ? 3 : t >= 200 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `£${t} Treasury • ${extracts} Silver Extracts (+${pts}/5 VP)`,
            progressPercent: Math.min(100, Math.round((t / 350) * 100)),
          };
        },
      },
      {
        id: "sp-dip-2",
        title: "Carrera de Indias Convoy Operations",
        description:
          "Execute at least 3 TRADE directives to dispatch the royal treasure fleet across the Atlantic.",
        howToComplete:
          "Select Havana and submit TRADE (Merchant Convoy) orders.",
        victoryPoints: 3,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const count = countOrdersOfType(ctx, ["TRADE"]);
          const full = count >= 3;
          const pts = full ? 3 : count >= 1 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${count} / 3 Treasure Convoys (+${pts}/3 VP)`,
            progressPercent: Math.min(100, Math.round((count / 3) * 100)),
          };
        },
      },
      {
        id: "sp-dip-3",
        title: "Bullion Diplomacy",
        description:
          "Execute at least 2 SUBSIDIZE gifts or diplomatic couriers to influence the European struggle.",
        howToComplete:
          "Submit SUBSIDIZE orders or send diplomatic dispatches via the Couriers tab.",
        victoryPoints: 2,
        category: "DIPLOMATIC",
        evaluate: (ctx) => {
          const count = countOrdersOfType(ctx, ["SUBSIDIZE"]) + (ctx.factionDispatches?.length ?? 0);
          const full = count >= 2;
          const pts = full ? 2 : count >= 1 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${count} / 2 Bullion Envoys (+${pts}/2 VP)`,
            progressPercent: full ? 100 : count * 50,
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
        title: "Pombaline Reconstruction Fund (£220+ Treasury)",
        description:
          "Build Portugal's treasury to £220 or higher supported by at least 2 EXTRACT/TRADE directives.",
        howToComplete:
          "Issue EXTRACT and TRADE orders from Belém do Pará (Atlantic Entrepôt).",
        victoryPoints: 4,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const t = ctx.faction?.treasury ?? 0;
          const trades = countOrdersOfType(ctx, ["EXTRACT", "TRADE"]);
          const full = t >= 220 && trades >= 2;
          const pts = full ? 4 : t >= 170 ? 2 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `£${t} / £220 Reconstruction Fund (+${pts}/4 VP)`,
            progressPercent: Math.min(100, Math.round((t / 220) * 100)),
          };
        },
      },
      {
        id: "pt-exec-2",
        title: "Sovereignty of Grão-Pará & Brazil",
        description:
          "Maintain unbroken Portuguese control of Belém do Pará while keeping domestic Unrest at or below 15%.",
        howToComplete:
          "Station garrison troops at Belém do Pará and avoid war weariness.",
        victoryPoints: 3,
        category: "SOVEREIGNTY",
        evaluate: (ctx) => {
          const res = hasNodeControl(ctx, ["Belém"]);
          const u = ctx.faction?.unrestIndex ?? 0;
          const full = res.allControlled && u <= 15;
          const pts = full ? 3 : res.allControlled ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `Belém: ${res.allControlled ? "Held" : "Lost"} • Unrest: ${u}% (+${pts}/3 VP)`,
            progressPercent: full ? 100 : res.allControlled ? 60 : 0,
          };
        },
      },
      {
        id: "pt-exec-3",
        title: "Methuen Treaty Statecraft (Standing ≥ 6)",
        description:
          "Elevate Portugal's international Standing Points to 6 or higher and dispatch at least 1 courier/subsidy.",
        howToComplete:
          "Send trade convoys, honor neutrality, and support allied commerce.",
        victoryPoints: 3,
        category: "DIPLOMATIC",
        evaluate: (ctx) => {
          const pts = ctx.faction?.standingPoints ?? 0;
          const dispatches = countOrdersOfType(ctx, ["SUBSIDIZE"]) + (ctx.factionDispatches?.length ?? 0);
          const full = pts >= 6 && dispatches >= 1;
          const partial = pts >= 5;
          const earned = full ? 3 : partial ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: earned,
            progressText: `${pts}/6 Standing • ${dispatches}/1 Envoy (+${earned}/3 VP)`,
            progressPercent: full ? 100 : partial ? 65 : 30,
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
        title: "Amazonian Bastion (1,800+ Strength)",
        description:
          "Expand Portuguese naval and garrison forces to at least 1,800 total strength.",
        howToComplete:
          "Submit RECRUIT (Muster Troops) orders at Belém do Pará.",
        victoryPoints: 4,
        category: "MILITARY",
        evaluate: (ctx) => {
          const str = getTotalStrength(ctx);
          const full = str >= 1800;
          const pts = full ? 4 : str >= 1200 ? 2 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${str.toLocaleString()} / 1,800 Strength (+${pts}/4 VP)`,
            progressPercent: Math.min(100, Math.round((str / 1800) * 100)),
          };
        },
      },
      {
        id: "pt-mil-2",
        title: "South Atlantic Convoy Escort",
        description:
          "Execute at least 3 military RECRUIT or naval patrol MOVE directives from Belém do Pará.",
        howToComplete:
          "Issue RECRUIT or MOVE orders from Belém do Pará.",
        victoryPoints: 3,
        category: "MILITARY",
        evaluate: (ctx) => {
          const count = countOrdersOfType(ctx, ["RECRUIT", "MOVE"]);
          const full = count >= 3;
          const pts = full ? 3 : count >= 1 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${count} / 3 Escort Directives (+${pts}/3 VP)`,
            progressPercent: Math.min(100, Math.round((count / 3) * 100)),
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
          const pts = res.allControlled ? 3 : 0;
          return {
            isCompleted: res.allControlled,
            earnedVP: pts,
            progressText: res.allControlled ? "Perimeter Secure (+3/3 VP)" : "Lost",
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
          const full = count >= 3;
          const pts = full ? 4 : count >= 1 ? 2 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${count} / 3 Commercial Directives (+${pts}/4 VP)`,
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
          const full = d <= 25 && t >= 180;
          const pts = full ? 3 : t >= 140 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `Treasury: £${t}/£180 • Debt: £${d} (+${pts}/3 VP)`,
            progressPercent: Math.min(100, Math.round((t / 180) * 100)),
          };
        },
      },
      {
        id: "pt-dip-3",
        title: "Atlantic Trade Diplomacy",
        description:
          "Send at least 2 diplomatic couriers or commercial subsidies to trading partners.",
        howToComplete:
          "Use the Couriers tab or SUBSIDIZE order to cement commercial ties.",
        victoryPoints: 3,
        category: "DIPLOMATIC",
        evaluate: (ctx) => {
          const count = countOrdersOfType(ctx, ["SUBSIDIZE"]) + (ctx.factionDispatches?.length ?? 0);
          const full = count >= 2;
          const pts = full ? 3 : count >= 1 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${count} / 2 Trade Envoys (+${pts}/3 VP)`,
            progressPercent: full ? 100 : count * 50,
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
        title: "Golden Rock Emporium (£320+ Treasury)",
        description:
          "Grow the Dutch Republic's treasury to £320 or higher supported by at least 2 EXTRACT/TRADE directives.",
        howToComplete:
          "Maintain neutrality to collect freight bonuses and issue EXTRACT/TRADE orders at Willemstad.",
        victoryPoints: 4,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const t = ctx.faction?.treasury ?? 0;
          const trades = countOrdersOfType(ctx, ["EXTRACT", "TRADE"]);
          const dispatches = countOrdersOfType(ctx, ["SUBSIDIZE"]) + (ctx.factionDispatches?.length ?? 0);
          const full = t >= 320 && trades >= 2 && dispatches >= 1;
          const pts = full ? 4 : t >= 250 ? 2 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `£${t} / £320 Dutch Treasury (+${pts}/4 VP)`,
            progressPercent: Math.min(100, Math.round((t / 320) * 100)),
          };
        },
      },
      {
        id: "nl-exec-2",
        title: "Free Ships, Free Goods (Hold Willemstad & Unrest ≤ 12%)",
        description:
          "Retain control of Willemstad (Curaçao) with civil unrest at 12% or lower.",
        howToComplete:
          "Keep Willemstad well-garrisoned and avoid entangling offensive wars.",
        victoryPoints: 3,
        category: "SOVEREIGNTY",
        evaluate: (ctx) => {
          const res = hasNodeControl(ctx, ["Willemstad"]);
          const u = ctx.faction?.unrestIndex ?? 0;
          const full = res.allControlled && u <= 12;
          const pts = full ? 3 : res.allControlled ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `Willemstad: ${res.allControlled ? "Held" : "Lost"} • Unrest: ${u}% (+${pts}/3 VP)`,
            progressPercent: full ? 100 : res.allControlled ? 65 : 0,
          };
        },
      },
      {
        id: "nl-exec-3",
        title: "Arbiter of the Antilles (Standing ≥ 7)",
        description:
          "Raise the Dutch Republic's international Standing Points to 7 or higher with at least 1 courier/subsidy.",
        howToComplete:
          "Trade with all belligerents, send financial subsidies, and uphold neutral maritime law.",
        victoryPoints: 3,
        category: "DIPLOMATIC",
        evaluate: (ctx) => {
          const pts = ctx.faction?.standingPoints ?? 0;
          const dispatches = countOrdersOfType(ctx, ["SUBSIDIZE"]) + (ctx.factionDispatches?.length ?? 0);
          const full = pts >= 7 && dispatches >= 2;
          const partial = pts >= 6;
          const earned = full ? 3 : partial ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: earned,
            progressText: `${pts}/7 Standing • ${dispatches}/2 Mediator Dispatches (+${earned}/3 VP)`,
            progressPercent: full ? 100 : partial ? 65 : 30,
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
        title: "Armed Neutrality Deterrent (2,000+ Strength)",
        description:
          "Build Dutch naval escort and garrison strength at Willemstad to at least 2,000 men.",
        howToComplete:
          "Issue RECRUIT orders at Willemstad (Curaçao).",
        victoryPoints: 4,
        category: "MILITARY",
        evaluate: (ctx) => {
          const str = getTotalStrength(ctx);
          const full = str >= 2000;
          const pts = full ? 4 : str >= 1400 ? 2 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${str.toLocaleString()} / 2,000 Strength (+${pts}/4 VP)`,
            progressPercent: Math.min(100, Math.round((str / 2000) * 100)),
          };
        },
      },
      {
        id: "nl-mil-2",
        title: "Fort Amsterdam Harbor Defense",
        description:
          "Keep Willemstad under uninterrupted Dutch sovereignty while issuing at least 3 military/escort directives.",
        howToComplete:
          "Station all recruited units at Willemstad and issue RECRUIT or patrol orders.",
        victoryPoints: 3,
        category: "MILITARY",
        evaluate: (ctx) => {
          const res = hasNodeControl(ctx, ["Willemstad"]);
          const count = countOrdersOfType(ctx, ["RECRUIT", "MOVE"]);
          const full = res.allControlled && count >= 3;
          const partial = res.allControlled && count >= 1;
          const pts = full ? 3 : partial ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `Harbor Held • ${count}/3 Orders (+${pts}/3 VP)`,
            progressPercent: full ? 100 : partial ? 60 : 0,
          };
        },
      },
      {
        id: "nl-mil-3",
        title: "Active Caribbean Fleet Readiness",
        description:
          "Maintain at least 1,200 strength stationed in combat-ready formations at Willemstad.",
        howToComplete:
          "Keep merchantmen and warships sheltered in Willemstad during Autumn hurricane turns.",
        victoryPoints: 3,
        category: "MILITARY",
        evaluate: (ctx) => {
          const str = getTotalStrength(ctx);
          const full = str >= 1200;
          const pts = full ? 3 : str >= 800 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${str.toLocaleString()} / 1,200 Fleet Readiness (+${pts}/3 VP)`,
            progressPercent: Math.min(100, Math.round((str / 1200) * 100)),
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
        title: "Contraband Arbitrage Master (4+ Trade/Extract Orders)",
        description:
          "Execute at least 4 TRADE or EXTRACT orders from Willemstad.",
        howToComplete:
          "Select Willemstad and submit TRADE (Merchant Convoy) and EXTRACT (Harvest Yield) orders.",
        victoryPoints: 4,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const count = countOrdersOfType(ctx, ["TRADE", "EXTRACT"]);
          const full = count >= 4;
          const pts = full ? 4 : count >= 2 ? 2 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${count} / 4 Commercial Orders (+${pts}/4 VP)`,
            progressPercent: Math.min(100, Math.round((count / 4) * 100)),
          };
        },
      },
      {
        id: "nl-dip-2",
        title: "Amsterdam Credit House (Debt ≤ £15 & 2+ Envoys)",
        description:
          "Keep Dutch national debt at or below £15 while extending at least 2 financial subsidies or courier dispatches.",
        howToComplete:
          "Avoid deficit spending and issue SUBSIDIZE orders or diplomatic couriers.",
        victoryPoints: 3,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const d = ctx.faction?.debt ?? 0;
          const subs = countOrdersOfType(ctx, ["SUBSIDIZE"]) + (ctx.factionDispatches?.length ?? 0);
          const full = d <= 15 && subs >= 2;
          const partial = d <= 15 && subs >= 1;
          const pts = full ? 3 : partial ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `Debt: £${d} • ${subs}/2 Credit Envoys (+${pts}/3 VP)`,
            progressPercent: full ? 100 : partial ? 60 : 20,
          };
        },
      },
      {
        id: "nl-dip-3",
        title: "Entrepôt Prosperity (£280+ Treasury)",
        description:
          "Maintain at least £280 in liquid treasury coin.",
        howToComplete:
          "Harvest Willemstad's £40/turn sugar yield and collect Atlantic freight bonuses.",
        victoryPoints: 3,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const t = ctx.faction?.treasury ?? 0;
          const full = t >= 280;
          const pts = full ? 3 : t >= 200 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `£${t} / £280 Liquid Treasury (+${pts}/3 VP)`,
            progressPercent: Math.min(100, Math.round((t / 280) * 100)),
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
          const full = hasPhilly && count >= 2;
          const pts = full ? 4 : hasPhilly ? 2 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `Philadelphia: ${hasPhilly ? "Held" : "Lost"} • ${count}/2 Nodes (+${pts}/4 VP)`,
            progressPercent: full ? 100 : hasPhilly ? 60 : 0,
          };
        },
      },
      {
        id: "ge-exec-2",
        title: "Convention of Westminster Prestige (Standing ≥ 6)",
        description:
          "Increase German States Standing Points to 6 or higher through coalition fidelity and courier dispatch.",
        howToComplete:
          "Support British operations, fulfill military objectives, and send coalition dispatches.",
        victoryPoints: 3,
        category: "DIPLOMATIC",
        evaluate: (ctx) => {
          const pts = ctx.faction?.standingPoints ?? 0;
          const dispatches = countOrdersOfType(ctx, ["SUBSIDIZE"]) + (ctx.factionDispatches?.length ?? 0);
          const full = pts >= 6 && dispatches >= 1;
          const partial = pts >= 5;
          const earned = full ? 3 : partial ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: earned,
            progressText: `${pts}/6 Standing • ${dispatches}/1 Dispatch (+${earned}/3 VP)`,
            progressPercent: full ? 100 : partial ? 65 : 30,
          };
        },
      },
      {
        id: "ge-exec-3",
        title: "Pennsylvania Civic Order (Unrest ≤ 20%)",
        description:
          "Keep unrest in Philadelphia and the Pennsylvania backcountry at 20% or lower.",
        howToComplete:
          "Protect Philadelphia from frontier raids and use ASSEMBLY_NEGOTIATION when needed.",
        victoryPoints: 3,
        category: "SOVEREIGNTY",
        evaluate: (ctx) => {
          const u = ctx.faction?.unrestIndex ?? 0;
          const full = u <= 20;
          const pts = full ? 3 : u <= 30 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `Unrest: ${u}% (Target ≤ 20%) (+${pts}/3 VP)`,
            progressPercent: full ? 100 : Math.max(0, 100 - (u - 20) * 3),
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
        title: "Muster the 60th Royal Americans (2,200+ Strength)",
        description:
          "Build your German Jaeger and Royal American forces to at least 2,200 total strength.",
        howToComplete:
          "Submit RECRUIT orders at Philadelphia.",
        victoryPoints: 4,
        category: "MILITARY",
        evaluate: (ctx) => {
          const str = getTotalStrength(ctx);
          const full = str >= 2200;
          const pts = full ? 4 : str >= 1500 ? 2 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${str.toLocaleString()} / 2,200 Regiment Strength (+${pts}/4 VP)`,
            progressPercent: Math.min(100, Math.round((str / 2200) * 100)),
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
          const full = count >= 2;
          const pts = full ? 3 : count >= 1 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${count} / 2 Field Directives (+${pts}/3 VP)`,
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
          const pts = res.allControlled ? 3 : 0;
          return {
            isCompleted: res.allControlled,
            earnedVP: pts,
            progressText: res.allControlled ? "Philadelphia Secure (+3/3 VP)" : "Philadelphia Lost",
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
        title: "Continental War Chest (£170+ Treasury)",
        description:
          "Grow the German States treasury to £170 or higher through timber extraction and subsidy management.",
        howToComplete:
          "Issue EXTRACT and TRADE orders at Philadelphia.",
        victoryPoints: 4,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const t = ctx.faction?.treasury ?? 0;
          const full = t >= 170;
          const pts = full ? 4 : t >= 120 ? 2 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `£${t} / £170 Treasury (+${pts}/4 VP)`,
            progressPercent: Math.min(100, Math.round((t / 170) * 100)),
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
          const full = count >= 2;
          const pts = full ? 3 : count >= 1 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${count} / 2 Supply Directives (+${pts}/3 VP)`,
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
          const full = count >= 1;
          const pts = full ? 3 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${count} / 1 Coalition Remittance (+${pts}/3 VP)`,
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
          const full = hasOnondaga && covs >= 1;
          const pts = full ? 4 : hasOnondaga ? 2 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `Onondaga: ${hasOnondaga ? "Held" : "Lost"} • ${covs}/1 Covenant Line (+${pts}/4 VP)`,
            progressPercent: full ? 100 : hasOnondaga ? 50 : 0,
          };
        },
      },
      {
        id: "hd-exec-2",
        title: "Iroquoia Sovereignty & Border Security",
        description:
          "Expand Six Nations territorial control to 2+ nodes, OR conduct at least 2 frontier raid/move operations to secure borders.",
        howToComplete:
          "March war parties to reclaim ancestral hunting grounds at Fort Oswego or Fort Niagara.",
        victoryPoints: 3,
        category: "TERRITORIAL",
        evaluate: (ctx) => {
          const count = ctx.faction?.nodesControlled?.length ?? 0;
          const ops = countOrdersOfType(ctx, ["RAID", "MOVE"]);
          const full = count >= 2;
          const partial = count >= 1 && ops >= 2;
          const pts = full ? 3 : partial ? 2 : count >= 1 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${count} Nodes Controlled • ${ops} Border Operations (+${pts}/3 VP)`,
            progressPercent: full ? 100 : partial ? 70 : 35,
          };
        },
      },
      {
        id: "hd-exec-3",
        title: "Harmony of the Longhouse (Unrest ≤ 25% & Standing ≥ 6)",
        description:
          "Keep Confederacy domestic Unrest at 25% or lower while achieving 6+ Standing Points.",
        howToComplete:
          "Distribute wampum gifts via SUBSIDIZE/TRADE and protect council towns.",
        victoryPoints: 3,
        category: "DIPLOMATIC",
        evaluate: (ctx) => {
          const u = ctx.faction?.unrestIndex ?? 0;
          const s = ctx.faction?.standingPoints ?? 0;
          const full = u <= 25 && s >= 6;
          const partial = u <= 35 || s >= 5;
          const pts = full ? 3 : partial ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `Unrest: ${u}% (≤25%) • Standing: ${s}/6 (+${pts}/3 VP)`,
            progressPercent: full ? 100 : partial ? 60 : 30,
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
          const full = str >= 2200;
          const pts = full ? 4 : str >= 1500 ? 2 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${str.toLocaleString()} / 2,200 Warrior Strength (+${pts}/4 VP)`,
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
          const full = count >= 2;
          const pts = full ? 3 : count >= 1 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${count} / 2 Frontier Raids Launched (+${pts}/3 VP)`,
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
          const pts = res.allControlled ? 3 : 0;
          return {
            isCompleted: res.allControlled,
            earnedVP: pts,
            progressText: res.allControlled ? "Onondaga Unconquered (+3/3 VP)" : "Lost",
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
        title: "Lake Ontario Fur Primacy (£150+ Treasury)",
        description:
          "Build the Confederacy treasury to £150 or higher through beaver peltry extraction and trade.",
        howToComplete:
          "Issue EXTRACT and TRADE orders at Onondaga Council Fire.",
        victoryPoints: 4,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const t = ctx.faction?.treasury ?? 0;
          const full = t >= 150;
          const pts = full ? 4 : t >= 100 ? 2 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `£${t} / £150 Treasury (+${pts}/4 VP)`,
            progressPercent: Math.min(100, Math.round((t / 150) * 100)),
          };
        },
      },
      {
        id: "hd-dip-2",
        title: "Wampum Condolence Diplomacy (2+ Orders)",
        description:
          "Execute at least 2 SUBSIDIZE or TRADE directives to distribute wampum and secure gunpowder.",
        howToComplete:
          "Use SUBSIDIZE and TRADE orders in the Economy & Governance matrix.",
        victoryPoints: 3,
        category: "DIPLOMATIC",
        evaluate: (ctx) => {
          const count = countOrdersOfType(ctx, ["SUBSIDIZE", "TRADE", "EXTRACT"]);
          const full = count >= 2;
          const pts = full ? 3 : count >= 1 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${count} / 2 Wampum & Trade Orders (+${pts}/3 VP)`,
            progressPercent: Math.min(100, Math.round((count / 2) * 100)),
          };
        },
      },
      {
        id: "hd-dip-3",
        title: "Sovereign Debt Freedom (Debt ≤ £10)",
        description:
          "Maintain sovereign debt at or below £10 so the Six Nations remain beholden to no European crown.",
        howToComplete:
          "Fund all warrior musters and gifts strictly from peltry revenues and subsidies.",
        victoryPoints: 3,
        category: "SOVEREIGNTY",
        evaluate: (ctx) => {
          const d = ctx.faction?.debt ?? 0;
          const full = d <= 10;
          const pts = full ? 3 : d <= 25 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `Debt: £${d} (Target ≤ £10) (+${pts}/3 VP)`,
            progressPercent: full ? 100 : d <= 25 ? 50 : 0,
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
          "Maintain unbroken control of Kahnawake (Seven Nations Council) while keeping Unrest at or below 20%.",
        howToComplete:
          "Garrison Kahnawake and distribute wampum subsidies to keep mission towns united.",
        victoryPoints: 4,
        category: "SOVEREIGNTY",
        evaluate: (ctx) => {
          const held = hasNodeControl(ctx, ["Kahnawake"]).allControlled;
          const u = ctx.faction?.unrestIndex ?? 0;
          const full = held && u <= 20;
          const pts = full ? 4 : held ? 2 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `Kahnawake: ${held ? "Held" : "Lost"} • Unrest: ${u}% (+${pts}/4 VP)`,
            progressPercent: full ? 100 : held ? 60 : 0,
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
          const full = pts >= 6;
          const earned = full ? 3 : pts >= 5 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: earned,
            progressText: `${pts} / 6 Standing Points (+${earned}/3 VP)`,
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
          const full = covs >= 1 || nodes >= 2;
          const pts = full ? 3 : nodes >= 1 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${covs} Covenant(s) • ${nodes} Node(s) Held (+${pts}/3 VP)`,
            progressPercent: full ? 100 : 50,
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
          const full = count >= 2;
          const pts = full ? 4 : count >= 1 ? 2 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${count} / 2 Frontier Raids Executed (+${pts}/4 VP)`,
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
          const full = str >= 1800;
          const pts = full ? 3 : str >= 1200 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${str.toLocaleString()} / 1,800 Warrior Strength (+${pts}/3 VP)`,
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
          const pts = res.allControlled ? 3 : 0;
          return {
            isCompleted: res.allControlled,
            earnedVP: pts,
            progressText: res.allControlled ? "Kahnawake Secure (+3/3 VP)" : "Lost",
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
        title: "Northern Peltry Reserve (£120+ Treasury)",
        description:
          "Build the Seven Nations treasury to £120 or higher through fur extraction and trade.",
        howToComplete:
          "Issue EXTRACT and TRADE orders at Kahnawake.",
        victoryPoints: 4,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const t = ctx.faction?.treasury ?? 0;
          const full = t >= 120;
          const pts = full ? 4 : t >= 80 ? 2 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `£${t} / £120 Peltry Treasury (+${pts}/4 VP)`,
            progressPercent: Math.min(100, Math.round((t / 120) * 100)),
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
          const full = count >= 2;
          const pts = full ? 3 : count >= 1 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${count} / 2 Conduit Orders (+${pts}/3 VP)`,
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
          const full = count >= 1;
          const pts = full ? 3 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${count} / 1 Kinship Dispatch (+${pts}/3 VP)`,
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
          "Maintain Western Confederacy control over Scioto Council Towns and Ohio River Portage & Forks.",
        howToComplete:
          "Defend Scioto and Ohio River Portage with strong war parties.",
        victoryPoints: 4,
        category: "TERRITORIAL",
        evaluate: (ctx) => {
          const res = hasNodeControl(ctx, ["Scioto", "Ohio River Portage"]);
          const pts = res.allControlled ? 4 : res.controlledCount >= 1 ? 2 : 0;
          return {
            isCompleted: res.allControlled,
            earnedVP: pts,
            progressText: `${res.controlledCount} / 2 Ohio Nodes Held (+${pts}/4 VP)`,
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
          const full = covs >= 1;
          const pts = full ? 3 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${covs} / 1 Easton Covenant Proclaimed (+${pts}/3 VP)`,
            progressPercent: Math.min(100, covs * 100),
          };
        },
      },
      {
        id: "wc-exec-3",
        title: "Council Fire Unity (Unrest ≤ 50% & Standing ≥ 6)",
        description:
          "Maintain Confederacy cohesion with Unrest at or below 50% while achieving 6+ Standing Points.",
        howToComplete:
          "Distribute trade goods via SUBSIDIZE/TRADE to cool border war weariness.",
        victoryPoints: 3,
        category: "DIPLOMATIC",
        evaluate: (ctx) => {
          const u = ctx.faction?.unrestIndex ?? 0;
          const s = ctx.faction?.standingPoints ?? 0;
          const full = u <= 50 && s >= 6;
          const partial = s >= 6 || u <= 50;
          const pts = full ? 3 : partial ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `Unrest: ${u}% (≤50%) • Standing: ${s}/6 (+${pts}/3 VP)`,
            progressPercent: full ? 100 : partial ? 60 : 30,
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
          const full = count >= 2;
          const pts = full ? 4 : count >= 1 ? 2 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${count} / 2 Frontier Raids Executed (+${pts}/4 VP)`,
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
          const full = str >= 2200;
          const pts = full ? 3 : str >= 1500 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${str.toLocaleString()} / 2,200 Warrior Strength (+${pts}/3 VP)`,
            progressPercent: Math.min(100, Math.round((str / 2200) * 100)),
          };
        },
      },
      {
        id: "wc-mil-3",
        title: "Reclaim the Forks (3+ Controlled Nodes)",
        description:
          "Expand Western Confederacy territorial control to 3+ nodes, OR hold both Ohio nodes with 3+ raid sorties.",
        howToComplete:
          "March war parties using MOVE orders to capture an adjacent fort.",
        victoryPoints: 3,
        category: "TERRITORIAL",
        evaluate: (ctx) => {
          const count = ctx.faction?.nodesControlled?.length ?? 0;
          const raids = countOrdersOfType(ctx, ["RAID"]);
          const full = count >= 3;
          const partial = count >= 2 && raids >= 3;
          const pts = full ? 3 : partial ? 2 : count >= 2 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${count} Nodes Held • ${raids} Raids Launched (+${pts}/3 VP)`,
            progressPercent: full ? 100 : partial ? 75 : 40,
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
        title: "Ohio Valley Peltry Wealth (£150+ Treasury)",
        description:
          "Accumulate at least £150 in the Western Confederacy treasury from Ohio fur extraction and trade.",
        howToComplete:
          "Issue EXTRACT and TRADE orders at Scioto Council Towns and Ohio River Portage.",
        victoryPoints: 4,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const t = ctx.faction?.treasury ?? 0;
          const full = t >= 150;
          const pts = full ? 4 : t >= 100 ? 2 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `£${t} / £150 Peltry Treasury (+${pts}/4 VP)`,
            progressPercent: Math.min(100, Math.round((t / 150) * 100)),
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
          const full = count >= 2;
          const pts = full ? 3 : count >= 1 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${count} / 2 Peltry Orders (+${pts}/3 VP)`,
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
          const full = count >= 1;
          const pts = full ? 3 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${count} / 1 Council Gift Action (+${pts}/3 VP)`,
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
          const full = held && covs >= 1;
          const pts = full ? 4 : held ? 2 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `Chota: ${held ? "Held" : "Lost"} • ${covs}/1 Covenant (+${pts}/4 VP)`,
            progressPercent: full ? 100 : held ? 50 : 0,
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
          const full = pts >= 6;
          const earned = full ? 3 : pts >= 5 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: earned,
            progressText: `${pts} / 6 Standing Points (+${earned}/3 VP)`,
            progressPercent: Math.min(100, Math.round((pts / 6) * 100)),
          };
        },
      },
      {
        id: "se-exec-3",
        title: "Peace of the Overhill Towns (Unrest ≤ 25%)",
        description:
          "Keep internal Confederacy Unrest at 25% or lower.",
        howToComplete:
          "Prevent foreign occupation of Chota and maintain steady trade goods distribution.",
        victoryPoints: 3,
        category: "SOVEREIGNTY",
        evaluate: (ctx) => {
          const u = ctx.faction?.unrestIndex ?? 0;
          const full = u <= 25;
          const pts = full ? 3 : u <= 35 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `Unrest: ${u}% (Target ≤ 25%) (+${pts}/3 VP)`,
            progressPercent: full ? 100 : Math.max(0, 100 - (u - 25) * 3),
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
          const full = str >= 2200;
          const pts = full ? 4 : str >= 1500 ? 2 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${str.toLocaleString()} / 2,200 Warrior Strength (+${pts}/4 VP)`,
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
          const full = count >= 2;
          const pts = full ? 3 : count >= 1 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${count} / 2 Frontier Raids Executed (+${pts}/3 VP)`,
            progressPercent: Math.min(100, Math.round((count / 2) * 100)),
          };
        },
      },
      {
        id: "se-mil-3",
        title: "Guardians of the Southern Passes",
        description:
          "Hold Chota and project military force via at least 1 expeditionary MOVE or RAID directive.",
        howToComplete:
          "Keep Chota garrisoned and issue MOVE or RAID orders.",
        victoryPoints: 3,
        category: "TERRITORIAL",
        evaluate: (ctx) => {
          const held = hasNodeControl(ctx, ["Chota"]).allControlled;
          const moves = countOrdersOfType(ctx, ["MOVE", "RAID"]);
          const full = held && moves >= 1;
          const pts = full ? 3 : held ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `Chota Held • ${moves}/1 Expeditions (+${pts}/3 VP)`,
            progressPercent: full ? 100 : held ? 50 : 0,
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
        title: "Southern Deerskin Emporium (£140+ Treasury)",
        description:
          "Accumulate at least £140 in the Confederacy treasury through deerskin extraction and trade.",
        howToComplete:
          "Submit EXTRACT and TRADE orders at Chota.",
        victoryPoints: 4,
        category: "ECONOMIC",
        evaluate: (ctx) => {
          const t = ctx.faction?.treasury ?? 0;
          const full = t >= 140;
          const pts = full ? 4 : t >= 90 ? 2 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `£${t} / £140 Deerskin Treasury (+${pts}/4 VP)`,
            progressPercent: Math.min(100, Math.round((t / 140) * 100)),
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
          const full = count >= 2;
          const pts = full ? 3 : count >= 1 ? 1 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${count} / 2 Caravan Directives (+${pts}/3 VP)`,
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
          const full = count >= 1;
          const pts = full ? 3 : 0;
          return {
            isCompleted: full,
            earnedVP: pts,
            progressText: `${count} / 1 Diplomatic Envoy (+${pts}/3 VP)`,
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
    const pts =
      typeof res.earnedVP === "number"
        ? res.earnedVP
        : res.isCompleted
        ? obj.victoryPoints
        : 0;
    earnedVP += pts;
    return {
      ...obj,
      ...res,
      earnedVP: pts,
    };
  });

  return {
    earnedVP,
    totalRoleVP: guide.totalRoleVP,
    evaluatedObjectives,
  };
}
