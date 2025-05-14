// src/store/index.js
// Simple state management using Zustand

import { create } from 'zustand';

const useStore = create((set) => ({
  // Scene state
  isGridVisible: true,
  viewMode: '3D', // '2D' or '3D'
  selectedObject: null,
  
  // Actions
  setGridVisible: (visible) => set({ isGridVisible: visible }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedObject: (object) => set({ selectedObject: object }),
  
  // UI state
  isSidePanelOpen: true,
  activeCategory: 'Cardio',
  
  // UI actions
  toggleSidePanel: () => set((state) => ({ isSidePanelOpen: !state.isSidePanelOpen })),
  setActiveCategory: (category) => set({ activeCategory: category }),
}));

export default useStore;