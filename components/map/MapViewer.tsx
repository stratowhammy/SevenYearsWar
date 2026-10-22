"use client";

import React, { useMemo, useState } from "react";
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
    ? `<circle cx="14" cy="13" r="12.5" fill="none" stroke="#f59e0b" stroke-width="1.8" stroke-dasharray="3,2"/>`
    : "";

  const wrapperClass = isSelected
    ? "syw-marker-wrapper syw-marker-selected"
    : "syw-marker-wrapper syw-marker-default";

  const strengthBadge =
    totalStrength > 0
      ? `<span class="syw-marker-strength-badge">${totalStrength}</span>`
      : "";

  const labelClass = isSelected
    ? "syw-marker-label-selected"
    : "syw-marker-label";

  const html = `
    <div class="${wrapperClass}">
      <div class="relative w-[28px] h-[26px]">
        <svg width="28" height="26" viewBox="0 0 28 26" xmlns="http://www.w3.org/2000/svg">
          ${covenantHalo}
          ${glyphSvg}
        </svg>
        ${strengthBadge}
      </div>
      <span class="${labelClass}">
        ${nodeName}
      </span>
    </div>
  `;

  return L.divIcon({
    html,
    className: "syw-custom-node-icon",
    iconSize: [28, 44],
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
  const [isLegendOpen, setIsLegendOpen] = useState(false);

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
      className="relative isolate z-0 w-full h-full min-h-[540px] rounded-xl overflow-hidden border border-amber-900/50 shadow-2xl bg-[#1a1612]"
      data-testid="americas-caribbean-map-viewer"
      data-raster-tile-url={CARTO_MAP_CONFIG.rasterTileUrl}
      data-vector-style-url={CARTO_MAP_CONFIG.vectorStyleUrl}
    >
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

      {/* Bottom-Left Collapsible Map Legend */}
      <div className="absolute bottom-4 left-3 z-[500]">
        {!isLegendOpen ? (
          <button
            type="button"
            onClick={() => setIsLegendOpen(true)}
            className="flex items-center gap-1.5 bg-stone-950/90 hover:bg-stone-900 border border-amber-800/60 rounded-lg px-3 py-1.5 text-xs text-amber-200 shadow-xl backdrop-blur-sm transition cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="font-semibold text-[11px] uppercase tracking-wide">Map Legend</span>
            <span className="text-stone-400 text-[10px]">▴</span>
          </button>
        ) : (
          <div className="bg-stone-950/95 border border-amber-800/80 rounded-lg p-3 text-[11px] text-stone-200 space-y-1.5 shadow-2xl backdrop-blur-md max-w-xs transition-all">
            <div className="flex items-center justify-between pb-1 border-b border-stone-800">
              <span className="font-bold uppercase tracking-wider text-amber-300 text-[10px]">
                Cartographic Legend
              </span>
              <button
                type="button"
                onClick={() => setIsLegendOpen(false)}
                className="text-stone-400 hover:text-stone-100 text-xs px-1 cursor-pointer"
                title="Minimize Legend"
              >
                ✕
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-red-600 border border-amber-200 rotate-45" />
              <span>Bastion Fort / Citadel / Council Fire</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-0.5 bg-cyan-300 border-b border-dashed border-cyan-300" />
              <span>Winter Freeze Corridor (2.5x Cost)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-4 h-0.5 bg-orange-400" />
              <span>Caribbean Hurricane Lane (1.75x Cost)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-sm bg-sky-500/30 border border-sky-400" />
              <span>Navigable Sea Zone Polygon</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rounded-full border border-dashed border-amber-400" />
              <span>Indigenous Covenant Boundary</span>
            </div>
          </div>
        )}
      </div>

      <MapContainer
        center={[35.5, -74.5]}
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
