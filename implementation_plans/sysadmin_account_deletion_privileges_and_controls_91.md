# Sysadmin Privilege, Tools & Controls over Account Deletion

Provide full system administrator oversight, privileges, and automated control tools over tenant account deletions, grace periods, legal holds, and data purging.

## User Review Required
> [!IMPORTANT]
> - Sysadmin will have full capability to inspect all pending tenant deletions, cancel deletions/reactivate accounts on behalf of owners, extend deletion grace periods, apply legal holds/deletion freezes, export full compliance archives, and execute immediate permanent purges when needed.
> - An SQL migration script [`sql/0002_sysadmin_account_deletion_controls.sql`](file:///d:/v2%20BMS%20OFFICIAL/sql/0002_sysadmin_account_deletion_controls.sql) will be created with security definer RPCs for manual execution by the user in Supabase SQL editor.

## Proposed Changes

### Database & Security Definer RPCs

#### [NEW] [0002_sysadmin_account_deletion_controls.sql](file:///d:/v2%20BMS%20OFFICIAL/sql/0002_sysadmin_account_deletion_controls.sql)
- `public.sysadmin_cancel_tenant_deletion(p_tenant_id UUID, p_admin_note TEXT)`
- `public.sysadmin_purge_tenant_permanently(p_tenant_id UUID, p_admin_note TEXT)`
- `public.sysadmin_extend_deletion_grace(p_tenant_id UUID, p_additional_days INT, p_admin_note TEXT)`
- `public.sysadmin_toggle_deletion_freeze(p_tenant_id UUID, p_freeze BOOLEAN, p_admin_note TEXT)`

### Sysadmin UI & Dashboard

#### [MODIFY] [js/admin/dashboard.js](file:///d:/v2%20BMS%20OFFICIAL/js/admin/dashboard.js)
- **User Maintenance (`renderUserMaintenance`)**:
  - Add **"Pending Deletions"** subnav tab with live count badge.
  - Render dedicated Deletion Pipeline dashboard with days remaining, reason, owner contacts, and direct admin action controls.
  - In Business Tenants table, display prominent `Pending Deletion` countdown badge.
- **Tenant 360° Modal (`openTenant360Modal`)**:
  - Add Account Deletion alert card & one-click admin override tools when inspecting a deletion-pending tenant.
- **Compliance Vault (`renderComplianceVault`)**:
  - Add Deletion & Retention Pipeline metrics and direct management link.
- **Client-Side Admin Action Handlers**:
  - `window.sysadminCancelTenantDeletion(tenantId, businessName)`
  - `window.sysadminPurgeTenantPermanently(tenantId, businessName)`
  - `window.sysadminExtendDeletionGrace(tenantId, businessName)`
  - `window.sysadminToggleDeletionFreeze(tenantId, businessName)`

---

## Verification Plan

### Automated Build Verification
- Run `npm run build` to verify clean build and 0 lint/bundling errors.

### Manual Verification
1. Log in as Sysadmin -> navigate to User Maintenance -> verify "Pending Deletions" tab appears with accurate badge count.
2. Test cancelling a scheduled deletion -> verify profile status returns to `active` and branches unfreeze.
3. Test extending grace period -> verify updated `deletion_scheduled_for` date and audit log.
4. Test opening Tenant 360° for a deletion-pending tenant -> verify deletion alert banner and quick-action controls.
