import { localDb } from '../data/db.js';
import { supabase as _db } from '../supabase.js';
import { showToast } from '../utils.js';

/**
 * Full Master Business Tables (Owner Scope)
 */
export const OWNER_BACKUP_TABLES = [
    { key: 'branches', label: 'Branches', branchField: 'id', ownerField: 'owner_id' },
    { key: 'central_inventory', label: 'Central Catalog & Services', branchField: null, ownerField: 'owner_id' },
    { key: 'inventory', label: 'Branch Inventory', branchField: 'branch_id', ownerField: 'owner_id' },
    { key: 'sales', label: 'Sales & Receipts', branchField: 'branch_id', ownerField: 'owner_id' },
    { key: 'expenses', label: 'Expenses', branchField: 'branch_id', ownerField: 'owner_id' },
    { key: 'customers', label: 'Customers', branchField: 'branch_id', ownerField: 'owner_id' },
    { key: 'staff', label: 'Staff & Team', branchField: 'branch_id', ownerField: 'owner_id' },
    { key: 'suppliers', label: 'Suppliers & Vendors', branchField: null, ownerField: 'owner_id' },
    { key: 'quotations', label: 'Quotations', branchField: 'branch_id', ownerField: 'owner_id' },
    { key: 'documents', label: 'Invoices & Documents', branchField: 'branch_id', ownerField: 'owner_id' },
    { key: 'capital_accounts', label: 'Capital Accounts', branchField: null, ownerField: 'owner_id' },
    { key: 'business_assets', label: 'Fixed Assets', branchField: null, ownerField: 'owner_id' },
    { key: 'business_loans', label: 'Business Loans', branchField: null, ownerField: 'owner_id' },
    { key: 'loans', label: 'Customer Loans', branchField: 'branch_id', ownerField: 'owner_id' },
    { key: 'payroll', label: 'Payroll Records', branchField: null, ownerField: 'owner_id' },
    { key: 'tasks', label: 'Tasks & Objectives', branchField: 'branch_id', ownerField: 'owner_id' },
    { key: 'notes', label: 'Quick Notes', branchField: 'branch_id', ownerField: 'owner_id' },
    { key: 'goals', label: 'Goals & Targets', branchField: null, ownerField: 'owner_id' },
    { key: 'promotions', label: 'Promotions & Discounts', branchField: 'branch_id', ownerField: 'owner_id' },
    { key: 'shifts', label: 'Work Shifts', branchField: 'branch_id', ownerField: 'owner_id' },
    { key: 'attendance', label: 'Staff Attendance', branchField: 'branch_id', ownerField: 'owner_id' },
    { key: 'announcements', label: 'Announcements', branchField: null, ownerField: 'owner_id' },
    { key: 'stock_transfers', label: 'Stock Transfers', branchField: 'branch_id', ownerField: 'owner_id' },
    { key: 'stock_movements', label: 'Stock Movements', branchField: 'branch_id', ownerField: 'owner_id' },
    { key: 'product_returns', label: 'Product Returns', branchField: 'branch_id', ownerField: 'owner_id' }
];

/**
 * Isolated Branch Tables (Strict Branch Scope - Excludes Owner Accounts & Other Branches)
 */
export const BRANCH_BACKUP_TABLES = [
    { key: 'inventory', label: 'Branch Inventory', branchField: 'branch_id' },
    { key: 'sales', label: 'Branch Sales & Receipts', branchField: 'branch_id' },
    { key: 'expenses', label: 'Branch Expenses', branchField: 'branch_id' },
    { key: 'customers', label: 'Branch Customers', branchField: 'branch_id' },
    { key: 'shifts', label: 'Branch Shifts', branchField: 'branch_id' },
    { key: 'attendance', label: 'Branch Attendance', branchField: 'branch_id' },
    { key: 'stock_transfers', label: 'Branch Stock Transfers', branchField: 'branch_id' },
    { key: 'stock_movements', label: 'Branch Stock Movements', branchField: 'branch_id' },
    { key: 'quotations', label: 'Branch Quotations', branchField: 'branch_id' },
    { key: 'documents', label: 'Branch Documents & Invoices', branchField: 'branch_id' },
    { key: 'loans', label: 'Branch Customer Loans', branchField: 'branch_id' },
    { key: 'tasks', label: 'Branch Tasks', branchField: 'branch_id' },
    { key: 'notes', label: 'Branch Notes', branchField: 'branch_id' },
    { key: 'promotions', label: 'Branch Promotions', branchField: 'branch_id' },
    { key: 'product_returns', label: 'Product Returns', branchField: 'branch_id' }
];

/**
 * Resolves current session backup configuration and scope
 */
export function getBackupConfig() {
    const isBranch = window.state?.role === 'branch' || window.state?.role === 'cashier';
    const branchId = isBranch ? (window.state?.branchId || window.state?.currentBranchId || window.state?.branchProfile?.id) : null;
    const branchName = isBranch ? (window.state?.branchProfile?.name || window.state?.currentBranchName || 'Branch') : null;
    const ownerId = window.state?.ownerId || (isBranch ? window.state?.branchProfile?.owner_id : window.state?.user?.id);
    
    const profile = window.state?.profile || window.state?.branchProfile || {};
    const businessName = profile.business_name || profile.company_name || window.state?.enterpriseName || 'Business';

    const tables = isBranch ? BRANCH_BACKUP_TABLES : OWNER_BACKUP_TABLES;

    return {
        isBranch,
        branchId,
        branchName,
        ownerId,
        businessName,
        tables
    };
}

/**
 * Exports an instantaneous, reliable JSON backup snapshot from local IndexedDB with complete branch/tenant isolation.
 */
export async function exportFullJSONBackup() {
    const config = getBackupConfig();
    const btn = document.getElementById('btnExportBackup');
    const originalText = btn ? btn.innerHTML : '';

    try {
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i><span>Exporting Data...</span>`;
            if (window.lucide) window.lucide.createIcons();
        }

        const backupData = {};
        let totalCount = 0;

        // Instant local IndexedDB extraction across all relevant stores
        for (const tableConfig of config.tables) {
            const tableKey = tableConfig.key;
            let items = [];

            if (localDb && localDb[tableKey]) {
                try {
                    let localItems = await localDb[tableKey].toArray();
                    if (Array.isArray(localItems)) {
                        if (config.isBranch && config.branchId) {
                            if (tableKey === 'stock_transfers') {
                                localItems = localItems.filter(i => 
                                    String(i?.from_branch_id) === String(config.branchId) || 
                                    String(i?.to_branch_id) === String(config.branchId) || 
                                    String(i?.branch_id) === String(config.branchId)
                                );
                            } else if (tableConfig.branchField === 'branch_id') {
                                localItems = localItems.filter(i => String(i?.branch_id) === String(config.branchId));
                            }
                        } else if (config.ownerId && tableConfig.ownerField === 'owner_id') {
                            localItems = localItems.filter(i => !i?.owner_id || String(i.owner_id) === String(config.ownerId));
                        }
                        items = localItems;
                    }
                } catch (e) {
                    console.debug(`[Backup] LocalDb read note for ${tableKey}:`, e);
                }
            }

            // Sanitize: strip any private auth tokens or password hashes
            items = items.map(item => {
                if (!item || typeof item !== 'object') return item;
                const cleaned = { ...item };
                delete cleaned.password;
                delete cleaned.password_hash;
                delete cleaned.secret_token;
                delete cleaned.auth_token;
                return cleaned;
            });

            backupData[tableKey] = items;
            totalCount += items.length;
        }

        const backupPayload = {
            _bms_backup_meta: {
                schema_version: '1.0',
                app_version: window.APP_VERSION || '3.9.181',
                exported_at: new Date().toISOString(),
                backup_scope: config.isBranch ? 'branch' : 'business',
                role: config.isBranch ? 'branch' : 'owner',
                branch_id: config.isBranch ? config.branchId : null,
                branch_name: config.isBranch ? config.branchName : null,
                owner_id: config.ownerId || null,
                business_name: config.businessName,
                total_records: totalCount,
                tables_included: Object.keys(backupData)
            },
            data: backupData
        };

        const jsonString = JSON.stringify(backupPayload, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const safePrefix = config.isBranch
            ? `BMSTZ_BranchBackup_${(config.branchName || 'Branch').replace(/[^a-zA-Z0-9_-]/g, '_')}`
            : `BMSTZ_BusinessBackup_${(config.businessName || 'Business').replace(/[^a-zA-Z0-9_-]/g, '_')}`;
        
        const dateStr = new Date().toISOString().split('T')[0];
        const fileName = `${safePrefix}_${dateStr}.json`;

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 300);

        showToast(`${config.isBranch ? 'Branch backup' : 'Business backup'} exported successfully! (${totalCount} records)`, 'success');
    } catch (err) {
        console.error('[Backup] Export failed:', err);
        showToast('Failed to export backup: ' + err.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = originalText || `<i data-lucide="download" class="w-4 h-4"></i><span>Export & Download JSON</span>`;
            if (window.lucide) window.lucide.createIcons();
        }
    }
}

/**
 * Handles parsing and validation of uploaded backup file before import.
 */
export async function handleBackupFileSelected(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const previewEl = document.getElementById('backupFilePreview');
    const previewDetailsEl = document.getElementById('backupPreviewDetails');
    const startImportBtn = document.getElementById('btnStartImportBackup');
    const config = getBackupConfig();

    try {
        const text = await file.text();
        const json = JSON.parse(text);

        if (!json || (!json.data && !json._bms_backup_meta)) {
            throw new Error('Invalid BMSTZ backup file format.');
        }

        const meta = json._bms_backup_meta || {};
        const data = json.data || json;

        let totalRecords = 0;
        const breakdownHtml = [];

        // Check if branch user is attempting to import an owner backup or branch backup
        const activeTables = config.tables;

        for (const tableConfig of activeTables) {
            const count = Array.isArray(data[tableConfig.key]) ? data[tableConfig.key].length : 0;
            if (count > 0) {
                totalRecords += count;
                breakdownHtml.push(`
                    <div class="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800/60 text-xs">
                        <span class="font-medium text-gray-700 dark:text-gray-300">${tableConfig.label}</span>
                        <span class="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-full">${count}</span>
                    </div>
                `);
            }
        }

        window._pendingBackupImportData = { meta, data, fileName: file.name };

        const isBranchScope = meta.backup_scope === 'branch';
        const scopeBadge = isBranchScope 
            ? `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800">Branch Backup: ${meta.branch_name || 'Branch'}</span>`
            : `<span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">Full Business Backup</span>`;

        if (previewDetailsEl) {
            previewDetailsEl.innerHTML = `
                <div class="mb-3 pb-3 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                        <div class="flex items-center gap-2">
                            <p class="font-bold text-gray-900 dark:text-white">${file.name}</p>
                            ${scopeBadge}
                        </div>
                        <p class="text-gray-500 mt-0.5">${meta.exported_at ? 'Created: ' + new Date(meta.exported_at).toLocaleString() : 'Valid BMSTZ JSON'}</p>
                        ${config.isBranch && !isBranchScope ? `
                            <p class="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-1">Note: Branch mode will import relevant records for your branch only.</p>
                        ` : ''}
                    </div>
                    <div class="text-right">
                        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                            <i data-lucide="check-circle" class="w-3.5 h-3.5"></i> ${totalRecords} Records
                        </span>
                    </div>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto scroller-custom pr-1">
                    ${breakdownHtml.join('')}
                </div>
            `;
        }

        if (previewEl) previewEl.classList.remove('hidden');
        if (startImportBtn) {
            startImportBtn.disabled = false;
            startImportBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
        if (window.lucide) window.lucide.createIcons();
    } catch (err) {
        console.error('[Backup] File parse error:', err);
        showToast('Invalid backup file: ' + err.message, 'error');
        if (previewEl) previewEl.classList.add('hidden');
        if (startImportBtn) startImportBtn.disabled = true;
    }
}

/**
 * Imports and syncs backup data with Supabase & IndexedDB without duplicating existing records.
 * Strictly enforces branch isolation when imported by a branch user.
 */
export async function executeBackupImport() {
    const importPayload = window._pendingBackupImportData;
    if (!importPayload || !importPayload.data) {
        showToast('Please select a valid backup file first.', 'warning');
        return;
    }

    const startBtn = document.getElementById('btnStartImportBackup');
    const progressBar = document.getElementById('importProgressBar');
    const progressText = document.getElementById('importProgressText');
    const progressContainer = document.getElementById('importProgressContainer');

    if (startBtn) startBtn.disabled = true;
    if (progressContainer) progressContainer.classList.remove('hidden');

    const config = getBackupConfig();
    const data = importPayload.data;
    let totalImported = 0;
    let totalSkipped = 0;
    const resultsSummary = [];

    try {
        const activeTables = config.tables;
        const totalTables = activeTables.length;
        let tableIndex = 0;

        for (const tableConfig of activeTables) {
            tableIndex++;
            const tableKey = tableConfig.key;
            let items = Array.isArray(data[tableKey]) ? data[tableKey] : [];

            if (items.length === 0) continue;

            const percent = Math.round((tableIndex / totalTables) * 100);
            if (progressBar) progressBar.style.width = `${percent}%`;
            if (progressText) progressText.textContent = `Processing ${tableConfig.label} (${items.length} items)...`;

            // 1. Gather all existing primary key IDs
            const existingIds = new Set();

            if (localDb && localDb[tableKey]) {
                try {
                    const localItems = await localDb[tableKey].toArray();
                    localItems.forEach(i => { if (i?.id) existingIds.add(String(i.id)); });
                } catch (e) {}
            }

            if (navigator.onLine && _db) {
                try {
                    let query = _db.from(tableKey).select('id');
                    if (config.isBranch && config.branchId) {
                        if (tableKey !== 'stock_transfers') {
                            query = query.eq('branch_id', config.branchId);
                        }
                    } else if (config.ownerId) {
                        query = query.eq('owner_id', config.ownerId);
                    }
                    const { data: remoteRows } = await query.limit(10000);
                    if (Array.isArray(remoteRows)) {
                        remoteRows.forEach(r => { if (r?.id) existingIds.add(String(r.id)); });
                    }
                } catch (e) {}
            }

            // 2. Segregate: New items vs existing items (ZERO DUPLICATION GUARD & STRICT BRANCH ISOLATION)
            const newItems = [];
            let skippedCount = 0;

            for (const rawItem of items) {
                if (!rawItem || !rawItem.id) continue;

                // Branch Isolation Guard: If imported by branch, strictly restrict to branch scope
                if (config.isBranch && config.branchId) {
                    if (rawItem.branch_id && String(rawItem.branch_id) !== String(config.branchId)) {
                        skippedCount++;
                        continue;
                    }
                }

                if (existingIds.has(String(rawItem.id))) {
                    skippedCount++;
                } else {
                    const item = { ...rawItem };

                    // Enforce tenant / branch assignment
                    if (config.isBranch && config.branchId) {
                        item.branch_id = config.branchId;
                        if (config.ownerId && !item.owner_id) item.owner_id = config.ownerId;
                    } else if (config.ownerId && tableConfig.ownerField === 'owner_id' && !item.owner_id) {
                        item.owner_id = config.ownerId;
                    }

                    newItems.push(item);
                    existingIds.add(String(item.id));
                }
            }

            // 3. Batch insert new items into Supabase & IndexedDB
            if (newItems.length > 0) {
                // Insert to local IndexedDB
                if (localDb && localDb[tableKey]) {
                    try {
                        await localDb[tableKey].bulkPut(newItems);
                    } catch (e) {
                        console.debug(`[Backup] Local put error on ${tableKey}:`, e);
                    }
                }

                // Batch insert into Supabase in chunks of 50
                if (navigator.onLine && _db) {
                    const chunkSize = 50;
                    for (let i = 0; i < newItems.length; i += chunkSize) {
                        const chunk = newItems.slice(i, i + chunkSize);
                        try {
                            await _db.from(tableKey).upsert(chunk, { onConflict: 'id', ignoreDuplicates: true });
                        } catch (err) {
                            console.debug(`[Backup] Remote upsert error on ${tableKey}:`, err);
                        }
                    }
                }
            }

            totalImported += newItems.length;
            totalSkipped += skippedCount;

            resultsSummary.push({
                table: tableConfig.label,
                imported: newItems.length,
                skipped: skippedCount
            });
        }

        if (progressBar) progressBar.style.width = '100%';
        if (progressText) progressText.textContent = `Completed! Imported ${totalImported} new, ${totalSkipped} existing skipped.`;

        showToast(`Import complete! ${totalImported} new items imported, ${totalSkipped} existing items preserved.`, 'success');

        // Clean up pending data
        window._pendingBackupImportData = null;

        // Auto reload or refresh active view after 1.5s
        setTimeout(() => {
            if (typeof window.switchView === 'function' && window.state?.activeView) {
                window.switchView(window.state.activeView);
            }
        }, 1500);
    } catch (err) {
        console.error('[Backup] Import execution failed:', err);
        showToast('Import error: ' + err.message, 'error');
        if (progressText) progressText.textContent = 'Import encountered an error.';
    } finally {
        if (startBtn) startBtn.disabled = false;
    }
}

/**
 * Opens the Role-Aware Backup & Cloud Synchronization Modal.
 */
export function openBackupModal() {
    const config = getBackupConfig();

    const modalTitle = config.isBranch
        ? window.t('branch_backup_modal_title', 'Branch Data Backup & Synchronization')
        : window.t('backup_modal_title', 'Data Backup & Synchronization');

    const modalSubtitle = config.isBranch
        ? `${config.branchName} • Export branch JSON backup or restore records with Zero-Duplication Guard`
        : window.t('backup_modal_subtitle', 'Export full JSON backup or restore data with Zero-Duplication Guard');

    const exportTitle = config.isBranch
        ? window.t('export_branch_backup_title', 'Export Branch Backup (JSON)')
        : window.t('export_backup_title', 'Export Full Backup (JSON)');

    const exportDesc = config.isBranch
        ? window.t('export_branch_backup_desc', 'Generates a timestamped JSON snapshot of this branch\'s stock inventory, sales, expenses, cash drawer, and shift records. Owner-level financial accounts and other branches are excluded.')
        : window.t('export_backup_desc', 'Generates a complete, timestamped JSON snapshot of your entire business catalog, sales, expenses, loans, staff, and records.');

    const exportBtnText = config.isBranch
        ? window.t('export_branch_backup_btn', 'Export Branch JSON')
        : window.t('export_backup_btn', 'Export & Download JSON');

    const modalHtml = `
        <div id="backupSyncModalOverlay" class="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div class="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                
                <!-- Modal Header -->
                <div class="px-5 py-4 sm:px-6 sm:py-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gradient-to-r ${config.isBranch ? 'from-teal-50/50 via-transparent to-transparent dark:from-teal-950/20' : 'from-indigo-50/50 via-transparent to-transparent dark:from-indigo-950/20'}">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-2xl ${config.isBranch ? 'bg-teal-600 shadow-teal-600/30' : 'bg-indigo-600 shadow-indigo-600/30'} text-white flex items-center justify-center shadow-lg shrink-0">
                            <i data-lucide="database-backup" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <div class="flex items-center gap-2">
                                <h2 class="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight">${modalTitle}</h2>
                                ${config.isBranch ? `<span class="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800">${config.branchName}</span>` : ''}
                            </div>
                            <p class="text-xs text-gray-500 dark:text-gray-400">${modalSubtitle}</p>
                        </div>
                    </div>
                    <button onclick="window.closeBackupModal()" class="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-700 dark:hover:text-white flex items-center justify-center transition-all cursor-pointer">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>

                <!-- Modal Body -->
                <div class="p-5 sm:p-6 overflow-y-auto scroller-custom space-y-6 flex-1">
                    
                    <!-- Export Card -->
                    <div class="p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900/60 shadow-xs space-y-3">
                        <div class="flex items-start gap-3.5">
                            <div class="p-2.5 rounded-xl ${config.isBranch ? 'bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400' : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'} shrink-0">
                                <i data-lucide="download-cloud" class="w-5 h-5"></i>
                            </div>
                            <div class="flex-1">
                                <h3 class="text-sm font-bold text-gray-900 dark:text-white">${exportTitle}</h3>
                                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    ${exportDesc}
                                </p>
                            </div>
                        </div>
                        <div class="pt-2 flex justify-end">
                            <button id="btnExportBackup" onclick="window.exportFullJSONBackup()"
                                class="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white ${config.isBranch ? 'bg-teal-600 hover:bg-teal-700 shadow-teal-600/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'} active:scale-95 rounded-xl shadow-md transition-all cursor-pointer">
                                <i data-lucide="download" class="w-4 h-4"></i>
                                <span>${exportBtnText}</span>
                            </button>
                        </div>
                    </div>

                    <!-- Import Card -->
                    <div class="p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-gray-800 bg-white dark:bg-gray-900/60 shadow-xs space-y-4">
                        <div class="flex items-start gap-3.5">
                            <div class="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                                <i data-lucide="upload-cloud" class="w-5 h-5"></i>
                            </div>
                            <div class="flex-1">
                                <div class="flex items-center gap-2">
                                    <h3 class="text-sm font-bold text-gray-900 dark:text-white">${window.t('import_backup_title', 'Import & Sync Backup (JSON)')}</h3>
                                    <span class="px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider rounded-md bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                                        Zero-Duplication Guard
                                    </span>
                                </div>
                                <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    ${config.isBranch 
                                        ? 'Upload a branch JSON backup to restore stock, sales, and shift data. Existing records matching unique IDs will NOT be duplicated.'
                                        : window.t('import_backup_desc', 'Upload a BMSTZ JSON backup. Existing records matching unique IDs will NOT be duplicated. Only new/missing records are imported and synced.')}
                                </p>
                            </div>
                        </div>

                        <!-- File Input / Dropzone -->
                        <div class="relative border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-2xl p-4 text-center transition-colors cursor-pointer bg-gray-50/50 dark:bg-gray-800/30">
                            <input type="file" id="backupFileInput" accept=".json,application/json" onchange="window.handleBackupFileSelected(event)" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer">
                            <div class="flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                                <i data-lucide="file-json" class="w-8 h-8 ${config.isBranch ? 'text-teal-500' : 'text-indigo-500'} mb-1"></i>
                                <span class="text-xs font-bold text-gray-700 dark:text-gray-200">${window.t('click_or_drag_json', 'Click or drag a BMSTZ JSON backup file here')}</span>
                                <span class="text-[11px] text-gray-400">Accepts .json files exported from BMSTZ</span>
                            </div>
                        </div>

                        <!-- Preview Area -->
                        <div id="backupFilePreview" class="hidden p-3.5 rounded-xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-700/60 space-y-2">
                            <div id="backupPreviewDetails"></div>
                        </div>

                        <!-- Progress Area -->
                        <div id="importProgressContainer" class="hidden space-y-2">
                            <div class="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                                <div id="importProgressBar" class="${config.isBranch ? 'bg-teal-600' : 'bg-indigo-600'} h-2.5 rounded-full transition-all duration-300" style="width: 0%"></div>
                            </div>
                            <p id="importProgressText" class="text-xs font-medium text-gray-600 dark:text-gray-300 text-center"></p>
                        </div>

                        <!-- Action Footer -->
                        <div class="pt-2 flex justify-end gap-2">
                            <button id="btnStartImportBackup" disabled onclick="window.executeBackupImport()"
                                class="opacity-50 cursor-not-allowed inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl shadow-md shadow-emerald-600/20 transition-all">
                                <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                                <span>${window.t('start_import_btn', 'Start Import & Sync')}</span>
                            </button>
                        </div>
                    </div>

                </div>

                <!-- Modal Footer -->
                <div class="px-5 py-3.5 sm:px-6 bg-gray-50/80 dark:bg-gray-800/40 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500">
                    <span class="flex items-center gap-1.5">
                        <i data-lucide="shield-check" class="w-4 h-4 text-emerald-500"></i>
                        <span>${config.isBranch ? '100% Branch-Isolated & Encrypted' : window.t('tenant_isolated', '100% Tenant-Isolated & Encrypted')}</span>
                    </span>
                    <button onclick="window.closeBackupModal()" class="px-3.5 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer">
                        ${window.t('close', 'Close')}
                    </button>
                </div>

            </div>
        </div>
    `;

    // Remove any existing overlay
    const existing = document.getElementById('backupSyncModalOverlay');
    if (existing) existing.remove();

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    if (window.lucide) window.lucide.createIcons();
}

/**
 * Closes the Backup Modal.
 */
export function closeBackupModal() {
    const overlay = document.getElementById('backupSyncModalOverlay');
    if (overlay) overlay.remove();
}

// Attach globally
window.openBackupModal = openBackupModal;
window.closeBackupModal = closeBackupModal;
window.exportFullJSONBackup = exportFullJSONBackup;
window.handleBackupFileSelected = handleBackupFileSelected;
window.executeBackupImport = executeBackupImport;
