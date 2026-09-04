import { logout } from '../auth.js';

export function promptSignOut() {
    // Remove existing signout modal if already open
    document.getElementById('bms-signout-confirm-modal')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'bms-signout-confirm-modal';
    overlay.className = 'fixed inset-0 z-[9999999] flex items-center justify-center p-4 bg-white/60 dark:bg-gray-950/75 backdrop-blur-md transition-opacity duration-200';
    overlay.style.opacity = '0';

    overlay.innerHTML = `
    <div class="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_rgba(15,23,42,0.15)] dark:shadow-[0_25px_60px_rgba(0,0,0,0.6)] w-full max-w-[340px] sm:max-w-sm overflow-hidden transform scale-95 transition-transform duration-200">
        <!-- Header -->
        <div class="p-5 sm:p-6 text-center space-y-3">
            <div class="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/50 border border-rose-100 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 mx-auto shadow-xs">
                <i data-lucide="log-out" class="w-6 h-6"></i>
            </div>
            
            <div class="space-y-1">
                <h3 class="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-tight">
                    Sign Out of BMS?
                </h3>
                <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 leading-relaxed px-1">
                    Are you sure you want to end your current session? You will need your login credentials to sign back in.
                </p>
            </div>
        </div>

        <!-- Actions -->
        <div class="p-4 bg-slate-50/70 dark:bg-gray-800/40 border-t border-slate-100 dark:border-gray-800 grid grid-cols-2 gap-2.5">
            <button id="cancelSignOutBtn" type="button" class="w-full py-2.5 px-3 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95">
                Stay in App
            </button>
            <button id="confirmSignOutBtn" type="button" class="w-full py-2.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95">
                <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
                <span>Sign Out</span>
            </button>
        </div>
    </div>
    `;

    document.body.appendChild(overlay);
    if (window.lucide) lucide.createIcons();

    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        const card = overlay.querySelector('div');
        if (card) card.classList.remove('scale-95');
    });

    const closeModal = () => {
        overlay.style.opacity = '0';
        const card = overlay.querySelector('div');
        if (card) card.classList.add('scale-95');
        setTimeout(() => overlay.remove(), 200);
    };

    overlay.querySelector('#cancelSignOutBtn')?.addEventListener('click', closeModal);
    overlay.querySelector('#confirmSignOutBtn')?.addEventListener('click', () => {
        closeModal();
        logout();
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
    });

    const escListener = (e) => {
        if (e.key === 'Escape') {
            closeModal();
            document.removeEventListener('keydown', escListener);
        }
    };
    document.addEventListener('keydown', escListener);
}

window.confirmSignOut = promptSignOut;
window.promptSignOut = promptSignOut;
