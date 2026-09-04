import { supabase } from '../supabase.js';
import { showToast, showLoader, hideLoader } from '../utils.js';

/**
 * Prompt system administrator for step-up reauthentication before privileged/destructive actions.
 * @param {string} actionName - Description of action (e.g., 'Emergency Account Lockout', 'Toggle Maintenance Mode')
 * @param {Function} onConfirmed - Callback function to execute if step-up reauth succeeds
 */
export function promptStepUpReauth(actionName, onConfirmed) {
    return new Promise((resolve) => {
        let modal = document.getElementById('stepUpReauthModal');
        if (modal) modal.remove();

        modal = document.createElement('div');
        modal.id = 'stepUpReauthModal';
        modal.className = 'fixed inset-0 z-[40000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in select-none';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-red-100 dark:border-red-900/30 space-y-5">
                <div class="flex items-center gap-4">
                    <div class="w-12 h-12 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl flex items-center justify-center shrink-0">
                        <i data-lucide="shield-alert" class="w-6 h-6"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-black text-gray-900 dark:text-white">Privileged Action Reauthentication</h3>
                        <p class="text-xs text-gray-500 dark:text-gray-400">Step-up security verification required</p>
                    </div>
                </div>

                <div class="p-3.5 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-200 dark:border-amber-800/30 text-amber-800 dark:text-amber-300 text-xs leading-relaxed font-medium">
                    You are performing a sensitive administrative action: <strong class="font-bold underline">${escapeHtml(actionName)}</strong>.
                </div>

                <div class="space-y-3">
                    <div>
                        <label class="block text-[11px] font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1">MFA Verification / Admin Code</label>
                        <input type="password" id="stepUpPassInput" name="bms_sec_admin_code_plain_field"
                               autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
                               data-lpignore="true" data-1p-ignore="true" data-bwignore="true" data-form-type="other"
                               placeholder="Enter admin verification code"
                               class="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500">
                    </div>
                </div>

                <div class="flex items-center justify-end gap-3 pt-2">
                    <button id="stepUpCancelBtn" class="px-5 py-2.5 rounded-2xl text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer">
                        Cancel
                    </button>
                    <button id="stepUpConfirmBtn" class="px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider text-white bg-red-600 hover:bg-red-700 active:scale-95 shadow-lg shadow-red-600/20 transition-all flex items-center gap-2 cursor-pointer">
                        <i data-lucide="check-circle" class="w-4 h-4"></i> Confirm Action
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        if (window.lucide) lucide.createIcons();

        const passInput = modal.querySelector('#stepUpPassInput');
        const cancelBtn = modal.querySelector('#stepUpCancelBtn');
        const confirmBtn = modal.querySelector('#stepUpConfirmBtn');

        if (passInput) {
            passInput.value = '';
            passInput.focus();
            passInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmBtn.click();
                }
            });
        }

        cancelBtn.onclick = () => {
            modal.remove();
            resolve(false);
        };

        confirmBtn.onclick = async () => {
            const code = passInput.value.trim();
            if (!code) {
                showToast('Please enter your verification pass/code', 'warning');
                return;
            }

            showLoader('Verifying step-up reauthentication...');
            try {
                let isValid = false;

                // 1. Primary verification via native Supabase verify_sys_admin RPC
                const { data, error } = await supabase.rpc('verify_sys_admin', { input_keyword: code });

                if (!error && (data === true || (typeof data === 'object' && data?.success))) {
                    isValid = true;
                } else {
                    // Secondary check via verify_step_up_reauth if configured
                    try {
                        const stepUpRes = await supabase.rpc('verify_step_up_reauth', {
                            p_reauth_pass: code,
                            p_action: actionName
                        });
                        if (!stepUpRes.error && (stepUpRes.data === true || stepUpRes.data?.success === true)) {
                            isValid = true;
                        }
                    } catch (e) {
                        // silent fallback
                    }
                }

                hideLoader();

                if (!isValid) {
                    showToast('Step-Up Reauthentication failed: Invalid security keyword or passcode', 'error');
                    return;
                }

                modal.remove();
                showToast('Security verification passed', 'success', 2000);
                if (typeof onConfirmed === 'function') {
                    onConfirmed();
                }
                resolve(true);
            } catch (err) {
                hideLoader();
                showToast('Step-up error: ' + err.message, 'error');
                resolve(false);
            }
        };
    });
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

window.promptStepUpReauth = promptStepUpReauth;
