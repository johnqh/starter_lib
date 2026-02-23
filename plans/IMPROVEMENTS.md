# Improvement Plans for @sudobility/starter_lib

## Priority 1 - High Impact

### 1. Add Tests for useHistoriesManager Hook
- `useHistoriesManager` is the primary hook consumed by both UI layers (starter_app and starter_app_rn) but has zero test coverage
- The hook contains significant orchestration logic: cache fallback, percentage calculation, auto-fetch guards with `useRef`, token reactivity reset, and store synchronization
- Edge cases to cover: division by zero in percentage calculation (when `total <= 0`), behavior when `userId` is null, cache-to-server transition, token change resetting fetch guard
- The `isCached` flag derivation logic (`clientHistories.length === 0 && cachedHistories?.length > 0`) should be tested to ensure correct transitions

### 2. Add JSDoc Documentation to All Exports
- `useHistoriesManager` and its config/return interfaces (`UseHistoriesManagerConfig`, `UseHistoriesManagerReturn`) have no JSDoc comments
- `useHistoriesStore` and its state interface (`HistoriesStoreState`, `HistoriesCacheEntry`) lack documentation
- The `percentage` field's calculation formula `(userSum / globalTotal) * 100` is not documented on the return type
- The `autoFetch` parameter's behavior (default true, `useRef` guard against double-mount) needs documentation for consumers
- The `isCached` and `cachedAt` fields need documentation explaining when and why the UI shows stale data

### 3. Add Cache Expiration Strategy to Zustand Store
- The `historiesStore` tracks `cachedAt` timestamps but never uses them for expiration
- Stale cached data persists indefinitely in memory until `clearAll` is called or the page is refreshed
- There is no mechanism to invalidate or refresh cache entries that are older than a configured threshold
- This could lead to showing very stale data to users who navigate away and return later in the same session

## Priority 2 - Medium Impact

### 3. Improve Error Propagation in Mutation Wrappers
- `createHistory`, `updateHistory`, and `deleteHistory` in `useHistoriesManager` swallow the server response when `response.success` is false -- they silently skip the store update but do not throw or surface the error
- If a mutation fails at the API level but the network call succeeds (e.g., 400 validation error), the consuming UI receives no feedback about what went wrong
- The aggregated `error` field only captures the most recent error from any of the three sources (histories, total, mutations), so earlier errors can be masked

### 4. Decouple Store Updates from Hook-Level Side Effects
- The `useEffect` that syncs client data to the store (`setHistories(userId, clientHistories)`) runs on every render where `clientHistories.length > 0`, potentially causing unnecessary store writes
- Consider adding a comparison check (e.g., referential equality) to avoid re-setting the same data
- The store operations (`addHistoryToStore`, `updateHistoryInStore`, `removeHistoryFromStore`) performed in mutation callbacks duplicate the invalidation that TanStack Query already performs, creating a potential for state drift between the two caches

## Priority 3 - Nice to Have

### 5. Add Store Persistence Option
- The Zustand store is explicitly documented as in-memory only with no persistence
- For improved UX, particularly in the React Native app where cold starts are slow, adding an opt-in persistence layer (e.g., Zustand persist middleware with AsyncStorage) would allow the cache to survive app restarts
- This would complement the existing `cachedAt` field by making the staleness indicator more meaningful

### 6. Extract Percentage Calculation into a Standalone Utility
- The percentage formula `(userSum / total) * 100` with the `total <= 0` guard is embedded directly in the hook
- Extracting this into a pure function would make it independently testable and reusable
- The `userSum` calculation (`histories.reduce((sum, h) => sum + h.value, 0)`) is also duplicated in the web app's HistoriesPage.tsx, suggesting it should be a shared utility in this library
