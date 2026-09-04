import { supabase } from '../supabase.js';
import { state } from '../state.js';
import { showToast, showLoader, hideLoader } from '../utils.js';

export async function renderBackupSuite(containerId = 'mainContent') {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
    <div class="space-y-6 md:space-y-8 slide-in w-full pb-12">
        <div class="flex items-center justify-between flex-wrap gap-4">
            <div>
                <h1 class="text-2xl md:text-3xl font-black text-gray-900 dark:text-white">Business Data Archive & Disaster Recovery Suite</h1>
                <p class="text-xs font-bold text-gray-400 uppercase tracking-widest leading-none mt-1">Export Complete Multi-Branch Data Ledger to Offline Encrypted Archives</p>
            </div>
            <button onclick="window.generateFullBusinessBackup()" class="px-5 py-2.5 bg-brand hover:bg-brand-light active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand/20 transition-all flex items-center gap-2">
                <i data-lucide="download-cloud" class="w-4 h-4"></i> Generate Full Business Backup (.JSON)
            </button>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div class="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-xs space-y-3">
                <div class="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 flex items-center justify-center">
                    <i data-lucide="shopping-bag" class="w-5 h-5"></i>
                </div>
                <h4 class="text-base font-bold text-gray-900 dark:text-white">Sales & Receipts Archive</h4>
                <p class="text-xs text-gray-400 leading-relaxed">Includes all transactions, POS receipt histories, payment methods, customer links, and branch till logs.</p>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-xs space-y-3">
                <div class="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 flex items-center justify-center">
                    <i data-lucide="box" class="w-5 h-5"></i>
                </div>
                <h4 class="text-base font-bold text-gray-900 dark:text-white">Inventory & Cost Ledger</h4>
                <p class="text-xs text-gray-400 leading-relaxed">Includes product catalog, SKU codes, stock movement logs, central warehouse transfers, and cost pricing records.</p>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-3xl p-6 border border-gray-100 dark:border-gray-700/50 shadow-xs space-y-3">
                <div class="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-900/30 flex items-center justify-center">
                    <i data-lucide="users" class="w-5 h-5"></i>
                </div>
                <h4 class="text-base font-bold text-gray-900 dark:text-white">Customers & Loyalty Ledger</h4>
                <p class="text-xs text-gray-400 leading-relaxed">Includes customer profiles, phone contacts, accrued loyalty points, credit balances, and quotation records.</p>
            </div>
        </div>

        <div class="bg-gray-50 dark:bg-gray-800/40 rounded-3xl p-6 sm:p-8 border border-gray-200 dark:border-gray-700/60 flex items-center justify-between flex-wrap gap-4">
            <div class="space-y-1">
                <h3 class="text-base font-black text-gray-900 dark:text-white">Regulatory & Tax Compliance Archiving</h3>
                <p class="text-xs text-gray-400 max-w-xl">Exported files are structured in standardized JSON format for TRA fiscal audits, accounting software import, and offline long-term storage.</p>
            </div>
            <button onclick="window.generateFullBusinessBackup()" class="px-6 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 font-black text-xs rounded-2xl transition-all shadow-md">
                Export Complete Archive
            </button>
        </div>
    </div>
    `;

    if (window.lucide) window.lucide.createIcons();
}

export async function generateFullBusinessBackup() {
    const ownerId = state.profile?.id;
    if (!ownerId) {
        showToast('Active business session required for backup export.', 'error');
        return;
    }

    showLoader('Compiling Multi-Branch Data Archive...');
    try {
        const [salesRes, productsRes, customersRes, expensesRes] = await Promise.all([
            supabase.from('sales').select('*').eq('owner_id', ownerId).limit(5000),
            supabase.from('products').select('*').eq('owner_id', ownerId).limit(5000),
            supabase.from('customers').select('*').eq('owner_id', ownerId).limit(5000),
            supabase.from('expenses').select('*').eq('owner_id', ownerId).limit(5000)
        ]);

        const backupData = {
            export_version: '2.9.17',
            exported_at: new Date().toISOString(),
            owner_id: ownerId,
            business_name: state.profile?.business_name || 'Business',
            summary: {
                total_sales_records: salesRes.data?.length || 0,
                total_products: productsRes.data?.length || 0,
                total_customers: customersRes.data?.length || 0,
                total_expenses: expensesRes.data?.length || 0
            },
            data: {
                sales: salesRes.data || [],
                products: productsRes.data || [],
                customers: customersRes.data || [],
                expenses: expensesRes.data || []
            }
        };

        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `BMSTz_Backup_${(state.profile?.business_name || 'Data').replace(/\s+/g, '_')}_${dateStr}.json`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast(`Business backup archive [${filename}] exported successfully!`, 'success');
    } catch (err) {
        console.error('[Backup Export Error]', err);
        showToast('Failed to compile backup archive.', 'error');
    } finally {
        hideLoader();
    }
}

window.renderBackupSuite = renderBackupSuite;
window.generateFullBusinessBackup = generateFullBusinessBackup;
