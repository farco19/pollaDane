import { create } from "zustand";

interface UiState {
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (value: boolean) => void;
  toggleMobileMenu: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  mobileMenuOpen: false,
  setMobileMenuOpen: (value) => set({ mobileMenuOpen: value }),
  toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),
}));
