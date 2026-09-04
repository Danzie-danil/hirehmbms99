
import { dbAuth, dbProfile, dbBranches } from './db.js';
import { state } from './state.js';
import { supabase } from './supabase.js';
import { initSurveyRealtimeListener } from './ui/surveyModal.js';
import { initReleaseNotesCheck } from './ui/releaseNotesModal.js';
import { showLoader, hideLoader, showToast } from './utils.js';

async function checkMaintenanceMode() {
    try {
        const { data, error } = await supabase.from('sys_settings').select('*').eq('key', 'maintenance_mode');
        if (!error && data && data.length > 0) {
            return data[0].value === 'true';
        }
    } catch (e) {
        console.error('[Maintenance] Failed fetching settings from Supabase:', e);
    }
    return false;
}

function showMaintenanceScreen() {
    hideInitialLoader();
    document.getElementById('app')?.classList.add('hidden');
    document.getElementById('loginScreen')?.classList.add('hidden');

    let overlay = document.getElementById('maintenance-screen');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'maintenance-screen';
        overlay.className = 'fixed inset-0 z-[30000] flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0b141a] p-6 text-center select-none';
        overlay.innerHTML = `
            <div class="w-20 h-20 bg-amber-50 dark:bg-amber-900/10 text-amber-500 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-amber-500/10">
                <i data-lucide="wrench" class="w-10 h-10 animate-pulse"></i>
            </div>
            <h1 class="text-3xl font-black text-gray-900 dark:text-white mb-3">Under Maintenance</h1>
            <p class="text-gray-500 dark:text-gray-400 max-w-md text-sm leading-relaxed mb-6">
                We are currently performing scheduled system updates. We will be back online shortly!
            </p>
            <div class="flex items-center gap-3">
                <div class="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/10 px-4 py-1.5 rounded-full">
                    BMS Platform
                </div>
                <button onclick="window.location.reload(true)" class="text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-indigo-600 px-4 py-1.5 rounded-full border border-gray-200 hover:border-indigo-200 transition-all flex items-center gap-1 cursor-pointer">
                    <i data-lucide="refresh-cw" class="w-3 h-3"></i> Retry
                </button>
            </div>
        `;
        document.body.appendChild(overlay);
        if (window.lucide) lucide.createIcons();
    }
}
window.showMaintenanceScreen = showMaintenanceScreen;

function hideMaintenanceScreen() {
    const overlay = document.getElementById('maintenance-screen');
    if (overlay) {
        overlay.classList.add('opacity-0', 'transition-opacity', 'duration-200');
        setTimeout(() => { try { overlay.remove(); } catch(e) {} }, 200);
    }
}
window.hideMaintenanceScreen = hideMaintenanceScreen;

async function checkMaintenanceAndBlock(btn) {
    const isMaintenance = await checkMaintenanceMode();
    if (isMaintenance) {
        hideLoader();
        showMaintenanceScreen();
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="log-in" class="w-5 h-5"></i> Access Dashboard';
            lucide.createIcons();
        }
        return true;
    }
    return false;
}

export async function login() {
    const t0 = Date.now();
    const log = (msg, ...args) => console.log(`[LOGIN +${Date.now()-t0}ms] ${msg}`, ...args);

    log('🟡 login() called');
    const role = document.getElementById('roleSelect').value;
    const btn = document.getElementById('mainLoginBtn') || document.querySelector('button[onclick="login()"]');
    const emailInput = document.getElementById('ownerEmail');
    const email = emailInput ? emailInput.value.trim() : '';
    log(`role=${role}, email=${email}, btn found=${!!btn}`);

    // Sysadmin: runs inline (no reload needed, stays in-place)
    if (window.location.pathname === '/app/systemadmin' || role === 'sysadmin') {
        const passwordInput = document.getElementById('ownerPassword');
        const password = passwordInput ? passwordInput.value : '';
        const keywordInput = document.getElementById('adminKeyword');
        const keyword = keywordInput ? keywordInput.value.trim() : '';
        if (!email || !password || !keyword) {
            showToast('Please enter Email, Password, and Keyword Pass', 'warning');
            return;
        }
        if (btn) { btn.disabled = true; btn.textContent = 'Verifying Admin\u2026'; }
        showLoader('Authenticating System Admin...');
        try {
            const { data, error } = await dbAuth.signIn(email, password);
            if (error) {
                showToast('Invalid System Admin credentials', 'error');
                hideLoader();
                if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
                return;
            }
            const { data: isValid, error: rpcError } = await window.supabaseClient.rpc('verify_sys_admin', { input_keyword: keyword });
            if (rpcError || !isValid) {
                await dbAuth.signOut();
                showToast('Invalid System Admin keyword', 'error');
                hideLoader();
                if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
                return;
            }
            // Keyword is valid. Register this user's email + uid into sys_admins so that
            // is_sys_admin() returns TRUE for all subsequent API calls in this session
            // and all future sessions with the same account.
            await window.supabaseClient.rpc('register_sysadmin_session', { p_keyword: keyword });
        } catch (e) {
            showToast('Authentication error occurred', 'error');
            hideLoader();
            if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
            return;
        }
        // Sysadmin credentials + keyword are valid.
        // Temporarily set state so that initAuth's isSysAdmin branch fires correctly.
        state.role = 'sysadmin';
        state.ownerId = 'sysadmin';
        state.currentUser = email;
        localStorage.setItem('bms_last_role', 'sysadmin');
        localStorage.setItem('bms_last_active_role', 'sysadmin');
        localStorage.setItem('bms_session_start', String(Date.now()));

        hideLoader();
        showToast('Welcome, System Administrator!', 'success');

        // Route the URL then let initAuth handle the full session validation + caching.
        // This ensures the Supabase JWT is properly stored and preserved for all subsequent
        // API calls (banner publish, settings updates, etc.) without getting wiped by the
        // next background revalidation cycle.
        window.history.replaceState({}, document.title, '/app/');
        await initAuth();
        return;
    }


    // Owner: execute in-place without page reload
    if (role === 'owner') {
        const password = document.getElementById('ownerPassword')?.value || '';
        if (!email || !password) {
            showToast('Please enter your email and password', 'warning');
            return;
        }
        log('🔵 role=owner — disabling btn, calling _executePendingLogin...');
        if (btn) { btn.disabled = true; btn.textContent = 'Signing in\u2026'; }
        try {
            await _executePendingLogin({ role: 'owner', email, password });
            log('✅ _executePendingLogin resolved');
        } catch(e) {
            log('❌ _executePendingLogin threw', e);
        } finally {
            log('🔁 finally: re-enabling btn');
            if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
        }
        return;
    }

    // Branch: execute in-place without page reload
    const branchEmail = document.getElementById('branchEmailInput')?.value?.trim() || '';
    const branchPassword = document.getElementById('branchPasswordInput')?.value || '';
    if (!branchEmail || !branchPassword) {
        showToast('Please enter your Manager Email and Password', 'warning');
        return;
    }
    log('🔵 role=branch — disabling btn, calling _executePendingLogin...');
    if (btn) { btn.disabled = true; btn.textContent = 'Verifying\u2026'; }
    try {
        await _executePendingLogin({ role: 'branch', email: branchEmail, password: branchPassword });
        log('✅ _executePendingLogin resolved (branch)');
    } catch(e) {
        log('❌ _executePendingLogin threw (branch)', e);
    } finally {
        log('🔁 finally: re-enabling btn (branch)');
        if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
    }
}

export function toggleRegistration() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const resetForm = document.getElementById('resetPasswordForm');
    const mainLoginBtn = document.getElementById('mainLoginBtn');
    const regToggle = document.getElementById('regToggle');

    resetForm.classList.add('hidden');

    if (loginForm.classList.contains('hidden')) {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        if (mainLoginBtn) mainLoginBtn.classList.remove('hidden');
        if (regToggle) regToggle.classList.remove('hidden');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        if (mainLoginBtn) mainLoginBtn.classList.add('hidden');
        if (regToggle) regToggle.classList.add('hidden');
    }
};

export function toggleResetPassword() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const resetForm = document.getElementById('resetPasswordForm');
    const mainLoginBtn = document.getElementById('mainLoginBtn');
    const regToggle = document.getElementById('regToggle');

    registerForm.classList.add('hidden');

    if (resetForm.classList.contains('hidden')) {
        loginForm.classList.add('hidden');
        resetForm.classList.remove('hidden');
        if (mainLoginBtn) mainLoginBtn.classList.add('hidden');
        if (regToggle) regToggle.classList.add('hidden');
    } else {
        resetForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        if (mainLoginBtn) mainLoginBtn.classList.remove('hidden');
        if (regToggle) regToggle.classList.remove('hidden');
    }
};

export async function handlePasswordReset() {
    const email = document.getElementById('resetEmail').value.trim();
    if (!email) { showToast('Please enter your email', 'warning'); return; }

    const btn = document.querySelector('#resetPasswordForm button');
    const originalText = btn ? btn.textContent : 'Send Reset Link';
    if (btn) {
        btn.textContent = 'Sending...';
        btn.disabled = true;
    }

    showLoader('Sending reset link...');
    try {
        // Invoke Resend Edge Function
        const { data, error } = await supabase.functions.invoke('resend-password-reset', {
            body: { email, origin: window.location.origin }
        });

        if (error || (data && !data.success)) {
            console.warn('[PasswordReset] Edge function error, falling back to Supabase auth:', error || data?.error);
            const { error: fallbackError } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/app/',
            });
            if (fallbackError) throw fallbackError;
        }

        showToast('Password reset link sent! Check your email inbox.', 'success');
        setTimeout(() => toggleResetPassword(), 2000);
    } catch (err) {
        hideLoader();
        console.error('[PasswordReset] Error:', err);
        showToast(err.message || 'Failed to send reset link', 'error');
    } finally {
        hideLoader();
        if (btn) {
            btn.textContent = originalText;
            btn.disabled = false;
        }
    }
}

export function openSetNewPasswordModal() {
    const modalHtml = `
    <div class="p-6 md:p-8 flex flex-col relative">
        <button onclick="closeModal()" class="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <i data-lucide="x" class="w-5 h-5"></i>
        </button>

        <div class="text-center mb-6">
            <div class="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <i data-lucide="key-round" class="w-6 h-6"></i>
            </div>
            <h3 class="text-xl font-black text-gray-900 dark:text-white mb-1">Set New Password</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400">Choose a strong new password for your account.</p>
        </div>

        <form onsubmit="event.preventDefault(); handleUpdatePassword();" class="space-y-4">
            <div>
                <label for="newPassword" class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">New Password</label>
                <input type="password" id="newPassword" required minlength="6" placeholder="At least 6 characters"
                    class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none">
            </div>

            <div>
                <label for="confirmNewPassword" class="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5">Confirm New Password</label>
                <input type="password" id="confirmNewPassword" required minlength="6" placeholder="Re-enter new password"
                    class="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none">
            </div>

            <button type="submit" id="btnUpdatePassword"
                class="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 mt-2">
                <i data-lucide="check-circle" class="w-4 h-4"></i> Update Password
            </button>
        </form>
    </div>
    `;

    openModal(modalHtml);
}

export async function handleUpdatePassword() {
    const password = document.getElementById('newPassword')?.value.trim();
    const confirm = document.getElementById('confirmNewPassword')?.value.trim();
    const btn = document.getElementById('btnUpdatePassword');

    if (!password || password.length < 6) {
        showToast('Password must be at least 6 characters', 'warning');
        return;
    }

    if (password !== confirm) {
        showToast('Passwords do not match', 'warning');
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Updating...`;
        if (window.lucide) window.lucide.createIcons();
    }

    showLoader('Updating password...');

    try {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;

        hideLoader();
        if (typeof closeModal === 'function') closeModal();
        showToast('Password updated successfully! Welcome back.', 'success');

        if (window.location.hash) {
            history.replaceState(null, '', window.location.pathname);
        }
    } catch (err) {
        hideLoader();
        console.error('[UpdatePassword] Error:', err);
        showToast('Failed to update password: ' + err.message, 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i data-lucide="check-circle" class="w-4 h-4"></i> Update Password`;
            if (window.lucide) window.lucide.createIcons();
        }
    }
}

export function initPasswordRecoveryListener() {
    const hash = window.location.hash;
    if (hash && (hash.includes('type=recovery') || (hash.includes('access_token=') && hash.includes('type=recovery')))) {
        console.log('[Auth] Password recovery token detected in URL hash');
        setTimeout(() => {
            openSetNewPasswordModal();
        }, 500);
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('[Auth] Auth state change event:', event);
        if (event === 'SIGNED_IN' && session?.user && state.currentUserUuid && state.currentUserUuid === session.user.id && state.role) {
            console.log('[Auth] Session confirmed on background focus, skipping redundant re-init.');
            return;
        }
        if (event === 'PASSWORD_RECOVERY') {
            openSetNewPasswordModal();
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
            console.log('[Auth] JWT token refreshed successfully. Keeping session active...');
            // Always preserve the logged-in identity regardless of profile re-fetch outcome
            if (session.user.email && !state.currentUser) {
                state.currentUser = session.user.email;
            }
            if (session.user.id && !state.currentUserUuid) {
                state.currentUserUuid = session.user.id;
            }
            // Update sidebar display immediately with verified identity
            const elCurrentUser = document.getElementById('currentUser');
            if (elCurrentUser && session.user.email && state.role !== 'branch') {
                elCurrentUser.textContent = state.currentUser || session.user.email;
            }
            // CRITICAL: Defer profile query out of GoTrue notification chain
            // so _notifyAllSubscribers returns immediately and releases the auth lock.
            // This prevents deadlock across all app queries during token refresh!
            setTimeout(async () => {
                try {
                    if (state.role !== 'sysadmin' && session.user.id) {
                        const fetchFn = (typeof dbProfile !== 'undefined' && dbProfile) ? (dbProfile.fetch || dbProfile.get) : null;
                        if (typeof fetchFn === 'function') {
                            const profile = await fetchFn(session.user.id);
                            if (profile) {
                                state.profile = profile;
                                state.currentUser = session.user.email;
                            }
                        }
                    }
                } catch (e) {
                    console.warn('[Auth] Profile refresh warning (identity preserved):', e);
                }
            }, 0);
        } else if (event === 'SIGNED_OUT') {
            const isExplicitLogout = sessionStorage.getItem('bms_is_logging_out') === 'true';
            if (isExplicitLogout) {
                console.log('[Auth] Explicit user sign out completed.');
                state.profile = null;
                state.currentUser = null;
                state.role = null;
                state.ownerId = null;
                state.branchId = null;
                state.currentUserUuid = null;
            } else {
                console.warn('[Auth] Background SIGNED_OUT event detected without explicit user logout. Preserving active session...');
                const restored = _tryRestoreOfflineSession(null, false);
                if (!restored) {
                    console.log('[Auth] No cached session available, switching to login screen.');
                    state.profile = null;
                    state.currentUser = null;
                    state.role = null;
                    state.ownerId = null;
                    state.branchId = null;
                    state.currentUserUuid = null;
                    document.getElementById('loginScreen')?.classList.remove('hidden');
                    document.getElementById('app')?.classList.add('hidden');
                } else {
                    console.log('[Auth] Successfully preserved active session from cache after background auth event.');
                }
            }
        }
    });
};

export function toggleBranchPinReset() {
    const branchSelector = document.getElementById('branchSelector');
    const resetForm = document.getElementById('branchPinReset');
    const mainLoginBtn = document.getElementById('mainLoginBtn');

    if (resetForm.classList.contains('hidden')) {

        document.getElementById('reqOwnerEmail').value = document.getElementById('branchOwnerEmail').value;
        document.getElementById('reqBranchName').value = document.getElementById('branchNameInput').value;

        branchSelector.classList.add('hidden');
        resetForm.classList.remove('hidden');
        if (mainLoginBtn) mainLoginBtn.classList.add('hidden');
    } else {
        resetForm.classList.add('hidden');
        branchSelector.classList.remove('hidden');
        if (mainLoginBtn) mainLoginBtn.classList.remove('hidden');
    }
};

export async function requestPinReset() {
    const email = document.getElementById('reqOwnerEmail').value.trim();
    const branch = document.getElementById('reqBranchName').value.trim();

    if (!email || !branch) {
        showToast('Please enter Owner Email and Branch Name', 'warning');
        return;
    }

    const btn = document.querySelector('#branchPinReset button');
    const originalText = btn.textContent;
    btn.textContent = 'Sending Request...';
    btn.disabled = true;

    showLoader('Sending Request...');
    try {
        await dbBranches.requestAccess(email, branch);
        showToast('Request sent to owner! They will be notified.', 'success');
        setTimeout(() => toggleBranchPinReset(), 2000);
    } catch (err) {
        hideLoader();
        showToast(err.message, 'error');
    } finally {
        hideLoader();
        btn.textContent = originalText;
        btn.disabled = false;
    }
};

export async function register() {

    try {
        const { data, error } = await supabase.from('sys_settings').select('*').eq('key', 'allow_registrations');
        if (!error && data && data.length > 0 && data[0].value === 'false') {
            showToast('New registrations are currently disabled by the administrator.', 'error');
            return;
        }
    } catch (e) {

    }

    const businessName = document.getElementById('regBusinessName').value.trim();
    const countryCode = document.getElementById('regCountryCode').value;
    const phone = document.getElementById('regPhone').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;

    if (!businessName || !phone || !email || !password) {
        showToast('Please fill in all fields', 'warning');
        return;
    }
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'warning');
        return;
    }

    const btn = document.querySelector('#registerForm button[onclick="register()"]');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Creating Account…';
    }

    showLoader('Creating Account...');
    const fullPhone = countryCode + phone;

    const { data: authData, error: authError } = await dbAuth.signUp(email, password, {
        data: {
            business_name: businessName,
            phone: fullPhone
        },
        emailRedirectTo: window.location.origin + '/app/'
    });

    if (authError) {
        hideLoader();
        showToast(authError.message, 'error');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Create Account';
        }
        return;
    }

    const newOwnerId = authData.user?.id;

    const ownerEmail = email;

    if (newOwnerId) {
        try {
            await dbBranches.add(newOwnerId, {
                name: 'Main Branch',
                location: 'Headquarters',
                manager: 'Owner',
                pin: '000000',
                target: 10000,
                owner_email: ownerEmail
            });

            const planOption = document.getElementById('regPlanOption')?.value || 'free_trial';
            const trialEndsAt = new Date();
            if (planOption === 'skip_trial') {
                trialEndsAt.setTime(0);
            } else {
                trialEndsAt.setDate(trialEndsAt.getDate() + 7);
            }

            await dbProfile.upsert(newOwnerId, {
                full_name: businessName || (ownerEmail ? ownerEmail.split('@')[0] : 'Owner'),
                business_name: businessName,
                mobile_number: fullPhone,
                email: ownerEmail,
                currency: 'TZS',
                plan: 'free_trial',
                trial_ends_at: trialEndsAt.toISOString()
            });

            document.getElementById('regBusinessName').value = '';
            document.getElementById('regPhone').value = '';
            document.getElementById('regEmail').value = '';
            document.getElementById('regPassword').value = '';

            hideLoader();
            showToast('Registration successful! Please check your email to confirm your account.', 'success');

            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Create Account';
            }
            toggleRegistration();

        } catch (err) {
            hideLoader();
            console.error('Auto-provisioning failed:', err);
            showToast(`Branch setup failed: ${err.message}. Please create branch manually.`, 'error');
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Create Account';
            }
        }
    } else {
        showToast('Please check your email to confirm your account.', 'info');
        toggleRegistration();
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Create Account';
        }
    }
};

export async function logout() {
    // Flag explicit logout
    try { sessionStorage.setItem('bms_is_logging_out', 'true'); } catch (e) {}

    // Visual feedback
    if (typeof showToast === 'function') {
        showToast('Signing out...', 'info', 3000);
    }

    document.body.style.pointerEvents = 'none';
    document.body.style.opacity = '0.7';

    const logoutBtns = document.querySelectorAll('[onclick="logout()"]');
    logoutBtns.forEach(btn => {
        btn.innerHTML = `<i data-lucide="loader" class="animate-spin shrink-0" style="width:16px;height:16px;"></i> <span class="hidden sm:inline">Signing out...</span>`;
    });
    if (window.lucide) window.lucide.createIcons();

    window.destroyRealtimeSync?.();
    window.stopSysSettingsPoll?.();

    // Sign out of Supabase — but DO NOT call localStorage.clear().
    // We deliberately preserve Supabase's own sb-* token keys so the JS client
    // doesn't need a full re-initialization on the next page load, making the
    // next signIn() call instant instead of slow.
    try {
        await Promise.race([
            dbAuth.signOut(),
            new Promise(resolve => setTimeout(resolve, 2000))
        ]);
    } catch (e) {
        console.warn('[Auth] Signout notice:', e);
    }

    // Strip URL state
    try {
        if (window.history?.replaceState) {
            window.history.replaceState(null, document.title, window.location.pathname);
        }
        window.location.hash = '';
    } catch (e) {}

    // Reset runtime memory state
    state.role = null;
    state.currentUser = null;
    state.currentUserUuid = null;
    state.ownerId = null;
    state.branchId = null;
    state.profile = null;
    state.branchProfile = null;
    state.viewHistory = [];
    state.activeView = null;

    // Surgically remove only BMS app keys — preserve Supabase sb-* keys
    const BMS_KEYS_TO_CLEAR = [
        'lastOwnerView', 'lastBranchView', 'lastSysadminView',
        'bms_last_active_view', 'bms_last_role', 'bms_last_active_role',
        'bms_last_active_user', 'bms_verified_session', 'bms_session_start',
        'bms_is_logging_out'
    ];
    BMS_KEYS_TO_CLEAR.forEach(k => localStorage.removeItem(k));

    // Also remove any bms_session_* cache keys
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('bms_session_')) keysToRemove.push(k);
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));

    // Clear only BMS sessionStorage entries
    sessionStorage.removeItem('bms_is_logging_out');
    sessionStorage.removeItem('bms_pending_login');

    // Preserve theme across logout
    const currentTheme = localStorage.getItem('bms-theme') || 'light';
    localStorage.setItem('bms-theme', currentTheme);
    document.documentElement.classList.remove('dark');
    if (typeof initTheme === 'function') initTheme('light');

    window.location.reload();
};

export function applyCustomBranding() {
    const hasCustomBranding = (typeof window.hasFeature === 'function' && window.hasFeature('custom_branding')) || !!state.profile?.brand_color || !!state.profile?.logo_url;
    const brandColor = state.profile?.brand_color;
    const logoUrl = state.profile?.logo_url;

    const brandHeader = document.getElementById('sidebarBrandHeader');
    const sidebarLogo = document.getElementById('sidebarBrandLogo');
    const sidebarName = document.getElementById('sidebarBrandName');
    const headerLogoWrap = document.getElementById('headerBrandLogoWrap');
    const headerLogo = document.getElementById('headerBrandLogo');

    if (hasCustomBranding) {
        let cleanHex = (brandColor || '').trim();
        if (cleanHex && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(cleanHex)) {
            if (cleanHex.length === 4) {
                cleanHex = '#' + cleanHex[1] + cleanHex[1] + cleanHex[2] + cleanHex[2] + cleanHex[3] + cleanHex[3];
            }
            const r = parseInt(cleanHex.substring(1, 3), 16);
            const g = parseInt(cleanHex.substring(3, 5), 16);
            const b = parseInt(cleanHex.substring(5, 7), 16);

            document.documentElement.style.setProperty('--brand-color', cleanHex);
            document.documentElement.style.setProperty('--brand-primary', cleanHex);
            document.documentElement.style.setProperty('--brand-hover', `rgba(${r}, ${g}, ${b}, 0.88)`);
            document.documentElement.style.setProperty('--brand-active', `rgba(${r}, ${g}, ${b}, 0.75)`);
            document.documentElement.style.setProperty('--brand-light', `rgba(${r}, ${g}, ${b}, 0.08)`);
            document.documentElement.style.setProperty('--brand-light-hover', `rgba(${r}, ${g}, ${b}, 0.14)`);
            document.documentElement.style.setProperty('--brand-light-border', `rgba(${r}, ${g}, ${b}, 0.25)`);
            document.documentElement.style.setProperty('--brand-shadow', `rgba(${r}, ${g}, ${b}, 0.28)`);

            document.body.classList.add('has-custom-brand');
            document.documentElement.classList.add('has-custom-brand');
        } else {
            document.documentElement.style.removeProperty('--brand-color');
            document.documentElement.style.removeProperty('--brand-primary');
            document.documentElement.style.removeProperty('--brand-hover');
            document.documentElement.style.removeProperty('--brand-active');
            document.documentElement.style.removeProperty('--brand-light');
            document.documentElement.style.removeProperty('--brand-light-hover');
            document.documentElement.style.removeProperty('--brand-light-border');
            document.documentElement.style.removeProperty('--brand-shadow');
            document.body.classList.remove('has-custom-brand');
            document.documentElement.classList.remove('has-custom-brand');
        }

        if (logoUrl) {
            if (sidebarLogo) sidebarLogo.src = logoUrl;
            if (sidebarName) sidebarName.textContent = state.profile?.business_name || state.enterpriseName || '';
            if (brandHeader) {
                brandHeader.classList.remove('hidden');
                brandHeader.classList.add('flex');
            }
            if (headerLogo) headerLogo.src = logoUrl;
            if (headerLogoWrap) {
                headerLogoWrap.classList.remove('hidden');
                headerLogoWrap.classList.add('flex');
            }
        } else {
            if (brandHeader) { brandHeader.classList.add('hidden'); brandHeader.classList.remove('flex'); }
            if (headerLogoWrap) { headerLogoWrap.classList.add('hidden'); headerLogoWrap.classList.remove('flex'); }
        }
    } else {
        document.documentElement.style.removeProperty('--brand-color');
        document.documentElement.style.removeProperty('--brand-primary');
        document.documentElement.style.removeProperty('--brand-hover');
        document.documentElement.style.removeProperty('--brand-active');
        document.documentElement.style.removeProperty('--brand-light');
        document.documentElement.style.removeProperty('--brand-light-hover');
        document.documentElement.style.removeProperty('--brand-light-border');
        document.documentElement.style.removeProperty('--brand-shadow');
        document.body.classList.remove('has-custom-brand');
        document.documentElement.classList.remove('has-custom-brand');
        if (brandHeader) { brandHeader.classList.add('hidden'); brandHeader.classList.remove('flex'); }
        if (headerLogoWrap) { headerLogoWrap.classList.add('hidden'); headerLogoWrap.classList.remove('flex'); }
    }
}
window.applyCustomBranding = applyCustomBranding;

export function setupDashboard(skipViewSwitch = false) {
    applyCustomBranding();

    updateSidebarAvatar();

    window.initRealtimeSync?.();
    window.syncManager?.reconcile?.(false, 'startup_dashboard');
    initSurveyRealtimeListener();
    initReleaseNotesCheck();

    // Start the polling fallback for sys_settings (maintenance mode, banners)
    // for owner and branch users. This guarantees changes propagate even if
    // WebSocket realtime delivery fails.
    if (state.role && state.role !== 'sysadmin') {
        window.startSysSettingsPoll?.();
    }

    // Determine if a modal is presently active in the DOM or pending restoration from sessionStorage.
    // If so, skip applyDashboardRole to prevent a background auth cycle from overriding the user's
    // current view (e.g. Service registration modal being forcefully replaced by the services list).
    const hasPendingModalRestore = !!(
        sessionStorage.getItem('bms_active_modal') ||
        sessionStorage.getItem('bms_active_details_modal') ||
        sessionStorage.getItem('bms_active_stock_ops')
    );
    const shouldSkipRoleView = skipViewSwitch || hasPendingModalRestore;

    if (hasPendingModalRestore && typeof window.restoreActiveDetailsModal === 'function') {
        window.restoreActiveDetailsModal();
    }

    if (!shouldSkipRoleView && state.role && typeof window.applyDashboardRole === 'function') {
        window.applyDashboardRole(state.role);
    }

    // Check if owner account has pending deletion scheduled (Grace Period Reactivation Prompt)
    if (state.role === 'owner' && state.profile?.status === 'deletion_requested') {
        const scheduledFor = state.profile.deletion_scheduled_for;
        if (typeof window.openAccountReactivationModal === 'function') {
            window.openAccountReactivationModal({ scheduledFor });
        }
    }

    // Auto-prompt bottom-right device app download card for web users
    window.checkAndAutoPromptAppDownload?.(2500);
}

export function updateSidebarAvatar() {
    const wrap = document.getElementById('sidebarAvatarWrap');
    if (!wrap) return;

    const isBranch = state.role === 'branch';
    const avatarUrl = isBranch ? state.branchProfile?.avatar_url : (state.profile?.avatar_url || state.profile?.logo_url);

    if (avatarUrl) {
        wrap.innerHTML = `<img src="${avatarUrl}" alt="Profile" class="w-full h-full object-cover rounded-full"
            onerror="this.parentElement.innerHTML='<i data-lucide=\\'user\\' class=\\'w-4 h-4 text-indigo-600\\'></i>'; lucide.createIcons();">`;
    } else {

        const initialStr = isBranch ? (state.branchProfile?.name || state.currentUser || '') : (state.profile?.full_name || state.profile?.business_name || state.currentUser || '');
        const initials = initialStr.charAt(0).toUpperCase();
        wrap.innerHTML = initials
            ? `<span class="text-sm font-black text-indigo-600">${initials}</span>`
            : `<i data-lucide="user" class="w-4 h-4 text-indigo-600"></i>`;
        lucide.createIcons();
    }
};

export function setLoginRole(role) {
    const input = document.getElementById('roleSelect');
    const slider = document.getElementById('roleSlider');
    const btnOwner = document.getElementById('btn-owner');
    const btnBranch = document.getElementById('btn-branch');

    if (input) input.value = role;

    if (role === 'owner') {
        if (slider) slider.style.transform = 'translateX(0)';

        if (btnOwner) {
            btnOwner.className = 'flex-1 relative z-10 py-2 text-xs sm:text-sm font-bold text-center rounded-lg transition-colors duration-200 text-indigo-600 dark:text-indigo-400';
        }

        if (btnBranch) {
            btnBranch.className = 'flex-1 relative z-10 py-2 text-xs sm:text-sm font-medium text-center rounded-lg transition-colors duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200';
        }

        const ownerFields = document.getElementById('ownerFields');
        const branchSelector = document.getElementById('branchSelector');
        const branchPinReset = document.getElementById('branchPinReset');
        const regToggle = document.getElementById('regToggle');

        if (ownerFields) ownerFields.classList.remove('hidden');
        if (branchSelector) branchSelector.classList.add('hidden');
        if (branchPinReset) branchPinReset.classList.add('hidden');
        if (regToggle) regToggle.classList.remove('hidden');
    } else {
        if (slider) slider.style.transform = 'translateX(100%)';

        if (btnBranch) {
            btnBranch.className = 'flex-1 relative z-10 py-2 text-xs sm:text-sm font-bold text-center rounded-lg transition-colors duration-200 text-indigo-600 dark:text-indigo-400';
        }

        if (btnOwner) {
            btnOwner.className = 'flex-1 relative z-10 py-2 text-xs sm:text-sm font-medium text-center rounded-lg transition-colors duration-200 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200';
        }

        const ownerFields = document.getElementById('ownerFields');
        const branchSelector = document.getElementById('branchSelector');
        const branchPinReset = document.getElementById('branchPinReset');
        const regToggle = document.getElementById('regToggle');

        if (ownerFields) ownerFields.classList.add('hidden');
        if (branchSelector) branchSelector.classList.remove('hidden');
        if (branchPinReset) branchPinReset.classList.add('hidden');
        if (regToggle) regToggle.classList.add('hidden');
    }

    if (typeof setupAdminPasscodeListener === 'function') {
        setupAdminPasscodeListener();
    }
};

export function unlockAdminPortalUI() {
    const keywordContainer = document.getElementById('adminKeywordContainer');
    if (keywordContainer) keywordContainer.classList.remove('hidden');

    const ownerFields = document.getElementById('ownerFields');
    if (ownerFields) ownerFields.classList.remove('hidden');

    const branchSelector = document.getElementById('branchSelector');
    if (branchSelector) branchSelector.classList.add('hidden');

    const subtitle = document.querySelector('.login-subtitle');
    if (subtitle) {
        subtitle.textContent = 'System Administration Portal';
        subtitle.classList.remove('text-gray-500');
        subtitle.classList.add('text-indigo-600', 'font-black');
    }

    const roleToggle = document.querySelector('.login-role-toggle');
    if (roleToggle) roleToggle.classList.add('hidden');

    const regToggle = document.getElementById('regToggle');
    if (regToggle) regToggle.classList.add('hidden');

    const roleSelect = document.getElementById('roleSelect');
    if (roleSelect) roleSelect.value = 'sysadmin';

    const adminKeyInput = document.getElementById('adminKeyword');
    if (adminKeyInput) adminKeyInput.value = '';

    document.getElementById('loginScreen')?.classList.remove('hidden');
    document.getElementById('app')?.classList.add('hidden');

    let exitAdminBtn = document.getElementById('exitAdminPortalBtn');
    if (!exitAdminBtn) {
        const form = document.getElementById('loginForm');
        if (form) {
            exitAdminBtn = document.createElement('button');
            exitAdminBtn.id = 'exitAdminPortalBtn';
            exitAdminBtn.type = 'button';
            exitAdminBtn.className = 'w-full mt-2 text-center text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors py-1.5';
            exitAdminBtn.innerHTML = '← Return to standard login';
            exitAdminBtn.onclick = function() {
                if (keywordContainer) keywordContainer.classList.add('hidden');
                if (subtitle) {
                    subtitle.textContent = 'Business & Branch Management';
                    subtitle.classList.remove('text-indigo-600', 'font-black');
                    subtitle.classList.add('text-gray-500');
                }
                if (roleToggle) roleToggle.classList.remove('hidden');
                if (regToggle) regToggle.classList.remove('hidden');
                if (roleSelect) roleSelect.value = 'owner';
                exitAdminBtn.remove();
            };
            form.appendChild(exitAdminBtn);
        }
    }
}

export function setupAdminPasscodeListener() {
    const emailInput = document.getElementById('ownerEmail');
    if (emailInput && !emailInput.dataset.adminPasscodeAttached) {
        emailInput.dataset.adminPasscodeAttached = 'true';
        let debounceTimer = null;

        const verifyCode = async (val) => {
            if (!val || typeof val !== 'string') return;
            const clean = val.trim();
            if (clean.length < 3 || clean.includes('@') || clean.includes('.')) return;

            try {
                const { data: isValid, error } = await supabase.rpc('validate_admin_portal_passcode', { p_code: clean });
                if (!error && isValid === true) {
                    emailInput.value = '';
                    unlockAdminPortalUI();
                    if (typeof showToast === 'function') {
                        showToast('System Administrator Portal Unlocked!', 'success');
                    }
                    const adminKeyInput = document.getElementById('adminKeyword');
                    if (adminKeyInput) adminKeyInput.focus();
                }
            } catch (e) {}
        };

        emailInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            const val = e.target.value;
            debounceTimer = setTimeout(() => verifyCode(val), 300);
        });

        emailInput.addEventListener('change', (e) => {
            verifyCode(e.target.value);
        });
    }

    const logo = document.querySelector('#loginScreen .w-16, #loginScreen img, #loginScreen h1, #loginLogoContainer');
    if (logo && !logo.dataset.tapListenerAttached) {
        logo.dataset.tapListenerAttached = 'true';
        let tapCount = 0;
        let tapTimeout = null;

        logo.addEventListener('click', async () => {
            tapCount++;
            clearTimeout(tapTimeout);
            tapTimeout = setTimeout(() => { tapCount = 0; }, 3000);

            try {
                const { data, error } = await supabase.rpc('validate_admin_portal_access', { 
                    p_taps: tapCount, 
                    p_code: null 
                });

                if (!error && data && data.prompt_passcode === true) {
                    const currentTaps = tapCount;
                    tapCount = 0;
                    const code = prompt('Enter System Admin Passcode:');
                    if (code && code.trim()) {
                        const cleanCode = code.trim();
                        const { data: authResult, error: authError } = await supabase.rpc('validate_admin_portal_access', { 
                            p_taps: currentTaps, 
                            p_code: cleanCode 
                        });
                        if (!authError && authResult && authResult.unlocked === true) {
                            unlockAdminPortalUI();
                            if (typeof showToast === 'function') {
                                showToast('System Administrator Portal Unlocked!', 'success');
                            }
                        } else {
                            if (typeof showToast === 'function') {
                                showToast('Invalid admin passcode', 'error');
                            }
                        }
                    }
                }
            } catch (e) {
                console.error('[Auth] Portal verification error:', e);
            }
        });
    }
}
window.setupAdminPasscodeListener = setupAdminPasscodeListener;
window.unlockAdminPortalUI = unlockAdminPortalUI;

/**
 * Try hydrating the UI immediately from cached verified session (< 50ms)
 * Returns true if an active cached session was restored.
 */
function _tryOptimisticRestore() {
    try {
        if (typeof location !== 'undefined' && location.pathname.includes('/systemadmin')) {
            return false;
        }

        const activeUserId = localStorage.getItem('bms_last_active_user');
        const lastRole = localStorage.getItem('bms_last_role') || localStorage.getItem('bms_last_active_role');

        let cachedRaw = null;
        if (lastRole && ['sysadmin', 'owner', 'branch'].includes(lastRole) && activeUserId) {
            cachedRaw = localStorage.getItem(`bms_session_${lastRole}_${activeUserId}`);
        }
        if (!cachedRaw && activeUserId) {
            const roleOrder = lastRole === 'branch' ? ['branch', 'owner', 'sysadmin'] : (lastRole === 'owner' ? ['owner', 'branch', 'sysadmin'] : ['sysadmin', 'owner', 'branch']);
            for (const r of roleOrder) {
                const candidate = localStorage.getItem(`bms_session_${r}_${activeUserId}`);
                if (candidate) { cachedRaw = candidate; break; }
            }
        }
        if (!cachedRaw) {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('bms_session_')) {
                    if (lastRole === 'branch' && !k.includes('_branch_')) continue;
                    if (lastRole === 'sysadmin' && !k.includes('_sysadmin_')) continue;
                    const val = localStorage.getItem(k);
                    if (val) {
                        try {
                            const parsed = JSON.parse(val);
                            if (parsed && parsed.role) {
                                if (lastRole && parsed.role !== lastRole) continue;
                                cachedRaw = val;
                                break;
                            }
                        } catch (e) {}
                    }
                }
            }
        }

        if (!cachedRaw) return false;
        const cached = JSON.parse(cachedRaw);
        if (!cached.role) return false;

        state.role = cached.role;
        state.ownerId = cached.ownerId || (cached.role === 'sysadmin' ? 'sysadmin' : null);
        state.branchId = cached.branchId || null;
        state.currentUser = cached.currentUser || (cached.role === 'sysadmin' ? 'System Administrator' : '');
        state.currentUserUuid = cached.currentUserUuid || cached.userId || activeUserId;
        if (cached.profile) state.profile = cached.profile;
        if (cached.branches) state.branches = cached.branches;
        if (cached.branchProfile) state.branchProfile = cached.branchProfile;
        if (cached.enterpriseName) state.enterpriseName = cached.enterpriseName;
        if (cached.entitlements) state.entitlements = cached.entitlements;

        try { localStorage.setItem('bms_session_start', String(Date.now())); } catch (e) {}

        if (typeof window.ensureSidebarNavVisible === 'function') {
            window.ensureSidebarNavVisible(cached.role);
        }

        const userTheme = cached.role === 'owner' ? cached.profile?.theme : cached.branchProfile?.theme;
        if (userTheme && typeof initTheme === 'function') initTheme(userTheme);

        document.getElementById('loginScreen')?.classList.add('hidden');
        document.getElementById('app')?.classList.remove('hidden');
        setupDashboard();
        hideLoader();
        hideInitialLoader();
        return true;

    } catch (e) {
        console.warn('[Auth] Optimistic restore warning:', e);
        return false;
    }
}

export async function fetchEffectiveEntitlements(userId) {
    if (!userId) return null;
    try {
        const { data, error } = await supabase.rpc('get_user_effective_entitlements', { p_user_id: userId });
        if (!error && data) {
            state.entitlements = data;
            if (typeof window.saveEntitlementsToIndexedDB === 'function') {
                window.saveEntitlementsToIndexedDB(userId, data);
            }
            return data;
        }
    } catch (e) {
        console.warn('[Auth] Server entitlements fetch warning:', e.message);
    }

    // Fallback: If Supabase failed or timed out, try restoring verified entitlements from IndexedDB
    if (!state.entitlements && typeof window.getEntitlementsFromIndexedDB === 'function') {
        try {
            const cached = await window.getEntitlementsFromIndexedDB(userId);
            if (cached) {
                state.entitlements = cached;
                return cached;
            }
        } catch (idbErr) {
            console.warn('[Auth] IndexedDB fallback warning:', idbErr);
        }
    }
    return state.entitlements || null;
}

// Guard: prevents a second login attempt while one is already in-flight
let _loginInProgress = false;
// Signals that initAuth() has finished its getSession/refreshSession cycle.
// signInWithPassword() must NOT run concurrently with refreshSession() because
// they share an internal Supabase auth lock and will deadlock.
let _authInitDone = false;

async function _executePendingLogin({ role, email, password }) {
    const t0 = Date.now();
    const log = (msg, ...args) => console.log(`[_executePendingLogin +${Date.now()-t0}ms] ${msg}`, ...args);

    log('▶ entered, role=' + role);
    if (_loginInProgress) {
        log('⚠ already in progress — bailing');
        return;
    }
    _loginInProgress = true;

    // Purge any residual/cached role state in memory from previous user on this device
    state.role = null;
    state.currentUser = null;
    state.currentUserUuid = null;
    state.ownerId = null;
    state.branchId = null;
    state.profile = null;
    state.branchProfile = null;

    localStorage.removeItem('bms_verified_session');
    localStorage.removeItem('bms_last_role');
    localStorage.removeItem('bms_last_active_role');

    // Helpers — guarantee UI is always restored on error
    const _done = () => { log('✅ _done called'); hideLoader(); hideInitialLoader(); };
    const _fail = (msg) => {
        log('❌ _fail called:', msg);
        _loginInProgress = false;
        _done();
        showToast(msg, 'error');
        document.getElementById('loginScreen')?.classList.remove('hidden');
        document.getElementById('app')?.classList.add('hidden');
        if (typeof setLoginRole === 'function') setLoginRole(role);
        dbAuth.signOut().catch(() => {});
    };

    try {
        // ── STEP 1: Direct REST call to Supabase — bypasses JS client lock entirely ──
        const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
        const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY;
        log('🌐 STEP 1: firing raw fetch to', `${SUPABASE_URL}/auth/v1/token?grant_type=password`);

        let tokenData;
        try {
            const resp = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON,
                    'Authorization': `Bearer ${SUPABASE_ANON}`
                },
                body: JSON.stringify({ email, password })
            });
            log('📡 fetch() resolved, status=' + resp.status);
            const contentType = resp.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                const rawText = await resp.text().catch(() => '');
                log('❌ Non-JSON auth response:', rawText);
                _fail('Authentication server returned an unexpected response. Please check your credentials.');
                return;
            }
            tokenData = await resp.json();
        } catch (fetchErr) {
            log('❌ fetch threw:', fetchErr);
            _fail('Unable to reach the server. Check your connection and try again.');
            return;
        }

        if (tokenData?.error || tokenData?.error_code || !tokenData?.access_token) {
            const msg = tokenData?.error_description || tokenData?.message || 'Invalid email or password.';
            log('❌ token error:', msg, tokenData);
            _fail('Login failed: ' + msg);
            return;
        }

        const user = tokenData.user;
        if (!user || !user.id) {
            log('❌ invalid user object in tokenData');
            _fail('Login failed: Invalid user profile returned from auth server.');
            return;
        }

        // Hydrate Supabase JS client session synchronously to establish authenticated headers
        log('⚡ Hydrating Supabase client session...');
        try {
            await supabase.auth.setSession({
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token
            });
        } catch (sessionHydrateErr) {
            console.warn('[Auth] setSession hydration notice:', sessionHydrateErr);
        }

        // ── STEP 2: AUTHORITATIVE SERVER-SIDE ROLE VALIDATION BEFORE UNLOCKING UI ──
        log('🔍 Querying database for manager branch role check...');
        let managerBranch = null;
        try {
            managerBranch = await dbBranches.fetchByManager(user.id, user.email);
            log('🏢 managerBranch result:', managerBranch ? managerBranch.name : 'none');
        } catch (e) {
            console.warn('[Auth] Manager branch fetch check warning:', e.message);
        }

        // Server-side RPC validation check with safe error handling
        try {
            const { data: serverRoleRes, error: rpcErr } = await supabase.rpc(
                'validate_user_login_role',
                { p_expected_role: role }
            );
            if (rpcErr) {
                const isExplicitRoleDenial = rpcErr.message && rpcErr.message.includes('Access Denied');
                if (isExplicitRoleDenial) {
                    log('⛔ SERVER-SIDE ROLE DENIAL:', rpcErr.message);
                    dbAuth.signOut().catch(() => {});
                    _fail(rpcErr.message);
                    if (role === 'owner') {
                        if (typeof setLoginRole === 'function') setLoginRole('branch');
                        const branchEmailEl = document.getElementById('branchEmailInput');
                        if (branchEmailEl) branchEmailEl.value = email;
                    } else {
                        if (typeof setLoginRole === 'function') setLoginRole('owner');
                        const ownerEmailEl = document.getElementById('ownerEmail');
                        if (ownerEmailEl) ownerEmailEl.value = email;
                    }
                    return;
                } else {
                    console.warn('[Auth] validate_user_login_role non-blocking warning:', rpcErr.message);
                }
            }
        } catch (rpcCatchErr) {
            console.warn('[Auth] Server-side RPC validate_user_login_role warning:', rpcCatchErr.message);
        }

        const isBranchAccount = (user.user_metadata?.role === 'branch_manager') || 
                                (managerBranch && managerBranch.owner_id !== user.id);

        let ownerProfileCheck = null;
        try {
            ownerProfileCheck = await dbProfile.fetch(user.id);
        } catch (e) {}

        const isOwnerAccount = !!ownerProfileCheck || (!isBranchAccount && !managerBranch);

        // STRICT ENFORCEMENT 1: Owner login ('btn-owner') submitted, but email belongs to a Branch Manager
        if (role === 'owner' && isBranchAccount) {
            log('⛔ STRICT DENIAL: Branch Manager account attempting Business Admin login');
            dbAuth.signOut().catch(() => {});
            _fail('Access Denied: This email belongs to a Branch Manager. Please switch to the Branch Manager login tab.');
            if (typeof setLoginRole === 'function') setLoginRole('branch');
            const branchEmailEl = document.getElementById('branchEmailInput');
            if (branchEmailEl) branchEmailEl.value = email;
            return;
        }

        // STRICT ENFORCEMENT 2: Branch Manager login ('btn-branch') submitted, but email belongs to a Business Owner or has no branch
        if (role === 'branch' && (isOwnerAccount || !managerBranch)) {
            log('⛔ STRICT DENIAL: Business Owner or unassigned account attempting Branch Manager login');
            dbAuth.signOut().catch(() => {});
            _fail('Access Denied: This email belongs to a Business Owner. Please switch to the Business Admin login tab.');
            if (typeof setLoginRole === 'function') setLoginRole('owner');
            const ownerEmailEl = document.getElementById('ownerEmail');
            if (ownerEmailEl) ownerEmailEl.value = email;
            return;
        }

        // ── STEP 3: Role Validation Passed! NOW Unlock UI and Initialize State ──
        log('🚀 STEP 3: Role validated strictly! Unlocking UI & launching app...');
        _loginInProgress = false;
        _done();
        document.getElementById('loginScreen')?.classList.add('hidden');
        document.getElementById('app')?.classList.remove('hidden');

        if (role === 'owner') {
            state.ownerId = user.id;
            state.currentUser = user.email;
            state.currentUserUuid = user.id;
            state.role = 'owner';

            // Immediately write minimal session cache so the app reliably wakes after
            // long hibernation — mirrors the synchronous sysadmin cache pattern.
            // The background .then() below overwrites this with the full profile/branches.
            localStorage.setItem('bms_last_role', 'owner');
            localStorage.setItem('bms_last_active_role', 'owner');
            localStorage.setItem('bms_last_active_user', user.id);
            _cacheVerifiedSession(user.id, 'owner', {
                ownerId: user.id,
                currentUser: user.email,
                currentUserUuid: user.id
            });

            setupDashboard();
            if (typeof window.applyDashboardRole === 'function') window.applyDashboardRole('owner');
            const elUser = document.getElementById('currentUser');
            if (elUser) elUser.textContent = user.email;

            const initialOwnerView = localStorage.getItem('lastOwnerView') || 'overview';
            if (typeof window.switchView === 'function') {
                window.switchView(initialOwnerView, null, true);
            }

            // Background owner hydration
            Promise.allSettled([
                dbProfile.fetch(user.id),
                dbBranches.fetchAll(user.id),
                fetchEffectiveEntitlements(user.id)
            ]).then(([profileRes, branchesRes, entRes]) => {
                let profile = profileRes.status === 'fulfilled' ? profileRes.value : null;
                const verifiedCache = _getVerifiedSession(user.id, 'owner');
                if (!profile) {
                    profile = verifiedCache?.profile || null;
                }
                if (!profile) {
                    state.profile = { 
                        currency: 'TZS', 
                        email: user.email,
                        full_name: user.user_metadata?.first_name || user.user_metadata?.full_name || (user.email ? user.email.split('@')[0] : 'Owner')
                    };
                } else {
                    state.profile = profile;
                    if (profile.preferred_language || profile.language) {
                        const lang = profile.preferred_language || profile.language;
                        if (window.setAppLanguage) window.setAppLanguage(lang);
                    }
                }

                state.branches = branchesRes.status === 'fulfilled' && Array.isArray(branchesRes.value)
                    ? branchesRes.value : [];

                if (entRes.status === 'fulfilled' && entRes.value) {
                    state.entitlements = entRes.value;
                }

                _cacheVerifiedSession(user.id, 'owner', {
                    ownerId: user.id,
                    currentUser: user.email,
                    currentUserUuid: user.id,
                    profile: state.profile,
                    branches: state.branches,
                    entitlements: state.entitlements
                });

                localStorage.setItem('bms_last_role', 'owner');
                localStorage.setItem('bms_session_start', String(Date.now()));
                localStorage.removeItem('lastBranchView');
                localStorage.removeItem('lastSysadminView');
                if (!localStorage.getItem('lastOwnerView')) localStorage.setItem('lastOwnerView', 'overview');

                const theme = state.profile?.theme;
                if (theme && typeof initTheme === 'function') initTheme(theme);

                if (typeof updateSidebarAvatar === 'function') updateSidebarAvatar();
                if (typeof window.updateSubscriptionBadge === 'function') window.updateSubscriptionBadge();
                if (typeof applyCustomBranding === 'function') applyCustomBranding();

                const ownerDisplayName = (typeof window.getOwnerDisplayName === 'function')
                    ? window.getOwnerDisplayName()
                    : ((profile?.full_name && profile.full_name.toLowerCase() !== 'admin' ? profile.full_name : null) || profile?.business_name || (user.email ? user.email.split('@')[0] : 'Owner'));
                const welcomeEl = document.getElementById('ownerOverviewWelcomeHeading');
                if (welcomeEl) {
                    welcomeEl.textContent = `${window.t ? window.t('welcome_back', 'Welcome back') : 'Welcome back'}, ${ownerDisplayName}`;
                }

                showToast(`Welcome back, ${ownerDisplayName}!`, 'success');
            }).catch(e => {
                console.error('[Auth] Background owner hydration error:', e);
                showToast(`Signed in as ${user.email}`, 'success');
            });

        } else {
            // Branch login
            state.branchId = managerBranch.id;
            state.ownerId = managerBranch.owner_id;
            state.currentUser = `${managerBranch.name} (Manager)`;
            state.currentUserUuid = user.id;
            state.role = 'branch';
            state.branchProfile = {
                ...managerBranch,
                branch_code: managerBranch.branch_code || `BR-${managerBranch.id.substring(0, 5).toUpperCase()}`,
                avatar_url: managerBranch.avatar_url || ''
            };
            state.profile = { currency: managerBranch.currency || 'TZS' };

            // Immediately write minimal session cache so the app reliably wakes after
            // long hibernation — mirrors the synchronous sysadmin cache pattern.
            // The background .then() below overwrites this with the full owner profile.
            localStorage.setItem('bms_last_role', 'branch');
            localStorage.setItem('bms_last_active_role', 'branch');
            localStorage.setItem('bms_last_active_user', user.id);
            _cacheVerifiedSession(user.id, 'branch', {
                branchId: managerBranch.id,
                ownerId: managerBranch.owner_id,
                currentUser: state.currentUser,
                currentUserUuid: user.id,
                branchProfile: state.branchProfile,
                profile: state.profile
            });

            setupDashboard();
            if (typeof window.applyDashboardRole === 'function') window.applyDashboardRole('branch');
            const elUser = document.getElementById('currentUser');
            if (elUser) elUser.textContent = state.currentUser;

            Promise.allSettled([
                dbProfile.fetch(managerBranch.owner_id),
                fetchEffectiveEntitlements(user.id)
            ]).then(([profileRes, entRes]) => {
                const ownerProfile = profileRes.status === 'fulfilled' ? profileRes.value : null;
                state.enterpriseName = ownerProfile?.business_name || 'BMS Enterprise';
                state.profile = ownerProfile || { currency: managerBranch.currency || 'TZS' };
                if (managerBranch.currency) state.profile.currency = managerBranch.currency;

                if (entRes.status === 'fulfilled' && entRes.value) state.entitlements = entRes.value;

                _cacheVerifiedSession(user.id, 'branch', {
                    branchId: managerBranch.id,
                    ownerId: managerBranch.owner_id,
                    currentUser: state.currentUser,
                    currentUserUuid: user.id,
                    branchProfile: state.branchProfile,
                    profile: state.profile,
                    entitlements: state.entitlements
                });

                localStorage.setItem('bms_last_role', 'branch');
                localStorage.setItem('bms_session_start', String(Date.now()));
                localStorage.removeItem('lastOwnerView');
                localStorage.removeItem('lastSysadminView');
                if (!localStorage.getItem('lastBranchView')) localStorage.setItem('lastBranchView', 'overview');

                const theme = state.branchProfile?.theme;
                if (theme && typeof initTheme === 'function') initTheme(theme);

                if (typeof updateSidebarAvatar === 'function') updateSidebarAvatar();
                if (typeof window.updateSubscriptionBadge === 'function') window.updateSubscriptionBadge();

                const branchDisplayName = managerBranch.name || state.branchProfile?.name || 'Branch';
                const branchWelcomeEl = document.getElementById('branchDashboardWelcomeHeading');
                if (branchWelcomeEl) {
                    branchWelcomeEl.textContent = `${window.t ? window.t('welcome_back', 'Welcome back') : 'Welcome back'}, ${branchDisplayName}`;
                }

                showToast(`Welcome back, ${branchDisplayName}!`, 'success');
            }).catch(e => {
                console.error('[Auth] Background branch hydration error:', e);
                showToast(`Signed in as ${state.currentUser}`, 'success');
            });
        }
    } catch (err) {
        console.error('[Auth] _executePendingLogin error:', err);
        _fail('Sign-in error: ' + (err.message || 'Please try again.'));
    }
}

export async function initAuth() {
    const isExplicitSysadminRoute = typeof window !== 'undefined' && (
        window.location.pathname === '/app/systemadmin' || 
        window.location.pathname === '/app/systemadmin/' || 
        window.location.pathname.includes('/systemadmin')
    );

    if (isExplicitSysadminRoute) {
        // Enforce manual authentication with Email, Password, and Keyword Pass
        unlockAdminPortalUI();
        state.role = null;
        state.ownerId = null;
        state.profile = null;
        state.branchProfile = null;
        window.destroyRealtimeSync?.();
        window.stopSysSettingsPoll?.();

        document.getElementById('loginScreen')?.classList.remove('hidden');
        document.getElementById('app')?.classList.add('hidden');
        hideLoader();
        hideInitialLoader();
        _authInitDone = true;
        return;
    }

    // 0. PENDING LOGIN PATH: If page was reloaded immediately on Sign In click, execute auth now on fresh page
    const pendingLoginRaw = sessionStorage.getItem('bms_pending_login');
    if (pendingLoginRaw) {
        sessionStorage.removeItem('bms_pending_login');
        try {
            const pendingLogin = JSON.parse(pendingLoginRaw);
            if (pendingLogin && pendingLogin.email && pendingLogin.password) {
                await _executePendingLogin(pendingLogin);
                return;
            }
        } catch (e) {
            console.error('[Auth] Error parsing pending login:', e);
        }
    }

    const lastRole = localStorage.getItem('bms_last_role');

    // 0. OFFLINE / AIRPLANE FAST PATH: Immediately restore verified offline session with zero network delay
    if (!navigator.onLine) {
        console.log('[Auth] Device is offline/airplane mode. Hydrating directly from verified local cache...');
        if (_tryOptimisticRestore() || _tryRestoreOfflineSession(null, true)) {
            _authInitDone = true;
            hideLoader();
            hideInitialLoader();
            return;
        }
    }

    // 1. FAST PATH: Optimistically hydrate state in memory from verified local cache
    const hadOptimisticRestore = _tryOptimisticRestore();

    // 2. Fetch authenticated session with a fail-safe timeout (6.0s)
    let sessionResult = null;
    try {
        sessionResult = await Promise.race([
            dbAuth.getSession(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Session fetch timeout')), 6000))
        ]);
    } catch (e) {
        _authInitDone = true; // Release sign-in wait before showing login/error UI
        if (hadOptimisticRestore || _tryRestoreOfflineSession(null, true)) {
            console.log('[Auth] Kept persistent cached session during connection wait/sleep/offline.');
            hideLoader();
            hideInitialLoader();
            return;
        }
        if (!navigator.onLine) {
            console.log('[Auth] Network offline during session fetch. Keeping offline UI intact.');
            hideLoader();
            hideInitialLoader();
            return;
        }
        console.warn('[Auth] dbAuth.getSession background timeout or error:', e.message);
        _showFatalAuthError('Unable to reach authentication server. Please check your connection.');
        return;
    }


    let session = sessionResult?.data?.session || null;

    // 3. If session is null/expired, attempt proactive token refresh before giving up
    if (!session || !session.user) {
        try {
            const refreshRes = await Promise.race([
                supabase.auth.refreshSession(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('refresh_timeout')), 3500))
            ]);
            if (refreshRes?.data?.session?.user) {
                session = refreshRes.data.session;
                console.log('[Auth] Refreshed expired session token successfully.');
            }
        } catch (e) {
            console.warn('[Auth] Background session refresh notice:', e.message);
        }
    }

    // 4. No session on backend -> check offline/cached verified session
    if (!session || !session.user) {
        const lastRole = localStorage.getItem('bms_last_role') || state.role;

        // If a verified cached session is available (for owner, branch, etc.), keep it active!
        // This prevents wiping state.ownerId / state.role on momentary device sleep/wake reconnect delays or offline state.
        if (hadOptimisticRestore || _tryRestoreOfflineSession(null, true)) {
            console.log('[Auth] Kept persistent verified session active on sleep/resume or network reconnect.');
            _authInitDone = true;
            hideLoader();
            hideInitialLoader();
            return;
        }

        // Truly unauthenticated (no cached session found) -> show login screen
        console.warn('[Auth] No active backend or cached session found. Showing login screen.');
        state.profile = null;
        state.branchProfile = null;
        state.ownerId = null;
        state.branchId = null;
        state.role = null;
        window.destroyRealtimeSync?.();
        window.stopSysSettingsPoll?.();

        document.getElementById('loginScreen')?.classList.remove('hidden');
        document.getElementById('app')?.classList.add('hidden');
        if (typeof setLoginRole === 'function') {
            setLoginRole(lastRole || 'owner');
        }
        setupAdminPasscodeListener();
        _authInitDone = true;
        hideLoader();
        hideInitialLoader();
        return;
    }

    // 5. Session exists: Run Consolidated Parallel Revalidation in ONE single batch
    try {
        const [
            sysAdminRes,
            settingsRes,
            maintRes,
            managerBranchRes,
            profileRes,
            branchesRes,
            entitlementsRes
        ] = await Promise.allSettled([
            supabase.rpc('is_sys_admin'),
            supabase.from('sys_settings').select('value').eq('key', 'allow_registrations').single(),
            supabase.from('sys_settings').select('value').eq('key', 'maintenance_mode').single(),
            dbBranches.fetchByManager(session.user.id),
            dbProfile.fetch(session.user.id),
            dbBranches.fetchAll(session.user.id),
            supabase.rpc('get_user_effective_entitlements', { p_user_id: session.user.id })
        ]);

        if (entitlementsRes.status === 'fulfilled' && entitlementsRes.value?.data) {
            state.entitlements = entitlementsRes.value.data;
        }

        // Maintenance Mode Check
        const isMaintenance = maintRes.status === 'fulfilled' && maintRes.value?.data?.value === 'true';
        if (isMaintenance) {
            showMaintenanceScreen();
            return;
        }

        // Registration Setting Check
        if (settingsRes.status === 'fulfilled' && settingsRes.value?.data?.value === 'false') {
            const regToggle = document.getElementById('regToggle');
            if (regToggle) regToggle.classList.add('hidden');
        }

        const lastRole = localStorage.getItem('bms_last_role') || localStorage.getItem('bms_last_active_role');
        const cachedSysadmin = _getVerifiedSession(session.user.id, 'sysadmin');
        const isSysAdmin = (sysAdminRes.status === 'fulfilled' && sysAdminRes.value?.data === true) ||
                           (entitlementsRes.status === 'fulfilled' && entitlementsRes.value?.data?.role === 'sysadmin') ||
                           (lastRole === 'sysadmin' && cachedSysadmin !== null);
        let branchCandidate = managerBranchRes.status === 'fulfilled' ? managerBranchRes.value : null;
        if (!branchCandidate) {
            const cachedBranch = _getVerifiedSession(session.user.id, 'branch');
            if (cachedBranch?.branchProfile) {
                branchCandidate = cachedBranch.branchProfile;
            } else if (lastRole === 'branch') {
                branchCandidate = await dbBranches.fetchByManager(session.user.id, session.user.email);
            }
        }
        const branch = (branchCandidate && branchCandidate.owner_id !== session.user.id) || (lastRole === 'branch' && branchCandidate) ? branchCandidate : null;

        if (isSysAdmin) {
            state.ownerId = 'sysadmin';
            state.currentUser = session.user.email;
            state.currentUserUuid = session.user.id;
            state.role = 'sysadmin';
            localStorage.setItem('bms_last_role', 'sysadmin');
            localStorage.setItem('bms_last_active_role', 'sysadmin');
            localStorage.setItem('bms_session_start', String(Date.now()));
            _cacheVerifiedSession(session.user.id, 'sysadmin', {
                ownerId: 'sysadmin',
                currentUser: session.user.email,
                currentUserUuid: session.user.id,
                entitlements: state.entitlements
            });

            document.getElementById('loginScreen')?.classList.add('hidden');
            document.getElementById('app')?.classList.remove('hidden');
            setupDashboard(hadOptimisticRestore);
            if (typeof window.applyDashboardRole === 'function' && !hadOptimisticRestore) {
                window.applyDashboardRole('sysadmin');
            }
            hideLoader();
            hideInitialLoader();
            return;
        }

        if (branch || (lastRole === 'branch' && !isSysAdmin)) {
            const cachedBranch = _getVerifiedSession(session.user.id, 'branch');
            state.branchId = branch?.id || cachedBranch?.branchId || null;
            state.ownerId = branch?.owner_id || cachedBranch?.ownerId || null;
            state.currentUser = branch?.name ? `${branch.name} (Manager)` : (cachedBranch?.currentUser || `${session.user.email}`);
            state.currentUserUuid = session.user.id;
            state.branchProfile = branch ? { ...branch, branch_code: branch.branch_code || `BR-${branch.id?.substring(0, 5).toUpperCase()}` } : (cachedBranch?.branchProfile || null);

            let ownerProfile = null;
            try {
                if (state.ownerId) ownerProfile = await dbProfile.fetch(state.ownerId);
            } catch (e) {}
            if (!ownerProfile && cachedBranch?.profile) {
                ownerProfile = cachedBranch.profile;
            }
            state.enterpriseName = ownerProfile?.business_name || cachedBranch?.enterpriseName || 'BMS Enterprise';
            state.profile = ownerProfile || cachedBranch?.profile || { currency: state.branchProfile?.currency || 'USD' };
            if (state.branchProfile?.currency) {
                state.profile.currency = state.branchProfile.currency;
            }

            if (ownerProfile?.status === 'deletion_requested' || state.branchProfile?.is_active === false) {
                showToast('This business account is scheduled for deletion by the owner. Branch access is paused.', 'error');
                hideLoader();
                hideInitialLoader();
                document.getElementById('loginScreen')?.classList.remove('hidden');
                document.getElementById('app')?.classList.add('hidden');
                return;
            }

            state.role = 'branch';
            localStorage.setItem('bms_last_role', 'branch');
            localStorage.setItem('bms_last_active_role', 'branch');
            _cacheVerifiedSession(session.user.id, 'branch', {
                branchId: state.branchId,
                ownerId: state.ownerId,
                currentUser: state.currentUser,
                currentUserUuid: session.user.id,
                branchProfile: state.branchProfile,
                profile: state.profile,
                enterpriseName: state.enterpriseName,
                entitlements: state.entitlements
            });
        } else {

            const ownerId = session.user.id;
            state.ownerId = ownerId;
            state.currentUser = session.user.email;
            state.currentUserUuid = session.user.id;

            let profile = profileRes.status === 'fulfilled' ? profileRes.value : null;
            const verifiedCache = _getVerifiedSession(ownerId, 'owner');
            if (!profile && verifiedCache?.profile) {
                profile = verifiedCache.profile;
            }
            if (!profile) {
                state.profile = { 
                    currency: 'TZS', 
                    email: session.user.email,
                    full_name: session.user.user_metadata?.first_name || session.user.user_metadata?.full_name || (session.user.email ? session.user.email.split('@')[0] : 'Owner')
                };
            } else {
                state.profile = profile;
            }

            state.branches = branchesRes.status === 'fulfilled' && Array.isArray(branchesRes.value) ? branchesRes.value : (state.branches || []);
            state.role = 'owner';
            localStorage.setItem('bms_last_role', 'owner');
            localStorage.setItem('bms_last_active_role', 'owner');
            _cacheVerifiedSession(session.user.id, 'owner', {
                ownerId: session.user.id,
                currentUser: session.user.email,
                currentUserUuid: session.user.id,
                profile: state.profile,
                branches: state.branches,
                entitlements: state.entitlements
            });
        }

        const userTheme = state.role === 'owner' ? state.profile?.theme : state.branchProfile?.theme;
        if (userTheme && typeof initTheme === 'function') initTheme(userTheme);

        document.getElementById('loginScreen')?.classList.add('hidden');
        document.getElementById('app')?.classList.remove('hidden');
        setupDashboard(hadOptimisticRestore);
        // Only invoke applyDashboardRole when this is a fresh login (not an optimistic refresh revalidation).
        // Skip it when a details modal or stock operations page is currently active — that background
        // revalidation cycle must not stomp on the user's open modal by navigating back to the base view.
        const _hasPendingRestore = !!(
            sessionStorage.getItem('bms_active_details_modal') ||
            sessionStorage.getItem('bms_active_stock_ops')
        );
        const _hasModalInDom = !!(
            document.getElementById('mainContent')?.querySelector('.modal-top-nav')
        );
        if (typeof window.applyDashboardRole === 'function' && !hadOptimisticRestore && !_hasPendingRestore && !_hasModalInDom) {
            window.applyDashboardRole(state.role);
        }

        const elCurrentUser = document.getElementById('currentUser');
        if (elCurrentUser && state.currentUser) {
            elCurrentUser.textContent = state.currentUser;
        }
        if (typeof updateSidebarAvatar === 'function') updateSidebarAvatar();
        if (typeof window.updateSubscriptionBadge === 'function') window.updateSubscriptionBadge();
        hideLoader();
        hideInitialLoader();
    } catch (err) {
        console.error('[Auth] Background revalidation error:', err);
        hideLoader();
        if (!hadOptimisticRestore && !_tryRestoreOfflineSession(null, true) && navigator.onLine) {
            _showFatalAuthError('Unable to verify account authorization. Please check your connection.');
        }
    } finally {
        _authInitDone = true; // Always release the sign-in wait, whatever happened
        // Always ensure global loader is hidden after auth resolves
        hideLoader();
        // Schedule follow-up background check if initial run was optimistic
        if (hadOptimisticRestore) {
            setTimeout(() => revalidateSessionAndEntitlements(), 1500);
        }
    }
}

/**
 * Revalidates user session, profile, and server entitlements in the background.
 * Authoritatively reconciles cross-device subscription changes (e.g. Exclusive upgrades).
 */
export async function revalidateSessionAndEntitlements(force = false) {
    if (!navigator.onLine) return false;
    try {
        let { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
        if (sessionErr || !sessionData?.session?.user) {
            // Access token may have expired during long hibernation — silently attempt
            // a token refresh before giving up. Sysadmin is unaffected; owner and branch
            // need this to re-hydrate correctly on wake without forcing a logout.
            try {
                const { data: refreshed, error: refreshErr } = await supabase.auth.refreshSession();
                if (!refreshErr && refreshed?.session?.user) {
                    sessionData = refreshed;
                } else {
                    return false;
                }
            } catch (_refreshEx) {
                return false;
            }
        }

        const user = sessionData.session.user;
        const targetUserId = user.id;

        const [profileRes, entitlementsRes, branchesRes] = await Promise.allSettled([
            state.role === 'branch' && state.ownerId ? dbProfile.fetch(state.ownerId) : dbProfile.fetch(targetUserId),
            supabase.rpc('get_user_effective_entitlements', { p_user_id: targetUserId }),
            state.role === 'owner' ? dbBranches.fetchAll(targetUserId) : Promise.resolve(null)
        ]);

        let hasStateChanged = false;

        if (entitlementsRes.status === 'fulfilled' && entitlementsRes.value?.data) {
            const freshEntitlements = entitlementsRes.value.data;
            const prevPlan = state.entitlements?.plan_id;
            const newPlan = freshEntitlements?.plan_id;
            if (JSON.stringify(state.entitlements) !== JSON.stringify(freshEntitlements)) {
                state.entitlements = freshEntitlements;
                hasStateChanged = true;
                if (prevPlan !== newPlan) {
                    console.log(`[Auth] Plan updated across devices: ${prevPlan || 'none'} -> ${newPlan}`);
                }
            }
        }

        if (profileRes.status === 'fulfilled' && profileRes.value) {
            const freshProfile = profileRes.value;
            if (JSON.stringify(state.profile) !== JSON.stringify(freshProfile)) {
                state.profile = freshProfile;
                hasStateChanged = true;
            }
        }

        if (branchesRes.status === 'fulfilled' && Array.isArray(branchesRes.value)) {
            state.branches = branchesRes.value;
        }

        if (hasStateChanged || force) {
            // Update local cached session
            if (state.role === 'owner') {
                _cacheVerifiedSession(targetUserId, 'owner', {
                    ownerId: targetUserId,
                    currentUser: user.email,
                    currentUserUuid: targetUserId,
                    profile: state.profile,
                    branches: state.branches,
                    entitlements: state.entitlements
                });
            } else if (state.role === 'branch') {
                _cacheVerifiedSession(targetUserId, 'branch', {
                    branchId: state.branchId,
                    ownerId: state.ownerId,
                    currentUser: state.currentUser,
                    currentUserUuid: targetUserId,
                    branchProfile: state.branchProfile,
                    profile: state.profile,
                    enterpriseName: state.enterpriseName,
                    entitlements: state.entitlements
                });
            }

            if (typeof window.updateSubscriptionBadge === 'function') {
                window.updateSubscriptionBadge();
            }
            if (typeof window.updateSidebarAvatar === 'function') {
                window.updateSidebarAvatar();
            }

            // If owner was seeing paywall but is now paid/exclusive, refresh active view
            if (state.role === 'owner' && typeof window.checkPlanAccess === 'function') {
                const plan = window.checkPlanAccess();
                const mainContent = document.getElementById('mainContent');
                const isPaywalledInDom = mainContent && mainContent.textContent.includes('Unlock Full BMS Access');
                if (!plan.isExpired && isPaywalledInDom && typeof window.switchView === 'function') {
                    const currentView = localStorage.getItem('lastOwnerView') || 'overview';
                    window.switchView(currentView);
                }
            }
        }
        return true;
    } catch (e) {
        console.warn('[Auth] revalidateSessionAndEntitlements warning:', e.message);
        return false;
    }
}
window.revalidateSessionAndEntitlements = revalidateSessionAndEntitlements;

function _showFatalAuthError(message) {
    document.getElementById('loginScreen')?.classList.remove('hidden');
    document.getElementById('app')?.classList.add('hidden');
    hideInitialLoader();
    if (typeof showToast === 'function') {
        showToast(message, 'error');
    }
}

/**
 * Save verified session data scoped strictly by User ID and Role.
 * Stores under `bms_session_${role}_${userId}`.
 */
function _cacheVerifiedSession(userId, role, sessionData) {
    if (!userId || !role) return;
    try {
        const cacheKey = `bms_session_${role}_${userId}`;
        localStorage.setItem(cacheKey, JSON.stringify({
            userId,
            role,
            ...sessionData,
            cachedAt: Date.now()
        }));
        localStorage.setItem('bms_last_active_user', userId);
        localStorage.setItem('bms_last_active_role', role);
    } catch (e) {
        console.error('[Auth] Failed to cache session offline:', e);
    }
}

/**
 * Retrieve verified session data scoped by User ID and Role.
 */
function _getVerifiedSession(userId, role) {
    if (!userId || !role) return null;
    try {
        const raw = localStorage.getItem(`bms_session_${role}_${userId}`);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}

/**
 * Restore offline session strictly matching the active session token's User ID and Role.
 * When shouldReRenderUI is false, it only restores memory state and updates sidebar DOM
 * without wiping/re-rendering the active view.
 */
export function _tryRestoreOfflineSession(session = null, shouldReRenderUI = true) {
    try {
        const activeUserId = session?.user?.id || localStorage.getItem('bms_last_active_user');

        const lastRole = localStorage.getItem('bms_last_role') || localStorage.getItem('bms_last_active_role');

        let cacheKey = null;
        if (lastRole && ['sysadmin', 'owner', 'branch'].includes(lastRole) && activeUserId) {
            cacheKey = `bms_session_${lastRole}_${activeUserId}`;
        }

        let cachedRaw = cacheKey ? localStorage.getItem(cacheKey) : null;

        if (!cachedRaw && activeUserId) {
            const roleOrder = lastRole === 'branch' ? ['branch', 'owner', 'sysadmin'] : (lastRole === 'owner' ? ['owner', 'branch', 'sysadmin'] : ['branch', 'owner', 'sysadmin']);
            for (const r of roleOrder) {
                const candidate = localStorage.getItem(`bms_session_${r}_${activeUserId}`);
                if (candidate) {
                    cachedRaw = candidate;
                    break;
                }
            }
        }

        if (!cachedRaw) {
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('bms_session_')) {
                    if (lastRole === 'branch' && !k.includes('_branch_')) continue;
                    const val = localStorage.getItem(k);
                    if (val) {
                        try {
                            const parsed = JSON.parse(val);
                            if (parsed && parsed.role) {
                                if (lastRole && parsed.role !== lastRole) continue;
                                cachedRaw = val;
                                break;
                            }
                        } catch (e) {}
                    }
                }
            }
        }


        if (!cachedRaw) return false;
        const cached = JSON.parse(cachedRaw);

        state.role = cached.role;
        state.ownerId = cached.ownerId || null;
        state.branchId = cached.branchId || null;
        state.currentUser = cached.currentUser || 'Active User';
        state.currentUserUuid = cached.currentUserUuid || cached.userId || activeUserId;

        if (cached.entitlements) {
            state.entitlements = cached.entitlements;
        }

        if (cached.role === 'sysadmin') {
            state.ownerId = 'sysadmin';
        } else if (cached.role === 'branch') {
            state.branchProfile = cached.branchProfile || null;
            state.profile = cached.profile || { currency: 'USD' };
        } else if (cached.role === 'owner') {
            state.profile = cached.profile || null;
            state.branches = cached.branches || [];
        }

        state.role = cached.role;
        try { localStorage.setItem('bms_session_start', String(Date.now())); } catch (e) {}

        if (typeof window.ensureSidebarNavVisible === 'function') {
            window.ensureSidebarNavVisible(cached.role);
        }


        const elCurrentUser = document.getElementById('currentUser');
        if (elCurrentUser && state.currentUser) {
            elCurrentUser.textContent = state.currentUser;
        }
        if (typeof updateSidebarAvatar === 'function') updateSidebarAvatar();
        applyCustomBranding();

        if (shouldReRenderUI) {
            document.getElementById('loginScreen')?.classList.add('hidden');
            document.getElementById('app')?.classList.remove('hidden');
            setupDashboard();
            const _offHasPending = !!(
                sessionStorage.getItem('bms_active_details_modal') ||
                sessionStorage.getItem('bms_active_stock_ops')
            );
            const _offHasModal = !!(document.getElementById('mainContent')?.querySelector('.modal-top-nav'));
            if (typeof window.applyDashboardRole === 'function' && !_offHasPending && !_offHasModal) {
                window.applyDashboardRole(cached.role);
            }
            hideInitialLoader();
        }
        return true;
    } catch (e) {
        console.error('[Auth] Error restoring offline session:', e);
        return false;
    }
}
export const tryRestoreOfflineSession = _tryRestoreOfflineSession;
window._tryRestoreOfflineSession = _tryRestoreOfflineSession;

function _isNetworkError(error) {
    if (!error) return false;
    const msg = (error.message || String(error)).toLowerCase();
    return msg.includes('fetch') || msg.includes('network') || msg.includes('failed to fetch') || msg.includes('offline');
}

export function hideInitialLoader() {
    const initialLoader = document.getElementById('initial-loader');
    if (initialLoader) {
        initialLoader.classList.add('fade-out');
        setTimeout(() => initialLoader.remove(), 500);
    }
};

function _authInit() {
    setupAdminPasscodeListener();
    initAuth().finally(() => {
        setupAdminPasscodeListener();
        hideLoader();
        hideInitialLoader();
    });
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _authInit);
} else {
    _authInit();
}

let _lastSessionCheckTime = 0;
async function _checkAndRefreshSessionIfStale() {
    const now = Date.now();
    // Throttle validation to at most once every 45s
    if (now - _lastSessionCheckTime < 45000) return;
    _lastSessionCheckTime = now;

    if (!navigator.onLine || !state.role) return;

    try {
        const { data } = await supabase.auth.getSession();
        const session = data?.session;
        if (session) {
            const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
            // If token expires within 5 minutes or is expired, refresh proactively
            if (expiresAt && (expiresAt - now < 300000)) {
                await supabase.auth.refreshSession();
                console.log('[Auth] Proactively refreshed expiring session token on device resume.');
            }
        }
    } catch (err) {
        console.warn('[Auth] Background session resume check note:', err.message);
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            _checkAndRefreshSessionIfStale();
        }
    });
    window.addEventListener('focus', () => {
        _checkAndRefreshSessionIfStale();
    });
}
