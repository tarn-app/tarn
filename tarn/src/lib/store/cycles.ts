import { create } from 'zustand';
import {
  Entry,
  Symptom,
  getAllEntries,
  upsertEntry,
  deleteEntry,
  getAllSymptoms,
} from '../db/queries';

interface CyclesStore {
  // Data
  entries: Map<string, Entry>; // keyed by date
  symptoms: Symptom[];
  isLoading: boolean;

  // Actions
  loadSymptoms: () => Promise<void>;
  loadAllEntries: () => Promise<void>;
  getEntryForDate: (date: string) => Entry | undefined;
  saveEntry: (entry: Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  removeEntry: (date: string) => Promise<void>;
  clearStore: () => void;
}

export const useCyclesStore = create<CyclesStore>((set, get) => ({
  entries: new Map(),
  symptoms: [],
  isLoading: false,

  loadSymptoms: async () => {
    try {
      const symptoms = await getAllSymptoms();
      set({ symptoms });
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to load symptoms:', error);
      }
    }
  },

  loadAllEntries: async () => {
    set({ isLoading: true });
    try {
      const entries = await getAllEntries();
      const entriesMap = new Map<string, Entry>();

      for (const entry of entries) {
        entriesMap.set(entry.date, entry);
      }

      set({ entries: entriesMap, isLoading: false });
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to load all entries:', error);
      }
      set({ isLoading: false });
    }
  },

  getEntryForDate: (date: string) => {
    return get().entries.get(date);
  },

  saveEntry: async (entryData) => {
    try {
      const entry = await upsertEntry(entryData);
      const entriesMap = new Map(get().entries);
      entriesMap.set(entry.date, entry);
      set({ entries: entriesMap });
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to save entry:', error);
      }
      throw error;
    }
  },

  removeEntry: async (date: string) => {
    try {
      await deleteEntry(date);
      const entriesMap = new Map(get().entries);
      entriesMap.delete(date);
      set({ entries: entriesMap });
    } catch (error) {
      if (__DEV__) {
        console.error('Failed to delete entry:', error);
      }
      throw error;
    }
  },

  clearStore: () => {
    set({ entries: new Map(), symptoms: [], isLoading: false });
  },
}));

let _cachedMap: Map<string, Entry> | null = null;
let _cachedArray: Entry[] = [];

export function useEntriesArray(): Entry[] {
  return useCyclesStore((state) => {
    if (state.entries !== _cachedMap) {
      _cachedMap = state.entries;
      _cachedArray = Array.from(state.entries.values());
    }
    return _cachedArray;
  });
}

