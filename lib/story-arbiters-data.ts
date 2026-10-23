import { FactionType } from "@prisma/client";

export interface StoryArbiter {
  id: string;
  name: string;
  title: string;
  historicalEra: string;
  activeFromTurn: number;
  activeUntilTurn: number;
  primaryFaction: FactionType | "NEUTRAL_UMPIRE";
  avatarInitials: string;
  personalityDoctrine: string;
  narrativeVoice: string;
  theaterFocus: string;
  arbitrationBias: {
    siegecraft: string;
    frontierWarfare: string;
    assemblyPolitics: string;
    navalCombat?: string;
  };
}

export const STORY_ARBITERS: StoryArbiter[] = [
  {
    id: "arbiter-loudoun",
    name: "General John Campbell, 4th Earl of Loudoun",
    title: "Commander-in-Chief, British Forces in North America (1756–1757)",
    historicalEra: "1756–1757 (Early War Friction)",
    activeFromTurn: 1,
    activeUntilTurn: 8,
    primaryFaction: FactionType.GREAT_BRITAIN,
    avatarInitials: "JL",
    theaterFocus: "Colonial Ports & Hudson-Champlain Corridor",
    personalityDoctrine:
      "Meticulous, bureaucratic, and authoritarian. Loudoun demands strict regular discipline over colonial militia, institutes broad shipping embargoes, and refuses forward assaults without secure supply magazines and provincial tax appropriations.",
    narrativeVoice:
      "Formal 18th-century British military dispatch, emphasizing logistical prudence, crown prerogative, and disdain for undisciplined colonial disorder.",
    arbitrationBias: {
      siegecraft: "Cautious: Requires established magazines and heavy artillery. Penalizes premature assaults with protracted sieges.",
      frontierWarfare: "Unfavorable to irregular rangers; insists on regular army line discipline.",
      assemblyPolitics: "Severe friction: Imposes trade embargoes and quarters troops forcefully if colonial assemblies balk at appropriations.",
      navalCombat: "Relies on coastal transport convoys; cautious about committing vessels without shore artillery support.",
    },
  },
  {
    id: "arbiter-amherst",
    name: "Major-General Jeffery Amherst",
    title: "Commander-in-Chief, British Forces in North America (1758–1763)",
    historicalEra: "1758–1763 (Methodical Conquest)",
    activeFromTurn: 9,
    activeUntilTurn: 28,
    primaryFaction: FactionType.GREAT_BRITAIN,
    avatarInitials: "JA",
    theaterFocus: "Louisbourg, Lake Champlain & St. Lawrence River",
    personalityDoctrine:
      "Methodical, relentless, and uncompromising. Amherst is a master of formal siegecraft, sapping trenches, and converging strategic columns. He rejects European 'Honours of War' for French garrisons and demands unconditional surrender.",
    narrativeVoice:
      "Calculated, steely, and authoritative. Amherst weighs siege parallels, artillery poundage, and total capitulation without sentiment.",
    arbitrationBias: {
      siegecraft: "Decisive engineering: Bonus to formal siege breaches; refuses European Honours of War upon fortress surrender.",
      frontierWarfare: "Suppression doctrine: Cuts diplomatic gift subsidies to Native nations, sparking frontier unrest.",
      assemblyPolitics: "Rigid authority: Demands provincial troop quotas backed by Parliament's full financial credit.",
      navalCombat: "Coordinates heavy siege batteries with fleet blockades to seal offshore relief channels.",
    },
  },
  {
    id: "arbiter-wolfe",
    name: "Major-General James Wolfe",
    title: "Commander of the Quebec Expedition (1759)",
    historicalEra: "1759 (Plains of Abraham)",
    activeFromTurn: 13,
    activeUntilTurn: 16,
    primaryFaction: FactionType.GREAT_BRITAIN,
    avatarInitials: "JW",
    theaterFocus: "Quebec Citadelle & St. Lawrence Escarpment",
    personalityDoctrine:
      "Daring, aggressive, and theatrical. Wolfe gambles on high-risk amphibious landings and decisive single-hour field clashes, seeking immortality through battlefield victory.",
    narrativeVoice:
      "Intense, poetic, and urgent. Wolfe lives on the razor's edge of glorious victory or catastrophic sacrifice.",
    arbitrationBias: {
      siegecraft: "High-variance shock: Resolves contested assaults into either rapid decisive breakthrough or bloody amphibious repulse.",
      frontierWarfare: "Aggressive scorched-earth reprisals along the St. Lawrence shores.",
      assemblyPolitics: "Single-minded focus on immediate military victory, indifferent to civilian legislative nuance.",
      navalCombat: "Bold riverine landings under Admiral Saunders' covering broadsides along the St. Lawrence.",
    },
  },
  {
    id: "arbiter-boscawen",
    name: "Admiral Edward Boscawen ('Old Dreadnought')",
    title: "Admiral of the Blue & Commander of the Royal Navy American Squadron",
    historicalEra: "1758–1762 (Wooden Walls of England)",
    activeFromTurn: 9,
    activeUntilTurn: 28,
    primaryFaction: FactionType.GREAT_BRITAIN,
    avatarInitials: "EB",
    theaterFocus: "Atlantic Shipping Lanes, Gabarus Bay & Gulf of St. Lawrence",
    personalityDoctrine:
      "Aggressive, intrepid naval commander. Boscawen believes in decisive line-of-battle action, close-range broadsides, and throttling enemy commerce through airtight blockades.",
    narrativeVoice:
      "Resolute, salty Admiralty dispatch detailing sail trim, broadside weight, and prizes captured.",
    arbitrationBias: {
      siegecraft: "Devastating ship-to-shore bombardments against seaward bastions.",
      frontierWarfare: "Interdiction of enemy coastal schooners and privateers.",
      assemblyPolitics: "Demands provincial timber, dockyard repairs, and sailor impressment.",
      navalCombat: "Decisive naval superiority: Gains windward advantage and shatters enemy squadrons in fleet actions.",
    },
  },
  {
    id: "arbiter-montcalm",
    name: "Louis-Joseph de Montcalm, Marquis de Saint-Véran",
    title: "Commander of the King's Troops (Troupes de Terre) in New France",
    historicalEra: "1756–1759 (Bastions of New France)",
    activeFromTurn: 1,
    activeUntilTurn: 16,
    primaryFaction: FactionType.FRANCE,
    avatarInitials: "MM",
    theaterFocus: "Lake Champlain (Carillon), Lake Ontario (Oswego) & Quebec",
    personalityDoctrine:
      "Cultured European tactician and master of defensive fortifications. Montcalm excels behind stone ramparts and abatis (Carillon/Ticonderoga). He strictly observes the European code of 'Honours of War' and struggles with Canadian frontier brutality.",
    narrativeVoice:
      "Aristocratic, disciplined French officer prose, balancing classical martial honor with the grim reality of defending an isolated colony.",
    arbitrationBias: {
      siegecraft: "Superior defensive abatis: Defending forces hold firm against 2:1 odds; readily grants Honours of War capitulations.",
      frontierWarfare: "Reluctance toward uncontrolled partisan raiding; seeks classical European battlefield decorum.",
      assemblyPolitics: "Deep rivalry with Canadian civil administration over grain monopolies and military supplies.",
      navalCombat: "Relies on fortified harbor batteries and coastal shallows to fend off deep-draft warships.",
    },
  },
  {
    id: "arbiter-conflans",
    name: "Hubert de Brienne, Comte de Conflans",
    title: "Marshal of France & Vice-Admiral of the Marine Royale",
    historicalEra: "1756–1761 (Bourbon Maritime Defense)",
    activeFromTurn: 1,
    activeUntilTurn: 22,
    primaryFaction: FactionType.FRANCE,
    avatarInitials: "HC",
    theaterFocus: "Atlantic Shipping Lanes, Windward Passage & Gulf of Mexico",
    personalityDoctrine:
      "Gallant and strategic naval commander fighting against overwhelming British tonnage. Conflans focuses on convoy escort, breaking harbor blockades, and preserving capital ships through defensive gunnery.",
    narrativeVoice:
      "Chivalric and nautical French naval journal, recording evasive maneuvers, rigging damage, and colonial supply deliveries.",
    arbitrationBias: {
      siegecraft: "Harbor defense and naval gun placement on shore fortifications.",
      frontierWarfare: "Commissions privateers to disrupt enemy colonial trade.",
      assemblyPolitics: "Pushes Versailles for naval appropriations to rebuild Bourbon battlefleets.",
      navalCombat: "Skillful convoy protection and long-range dismasting fire against pursuing squadrons.",
    },
  },
  {
    id: "arbiter-vaudreuil",
    name: "Pierre de Rigaud, Marquis de Vaudreuil-Cavagnial",
    title: "Governor-General of New France & Grand Architect of Petite Guerre",
    historicalEra: "1756–1760 (Canadian Interior Defense)",
    activeFromTurn: 1,
    activeUntilTurn: 20,
    primaryFaction: FactionType.FRANCE,
    avatarInitials: "PV",
    theaterFocus: "Montreal, Ohio Country & St. Lawrence Waterways",
    personalityDoctrine:
      "Canadian-born champion of river mobility, snowshoe raids, and Indigenous kinship alliances. Vaudreuil believes New France survives not through symmetric European sieges, but by bleeding British frontiers with relentless irregular war parties.",
    narrativeVoice:
      "Protective of Canadian soil, deeply appreciative of Indigenous war captains, and defiant against overwhelming British numbers.",
    arbitrationBias: {
      siegecraft: "Avoids costly open-field engagements; favors scorched-earth retreats and interior defense.",
      frontierWarfare: "Maximum petite guerre synergy: High raid success rates and increased colonial frontier panic.",
      assemblyPolitics: "Autocratic colonial governance; manages Canadian militia and habitant grain rations directly.",
      navalCombat: "Uses bateaux and shallow-draft gunboats to outmaneuver heavy British frigates on inland waterways.",
    },
  },
  {
    id: "arbiter-johnson",
    name: "Sir William Johnson, 1st Baronet (Warraghiyagey)",
    title: "Superintendent of Indian Affairs for the Northern District",
    historicalEra: "1756–1763 (Covenant Chain Diplomacy)",
    activeFromTurn: 1,
    activeUntilTurn: 28,
    primaryFaction: "NEUTRAL_UMPIRE",
    avatarInitials: "WJ",
    theaterFocus: "Mohawk Valley, Lake George & Onondaga Council Fire",
    personalityDoctrine:
      "Adopted Mohawk sachem and master of forest diplomacy. Johnson bridges British imperial authority with the Haudenosaunee Grand Council at Onondaga, wielding wampum belts and reciprocal respect to keep the Six Nations alliance unbroken.",
    narrativeVoice:
      "Bilingual in diplomacy, balancing forest etiquette, condolence rituals, and the Silver Covenant Chain with British military needs.",
    arbitrationBias: {
      siegecraft: "Mobilizes Haudenosaunee scout screens to cut fortress supply lines (e.g. Fort Niagara siege 1759).",
      frontierWarfare: "Stabilizing umpire: Mediates boundary friction and defuses retaliatory raids through wampum ceremonies.",
      assemblyPolitics: "Demands generous Crown trade goods and ammunition funds from skeptical colonial legislatures.",
      navalCombat: "Organizes whaleboat and batteau flotillas for Lake George and Lake Ontario operations.",
    },
  },
  {
    id: "arbiter-shingas",
    name: "War Chiefs Shingas & Pontiac",
    title: "War Leaders of the Ohio Valley & Pays d'en Haut Confederacies",
    historicalEra: "1756–1763 (Ohio Country Sovereignty)",
    activeFromTurn: 1,
    activeUntilTurn: 28,
    primaryFaction: "NEUTRAL_UMPIRE",
    avatarInitials: "SP",
    theaterFocus: "Ohio Valley, Monongahela River, Detroit & Fort Pitt",
    personalityDoctrine:
      "Unflinching defenders of ancestral river valleys. Shingas ('the Terrible') and Pontiac strike terror into colonial borders through ambushes, siege of frontier outposts, and rejection of European land encroachment.",
    narrativeVoice:
      "Fierce, unvarnished, and uncompromising eloquence of the council fire, asserting sacred sovereignty over the Ohio Country.",
    arbitrationBias: {
      siegecraft: "Lethal forest containment: Starves isolated garrisons and overruns timber stockades with fire arrows.",
      frontierWarfare: "Devastating guerrilla ambushes: Inflicts heavy casualties on European supply wagons and marching columns.",
      assemblyPolitics: "Refuses European legal jurisdictions; demands full rollback of Anglo-American frontier settlements.",
      navalCombat: "Canoe ambushes of European supply convoys at river narrows and portages.",
    },
  },
];

export function selectActiveStoryArbiter(
  turnNumber: number,
  category: "SIEGE" | "RAID" | "ASSEMBLY" | "DIPLOMACY" | "FOG_OF_WAR" | "NAVAL",
  attackerFaction?: FactionType,
  defenderFaction?: FactionType
): StoryArbiter {
  if (category === "NAVAL") {
    if (attackerFaction === FactionType.GREAT_BRITAIN) {
      return turnNumber >= 9
        ? (STORY_ARBITERS.find((a) => a.id === "arbiter-boscawen") ??
            STORY_ARBITERS[0])
        : (STORY_ARBITERS.find((a) => a.id === "arbiter-conflans") ??
            STORY_ARBITERS[0]);
    }
    if (attackerFaction === FactionType.FRANCE || defenderFaction === FactionType.FRANCE) {
      return (
        STORY_ARBITERS.find((a) => a.id === "arbiter-conflans") ??
        STORY_ARBITERS.find((a) => a.id === "arbiter-boscawen") ??
        STORY_ARBITERS[0]
      );
    }
    return (
      STORY_ARBITERS.find((a) => a.id === "arbiter-boscawen") ??
      STORY_ARBITERS[0]
    );
  }

  if (category === "RAID" || category === "DIPLOMACY") {
    const isOhioContext =
      attackerFaction === FactionType.WESTERN_CONFEDERACY ||
      defenderFaction === FactionType.WESTERN_CONFEDERACY;
    if (isOhioContext) {
      return (
        STORY_ARBITERS.find((a) => a.id === "arbiter-shingas") ??
        STORY_ARBITERS[0]
      );
    }
    return (
      STORY_ARBITERS.find((a) => a.id === "arbiter-johnson") ??
      STORY_ARBITERS[0]
    );
  }

  if (category === "ASSEMBLY") {
    if (attackerFaction === FactionType.FRANCE) {
      return (
        STORY_ARBITERS.find((a) => a.id === "arbiter-vaudreuil") ??
        STORY_ARBITERS[0]
      );
    }
    return turnNumber <= 8
      ? (STORY_ARBITERS.find((a) => a.id === "arbiter-loudoun") ??
          STORY_ARBITERS[0])
      : (STORY_ARBITERS.find((a) => a.id === "arbiter-amherst") ??
          STORY_ARBITERS[0]);
  }

  // SIEGE / CONTESTED ASSAULT
  if (attackerFaction === FactionType.GREAT_BRITAIN) {
    if (turnNumber >= 13 && turnNumber <= 16) {
      return (
        STORY_ARBITERS.find((a) => a.id === "arbiter-wolfe") ??
        STORY_ARBITERS.find((a) => a.id === "arbiter-amherst") ??
        STORY_ARBITERS[0]
      );
    }
    return turnNumber <= 8
      ? (STORY_ARBITERS.find((a) => a.id === "arbiter-loudoun") ??
          STORY_ARBITERS[0])
      : (STORY_ARBITERS.find((a) => a.id === "arbiter-amherst") ??
          STORY_ARBITERS[0]);
  }

  if (attackerFaction === FactionType.FRANCE || defenderFaction === FactionType.FRANCE) {
    return (
      STORY_ARBITERS.find((a) => a.id === "arbiter-montcalm") ??
      STORY_ARBITERS.find((a) => a.id === "arbiter-vaudreuil") ??
      STORY_ARBITERS[0]
    );
  }

  return (
    STORY_ARBITERS.find(
      (a) => turnNumber >= a.activeFromTurn && turnNumber <= a.activeUntilTurn
    ) ?? STORY_ARBITERS[0]
  );
}
