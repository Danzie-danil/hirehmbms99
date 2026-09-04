# AI Real-Time Knowledge Expansion & Tenant-Isolated Business Telemetry (v3.9.2)

## Overview
Expand the BMSTz AI Assistant and AI Analytics Strategic Engine knowledge base to dynamically capture live, real-time sales, expenses, inventory valuation, cash flow, and branch performance while strictly enforcing:
1. **100% Tenant Data Isolation**: Users only receive intelligence strictly tied to their own enterprise or branch.
2. **Authoritative Subscription Plan Gating**: AI Strategic Analytics & Assistant Intelligence is strictly gated to privileged subscribers (Exclusive Plan / Enterprise AI Entitlements / Sysadmin). Non-privileged users or accounts with unentitled subscriptions are blocked at both client and server levels.

---

## User Review Required
> [!IMPORTANT]
> **Subscription Entitlement Gating**:
> - **Exclusive Plan / AI Enabled**: Full real-time telemetry access, AI analytics report generation, and conversational intelligence.
> - **Starter / Standard / Free Plans**: Blocked with upgrade prompt ("AI Strategic Intelligence is an Exclusive plan feature. Please upgrade to access it.").
> - **Server-Authoritative Enforcement**: `api/chat.js` and `get_compiled_ai_system_prompt` RPC enforce plan validation via cryptographic JWT, rejecting unentitled calls with HTTP 403.
> 
> **Tenant Security Isolation**:
> - **Business Owners**: Strictly restricted to branches and records where `owner_id = userId`.
> - **Branch Managers / Cashiers**: Strictly restricted to records where `branch_id = userBranchId`.
> - **No Cross-Tenant Data Leaks**: Multi-tenant database queries strictly enforce user-specific ID filters.

---

## Proposed Changes

### 1. `js/owner/analytics.js` (Frontend AI Analytics Engine)
- **Subscription Privilege Check**: Verify `window.hasFeature('advanced_analytics')` or `state.profile?.plan === 'exclusive'`. Show premium upgrade lock if unentitled.
- **`fetchLiveAiTelemetry(ownerId)`**:
  - Live query for user's branches (`owner_id = ownerId`).
  - Compute today's sales, 7-day revenue trend, monthly revenue, total transaction counts.
  - Compute today's expenses, 30-day expense breakdown by category, and recent expense vouchers.
  - Compute branch inventory valuation, total on-hand units, low stock alerts, and out-of-stock items.
  - Compute liquid capital balances and active loan balances.
- **`window.runAiAnalyticsReport`**:
  - Build a comprehensive, structured **Live Business Telemetry Dossier**.
  - Pass the structured live telemetry into the analysis prompt.
  - Invalidate cache when user requests fresh analysis.

### 2. `api/chat.js` (Serverless AI Chat Proxy)
- Authenticate and verify `userId` via Supabase JWT.
- Enforce plan check: Check if user has an active `exclusive` plan / AI entitlement. If not, return HTTP 403 with upgrade guidance.
- Query authenticated user profile (`role`, `owner_id`, `branch_id`).
- Build a live tenant-isolated summary (Today sales, today expenses, stock count, branch list) and append to the system prompt.
- Enforce strict security boundaries: "You must ONLY discuss the authenticated user's business data and NEVER reference or disclose data from other businesses or system infrastructure."

### 3. Database Migrations (`sql/0007_ai_realtime_knowledge_expansion.sql`)
- Update `public.get_compiled_ai_system_prompt(p_user_id, p_message, p_device)`:
  - Enforces subscription plan validation (`ai_access` flag).
  - Dynamically queries and compiles live tenant-isolated sales, expenses, and branch telemetry directly in Postgres.
- Provide `sql/0007_all_ai_knowledge_expansion_combined.sql` for single-run execution.

---

## Verification Plan

### Automated Build Validation
- Run `npm run build` to ensure 0 lint errors, 0 compilation warnings, and clean bundle generation.

### Verification of AI Telemetry, Plan Gating & Isolation
1. **Plan Gating**: Verify that users without the Exclusive plan see the upgrade card/prompt and cannot execute the AI report.
2. **Real-Time Telemetry**: Verify that privileged users running "Analyze Now" in AI Analytics see accurate, non-zero sales, expenses, and inventory values matching actual database records.
3. **Tenant Isolation**: Verify that all queries in backend and frontend are strictly filtered by `owner_id` or `branch_id`.

### Version Sync
- Bump version to `3.9.2` in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.
- Record changes and voice transcript in `Chat_History/chat_history.txt`.
