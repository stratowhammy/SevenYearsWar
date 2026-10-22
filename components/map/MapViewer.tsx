"use client";

import React, { useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Polyline,
  Marker,
  Tooltip,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { FactionType } from "@prisma/client";
import {
  AMERICAS_CARIBBEAN_BOUNDS,
  CARTO_MAP_CONFIG,
  FACTION_HEX_COLORS,
  SEA_ZONE_POLYGONS,
  buildGraphEdges,
  classifyNodeIconType,
  NodeIconCategory,
} from "./map-geometry";

export interface MapNodeDTO {
  id: string;
  name: string;
  nodeType: string;
  region: string;
  lat: number;
  lng: number;
  resourceType: string | null;
  resourceYield: number;
  controllingId: string | null;
  controller?: {
    id: string;
    type: FactionType;
  } | null;
  units: Array<{
    id: string;
    factionId: string;
    unitType: string;
    strength: number;
    discipline: number;
    isAcclimatized: boolean;
  }>;
  adjacentNodeIds: string[];
}

export interface MapViewerProps {
  nodes: MapNodeDTO[];
  season: string;
  year: number;
  selectedNodeId?: string | null;
  onSelectNode?: (nodeId: string) => void;
  showSeaPolygons?: boolean;
  showSeasonalEdges?: boolean;
  covenantedNodeIds?: string[];
}

function createHistoricalMarkerIcon(
  category: NodeIconCategory,
  color: string,
  isSelected: boolean,
  totalStrength: number,
  nodeName: string,
  isCovenanted: boolean = false
) {
  let glyphSvg = "";
  if (category === "FORT") {
    // Star Fort / Bastion SVG
    glyphSvg = `<polygon points="14,2 17,9 25,9 19,14 21,22 14,17 7,22 9,14 3,9 11,9" fill="${color}" stroke="#fef3c7" stroke-width="1.8"/>`;
  } else if (category === "COUNCIL_CENTER") {
    // Native Council Fire / Diamond SVG
    glyphSvg = `<polygon points="14,2 25,13 14,24 3,13" fill="${color}" stroke="#fde68a" stroke-width="1.8"/><circle cx="14" cy="13" r="3.5" fill="#fef3c7"/>`;
  } else if (category === "CITY") {
    // Colonial Port / Citadel Square SVG
    glyphSvg = `<rect x="4" y="4" width="20" height="18" rx="3" fill="${color}" stroke="#fef3c7" stroke-width="1.8"/><circle cx="14" cy="13" r="4" fill="#1c1917"/>`;
  } else if (category === "RIVER_PASS") {
    // Portage / River Pass SVG
    glyphSvg = `<circle cx="14" cy="13" r="9" fill="${color}" stroke="#bae6fd" stroke-width="1.8" stroke-dasharray="3,2"/>`;
  } else {
    // Sea Zone Naval Beacon
    glyphSvg = `<circle cx="14" cy="13" r="9" fill="${color}" fill-opacity="0.85" stroke="#38bdf8" stroke-width="2"/>`;
  }

  const covenantHalo = isCovenanted
    ? `<circle cx="14" cy="13" r="12.5" fill="none" stroke="#f59e0b" stroke-width="1.6" stroke-dasharray="3,2"/>`
    : "";

  const ringStyle = isSelected
    ? "filter: drop-shadow(0 0 8px #f59e0b); transform: scale(1.18);"
    : "filter: drop-shadow(0 2px 4px rgba(0,0,0,0.85));";

  const strengthBadge =
    totalStrength > 0
      ? `<span style="position:absolute;top:-7px;right:-10px;background:#1c1917;color:#fde68a;border:1px solid #d97706;border-radius:999px;padding:0 4px;font-size:9px;font-family:monospace;font-weight:700;line-height:14px;">${totalStrength}</span>`
      : "";

  const html = `
    <div style="position:relative;display:flex;flex-direction:column;align-items:center;${ringStyle}">
      <div style="position:relative;width:28px;height:26px;">
        <svg width="28" height="26" viewBox="0 0 28 26" xmlns="http://www.w3.org/2000/svg">
          ${covenantHalo}
          ${glyphSvg}
        </svg>
        ${strengthBadge}
      </div>
      <span style="margin-top:1px;background:rgba(28,25,23,0.88);color:#f5f5f4;border:1px solid rgba(168,162,158,0.45);padding:0px 5px;border-radius:3px;font-size:10px;font-weight:600;white-space:nowrap;letter-spacing:0.01em;">
        ${nodeName}
      </span>
    </div>
  `;

  return L.divIcon({
    html,
    className: "syw-custom-node-icon",
    iconSize: [28, 42],
    iconAnchor: [14, 15],
  });
}

export default function MapViewer({
  nodes,
  season,
  year,
  selectedNodeId = null,
  onSelectNode,
  showSeaPolygons = true,
  showSeasonalEdges = true,
  covenantedNodeIds = [],
}: MapViewerProps) {
  const covenantedSet = useMemo(
    () => new Set(covenantedNodeIds),
    [covenantedNodeIds]
  );
  const edges = useMemo(
    () => buildGraphEdges(nodes, season),
    [nodes, season]
  );

  const seaZoneNodes = useMemo(
    () => nodes.filter((n) => n.nodeType === "SEA_ZONE"),
    [nodes]
  );

  return (
    <div
      className="relative w-full h-full min-h-[540px] rounded-xl overflow-hidden border border-amber-900/50 shadow-2xl bg-[#1a1612]"
      data-testid="americas-caribbean-map-viewer"
      data-raster-tile-url={CARTO_MAP_CONFIG.rasterTileUrl}
      data-vector-style-url={CARTO_MAP_CONFIG.vectorStyleUrl}
    >
      {/* Parchment filter styling */}
      <style>{`
        .leaflet-container {
          background: #1b2428 !important;
          font-family: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;
        }
        .syw-parchment-tiles {
          filter: sepia(0.58) contrast(1.05) brightness(0.88) hue-rotate(-8deg);
        }
        .syw-custom-node-icon {
          background: transparent !important;
          border: none !important;
        }
      `}</style>

      {/* Top-Left Compass & Bounds Cartouche */}
      <div className="absolute top-3 left-12 z-[500] pointer-events-none bg-stone-950/90 border border-amber-800/60 rounded-lg px-3.5 py-2 text-xs shadow-lg backdrop-blur-sm space-y-0.5">
        <div className="font-serif font-bold text-amber-200 tracking-wide">
          North America &amp; Caribbean Strategic Chart ({season} {year})
        </div>
        <div className="text-[11px] font-mono text-stone-400">
          Bounds: 10°N–55°N, 55°W–100°W • {nodes.length} Theater Nodes •{" "}
          {edges.length} Corridors
        </div>
        {season === "Winter" && (
          <div className="text-[10px] font-mono text-cyan-300 font-bold">
            ❄ Winter Freeze Active: St. Lawrence &amp; Ohio Corridors (-15% March Attrition)
          </div>
        )}
        {season === "Autumn" && (
          <div className="text-[10px] font-mono text-orange-300 font-bold">
            🌀 Hurricane Season Active: Caribbean Sea Lanes (-12% Fleet Attrition)
          </div>
        )}
      </div>

      {/* Bottom-Left Map Legend */}
      <div className="absolute bottom-4 left-3 z-[500] bg-stone-950/90 border border-stone-700/80 rounded-lg p-3 text-[11px] text-stone-200 space-y-1.5 shadow-xl backdrop-blur-sm">
        <div className="font-bold uppercase tracking-wider text-amber-300 text-[10px]">
          Cartographic Legend
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 bg-red-600 border border-amber-200 rotate-45" />
          <span>Bastion Fort / Citadel / Council Fire</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-0.5 bg-cyan-300 border-b border-dashed border-cyan-300" />
          <span>Winter Freeze Corridor (2.5x Movement Cost)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-4 h-0.5 bg-orange-400" />
          <span>Caribbean Hurricane Lane (1.75x Movement Cost)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-sm bg-sky-500/30 border border-sky-400" />
          <span>Navigable Sea Zone Polygon</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full border border-dashed border-amber-400" />
          <span>Indigenous Covenant Boundary (Easton / Proclamation)</span>
        </div>
      </div>

      <MapContainer
        center={[31.5, -75.0]}
        zoom={4}
        minZoom={4}
        maxZoom={8}
        maxBounds={AMERICAS_CARIBBEAN_BOUNDS.leafletBounds}
        maxBoundsViscosity={1.0}
        className="w-full h-full min-h-[540px]"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &amp; <a href="https://carto.com/attributions">CARTO</a>'
          url={CARTO_MAP_CONFIG.rasterTileUrl}
          className="syw-parchment-tiles"
        />

        {/* Render Sea Zones as Navigable Polygons */}
        {showSeaPolygons &&
          seaZoneNodes.map((seaNode) => {
            const polyDef = SEA_ZONE_POLYGONS[seaNode.name];
            if (!polyDef) return null;
            const factionColor = seaNode.controller
              ? FACTION_HEX_COLORS[seaNode.controller.type]
              : "#0ea5e9";
            const isSelected = selectedNodeId === seaNode.id;

            return (
              <Polygon
                key={`sea-poly-${seaNode.id}`}
                positions={polyDef.coordinates}
                pathOptions={{
                  color: isSelected ? "#f59e0b" : factionColor,
                  weight: isSelected ? 2.5 : 1.5,
                  fillColor: factionColor,
                  fillOpacity: isSelected ? 0.28 : 0.14,
                  dashArray: "6 4",
                }}
                eventHandlers={{
                  click: () => onSelectNode?.(seaNode.id),
                }}
              >
                <Tooltip sticky>
                  <div className="text-xs font-sans">
                    <div className="font-bold">{seaNode.name} (Sea Zone)</div>
                    <div>
                      Naval Control:{" "}
                      {seaNode.controller?.type ?? "Contested Waters"}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      {polyDef.hazardNote}
                    </div>
                  </div>
                </Tooltip>
              </Polygon>
            );
          })}

        {/* Render Connecting Edges with Seasonal Movement Constraints */}
        {showSeasonalEdges &&
          edges.map((edge) => {
            const color = edge.isFrozen
              ? "#67e8f9"
              : edge.hasHurricaneRisk
              ? "#fb923c"
              : edge.corridorType === "SEA_LANE"
              ? "#38bdf8"
              : "#d6d3d1";

            const dashArray = edge.isFrozen
              ? "4 6"
              : edge.corridorType === "SEA_LANE"
              ? "8 6"
              : edge.corridorType === "RIVER_CORRIDOR"
              ? "5 3"
              : undefined;

            return (
              <Polyline
                key={edge.id}
                positions={edge.positions}
                pathOptions={{
                  color,
                  weight: edge.isFrozen || edge.hasHurricaneRisk ? 3 : 2,
                  opacity: 0.82,
                  dashArray,
                }}
              >
                <Tooltip sticky>
                  <div className="text-xs">
                    <div className="font-bold">
                      {edge.sourceName} ↔ {edge.targetName}
                    </div>
                    <div>Corridor: {edge.corridorType}</div>
                    <div>{edge.seasonalLabel}</div>
                  </div>
                </Tooltip>
              </Polyline>
            );
          })}

        {/* Render All Nodes (Forts, Cities, Native Council Centers, River Passes, Sea Zone Centers) */}
        {nodes.map((node) => {
          const category = classifyNodeIconType(node);
          const color = node.controller
            ? FACTION_HEX_COLORS[node.controller.type]
            : "#78716c";
          const totalStrength = node.units.reduce(
            (sum, u) => sum + u.strength,
            0
          );
          const isSelected = selectedNodeId === node.id;
          const isCovenanted = covenantedSet.has(node.id);

          const icon = createHistoricalMarkerIcon(
            category,
            color,
            isSelected,
            totalStrength,
            node.name,
            isCovenanted
          );

          return (
            <Marker
              key={node.id}
              position={[node.lat, node.lng]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectNode?.(node.id),
              }}
            >
              <Tooltip direction="top" offset={[0, -14]}>
                <div className="text-xs font-sans space-y-0.5">
                  <div className="font-bold">
                    {node.name} ({category})
                  </div>
                  <div>
                    Controller: {node.controller?.type ?? "Unclaimed"} • Region:{" "}
                    {node.region}
                  </div>
                  {isCovenanted && (
                    <div className="text-amber-600 font-semibold">
                      Protected by Easton / Council Covenant Boundary
                    </div>
                  )}
                  {node.resourceType && (
                    <div>
                      Resource: {node.resourceType} (+{node.resourceYield} £/turn)
                    </div>
                  )}
                  <div>
                    Garrison / Fleet Strength: {totalStrength} men/guns (
                    {node.units.length} units)
                  </div>
                </div>
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
