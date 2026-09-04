import { supabase } from '../supabase.js';
import { state } from '../state.js';
import { showToast, showLoader, hideLoader } from '../utils.js';

let originalTenantState = null;

export async function sysadminInspectTenant(tenantId) {
    const isSysadmin = state.role === 'sysadmin' || state.role === 'superadmin' || 
                       (state.profile && (state.profile.role === 'sysadmin' || state.profile.role === 'superadmin')) ||
                       localStorage.getItem('bms_last_role') === 'sysadmin';

    if (!isSysadmin) {
        showToast('Unauthorized: Sysadmin privileges required.', 'error');
        return;
    }

    showLoader('Initializing Secure Read-Only Workspace Inspection...');
    try {
        const { data: tenantProfile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', tenantId)
            .single();

        if (error || !tenantProfile) throw new Error('Could not load tenant workspace profile.');

        // Backup current admin session state        // Store current sysadmin state for restoration
        originalTenantState = {
            profile: state.profile ? { ...state.profile } : null,
            role: state.role,
            ownerId: state.ownerId,
            currentUser: state.currentUser,
            branches: [...(state.branches || [])],
            currentBranchId: state.currentBranchId,
            entitlements: state.entitlements ? { ...state.entitlements } : null
        };

        // Audit log
        if (state.profile && state.profile.id) {
            supabase.from('sys_audit_logs').insert({
                user_id: state.profile.id,
                email: state.profile.email || 'admin@bmstz.com',
                action: 'TENANT_IMPERSONATION_READONLY_START',
                severity: 'warning',
                details: {
                    tenant_id: tenantProfile.id,
                    business_name: tenantProfile.business_name || tenantProfile.full_name,
                    started_at: new Date().toISOString()
                }
            }).then(({ error }) => {
                if (error) console.warn('[Audit Log Warning]', error.message);
            });
        }

        // Set impersonation mode & update active tenant state
        window.isSysadminImpersonationMode = true;
        window.currentInspectingTenant = tenantProfile;
        state.impersonatedTenant = tenantProfile;
        state.ownerId = tenantProfile.id;
        state.profile = tenantProfile;
        if (tenantProfile.email) {
            state.currentUser = tenantProfile.email;
        }

        // Authoritative Server Entitlements: Fetch tenant's verified permissions from Supabase
        try {
            const { data: serverEntitlements } = await supabase.rpc('get_user_effective_entitlements', { p_user_id: tenantProfile.id });
            if (serverEntitlements) {
                state.entitlements = serverEntitlements;
            }
        } catch (entErr) {
            console.warn('[Impersonation] Entitlements RPC fallback:', entErr);
        }

        // Fetch tenant branches so that owner modules, selectors, and overview charts have full tenant branch context
        try {
            const { data: bData } = await supabase
                .from('branches')
                .select('*')
                .eq('owner_id', tenantProfile.id);
            state.branches = bData || [];
            if (state.branches.length > 0) {
                state.currentBranchId = state.branches[0].id;
            }
        } catch (bErr) {
            console.warn('[Impersonation] Branch fetch fallback:', bErr);
            state.branches = [];
        }

        // Switch side navigation bar from Sysadmin to Owner Nav
        const ownerNav = document.getElementById('ownerNav');
        const sysadminNav = document.getElementById('sysadminNav');
        const branchNav = document.getElementById('branchNav');

        if (ownerNav) ownerNav.classList.remove('hidden');
        if (sysadminNav) sysadminNav.classList.add('hidden');
        if (branchNav) branchNav.classList.add('hidden');

        const elUserRole = document.getElementById('userRole');
        if (elUserRole) elUserRole.textContent = 'BSO (Inspecting)';

        // Render top floating banner
        renderImpersonationBanner(tenantProfile);

        // Load and render tenant workspace overview via main switchView router
        if (window.switchView) {
            await window.switchView('overview');
        } else {
            const { renderOwnerOverview } = await import('../owner/overview.js');
            await renderOwnerOverview();
        }

        // Apply read-only locks to DOM
        setTimeout(() => applyReadOnlyLocks(), 300);

        showToast(`Entering Read-Only Support Mode for ${tenantProfile.business_name || tenantProfile.full_name}`, 'warning');
    } catch (err) {
        console.error('[Impersonation Error]', err);
        showToast(err.message || 'Failed to initialize tenant inspection.', 'error');
    } finally {
        hideLoader();
    }
}

function renderImpersonationBanner(tenant) {
    let banner = document.getElementById('sysadminImpersonationBanner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'sysadminImpersonationBanner';
        document.body.prepend(banner);
    }

    banner.className = 'fixed top-2.5 left-1/2 -translate-x-1/2 z-[99999] max-w-[95vw] sm:max-w-fit flex flex-col items-center select-none bg-transparent';
    banner.innerHTML = `
        <div class="bg-gray-900 text-white px-3 sm:px-4 py-1.5 rounded-full border border-amber-500/60 flex items-center gap-2.5 text-xs">
            <!-- Pulse Indicator -->
            <div class="flex items-center gap-1.5 shrink-0">
                <span class="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                <span class="font-black text-[11px] tracking-wide text-amber-400 uppercase hidden xs:inline">Support Mode</span>
            </div>

            <span class="text-gray-600 font-normal">|</span>

            <!-- See More Toggle Button -->
            <button id="toggleImpersonationDetailsBtn" onclick="window.toggleImpersonationDetails()" class="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 font-bold text-[11px] rounded-lg border border-amber-500/30 flex items-center gap-1 cursor-pointer">
                <i data-lucide="info" class="w-3 h-3"></i>
                <span id="impersonationDetailsBtnText">See More</span>
            </button>

            <!-- Exit Button -->
            <button onclick="window.exitSysadminImpersonation()" class="px-3 py-1 bg-red-600 text-white font-bold text-[11px] rounded-full flex items-center gap-1 cursor-pointer">
                <i data-lucide="log-out" class="w-3 h-3"></i> Exit
            </button>
        </div>

        <!-- Expandable Details Popover Card (hidden by default) -->
        <div id="impersonationDetailsCard" class="hidden mt-2 w-80 sm:w-96 bg-gray-900 text-white rounded-2xl p-4 border border-amber-500/40 space-y-2 text-xs">
            <div class="flex items-center justify-between border-b border-gray-800 pb-2">
                <div class="flex items-center gap-2">
                    <div class="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                        ${(tenant.business_name || 'B').charAt(0).toUpperCase()}
                    </div>
                    <span class="font-bold text-sm text-gray-100 truncate max-w-[200px]">${escapeHtml(tenant.business_name || tenant.full_name || 'Tenant')}</span>
                </div>
                <span class="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-950 text-amber-300 border border-amber-800 uppercase">Read-Only</span>
            </div>
            <div class="space-y-1.5 text-gray-300 text-[11px] pt-1">
                <div class="flex justify-between">
                    <span class="text-gray-400 font-medium">Owner Email:</span>
                    <span class="font-mono text-gray-200 truncate max-w-[180px]">${escapeHtml(tenant.email || 'N/A')}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400 font-medium">Tenant ID:</span>
                    <span class="font-mono text-gray-400 text-[10px]">${tenant.id ? tenant.id.substring(0, 16) + '...' : 'N/A'}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400 font-medium">Plan:</span>
                    <span class="font-bold text-amber-400 uppercase">${escapeHtml(tenant.plan || 'Free Trial')}</span>
                </div>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();
}

window.toggleImpersonationDetails = function() {
    const card = document.getElementById('impersonationDetailsCard');
    const textEl = document.getElementById('impersonationDetailsBtnText');
    if (!card) return;

    if (card.classList.contains('hidden')) {
        card.classList.remove('hidden');
        if (textEl) textEl.textContent = 'Hide Details';
    } else {
        card.classList.add('hidden');
        if (textEl) textEl.textContent = 'See More';
    }
};

export function applyReadOnlyLocks() {
    if (!window.isSysadminImpersonationMode) return;

    // Disable mutating inputs & action buttons
    const selectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        '.btn-save',
        '.btn-delete',
        '.btn-add',
        '.btn-create'
    ];

    selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(btn => {
            if (!btn.closest('#sysadminImpersonationBanner')) {
                btn.disabled = true;
                btn.classList.add('opacity-50', 'cursor-not-allowed');
                btn.setAttribute('title', 'Action disabled in Sysadmin Read-Only Support Mode');
            }
        });
    });
}

export async function exitSysadminImpersonation() {
    showLoader('Restoring Sysadmin Control Suite...');
    try {
        // Set flags immediately to unblock UI thread
        window.isSysadminImpersonationMode = false;
        window.currentInspectingTenant = null;
        state.impersonatedTenant = null;

        if (originalTenantState && originalTenantState.profile) {
            // Non-blocking audit log push
            supabase.from('sys_audit_logs').insert({
                user_id: originalTenantState.profile.id || 'sysadmin',
                email: originalTenantState.profile.email || 'admin@bmstz.com',
                action: 'TENANT_IMPERSONATION_READONLY_END',
                severity: 'info',
                details: {
                    ended_at: new Date().toISOString()
                }
            }).then(({ error }) => {
                if (error) console.warn('[Audit Log Warning]', error.message);
            });

            // Restore original sysadmin state
            state.profile = originalTenantState.profile;
            state.role = originalTenantState.role || 'sysadmin';
            state.ownerId = originalTenantState.ownerId || 'sysadmin';
            if (originalTenantState.currentUser) {
                state.currentUser = originalTenantState.currentUser;
            }
            state.branches = originalTenantState.branches || [];
            state.currentBranchId = originalTenantState.currentBranchId || null;
            state.entitlements = originalTenantState.entitlements || null;
        } else {
            state.role = 'sysadmin';
            state.ownerId = 'sysadmin';
            try {
                const { data: adminEntitlements } = await supabase.rpc('get_user_effective_entitlements');
                if (adminEntitlements) state.entitlements = adminEntitlements;
            } catch (e) {}
        }

        const banner = document.getElementById('sysadminImpersonationBanner');
        if (banner) banner.remove();

        // Restore side navigation bar back to Sysadmin Nav
        const ownerNav = document.getElementById('ownerNav');
        const sysadminNav = document.getElementById('sysadminNav');
        const branchNav = document.getElementById('branchNav');

        if (sysadminNav) sysadminNav.classList.remove('hidden');
        if (ownerNav) ownerNav.classList.add('hidden');
        if (branchNav) branchNav.classList.add('hidden');

        const elUserRole = document.getElementById('userRole');
        if (elUserRole) elUserRole.textContent = 'System Admin';

        // Render main Sysadmin view smoothly
        if (window.switchView) {
            await window.switchView('sysadmin-users');
        } else if (typeof window.renderSysadminView === 'function') {
            await window.renderSysadminView('sysadmin-users');
        } else {
            window.location.reload();
        }

        showToast('Exited Read-Only Support Mode. Sysadmin session active.', 'success');
    } catch (err) {
        console.error('[Exit Impersonation Error]', err);
    } finally {
        hideLoader();
    }
}

window.exitSysadminImpersonation = exitSysadminImpersonation;

function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

window.sysadminInspectTenant = sysadminInspectTenant;
window.exitSysadminImpersonation = exitSysadminImpersonation;
