import { dbTickets } from '../db.js';
import { showToast, showLoader, hideLoader } from '../utils.js';
import { state } from '../state.js';


export function renderFeedbackView() {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;

    // Make mainContent a full bleed container for the page-container layout
    mainContent.classList.add('overflow-hidden', '!p-0');
    mainContent.classList.remove('overflow-y-auto', 'p-4', 'lg:p-8');

    const userEmail = state.profile?.email || state.currentUser || '';

    mainContent.innerHTML = `
    <div class="page-container w-full h-full bg-slate-50/50 dark:bg-gray-900 rounded-none border-0 shadow-none overflow-hidden flex flex-col">

        <!-- Top Nav -->
        <div class="modal-top-nav flex-none flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-20">
            <div class="flex items-center gap-3 min-w-0">
                <button onclick="window.switchView('overview')" class="inline-flex items-center gap-1 px-3 sm:px-3.5 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i>
                    <span class="hidden sm:inline">${window.t('back', 'Back')}</span>
                </button>
                <div class="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0">
                    <i data-lucide="life-buoy" class="w-5 h-5"></i>
                </div>
                <div class="min-w-0">
                    <h1 class="text-sm sm:text-base font-black text-gray-900 dark:text-white leading-tight truncate">${window.t('help_support_title', 'Help & Support')}</h1>
                    <p class="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate hidden sm:block">${window.t('help_support_desc', 'Submit a ticket and our team will assist you.')}</p>
                </div>
            </div>
            <span class="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 shrink-0 hidden sm:block">${window.t('support_available', 'Support')}</span>
        </div>

        <!-- Scrollable Body -->
        <div class="modal-main-content flex-1 p-4 sm:p-5 lg:p-6 overflow-y-auto scroller-custom bg-slate-50/50 dark:bg-gray-900">
            <div class="max-w-5xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-8">
                
                <!-- Left Column: Form -->
                <div class="lg:col-span-2">
                    <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-sm">
                        <div class="px-4 py-3 border-b border-gray-100 dark:border-gray-700/60 bg-slate-50/60 dark:bg-gray-900/40 flex items-center gap-2.5 rounded-t-2xl">
                            <div class="w-8 h-8 bg-indigo-50 dark:bg-indigo-950/50 rounded-full flex items-center justify-center shrink-0">
                                <i data-lucide="send" class="w-4 h-4 text-indigo-600 dark:text-indigo-400"></i>
                            </div>
                            <div>
                                <h3 class="text-sm font-black text-gray-900 dark:text-white">${window.t('submit_ticket_title', 'Submit a Ticket')}</h3>
                                <p class="text-[10px] text-gray-400 font-medium leading-tight">${window.t('submit_ticket_sub', "Fill in the details below and we'll respond promptly")}</p>
                            </div>
                        </div>

                        <div class="p-5 space-y-4">
                            <div>
                                <label class="block text-[10px] sm:text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">${window.t('your_contact_email', 'Your Contact Email')} <span class="text-red-500">*</span></label>
                                <input type="email" id="ticketEmail" placeholder="e.g. yourname@example.com" value="${userEmail}" required
                                    class="w-full px-4 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none transition-all">
                            </div>

                            <div>
                                <label class="block text-[10px] sm:text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">${window.t('ticket_subject', 'Subject')} <span class="text-red-500">*</span></label>
                                <input type="text" id="ticketSubject" placeholder="e.g. Bug with invoice exports, Feature suggestion" required
                                    class="w-full px-4 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none transition-all">
                            </div>

                            <div>
                                <label class="block text-[10px] sm:text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">${window.t('message_description', 'Message Description')} <span class="text-red-500">*</span></label>
                                <textarea id="ticketMessage" rows="4" placeholder="Explain your question or the issue you encountered..." required
                                    class="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none transition-all resize-none"></textarea>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right Column: Info & Feature Cards -->
                <div class="lg:col-span-1 space-y-4">
                    <!-- Info Box (Visible on all) -->
                    <div class="bg-indigo-50/70 dark:bg-indigo-950/20 rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40 p-4 flex items-start gap-3">
                        <i data-lucide="info" class="w-4.5 h-4.5 text-indigo-500 shrink-0 mt-0.5"></i>
                        <p class="text-xs text-indigo-700 dark:text-indigo-300 font-medium leading-tight">
                            Our support team typically responds within <strong>24 hours</strong> on business days.
                        </p>
                    </div>

                    <!-- Feature Cards (Hidden on mobile, visible on desktop) -->
                    <div class="hidden lg:flex flex-col space-y-3 pt-1">
                        <h4 class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5 px-1">Common Topics</h4>
                        
                        <div class="flex items-center gap-3 bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 transition-colors">
                            <div class="w-9 h-9 bg-blue-50 dark:bg-blue-950/40 rounded-full flex items-center justify-center shrink-0">
                                <i data-lucide="bug" class="w-4.5 h-4.5 text-blue-600 dark:text-blue-400"></i>
                            </div>
                            <div class="min-w-0">
                                <p class="text-xs font-bold text-gray-900 dark:text-white truncate leading-tight">Bug Report</p>
                                <p class="text-[10px] text-gray-500 dark:text-gray-400 truncate leading-tight">Something isn't working</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-3 bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs cursor-pointer hover:border-amber-300 dark:hover:border-amber-700 transition-colors">
                            <div class="w-9 h-9 bg-amber-50 dark:bg-amber-950/40 rounded-full flex items-center justify-center shrink-0">
                                <i data-lucide="lightbulb" class="w-4.5 h-4.5 text-amber-600 dark:text-amber-400"></i>
                            </div>
                            <div class="min-w-0">
                                <p class="text-xs font-bold text-gray-900 dark:text-white truncate leading-tight">Feature Request</p>
                                <p class="text-[10px] text-gray-500 dark:text-gray-400 truncate leading-tight">Suggest an improvement</p>
                            </div>
                        </div>

                        <div class="flex items-center gap-3 bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors">
                            <div class="w-9 h-9 bg-emerald-50 dark:bg-emerald-950/40 rounded-full flex items-center justify-center shrink-0">
                                <i data-lucide="help-circle" class="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400"></i>
                            </div>
                            <div class="min-w-0">
                                <p class="text-xs font-bold text-gray-900 dark:text-white truncate leading-tight">General Enquiry</p>
                                <p class="text-[10px] text-gray-500 dark:text-gray-400 truncate leading-tight">Ask us anything</p>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>

        <!-- Bottom Nav -->
        <div class="modal-bottom-nav flex-none p-3 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-end z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <button onclick="submitFeedbackTicket()"
                class="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold rounded-full text-sm shadow-md shadow-indigo-600/20 hover:shadow-indigo-700/30 transition-all cursor-pointer">
                <i data-lucide="send" class="w-4 h-4"></i>
                ${window.t('btn_submit_ticket', 'Submit Support Ticket')}
            </button>
        </div>
    </div>
    `;

    if (window.lucide) {
        window.lucide.createIcons();
    }
}

window.submitFeedbackTicket = async function() {
    const email = document.getElementById('ticketEmail')?.value.trim();
    const subject = document.getElementById('ticketSubject')?.value.trim();
    const message = document.getElementById('ticketMessage')?.value.trim();

    if (!email || !subject || !message) {
        showToast('Email, Subject, and Description are all mandatory.', 'warning');
        return;
    }

    showLoader('Submitting support ticket...');

    try {
        await dbTickets.create({
            subject,
            message,
            user_email: email,
            status: 'new',
            created_at: new Date().toISOString()
        });

        hideLoader();

        showToast('Support ticket submitted successfully! Thank you.', 'success');

        if (document.getElementById('ticketSubject')) document.getElementById('ticketSubject').value = '';
        if (document.getElementById('ticketMessage')) document.getElementById('ticketMessage').value = '';
    } catch (e) {
        hideLoader();
        console.error('[Feedback] Submit failed:', e);
        showToast('Failed to submit support ticket: ' + (e.message || e), 'error');
    }
};

window.openSupportTicketModal = function() {
    const defaultEmail = state.profile?.email || state.currentUser || '';

    const modalHtml = `
    <div class="page-container w-full h-full bg-slate-50/50 dark:bg-gray-900 rounded-none border-0 shadow-none overflow-hidden flex flex-col">

        <div class="modal-top-nav flex-none flex items-center justify-between px-4 sm:px-5 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-20">
            <div class="flex items-center gap-2.5 min-w-0">
                <button onclick="closeModal()" class="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i>
                    <span>${window.t('back', 'Back')}</span>
                </button>
                <div class="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0">
                    <i data-lucide="life-buoy" class="w-5 h-5"></i>
                </div>
                <div class="min-w-0">
                    <h2 class="text-sm font-black text-gray-900 dark:text-white leading-tight truncate">${window.t('contact_support_modal', 'Contact Support')}</h2>
                    <p class="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate">Submit a ticket and our team will assist you.</p>
                </div>
            </div>
        </div>

        <div class="modal-main-content flex-1 p-4 sm:p-5 space-y-4 overflow-y-auto scroller-custom">
            <div>
                <label class="block text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">${window.t('your_contact_email', 'Your Contact Email')} <span class="text-red-500">*</span></label>
                <input type="email" id="modalTicketEmail" value="${defaultEmail}" required placeholder="yourname@example.com"
                    class="w-full px-4 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none transition-all">
            </div>
            <div>
                <label class="block text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">${window.t('ticket_subject', 'Subject')} <span class="text-red-500">*</span></label>
                <input type="text" id="modalTicketSubject" required placeholder="Brief summary of the issue"
                    class="w-full px-4 py-2.5 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none transition-all">
            </div>
            <div>
                <label class="block text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-widest mb-1.5">${window.t('message_description', 'Description')} <span class="text-red-500">*</span></label>
                <textarea id="modalTicketMessage" rows="6" required placeholder="Detail your question or issue here..."
                    class="w-full px-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 dark:text-white outline-none resize-none transition-all"></textarea>
            </div>
            <div class="bg-indigo-50/70 dark:bg-indigo-950/20 rounded-2xl border border-indigo-200/60 dark:border-indigo-900/40 p-3.5 flex items-start gap-2.5">
                <i data-lucide="info" class="w-4 h-4 text-indigo-500 shrink-0 mt-0.5"></i>
                <p class="text-[11px] text-indigo-700 dark:text-indigo-300 font-medium leading-relaxed">We typically respond within <strong>24 hours</strong> on business days.</p>
            </div>
        </div>

        <div class="modal-bottom-nav flex-none p-2.5 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-end gap-2.5 z-20">
            <button onclick="closeModal()" class="px-5 py-2 text-xs font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors cursor-pointer">
                ${window.t('btn_cancel', 'Cancel')}
            </button>
            <button onclick="submitSupportTicketFromModal()" class="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-full transition-all shadow-md shadow-indigo-500/20 cursor-pointer">
                <i data-lucide="send" class="w-3.5 h-3.5"></i> ${window.t('btn_submit_ticket', 'Submit Ticket')}
            </button>
        </div>
    </div>
    `;

    openModal(modalHtml);
    if (window.lucide) window.lucide.createIcons();
};

window.submitSupportTicketFromModal = async function() {
    const email = document.getElementById('modalTicketEmail')?.value.trim();
    const subject = document.getElementById('modalTicketSubject')?.value.trim();
    const message = document.getElementById('modalTicketMessage')?.value.trim();

    if (!email || !subject || !message) {
        if (typeof showToast === 'function') showToast('Email, Subject, and Description are all mandatory.', 'warning');
        return;
    }

    if (typeof showLoader === 'function') showLoader('Submitting support ticket...');

    try {
        await dbTickets.create({
            subject,
            message,
            user_email: email,
            status: 'new',
            created_at: new Date().toISOString()
        });

        if (typeof hideLoader === 'function') hideLoader();
        if (typeof closeModal === 'function') closeModal();
        if (typeof showToast === 'function') showToast('Support ticket submitted successfully! Thank you.', 'success');
    } catch (e) {
        if (typeof hideLoader === 'function') hideLoader();
        console.error('[Support Ticket] Submit failed:', e);
        if (typeof showToast === 'function') showToast('Failed to submit ticket: ' + (e.message || e), 'error');
    }
};
