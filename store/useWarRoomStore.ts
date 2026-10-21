import { create } from "zustand";
import { FactionType, RoleType } from "@prisma/client";

export type WarRoomTab = "ORDERS" | "DISPATCHES" | "CHRONICLE" | "ADVISOR";

interface WarRoomState {
  selectedNodeId: string | null;
  selectedFactionType: FactionType;
  selectedRoleType: RoleType;
  activeTab: WarRoomTab;
  showSeaPolygons: boolean;
  showSeasonalEdges: boolean;
  setSelectedNodeId: (nodeId: string | null) => void;
  setSelectedFactionType: (faction: FactionType) => void;
  setSelectedRoleType: (role: RoleType) => void;
  setActiveTab: (tab: WarRoomTab) => void;
  toggleSeaPolygons: () => void;
  toggleSeasonalEdges: () => void;
}

export const useWarRoomStore = create<WarRoomState>((set) => ({
  selectedNodeId: null,
  selectedFactionType: FactionType.GREAT_BRITAIN,
  selectedRoleType: RoleType.EXECUTIVE,
  activeTab: "ORDERS",
  showSeaPolygons: true,
  showSeasonalEdges: true,
  setSelectedNodeId: (nodeId) => set({ selectedNodeId: nodeId }),
  setSelectedFactionType: (faction) => set({ selectedFactionType: faction }),
  setSelectedRoleType: (role) => set({ selectedRoleType: role }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleSeaPolygons: () =>
    set((state) => ({ showSeaPolygons: !state.showSeaPolygons })),
  toggleSeasonalEdges: () =>
    set((state) => ({ showSeasonalEdges: !state.showSeasonalEdges })),
}));
