# BMSTz — Supabase to Convex Migration Workspace

This directory is the dedicated, isolated engineering workspace for the migration of the **BMSTz Multi-Tenant Business Management & POS System** from **Supabase/PostgreSQL** to **Convex**, in strict accordance with `migration_to_convex.md`.

## Directory Structure

```text
migration/
├── README.md                 # Workspace guide & documentation
├── AUDIT_REPORT.md           # Exhaustive Phase 0 discovery and audit report
├── audit/                    # Automated audit datasets, table inventories, RPC lists
│   ├── tables_discovered.json
│   ├── rpcs_discovered.json
│   ├── queries_by_file.json
│   └── rpcs_by_file.json
├── schema/                   # Supabase schema definitions and Convex schema mappings
├── export/                   # Non-destructive data extraction scripts and schemas
├── transform/                # Idempotent data normalization and ID transformation pipelines
├── import/                   # Safe Convex batch import scripts
├── validation/               # Parity validators (row counts, foreign keys, financial sums)
├── rollback/                 # Safe, documented rollback protocols (ROLLBACK.md)
├── reports/                  # Validation reports, financial comparison sheets
└── scripts/                  # Repeatable, idempotent migration tooling
```

## Safety Principles

1. **Non-Destructive:** Supabase remains the active production source of truth during development and validation. No production data is altered or deleted during migration.
2. **Deterministic & Idempotent:** All migration steps can be safely re-run without creating duplicate records or corrupted references.
3. **Financial & Data Parity:** Zero tolerance for financial rounding discrepancies, lost historical logs, or mismatched row counts.
4. **Tenant Isolation:** Server-authoritative multi-tenant isolation is strictly preserved and enforced in Convex functions.
