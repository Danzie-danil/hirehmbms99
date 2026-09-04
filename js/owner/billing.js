import { state } from '../state.js';
import { dbProfile, dbBilling } from '../db.js';
import { showToast, showLoader, hideLoader, confirmModal } from '../utils.js';

export async function renderOwnerBilling() {
    const container = document.getElementById('billingSettingsContainer');
    if (!container) return;

    container.innerHTML = `
    <div class="slide-in w-full">
        <div class="h-64 bg-gray-100 dark:bg-gray-800 rounded-3xl animate-pulse"></div>
    </div>`;

    try {
        const ownerId = state.ownerId || state.currentUserUuid;
        let profile = state.profile;
        if (!profile || !profile.id) {
            try {
                profile = await dbProfile.fetch(ownerId);
                if (profile) state.profile = profile;
            } catch (e) {
                console.warn('Profile fetch warning in billing:', e);
            }
        }

        const planInfo = typeof window.getPlan === 'function' ? window.getPlan() : null;
        const currentPlan = (planInfo?.id || profile?.plan || 'free_trial').toLowerCase();
        const trialEnds = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
        const now = new Date();
        const isTrialActive = planInfo ? planInfo.isTrialActive : (currentPlan === 'free_trial' && trialEnds && trialEnds > now);
        const trialDaysLeft = planInfo ? planInfo.daysLeft : (isTrialActive ? Math.ceil((trialEnds - now) / (1000 * 60 * 60 * 24)) : 0);

        if (!state.paymentMethod) state.paymentMethod = 'card';

        const plans = [
            { 
                id: 'starter', 
                name: 'Starter', 
                monthlyPriceNum: 5000,
                monthlyPrice: 'TZS 5,000 / mo',
                annualBasePriceNum: 60000,
                annualPriceNum: 52800,
                annualDiscountPercent: 12,
                annualSavingsNum: 7200,
                annualPrice: 'TZS 52,800 / yr',
                annualEffectiveMonthly: 'TZS 4,400 / mo',
                limits: 'Up to 3 Branches', 
                features: ['Core Reporting', 'Unlimited Sales', 'Basic Support', 'Multi-user Access'], 
                color: 'blue' 
            },
            { 
                id: 'enterprise', 
                name: 'Enterprise', 
                monthlyPriceNum: 15000,
                monthlyPrice: 'TZS 15,000 / mo',
                annualBasePriceNum: 180000,
                annualPriceNum: 158400,
                annualDiscountPercent: 12,
                annualSavingsNum: 21600,
                annualPrice: 'TZS 158,400 / yr',
                annualEffectiveMonthly: 'TZS 13,200 / mo',
                limits: 'Up to 10 Branches', 
                features: ['Everything in Starter', 'White-label UI', 'Priority Support', 'Custom Branding', 'Branch Performance Reports'], 
                color: 'violet', 
                popular: true 
            },
            { 
                id: 'exclusive', 
                name: 'Exclusive', 
                monthlyPriceNum: 25000,
                monthlyPrice: 'TZS 25,000 / mo',
                annualBasePriceNum: 300000,
                annualPriceNum: 255000,
                annualDiscountPercent: 15,
                annualSavingsNum: 45000,
                annualPrice: 'TZS 255,000 / yr',
                annualEffectiveMonthly: 'TZS 21,250 / mo',
                limits: 'Unlimited Branches', 
                features: ['Everything in Enterprise', 'AI Strategic Intelligence & Analytics', 'Dedicated Support SLA', 'Custom Report Builder', 'VIP Server Priority'], 
                color: 'emerald' 
            }
        ];

        try {
            const dbPlans = await dbBilling.fetchPlans();
            if (dbPlans && dbPlans.length > 0) {
                const starterPlan = dbPlans.find(p => p.plan_name.toLowerCase() === 'starter');
                const enterprisePlan = dbPlans.find(p => p.plan_name.toLowerCase() === 'enterprise');
                const exclusivePlan = dbPlans.find(p => p.plan_name.toLowerCase() === 'exclusive');

                if (starterPlan) {
                    plans[0].monthlyPrice = `TZS ${Number(starterPlan.price).toLocaleString()} / mo`;
                    plans[0].limits = `Up to ${starterPlan.max_branches} Branches`;
                }
                if (enterprisePlan) {
                    plans[1].monthlyPrice = `TZS ${Number(enterprisePlan.price).toLocaleString()} / mo`;
                    plans[1].limits = `Up to ${enterprisePlan.max_branches} Branches`;
                }
                if (exclusivePlan) {
                    plans[2].monthlyPrice = `TZS ${Number(exclusivePlan.price).toLocaleString()} / mo`;
                    plans[2].limits = (exclusivePlan.max_branches === null || exclusivePlan.max_branches >= 9999) ? 'Unlimited Branches' : `Up to ${exclusivePlan.max_branches} Branches`;
                }
            }
        } catch (e) {
            console.warn('sys_pricing_plans fetch error:', e);
        }

        let html = `
        <div class="slide-in w-full space-y-4">
            <div class="bg-white dark:bg-gray-800 rounded-2xl md:rounded-3xl p-3 md:p-5 shadow-sm border border-gray-100 dark:border-gray-700/50 relative overflow-hidden">
                <div class="absolute top-0 right-0 w-48 h-48 bg-indigo-50 dark:bg-indigo-900/10 rounded-bl-full pointer-events-none transition-colors"></div>
                <div class="relative z-10 flex flex-wrap sm:flex-row sm:items-center justify-between gap-2 md:gap-4">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 mb-0 sm:mb-1">
                            <h2 class="text-sm md:text-lg font-black text-gray-900 dark:text-white tracking-tight whitespace-nowrap">${window.t('current_plan_label', 'Current Plan:')}</h2>
                            <span class="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-wider rounded-lg border border-indigo-200 dark:border-indigo-800 whitespace-nowrap">
                                ${currentPlan.replace('_', ' ')}
                            </span>
                            ${profile?.billing_cycle ? `
                                <span class="px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 text-[9px] font-extrabold uppercase tracking-widest rounded border border-emerald-200 dark:border-emerald-800">
                                    ${profile.billing_cycle === 'annual' ? '12-Month Annual' : 'Monthly'}
                                </span>
                            ` : ''}
                        </div>
                        <p class="hidden sm:block text-xs text-gray-500 dark:text-gray-400 font-medium max-w-xl">
                            ${
                                currentPlan === 'free_trial'
                                    ? (isTrialActive
                                        ? `You are currently on a 14-day free trial with full access. You have <strong class="text-indigo-600 dark:text-indigo-400">${trialDaysLeft} day${trialDaysLeft !== 1 ? 's' : ''} left</strong> before subscription is required.`
                                        : `Your trial has expired. Please choose a plan below to restore full access to your business.`)
                                    : currentPlan === 'starter'
                                        ? `You are on the <strong class="text-gray-900 dark:text-white font-bold">Starter Plan</strong> with up to 3 branches, core reporting, unlimited sales, and multi-user PIN access.`
                                        : currentPlan === 'enterprise'
                                            ? `You are on the <strong class="text-gray-900 dark:text-white font-bold">Enterprise Plan</strong> with up to 10 branches, custom branding, priority support, and advanced analytics.`
                                            : `You are on the <strong class="text-gray-900 dark:text-white font-bold">Exclusive Plan</strong> with unlimited branches, custom report builder, dedicated support SLA, and VIP priority.`
                            }
                        </p>
                    </div>

                    ${['starter', 'enterprise', 'exclusive'].includes(currentPlan) ? `
                        <div>
                            <button
                                onclick="cancelSubscription()"
                                class="flex items-center justify-center gap-1.5 px-3 py-1.5 text-[10px] font-bold text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/10 dark:hover:bg-red-900/20 rounded-lg transition-colors whitespace-nowrap"
                            >
                                <i data-lucide="x-circle" class="w-3.5 h-3.5"></i>
                                <span class="hidden sm:inline">${window.t('cancel_subscription', 'Cancel Subscription')}</span>
                                <span class="sm:hidden">${window.t('cancel', 'Cancel')}</span>
                            </button>
                        </div>
                    ` : ''}
                </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 lg:gap-6 w-full items-stretch">`;

        plans.forEach(plan => {
            const isCurrent = currentPlan === plan.id;

            html += `
                <div class="relative bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-6 shadow-sm border ${plan.popular ? 'border-indigo-500 ring-2 ring-indigo-500/10' : 'border-gray-100 dark:border-gray-700/70'} flex flex-col justify-between h-full transition-all hover:shadow-md">
                    ${plan.popular ? `<div class="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-[0.2em] px-3.5 py-0.5 rounded-full shadow-sm z-10">${window.t('recommended', 'Recommended')}</div>` : ''}

                    <div>
                        <!-- Card Header Bar (Non-overlapping Flex Layout) -->
                        <div class="flex items-start justify-between gap-2.5 mb-3 min-w-0">
                            <div class="min-w-0 flex-1">
                                <div class="text-gray-400 dark:text-gray-500 font-extrabold uppercase tracking-widest text-[9px] truncate mb-0.5">
                                    ${window.t(plan.limits.toLowerCase().replace(/ /g, '_'), plan.limits)}
                                </div>
                                <h3 class="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                                    ${plan.name}
                                </h3>
                            </div>
                            <div class="shrink-0 pt-0.5">
                                ${plan.id === 'enterprise' ? `
                                    <div class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 rounded-full shadow-xs">
                                        <img src="/enterpriseimage.png" onerror="if(window.ENTERPRISE_DIAMOND_DATA){this.src=window.ENTERPRISE_DIAMOND_DATA;}else{this.src='enterpriseimage.png';}" class="w-4 h-4 object-contain" alt="Enterprise">
                                        <span class="text-[10px] font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider">Enterprise</span>
                                    </div>
                                ` : ''}
                                ${plan.id === 'exclusive' ? `
                                    <div class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 rounded-full shadow-xs">
                                        <img src="/exclusiveimage.png" onerror="if(window.EXCLUSIVE_DIAMOND_DATA){this.src=window.EXCLUSIVE_DIAMOND_DATA;}else{this.src='exclusiveimage.png';}" class="w-4 h-4 object-contain" alt="Exclusive">
                                        <span class="text-[10px] font-black text-amber-900 dark:text-amber-300 uppercase tracking-wider">Exclusive</span>
                                    </div>
                                ` : ''}
                                ${plan.id === 'starter' ? `
                                    <div class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-600 rounded-full shadow-xs">
                                        <span class="text-[10px] font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">Starter</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>

                        <!-- Dual Pricing Section (Clean, Non-overlapping Box) -->
                        <div class="bg-gray-50/90 dark:bg-gray-750/70 rounded-2xl p-3.5 mb-4 border border-gray-200/60 dark:border-gray-700/60 space-y-2.5">
                            <!-- Monthly Rate -->
                            <div class="flex items-center justify-between gap-2">
                                <div class="flex items-baseline gap-1">
                                    <span class="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight">TZS ${plan.monthlyPriceNum.toLocaleString()}</span>
                                    <span class="text-xs font-bold text-gray-400 dark:text-gray-400">/ mo</span>
                                </div>
                                <span class="text-[9px] font-extrabold text-gray-600 dark:text-gray-300 uppercase tracking-wider bg-gray-200/80 dark:bg-gray-600/60 px-2 py-0.5 rounded-md shrink-0">Monthly</span>
                            </div>

                            <div class="h-px bg-gray-200/80 dark:bg-gray-600/50"></div>

                            <!-- Annual Rate with Percentage Discount -->
                            <div class="space-y-1">
                                <div class="flex items-center justify-between gap-2">
                                    <div class="flex items-baseline gap-1">
                                        <span class="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 tracking-tight">TZS ${plan.annualPriceNum.toLocaleString()}</span>
                                        <span class="text-[11px] font-bold text-indigo-500/80 dark:text-indigo-300/80">/ yr</span>
                                    </div>
                                    <span class="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[9px] font-black uppercase tracking-wider rounded-md border border-emerald-200 dark:border-emerald-800/80 shrink-0">
                                        ${plan.annualDiscountPercent}% OFF
                                    </span>
                                </div>
                                <div class="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-400">
                                    <span class="line-through">TZS ${plan.annualBasePriceNum.toLocaleString()}</span>
                                    <span>·</span>
                                    <span class="font-semibold text-gray-600 dark:text-gray-300">${plan.annualEffectiveMonthly}</span>
                                </div>
                            </div>
                        </div>

                        <!-- Plan Feature Checklist -->
                        <ul class="space-y-2 mb-5">
                            ${plan.features.map(f => `
                                <li class="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300 font-medium leading-snug">
                                    <div class="w-4 h-4 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center shrink-0 mt-0.5">
                                        <i data-lucide="check" class="w-2.5 h-2.5 text-emerald-500"></i>
                                    </div>
                                    <span>${window.t(f.toLowerCase().replace(/ /g, '_').replace(/[^a-z0-9_]/g, ''), f)}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>

                    <!-- Separate Dual Pricing Action Buttons -->
                    <div class="space-y-2 pt-3 border-t border-gray-100 dark:border-gray-700/60 shrink-0 mt-auto">
                        <!-- Pay Annually Button (Primary Highlight) -->
                        <button
                            onclick="initiateSnippeCheckout('${plan.id}', '${plan.name}', '${plan.annualPrice}', 'annual')"
                            class="w-full py-2.5 px-3 rounded-xl font-black text-xs transition-all flex items-center justify-between gap-1.5 shadow-sm active:scale-98 cursor-pointer ${
                                isCurrent 
                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed shadow-none' 
                                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/20'
                            }"
                            ${isCurrent ? 'disabled' : ''}
                        >
                            <span class="flex items-center gap-1.5 truncate">
                                <i data-lucide="${isCurrent ? 'check-circle' : 'sparkles'}" class="w-3.5 h-3.5 ${isCurrent ? 'text-gray-400' : 'text-indigo-200'} shrink-0"></i>
                                <span class="truncate">${isCurrent ? 'Current Plan (12 Mos)' : 'Pay Annually (12 Mos)'}</span>
                            </span>
                            <span class="text-[9px] font-extrabold ${isCurrent ? 'bg-gray-200 dark:bg-gray-600 text-gray-500' : 'bg-white/25 text-white'} px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap">
                                Save TZS ${plan.annualSavingsNum.toLocaleString()}
                            </span>
                        </button>

                        <!-- Pay Monthly Button -->
                        <button
                            onclick="initiateSnippeCheckout('${plan.id}', '${plan.name}', '${plan.monthlyPrice}', 'monthly')"
                            class="w-full py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 active:scale-98 cursor-pointer ${
                                isCurrent 
                                    ? 'bg-gray-50 dark:bg-gray-800 text-gray-400 cursor-not-allowed border border-gray-200 dark:border-gray-700' 
                                    : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 border border-gray-200/60 dark:border-gray-600'
                            }"
                            ${isCurrent ? 'disabled' : ''}
                        >
                            <span>Pay Monthly (TZS ${plan.monthlyPriceNum.toLocaleString()})</span>
                        </button>
                    </div>
                </div>
            `;
        });

        html += `
            </div>

            <!-- Custom Enterprise Inquiries Banner -->
            <div class="p-3.5 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200/70 dark:border-gray-700/70 text-center flex flex-col sm:flex-row items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>Need custom branch limits, dedicated infrastructure, or higher-tier enterprise SLA?</span>
                <button type="button" onclick="typeof window.openSupportTicketModal === 'function' ? window.openSupportTicketModal() : (typeof window.switchView === 'function' && window.switchView('feedback'))" class="font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer bg-transparent border-0 p-0">
                    Contact Enterprise Support →
                </button>
            </div>

            <div class="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-6 text-center border border-gray-100 dark:border-gray-700">
                <i data-lucide="shield-check" class="w-6 h-6 text-emerald-500 mx-auto mb-2"></i>
                <p class="text-sm font-semibold text-gray-900 dark:text-gray-100">${window.t('secure_payments_title', 'Secure Payments by Snippe')}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">${window.t('secure_payments_sub', 'All transactions are processed securely through Snippe. We do not store your mobile money or credit card information on our servers.')}</p>
            </div>
        </div>`;

        container.innerHTML = html;
        if (window.lucide) window.lucide.createIcons();

    } catch (err) {
        console.error(err);
        container.innerHTML = `
        <div class="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-red-100 dark:border-red-900/30">
            <i data-lucide="alert-triangle" class="w-12 h-12 text-red-500 mx-auto mb-4 opacity-50"></i>
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">Could not load billing information</h3>
            <p class="text-gray-500 dark:text-gray-400 mt-2">${err.message}</p>
        </div>`;
        if (window.lucide) window.lucide.createIcons();
    }
}

export async function initiateSnippeCheckout(planId, planName, planPrice, billingCycle = 'monthly') {
    const ownerId = state.ownerId || state.currentUserUuid;
    if (!ownerId) return;
    let profile = state.profile || {};

    // 1. Visual confirmation modal for Annual plan commitments
    if (billingCycle === 'annual') {
        const confirmedAnnual = await new Promise(resolve => {
            const modal = document.getElementById('modalOverlay');
            const content = document.getElementById('modalContent');
            if (!modal || !content) { resolve(true); return; }

            content.innerHTML = `
            <div class="p-6 text-center max-w-sm mx-auto">
                <div class="w-12 h-12 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-inner">
                    <i data-lucide="alert-circle" class="w-6 h-6"></i>
                </div>
                <h3 class="text-lg font-black text-gray-900 dark:text-white mb-1.5">Annual Plan Commitment</h3>
                <div class="text-xs text-gray-600 dark:text-gray-300 mb-5 leading-relaxed bg-amber-50/50 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100 dark:border-amber-800/40 text-left space-y-2">
                    <p>
                        You are selecting the <strong>${planName} Annual Plan</strong> for <strong>12 full months of uninterrupted access</strong>.
                    </p>
                    <p class="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                        ⚠️ Please note: If you decide to upgrade to a higher tier plan later during this 12-month period, your current plan cannot be pro-rated or transferred.
                    </p>
                </div>

                <div class="flex gap-2">
                    <button id="btnAnnualCancel" class="flex-1 py-2.5 text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors">
                        Cancel
                    </button>
                    <button id="btnAnnualProceed" class="flex-1 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all">
                        Proceed to Payment
                    </button>
                </div>
            </div>
            `;

            if (window.lucide) window.lucide.createIcons();
            modal.classList.remove('hidden');

            const cleanup = () => modal.classList.add('hidden');

            document.getElementById('btnAnnualCancel').onclick = () => { cleanup(); resolve(false); };
            document.getElementById('btnAnnualProceed').onclick = () => { cleanup(); resolve(true); };
        });

        if (!confirmedAnnual) return;
    }

    let phone = profile.mobile_number || profile.phone || '';

    // If phone number is missing, prompt user inline for fast checkout
    if (!phone) {
        phone = await new Promise(resolve => {
            const modal = document.getElementById('modalOverlay');
            const content = document.getElementById('modalContent');
            if (!modal || !content) { resolve(null); return; }

            content.innerHTML = `
            <div class="p-6 text-center max-w-sm mx-auto">
                <div class="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <i data-lucide="phone" class="w-6 h-6"></i>
                </div>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white mb-1">Phone Number Required</h3>
                <p class="text-xs text-gray-500 mb-4">Please enter your phone number to proceed with Snippe payment.</p>

                <input type="tel" id="checkoutPhoneInput" placeholder="07XXXXXXXX or +255..."
                    class="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-indigo-500 mb-4 outline-none">

                <div class="flex gap-2">
                    <button id="btnPhoneCancel" class="flex-1 py-2 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-xl">Cancel</button>
                    <button id="btnPhoneSubmit" class="flex-1 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md">Continue</button>
                </div>
            </div>
            `;

            if (window.lucide) window.lucide.createIcons();
            modal.classList.remove('hidden');

            const cleanup = () => modal.classList.add('hidden');

            document.getElementById('btnPhoneCancel').onclick = () => { cleanup(); resolve(null); };
            document.getElementById('btnPhoneSubmit').onclick = async () => {
                const val = document.getElementById('checkoutPhoneInput')?.value.trim();
                if (!val) { if (typeof showToast === 'function') showToast('Please enter a valid phone number', 'warning'); return; }
                cleanup();
                try {
                    await dbProfile.upsert(ownerId, { mobile_number: val });
                    if (state.profile) state.profile.mobile_number = val;
                } catch(e) {}
                resolve(val);
            };
        });

        if (!phone) return;
    }

    const linkMap = {
        starter: {
            monthly: 'https://snippe.me/pay/bms-starter-plan',
            annual: 'https://snippe.me/pay/bmstz-starter-annual'
        },
        enterprise: {
            monthly: 'https://snippe.me/pay/bms-enterprise-plan',
            annual: 'https://snippe.me/pay/bmstz-enterprise-annual'
        },
        exclusive: {
            monthly: 'https://snippe.me/pay/bms-exclusive-plan',
            annual: 'https://snippe.me/pay/bmstz-exclusive-annual-plan'
        }
    };

    const planLinks = linkMap[planId];
    const baseUrl = planLinks ? planLinks[billingCycle] || planLinks.monthly : null;
    if (!baseUrl) {
        showToast('Invalid plan selection.', 'error');
        return;
    }

    const paymentMethod = await new Promise(resolve => {
        const modal = document.getElementById('modalOverlay');
        const content = document.getElementById('modalContent');

        content.innerHTML = `
        <div class="p-6 text-center max-w-sm mx-auto">
            <h3 class="text-xl font-bold text-gray-900 mb-2">Select Payment Method</h3>
            <p class="text-xs text-gray-500 mb-6">Choose your preferred way to pay to proceed to checkout.</p>

            <div class="grid grid-cols-2 gap-3">
                <button id="btnPayCard" class="flex flex-col items-center gap-3 p-4 bg-white border border-gray-200 hover:border-indigo-500 rounded-xl hover:bg-indigo-50 transition-colors group">
                    <div class="w-10 h-10 bg-gray-50 group-hover:bg-indigo-100 rounded-full flex items-center justify-center transition-colors">
                        <i data-lucide="credit-card" class="w-5 h-5 text-gray-500 group-hover:text-indigo-600 transition-colors"></i>
                    </div>
                    <span class="text-sm font-bold text-gray-700 group-hover:text-indigo-700">Card</span>
                </button>
                <button id="btnPayMobile" class="flex flex-col items-center gap-3 p-4 bg-white border border-gray-200 hover:border-indigo-500 rounded-xl hover:bg-indigo-50 transition-colors group">
                    <div class="w-10 h-10 bg-gray-50 group-hover:bg-indigo-100 rounded-full flex items-center justify-center transition-colors">
                        <i data-lucide="smartphone" class="w-5 h-5 text-gray-500 group-hover:text-indigo-600 transition-colors"></i>
                    </div>
                    <span class="text-sm font-bold text-gray-700 group-hover:text-indigo-700">Mobile Money</span>
                </button>
            </div>

            <button id="btnPayCancel" class="mt-6 text-gray-400 hover:text-gray-600 text-sm font-semibold hover:underline">Cancel</button>
        </div>
        `;

        if (window.lucide) window.lucide.createIcons();
        modal.classList.remove('hidden');

        const cleanup = () => {
            modal.classList.add('hidden');
        };

        document.getElementById('btnPayCancel').onclick = () => { cleanup(); resolve(null); };
        document.getElementById('btnPayCard').onclick = () => { cleanup(); resolve('card'); };
        document.getElementById('btnPayMobile').onclick = () => { cleanup(); resolve('mobile'); };
    });

    if (!paymentMethod) {
        return;
    }

    const metadata = {
        ownerId: ownerId,
        planId: planId,
        billingCycle: billingCycle,
        customerPhone: profile.mobile_number || profile.phone || '',
        paymentMethod: paymentMethod
    };
    const metaBase64 = btoa(JSON.stringify(metadata));

    const finalUrl = `${baseUrl}?meta=${metaBase64}&redirect_url=${window.location.origin}/app/`;

    const btn = document.querySelector(`button[onclick*="'${planId}'"][onclick*="'${billingCycle}'"]`) || document.querySelector(`button[onclick*="'${planId}'"]`);
    if (btn) {
        btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Redirecting to Snippe...';
        btn.disabled = true;
        if (window.lucide) window.lucide.createIcons();
    }

    showToast('Redirecting to secure payment portal...', 'info');

    setTimeout(() => {
        window.location.href = finalUrl;
    }, 1000);
}

export async function cancelSubscription() {
    const ownerId = state.ownerId || state.currentUserUuid;
    if (!ownerId) return;

    const confirmed = await confirmModal(
        'Cancel Subscription?',
        'Are you sure you want to cancel your active subscription? You will be reverted to a limited-time trial state.',
        'Yes, Cancel',
        'Keep My Plan',
        'bg-red-600 hover:bg-red-700'
    );

    if (!confirmed) return;

    showLoader('Processing cancellation...');

    try {
        const trialEndsAt = new Date();
        trialEndsAt.setHours(trialEndsAt.getHours() + 24);

        await dbProfile.upsert(ownerId, {
            plan: 'free_trial',
            trial_ends_at: trialEndsAt.toISOString()
        });

        await dbBilling.logAction({
            owner_id: ownerId,
            event_type: 'cancelled',
            previous_plan: state.profile?.plan || 'unknown',
            new_plan: 'free_trial',
            mrr_change: 0
        });


        if (state.profile) {
            state.profile.plan = 'free_trial';
            state.profile.trial_ends_at = trialEndsAt.toISOString();
        }

        showToast('Subscription cancelled successfully. You have a 24-hour grace period.', 'success');

        setTimeout(() => renderOwnerBilling(), 200);

    } catch (err) {
        console.error('Cancellation failed:', err);
        showToast('Failed to cancel subscription: ' + err.message, 'error');
    } finally {
        hideLoader();
    }
}

export function setPaymentMethod(method) {
    state.paymentMethod = method;
    renderOwnerBilling();
}

window.renderOwnerBilling = renderOwnerBilling;
window.setPaymentMethod = setPaymentMethod;
window.cancelSubscription = cancelSubscription;
window.initiateSnippeCheckout = initiateSnippeCheckout;
