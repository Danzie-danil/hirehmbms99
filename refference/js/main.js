
import '../css/index.css';
import './planBadges.js';

import './supabase.js';

import { state } from './state.js';

import * as dbObj from './db.js';

import * as Theme from './theme.js';
import * as Utils from './utils.js';
import * as Auth from './auth.js';
import './modals.js';
import * as Plan from './plan.js';
import './pwa.js';
import { initOfflineSyncEngine } from './offline_queue.js';
import './barcode_scanner.js';
import * as Permissions from './permissions.js';
import { initPremiumTooltips } from './ui/tooltip.js';
import { promptInspectionModeChoice } from './admin/handshake.js';
import { initOwnerHandshakeListener } from './owner/handshakeListener.js';

import { initDashboardView } from './ui/dashboardView.js';
import './aiAssistant.js';
initDashboardView();
initOfflineSyncEngine();
initPremiumTooltips();

if (typeof window.initOwnerHandshakeListener === 'function') {
    setTimeout(() => window.initOwnerHandshakeListener(), 1200);
}

import * as Notifs from './notifications.js';

import './realtime.js';
import './lifecycle.js';

import * as App from './app.js';

import './particles.js';

var lucide = window.lucide;

window.login = Auth.login;
window.setLoginRole = Auth.setLoginRole;
window.togglePasswordVisibility = App.togglePasswordVisibility;
window.toggleResetPassword = Auth.toggleResetPassword;
window.handlePasswordReset = Auth.handlePasswordReset;
window.openSetNewPasswordModal = Auth.openSetNewPasswordModal;
window.handleUpdatePassword = Auth.handleUpdatePassword;
if (typeof Auth.initPasswordRecoveryListener === 'function') {
    Auth.initPasswordRecoveryListener();
}
window.toggleRegistration = Auth.toggleRegistration;
window.register = Auth.register;
window.toggleBranchPinReset = Auth.toggleBranchPinReset;
window.requestPinReset = Auth.requestPinReset;
window.logout = Auth.logout;
window.updateSidebarAvatar = Auth.updateSidebarAvatar;

window.switchView = App.switchView;
window.toggleSidebar = App.toggleSidebar;
window.showNotifications = App.showNotifications;
window.closeNotifications = App.closeNotifications;
window.checkNotifications = App.checkNotifications;
window.approveReset = App.approveReset;
window.denyReset = App.denyReset;

window.toggleTheme = Theme.toggleTheme;

window.openModal = Utils.openModal;
window.closeModal = Utils.closeModal;
window.showToast = Utils.showToast;
window.playSound = Utils.playSound;
window.fmt = Utils.fmt;
window.showLoader = Utils.showLoader;
window.hideLoader = Utils.hideLoader;
window.renderPremiumLoader = Utils.renderPremiumLoader;
window.triggerAppRefresh = Utils.triggerAppRefresh;

window.getPlan = Plan.getPlan;

window.requestNotificationPermission = Permissions.requestNotificationPermission;
window.requestCameraPermission = Permissions.requestCameraPermission;
window.promptAndroidPermissionsIfNeeded = Permissions.promptAndroidPermissionsIfNeeded;
window.hasFeature = Plan.hasFeature;
window.getPlanMaxBranches = Plan.getPlanMaxBranches;
window.checkPlanAccess = Plan.checkPlanAccess;
window.renderOwnerPaywall = Plan.renderOwnerPaywall;
window.renderBranchBillingRequired = Plan.renderBranchBillingRequired;
window.renderFeatureLock = Plan.renderFeatureLock;

for (const key in Utils) {
    if (typeof Utils[key] === 'function') {
        window[key] = Utils[key];
    }
}

window.state = state;
window.supabaseClient = dbObj.supabase;
for (const key in dbObj) {
    if (key.startsWith('db')) {
        window[key] = dbObj[key];
    }
}

const withGlobalButtonLoading = async function(originalFn, ...args) {
    let btn = null;
    if (window.event && window.event.target) {
        btn = window.event.target.closest('button');
    }

    if (!btn || btn.hasAttribute('data-no-loader') || originalFn.name === 'openModal' || originalFn.name === 'openAddSaleModal') {
        const res = originalFn(...args);
        if (res instanceof Promise) return await res;
        return res;
    }

    const originalHtml = btn.innerHTML;
    const originalWidth = btn.offsetWidth;
    const textToUse = btn.innerText.trim() ? 'Opening...' : '';

    if (originalWidth) btn.style.width = originalWidth + 'px';
    btn.disabled = true;
    btn.classList.add('opacity-75', 'cursor-wait');

    btn.innerHTML = `<svg class="animate-spin ${textToUse ? '-ml-1 mr-2' : ''} h-4 w-4 text-current inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>${textToUse ? ' ' + textToUse : ''}`;

    try {
        const res = originalFn(...args);
        if (res instanceof Promise) await res;
        return res;
    } finally {
        if (btn && document.body.contains(btn)) {
            btn.disabled = false;
            btn.classList.remove('opacity-75', 'cursor-wait');
            btn.innerHTML = originalHtml;
            btn.style.width = '';
            if (window.lucide) window.lucide.createIcons();
        }
    }
};

for (const key of Object.getOwnPropertyNames(window)) {
    if (key.startsWith('open') && key.endsWith('Modal')) {
        try {
            const orig = window[key];
            if (typeof orig === 'function') {
                window[key] = function(...args) { return withGlobalButtonLoading(orig, ...args); };
            }
        } catch (e) {}
    }
}
