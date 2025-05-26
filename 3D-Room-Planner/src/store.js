// src/store.js
import create from 'zustand';

const useStore = create(set => ({
  viewMode: '3D',
  setViewMode: mode => set({ viewMode: mode }),
  isGridVisible: true,
  setGridVisible: visible => set({ isGridVisible: visible }),
  selectedObject: null,
  setSelectedObject: obj => set({ selectedObject: obj }),
//   isAnimating: false,
//   setIsAnimating: animating => set({ isAnimating }),
  isLoading: false,
  loadingMessage: '',
  showLoader: (message = 'Loading...') => set({ isLoading: true, loadingMessage: message }),
  hideLoader: () => set({ isLoading: false, loadingMessage: '' }),
}));

export default useStore;