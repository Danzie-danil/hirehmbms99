import releaseData from '../../release_notes.json';
import { state } from '../state.js';
import { resolveRoleSpecificNotes, isReleaseNotesVisibleForRole } from '../updateChecker.js';

const STORAGE_KEY = 'bms_last_seen_release_version';
const INSTALLED_KEY = 'bms_installed_version';

export function initReleaseNotesCheck() {
    setTimeout(() => {
        // Strict guard: ONLY check release notes if user is actively logged into #app and login screen is hidden
        const loginScreen = document.getElementById('loginScreen');
        const isLoginVisible = loginScreen && !loginScreen.classList.contains('hidden');
        const appVisible = document.getElementById('app') && !document.getElementById('app').classList.contains('hidden');
        const isAuth = !!(state.role && (state.currentUserUuid || state.ownerId || state.branchId));

        if (isLoginVisible || !appVisible || !isAuth) {
            return;
        }

        const userRole = state.role || 'branch';
        const isVisible = isReleaseNotesVisibleForRole(releaseData, userRole);
        const lastSeen = localStorage.getItem(STORAGE_KEY);

        // If suppressed for this role, silently mark version as seen
        if (!isVisible) {
            if (releaseData?.version) {
                localStorage.setItem(INSTALLED_KEY, releaseData.version);
                localStorage.setItem(STORAGE_KEY, releaseData.version);
            }
            return;
        }

        // Case: Version upgrade detected or new version release
        if (lastSeen !== releaseData.version) {
            sessionStorage.removeItem('bms_just_updated');
            openReleaseNotesModal(false);
        }
    }, 400);
}

export function openReleaseNotesModal(force = false) {
    const loginScreen = document.getElementById('loginScreen');
    const isLoginVisible = loginScreen && !loginScreen.classList.contains('hidden');
    const appVisible = document.getElementById('app') && !document.getElementById('app').classList.contains('hidden');

    if (!force && (isLoginVisible || !appVisible)) {
        return;
    }

    const userRole = state.role || localStorage.getItem('bms_last_role') || 'branch';
    const isVisible = isReleaseNotesVisibleForRole(releaseData, userRole);
    const notes = resolveRoleSpecificNotes(releaseData?.notes, userRole);

    if (!releaseData || !Array.isArray(notes) || notes.length === 0 || (!isVisible && !force)) {
        if (force && window.showToast) {
            window.showToast('No new release notes available at this time', 'info');
        }
        return;
    }

    // Remove existing release notes modal if present
    document.getElementById('release-notes-modal-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'release-notes-modal-overlay';
    overlay.className = 'fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-white/70 dark:bg-gray-950/80 backdrop-blur-md transition-all duration-300 ease-out pointer-events-auto';
    overlay.style.opacity = '0';

    const notesListHtml = notes.map(note => `
        <li class="flex items-start gap-2.5 text-xs sm:text-sm text-gray-700 dark:text-gray-200">
            <span class="flex-shrink-0 w-1.5 h-1.5 rounded-full ${userRole === 'owner' ? 'bg-indigo-500' : 'bg-emerald-500'} mt-1.5"></span>
            <span class="leading-relaxed font-medium">${note}</span>
        </li>
    `).join('');

    overlay.innerHTML = `
    <div class="release-notes-card bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl sm:rounded-3xl shadow-[0_20px_60px_rgba(15,23,42,0.18)] dark:shadow-[0_25px_70px_rgba(0,0,0,0.8)] w-full max-w-[340px] sm:max-w-md overflow-hidden transform scale-95 opacity-0 transition-all duration-300 ease-out">
        <!-- Header -->
        <div class="px-4 py-3 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between bg-slate-50/60 dark:bg-gray-800/40">
            <div class="flex items-center gap-2 min-w-0">
                <div class="w-7 h-7 rounded-lg ${userRole === 'owner' ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400' : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'} flex items-center justify-center flex-shrink-0">
                    <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
                </div>
                <div class="min-w-0">
                    <h3 class="text-xs sm:text-sm font-bold text-gray-900 dark:text-white leading-tight truncate">
                        ${releaseData.title || "Release Notes"}
                    </h3>
                    <p class="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider truncate mt-0.5">
                        Release v${releaseData.version || 'Latest'} ${releaseData.date ? '• ' + releaseData.date : ''}
                    </p>
                </div>
            </div>
            <button id="closeReleaseNotesBtn" type="button" class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer shrink-0">
                <i data-lucide="x" class="w-3.5 h-3.5"></i>
            </button>
        </div>

        <!-- Body -->
        <div class="p-3.5 sm:p-4 space-y-2.5">
            <div class="relative">
                <ul id="releaseNotesList" class="space-y-2.5 max-h-52 overflow-y-auto pr-1.5 scroller-custom">
                    ${notesListHtml}
                </ul>
                <div id="releaseNotesFadeOverlay" class="pointer-events-none absolute bottom-0 inset-x-0 h-8 bg-gradient-to-t from-white dark:from-gray-900 to-transparent transition-opacity duration-200"></div>
            </div>

            <!-- Scroll Indicator Hint -->
            <div id="releaseNotesScrollHint" class="hidden flex items-center justify-center gap-1.5 py-1 px-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-full text-[10px] font-bold border border-indigo-100 dark:border-indigo-900/60 transition-all cursor-pointer select-none">
                <span>Scroll down for more</span>
                <i data-lucide="chevron-down" class="w-3 h-3 animate-bounce"></i>
            </div>

            <div class="pt-1">
                <button id="dismissReleaseNotesBtn" type="button" class="w-full py-2 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95">
                    <span>Proceed</span>
                    <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
                </button>
            </div>
        </div>
    </div>
    `;

    document.body.appendChild(overlay);
    if (window.lucide) lucide.createIcons();

    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        const card = overlay.querySelector('.release-notes-card');
        if (card) {
            card.classList.remove('scale-95', 'opacity-0');
            card.classList.add('scale-100', 'opacity-100');
        }
    });

    const scrollList = overlay.querySelector('#releaseNotesList');
    const scrollHint = overlay.querySelector('#releaseNotesScrollHint');
    const fadeOverlay = overlay.querySelector('#releaseNotesFadeOverlay');

    if (scrollList && scrollHint) {
        const updateScrollIndicator = () => {
            const hasMoreToScroll = scrollList.scrollHeight - scrollList.scrollTop - scrollList.clientHeight > 12;
            if (hasMoreToScroll) {
                scrollHint.classList.remove('hidden');
                if (fadeOverlay) fadeOverlay.classList.remove('opacity-0');
            } else {
                scrollHint.classList.add('hidden');
                if (fadeOverlay) fadeOverlay.classList.add('opacity-0');
            }
        };

        scrollList.addEventListener('scroll', updateScrollIndicator);
        scrollHint.addEventListener('click', () => {
            scrollList.scrollBy({ top: 120, behavior: 'smooth' });
        });

        // Run initial check after elements mount
        setTimeout(updateScrollIndicator, 60);
    }

    let isClosing = false;
    const closeModal = () => {
        if (isClosing) return;
        isClosing = true;
        localStorage.setItem(STORAGE_KEY, releaseData.version);
        localStorage.setItem(INSTALLED_KEY, releaseData.version);
        sessionStorage.removeItem('bms_just_updated');
        
        overlay.classList.add('pointer-events-none');
        overlay.style.opacity = '0';
        const card = overlay.querySelector('.release-notes-card');
        if (card) {
            card.classList.remove('scale-100', 'opacity-100');
            card.classList.add('scale-95', 'opacity-0', 'translate-y-2');
        }
        setTimeout(() => overlay.remove(), 320);
    };

    overlay.querySelector('#closeReleaseNotesBtn')?.addEventListener('click', closeModal);
    overlay.querySelector('#dismissReleaseNotesBtn')?.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });
}

window.openReleaseNotesModal = openReleaseNotesModal;
