import { useCallback, useEffect, useMemo, useRef } from 'react';
import type {
  NetworkClient,
  Optional,
  History,
  HistoryCreateRequest,
  HistoryUpdateRequest,
} from '@sudobility/starter_types';
import type { FirebaseIdToken } from '@sudobility/starter_client';
import {
  useHistories,
  useHistoriesTotal,
  useHistoryMutations,
} from '@sudobility/starter_client';
import { useHistoriesStore } from '../stores/historiesStore';

export interface UseHistoriesManagerConfig {
  baseUrl: string;
  networkClient: NetworkClient;
  userId: Optional<string>;
  token: Optional<FirebaseIdToken>;
  autoFetch?: boolean;
}

export interface UseHistoriesManagerReturn {
  histories: History[];
  total: number;
  percentage: number;
  isLoading: boolean;
  error: Optional<string>;
  isCached: boolean;
  cachedAt: Optional<number>;
  createHistory: (data: HistoryCreateRequest) => Promise<void>;
  updateHistory: (
    historyId: string,
    data: HistoryUpdateRequest
  ) => Promise<void>;
  deleteHistory: (historyId: string) => Promise<void>;
  refresh: () => void;
}

export const useHistoriesManager = ({
  baseUrl,
  networkClient,
  userId,
  token,
  autoFetch = true,
}: UseHistoriesManagerConfig): UseHistoriesManagerReturn => {
  const {
    histories: clientHistories,
    isLoading: historiesLoading,
    error: historiesError,
    refetch,
  } = useHistories(networkClient, baseUrl, userId ?? null, token ?? null);

  const {
    total,
    isLoading: totalLoading,
    error: totalError,
  } = useHistoriesTotal(networkClient, baseUrl);

  const {
    createHistory: clientCreate,
    updateHistory: clientUpdate,
    deleteHistory: clientDelete,
    isCreating,
    isUpdating,
    isDeleting,
    error: mutationError,
  } = useHistoryMutations(networkClient, baseUrl, userId ?? null, token ?? null);

  const cacheEntry = useHistoriesStore(
    useCallback(state => (userId ? state.cache[userId] : undefined), [userId])
  );
  const setHistories = useHistoriesStore(state => state.setHistories);
  const addHistoryToStore = useHistoriesStore(state => state.addHistory);
  const updateHistoryInStore = useHistoriesStore(state => state.updateHistory);
  const removeHistoryFromStore = useHistoriesStore(state => state.removeHistory);

  const cachedHistories = cacheEntry?.histories;
  const cachedAt = cacheEntry?.cachedAt;

  const histories = useMemo(
    () =>
      clientHistories.length > 0
        ? clientHistories
        : (cachedHistories ?? []),
    [clientHistories, cachedHistories]
  );
  const isCached =
    clientHistories.length === 0 && (cachedHistories?.length ?? 0) > 0;

  // Sync client data to store
  useEffect(() => {
    if (clientHistories.length > 0 && userId) {
      setHistories(userId, clientHistories);
    }
  }, [clientHistories, userId, setHistories]);

  // Calculate percentage
  const percentage = useMemo(() => {
    if (total <= 0) return 0;
    const userSum = histories.reduce((sum, h) => sum + h.value, 0);
    return (userSum / total) * 100;
  }, [histories, total]);

  const createHistory = useCallback(
    async (data: HistoryCreateRequest): Promise<void> => {
      const response = await clientCreate(data);
      if (response.success && response.data && userId) {
        addHistoryToStore(userId, response.data);
      }
    },
    [clientCreate, userId, addHistoryToStore]
  );

  const updateHistory = useCallback(
    async (historyId: string, data: HistoryUpdateRequest): Promise<void> => {
      const response = await clientUpdate(historyId, data);
      if (response.success && response.data && userId) {
        updateHistoryInStore(userId, historyId, response.data);
      }
    },
    [clientUpdate, userId, updateHistoryInStore]
  );

  const deleteHistory = useCallback(
    async (historyId: string): Promise<void> => {
      const response = await clientDelete(historyId);
      if (response.success && userId) {
        removeHistoryFromStore(userId, historyId);
      }
    },
    [clientDelete, userId, removeHistoryFromStore]
  );

  const isLoading =
    historiesLoading || totalLoading || isCreating || isUpdating || isDeleting;
  const error = historiesError ?? totalError ?? mutationError ?? null;

  const hasAttemptedFetchRef = useRef(false);

  useEffect(() => {
    if (
      autoFetch &&
      token &&
      userId &&
      histories.length === 0 &&
      !hasAttemptedFetchRef.current
    ) {
      hasAttemptedFetchRef.current = true;
      refetch();
    }
  }, [autoFetch, token, userId, histories.length, refetch]);

  useEffect(() => {
    hasAttemptedFetchRef.current = false;
  }, [token]);

  return useMemo(
    () => ({
      histories,
      total,
      percentage,
      isLoading,
      error,
      isCached,
      cachedAt: cachedAt ?? null,
      createHistory,
      updateHistory,
      deleteHistory,
      refresh: refetch,
    }),
    [
      histories,
      total,
      percentage,
      isLoading,
      error,
      isCached,
      cachedAt,
      createHistory,
      updateHistory,
      deleteHistory,
      refetch,
    ]
  );
};
