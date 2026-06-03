import { create } from "zustand";

interface FiltersState {
  stage: string;
  setStage: (value: string) => void;
}

export const useFiltersStore = create<FiltersState>((set) => ({
  stage: "all",
  setStage: (value) => set({ stage: value }),
}));
