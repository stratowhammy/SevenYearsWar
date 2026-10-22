import {
  BotBehavior,
  ControllerType,
  EventScope,
  FactionType,
  RoleType,
} from "@prisma/client";

export interface SeedFactionTemplate {
  type: FactionType;
  displayName: string;
  category: "EUROPEAN" | "NATIVE_CONFEDERATION";
  color: string;
  treasury: number;
  debt: number;
  unrestIndex: number;
  standingPoints: number;
  roles: {
    roleType: RoleType;
    title: string;
    controller: ControllerType;
    botBehavior: BotBehavior;
    aiPersonaPrompt: string;
  }[];
}

export const INITIAL_FACTIONS: SeedFactionTemplate[] = [
  {
    type: FactionType.GREAT_BRITAIN,
    displayName: "Great Britain",
    category: "EUROPEAN",
    color: "#dc2626",
    treasury: 240,
    debt: 40,
    unrestIndex: 12,
    standingPoints: 5,
    roles: [
      {
        roleType: RoleType.EXECUTIVE,
        title: "Governor-General of British North America",
        controller: ControllerType.HUMAN,
        botBehavior: BotBehavior.NONE,
        aiPersonaPrompt:
          "Pittite imperial strategist; prioritize seizing French maritime approaches at Louisbourg and the Ohio Forks while funding Prussian subsidies in Europe.",
      },
      {
        roleType: RoleType.MILITARY,
        title: "Commander-in-Chief, North America (Lord Loudoun)",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.ADVISOR,
        aiPersonaPrompt:
          "Methodical regular army commander; consolidate supply lines along the Hudson-Champlain corridor and drill provincial militia before assaulting Ticonderoga.",
      },
      {
        roleType: RoleType.DIPLOMATIC_COMMERCE,
        title: "President of the Board of Trade & Northern Superintendent",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.ADVISOR,
        aiPersonaPrompt:
          "Mercantilist trade administrator and covenant-chain diplomat; secure Haudenosaunee neutrality/alliance through gifts and protect Atlantic sugar convoys.",
      },
    ],
  },
  {
    type: FactionType.FRANCE,
    displayName: "Kingdom of France",
    category: "EUROPEAN",
    color: "#2563eb",
    treasury: 185,
    debt: 65,
    unrestIndex: 18,
    standingPoints: 5,
    roles: [
      {
        roleType: RoleType.EXECUTIVE,
        title: "Governor-General of New France (Marquis de Vaudreuil)",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Canadian-born grand strategist; leverage interior river mobility, Seven Nations and Western Confederacy alliances, and asymmetric frontier raids to bleed British colonials.",
      },
      {
        roleType: RoleType.MILITARY,
        title: "Commander of the Troupes de Terre (Marquis de Montcalm)",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Aggressive European siege tactician; strike forward against British frontier forts (Oswego, Lake Champlain) before overwhelming Royal Navy blockades starve Quebec.",
      },
      {
        roleType: RoleType.DIPLOMATIC_COMMERCE,
        title: "Royal Intendant of New France & Antilles Trade",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Maintain fur trade gift diplomacy at Montreal and protect high-yield Caribbean sugar exports through Cap-Français and Windward Passage convoys.",
      },
    ],
  },
  {
    type: FactionType.SPAIN,
    displayName: "Spanish Empire",
    category: "EUROPEAN",
    color: "#eab308",
    treasury: 260,
    debt: 20,
    unrestIndex: 8,
    standingPoints: 4,
    roles: [
      {
        roleType: RoleType.EXECUTIVE,
        title: "Viceroy of New Spain & Captain-General of Cuba",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Armed neutrality balancing Bourbon Family Compact sympathies against the vital security of the Havana silver flota and Gulf of Mexico approaches.",
      },
      {
        roleType: RoleType.MILITARY,
        title: "Commander of the Armada de Barlovento",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Fortify Havana and San Marcos; patrol the Gulf of Mexico and Windward Passage against privateers and contraband smugglers.",
      },
      {
        roleType: RoleType.DIPLOMATIC_COMMERCE,
        title: "Consulado of Seville & Veracruz Bullion Intendant",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Maximize silver extraction and safe convoy accumulation in Havana while using trade concessions as diplomatic leverage.",
      },
    ],
  },
  {
    type: FactionType.PORTUGAL,
    displayName: "Kingdom of Portugal",
    category: "EUROPEAN",
    color: "#059669",
    treasury: 150,
    debt: 25,
    unrestIndex: 10,
    standingPoints: 3,
    roles: [
      {
        roleType: RoleType.EXECUTIVE,
        title: "Viceroy of Brazil & Pombaline Overseas Minister",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Enforce Marquis of Pombal's fiscal reforms; preserve the Anglo-Portuguese commercial alliance while avoiding direct devastation of Atlantic shipping.",
      },
      {
        roleType: RoleType.MILITARY,
        title: "Admiral of the South Atlantic Convoy Escort",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Escort merchantmen along the Atlantic Shipping Lanes and guard southern Caribbean approaches.",
      },
      {
        roleType: RoleType.DIPLOMATIC_COMMERCE,
        title: "Director of the Grão-Pará and Maranhão Company",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Expand sugar and timber trade across the Atlantic lanes and profit from wartime freight premiums.",
      },
    ],
  },
  {
    type: FactionType.DUTCH_REPUBLIC,
    displayName: "Dutch Republic",
    category: "EUROPEAN",
    color: "#f97316",
    treasury: 220,
    debt: 15,
    unrestIndex: 9,
    standingPoints: 3,
    roles: [
      {
        roleType: RoleType.EXECUTIVE,
        title: "Director-General of Curaçao & St. Eustatius",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Strict commercial neutrality ('Free Ships, Free Goods'); turn Willemstad into the indispensable entrepôt for all belligerents in the Caribbean.",
      },
      {
        roleType: RoleType.MILITARY,
        title: "Commander of the West India Squadron",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Defend Willemstad and escort Dutch merchantmen against British Rule of 1756 prize courts.",
      },
      {
        roleType: RoleType.DIPLOMATIC_COMMERCE,
        title: "Chief Factor of the Dutch West India Company (WIC)",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Aggressively arbitrage sugar, gunpowder, and provisions across French, Spanish, and British ports.",
      },
    ],
  },
  {
    type: FactionType.GERMAN_STATES,
    displayName: "German States (Prussia / Austria)",
    category: "EUROPEAN",
    color: "#475569",
    treasury: 140,
    debt: 35,
    unrestIndex: 14,
    standingPoints: 4,
    roles: [
      {
        roleType: RoleType.EXECUTIVE,
        title: "Minister Plenipotentiary of the German Chancellery",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Prussia-leaning; minimize naval expenditure; channel British Westminster subsidies into continental war pressure and Royal American Regiment auxiliaries.",
      },
      {
        roleType: RoleType.MILITARY,
        title: "Colonel-Commandant, 60th Royal American & Jaeger Battalions",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Deploy disciplined German-speaking riflemen and engineering officers to Philadelphia and frontier forts.",
      },
      {
        roleType: RoleType.DIPLOMATIC_COMMERCE,
        title: "Continental Subsidy & Mercenary Commissary",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Negotiate subsidy treaties and supply auxiliary regiments in exchange for bullion transfers.",
      },
    ],
  },
  {
    type: FactionType.HAUDENOSAUNEE,
    displayName: "Haudenosaunee (Six Nations Confederacy)",
    category: "NATIVE_CONFEDERATION",
    color: "#9333ea",
    treasury: 110,
    debt: 0,
    unrestIndex: 10,
    standingPoints: 5,
    roles: [
      {
        roleType: RoleType.EXECUTIVE,
        title: "Speaker of the Grand Council at Onondaga",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Preserve the sovereignty of the Longhouse between Oswego and Niagara; play Britain and France against one another until terms favor Haudenosaunee dominion.",
      },
      {
        roleType: RoleType.MILITARY,
        title: "Principal War Chief of the Mohawk & Seneca Doors",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Control the Mohawk-Lake Ontario portages; strike swiftly against unauthorized fort construction on Confederacy lands.",
      },
      {
        roleType: RoleType.DIPLOMATIC_COMMERCE,
        title: "Wampum Keeper of the Covenant Chain",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Extract maximum diplomatic gifts, trade goods, and arms from Albany and Montreal while guarding Ohio Valley tributary claims.",
      },
    ],
  },
  {
    type: FactionType.SEVEN_NATIONS,
    displayName: "Seven Nations of Canada",
    category: "NATIVE_CONFEDERATION",
    color: "#0284c7",
    treasury: 95,
    debt: 0,
    unrestIndex: 8,
    standingPoints: 4,
    roles: [
      {
        roleType: RoleType.EXECUTIVE,
        title: "Grand Council Speaker at Kahnawake",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Safeguard St. Lawrence mission communities; cooperate with New France only when warrior autonomy, plunder rights, and trade supplies are respected.",
      },
      {
        roleType: RoleType.MILITARY,
        title: "Principal War Captain of the St. Lawrence Corridor",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Execute reconnaissance and lightning raids along Lake Champlain and Ticonderoga.",
      },
      {
        roleType: RoleType.DIPLOMATIC_COMMERCE,
        title: "Keeper of the Montreal-Albany Fur Conduit",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Maintain fur trade revenues and cross-border kinship diplomacy with the Haudenosaunee.",
      },
    ],
  },
  {
    type: FactionType.WESTERN_CONFEDERACY,
    displayName: "Western Confederacy (Ohio & Pays d'en Haut)",
    category: "NATIVE_CONFEDERATION",
    color: "#16a34a",
    treasury: 100,
    debt: 0,
    unrestIndex: 12,
    standingPoints: 4,
    roles: [
      {
        roleType: RoleType.EXECUTIVE,
        title: "Speaker of the Shawnee, Delaware & Miami Council at Scioto",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Expel Anglo-American land speculators from the Ohio Country; use French arms at Fort Duquesne without submitting to French sovereignty.",
      },
      {
        roleType: RoleType.MILITARY,
        title: "Principal War Chief of the Ohio Forks",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Conduct devastating frontier raids against Pennsylvania and Virginia supply lines to paralyze British advances.",
      },
      {
        roleType: RoleType.DIPLOMATIC_COMMERCE,
        title: "Clan Keeper of the Ohio Peltry & Powder Trade",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Secure reliable gunpowder, lead, and trade goods in exchange for Ohio Valley furs and military intelligence.",
      },
    ],
  },
  {
    type: FactionType.SOUTHEASTERN_NATIONS,
    displayName: "Southeastern Nations (Cherokee & Creek Confederacy)",
    category: "NATIVE_CONFEDERATION",
    color: "#b45309",
    treasury: 105,
    debt: 0,
    unrestIndex: 11,
    standingPoints: 4,
    roles: [
      {
        roleType: RoleType.EXECUTIVE,
        title: "Beloved Man & First Speaker at Chota",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Balance British Carolina traders against French Louisiana envoys at New Orleans; protect Overhill towns from colonial encroachment.",
      },
      {
        roleType: RoleType.MILITARY,
        title: "Red War Chief of the Overhill Towns",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Guard the southern Appalachian passes and strike any colonial force that violates Cherokee blood law.",
      },
      {
        roleType: RoleType.DIPLOMATIC_COMMERCE,
        title: "Keeper of the Deerskin & Southern Path Trade",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Leverage deerskin exports between Charles Town/Philadelphia and New Orleans to keep ammunition flowing.",
      },
    ],
  },
];

export interface SeedNodeTemplate {
  key: string;
  name: string;
  nodeType: "TERRESTRIAL" | "SEA_ZONE" | "RIVER_PASS";
  subCategory: "FORT" | "CITY" | "COUNCIL_CENTER" | "SEA_ZONE" | "RIVER_PASS";
  region: "OHIO_VALLEY" | "ST_LAWRENCE" | "CARIBBEAN" | "ATLANTIC_COAST" | "SOUTHEAST";
  lat: number;
  lng: number;
  resourceType: "SUGAR" | "FURS" | "TIMBER" | "SILVER" | null;
  resourceYield: number;
  controllingFaction?: FactionType;
  adjacentKeys: string[];
}

// Strictly bounded between 10°N–55°N and 55°W–100°W
export const INITIAL_MAP_NODES: SeedNodeTemplate[] = [
  // Forts
  {
    key: "fort_duquesne",
    name: "Fort Duquesne",
    nodeType: "TERRESTRIAL",
    subCategory: "FORT",
    region: "OHIO_VALLEY",
    lat: 40.441,
    lng: -80.01,
    resourceType: "FURS",
    resourceYield: 25,
    controllingFaction: FactionType.FRANCE,
    adjacentKeys: ["ohio_forks", "scioto", "fort_niagara", "philadelphia"],
  },
  {
    key: "fort_ticonderoga",
    name: "Fort Ticonderoga (Carillon)",
    nodeType: "TERRESTRIAL",
    subCategory: "FORT",
    region: "ST_LAWRENCE",
    lat: 43.841,
    lng: -73.388,
    resourceType: "TIMBER",
    resourceYield: 15,
    controllingFaction: FactionType.FRANCE,
    adjacentKeys: [
      "lake_champlain_corridor",
      "kahnawake",
      "boston",
      "onondaga",
      "fort_oswego",
    ],
  },
  {
    key: "fort_louisbourg",
    name: "Fortress Louisbourg",
    nodeType: "TERRESTRIAL",
    subCategory: "FORT",
    region: "ST_LAWRENCE",
    lat: 45.892,
    lng: -59.985,
    resourceType: "TIMBER",
    resourceYield: 20,
    controllingFaction: FactionType.FRANCE,
    adjacentKeys: ["gulf_st_lawrence", "atlantic_shipping_lanes", "quebec"],
  },
  {
    key: "fort_oswego",
    name: "Fort Oswego",
    nodeType: "TERRESTRIAL",
    subCategory: "FORT",
    region: "ST_LAWRENCE",
    lat: 43.462,
    lng: -76.514,
    resourceType: "FURS",
    resourceYield: 20,
    controllingFaction: FactionType.GREAT_BRITAIN,
    adjacentKeys: [
      "onondaga",
      "fort_niagara",
      "lake_champlain_corridor",
      "fort_ticonderoga",
    ],
  },
  {
    key: "fort_niagara",
    name: "Fort Niagara",
    nodeType: "TERRESTRIAL",
    subCategory: "FORT",
    region: "OHIO_VALLEY",
    lat: 43.262,
    lng: -79.063,
    resourceType: "FURS",
    resourceYield: 25,
    controllingFaction: FactionType.FRANCE,
    adjacentKeys: ["fort_oswego", "onondaga", "fort_duquesne", "ohio_forks"],
  },

  // Cities
  {
    key: "quebec",
    name: "Quebec",
    nodeType: "TERRESTRIAL",
    subCategory: "CITY",
    region: "ST_LAWRENCE",
    lat: 46.813,
    lng: -71.208,
    resourceType: "FURS",
    resourceYield: 35,
    controllingFaction: FactionType.FRANCE,
    adjacentKeys: ["gulf_st_lawrence", "kahnawake", "fort_louisbourg", "lake_champlain_corridor"],
  },
  {
    key: "boston",
    name: "Boston",
    nodeType: "TERRESTRIAL",
    subCategory: "CITY",
    region: "ST_LAWRENCE",
    lat: 42.36,
    lng: -71.058,
    resourceType: "TIMBER",
    resourceYield: 30,
    controllingFaction: FactionType.GREAT_BRITAIN,
    adjacentKeys: ["atlantic_shipping_lanes", "philadelphia", "fort_ticonderoga", "lake_champlain_corridor"],
  },
  {
    key: "philadelphia",
    name: "Philadelphia",
    nodeType: "TERRESTRIAL",
    subCategory: "CITY",
    region: "OHIO_VALLEY",
    lat: 39.952,
    lng: -75.165,
    resourceType: "TIMBER",
    resourceYield: 35,
    controllingFaction: FactionType.GERMAN_STATES,
    adjacentKeys: ["boston", "atlantic_shipping_lanes", "fort_duquesne", "onondaga", "chota"],
  },
  {
    key: "havana",
    name: "Havana",
    nodeType: "TERRESTRIAL",
    subCategory: "CITY",
    region: "CARIBBEAN",
    lat: 23.113,
    lng: -82.366,
    resourceType: "SILVER",
    resourceYield: 50,
    controllingFaction: FactionType.SPAIN,
    adjacentKeys: ["gulf_of_mexico", "windward_passage", "atlantic_shipping_lanes"],
  },
  {
    key: "new_orleans",
    name: "New Orleans",
    nodeType: "TERRESTRIAL",
    subCategory: "CITY",
    region: "CARIBBEAN",
    lat: 29.951,
    lng: -90.071,
    resourceType: "FURS",
    resourceYield: 25,
    controllingFaction: FactionType.FRANCE,
    adjacentKeys: ["gulf_of_mexico", "chota", "ohio_forks"],
  },
  {
    key: "willemstad",
    name: "Willemstad (Curaçao)",
    nodeType: "TERRESTRIAL",
    subCategory: "CITY",
    region: "CARIBBEAN",
    lat: 12.108,
    lng: -68.935,
    resourceType: "SUGAR",
    resourceYield: 40,
    controllingFaction: FactionType.DUTCH_REPUBLIC,
    adjacentKeys: ["windward_passage", "atlantic_shipping_lanes"],
  },
  {
    key: "port_royal",
    name: "Port Royal / Kingston",
    nodeType: "TERRESTRIAL",
    subCategory: "CITY",
    region: "CARIBBEAN",
    lat: 17.937,
    lng: -76.841,
    resourceType: "SUGAR",
    resourceYield: 45,
    controllingFaction: FactionType.GREAT_BRITAIN,
    adjacentKeys: ["windward_passage", "gulf_of_mexico"],
  },
  {
    key: "sao_luis_para",
    name: "Belém do Pará (Atlantic Entrepôt)",
    nodeType: "TERRESTRIAL",
    subCategory: "CITY",
    region: "CARIBBEAN",
    lat: 11.5,
    lng: -56.5,
    resourceType: "SUGAR",
    resourceYield: 35,
    controllingFaction: FactionType.PORTUGAL,
    adjacentKeys: ["atlantic_shipping_lanes", "windward_passage"],
  },

  // Native Council Centers
  {
    key: "onondaga",
    name: "Onondaga Council Fire",
    nodeType: "TERRESTRIAL",
    subCategory: "COUNCIL_CENTER",
    region: "ST_LAWRENCE",
    lat: 42.998,
    lng: -76.135,
    resourceType: "FURS",
    resourceYield: 30,
    controllingFaction: FactionType.HAUDENOSAUNEE,
    adjacentKeys: ["fort_oswego", "fort_niagara", "fort_ticonderoga", "philadelphia", "kahnawake"],
  },
  {
    key: "kahnawake",
    name: "Kahnawake (Seven Nations Council)",
    nodeType: "TERRESTRIAL",
    subCategory: "COUNCIL_CENTER",
    region: "ST_LAWRENCE",
    lat: 45.416,
    lng: -73.675,
    resourceType: "FURS",
    resourceYield: 25,
    controllingFaction: FactionType.SEVEN_NATIONS,
    adjacentKeys: ["quebec", "fort_ticonderoga", "lake_champlain_corridor", "onondaga"],
  },
  {
    key: "scioto",
    name: "Scioto Council Towns",
    nodeType: "TERRESTRIAL",
    subCategory: "COUNCIL_CENTER",
    region: "OHIO_VALLEY",
    lat: 39.612,
    lng: -82.982,
    resourceType: "FURS",
    resourceYield: 28,
    controllingFaction: FactionType.WESTERN_CONFEDERACY,
    adjacentKeys: ["fort_duquesne", "ohio_forks", "chota"],
  },
  {
    key: "chota",
    name: "Chota (Overhill Council Center)",
    nodeType: "TERRESTRIAL",
    subCategory: "COUNCIL_CENTER",
    region: "OHIO_VALLEY",
    lat: 35.552,
    lng: -84.132,
    resourceType: "FURS",
    resourceYield: 28,
    controllingFaction: FactionType.SOUTHEASTERN_NATIONS,
    adjacentKeys: ["scioto", "philadelphia", "new_orleans", "ohio_forks"],
  },

  // River Passes
  {
    key: "ohio_forks",
    name: "Ohio River Portage & Forks",
    nodeType: "RIVER_PASS",
    subCategory: "RIVER_PASS",
    region: "OHIO_VALLEY",
    lat: 39.2,
    lng: -81.4,
    resourceType: "FURS",
    resourceYield: 15,
    controllingFaction: FactionType.WESTERN_CONFEDERACY,
    adjacentKeys: ["fort_duquesne", "scioto", "fort_niagara", "new_orleans", "chota"],
  },
  {
    key: "lake_champlain_corridor",
    name: "Lake Champlain & Richelieu Portage",
    nodeType: "RIVER_PASS",
    subCategory: "RIVER_PASS",
    region: "ST_LAWRENCE",
    lat: 44.55,
    lng: -73.33,
    resourceType: "TIMBER",
    resourceYield: 10,
    controllingFaction: FactionType.FRANCE,
    adjacentKeys: ["quebec", "kahnawake", "fort_ticonderoga", "boston", "fort_oswego"],
  },

  // Sea Zones
  {
    key: "gulf_st_lawrence",
    name: "Gulf of St. Lawrence",
    nodeType: "SEA_ZONE",
    subCategory: "SEA_ZONE",
    region: "ST_LAWRENCE",
    lat: 48.0,
    lng: -62.0,
    resourceType: null,
    resourceYield: 0,
    controllingFaction: FactionType.FRANCE,
    adjacentKeys: ["quebec", "fort_louisbourg", "atlantic_shipping_lanes"],
  },
  {
    key: "atlantic_shipping_lanes",
    name: "Atlantic Shipping Lanes",
    nodeType: "SEA_ZONE",
    subCategory: "SEA_ZONE",
    region: "CARIBBEAN",
    lat: 32.5,
    lng: -64.8,
    resourceType: null,
    resourceYield: 0,
    controllingFaction: FactionType.GREAT_BRITAIN,
    adjacentKeys: [
      "gulf_st_lawrence",
      "fort_louisbourg",
      "boston",
      "philadelphia",
      "havana",
      "windward_passage",
      "willemstad",
      "sao_luis_para",
    ],
  },
  {
    key: "windward_passage",
    name: "Windward Passage",
    nodeType: "SEA_ZONE",
    subCategory: "SEA_ZONE",
    region: "CARIBBEAN",
    lat: 19.9,
    lng: -73.8,
    resourceType: "SUGAR",
    resourceYield: 20,
    controllingFaction: FactionType.FRANCE,
    adjacentKeys: [
      "havana",
      "port_royal",
      "willemstad",
      "atlantic_shipping_lanes",
      "gulf_of_mexico",
      "sao_luis_para",
    ],
  },
  {
    key: "gulf_of_mexico",
    name: "Gulf of Mexico",
    nodeType: "SEA_ZONE",
    subCategory: "SEA_ZONE",
    region: "CARIBBEAN",
    lat: 25.2,
    lng: -88.5,
    resourceType: null,
    resourceYield: 0,
    controllingFaction: FactionType.SPAIN,
    adjacentKeys: ["havana", "new_orleans", "port_royal", "windward_passage"],
  },
];

export interface SeedUnitTemplate {
  factionType: FactionType;
  nodeKey: string;
  unitType:
    | "REGULAR"
    | "MILITIA"
    | "NATIVE_WAR_PARTY"
    | "SHIP_OF_THE_LINE"
    | "MERCHANTMAN";
  strength: number;
  discipline: number;
  isAcclimatized: boolean;
}

export const INITIAL_UNITS: SeedUnitTemplate[] = [
  // Great Britain
  {
    factionType: FactionType.GREAT_BRITAIN,
    nodeKey: "boston",
    unitType: "REGULAR",
    strength: 1800,
    discipline: 1.15,
    isAcclimatized: false,
  },
  {
    factionType: FactionType.GREAT_BRITAIN,
    nodeKey: "fort_oswego",
    unitType: "MILITIA",
    strength: 950,
    discipline: 0.9,
    isAcclimatized: true,
  },
  {
    factionType: FactionType.GREAT_BRITAIN,
    nodeKey: "atlantic_shipping_lanes",
    unitType: "SHIP_OF_THE_LINE",
    strength: 1200,
    discipline: 1.25,
    isAcclimatized: true,
  },
  {
    factionType: FactionType.GREAT_BRITAIN,
    nodeKey: "port_royal",
    unitType: "MERCHANTMAN",
    strength: 600,
    discipline: 1.0,
    isAcclimatized: true,
  },

  // France
  {
    factionType: FactionType.FRANCE,
    nodeKey: "quebec",
    unitType: "REGULAR",
    strength: 1600,
    discipline: 1.2,
    isAcclimatized: true,
  },
  {
    factionType: FactionType.FRANCE,
    nodeKey: "fort_ticonderoga",
    unitType: "REGULAR",
    strength: 1200,
    discipline: 1.15,
    isAcclimatized: true,
  },
  {
    factionType: FactionType.FRANCE,
    nodeKey: "fort_duquesne",
    unitType: "MILITIA",
    strength: 850,
    discipline: 1.05,
    isAcclimatized: true,
  },
  {
    factionType: FactionType.FRANCE,
    nodeKey: "fort_louisbourg",
    unitType: "SHIP_OF_THE_LINE",
    strength: 900,
    discipline: 1.1,
    isAcclimatized: true,
  },

  // Spain
  {
    factionType: FactionType.SPAIN,
    nodeKey: "havana",
    unitType: "REGULAR",
    strength: 1500,
    discipline: 1.05,
    isAcclimatized: true,
  },
  {
    factionType: FactionType.SPAIN,
    nodeKey: "gulf_of_mexico",
    unitType: "SHIP_OF_THE_LINE",
    strength: 1000,
    discipline: 1.05,
    isAcclimatized: true,
  },

  // Portugal
  {
    factionType: FactionType.PORTUGAL,
    nodeKey: "sao_luis_para",
    unitType: "MERCHANTMAN",
    strength: 750,
    discipline: 1.0,
    isAcclimatized: true,
  },

  // Dutch Republic
  {
    factionType: FactionType.DUTCH_REPUBLIC,
    nodeKey: "willemstad",
    unitType: "MERCHANTMAN",
    strength: 900,
    discipline: 1.05,
    isAcclimatized: true,
  },

  // German States
  {
    factionType: FactionType.GERMAN_STATES,
    nodeKey: "philadelphia",
    unitType: "REGULAR",
    strength: 1100,
    discipline: 1.25,
    isAcclimatized: false,
  },

  // Haudenosaunee
  {
    factionType: FactionType.HAUDENOSAUNEE,
    nodeKey: "onondaga",
    unitType: "NATIVE_WAR_PARTY",
    strength: 1400,
    discipline: 1.2,
    isAcclimatized: true,
  },

  // Seven Nations
  {
    factionType: FactionType.SEVEN_NATIONS,
    nodeKey: "kahnawake",
    unitType: "NATIVE_WAR_PARTY",
    strength: 1050,
    discipline: 1.15,
    isAcclimatized: true,
  },

  // Western Confederacy
  {
    factionType: FactionType.WESTERN_CONFEDERACY,
    nodeKey: "scioto",
    unitType: "NATIVE_WAR_PARTY",
    strength: 1300,
    discipline: 1.2,
    isAcclimatized: true,
  },

  // Southeastern Nations
  {
    factionType: FactionType.SOUTHEASTERN_NATIONS,
    nodeKey: "chota",
    unitType: "NATIVE_WAR_PARTY",
    strength: 1350,
    discipline: 1.15,
    isAcclimatized: true,
  },
];

export const INITIAL_OFF_MAP_MODIFIERS = {
  europeTheater: {
    name: "Continental European Theater (Bohemia, Hanover & Minorca)",
    status: "DIPLOMATIC_REVOLUTION_ESCALATING",
    britishSubsidyDrain: 20,
    frenchContinentalDrain: 25,
    germanSubsidyInflow: 20,
    royalNavyBlockadeModifier: 1.15,
    narrative:
      "The Convention of Westminster and Treaty of Versailles have overturned European alliances; French forces threaten Minorca while Prussia prepares to march on Saxony.",
  },
  indiaTheater: {
    name: "East Indies & Carnatic Theater (Bengal & Coromandel)",
    status: "CARNATIC_STANDOFF",
    britishEastIndiaRevenue: 15,
    frenchCompagnieRevenue: 10,
    narrative:
      "Tensions mount in Bengal and along the Coromandel Coast between the EIC and Compagnie des Indes.",
  },
  westAfricaTheater: {
    name: "West African Coast (Senegal & Gorée)",
    status: "GUM_AND_ATLANTIC_TRADE_CONTESTED",
    caribbeanLaborSupplyModifier: 1.0,
    dutchNeutralFreightBonus: 12,
    narrative:
      "French and British sloops contest the Senegal gum trade while Dutch neutral hulls carry the bulk of Caribbean provisions.",
  },
};

export const INITIAL_EVENTS_TEMPLATE = [
  {
    category: "WAR_DECLARATION",
    scope: EventScope.GLOBAL,
    factions: [FactionType.GREAT_BRITAIN, FactionType.FRANCE],
    title: "Formal Declaration of War (May 1756)",
    description:
      "Following two years of undeclared frontier clashes in the Ohio Country and the French assault on Minorca, Great Britain and France formally declare war across all theaters.",
    validUntilTurn: null,
  },
  {
    category: "DIPLOMACY",
    scope: EventScope.THEATER,
    factions: [FactionType.GREAT_BRITAIN, FactionType.GERMAN_STATES],
    title: "Convention of Westminster & Royal American Levy",
    description:
      "Whitehall commits bullion subsidies to the German theater while commissioning German-speaking officers for the 60th Royal American Regiment at Philadelphia.",
    validUntilTurn: 8,
  },
  {
    category: "MILITARY",
    scope: EventScope.NODE,
    nodeKey: "fort_duquesne",
    factions: [FactionType.FRANCE, FactionType.WESTERN_CONFEDERACY],
    title: "Franco-Indigenous War Councils at the Ohio Forks",
    description:
      "French officers at Fort Duquesne distribute gunpowder and vermilion to Delaware, Shawnee, and Miami war captains raiding the Pennsylvania-Virginia frontier.",
    validUntilTurn: 5,
  },
  {
    category: "DIPLOMACY",
    scope: EventScope.FACTION,
    nodeKey: "onondaga",
    factions: [FactionType.HAUDENOSAUNEE, FactionType.GREAT_BRITAIN, FactionType.FRANCE],
    title: "Grand Council Neutrality Deliberations at Onondaga",
    description:
      "The Six Nations weigh Sir William Johnson's Covenant Chain gifts against Marquis de Vaudreuil's pledges to respect Confederacy hunting grounds.",
    validUntilTurn: 6,
  },
  {
    category: "COMMERCE",
    scope: EventScope.THEATER,
    nodeKey: "willemstad",
    factions: [FactionType.DUTCH_REPUBLIC, FactionType.FRANCE, FactionType.SPAIN],
    title: "Dutch Neutrality Contraband Boom in the Caribbean",
    description:
      "Willemstad and St. Eustatius merchants transship French Antillean sugar and munitions under neutral Dutch colors.",
    validUntilTurn: 6,
  },
];
