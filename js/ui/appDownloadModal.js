// ── Device-Based Native App & PWA Floating Download Prompt Engine (Bottom-Right Non-Blocking) ──
import { iconBase64 } from '../logoBase64.js';

export function getDevicePlatform() {
    if (typeof window === 'undefined') return 'unknown';
    const ua = (navigator.userAgent || navigator.vendor || window.opera || '').toLowerCase();
    const platform = (navigator.platform || '').toLowerCase();

    if (/iphone|ipad|ipod/.test(ua) || (platform.includes('mac') && navigator.maxTouchPoints > 1)) {
        return 'ios';
    }
    if (/android/.test(ua)) {
        return 'android';
    }
    if (/windows|win32|win64/.test(ua) || /win/.test(platform)) {
        return 'windows';
    }
    if (/macintosh|mac os x/.test(ua) || /mac/.test(platform)) {
        return 'mac';
    }
    if (/linux/.test(ua) || /linux/.test(platform)) {
        return 'linux';
    }
    return 'desktop';
}

export function isStandaloneMode() {
    if (typeof window === 'undefined') return false;
    const isStandalone = window.matchMedia && (
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches
    );
    const isIosStandalone = ('standalone' in window.navigator) && Boolean(window.navigator.standalone);
    const isAndroidReferrer = Boolean(document.referrer && (
        document.referrer.includes('android-app://') ||
        document.referrer.includes('org.chromium.webapk')
    ));
    const isPwaStored = localStorage.getItem('bms_pwa_installed') === 'true';
    return Boolean(isStandalone || isIosStandalone || isAndroidReferrer || isPwaStored);
}

function removeExistingDownloadModal() {
    const existing = document.getElementById('bms-device-download-modal');
    if (existing) existing.remove();
}

function recordDismissal(permanent = false) {
    sessionStorage.setItem('bms_app_download_prompt_shown', 'true');
    if (permanent) {
        localStorage.setItem('bms_app_download_prompt_dismissed', 'true');
    }
}

/**
 * Universal Entrypoint: Opens the appropriate bottom-right floating card based on current device
 */
export function showDeviceAppModal(options = {}) {
    const p = getDevicePlatform();
    if (p === 'android') {
        return showAndroidDownloadModal(options);
    } else if (p === 'ios') {
        return showIosInstallModal(options);
    } else {
        return showDesktopDownloadModal(options);
    }
}

/**
 * Windows / Desktop Floating Download Card (Bottom-Right Non-Blocking)
 */
export function showDesktopDownloadModal(options = {}) {
    removeExistingDownloadModal();

    const toast = document.createElement('div');
    toast.id = 'bms-device-download-modal';
    toast.className = 'fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[99999] w-[calc(100%-2rem)] sm:w-[380px] max-w-sm pointer-events-auto transition-all duration-300 ease-out transform translate-y-6 opacity-0';

    toast.innerHTML = `
    <div class="bg-white/95 dark:bg-[#111c24]/95 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.16)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] p-4 sm:p-4.5 flex flex-col gap-3 relative">
        <!-- Top Row: Icon, Title, and Close -->
        <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-xl bg-[#475B6E]/10 dark:bg-white/10 text-[#475B6E] dark:text-indigo-300 flex items-center justify-center shrink-0 border border-[#475B6E]/15 dark:border-white/10">
                    <i data-lucide="monitor" class="w-5 h-5"></i>
                </div>
                <div class="min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <h3 class="text-xs sm:text-sm font-black text-gray-900 dark:text-white truncate">Install Desktop App</h3>
                        <span class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                            .MSI • 33MB
                        </span>
                    </div>
                    <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                        Offline POS ledger & direct receipt printing
                    </p>
                </div>
            </div>
            <button id="closeDownloadModalBtn" type="button" class="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors shrink-0">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        </div>

        <!-- Action Row -->
        <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-white/5">
            <button id="btnDontShowAgain" type="button" class="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium transition-colors cursor-pointer">
                Don't show again
            </button>
            <div class="flex items-center gap-1.5">
                <button id="btnRemindLater" type="button" class="px-2.5 py-1.5 text-[11px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                    Later
                </button>
                <a id="btnDownloadExe" href="https://pub-5f77889b51404f04a57b3a83e611a3fc.r2.dev/BMSTz-Setup.exe" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 bg-[#475B6E] hover:bg-[#394958] text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95">
                    <i data-lucide="download" class="w-3.5 h-3.5"></i>
                    <span>.EXE</span>
                </a>
                <a id="btnDownloadMsi" href="https://pub-5f77889b51404f04a57b3a83e611a3fc.r2.dev/BMSTz-Setup.msi" target="_blank" rel="noopener noreferrer" class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95">
                    <i data-lucide="download" class="w-3.5 h-3.5"></i>
                    <span>.MSI</span>
                </a>
            </div>
        </div>
    </div>
    `;

    document.body.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-6', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    });

    const closeToast = () => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-6', 'opacity-0');
        setTimeout(() => toast.remove(), 250);
    };

    toast.querySelector('#closeDownloadModalBtn')?.addEventListener('click', () => {
        recordDismissal(false);
        closeToast();
    });
    toast.querySelector('#btnRemindLater')?.addEventListener('click', () => {
        recordDismissal(false);
        closeToast();
    });
    toast.querySelector('#btnDontShowAgain')?.addEventListener('click', () => {
        recordDismissal(true);
        closeToast();
    });
    toast.querySelector('#btnDownloadExe')?.addEventListener('click', () => {
        recordDismissal(true);
        setTimeout(closeToast, 1200);
    });
    toast.querySelector('#btnDownloadMsi')?.addEventListener('click', () => {
        recordDismissal(true);
        setTimeout(closeToast, 1200);
    });
}

/**
 * Android Floating Download Card (Bottom-Right Non-Blocking)
 */
export function showAndroidDownloadModal(options = {}) {
    removeExistingDownloadModal();

    const toast = document.createElement('div');
    toast.id = 'bms-device-download-modal';
    toast.className = 'fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[99999] w-[calc(100%-2rem)] sm:w-[380px] max-w-sm pointer-events-auto transition-all duration-300 ease-out transform translate-y-6 opacity-0';

    toast.innerHTML = `
    <div class="bg-white/95 dark:bg-[#111c24]/95 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.16)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] p-4 sm:p-4.5 flex flex-col gap-3 relative">
        <!-- Top Row: Icon, Title, and Close -->
        <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-400/10 text-indigo-600 dark:text-indigo-300 flex items-center justify-center shrink-0 border border-indigo-500/15 dark:border-white/10">
                    <i data-lucide="smartphone" class="w-5 h-5"></i>
                </div>
                <div class="min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <h3 class="text-xs sm:text-sm font-black text-gray-900 dark:text-white truncate">Install Android App</h3>
                        <span class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                            .APK
                        </span>
                    </div>
                    <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                        Lock-screen sales alerts & touch POS mode
                    </p>
                </div>
            </div>
            <button id="closeDownloadModalBtn" type="button" class="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors shrink-0">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        </div>

        <!-- Action Row -->
        <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-white/5">
            <button id="btnDontShowAgain" type="button" class="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium transition-colors cursor-pointer">
                Don't show again
            </button>
            <div class="flex items-center gap-1.5">
                <button id="btnRemindLater" type="button" class="px-2.5 py-1.5 text-[11px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                    Later
                </button>
                <a id="btnDownloadApk" href="https://pub-5f77889b51404f04a57b3a83e611a3fc.r2.dev/BMSTz.apk" target="_blank" rel="noopener noreferrer" class="px-3.5 py-1.5 bg-[#424940] hover:bg-[#343a32] text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95">
                    <i data-lucide="download" class="w-3.5 h-3.5"></i>
                    <span>Download</span>
                </a>
            </div>
        </div>
    </div>
    `;

    document.body.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-6', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    });

    const closeToast = () => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-6', 'opacity-0');
        setTimeout(() => toast.remove(), 250);
    };

    toast.querySelector('#closeDownloadModalBtn')?.addEventListener('click', () => {
        recordDismissal(false);
        closeToast();
    });
    toast.querySelector('#btnRemindLater')?.addEventListener('click', () => {
        recordDismissal(false);
        closeToast();
    });
    toast.querySelector('#btnDontShowAgain')?.addEventListener('click', () => {
        recordDismissal(true);
        closeToast();
    });
    toast.querySelector('#btnDownloadApk')?.addEventListener('click', () => {
        recordDismissal(true);
        setTimeout(closeToast, 1200);
    });
}

/**
 * iOS Floating Install Card (Bottom-Right Non-Blocking)
 */
export function showIosInstallModal(options = {}) {
    removeExistingDownloadModal();

    const toast = document.createElement('div');
    toast.id = 'bms-device-download-modal';
    toast.className = 'fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[99999] w-[calc(100%-2rem)] sm:w-[380px] max-w-sm pointer-events-auto transition-all duration-300 ease-out transform translate-y-6 opacity-0';

    toast.innerHTML = `
    <div class="bg-white/95 dark:bg-[#111c24]/95 backdrop-blur-xl border border-slate-200/90 dark:border-white/10 rounded-2xl shadow-[0_12px_36px_rgba(0,0,0,0.16)] dark:shadow-[0_16px_40px_rgba(0,0,0,0.5)] p-4 sm:p-4.5 flex flex-col gap-3 relative">
        <!-- Top Row: Icon, Title, and Close -->
        <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-10 h-10 rounded-xl bg-slate-500/10 dark:bg-white/10 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 border border-slate-500/15 dark:border-white/10">
                    <i data-lucide="apple" class="w-5 h-5"></i>
                </div>
                <div class="min-w-0">
                    <div class="flex items-center gap-1.5 flex-wrap">
                        <h3 class="text-xs sm:text-sm font-black text-gray-900 dark:text-white truncate">Install on iOS</h3>
                        <span class="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">
                            Profile
                        </span>
                    </div>
                    <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">
                        Standalone iOS Home Screen installation
                    </p>
                </div>
            </div>
            <button id="closeDownloadModalBtn" type="button" class="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors shrink-0">
                <i data-lucide="x" class="w-4 h-4"></i>
            </button>
        </div>

        <!-- Action Row -->
        <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-white/5">
            <button id="btnDontShowAgain" type="button" class="text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 font-medium transition-colors cursor-pointer">
                Don't show again
            </button>
            <div class="flex items-center gap-1.5">
                <button id="btnRemindLater" type="button" class="px-2.5 py-1.5 text-[11px] font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                    Later
                </button>
                <button id="btnDownloadProfile" type="button" onclick="window.downloadIosProfile && window.downloadIosProfile()" class="px-3.5 py-1.5 bg-[#475B6E] hover:bg-[#394958] text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 active:scale-95">
                    <i data-lucide="download" class="w-3.5 h-3.5"></i>
                    <span>Profile</span>
                </button>
            </div>
        </div>
    </div>
    `;

    document.body.appendChild(toast);
    if (window.lucide) lucide.createIcons();

    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-6', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    });

    const closeToast = () => {
        toast.classList.remove('translate-y-0', 'opacity-100');
        toast.classList.add('translate-y-6', 'opacity-0');
        setTimeout(() => toast.remove(), 250);
    };

    toast.querySelector('#closeDownloadModalBtn')?.addEventListener('click', () => {
        recordDismissal(false);
        closeToast();
    });
    toast.querySelector('#btnRemindLater')?.addEventListener('click', () => {
        recordDismissal(false);
        closeToast();
    });
    toast.querySelector('#btnDontShowAgain')?.addEventListener('click', () => {
        recordDismissal(true);
        closeToast();
    });
    toast.querySelector('#btnDownloadProfile')?.addEventListener('click', () => {
        recordDismissal(true);
        setTimeout(closeToast, 1200);
    });
}

/**
 * Checks conditions and gracefully triggers the auto-prompt in the bottom-right corner
 */
export function checkAndAutoPromptAppDownload(delayMs = 3000) {
    if (isStandaloneMode()) return;
    if (localStorage.getItem('bms_app_download_prompt_dismissed') === 'true') return;
    if (sessionStorage.getItem('bms_app_download_prompt_shown') === 'true') return;

    setTimeout(() => {
        if (isStandaloneMode()) return;
        if (localStorage.getItem('bms_app_download_prompt_dismissed') === 'true') return;
        if (sessionStorage.getItem('bms_app_download_prompt_shown') === 'true') return;

        // If an active prompt is already open, do not duplicate
        if (document.getElementById('bms-device-download-modal')) {
            return;
        }

        showDeviceAppModal();
    }, delayMs);
}

// Global window bindings
window.getDevicePlatform = getDevicePlatform;
window.showDeviceAppModal = showDeviceAppModal;
window.showDesktopDownloadModal = showDesktopDownloadModal;
window.showAndroidDownloadModal = showAndroidDownloadModal;
window.showIosInstallModal = showIosInstallModal;
window.checkAndAutoPromptAppDownload = checkAndAutoPromptAppDownload;
