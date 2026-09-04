# Migration Validation Tooling

Contains automated parity verification tools:
- `verify_row_counts.cjs`: Asserts row count parity across all 84 tables.
- `verify_financial_totals.cjs`: Asserts exact numerical sum equality for sales, expenses, and balances.
- `verify_relationships.cjs`: Checks for broken foreign keys or orphaned records.
