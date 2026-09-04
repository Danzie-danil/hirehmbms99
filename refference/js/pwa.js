// ── BMSTz PWA Installation & iOS Profile Manager ──────────────────────────

import { iconBase64 } from './logoBase64.js';

let deferredInstallPrompt = null;

export function isIOSDevice() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

export function isStandaloneApp() {
    return window.matchMedia('(display-mode: standalone)').matches ||
           window.navigator.standalone ||
           document.referrer.includes('android-app://');
}

export function initPWA() {
    // Check if running on localhost / development environment
    const isLocalhost = Boolean(
        window.location.hostname === 'localhost' ||
        window.location.hostname === '[::1]' ||
        window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
    );

    // In local development, unregister any existing Service Worker and bypass registration so Vite HMR / live edits load instantly without caching conflicts
    if (isLocalhost) {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                for (const registration of registrations) {
                    registration.unregister();
                }
            }).catch(() => {});
        }
        return;
    }

    // 1. Register Service Worker in production
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => {
                    console.log('[PWA] Service Worker registered with scope:', reg.scope);
                })
                .catch(err => {
                    console.warn('[PWA] Service Worker registration failed:', err);
                });
        });
    }

    const isStandalone = isStandaloneApp();
    const isIOS = isIOSDevice();

    if (isStandalone) {
        console.log('[PWA] App running in standalone mode.');
        updatePwaUiVisibility(false);
        return;
    }

    // On iOS, auto-show PWA UI elements because iOS Safari doesn't fire beforeinstallprompt
    if (isIOS) {
        console.log('[PWA] iOS device detected.');
        const dismissed = sessionStorage.getItem('pwa_banner_dismissed') === 'true';
        updatePwaUiVisibility(true, !dismissed);
    }

    // 2. Listen for Chrome/Android/Desktop beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredInstallPrompt = e;
        console.log('[PWA] beforeinstallprompt captured.');

        const dismissed = sessionStorage.getItem('pwa_banner_dismissed') === 'true';
        updatePwaUiVisibility(true, !dismissed);
    });

    // 3. Listen for appinstalled event
    window.addEventListener('appinstalled', () => {
        console.log('[PWA] App successfully installed.');
        deferredInstallPrompt = null;
        updatePwaUiVisibility(false);
        if (window.showToast) {
            window.showToast('BMSTz App successfully installed!', 'success');
        }
    });
}

function updatePwaUiVisibility(installable, showBanner = true) {
    const banner = document.getElementById('pwaInstallBanner');
    const sidebarBtns = document.querySelectorAll('.pwa-install-btn');

    sidebarBtns.forEach(btn => {
        if (installable) {
            btn.classList.remove('hidden');
        } else {
            btn.classList.add('hidden');
        }
    });

    if (banner) {
        if (installable && showBanner) {
            banner.classList.remove('hidden');
        } else {
            banner.classList.add('hidden');
        }
    }
}

export function downloadIosProfile() {
    const targetUrl = window.location.origin + '/app/';
    const profileXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>PayloadContent</key>
	<array>
		<dict>
			<key>FullScreen</key>
			<true/>
			<key>Icon</key>
			<data>
${iconBase64}
			</data>
			<key>IsRemovable</key>
			<true/>
			<key>Label</key>
			<string>BMSTz</string>
			<key>PayloadDescription</key>
			<string>BMSTz Business Management System Web App</string>
			<key>PayloadDisplayName</key>
			<string>BMSTz Web Clip</string>
			<key>PayloadIdentifier</key>
			<string>com.bmstz.app.webclip</string>
			<key>PayloadType</key>
			<string>com.apple.webClip.managed</string>
			<key>PayloadUUID</key>
			<string>a3c9e4b1-8d2f-4e9b-9c7a-1f8d9e0b2c3d</string>
			<key>PayloadVersion</key>
			<integer>1</integer>
			<key>Precomposed</key>
			<true/>
			<key>URL</key>
			<string>${targetUrl}</string>
		</dict>
	</array>
	<key>PayloadDisplayName</key>
	<string>BMSTz Web App</string>
	<key>PayloadIdentifier</key>
	<string>com.bmstz.app.profile</string>
	<key>PayloadOrganization</key>
	<string>BMSTz</string>
	<key>PayloadRemovalDisallowed</key>
	<false/>
	<key>PayloadType</key>
	<string>Configuration</string>
	<key>PayloadUUID</key>
	<string>b4d0f5c2-9e3a-5f0c-ad8b-2e9ea1c3d4e5</string>
	<key>PayloadVersion</key>
	<integer>1</integer>
</dict>
</plist>`;

    try {
        const blob = new Blob([profileXml], { type: 'application/x-apple-aspen-config;charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        
        const isIOS = isIOSDevice();
        if (isIOS) {
            window.location.href = blobUrl;
        } else {
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = 'BMSTz.mobileconfig';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }

        setTimeout(() => URL.revokeObjectURL(blobUrl), 20000);

        if (window.showToast) {
            window.showToast('iOS Profile download started! Check iOS Settings to install.', 'success');
        }
    } catch (err) {
        console.error('[PWA] Error generating iOS profile:', err);
        if (window.showToast) {
            window.showToast('Failed to download profile. Use Safari Share Menu method.', 'error');
        }
    }
}

export function showIosInstallModal() {
    const html = `
        <div class="flex flex-col h-full overflow-hidden bg-white dark:bg-gray-900 rounded-2xl">
            <!-- Header -->
            <div class="flex items-center justify-between gap-3 p-5 border-b border-gray-100 dark:border-gray-800 bg-[#475B6E] text-white rounded-t-2xl">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                        <i data-lucide="apple" class="w-6 h-6 text-white"></i>
                    </div>
                    <div>
                        <h2 class="text-base sm:text-lg font-black text-white">Install BMSTz on iOS</h2>
                        <p class="text-xs text-indigo-100">Choose your preferred iOS installation method</p>
                    </div>
                </div>
                <button onclick="closeModal()" class="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <!-- Body -->
            <div class="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-200">

                <!-- Method 1: Mobile Configuration Profile -->
                <div class="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-4 sm:p-5 space-y-3">
                    <div class="flex items-center justify-between gap-2 flex-wrap">
                        <div class="flex items-center gap-2">
                            <span class="bg-indigo-600 text-white text-xs font-black px-2.5 py-1 rounded-lg">Method 1</span>
                            <h3 class="text-sm font-bold text-gray-900 dark:text-white">Install iOS Profile (.mobileconfig)</h3>
                        </div>
                        <button onclick="window.downloadIosProfile()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shadow-indigo-600/10">
                            <i data-lucide="download" class="w-3.5 h-3.5"></i> Download Profile
                        </button>
                    </div>
                    <p class="text-xs text-gray-500 leading-relaxed">
                        This downloads a standard Apple configuration profile that installs BMSTz as a standalone app directly to your home screen. Safe, quick, and native.
                    </p>
                </div>

                <!-- Method 2: Manual Add to Home Screen -->
                <div class="bg-gray-50 dark:bg-gray-800/30 border border-gray-150 dark:border-gray-800/80 rounded-2xl p-4 sm:p-5 space-y-4">
                    <div class="flex items-center gap-2">
                        <span class="bg-gray-600 text-white text-xs font-black px-2.5 py-1 rounded-lg">Method 2</span>
                        <h3 class="text-sm font-bold text-gray-900 dark:text-white">Add via Safari Share Menu</h3>
                    </div>
                    <p class="text-xs text-gray-500 leading-relaxed">
                        If you prefer not to install a profile, you can install the PWA manually in Safari:
                    </p>
                    <div class="grid grid-cols-3 gap-3">
                        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-750 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 text-center">
                            <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                                <i data-lucide="share" class="w-4 h-4"></i>
                            </div>
                            <p class="font-bold text-gray-900 dark:text-gray-100 text-[11px]">1. Tap Share</p>
                            <p class="text-[10px] text-gray-500">In Safari footer</p>
                        </div>
                        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-750 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 text-center">
                            <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                                <i data-lucide="plus-square" class="w-4 h-4"></i>
                            </div>
                            <p class="font-bold text-gray-900 dark:text-gray-100 text-[11px]">2. Add to Home</p>
                            <p class="text-[10px] text-gray-500">Scroll down list</p>
                        </div>
                        <div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex flex-col items-center justify-center gap-1.5 flex flex-col items-center justify-center text-center">
                            <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                                <i data-lucide="check-circle" class="w-4 h-4"></i>
                            </div>
                            <p class="font-bold text-gray-900 dark:text-gray-100 text-[11px]">3. Tap Add</p>
                            <p class="text-[10px] text-gray-500">Top right corner</p>
                        </div>
                    </div>
                </div>

            </div>

            <!-- Footer -->
            <div class="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end bg-gray-50/50 dark:bg-gray-800/50 rounded-b-2xl">
                <button onclick="closeModal()" class="px-5 py-2.5 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl transition-all shadow-sm">
                    Got it, Close
                </button>
            </div>
        </div>
    `;

    openModal(html);
    if (window.lucide) window.lucide.createIcons();
}

export async function triggerPwaInstall() {
    const isIOS = isIOSDevice();

    if (isIOS || !deferredInstallPrompt) {
        showIosInstallModal();
        return;
    }

    // Show Android/Chrome prompt
    deferredInstallPrompt.prompt();

    try {
        const choiceResult = await deferredInstallPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
            console.log('[PWA] User accepted the install prompt');
            if (window.showToast) {
                window.showToast('Installing BMSTz App...', 'success');
            }
        } else {
            console.log('[PWA] User dismissed the install prompt');
        }
    } catch (err) {
        console.warn('[PWA] Error handling choice result:', err);
    }

    deferredInstallPrompt = null;
    updatePwaUiVisibility(false);
}

export function dismissPwaInstallPrompt() {
    sessionStorage.setItem('pwa_banner_dismissed', 'true');
    const banner = document.getElementById('pwaInstallBanner');
    if (banner) banner.classList.add('hidden');
}

// Global window bindings
window.triggerPwaInstall = triggerPwaInstall;
window.dismissPwaInstallPrompt = dismissPwaInstallPrompt;
window.downloadIosProfile = downloadIosProfile;
window.downloadIosMobileconfig = downloadIosProfile;
window.showIosInstallModal = showIosInstallModal;

// Auto initialize PWA on module load
initPWA();
