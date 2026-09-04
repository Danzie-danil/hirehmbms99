# Branch Sales Server-Side Pagination & Daily Sales Default with On-Demand History

Implement server-side pagination for branch sales transactions, restrict initial/default fetches to today's daily sales only, and provide an intuitive on-demand history fetch workflow with time-range presets and server-side search.

## User Review Required

> [!IMPORTANT]
> - **Default Scope:** When opening the Sales Register, the branch portal will now strictly query **Today's Sales** (`00:00:00` today to now), ensuring near-instant page load and low bandwidth usage.
> - **On-Demand History Fetch:** A segmented toggle bar `[ Today's Sales ]` / `[ Sales History ]` and a quick call-to-action button will allow cashiers and branch managers to fetch past sales whenever needed (with presets: *All History*, *Yesterday*, *Last 7 Days*, *Last 30 Days*).
> - **Server-Side Pagination & Search:** Pagination (Page 1, 2, 3... and Page Size 10/25/50) and search queries will execute directly against the backend database using Supabase `.range(from, to)` and `.count('exact')` instead of hiding DOM elements on the client side.

---

## Proposed Changes

### Branch Portal (`js/branch/sales.js`)

#### [MODIFY] [sales.js](file:///d:/V2BmstzOfficial/js/branch/sales.js)
1. **Extend `salesPageState`:**
   - Add `filterMode: 'today'` (default: `'today'`, options: `'today' | 'history'`).
   - Add `historyRange: 'all'` (options: `'all'`, `'yesterday'`, `'7d'`, `'30d'`).
   - Set default `pageSize: 10` (with options for 10, 25, 50).
   - Add `searchQuery: ''` for debounced server-side querying.

2. **Add View Scope & History Controls in `renderSalesModule()`:**
   - Add a segmented switcher above the transaction list:
     - `Today's Sales` (Active badge, showing live today indicator).
     - `Sales History` (Loads past transactions on demand).
   - In History mode, display time-range quick pills:
     - `[ All History ]`, `[ Yesterday ]`, `[ Last 7 Days ]`, `[ Last 30 Days ]`.
   - Update the search input to debounce (300ms) and trigger server-side queries across all pages.

3. **Refactor `refreshSalesModuleData()`:**
   - When `filterMode === 'today'`:
     - Calculate start of today (`today.setHours(0, 0, 0, 0); dateFilter = today.toISOString()`).
     - Query local IndexedDB for today's transactions for instant render.
     - Pass `dateFilter` and `searchQuery` to `dbSales.fetchAll(branchId, { page, pageSize, dateFilter, searchQuery })`.
   - When `filterMode === 'history'`:
     - Calculate `dateFilter` according to selected range (e.g. `null` for All History, 7 days ago for `7d`, etc.).
     - Fetch server-side paginated history records.
   - If in `today` mode and 0 sales exist, display a helpful empty state with a 1-click button: `[ View Sales History ]`.

4. **Enhanced Server-Side Pagination Controls:**
   - Clean page number links (`1, 2, 3...`), Previous/Next buttons, and a items-per-page selector (10, 25, 50).

---

## Verification Plan

### Automated Verification
- `npm run build` to ensure production bundle compiles cleanly.
- `node scripts/lint_check.cjs` to verify zero syntax or linting issues across all files.

### Manual Verification
1. Log in as a branch user and open the Sales Register.
2. Verify that only today's sales are loaded by default and page count reflects today's total.
3. Switch to `Sales History` and verify past sales are fetched and paginated properly via server-side ranges.
4. Test search input with server-side query to confirm matching records across pages are returned.
5. Test page size switching and page navigation.
