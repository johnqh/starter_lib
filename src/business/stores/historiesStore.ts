import { create } from 'zustand';
import type { History } from '@sudobility/starter_types';

interface HistoriesCacheEntry {
  histories: History[];
  cachedAt: number;
}

interface HistoriesStoreState {
  cache: Record<string, HistoriesCacheEntry>;
  setHistories: (userId: string, histories: History[]) => void;
  getHistories: (userId: string) => History[] | undefined;
  getCacheEntry: (userId: string) => HistoriesCacheEntry | undefined;
  addHistory: (userId: string, history: History) => void;
  updateHistory: (userId: string, historyId: string, history: History) => void;
  removeHistory: (userId: string, historyId: string) => void;
  clearAll: () => void;
}

export const useHistoriesStore = create<HistoriesStoreState>((set, get) => ({
  cache: {},

  setHistories: (userId: string, histories: History[]) =>
    set(state => ({
      cache: {
        ...state.cache,
        [userId]: {
          histories,
          cachedAt: Date.now(),
        },
      },
    })),

  getHistories: (userId: string) => {
    const entry = get().cache[userId];
    return entry?.histories;
  },

  getCacheEntry: (userId: string) => {
    return get().cache[userId];
  },

  addHistory: (userId: string, history: History) =>
    set(state => {
      const existing = state.cache[userId];
      if (!existing) {
        return {
          cache: {
            ...state.cache,
            [userId]: {
              histories: [history],
              cachedAt: Date.now(),
            },
          },
        };
      }
      return {
        cache: {
          ...state.cache,
          [userId]: {
            histories: [...existing.histories, history],
            cachedAt: Date.now(),
          },
        },
      };
    }),

  updateHistory: (userId: string, historyId: string, history: History) =>
    set(state => {
      const existing = state.cache[userId];
      if (!existing) return state;
      return {
        cache: {
          ...state.cache,
          [userId]: {
            histories: existing.histories.map(h =>
              h.id === historyId ? history : h
            ),
            cachedAt: Date.now(),
          },
        },
      };
    }),

  removeHistory: (userId: string, historyId: string) =>
    set(state => {
      const existing = state.cache[userId];
      if (!existing) return state;
      return {
        cache: {
          ...state.cache,
          [userId]: {
            histories: existing.histories.filter(h => h.id !== historyId),
            cachedAt: Date.now(),
          },
        },
      };
    }),

  clearAll: () => set({ cache: {} }),
}));
