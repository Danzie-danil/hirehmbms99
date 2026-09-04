# Phase 1: Convex Schema & Foundation Setup — BMSTz Migration

This plan specifies the implementation for **Phase 1: Convex Schema & Foundation Setup**, defining the full multi-tenant schema, field validators, secondary indexes, and server-side authorization guards.

## User Review Required

> [!IMPORTANT]
> **Complete Non-Destructive Operation:**
> Supabase remains the active production backend. This phase authors the Convex backend schema and authorization helpers in `convex/` without affecting the current running application.

> [!NOTE]
> **Convex Project Target:**
> Deployment URL: `https://lovely-rhinoceros-87.convex.cloud`  
> HTTP Site: `https://lovely-rhinoceros-87.convex.site`  
> Installed package: `convex@^1.45.0`

## Proposed Changes

### Convex Backend Foundation

#### [NEW] `convex/schema.ts`
Comprehensive Convex schema definition specifying all 45+ core entities with typed validators (`v.string()`, `v.number()`, `v.boolean()`, `v.optional(...)`, `v.any()`) and query-optimized indexes (`by_owner_id`, `by_branch_id`, `by_sku`, `by_client_tx_id`, etc.).

#### [NEW] `convex/auth/identity.ts`
Authoritative session identity extractor and user authentication resolver.

#### [NEW] `convex/auth/permissions.ts`
Role-based capability evaluators (`sysadmin`, `owner`, `manager`, `cashier`, `staff`).

#### [NEW] `convex/auth/tenant.ts`
Server-authoritative tenant isolation guards (`requireOwner()`, `requireBranchAccess()`, `requireOwnerOrSysAdmin()`).

#### [NEW] `convex/auth/sysAdmin.ts`
SysAdmin privilege validation checking the authoritative `sysAdmins` table.

#### [NEW] `convex/auth/stepUp.ts`
15-minute elevated step-up session verification for critical platform actions.

### Documentation & History

#### [NEW] `implementation_plans/convex_migration_phase_1_schema_and_foundation_238.md`
Sequentially numbered implementation plan per workspace rules.

#### [MODIFY] `Chat_History/chat_history.txt`
Update chat history summary with Phase 1 details.

## Verification Plan

### Automated Checks
- Validate that `convex/schema.ts` and authorization helper files compile without syntax errors.
- Run `node scripts/lint_check.cjs` to confirm 0 lint issues across the repository.
- Run `npm run build` to ensure the existing production bundle compiles cleanly with `convex` installed.
