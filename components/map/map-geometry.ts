import { FactionType } from "@prisma/client";

export const AMERICAS_CARIBBEAN_BOUNDS = {
  south: 10,
  north: 55,
  west: -100,
  east: -55,
  leafletBounds: [
    [10, -100],
    [55, -55],
  ] as [[number, number], [number, number]],
};

export function isWithinAmericasBounds(lat: number, lng: number): boolean {
  return (
    lat >= AMERICAS_CARIBBEAN_BOUNDS.south &&
    lat <= AMERICAS_CARIBBEAN_BOUNDS.north &&
    lng >= AMERICAS_CARIBBEAN_BOUNDS.west &&
    lng <= AMERICAS_CARIBBEAN_BOUNDS.east
  );
}

export const FACTION_HEX_COLORS: Record<FactionType, string> = {
  GREAT_BRITAIN: "#dc2626",
  FRANCE: "#2563eb",
  SPAIN: "#eab308",
  PORTUGAL: "#059669",
  DUTCH_REPUBLIC: "#f97316",
  GERMAN_STATES: "#64748b",
  HAUDENOSAUNEE: "#9333ea",
  SEVEN_NATIONS: "#0284c7",
  WESTERN_CONFEDERACY: "#16a34a",
  SOUTHEASTERN_NATIONS: "#d97706",
};

// Navigable polygons for Sea Zones strictly within 10°N–55°N, 55°W–100°W
export const SEA_ZONE_POLYGONS: Record<
  string,
  {
    name: string;
    coordinates: [number, number][];
    hazardNote: string;
  }
> = {
  "Gulf of St. Lawrence": {
    name: "Gulf of St. Lawrence",
    coordinates: [
      [51.5, -67.5],
      [52.0, -56.0],
      [45.5, -56.5],
      [45.2, -65.5],
    ],
    hazardNote: "Subject to pack-ice freeze in Winter turns (Nov–Apr).",
  },
  "Atlantic Shipping Lanes": {
    name: "Atlantic Shipping Lanes",
    coordinates: [
      [43.5, -68.0],
      [44.0, -55.5],
      [22.0, -55.5],
      [24.0, -72.0],
      [36.0, -74.5],
    ],
    hazardNote: "Primary transatlantic convoy corridor & privateering hunting ground.",
  },
  "Windward Passage": {
    name: "Windward Passage",
    coordinates: [
      [22.5, -77.5],
      [23.0, -64.0],
      [11.5, -61.0],
      [11.0, -76.5],
      [18.5, -79.0],
    ],
    hazardNote: "High hurricane attrition risk during late Summer & Autumn turns.",
  },
  "Gulf of Mexico": {
    name: "Gulf of Mexico",
    coordinates: [
      [30.0, -96.5],
      [29.8, -82.5],
      [21.5, -84.0],
      [19.0, -96.0],
    ],
    hazardNote: "Spanish silver flota staging basin; hurricane hazard in Autumn.",
  },
};

export type NodeIconCategory =
  | "FORT"
  | "CITY"
  | "COUNCIL_CENTER"
  | "RIVER_PASS"
  | "SEA_ZONE";

export function classifyNodeIconType(node: {
  name: string;
  nodeType: string;
}): NodeIconCategory {
  if (node.nodeType === "SEA_ZONE") return "SEA_ZONE";
  if (node.nodeType === "RIVER_PASS") return "RIVER_PASS";
  const lower = node.name.toLowerCase();
  if (lower.includes("fort") || lower.includes("louisbourg")) return "FORT";
  if (
    lower.includes("onondaga") ||
    lower.includes("scioto") ||
    lower.includes("chota") ||
    lower.includes("kahnawake") ||
    lower.includes("council")
  ) {
    return "COUNCIL_CENTER";
  }
  return "CITY";
}

export interface MapEdgeConstraint {
  id: string;
  sourceId: string;
  targetId: string;
  sourceName: string;
  targetName: string;
  positions: [[number, number], [number, number]];
  corridorType: "SEA_LANE" | "RIVER_CORRIDOR" | "WILDERNESS_TRAIL";
  isFrozen: boolean;
  hasHurricaneRisk: boolean;
  movementCostMultiplier: number;
  seasonalLabel: string;
}

export function computeEdgeConstraint(
  nodeA: {
    id: string;
    name: string;
    nodeType: string;
    region: string;
    lat: number;
    lng: number;
  },
  nodeB: {
    id: string;
    name: string;
    nodeType: string;
    region: string;
    lat: number;
    lng: number;
  },
  season: string
): MapEdgeConstraint {
  const isSeaLane =
    nodeA.nodeType === "SEA_ZONE" || nodeB.nodeType === "SEA_ZONE";
  const isRiver =
    !isSeaLane &&
    (nodeA.nodeType === "RIVER_PASS" ||
      nodeB.nodeType === "RIVER_PASS" ||
      nodeA.region === "ST_LAWRENCE" ||
      nodeB.region === "ST_LAWRENCE");

  const corridorType = isSeaLane
    ? "SEA_LANE"
    : isRiver
    ? "RIVER_CORRIDOR"
    : "WILDERNESS_TRAIL";

  const northernLatitude = Math.max(nodeA.lat, nodeB.lat) >= 43.0;
  const stLawrenceEndpoint =
    nodeA.region === "ST_LAWRENCE" || nodeB.region === "ST_LAWRENCE";

  const isFrozen =
    season.toLowerCase() === "winter" &&
    (northernLatitude || stLawrenceEndpoint);

  const caribbeanEndpoint =
    nodeA.region === "CARIBBEAN" ||
    nodeB.region === "CARIBBEAN" ||
    Math.min(nodeA.lat, nodeB.lat) <= 28.0;

  const hasHurricaneRisk =
    (season.toLowerCase() === "autumn" || season.toLowerCase() === "summer") &&
    caribbeanEndpoint &&
    isSeaLane;

  const movementCostMultiplier = isFrozen
    ? 2.5
    : hasHurricaneRisk
    ? 1.75
    : 1.0;

  let seasonalLabel = "Clear Passage (1.0x MP)";
  if (isFrozen) {
    seasonalLabel = "Seasonal Freeze: St. Lawrence / Northern Ice (2.5x MP)";
  } else if (hasHurricaneRisk) {
    seasonalLabel = "Hurricane & Squall Hazard: Caribbean Sea Lane (1.75x MP)";
  }

  const [first, second] =
    nodeA.id < nodeB.id ? [nodeA, nodeB] : [nodeB, nodeA];

  return {
    id: `${first.id}--${second.id}`,
    sourceId: first.id,
    targetId: second.id,
    sourceName: first.name,
    targetName: second.name,
    positions: [
      [first.lat, first.lng],
      [second.lat, second.lng],
    ],
    corridorType,
    isFrozen,
    hasHurricaneRisk,
    movementCostMultiplier,
    seasonalLabel,
  };
}

export function buildGraphEdges(
  nodes: Array<{
    id: string;
    name: string;
    nodeType: string;
    region: string;
    lat: number;
    lng: number;
    adjacentNodeIds: string[];
  }>,
  season: string
): MapEdgeConstraint[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const seen = new Set<string>();
  const edges: MapEdgeConstraint[] = [];

  for (const node of nodes) {
    for (const adjId of node.adjacentNodeIds) {
      const target = nodeMap.get(adjId);
      if (!target) continue;
      const edgeKey =
        node.id < target.id
          ? `${node.id}--${target.id}`
          : `${target.id}--${node.id}`;
      if (seen.has(edgeKey)) continue;
      seen.add(edgeKey);
      edges.push(computeEdgeConstraint(node, target, season));
    }
  }

  return edges;
}
