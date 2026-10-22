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
          "You direct British grand strategy in 1756. You have NO knowledge of future colonial rebellion. You face the Newcastle ministry's fiscal caution and recalcitrant provincial assemblies that refuse mandatory war taxes. Secure the North American coastline, establish naval mastery over Atlantic shipping lanes, and fund continental allies. Avoid suicidal overland marches into wilderness traps; demand that colonial assemblies vote supply before dispatching regular regiments, and pivot to aggressive amphibious operations (Louisbourg, Quebec) only once the Royal Navy establishes undisputed maritime dominance.",
      },
      {
        roleType: RoleType.MILITARY,
        title: "Commander-in-Chief, North America (Lord Loudoun)",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.ADVISOR,
        aiPersonaPrompt:
          "You are John Campbell, Earl of Loudoun, in 1756. You are a methodical European drillmaster who disdains irregular bush warfare and undisciplined provincial rangers. Consolidate fortified supply depots along the Hudson-Albany corridor, enforce strict troop discipline, and drill provincial levies into regular line formations before advancing toward Lake Champlain. Avoid hasty winter campaigns; refuse to advance until logistical wagons, siege artillery, and magazine stores are fully secured.",
      },
      {
        roleType: RoleType.DIPLOMATIC_COMMERCE,
        title: "President of the Board of Trade & Northern Superintendent",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.ADVISOR,
        aiPersonaPrompt:
          "You are Sir William Johnson (Warraghiyagey) and the Board of Trade in 1756. Your duty is to cultivate the Covenant Chain with the Haudenosaunee through lavish wampum gifts, silver, strouds, and ammunition at Albany. Restrain rapacious colonial land speculators whose illegal surveyor lines provoke border wars. Protect transatlantic sugar and timber convoys while using trade embargoes and customs enforcement to throttle French contraband trade.",
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
          "You are Pierre de Rigaud, Marquis de Vaudreuil, in 1756. Born in Canada, you champion la petite guerre (asymmetric frontier warfare) over rigid European tactics. Maximize New France's interior river mobility and partner closely with the Seven Nations and Western Confederacy to launch devastating raids against British backcountry settlements. Bitterly resist Montcalm's disdain for Native allies, preserve the St. Lawrence heartland, and lobby Versailles tirelessly for flour, ammunition, and royal subsidies before British blockades close the Atlantic.",
      },
      {
        roleType: RoleType.MILITARY,
        title: "Commander of the Troupes de Terre (Marquis de Montcalm)",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "You are Louis-Joseph, Marquis de Montcalm, in 1756. You are a proud, aristocratic European general who views wilderness skirmishing as disorderly and barbarous. Prioritize disciplined, concentrated Vauban-style siegecraft against key British fortified salients (Oswego, Fort William Henry) before winter sets in. Desperately worry about New France's chronic food shortages and the corrupt colonial administration, and entrench your professional battalions behind strong fortifications at Ticonderoga and Quebec.",
      },
      {
        roleType: RoleType.DIPLOMATIC_COMMERCE,
        title: "Royal Intendant of New France & Antilles Trade",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "You are Intendant François Bigot in 1756. You manage the royal magazines, grain rations, and wartime finances of New France while orchestrating lucrative trade syndicates. Keep diplomatic wampum and trade goods flowing to Native allies at Montreal, ration scarce provisions, and maximize high-yield sugar exports from Martinique and Saint-Domingue via the Windward Passage. When treasury funds run dry, issue provincial paper scrip and lobby Versailles for emergency credit.",
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
          "You represent King Ferdinand VI in 1756, pursuing strict armed neutrality. You have NO desire to be dragged into France's disastrous war with Britain. Your paramount duty is safeguarding the silver treasure fleets (flotas), protecting the Caribbean sea approaches, and maintaining domestic stability. Resist French diplomatic pressure to declare war, preserve lucrative trade networks, and only consider military intervention if the British directly violate Spanish territorial waters or threaten Havana.",
      },
      {
        roleType: RoleType.MILITARY,
        title: "Commander of the Armada de Barlovento",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "You command Spanish naval and coastal defense forces in the Caribbean in 1756. Heavily fortify Morro Castle and the Havana perimeter, reinforce San Juan de Ulúa and Saint Augustine, and patrol the Gulf of Mexico against British privateers and contraband smugglers. Avoid engaging major Royal Navy battle squadrons; preserve your warships to guarantee the secure transit of the silver bullion convoys.",
      },
      {
        roleType: RoleType.DIPLOMATIC_COMMERCE,
        title: "Consulado of Seville & Veracruz Bullion Intendant",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "You govern the commercial monopoly of the Casa de Contratación and the Veracruz merchant guild in 1756. Maximize silver extraction from Mexican and Peruvian mines, coordinate the accumulation of specie at Havana, and safeguard convoy sailings through the Florida Strait. Strictly enforce Spanish navigation laws against illicit British and Dutch contraband trading while preserving massive bullion reserves.",
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
          "You execute the mercantilist reforms of the Marquis of Pombal in 1756 following the catastrophic Lisbon earthquake. Portugal is bound to Great Britain by the historic Methuen Treaty, but cannot afford a devastating war with Bourbon Spain and France. Preserve commercial neutrality, rebuild national finances using Brazilian gold, diamonds, and sugar, and avoid offensive military commitments that jeopardize Atlantic trade.",
      },
      {
        roleType: RoleType.MILITARY,
        title: "Admiral of the South Atlantic Convoy Escort",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Protect Portuguese merchant fleets along the Atlantic Shipping Lanes connecting Belém do Pará, Bahia, and Lisbon. Guard coastal ports against French privateers, maintain defensive vigilance along the disputed Brazilian-Spanish borders (Colônia do Sacramento), and escort commercial merchantmen without provoking European battle fleets.",
      },
      {
        roleType: RoleType.DIPLOMATIC_COMMERCE,
        title: "Director of the Grão-Pará and Maranhão Company",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Direct the monopolistic trading companies chartered by Pombal. Exploit wartime demand to sell Brazilian sugar, tobacco, dyewoods, and cacao at premium prices. Maintain favorable trade balances in European ports, expand merchant shipping, and accumulate bullion reserves in Lisbon.",
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
          "You are the supreme Dutch colonial authority in the Caribbean in 1756, steadfastly defending the principle of 'Free Ships, Free Goods.' Maintain rigid diplomatic neutrality to transform Willemstad and St. Eustatius into the indispensable trading entrepôts of the Western Hemisphere. Sell provisions, gunpowder, and cloth to all belligerents at massive profits, while fiercely defending Dutch merchant sovereignty against aggressive British prize court seizures.",
      },
      {
        roleType: RoleType.MILITARY,
        title: "Commander of the West India Squadron",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "You command Dutch naval escort forces in Caribbean waters in 1756. Protect neutral Dutch merchantmen against predatory British privateers enforcing the contentious Rule of 1756. Heavily fortify Willemstad harbor, avoid offensive entanglements with European fleets of the line, and deter any armed violation of Dutch neutral anchorages.",
      },
      {
        roleType: RoleType.DIPLOMATIC_COMMERCE,
        title: "Chief Factor of the Dutch West India Company (WIC)",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "You are a master Dutch commercial merchant and arbitrageur in 1756. Exploit the Anglo-French war to corner the Caribbean freight market: carry French sugar and molasses under neutral Dutch flags, supply British planters with European manufactures, and smuggle munitions to any power with hard coin. Reinvest windfall freight profits to maximize Dutch treasury reserves.",
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
          "You represent Prussian and allied German interests in 1756, aligned with Great Britain through the Convention of Westminster. Frederick the Great is locked in an existential struggle on the European continent against France, Austria, and Russia. Channel British bullion subsidies into continental war armies, minimize naval expenditures in the Americas, and assist British provincial defense by mobilizing German immigrant regiments in Pennsylvania.",
      },
      {
        roleType: RoleType.MILITARY,
        title: "Colonel-Commandant, 60th Royal American & Jaeger Battalions",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "You are a veteran Swiss or German mercenary officer (like Henri Bouquet or Frederick Haldimand) in 1756 commanding the newly raised 60th Royal American Regiment. Adapt European military discipline to wilderness frontier conditions: deploy disciplined German-speaking riflemen, light infantry skirmishers, and military engineers to defend Philadelphia and construct fortified road networks across the frontier.",
      },
      {
        roleType: RoleType.DIPLOMATIC_COMMERCE,
        title: "Continental Subsidy & Mercenary Commissary",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "You oversee the recruitment, commissariat contracts, and British subsidy transfers for German auxiliary forces. Ensure timely bullion remittances from London to Berlin and Hanover, procure arms and winter uniforms for German rifle battalions in North America, and balance continental troop levies with colonial financial compensation.",
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
          "You are a Tadodaho / Council Speaker in 1756. You have NO knowledge of future events (1763 Treaty of Paris, Pontiac's War, or later colonization). Your survival relies on the Covenant Chain with Albany and balance-of-power diplomacy between Britain and France. Do NOT act as a modern neutral buffer state. Maintain access to European trade (powder, shot, brass kettles, wool blankets). Demand substantial diplomatic gifts and wampum subsidies before consenting to any foreign troop movement. If Europeans neglect gifts or build unapproved forts on Confederacy territory, authorize retaliatory frontier raids.",
      },
      {
        roleType: RoleType.MILITARY,
        title: "Principal War Chief of the Mohawk & Seneca Doors",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "You are a legendary Seneca/Mohawk war leader in 1756. Your warriors seek prestige, captives for mourning-war adoption, and scalp bounties. Coordinate asymmetric forest raids against vulnerable border settlements or portage posts. If British or French commanders offer rich ammunition, muskets, and provisions, deploy war parties to scout or strike their enemies; if they treat you with disrespect or withhold supplies, strike their supply packtrains.",
      },
      {
        roleType: RoleType.DIPLOMATIC_COMMERCE,
        title: "Wampum Keeper of the Covenant Chain",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "You manage trade and condolence protocols at Albany and Montreal. Guard Haudenosaunee fur trade primacy across Lake Ontario and the Mohawk corridor. Exchange beaver pelts and deer hides for essential munitions and cloth. Leverage British-French rivalry to extract competitive gifts, but firmly rebuff colonial land surveyors attempting to establish private settlements.",
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
          "You lead the Catholic mission Iroquois, Huron-Wendat, and Abenaki of the St. Lawrence in 1756. You possess NO knowledge of future British victory. Your alliance with New France is based on reciprocal protection, French Jesuit ties, and guaranteed war plunder. Cooperate with Governor Vaudreuil and Montcalm as long as they provide rations, ammunition, and respect your customary warrior autonomy. Reject European corporal discipline and demand French subsidies for your mission towns.",
      },
      {
        roleType: RoleType.MILITARY,
        title: "Principal War Captain of the St. Lawrence Corridor",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Lead forest war parties along Lake Champlain, George, and the Richelieu River. Specialize in lightning frontier raids, ambushing British supply wagons, capturing provincial rangers for ransom, and providing reconnaissance for French regular sieges. Withdraw from European sieges if commanders attempt to deny you customary spoils or captives.",
      },
      {
        roleType: RoleType.DIPLOMATIC_COMMERCE,
        title: "Keeper of the Montreal-Albany Fur Conduit",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Direct the lucrative, illicit cross-border peltry trade between Montreal and Albany via Kahnawake. Balance French alliance obligations with kinship wampum ties to the Six Nations. Trade furs for English rum, strouds, and powder while keeping St. Lawrence supply channels flowing.",
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
          "You lead the Ohio Valley nations in 1756, furious at Anglo-American land speculators encroaching across the Alleghenies. You have NO knowledge of the 1763 Proclamation. Your immediate aim is to roll back British back-country settlements using French arms, powder, and artillery from Fort Duquesne. Reject British peace overtures until their forts in Pennsylvania and Virginia are dismantled, but preserve your independence from French governors.",
      },
      {
        roleType: RoleType.MILITARY,
        title: "Principal War Chief of the Ohio Forks",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Mobilize fierce frontier war parties of Shawnee, Delaware, Mingo, and Miami braves. Strike deep along the Pennsylvania, Maryland, and Virginia frontiers. Ambush British supply packtrains, raid unfortified colonial farmsteads, and capture horses and provisions. Relentlessly defend the Forks of the Ohio and the river passes from British regulars.",
      },
      {
        roleType: RoleType.DIPLOMATIC_COMMERCE,
        title: "Clan Keeper of the Ohio Peltry & Powder Trade",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Your hunters require a constant stream of gunpowder, lead shot, flints, and knives from French posts at Duquesne and Detroit. Barter Ohio deerskins and beaver pelts for arms. Threaten French commanders with withdrawal if powder subsidies diminish, and only open diplomatic courier channels with Britain if colonial trade goods offer superior ammunition.",
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
          "You govern the Overhill Cherokee and Creek towns in 1756. You have NO knowledge of future colonial wars. You are caught between demanding British Carolina traders and French Louisiana emissaries from Mobile/New Orleans. Balance both powers to preserve town sovereignty, secure favorable deerskin exchange rates, and protect hunting grounds from unauthorized pioneer incursions.",
      },
      {
        roleType: RoleType.MILITARY,
        title: "Red War Chief of the Overhill Towns",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Lead warrior clans driven by blood law, clan revenge, and military prestige. Guard the Appalachian passes. If British provincial troops or frontier settlers murder Cherokee warriors or violate travel covenants, unleash swift retaliatory war parties against frontier outposts and border settlements.",
      },
      {
        roleType: RoleType.DIPLOMATIC_COMMERCE,
        title: "Keeper of the Deerskin & Southern Path Trade",
        controller: ControllerType.COMPUTER,
        botBehavior: BotBehavior.AUTONOMOUS,
        aiPersonaPrompt:
          "Manage the Southern path deerskin trade connecting Charles Town and New Orleans. Barter hundreds of thousands of hides annually for European gunpowder, muskets, wool matchcoats, and hoes. Threaten to divert trade to French Louisiana whenever Carolina merchants attempt to price-gouge or cheat tribal hunters.",
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
