/**
 * Global Desktop "Go To" Navigator & Command Palette
 * Triggered via Top Nav Bar or Keyboard Shortcut '/' (or Ctrl+K / Cmd+K)
 * Deeply scoped and role-filtered for Owner, Branch, and Sysadmin.
 */

import { state } from '../state.js';

let isNavigatorOpen = false;
let currentQuery = '';
let activeIndex = 0;
let filteredItems = [];

/**
 * Generates the full index of navigation targets & deep actions based on the active role.
 */
export function getNavigatorItems() {
    const role = (state.role || '').toLowerCase();
    const items = [];

    if (role === 'sysadmin') {
        items.push(
            { category: 'Admin Modules', title: 'System Dashboard', subtitle: 'Overview metrics & tenant health', icon: 'layout-dashboard', keywords: 'home admin stats kpi', action: () => window.switchView?.('sysadmin-dashboard') },
            { category: 'Admin Modules', title: 'Site Controls & Maintenance', subtitle: 'Global configurations & broadcast banners', icon: 'sliders', keywords: 'controls maintenance broadcast toggle', action: () => window.switchView?.('sysadmin-controls') },
            { category: 'Admin Modules', title: 'User Maintenance & Tenants', subtitle: 'Manage tenants, businesses & user accounts', icon: 'users', keywords: 'tenants businesses accounts owners', action: () => window.switchView?.('sysadmin-users') },
            { category: 'Admin Modules', title: 'Support Tickets & Helpdesk', subtitle: 'Live customer issues & response portal', icon: 'help-circle', keywords: 'tickets issues help assistance', action: () => window.switchView?.('sysadmin-tickets') },
            { category: 'Admin Modules', title: 'Communications Hub', subtitle: 'Push broadcasts, SMS, & direct announcements', icon: 'radio', keywords: 'notifications push broadcast announcements', action: () => window.switchView?.('sysadmin-communications') },
            { category: 'Admin Modules', title: 'Feedback & Survey Engine', subtitle: 'User NPS, CSAT, & system feedback responses', icon: 'clipboard-check', keywords: 'feedback survey nps responses rating', action: () => window.switchView?.('sysadmin-surveys') },
            { category: 'Admin Modules', title: 'Security & Lockout Manager', subtitle: 'Failed logins, IP blocks & security audit', icon: 'shield-alert', keywords: 'security ban block lockout ips', action: () => window.switchView?.('sysadmin-security') },
            { category: 'Admin Modules', title: 'Revenue & Subscription Analytics', subtitle: 'MRR, ARR, churn, & billing metrics', icon: 'trending-up', keywords: 'revenue money mrr billing subscriptions', action: () => window.switchView?.('sysadmin-revenue') },
            { category: 'Admin Modules', title: 'Tenant System Health', subtitle: 'Database performance & real-time monitoring', icon: 'activity', keywords: 'health performance db latency uptime', action: () => window.switchView?.('sysadmin-health') },
            { category: 'Admin Modules', title: 'Feature Flags & Rollouts', subtitle: 'Manage platform capabilities & betas', icon: 'toggle-right', keywords: 'flags features rollout beta', action: () => window.switchView?.('sysadmin-flags') },
            { category: 'Admin Modules', title: 'Compliance & Audit Vault', subtitle: 'GDPR, logs & data retention policies', icon: 'database', keywords: 'vault compliance gdpr data logs', action: () => window.switchView?.('sysadmin-vault') },
            { category: 'Admin Modules', title: 'Pricing & Subscription Plans', subtitle: 'Plan tiers, add-ons, & pricing limits', icon: 'credit-card', keywords: 'pricing plans tiers packages', action: () => window.switchView?.('sysadmin-pricing') },
            { category: 'Admin Modules', title: 'Platform Audit Logs', subtitle: 'Full immutable system log history', icon: 'scroll-text', keywords: 'audit logs tracking history', action: () => window.switchView?.('sysadmin-audit') }
        );
        return items;
    }

    if (role === 'branch' || role === 'cashier') {
        // Core Branch Views
        items.push(
            { category: 'Main Navigation', title: 'Branch Dashboard', subtitle: 'Today\'s performance, top sales & summary', icon: 'home', keywords: 'overview home summary stats kpi', action: () => window.switchView?.('dashboard') },
            { category: 'Main Navigation', title: 'POS / Sales Terminal', subtitle: 'Create invoices, receipts & checkout customers', icon: 'shopping-cart', keywords: 'pos sales sell register invoice receipt checkout', action: () => window.switchView?.('sales') },
            { category: 'Main Navigation', title: 'Branch Inventory', subtitle: 'View stock levels, barcodes & search items', icon: 'package', keywords: 'stock items products catalog barcode', action: () => window.switchView?.('inventory') },
            { category: 'Main Navigation', title: 'Branch Expenses', subtitle: 'Track operational costs, utilities & vouchers', icon: 'credit-card', keywords: 'expenses spending bills costs vouchers', action: () => window.switchView?.('expenses') },
            { category: 'Main Navigation', title: 'Customers Directory', subtitle: 'Customer balances, debts & contact cards', icon: 'users', keywords: 'customers clients debtors debts contacts', action: () => window.switchView?.('customers') },
            { category: 'Main Navigation', title: 'Staff & Team Roster', subtitle: 'View owner assigned branch personnel & attendance', icon: 'user-check', keywords: 'staff employees workers personnel attendance', action: () => window.switchView?.('staff') },
            { category: 'Main Navigation', title: 'Cash Drawer & Shifts', subtitle: 'Opening float, shift reconciliation & cash audit', icon: 'archive', keywords: 'cash drawer float shift closing register', action: () => window.switchView?.('cash_drawer') },
            { category: 'Main Navigation', title: 'Stock Requests & Requisitions', subtitle: 'Request stock from central warehouse', icon: 'truck', keywords: 'transfers dispatch stock request restock', action: () => window.switchView?.('requests') },
            { category: 'Main Navigation', title: 'Returns & Refunds', subtitle: 'Process return sales & damaged item credits', icon: 'rotate-ccw', keywords: 'returns refunds damaged exchange credit', action: () => window.switchView?.('returns') },
            { category: 'Main Navigation', title: 'Quotations & Proformas', subtitle: 'Issue price quotes & proforma invoices', icon: 'file-signature', keywords: 'quotations quotes proforma estimates', action: () => window.switchView?.('quotations') },
            { category: 'Main Navigation', title: 'Tasks & Objectives', subtitle: 'Daily branch assignments & checklist', icon: 'check-square', keywords: 'tasks todo assignments goals', action: () => window.switchView?.('tasks') },
            { category: 'Main Navigation', title: 'Shift Schedule', subtitle: 'View assigned working shifts & timetable', icon: 'calendar-days', keywords: 'shifts schedule timetable roster', action: () => window.switchView?.('shifts') },
            { category: 'Main Navigation', title: 'Internal Messages', subtitle: 'Chat with business owner and other branches', icon: 'message-square', keywords: 'chat messages inbox talk communicate', action: () => window.switchView?.('chat') }
        );

        // Deep Quick Actions for Branch
        items.push(
            { category: 'Quick Actions', title: 'New Sale Checkout', subtitle: 'Open checkout terminal immediately', icon: 'shopping-bag', keywords: 'create new sale pos invoice', action: () => window.switchView?.('sales') },
            { category: 'Quick Actions', title: 'Record Branch Expense', subtitle: 'Open expense entry voucher form', icon: 'plus-circle', keywords: 'add expense cost spending voucher', action: () => { window.switchView?.('expenses'); setTimeout(() => window.openAddExpenseModal?.(), 150); } },
            { category: 'Quick Actions', title: 'Register New Customer', subtitle: 'Add a new client profile & phone number', icon: 'user-plus', keywords: 'add customer client profile', action: () => { window.switchView?.('customers'); setTimeout(() => window.openAddCustomerModal?.(), 150); } },
            { category: 'Quick Actions', title: 'Request Stock Restock', subtitle: 'Send restock request to main warehouse', icon: 'arrow-up-right', keywords: 'restock transfer order stock', action: () => window.switchView?.('requests') }
        );

        // Branch System Settings
        items.push(
            { category: 'Settings & Account', title: 'Branch Settings', subtitle: 'View branch profile, printer & cache settings', icon: 'settings', keywords: 'settings profile printer cache', action: () => window.switchView?.('settings') },
            { category: 'Settings & Account', title: 'Sign Out of Account', subtitle: 'Securely end your current branch session', icon: 'log-out', keywords: 'logout exit signout leave', action: () => window.confirmSignOut ? window.confirmSignOut() : window.logout?.() }
        );

        return items;
    }

    // Default: Business Owner Role (Comprehensive Deep Scope)
    items.push(
        // Core Views
        { category: 'Main Navigation', title: 'Business Overview', subtitle: 'KPIs, total revenue, active branches & recent sales', icon: 'layout-dashboard', keywords: 'home overview dashboard revenue analytics stats kpi', action: () => window.switchView?.('overview') },
        { category: 'Main Navigation', title: 'Branches & Locations', subtitle: 'Manage all branch outlets, codes & locations', icon: 'git-branch', keywords: 'branches outlets shops stores locations', action: () => window.switchView?.('branches') },
        { category: 'Main Navigation', title: 'Analytics & AI Insights', subtitle: 'Strategic intelligence, revenue trends & predictive AI', icon: 'bar-chart-3', keywords: 'analytics charts reports graphs artificial intelligence ai', action: () => window.switchView?.('analytics') },
        { category: 'Main Navigation', title: 'Central Inventory Catalog', subtitle: 'Master products, categories, barcoding & stock levels', icon: 'package-search', keywords: 'inventory products items catalog master warehouse stock', action: () => window.switchView?.('central_inventory') },
        { category: 'Main Navigation', title: 'Central Dispatch Hub', subtitle: 'Batch dispatch stock from Central Warehouse directly to any branch', icon: 'truck', keywords: 'central dispatch batch stock transfer send restock hub warehouse', action: () => window.openCentralDispatchView?.() },
        { category: 'Main Navigation', title: 'Financial Reports & P&L', subtitle: 'Income statement, revenue, net profit & balance', icon: 'file-bar-chart', keywords: 'finance financial profit loss p&l revenue statement balance', action: () => window.switchView?.('financial_reports') },
        { category: 'Main Navigation', title: 'Capital & Balance Sheet', subtitle: 'Equity injection, working capital & net worth', icon: 'wallet', keywords: 'capital equity money funds balance sheet investments', action: () => window.switchView?.('capital') },
        { category: 'Main Navigation', title: 'Fixed Assets & Maintenance', subtitle: 'Machinery, vehicles, electronics & service schedule', icon: 'box', keywords: 'assets equipment machines depreciation maintenance', action: () => window.switchView?.('assets') },
        { category: 'Main Navigation', title: 'Liabilities & Business Loans', subtitle: 'Debt schedules, creditors, interest & repayments', icon: 'landmark', keywords: 'loans liabilities debts credit borrowing banks repayment', action: () => window.switchView?.('business_loans') },
        { category: 'Main Navigation', title: 'Approval Queue & Requests', subtitle: 'Authorize price overrides, transfers & vouchers', icon: 'shield-check', keywords: 'approval queue requests pending verify authorize', action: () => window.switchView?.('requests') },
        { category: 'Main Navigation', title: 'Staff Management & HR', subtitle: 'Staff accounts, roles, access pins & salaries', icon: 'user-check', keywords: 'staff employees workers hr personnel team cashiers', action: () => window.switchView?.('staff') },
        { category: 'Main Navigation', title: 'Suppliers & Purchase Orders', subtitle: 'Vendor directory, supplier debts & purchase orders', icon: 'truck', keywords: 'suppliers vendors purchase orders po supply procurement', action: () => window.switchView?.('suppliers') },
        { category: 'Main Navigation', title: 'Quotations & Invoicing', subtitle: 'Issue official quotations & track customer acceptance', icon: 'file-signature', keywords: 'quotations quotes proforma estimates billing invoice', action: () => window.switchView?.('quotations') },
        { category: 'Main Navigation', title: 'Stock Ledger & Audit Log', subtitle: 'Immutable stock adjustments, dispatches & audit trail', icon: 'history', keywords: 'stock ledger audit trail history movements shrinkages', action: () => window.switchView?.('stock_movements') },
        { category: 'Main Navigation', title: 'Payroll & Compensation', subtitle: 'Monthly employee payroll, deductions & bonuses', icon: 'wallet', keywords: 'payroll salary salaries wages compensation payouts', action: () => window.switchView?.('payroll') },
        { category: 'Main Navigation', title: 'Promotions & Discounts', subtitle: 'Discount campaigns, coupon codes & seasonal deals', icon: 'tag', keywords: 'promotions promo discounts coupons marketing sales deals', action: () => window.switchView?.('promotions') },
        { category: 'Main Navigation', title: 'Goals & Targets (KPIs)', subtitle: 'Monthly branch revenue goals & performance metrics', icon: 'target', keywords: 'goals kpis targets quotas performance objectives', action: () => window.switchView?.('goals') },
        { category: 'Main Navigation', title: 'Shift Schedules & Roster', subtitle: 'Organize branch working hours & employee shifts', icon: 'calendar-days', keywords: 'shifts schedule roster timetable work hours attendance', action: () => window.switchView?.('shifts') },
        { category: 'Main Navigation', title: 'Company Announcements', subtitle: 'Broadcast notices to all staff & branches', icon: 'megaphone', keywords: 'announcements notices broadcast news memo', action: () => window.switchView?.('announcements') },
        { category: 'Main Navigation', title: 'System Security & Audit Logs', subtitle: 'Tenant activity history, logins & security events', icon: 'scroll-text', keywords: 'audit logs history events activity tracking security', action: () => window.switchView?.('audit') },
        { category: 'Main Navigation', title: 'Direct Messages & Chat', subtitle: 'Internal messaging channel across branches & staff', icon: 'message-square', keywords: 'chat messages inbox talk communication team', action: () => window.switchView?.('chat') },
        { category: 'Main Navigation', title: 'Help & Customer Support', subtitle: 'Submit tickets & get live system assistance', icon: 'help-circle', keywords: 'help support assistance ticket guide contact', action: () => window.switchView?.('feedback') }
    );

    // Deep Actions & Quick Creation (Owner)
    items.push(
        { 
            category: 'Quick Actions & Creation', 
            title: 'Add New Branch Outlet', 
            subtitle: 'Create a new branch location, assign manager & credentials', 
            icon: 'plus-circle', 
            keywords: 'add branch new store create location outlet', 
            action: () => { 
                window.switchView?.('branches'); 
                setTimeout(() => window.openAddBranchModal?.(), 150); 
            } 
        },
        { 
            category: 'Quick Actions & Creation', 
            title: 'Add New Staff Member', 
            subtitle: 'Register employee, assign branch, role & PIN code', 
            icon: 'user-plus', 
            keywords: 'add staff create employee new worker hire user', 
            action: () => { 
                window.switchView?.('staff'); 
                setTimeout(() => window.openAddStaffModal?.(), 150); 
            } 
        },
        { 
            category: 'Quick Actions & Creation', 
            title: 'Create Official Quotation', 
            subtitle: 'Draft a price quotation with custom items & customer info', 
            icon: 'file-plus', 
            keywords: 'new quotation create quote proforma draft estimate', 
            action: () => { 
                window.switchView?.('quotations'); 
                setTimeout(() => window.openNewQuotationModal?.(), 150); 
            } 
        },
        { 
            category: 'Quick Actions & Creation', 
            title: 'Dispatch Stock to Branch', 
            subtitle: 'Send inventory shipments from headquarters to destination branches', 
            icon: 'truck', 
            keywords: 'dispatch send stock transfer restock branch warehouse central', 
            action: () => { 
                window.openCentralDispatchView?.(); 
            } 
        },
        { 
            category: 'Quick Actions & Creation', 
            title: 'Record Capital Injection', 
            subtitle: 'Add cash or equity capital into business balance', 
            icon: 'dollar-sign', 
            keywords: 'add capital record equity invest money funds injection', 
            action: () => { 
                window.switchView?.('capital'); 
                setTimeout(() => window.openAddCapitalModal?.(), 150); 
            } 
        },
        { 
            category: 'Quick Actions & Creation', 
            title: 'Register Fixed Asset', 
            subtitle: 'Add machinery, equipment, electronics or property', 
            icon: 'box', 
            keywords: 'add asset new equipment machine property fixed', 
            action: () => { 
                window.switchView?.('assets'); 
                setTimeout(() => window.openAddAssetModal?.(), 150); 
            } 
        },
        { 
            category: 'Quick Actions & Creation', 
            title: 'Record Business Loan / Debt', 
            subtitle: 'Log commercial loan, creditor, interest & repayment schedule', 
            icon: 'landmark', 
            keywords: 'add loan borrow liability debt credit repayment bank', 
            action: () => { 
                window.switchView?.('business_loans'); 
                setTimeout(() => window.openAddLoanModal?.(), 150); 
            } 
        },
        { 
            category: 'Quick Actions & Creation', 
            title: 'Launch Promotion / Discount Campaign', 
            subtitle: 'Set up percentage or flat discounts for branch items', 
            icon: 'tag', 
            keywords: 'create promo new discount coupon sale deal campaign', 
            action: () => { 
                window.switchView?.('promotions'); 
                setTimeout(() => window.openAddPromotionModal?.(), 150); 
            } 
        },
        { 
            category: 'Quick Actions & Creation', 
            title: 'Export Full Business Data Report (PDF)', 
            subtitle: 'Compile comprehensive multi-section PDF summary across all branches', 
            icon: 'file-text', 
            keywords: 'export pdf download report full business backup archive print', 
            action: () => window.downloadFullBusinessDataArchive?.() 
        },
        { 
            category: 'Quick Actions & Creation', 
            title: 'Cloud Backup Suite & Snapshots', 
            subtitle: 'Create manual cloud backup snapshot and review restore points', 
            icon: 'database', 
            keywords: 'backup snapshot restore vault cloud data export', 
            action: () => window.renderBackupSuite?.() 
        }
    );

    // Settings, Security & Billing (Owner)
    items.push(
        { 
            category: 'Settings & Security', 
            title: 'Business & Profile Settings', 
            subtitle: 'Company name, logo branding, operating hours & currency', 
            icon: 'settings', 
            keywords: 'settings profile branding logo operating hours currency', 
            action: () => { 
                state.settingsTab = 'personal'; 
                window.switchView?.('settings'); 
            } 
        },
        { 
            category: 'Settings & Security', 
            title: 'Change Password & Security (2FA)', 
            subtitle: 'Update login password, request reset link, or toggle 2FA', 
            icon: 'key-round', 
            keywords: 'password change reset security 2fa two factor auth credentials', 
            action: () => { 
                state.settingsTab = 'security'; 
                window.switchView?.('settings'); 
                setTimeout(() => window.togglePasswordChangeForm?.(true), 150); 
            } 
        },
        { 
            category: 'Settings & Security', 
            title: 'Billing & Subscription Plans', 
            subtitle: 'Manage subscription tier, renew plan, M-Pesa / Card checkout', 
            icon: 'credit-card', 
            keywords: 'billing subscription plan upgrade renew payment mpesa card pricing', 
            action: () => { 
                state.settingsTab = 'security'; 
                window.switchView?.('settings'); 
            } 
        },
        { 
            category: 'Settings & Security', 
            title: 'Delete Business Account (30-Day Window)', 
            subtitle: 'Open account deletion request with 30-day recovery grace period', 
            icon: 'trash-2', 
            keywords: 'delete account cancel subscription termination purge grace period', 
            action: () => window.openAccountDeletionModal?.() 
        },
        { 
            category: 'Settings & Security', 
            title: 'Sign Out of Account', 
            subtitle: 'Securely terminate session and return to login', 
            icon: 'log-out', 
            keywords: 'logout exit signout leave session', 
            action: () => window.confirmSignOut ? window.confirmSignOut() : window.logout?.() 
        }
    );

    return items;
}

/**
 * Filter items by user query
 */
export function filterNavigatorItems(query = '') {
    const all = getNavigatorItems();
    const q = query.trim().toLowerCase();
    if (!q) return all;

    return all.filter(item => {
        return (
            item.title.toLowerCase().includes(q) ||
            item.subtitle.toLowerCase().includes(q) ||
            item.category.toLowerCase().includes(q) ||
            (item.keywords && item.keywords.toLowerCase().includes(q))
        );
    });
}

/**
 * Update keyboard highlight without destroying DOM elements
 */
function updateKeyboardSelection(newIndex) {
    const oldEl = document.getElementById(`nav-item-${activeIndex}`);
    if (oldEl) {
        oldEl.classList.remove('bg-indigo-50/90', 'dark:bg-indigo-950/50', 'text-indigo-950', 'dark:text-indigo-100', 'border-indigo-600', 'font-semibold');
        oldEl.classList.add('text-gray-700', 'dark:text-gray-200', 'border-transparent');
        const iconWrap = oldEl.querySelector('.nav-icon-wrap');
        if (iconWrap) {
            iconWrap.classList.remove('bg-indigo-600', 'text-white', 'shadow-sm');
            iconWrap.classList.add('bg-gray-100', 'dark:bg-gray-800', 'text-gray-600', 'dark:text-gray-300');
        }
        const arrow = oldEl.querySelector('.nav-arrow-icon');
        if (arrow) {
            arrow.classList.remove('translate-x-0.5', 'text-indigo-600');
        }
    }

    activeIndex = newIndex;
    const nextEl = document.getElementById(`nav-item-${activeIndex}`);
    if (nextEl) {
        nextEl.classList.add('bg-indigo-50/90', 'dark:bg-indigo-950/50', 'text-indigo-950', 'dark:text-indigo-100', 'border-indigo-600', 'font-semibold');
        nextEl.classList.remove('text-gray-700', 'dark:text-gray-200', 'border-transparent');
        const iconWrap = nextEl.querySelector('.nav-icon-wrap');
        if (iconWrap) {
            iconWrap.classList.add('bg-indigo-600', 'text-white', 'shadow-sm');
            iconWrap.classList.remove('bg-gray-100', 'dark:bg-gray-800', 'text-gray-600', 'dark:text-gray-300');
        }
        const arrow = nextEl.querySelector('.nav-arrow-icon');
        if (arrow) {
            arrow.classList.add('translate-x-0.5', 'text-indigo-600');
        }
        nextEl.scrollIntoView({ block: 'nearest' });
    }
}

/**
 * Renders the results inside the modal
 */
function renderNavigatorResults() {
    const container = document.getElementById('globalNavigatorResults');
    if (!container) return;

    if (filteredItems.length === 0) {
        container.innerHTML = `
            <div class="p-8 text-center text-gray-400 dark:text-gray-500 space-y-2">
                <i data-lucide="search-x" class="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600"></i>
                <p class="text-sm font-bold text-gray-700 dark:text-gray-300">No matching pages or actions found</p>
                <p class="text-xs">Try searching for keywords like <span class="font-mono text-indigo-600 dark:text-indigo-400">branches</span>, <span class="font-mono text-indigo-600 dark:text-indigo-400">billing</span>, <span class="font-mono text-indigo-600 dark:text-indigo-400">password</span>, or <span class="font-mono text-indigo-600 dark:text-indigo-400">sales</span>.</p>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons({ scope: container });
        return;
    }

    // Group items by category
    const grouped = {};
    filteredItems.forEach((item, index) => {
        if (!grouped[item.category]) grouped[item.category] = [];
        grouped[item.category].push({ item, originalIndex: index });
    });

    let html = '';
    Object.keys(grouped).forEach(category => {
        html += `
            <div class="px-3 pt-3 pb-1 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                ${category}
            </div>
        `;

        grouped[category].forEach(({ item, originalIndex }) => {
            const isSelected = originalIndex === activeIndex;
            const activeClass = isSelected
                ? 'bg-indigo-50/90 dark:bg-indigo-950/50 text-indigo-950 dark:text-indigo-100 border-l-4 border-indigo-600 font-semibold'
                : 'text-gray-700 dark:text-gray-200 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/30 hover:text-indigo-900 dark:hover:text-indigo-200 border-l-4 border-transparent';

            html += `
                <div 
                    id="nav-item-${originalIndex}"
                    data-nav-index="${originalIndex}"
                    onclick="window.executeNavigatorItem(${originalIndex})"
                    onpointerdown="window.executeNavigatorItem(${originalIndex})"
                    class="group flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-colors duration-75 select-none ${activeClass}">
                    
                    <div class="flex items-center gap-3 min-w-0 flex-1 pointer-events-none">
                        <div class="nav-icon-wrap w-8 h-8 rounded-lg ${isSelected ? 'bg-indigo-600 text-white shadow-sm' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/50 group-hover:text-indigo-600'} flex items-center justify-center shrink-0 transition-colors">
                            <i data-lucide="${item.icon}" class="w-4 h-4"></i>
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="flex items-center gap-2">
                                <span class="text-xs sm:text-sm font-bold truncate">${item.title}</span>
                            </div>
                            <p class="text-[11px] text-gray-400 dark:text-gray-400 truncate leading-tight">${item.subtitle}</p>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 shrink-0 ml-3 pointer-events-none">
                        <span class="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            ${item.category.split(' ')[0]}
                        </span>
                        <i data-lucide="chevron-right" class="nav-arrow-icon w-4 h-4 text-gray-400 transition-transform ${isSelected ? 'translate-x-0.5 text-indigo-600' : 'group-hover:translate-x-0.5 group-hover:text-indigo-600'}"></i>
                    </div>

                </div>
            `;
        });
    });

    container.innerHTML = html;
    if (window.lucide) window.lucide.createIcons({ scope: container });

    // Scroll active item into view
    const activeEl = document.getElementById(`nav-item-${activeIndex}`);
    if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
    }
}

/**
 * Open the Global Navigator Modal
 */
export function openGlobalNavigator() {
    isNavigatorOpen = true;
    currentQuery = '';
    activeIndex = 0;
    filteredItems = filterNavigatorItems('');

    const oldModal = document.getElementById('globalGoToModal');
    if (oldModal) oldModal.remove();

    const role = (state.role || '').toUpperCase();
    const roleBadgeColor = role === 'SYSADMIN' 
        ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300' 
        : (role === 'OWNER' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300');

    const html = `
    <div id="globalGoToModal" class="fixed inset-0 z-[100000] bg-black/60 backdrop-blur-xs flex items-start justify-center pt-8 sm:pt-[10vh] px-3 sm:px-4 animate-in fade-in duration-100">
        <div class="absolute inset-0" onclick="window.closeGlobalNavigator()"></div>
        
        <div class="relative w-full max-w-2xl bg-white dark:bg-gray-900 rounded-2xl sm:rounded-3xl shadow-2xl border border-gray-200/80 dark:border-gray-700/80 overflow-hidden flex flex-col max-h-[82vh] z-10 animate-in zoom-in-95 duration-150">
            
            <!-- Top Search Input Bar -->
            <div class="p-3 sm:p-4 border-b border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-gray-900 flex items-center gap-3 shrink-0">
                <div class="text-indigo-600 dark:text-indigo-400 shrink-0 pl-1">
                    <i data-lucide="search" class="w-5 h-5"></i>
                </div>
                <input 
                    type="text" 
                    id="globalNavigatorSearchInput" 
                    placeholder="Go to page, feature, or action... (Type to filter)" 
                    autocomplete="off" 
                    spellcheck="false"
                    class="w-full bg-transparent border-0 text-sm sm:text-base font-medium text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-0 p-0"
                />
                <span class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shrink-0 ${roleBadgeColor}">
                    ${role || 'PORTAL'}
                </span>
                <button type="button" onclick="window.closeGlobalNavigator()" class="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                    <kbd class="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-gray-500">ESC</kbd>
                </button>
            </div>

            <!-- Scrollable Results -->
            <div id="globalNavigatorResults" class="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1 scroller-custom">
                <!-- Rendered by renderNavigatorResults() -->
            </div>

            <!-- Footer Shortcuts Hint -->
            <div class="px-4 py-2.5 border-t border-gray-200/80 dark:border-gray-700/80 bg-gray-50/80 dark:bg-gray-800/40 text-[11px] text-gray-500 dark:text-gray-400 flex items-center justify-between shrink-0">
                <div class="flex items-center gap-3">
                    <span class="flex items-center gap-1">
                        <kbd class="font-mono text-[10px] px-1 py-0.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded">↑</kbd>
                        <kbd class="font-mono text-[10px] px-1 py-0.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded">↓</kbd>
                        <span>to navigate</span>
                    </span>
                    <span class="flex items-center gap-1">
                        <kbd class="font-mono text-[10px] px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded">↵</kbd>
                        <span>to select</span>
                    </span>
                </div>
                <div class="hidden sm:flex items-center gap-1 text-gray-400">
                    <span>Press</span>
                    <kbd class="font-mono text-[10px] px-1.5 py-0.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded">/</kbd>
                    <span>anytime</span>
                </div>
            </div>

        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    if (window.lucide) window.lucide.createIcons();

    renderNavigatorResults();

    const input = document.getElementById('globalNavigatorSearchInput');
    if (input) {
        input.focus();
        input.addEventListener('input', (e) => {
            currentQuery = e.target.value;
            filteredItems = filterNavigatorItems(currentQuery);
            activeIndex = 0;
            renderNavigatorResults();
        });
    }

    const resultsContainer = document.getElementById('globalNavigatorResults');
    if (resultsContainer) {
        resultsContainer.addEventListener('click', (e) => {
            const row = e.target.closest('[data-nav-index]');
            if (row) {
                const idx = parseInt(row.getAttribute('data-nav-index'), 10);
                executeNavigatorItem(idx);
            }
        });
    }
}

/**
 * Close the Global Navigator Modal
 */
export function closeGlobalNavigator() {
    isNavigatorOpen = false;
    const modal = document.getElementById('globalGoToModal');
    if (modal) modal.remove();
}

/**
 * Execute item action by index
 */
export function executeNavigatorItem(index) {
    const target = filteredItems[index];
    if (!target) return;
    closeGlobalNavigator();
    try {
        if (typeof target.action === 'function') {
            target.action();
        }
    } catch (err) {
        console.error('[Global Navigator] Action execution failed:', err);
    }
}

/**
 * Set active highlighted index
 */
export function setNavigatorActiveIndex(index) {
    activeIndex = index;
}

// Global Window Attachments
window.openGlobalNavigator = openGlobalNavigator;
window.closeGlobalNavigator = closeGlobalNavigator;
window.executeNavigatorItem = executeNavigatorItem;
window.setNavigatorActiveIndex = setNavigatorActiveIndex;

/**
 * Global Keyboard Listener Initialization
 */
export function initGlobalNavigator() {
    window.addEventListener('keydown', (e) => {
        // If modal is open, handle navigation keys
        if (isNavigatorOpen) {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeGlobalNavigator();
                return;
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (filteredItems.length > 0) {
                    const nextIdx = (activeIndex + 1) % filteredItems.length;
                    updateKeyboardSelection(nextIdx);
                }
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (filteredItems.length > 0) {
                    const nextIdx = (activeIndex - 1 + filteredItems.length) % filteredItems.length;
                    updateKeyboardSelection(nextIdx);
                }
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                if (filteredItems[activeIndex]) {
                    executeNavigatorItem(activeIndex);
                }
                return;
            }
            return;
        }

        // When modal is NOT open, check if user pressed '/' or Ctrl+K / Cmd+K
        const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        const isEditable = document.activeElement && (
            activeTag === 'input' ||
            activeTag === 'textarea' ||
            activeTag === 'select' ||
            document.activeElement.isContentEditable ||
            document.activeElement.getAttribute('contenteditable') === 'true'
        );

        // Do not intercept '/' if user is typing in an input
        if (isEditable) return;

        if (e.key === '/' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
            e.preventDefault();
            openGlobalNavigator();
        }
    });
}
