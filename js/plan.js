
export function getPlan() {
    const entitlements = state.entitlements;
    const profile = state.profile || (state.role === 'branch' ? state.branchProfile : null);
    const profilePlan = (profile?.plan || '').toLowerCase();
    
    // Server-verified Supabase RPC Entitlements
    if (entitlements && typeof entitlements === 'object') {
        const isBranchRole = state.role === 'branch';
        const isTrialExpired = !!entitlements.is_trial_expired;
        const isSkippedTrial = !!entitlements.is_skipped_trial;
        const isExpired = !isBranchRole && (isTrialExpired || isSkippedTrial);
        const resolvedPlanId = (profilePlan && ['enterprise', 'exclusive', 'starter'].includes(profilePlan))
            ? profilePlan
            : (entitlements.plan_id || 'free_trial').toLowerCase();
        const isPaid = ['enterprise', 'exclusive', 'starter'].includes(resolvedPlanId) || !!entitlements.is_paid;
        const isTrial = !isPaid && !!entitlements.is_trial;

        return {
            id: resolvedPlanId,
            billingCycle: entitlements.billing_cycle || profile?.billing_cycle || 'monthly',
            subscriptionExpiresAt: entitlements.subscription_expires_at ? new Date(entitlements.subscription_expires_at) : (profile?.subscription_expires_at ? new Date(profile.subscription_expires_at) : null),
            isActive: !!entitlements.is_active || isPaid,
            isExpired: isPaid ? false : isExpired,
            isTrial: isTrial,
            isTrialActive: isTrial && !!entitlements.is_trial_active,
            isTrialExpired: isTrial && isTrialExpired,
            isSkippedTrial: isSkippedTrial,
            isPaid: isPaid,
            daysLeft: isTrial && entitlements.is_trial_active && entitlements.trial_ends_at ? Math.max(0, Math.ceil((new Date(entitlements.trial_ends_at) - new Date()) / 86400000)) : 0,
            daysSinceExpiry: isTrial && isTrialExpired && entitlements.trial_ends_at ? Math.max(0, Math.floor((new Date() - new Date(entitlements.trial_ends_at)) / 86400000)) : 0,
            trialEnds: entitlements.trial_ends_at ? new Date(entitlements.trial_ends_at) : (profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null),
            maxBranches: entitlements.max_branches !== undefined ? entitlements.max_branches : (resolvedPlanId === 'starter' ? 3 : (resolvedPlanId === 'enterprise' ? 10 : null)),
            branchCount: entitlements.branch_count || (state.branches || []).length,
            isProfileLoading: false
        };
    }

    // Direct fallback from profile while entitlements RPC loads or offline
    const planId = (profile?.plan || 'free_trial').toLowerCase();
    const isPaidPlan = ['enterprise', 'exclusive', 'starter'].includes(planId);
    const isTrial = !isPaidPlan;
    const trialEnds = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
    const subExpires = profile?.subscription_expires_at ? new Date(profile.subscription_expires_at) : null;
    const isSubActive = isPaidPlan && (!subExpires || subExpires > new Date());
    const isSubExpired = isPaidPlan && subExpires && subExpires <= new Date();
    const isTrialActive = isTrial && (!trialEnds || trialEnds > new Date());
    const isTrialExpired = isTrial && trialEnds && trialEnds <= new Date();

    return {
        id: planId,
        billingCycle: profile?.billing_cycle || 'monthly',
        subscriptionExpiresAt: subExpires,
        isActive: isPaidPlan ? isSubActive : isTrialActive,
        isExpired: isPaidPlan ? isSubExpired : isTrialExpired,
        isTrial: isTrial,
        isTrialActive: isTrialActive,
        isTrialExpired: isTrialExpired,
        isSkippedTrial: false,
        isPaid: isPaidPlan,
        daysLeft: isTrial ? (trialEnds && isTrialActive ? Math.max(0, Math.ceil((trialEnds - new Date()) / 86400000)) : 14) : (subExpires && isSubActive ? Math.max(0, Math.ceil((subExpires - new Date()) / 86400000)) : 0),
        daysSinceExpiry: isTrial ? (trialEnds && isTrialExpired ? Math.max(0, Math.floor((new Date() - trialEnds) / 86400000)) : 0) : (subExpires && isSubExpired ? Math.max(0, Math.floor((new Date() - subExpires) / 86400000)) : 0),
        trialEnds: trialEnds,
        maxBranches: isPaidPlan ? (planId === 'starter' ? 3 : (planId === 'enterprise' ? 10 : null)) : 3,
        branchCount: (state.branches || []).length,
        isProfileLoading: !profile
    };
}

export function hasFeature(feature) {
    const entitlements = state.entitlements;
    // Pure Supabase RPC & IndexedDB cache check: Only enable if verified by server or local IndexedDB cache
    if (entitlements && typeof entitlements === 'object' && Array.isArray(entitlements.features)) {
        if (!entitlements.is_active) return false;
        return entitlements.features.includes(feature);
    }
    // Default Deny: If Supabase fails to respond or is delayed, and feature is not in IndexedDB cache, disable it.
    return false;
}

export function getPlanMaxBranches() {
    const entitlements = state.entitlements;
    if (entitlements && entitlements.max_branches !== undefined) {
        return entitlements.max_branches === null ? Infinity : Number(entitlements.max_branches);
    }
    return 3;
}

export function checkPlanAccess() {
    const plan = getPlan();
    state.planExpired = plan.isExpired;
    state.planInfo    = plan;
    return plan;
}

export function renderOwnerPaywall() {
    const plan = getPlan();

    // ── Skipped-trial paywall: user explicitly opted out of the free trial ────
    if (plan.isSkippedTrial) {
        return `
        <div class="flex flex-col items-center justify-center min-h-[70vh] text-center px-6 py-20 slide-in">
            <div class="w-20 h-20 bg-indigo-50 rounded-3xl flex items-center justify-center mb-6 mx-auto shadow-lg shadow-indigo-500/10">
                <i data-lucide="credit-card" class="w-10 h-10 text-indigo-500"></i>
            </div>
            <div class="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest mb-4">
                <i data-lucide="zap" class="w-3 h-3"></i>
                Payment Required
            </div>
            <h2 class="text-2xl font-black text-gray-900 dark:text-white mb-3">You skipped the free trial</h2>
            <p class="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-2 leading-relaxed">
                You chose to skip the free trial during registration. Please select a subscription plan to activate your account and get full access.
            </p>
            <p class="text-xs text-gray-400 mb-8">Your account is ready — just one step away from full access.</p>
            <button onclick="switchView('settings'); setTimeout(() => { if(typeof switchSettingsTab==='function') switchSettingsTab('security'); }, 150);"
                class="btn-primary px-10 py-4 text-base font-black rounded-2xl shadow-lg shadow-indigo-500/20 mb-4">
                <i data-lucide="credit-card" class="w-5 h-5 inline mr-2"></i>
                Choose a Plan
            </button>
            <p class="text-xs text-gray-400">Plans start from TZS 5,000/mo &nbsp;·&nbsp; Cancel anytime</p>
        </div>`;
    }

    // ── Expired-trial paywall: user's 7-day trial has lapsed ─────────────────
    const daysSince = plan.daysSinceExpiry;
    return `
    <div class="flex flex-col items-center justify-center min-h-[70vh] text-center px-6 py-20 slide-in">
        <div class="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mb-6 mx-auto shadow-lg shadow-amber-500/10">
            <i data-lucide="lock" class="w-10 h-10 text-amber-500"></i>
        </div>
        <div class="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-black uppercase tracking-widest mb-4">
            <i data-lucide="alert-circle" class="w-3 h-3"></i>
            Subscription Required
        </div>
        <h2 class="text-2xl font-black text-gray-900 dark:text-white mb-3">Your free trial has ended</h2>
        <p class="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-2 leading-relaxed">
            Your 7-day trial expired ${daysSince > 0 ? `${daysSince} day${daysSince !== 1 ? 's' : ''} ago` : 'today'}.
            Your data is safe — choose a plan to restore full access.
        </p>
        <p class="text-xs text-gray-400 mb-8">All your branches, inventory, sales records, and staff data are preserved.</p>
        <button onclick="switchView('settings'); setTimeout(() => { if(typeof switchSettingsTab==='function') switchSettingsTab('security'); }, 150);"
            class="btn-primary px-10 py-4 text-base font-black rounded-2xl shadow-lg shadow-indigo-500/20 mb-4">
            <i data-lucide="credit-card" class="w-5 h-5 inline mr-2"></i>
            Choose a Plan
        </button>
        <p class="text-xs text-gray-400">Plans start from TZS 5,000/mo &nbsp;·&nbsp; Cancel anytime</p>
    </div>`;
}

export function renderBranchBillingRequired() {
    return `
    <div class="flex flex-col items-center justify-center min-h-[70vh] text-center px-6 py-20 slide-in">
        <div class="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6 mx-auto shadow-lg shadow-red-500/10">
            <i data-lucide="credit-card" class="w-10 h-10 text-red-500"></i>
        </div>
        <div class="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-black uppercase tracking-widest mb-4">
            <i data-lucide="alert-triangle" class="w-3 h-3"></i>
            Billing Required
        </div>
        <h2 class="text-2xl font-black text-gray-900 dark:text-white mb-3">Account Suspended</h2>
        <p class="text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6 leading-relaxed">
            This branch is currently suspended because the business owner subscription has expired or is unpaid.
        </p>
        <p class="text-sm font-bold text-gray-600 dark:text-gray-300 mb-8">
            Please contact your business administrator to resolve the billing issue.
        </p>
        <div class="flex items-center gap-2 px-4 py-3 bg-amber-50 rounded-2xl border border-amber-100 text-sm text-amber-700 max-w-xs mx-auto">
            <i data-lucide="info" class="w-4 h-4 flex-shrink-0"></i>
            Your data is safe and will be accessible once billing is resolved.
        </div>
    </div>`;
}

export function renderFeatureLock(featureName, requiredPlan = 'Enterprise') {
    const featureTitle = window.t('advanced_charts_title', featureName);
    const featureDesc = window.t('advanced_charts_desc', `Upgrade to ${requiredPlan} or higher to unlock this feature.`);
    return `
    <div class="flex flex-col items-center justify-center py-16 px-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50/50 dark:bg-gray-800/30">
        <div class="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center mb-4 mx-auto">
            <i data-lucide="lock" class="w-7 h-7 text-indigo-400"></i>
        </div>
        <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-widest rounded-full mb-3 shadow-xs">
            <img src="/${requiredPlan.toLowerCase() === 'exclusive' ? 'exclusiveimage.png' : 'enterpriseimage.png'}" onerror="if(window.${requiredPlan.toLowerCase() === 'exclusive' ? 'EXCLUSIVE' : 'ENTERPRISE'}_DIAMOND_DATA){this.src=window.${requiredPlan.toLowerCase() === 'exclusive' ? 'EXCLUSIVE' : 'ENTERPRISE'}_DIAMOND_DATA;}else{this.src='${requiredPlan.toLowerCase() === 'exclusive' ? 'exclusiveimage.png' : 'enterpriseimage.png'}';}" class="w-3.5 h-3.5 object-contain inline-block drop-shadow-sm" alt="${requiredPlan}">
            <span>${window.t('enterprise_feature', `${requiredPlan.toUpperCase()}+ FEATURE`)}</span>
        </span>
        <h3 class="text-base font-black text-gray-900 dark:text-white mb-2">${featureTitle}</h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-5 max-w-xs">
            ${featureDesc}
        </p>
        <button onclick="switchView('settings'); setTimeout(() => { if(typeof switchSettingsTab==='function') switchSettingsTab('security'); }, 150);"
            class="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-500/20">
            <i data-lucide="zap" class="w-4 h-4"></i>
            ${window.t('upgrade_plan', 'Upgrade Plan')}
        </button>
    </div>`;
}
