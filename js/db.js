
import { supabase } from './supabase.js';
import { cacheLocalItems, getLocalItems, upsertLocalItem, deleteLocalItem, localDb } from './data/db.js';
export { supabase, cacheLocalItems, getLocalItems, upsertLocalItem, deleteLocalItem, localDb };

const _db = supabase;

export function isValidUUID(val) {
    if (!val || typeof val !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val);
}

export function generateClientUUID() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

export function withTimeout(promise, ms = 12000, label = 'DB Query') {
    return Promise.race([
        promise,
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
        )
    ]);
}


function _check({ data, error }, label) {
    if (error) {
        if (error.name !== 'AbortError' && !error.message?.includes('Lock broken')) {
            console.error(`[DB] ${label}:`, error.message);
        }
        throw error;
    }
    return data;
}

/**
 * Unified resilient database query wrapper with zero-wipe local fallback
 * and proactive auth session recovery.
 */
async function _resilientFetch({
    queryFn,
    localFallbackFn,
    table,
    label = 'resilientFetch',
    timeoutMs = 12000,
    isPaged = false
}) {
    let res = null;
    let data = null;

    try {
        res = await withTimeout(queryFn(), timeoutMs, label);
        data = _check(res, label);
    } catch (err) {
        console.warn(`[DB] ${label} query error, falling back to localDb:`, err.message);
        if (typeof localFallbackFn === 'function') {
            try {
                const local = await localFallbackFn();
                return local || (isPaged ? { items: [], count: 0 } : []);
            } catch (e) {}
        }
        return isPaged ? { items: [], count: 0 } : [];
    }

    let items = Array.isArray(data) ? data : (data?.items || []);
    let count = res?.count !== undefined ? res.count : items.length;

    // Fast path: remote query returned rows
    if (items.length > 0) {
        if (table) cacheLocalItems(table, items);
        return isPaged ? { items, count } : items;
    }

    // Zero-Wipe Fallback Guard: If remote returned 0 rows, check local IndexedDB
    if (typeof localFallbackFn === 'function') {
        try {
            const local = await localFallbackFn();
            const localItems = Array.isArray(local) ? local : (local?.items || []);
            if (localItems.length > 0) {
                return local;
            }
        } catch (e) {}
    }

    return isPaged ? { items: [], count: 0 } : [];
}


export const dbAuth = {

    signIn: (email, password) =>
        _db.auth.signInWithPassword({ email, password }),

    signOut: () => _db.auth.signOut(),

    getSession: () => _db.auth.getSession(),

    signUp: (email, password, options = {}) =>
        _db.auth.signUp({
            email,
            password,
            options
        })
};

export const dbProfile = {

    get: async (ownerId) => dbProfile.fetch(ownerId),

    fetch: async (ownerId) => {
        if (!ownerId || ownerId === 'null' || ownerId === 'undefined' || ownerId === 'sysadmin') return null;
        const { data, error } = await _db
            .from('profiles')
            .select('*')
            .eq('id', ownerId)
            .maybeSingle();

        if (error) {
            console.warn('[DB] fetchProfile warning:', error.message);
            return null;
        }

        return data;
    },

    upsert: async (ownerId, profileData) => {
        if (!ownerId || ownerId === 'null' || ownerId === 'undefined') return null;
        const payload = { id: ownerId, ...profileData, updated_at: new Date().toISOString() };

        const res = await _db
            .from('profiles')
            .upsert(payload, { onConflict: 'id' })
            .select('*')
            .single();

        if (res.error) console.error('[DEBUG] Upsert Error:', res.error);
        return _check(res, 'upsertProfile');
    },

    updateTheme: async (ownerId, theme) => {
        if (!ownerId || ownerId === 'null' || ownerId === 'undefined') return null;
        const res = await _db
            .from('profiles')
            .update({ theme })
            .eq('id', ownerId);
        return _check(res, 'updateProfileTheme');
    },

    updateSecurity: async (ownerId, data) => {
        if (!ownerId || ownerId === 'null' || ownerId === 'undefined') return null;
        const res = await _db
            .from('profiles')
            .update({
                pin_expiry_days: data.pin_expiry_days,
                session_duration_hrs: data.session_duration_hrs,
                updated_at: new Date().toISOString()
            })
            .eq('id', ownerId);
        return _check(res, 'updateSecurityPolicies');
    },

    updateLanguage: async (ownerId, language) => {
        if (!ownerId || ownerId === 'null' || ownerId === 'undefined') return null;
        const res = await _db
            .from('profiles')
            .update({
                preferred_language: language,
                language: language,
                updated_at: new Date().toISOString()
            })
            .eq('id', ownerId);
        return _check(res, 'updateLanguagePreference');
    }
};

export const dbBranches = {

    fetchAll: async (ownerId) => {
        if (!ownerId || ownerId === 'null' || ownerId === 'undefined') return [];
        return await _resilientFetch({
            queryFn: () => _db.from('branches').select('*').eq('owner_id', ownerId).order('created_at', { ascending: true }),
            localFallbackFn: async () => {
                const local = await getLocalItems('branches', b => b.owner_id === ownerId, 'created_at', true);
                if (local && local.length > 0) return local;
                try {
                    const cached = localStorage.getItem(`bms_cached_branches_${ownerId}`);
                    if (cached) return JSON.parse(cached);
                } catch (e) {}
                return [];
            },
            table: 'branches',
            label: 'fetchBranches'
        });
    },


    fetchByManager: async (managerId, email = null) => {
        if (!managerId || managerId === 'null' || managerId === 'undefined') return null;
        const runQuery = async () => {
            const res = await _db
                .from('branches')
                .select('*')
                .eq('manager_id', managerId)
                .maybeSingle();
            const data = _check(res, 'fetchBranchByManager');
            if (data) return data;
            if (email) {
                const resEmail = await _db
                    .from('branches')
                    .select('*')
                    .ilike('manager_email', email)
                    .maybeSingle();
                const dataEmail = _check(resEmail, 'fetchBranchByManagerEmail');
                if (dataEmail) return dataEmail;
            }
            return null;
        };
        try {
            const remote = await runQuery();
            if (remote) return remote;
        } catch (e) {
            console.warn('[dbBranches] fetchByManager error, checking local storage:', e.message);
        }

        // Offline / local cache fallback
        try {
            const local = await getLocalItems('branches', b => 
                b.manager_id === managerId || (email && b.manager_email && b.manager_email.toLowerCase() === email.toLowerCase())
            );
            if (Array.isArray(local) && local.length > 0) return local[0];
            const cachedSession = localStorage.getItem(`bms_session_branch_${managerId}`);
            if (cachedSession) {
                const parsed = JSON.parse(cachedSession);
                if (parsed.branchProfile) return parsed.branchProfile;
            }
        } catch (e) {}
        return null;
    },


    verifyCredentials: async (ownerEmail, branchName, pin) => {

        const res = await _db
            .from('branches')
            .select('*')
            .ilike('owner_email', ownerEmail)
            .ilike('name', branchName)
            .eq('pin', pin)
            .maybeSingle();
        return _check(res, 'verifyBranchCredentials');
    },

    requestAccess: async (ownerEmail, branchName) => {

        const { data: owners, error: ownerError } = await _db
            .from('branches')
            .select('owner_id')
            .ilike('owner_email', ownerEmail)
            .limit(1);

        if (ownerError || !owners || !owners.length) throw new Error('Owner email not found.');
        const ownerId = owners[0].owner_id;

        const { data: branches, error: branchError } = await _db
            .from('branches')
            .select('id')
            .eq('owner_id', ownerId)
            .ilike('name', branchName)
            .maybeSingle();

        if (branchError || !branches) throw new Error('Branch not found.');

        const { error: reqError } = await _db
            .from('access_requests')
            .insert({
                branch_id: branches.id,
                owner_id: ownerId,
                requester_email: ownerEmail,
                status: 'pending'
            });

        if (reqError) throw new Error('Failed to send request: ' + reqError.message);
        return true;
    },

    add: async (ownerId, { name, location, manager, target, managerEmail, branchPassword, currency }) => {
        let managerId = null;

        if (managerEmail && branchPassword) {
            const meta = { role: 'branch_manager', branch_name: name };
            const { data, error: rpcError } = await _db.rpc('create_branch_manager', {
                mgr_email: managerEmail,
                mgr_password: branchPassword,
                mgr_meta: meta
            });

            if (rpcError) {
                console.error('[DB] create_branch_manager error:', rpcError);

                if (rpcError.code === 'PGRST202' || rpcError.message?.includes('not found')) {
                    throw new Error('Database setup incomplete: Missing "create_branch_manager" function. Please run the migration script.');
                }
                throw new Error('Failed to create manager account: ' + rpcError.message);
            }
            managerId = data;
        }

        const payload = {
            owner_id: ownerId,
            manager_id: managerId,
            manager_email: managerEmail,
            name,
            location,
            manager,
            target
        };
        if (currency) payload.currency = currency;

        const res = await _db
            .from('branches')
            .insert(payload)
            .select()
            .single();
        return _check(res, 'addBranch');
    },

    updateAdmin: async (branchId, { name, manager, location, target, currency }) => {
        const payload = { name, manager, location, target };
        if (currency) payload.currency = currency;

        const res = await _db
            .from('branches')
            .update(payload)
            .eq('id', branchId)
            .select()
            .single();
        return _check(res, 'updateBranchAdmin');
    },

    updateManagerPassword: async (branchId, newPassword) => {

        const { data: branch, error: fetchErr } = await _db
            .from('branches')
            .select('manager_id')
            .eq('id', branchId)
            .single();

        if (fetchErr || !branch || !branch.manager_id) {
            throw new Error('This branch does not have a manager account assigned to it.');
        }

        const { error: rpcError } = await _db.rpc('reset_branch_manager_password', {
            mgr_id: branch.manager_id,
            new_password: newPassword
        });

        if (rpcError) throw new Error('Failed to update password: ' + rpcError.message);
        return true;
    },

    updateProfile: async (branchId, profileData) => {

        const safeData = {
            branch_reg_no: profileData.branch_reg_no,
            branch_tin: profileData.branch_tin,
            phone: profileData.phone,
            email: profileData.email,
            address: profileData.address,
            tax_rate: profileData.tax_rate,
            opening_time: profileData.opening_time,
            closing_time: profileData.closing_time,
            low_stock_notifications: profileData.low_stock_notifications,
            avatar_url: profileData.avatar_url ?? undefined
        };

        Object.keys(safeData).forEach(k => safeData[k] === undefined && delete safeData[k]);
        const res = await _db
            .from('branches')
            .update(safeData)
            .eq('id', branchId)
            .select()
            .single();
        return _check(res, 'updateBranchProfile');
    },

    updateStatus: async (branchId, status) => {
        const res = await _db
            .from('branches')
            .update({ status })
            .eq('id', branchId);
        return _check(res, 'updateBranchStatus');
    },

    updateTheme: async (branchId, theme) => {
        const res = await _db
            .from('branches')
            .update({ theme })
            .eq('id', branchId);
        return _check(res, 'updateBranchTheme');
    },

    fetchOne: async (branchId) => {
        const res = await _db
            .from('branches')
            .select('*')
            .eq('id', branchId)
            .single();
        return _check(res, 'fetchOneBranch');
    },

    updatePreferences: async (branchId, preferences) => {
        if (!branchId || branchId === 'undefined' || branchId === 'null') {
            throw new Error('Invalid branch ID provided for updating preferences');
        }
        const cleanId = String(branchId).trim();

        let data = null;
        try {
            const { data: rpcData, error: rpcErr } = await _db.rpc('update_branch_preferences', {
                p_branch_id: cleanId,
                p_preferences: preferences
            });
            if (!rpcErr && rpcData) {
                data = rpcData;
            }
        } catch (e) {
            // RPC fallback
        }

        if (!data) {
            const res = await _db
                .from('branches')
                .update({ preferences, updated_at: new Date().toISOString() })
                .eq('id', cleanId)
                .select()
                .single();
            data = _check(res, 'updateBranchPreferences');
        }

        if (data) {
            try {
                upsertLocalItem('branches', data);
                window.broadcastDataMutation?.('branches', 'UPDATE', {
                    id: cleanId,
                    preferences: data.preferences || preferences,
                    updated_at: data.updated_at || new Date().toISOString()
                });
            } catch (e) {}
        }
        return data;
    },

    delete: async (branchId) => {
        const { data, error } = await _db.rpc('delete_branch_cascade', { p_branch_id: branchId });
        if (error) throw error;
        if (data && data.success === false) throw new Error(data.error || 'Failed to delete branch');
        try {
            window.broadcastDataMutation?.('branches', 'DELETE', { id: branchId, owner_id: window.state?.ownerId });
        } catch (e) { }
        return data;
    }
};

export const dbCategories = {
    fetchAll: async (ownerId, type = null) => {
        if (!ownerId || ownerId === 'sysadmin') return [];
        const cleanType = type ? type.toLowerCase().trim() : null;
        try {
            let query = _db
                .from('categories')
                .select('*')
                .eq('owner_id', ownerId)
                .order('name', { ascending: true });

            if (cleanType && cleanType !== 'all') {
                query = query.eq('type', cleanType);
            }

            const res = await withTimeout(query, 5000, 'fetchCategories');
            const data = _check(res, 'fetchCategories');
            if (Array.isArray(data) && data.length > 0) {
                cacheLocalItems('categories', data);
                return data;
            }
        } catch (err) {
            console.warn('[dbCategories] fetch error, checking local/fallback:', err.message);
        }

        // Offline Dexie fallback
        try {
            const local = await getLocalItems('categories', c => c.owner_id === ownerId);
            if (Array.isArray(local) && local.length > 0) {
                if (cleanType && cleanType !== 'all') {
                    return local.filter(c => (c.type || 'product').toLowerCase() === cleanType);
                }
                return local;
            }
        } catch (e) {}

        // Fallback: derive distinct categories strictly from local central_inventory and inventory
        try {
            const items = await getLocalItems('central_inventory', i => {
                if (i.owner_id !== ownerId) return false;
                const itemIsService = (i.item_type || 'product').toLowerCase() === 'service';
                if (cleanType === 'service') return itemIsService;
                if (cleanType === 'product') return !itemIsService;
                return true;
            });
            if (Array.isArray(items) && items.length > 0) {
                const uniqueNames = [...new Set(items.map(i => i.category?.trim()).filter(Boolean))];
                return uniqueNames.map(name => ({
                    id: generateClientUUID(),
                    owner_id: ownerId,
                    name,
                    type: cleanType || 'product'
                }));
            }
        } catch (e) {}

        return [];
    },

    add: async (ownerId, categoryData) => {
        if (!ownerId) throw new Error('Owner ID is required to register a category');
        const name = (categoryData.name || '').trim();
        if (!name) throw new Error('Category name cannot be empty');
        const type = categoryData.type || 'product';

        const payload = {
            id: categoryData.id || generateClientUUID(),
            owner_id: ownerId,
            name: name,
            type: type,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Cache locally first for instant reactivity
        await upsertLocalItem('categories', payload);

        try {
            const res = await _db
                .from('categories')
                .upsert(payload, { onConflict: 'owner_id,name,type' })
                .select()
                .single();
            return _check(res, 'addCategory');
        } catch (err) {
            console.warn('[dbCategories] Server sync queued/fallback:', err.message);
            return payload;
        }
    },

    ensureCategory: async (ownerId, rawName, type = 'product') => {
        if (!ownerId || !rawName) return null;
        const name = rawName.trim();
        if (!name) return null;

        try {
            return await dbCategories.add(ownerId, { name, type });
        } catch (e) {
            console.warn('[dbCategories] ensureCategory notice:', e.message);
            return { name, type };
        }
    }
};
window.dbCategories = dbCategories;

function _isRecordCreatedToday(item) {
    if (!item) return false;
    const raw = typeof item === 'string' || typeof item === 'number' || item instanceof Date
        ? item
        : (item.created_at || item.date || item.timestamp);
    if (!raw) return false;
    const d = new Date(raw);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
           d.getMonth() === now.getMonth() &&
           d.getDate() === now.getDate();
}

export const dbSales = {

    fetchAll: async (branchId, { page = 1, pageSize = 10, dateFilter = null, searchQuery = '' } = {}) => {
        if (!branchId || branchId === 'null' || branchId === 'undefined') {
            return { items: [], count: 0 };
        }
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const cleanSearch = (searchQuery || '').trim();

        const buildQuery = () => {
            let query = _db
                .from('sales')
                .select('*', { count: 'exact' })
                .eq('branch_id', branchId);

            if (dateFilter) {
                query = query.gte('created_at', dateFilter instanceof Date ? dateFilter.toISOString() : dateFilter);
            }

            if (cleanSearch) {
                query = query.or(`customer.ilike.%${cleanSearch}%,payment_method.ilike.%${cleanSearch}%,notes.ilike.%${cleanSearch}%,receipt_no.ilike.%${cleanSearch}%`);
            }

            return query.order('created_at', { ascending: false }).range(from, to);
        };

        const getLocalFallback = async () => {
            const allLocal = await getLocalItems('sales', s => s.branch_id === branchId, 'created_at', false);
            let filtered = allLocal;
            if (dateFilter) {
                const filterIso = dateFilter instanceof Date ? dateFilter.toISOString() : String(dateFilter);
                filtered = filtered.filter(s => s.created_at >= filterIso);
            }
            if (cleanSearch) {
                const kw = cleanSearch.toLowerCase();
                filtered = filtered.filter(s =>
                    (s.customer || '').toLowerCase().includes(kw) ||
                    (s.payment_method || '').toLowerCase().includes(kw) ||
                    (s.notes || '').toLowerCase().includes(kw) ||
                    (s.receipt_no || '').toLowerCase().includes(kw)
                );
            }
            const paged = filtered.slice(from, from + pageSize);
            return { items: paged, count: filtered.length };
        };

        return await _resilientFetch({
            queryFn: buildQuery,
            localFallbackFn: getLocalFallback,
            table: 'sales',
            label: 'fetchSales',
            isPaged: true
        });
    },

    fetchSummary: async (branchId) => {
        if (!branchId || branchId === 'null' || branchId === 'undefined') {
            return { today_total: 0, transaction_count: 0, avg_sale: 0 };
        }
        
        // 1. Immediately aggregate from local Dexie store (including pending offline sales)
        const allLocal = await getLocalItems('sales', s => s.branch_id === branchId && _isRecordCreatedToday(s));
        const localTotal = allLocal.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
        const localCount = allLocal.length;
        const localAvg = localCount > 0 ? Math.round(localTotal / localCount) : 0;
        const localResult = { today_total: localTotal, transaction_count: localCount, avg_sale: localAvg };

        // 2. If online, attempt to fetch cloud summary and merge seamlessly
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const res = await withTimeout(
                _db.rpc('get_branch_sales_summary', {
                    p_branch_id: branchId,
                    p_today_start: today.toISOString()
                }),
                12000,
                'fetchSalesSummary'
            );
            const data = _check(res, 'fetchSalesSummary');
            if (Array.isArray(data) && data[0]) {
                const cloudSummary = data[0];
                const pendingSales = allLocal.filter(s => s.sync_status === 'LOCAL_PENDING' || String(s.id).startsWith('off_sale_'));
                if (pendingSales.length > 0) {
                    const pendingTotal = pendingSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
                    const mergedTotal = (Number(cloudSummary.today_total) || 0) + pendingTotal;
                    const mergedCount = (Number(cloudSummary.transaction_count) || 0) + pendingSales.length;
                    const mergedAvg = mergedCount > 0 ? Math.round(mergedTotal / mergedCount) : 0;
                    return { today_total: mergedTotal, transaction_count: mergedCount, avg_sale: mergedAvg };
                }
                return {
                    today_total: Number(cloudSummary.today_total) || localTotal,
                    transaction_count: Number(cloudSummary.transaction_count) || localCount,
                    avg_sale: Number(cloudSummary.avg_sale) || localAvg
                };
            }
            return localResult;
        } catch (err) {
            console.warn('[dbSales] fetchSummary error, falling back to local sales:', err.message);
            return localResult;
        }
    },

    fetchProfit: async (branchId) => {
        if (!branchId || branchId === 'null' || branchId === 'undefined') {
            return { gross_profit: 0 };
        }
        
        // 1. Calculate local profit from Dexie sales
        const allLocal = await getLocalItems('sales', s => s.branch_id === branchId && _isRecordCreatedToday(s));
        const localProfit = allLocal.reduce((sum, s) => {
            if (s.gross_profit != null && !isNaN(Number(s.gross_profit))) {
                return sum + Number(s.gross_profit);
            }
            if (s.cost_amount != null && !isNaN(Number(s.cost_amount))) {
                return sum + Math.max(0, (Number(s.amount) || 0) - Number(s.cost_amount));
            }
            return sum + (Number(s.profit || (Number(s.amount) || 0) * 0.2) || 0);
        }, 0);

        try {
            const res = await withTimeout(
                _db.rpc('get_branch_profit_stats', { p_branch_id: branchId }),
                12000,
                'fetchProfitStats'
            );
            const data = _check(res, 'fetchProfitStats');
            if (Array.isArray(data) && data[0]) {
                const cloudProfit = Number(data[0].gross_profit) || 0;
                const pendingSales = allLocal.filter(s => s.sync_status === 'LOCAL_PENDING' || String(s.id).startsWith('off_sale_'));
                if (pendingSales.length > 0) {
                    const pendingProfit = pendingSales.reduce((sum, s) => sum + (Number(s.profit || s.gross_profit || (Number(s.amount) || 0) * 0.2) || 0), 0);
                    return { gross_profit: cloudProfit + pendingProfit };
                }
                return { gross_profit: cloudProfit || localProfit };
            }
            return { gross_profit: localProfit };
        } catch (err) {
            console.warn('[dbSales] fetchProfit error, computing from local sales:', err.message);
            return { gross_profit: localProfit };
        }
    },

    fetchOne: async (id) => {
        try {
            const res = await _db.from('sales').select('*').eq('id', id).single();
            const data = _check(res, 'fetchOneSale');
            if (data) upsertLocalItem('sales', data);
            return data;
        } catch (err) {
            console.warn('[dbSales] fetchOne error, checking localDb:', err.message);
            const item = await localDb.sales.get(id);
            if (item) return item;
            throw err;
        }
    },

    todayTotal: async (branchId) => {
        if (!branchId || branchId === 'null' || branchId === 'undefined') {
            return 0;
        }
        
        // 1. Calculate from local Dexie store
        const allLocal = await getLocalItems('sales', s => s.branch_id === branchId && _isRecordCreatedToday(s));
        const localTotal = allLocal.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

        try {
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
            const req = _db
                .from('sales')
                .select('amount, created_at, client_tx_id, id')
                .eq('branch_id', branchId)
                .gte('created_at', startOfDay);
            const res = await withTimeout(req, 12000, 'salesTodayTotal');
            const data = _check(res, 'salesTodayTotal') || [];
            const todayData = data.filter(_isRecordCreatedToday);
            
            // Merge un-synced Dexie local sales with cloud sales
            const cloudIds = new Set(todayData.map(d => d.id || d.client_tx_id).filter(Boolean));
            const pendingSales = allLocal.filter(s => !cloudIds.has(s.id) && !cloudIds.has(s.client_tx_id));
            const pendingTotal = pendingSales.reduce((s, r) => s + Number(r.amount || 0), 0);
            const cloudTotal = todayData.reduce((s, r) => s + Number(r.amount || 0), 0);

            return cloudTotal + pendingTotal;
        } catch (err) {
            console.warn('[dbSales] todayTotal error, computing from local sales:', err.message);
            return localTotal;
        }
    },

    /**
     * Create a sale via the server-authoritative create_sale RPC.
     *
     * The backend resolves the correct price (retail/wholesale), deducts stock
     * with row-level locking, calculates cost and gross profit, and writes the
     * stock movement ledger entry — all in one atomic transaction.
     *
     * @param {string}  branchId        - Target branch UUID
     * @param {object}  sale            - Sale payload from the UI
     * @param {string}  [clientTxId]    - Optional idempotency UUID (for offline-sync)
     * @returns {object}                - { success, id, amount, customer }
     */
    add: async (branchId, sale, clientTxId = null) => {
        const {
            customer,
            items,
            amount,
            payment,
            productId,
            qty,
            price_type = 'retail'
        } = sale;

        const validPriceType = ['retail', 'wholesale', 'custom'].includes(price_type) ? price_type : 'retail';

        const { data, error } = await _db.rpc('create_sale', {
            p_branch_id: branchId,
            p_customer: customer || null,
            p_items: items || null,
            p_amount: Number(amount) || 0,
            p_payment: payment || 'cash',
            p_product_id: productId || null,
            p_qty: parseInt(qty) || 1,
            p_price_type: validPriceType,
            p_client_tx_id: clientTxId || null
        });

        if (error) {
            console.error('[Sales] create_sale RPC error:', error.message);
            throw error;
        }

        // If batch cart sale with multiple items, deduct stock for additional line items
        if (Array.isArray(sale.cart_items) && sale.cart_items.length > 1) {
            for (let idx = 1; idx < sale.cart_items.length; idx++) {
                const cItem = sale.cart_items[idx];
                if (cItem.product_id && cItem.item_type !== 'service') {
                    try {
                        const invRecord = await localDb.inventory.get(cItem.product_id);
                        let currentQty = invRecord ? Number(invRecord.quantity || 0) : null;
                        if (currentQty === null) {
                            const { data: dbItem } = await _db.from('inventory').select('quantity').eq('id', cItem.product_id).single();
                            if (dbItem) currentQty = Number(dbItem.quantity || 0);
                        }
                        if (currentQty !== null) {
                            const newQ = Math.max(0, currentQty - (parseInt(cItem.qty) || 1));
                            await _db.from('inventory').update({ quantity: newQ }).eq('id', cItem.product_id);
                            if (invRecord) {
                                upsertLocalItem('inventory', { ...invRecord, quantity: newQ });
                            }
                        }
                    } catch (e) {
                        console.warn('[Sales] Error deducting inventory stock for item:', cItem.name, e.message);
                    }
                }
            }
        }

        const createdId = (data && data.id) || clientTxId || ('sale_' + Date.now());
        const saleRecord = {
            id: createdId,
            branch_id: branchId,
            client_tx_id: clientTxId,
            customer_name: customer,
            customer: customer,
            amount: Number(amount) || 0,
            payment_method: payment,
            items,
            cart_items: sale.cart_items || null,
            product_id: productId,
            quantity: qty,
            price_type,
            created_at: new Date().toISOString(),
            sync_status: 'SYNCED'
        };
        upsertLocalItem('sales', saleRecord);
        try {
            window.broadcastDataMutation?.('sales', 'INSERT', saleRecord);
        } catch (e) { }
        return data;
    },

    update: async (id, { customer, items, amount, payment }) => {
        const res = await _db
            .from('sales')
            .update({ customer, items, amount, payment })
            .eq('id', id);
        return _check(res, 'updateSale');
    },

    delete: async (id) => {
        const res = await _db.from('sales').delete().eq('id', id);
        return _check(res, 'deleteSale');
    },

    bulkDelete: async (ids) => {
        const res = await _db.from('sales').delete().in('id', ids);
        return _check(res, 'bulkDeleteSales');
    },

    fetchHistory: async (branchIds, days = 7) => {
        if (!branchIds || branchIds.length === 0) return [];
        const date = new Date();
        date.setDate(date.getDate() - days);
        const iso = date.toISOString().split('T')[0];

        const res = await _db
            .from('sales')
            .select('amount, created_at, branch_id')
            .in('branch_id', branchIds)
            .gte('created_at', iso)
            .order('created_at', { ascending: true });
        return _check(res, 'fetchSalesHistory');
    }
};

export const dbSaleTags = {
    fetchAll: async (branchId) => {
        const res = await _db.from('sale_tags').select('*').eq('branch_id', branchId);
        return _check(res, 'fetchSaleTags');
    },
    add: async (branchId, saleId, tag) => {
        const res = await _db.from('sale_tags').insert([{ branch_id: branchId, sale_id: saleId, tag }]);
        return _check(res, 'addSaleTag');
    },
    delete: async (tagId) => {
        const res = await _db.from('sale_tags').delete().eq('id', tagId);
        return _check(res, 'deleteSaleTag');
    },
    deleteBySale: async (saleId) => {
        const res = await _db.from('sale_tags').delete().eq('sale_id', saleId);
        return _check(res, 'deleteSaleTagsBySale');
    }
};

export const dbExpenses = {

    fetchAll: async (branchId, { page = 1, pageSize = 10 } = {}) => {
        if (!branchId || branchId === 'null' || branchId === 'undefined') {
            return { items: [], count: 0 };
        }
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        return await _resilientFetch({
            queryFn: () => _db.from('expenses').select('*', { count: 'exact' }).eq('branch_id', branchId).order('created_at', { ascending: false }).range(from, to),
            localFallbackFn: async () => {
                const allLocal = await getLocalItems('expenses', e => e.branch_id === branchId, 'created_at', false);
                const paged = allLocal.slice(from, from + pageSize);
                return { items: paged, count: allLocal.length };
            },
            table: 'expenses',
            label: 'fetchExpenses',
            isPaged: true
        });
    },

    todayTotal: async (branchId) => {
        if (!branchId || branchId === 'null' || branchId === 'undefined') return 0;
        const allLocal = await getLocalItems('expenses', e => e.branch_id === branchId && _isRecordCreatedToday(e));
        return allLocal.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    },

    fetchSummary: async (branchId) => {
        if (!branchId || branchId === 'null' || branchId === 'undefined') {
            return { today_total: 0, count: 0, total_expenses: 0 };
        }
        const allLocal = await getLocalItems('expenses', e => e.branch_id === branchId);
        const todayExpenses = allLocal.filter(_isRecordCreatedToday);
        const todayTotal = todayExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        const grandTotal = allLocal.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        return {
            today_total: todayTotal,
            today_count: todayExpenses.length,
            total_count: allLocal.length,
            total_expenses: grandTotal
        };
    },

    fetchOne: async (id) => {
        try {
            const res = await _db.from('expenses').select('*').eq('id', id).single();
            const data = _check(res, 'fetchOneExpense');
            if (data) upsertLocalItem('expenses', data);
            return data;
        } catch (err) {
            console.warn('[dbExpenses] fetchOne error, checking localDb:', err.message);
            const item = await localDb.expenses.get(id);
            if (item) return item;
            throw err;
        }
    },

    add: async (branchId, { category, description, amount }, clientTxId = null) => {
        const tempId = (clientTxId && isValidUUID(clientTxId)) ? clientTxId : generateClientUUID();
        const expRecord = {
            id: tempId,
            branch_id: branchId,
            category,
            description: description || null,
            amount: Number(amount),
            created_at: new Date().toISOString(),
            sync_status: 'PENDING'
        };


        try {
            const { data, error } = await withTimeout(
                _db.rpc('create_expense', {
                    p_branch_id: branchId,
                    p_category: category,
                    p_description: description || null,
                    p_amount: Number(amount),
                    p_client_tx_id: tempId
                }),
                5000,
                'create_expense'
            );
            if (error) throw error;

            const cloudId = (data && data.id) || (typeof data === 'string' ? data : tempId);
            expRecord.id = cloudId;
            expRecord.sync_status = 'SYNCED';
            await upsertLocalItem('expenses', expRecord);
            try {
                window.broadcastDataMutation?.('expenses', 'INSERT', expRecord);
            } catch (e) { }
            return data || expRecord;
        } catch (err) {
            console.warn('[dbExpenses.add] Cloud write failed or timed out, saving locally to sync queue:', err.message);
            await upsertLocalItem('expenses', expRecord);
            try {
                await localDb.sync_queue.add({
                    operation_id: tempId,
                    operation_type: 'CREATE_EXPENSE',
                    entity_type: 'expenses',
                    entity_id: tempId,
                    payload: { branch_id: branchId, category, description, amount: Number(amount) },
                    created_at: new Date().toISOString(),
                    status: 'PENDING',
                    attempt_count: 0
                });
            } catch (qErr) { }
            try {
                window.broadcastDataMutation?.('expenses', 'INSERT', expRecord);
            } catch (e) { }
            return expRecord;
        }
    },


    update: async (id, { category, description, amount }) => {
        const res = await _db
            .from('expenses')
            .update({ category, description, amount })
            .eq('id', id);
        const updated = _check(res, 'updateExpense');
        try {
            window.broadcastDataMutation?.('expenses', 'UPDATE', { id, category, description, amount, branch_id: window.state?.branchId });
        } catch (e) { }
        return updated;
    },

    delete: async (id) => {
        const res = await _db.from('expenses').delete().eq('id', id);
        const delRes = _check(res, 'deleteExpense');
        try {
            window.broadcastDataMutation?.('expenses', 'DELETE', { id, branch_id: window.state?.branchId });
        } catch (e) { }
        return delRes;
    },
    bulkDelete: async (ids) => {
        const res = await _db.from('expenses').delete().in('id', ids);
        const delRes = _check(res, 'bulkDeleteExpenses');
        try {
            ids.forEach(id => window.broadcastDataMutation?.('expenses', 'DELETE', { id, branch_id: window.state?.branchId }));
        } catch (e) { }
        return delRes;
    },
    bulkAdd: async (records) => {
        const res = await _db.from('expenses').insert(records);
        const bulkAdded = _check(res, 'bulkAddExpenses');
        try {
            window.broadcastDataMutation?.('expenses', 'INSERT', { branch_id: window.state?.branchId, records });
        } catch (e) { }
        return bulkAdded;
    }
};

export const dbExpenseTags = {
    fetchAll: async (branchId) => {
        const res = await _db.from('expense_tags').select('*').eq('branch_id', branchId);
        return _check(res, 'fetchExpenseTags');
    },
    add: async (branchId, expenseId, tag) => {
        const res = await _db.from('expense_tags').insert([{ branch_id: branchId, expense_id: expenseId, tag }]);
        return _check(res, 'addExpenseTag');
    },
    delete: async (tagId) => {
        const res = await _db.from('expense_tags').delete().eq('id', tagId);
        return _check(res, 'deleteExpenseTag');
    }
};

export const dbCustomers = {
    fetchAll: async (branchId, { page = 1, pageSize = 10, searchQuery = '' } = {}) => {
        if (!branchId || branchId === 'null' || branchId === 'undefined') {
            return { items: [], count: 0 };
        }
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const cleanSearch = (searchQuery || '').trim();

        const buildQuery = () => {
            let query = _db
                .from('customers')
                .select('*', { count: 'exact' })
                .eq('branch_id', branchId);

            if (cleanSearch) {
                query = query.or(`name.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%,address.ilike.%${cleanSearch}%`);
            }

            return query.order('created_at', { ascending: false }).range(from, to);
        };

        const getLocalFallback = async () => {
            const allLocal = await getLocalItems('customers', c => c.branch_id === branchId, 'created_at', false);
            let filtered = allLocal;
            if (cleanSearch) {
                const kw = cleanSearch.toLowerCase();
                filtered = filtered.filter(c =>
                    (c.name || '').toLowerCase().includes(kw) ||
                    (c.phone || '').toLowerCase().includes(kw) ||
                    (c.email || '').toLowerCase().includes(kw) ||
                    (c.address || '').toLowerCase().includes(kw)
                );
            }
            const paged = filtered.slice(from, from + pageSize);
            return { items: paged, count: filtered.length };
        };

        return await _resilientFetch({
            queryFn: buildQuery,
            localFallbackFn: getLocalFallback,
            table: 'customers',
            label: 'fetchCustomers',
            isPaged: true
        });
    },

    fetchAllList: async (branchId) => {
        return await _resilientFetch({
            queryFn: () => _db.from('customers').select('*').eq('branch_id', branchId).order('name', { ascending: true }),
            localFallbackFn: () => getLocalItems('customers', c => c.branch_id === branchId, 'name', true),
            table: 'customers',
            label: 'fetchCustomersList'
        });
    },

    fetchOne: async (id) => {
        try {
            const res = await _db.from('customers').select('*').eq('id', id).single();
            const data = _check(res, 'fetchOneCustomer');
            if (data) upsertLocalItem('customers', data);
            return data;
        } catch (err) {
            console.warn('[dbCustomers] fetchOne error, checking localDb:', err.message);
            const item = await localDb.customers.get(id);
            if (item) return item;
            throw err;
        }
    },

    add: async (branchId, { name, phone, email, address }) => {
        const tempId = generateClientUUID();
        const custRecord = {
            id: tempId,
            branch_id: branchId,
            name,
            phone: phone || null,
            email: email || null,
            address: address || null,
            credit_balance: 0,
            loyalty_points: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sync_status: 'PENDING'
        };


        try {
            const res = await withTimeout(
                _db.from('customers').insert({ branch_id: branchId, name, phone, email, address }).select().single(),
                5000,
                'addCustomer'
            );
            const created = _check(res, 'addCustomer');
            if (created) {
                created.sync_status = 'SYNCED';
                await upsertLocalItem('customers', created);
                try { window.broadcastDataMutation?.('customers', 'INSERT', created); } catch (e) { }
                return created;
            }
            return custRecord;
        } catch (err) {
            console.warn('[dbCustomers.add] Cloud write failed or offline, saving locally to sync queue:', err.message);
            await upsertLocalItem('customers', custRecord);
            try {
                await localDb.sync_queue.add({
                    operation_id: tempId,
                    operation_type: 'CREATE_CUSTOMER',
                    entity_type: 'customers',
                    entity_id: tempId,
                    payload: { branch_id: branchId, name, phone, email, address },
                    created_at: new Date().toISOString(),
                    status: 'PENDING',
                    attempt_count: 0
                });
            } catch (qErr) { }
            try { window.broadcastDataMutation?.('customers', 'INSERT', custRecord); } catch (e) { }
            return custRecord;
        }
    },


    update: async (id, { name, phone, email, address }) => {
        const res = await _db
            .from('customers')
            .update({ name, phone, email, address })
            .eq('id', id);
        const updated = _check(res, 'updateCustomer');
        try {
            window.broadcastDataMutation?.('customers', 'UPDATE', { id, name, phone, email, address, branch_id: window.state?.branchId });
        } catch (e) { }
        return updated;
    },

    updateCredit: async (id, newBalance, paymentDetails = null) => {
        const res = await _db
            .from('customers')
            .update({ credit_balance: newBalance, updated_at: new Date().toISOString() })
            .eq('id', id);
        const updated = _check(res, 'updateCustomerCredit');
        try {
            window.broadcastDataMutation?.('customers', 'UPDATE', { id, credit_balance: newBalance, branch_id: window.state?.branchId });
            if (paymentDetails) {
                _db.from('customer_payments').insert(paymentDetails).catch(() => {});
            }
        } catch (e) { }
        return updated;
    },


    delete: async (id) => {
        const res = await _db.from('customers').delete().eq('id', id);
        const delRes = _check(res, 'deleteCustomer');
        try {
            window.broadcastDataMutation?.('customers', 'DELETE', { id, branch_id: window.state?.branchId });
        } catch (e) { }
        return delRes;
    },
    bulkDelete: async (ids) => {
        const res = await _db.from('customers').delete().in('id', ids);
        const delRes = _check(res, 'bulkDeleteCustomers');
        try {
            ids.forEach(id => window.broadcastDataMutation?.('customers', 'DELETE', { id, branch_id: window.state?.branchId }));
        } catch (e) { }
        return delRes;
    },
    bulkAdd: async (records) => {
        const res = await _db.from('customers').insert(records);
        const bulkAdded = _check(res, 'bulkAddCustomers');
        try {
            window.broadcastDataMutation?.('customers', 'INSERT', { branch_id: window.state?.branchId, records });
        } catch (e) { }
        return bulkAdded;
    }
};

export const dbCustomerTags = {
    fetchAll: async (branchId) => {
        const res = await _db.from('customer_tags').select('*').eq('branch_id', branchId);
        return _check(res, 'fetchCustomerTags');
    },
    add: async (branchId, customerId, tag) => {
        const res = await _db.from('customer_tags').insert([{ branch_id: branchId, customer_id: customerId, tag }]);
        return _check(res, 'addCustomerTag');
    },
    delete: async (tagId) => {
        const res = await _db.from('customer_tags').delete().eq('id', tagId);
        return _check(res, 'deleteCustomerTag');
    }
};

export const dbCentralInventory = {
    fetchAll: async (ownerId) => {
        const targetOwnerId = ownerId || window.state?.ownerId || window.state?.branchProfile?.owner_id || window.state?.profile?.id;
        if (!targetOwnerId || targetOwnerId === 'null' || targetOwnerId === 'undefined') return [];
        try {
            let res = await withTimeout(
                _db.from('central_inventory').select('*, suppliers(name)').eq('owner_id', targetOwnerId).order('name', { ascending: true }),
                7000,
                'fetchCentralInventory'
            );
            if (res?.error) {
                // Resilient fallback to plain select without join if relationship fails
                res = await withTimeout(
                    _db.from('central_inventory').select('*').eq('owner_id', targetOwnerId).order('name', { ascending: true }),
                    7000,
                    'fetchCentralInventorySimple'
                );
            }
            const data = _check(res, 'fetchCentralInventory');
            const items = Array.isArray(data) ? data.filter(item => !item.deleted_at && item.is_active !== false) : [];
            if (items.length > 0) {
                cacheLocalItems('central_inventory', items);
            }
            return items;
        } catch (err) {
            console.warn('[dbCentralInventory] fetchAll error, falling back to localDb:', err.message);
            return await getLocalItems('central_inventory', i => !targetOwnerId || i.owner_id === targetOwnerId, 'name', true);
        }
    },
    fetchOne: async (id) => {
        if (!id) return null;
        try {
            const res = await withTimeout(
                _db.from('central_inventory').select('*, suppliers(name)').eq('id', id).single(),
                12000,
                'fetchCentralInventoryOne'
            );
            if (res?.error) {
                const simpleRes = await withTimeout(
                    _db.from('central_inventory').select('*').eq('id', id).single(),
                    12000,
                    'fetchCentralInventoryOneSimple'
                );
                return _check(simpleRes, 'fetchCentralInventoryOneSimple');
            }
            return _check(res, 'fetchCentralInventoryOne');
        } catch (err) {
            console.warn('[dbCentralInventory] fetchOne notice, checking localDb:', err.message);
            try {
                const local = await getLocalItem('central_inventory', id);
                if (local) return local;
            } catch (e) { }
            return null;
        }
    },

    /**
     * Create a central inventory item via the server-authoritative create_central_item RPC.
     *
     * The backend enforces tenant ownership, subscription status, feature entitlement
     * (Enterprise/Exclusive), and SKU uniqueness. Items are always initialised
     * with main_store_stock = 0; use restock operations to add stock.
     *
     * @param {object} payload - Catalog payload from the UI (name, sku, category, …)
     * @returns {object}       - { success, id, name }
     */
    add: async (payload) => {
        const initialStock = Number(payload.main_store_stock) || 0;
        const costPrice = Number(payload.cost_price) || 0;
        const retailPrice = Number(payload.retail_price) || Number(payload.price) || 0;
        const wholesalePrice = Number(payload.wholesale_price) || retailPrice || 0;
        const supplierId = (payload.supplier_id && isValidUUID(payload.supplier_id)) ? payload.supplier_id : null;
        const resolvedOwnerId = isValidUUID(payload.owner_id) ? payload.owner_id : (isValidUUID(window.state?.ownerId) ? window.state.ownerId : null);

        const tempId = generateClientUUID();
        const fallbackObj = {
            id: tempId,
            name: payload.name,
            sku: payload.sku,
            category: payload.category,
            main_store_stock: initialStock,
            cost_price: costPrice,
            retail_price: retailPrice,
            wholesale_price: wholesalePrice,
            price: retailPrice,
            min_threshold: payload.min_threshold,
            item_type: payload.item_type || 'product',
            supplier_id: supplierId,
            owner_id: resolvedOwnerId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sync_status: 'PENDING'
        };

        try {
            const { data, error } = await withTimeout(
                _db.rpc('create_central_item', {
                    p_name: payload.name,
                    p_sku: payload.sku || null,
                    p_category: payload.category || null,
                    p_price: retailPrice,
                    p_cost_price: costPrice,
                    p_min_threshold: parseInt(payload.min_threshold) || 5,
                    p_supplier_id: supplierId,
                    p_description: payload.description || null,
                    p_requires_approval: payload.requires_approval || false
                }),
                5000,
                'create_central_item'
            );


            if (error) throw error;

            let newItemId = null;
            if (typeof data === 'string') {
                newItemId = data;
            } else if (data && typeof data === 'object') {
                if (Array.isArray(data) && data.length > 0) {
                    const first = data[0];
                    newItemId = (typeof first === 'string') ? first : (first.id || first.item_id || first.create_central_item || Object.values(first)[0]);
                } else {
                    newItemId = data.id || data.item_id || data.create_central_item || Object.values(data)[0];
                }
            }

            if (!newItemId && payload.owner_id && payload.sku) {
                const { data: fetched } = await _db.from('central_inventory')
                    .select('id')
                    .eq('owner_id', payload.owner_id)
                    .eq('sku', payload.sku)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                if (fetched && fetched.id) {
                    newItemId = fetched.id;
                }
            }

            if (newItemId) {
                await _db.from('central_inventory')
                    .update({
                        main_store_stock: initialStock,
                        cost_price: costPrice,
                        retail_price: retailPrice,
                        wholesale_price: wholesalePrice,
                        price: retailPrice,
                        item_type: payload.item_type || 'product'
                    })
                    .eq('id', newItemId);
            }

            const newItemObj = {
                ...(typeof data === 'object' ? data : {}),
                id: newItemId || tempId,
                name: payload.name,
                sku: payload.sku,
                category: payload.category,
                main_store_stock: initialStock,
                cost_price: costPrice,
                retail_price: retailPrice,
                wholesale_price: wholesalePrice,
                price: retailPrice,
                min_threshold: payload.min_threshold,
                item_type: payload.item_type || 'product',
                owner_id: payload.owner_id || window.state?.ownerId,
                sync_status: 'SYNCED'
            };
            await upsertLocalItem('central_inventory', newItemObj);
            try {
                window.broadcastDataMutation?.('central_inventory', 'INSERT', newItemObj);
            } catch (e) { }
            return newItemObj;
        } catch (err) {
            console.warn('[dbCentralInventory.add] Cloud write failed or offline, caching locally to sync queue:', err.message);
            await upsertLocalItem('central_inventory', fallbackObj);
            try {
                await localDb.sync_queue.add({
                    operation_id: tempId,
                    operation_type: 'CREATE_CENTRAL_ITEM',
                    entity_type: 'central_inventory',
                    entity_id: tempId,
                    payload,
                    created_at: new Date().toISOString(),
                    status: 'PENDING',
                    attempt_count: 0
                });
            } catch (qErr) { }
            try { window.broadcastDataMutation?.('central_inventory', 'INSERT', fallbackObj); } catch (e) { }
            return fallbackObj;
        }
    },

    update: async (id, payload) => {
        const res = await _db.from('central_inventory').update(payload).eq('id', id).select().single();

        if (!res.error && res.data) {
            const { name, sku, category, price, cost_price, retail_price, wholesale_price, item_type } = res.data;
            await _db.from('inventory')
                .update({
                    name, sku, category,
                    price,
                    cost_price: cost_price || 0,
                    retail_price: retail_price || price,
                    wholesale_price: wholesale_price || price,
                    item_type: item_type || 'product'
                })
                .eq('central_item_id', id);
        }
        const updated = _check(res, 'updateCentralInventory');
        try {
            window.broadcastDataMutation?.('central_inventory', 'UPDATE', updated);
        } catch (e) { }
        return updated;
    },
    delete: async (id) => {
        if (!id) return true;
        // Server-authoritative RPC handles linked branch items and mutation guards atomically
        const { data, error } = await _db.rpc('delete_central_item', { p_item_id: id });
        if (!error) {
            try {
                window.broadcastDataMutation?.('central_inventory', 'DELETE', { id });
            } catch (e) { }
            return data;
        }
        console.warn('[CentralInventory] delete_central_item RPC notice, trying direct deletion:', error.message);
        const res = await _db.from('central_inventory').delete().eq('id', id);
        const delRes = _check(res, 'deleteCentralInventory');
        try {
            window.broadcastDataMutation?.('central_inventory', 'DELETE', { id });
        } catch (e) { }
        return delRes;
    },
    bulkDelete: async (ids) => {
        if (!ids || ids.length === 0) return true;
        const validIds = Array.isArray(ids) ? ids.filter(Boolean) : [ids];
        if (validIds.length === 0) return true;

        // Server-authoritative RPC handles linked branch items and mutation guards atomically
        const { data, error } = await _db.rpc('bulk_delete_central_items', { p_item_ids: validIds });
        if (!error) {
            return data;
        }
        console.warn('[CentralInventory] bulk_delete_central_items RPC notice, trying direct deletion:', error.message);
        const res = await _db.from('central_inventory').delete().in('id', validIds);
        return _check(res, 'bulkDeleteCentralInventory');
    },
    /**
     * Dispatch stock from the main store to a branch via the server-authoritative
     * dispatch_central_stock RPC.
     */
    dispatchStock: async (centralItemId, branchId, quantityToDispatch, notes = '') => {
        const { data, error } = await _db.rpc('dispatch_central_stock', {
            p_central_item_id: centralItemId,
            p_branch_id: branchId,
            p_qty: parseInt(quantityToDispatch),
            p_notes: notes || null
        });

        if (error) {
            console.error('[CentralInventory] dispatch_central_stock RPC error:', error.message);
            throw new Error(error.message);
        }
        try {
            window.broadcastDataMutation?.('central_inventory', 'UPDATE', { id: centralItemId, owner_id: window.state?.ownerId });
            window.broadcastDataMutation?.('inventory', 'UPDATE', { branch_id: branchId, central_item_id: centralItemId });
            window.broadcastDataMutation?.('stock_movements', 'INSERT', { branch_id: branchId, central_item_id: centralItemId, owner_id: window.state?.ownerId });
        } catch (e) { }
        return data;
    },

    /**
     * Deduct and return stock from a branch back to the Central Main Store.
     * Invokes server-authoritative return_stock_to_main_store RPC.
     */
    returnStockToMain: async (branchId, centralItemId, quantityToReturn, notes = '') => {
        const { data, error } = await _db.rpc('return_stock_to_main_store', {
            p_branch_id: branchId,
            p_central_item_id: centralItemId,
            p_qty: parseInt(quantityToReturn),
            p_notes: notes || null
        });

        if (error) {
            console.error('[CentralInventory] return_stock_to_main_store RPC error:', error.message);
            throw new Error(error.message);
        }
        try {
            window.broadcastDataMutation?.('central_inventory', 'UPDATE', { id: centralItemId, owner_id: window.state?.ownerId });
            window.broadcastDataMutation?.('inventory', 'UPDATE', { branch_id: branchId, central_item_id: centralItemId });
            window.broadcastDataMutation?.('stock_movements', 'INSERT', { branch_id: branchId, central_item_id: centralItemId, owner_id: window.state?.ownerId });
        } catch (e) { }
        return data;
    },

    /**
     * Reassign / Transfer stock directly between branches.
     * Invokes server-authoritative transfer_branch_to_branch_stock RPC.
     */
    transferBranchStock: async (fromBranchId, toBranchId, centralItemId, quantityToTransfer, notes = '') => {
        const { data, error } = await _db.rpc('transfer_branch_to_branch_stock', {
            p_from_branch_id: fromBranchId,
            p_to_branch_id: toBranchId,
            p_central_item_id: centralItemId,
            p_qty: parseInt(quantityToTransfer),
            p_notes: notes || null
        });

        if (error) {
            console.error('[CentralInventory] transfer_branch_to_branch_stock RPC error:', error.message);
            throw new Error(error.message);
        }
        try {
            window.broadcastDataMutation?.('inventory', 'UPDATE', { branch_id: fromBranchId, central_item_id: centralItemId });
            window.broadcastDataMutation?.('inventory', 'UPDATE', { branch_id: toBranchId, central_item_id: centralItemId });
            window.broadcastDataMutation?.('stock_movements', 'INSERT', { from_branch_id: fromBranchId, to_branch_id: toBranchId, central_item_id: centralItemId, owner_id: window.state?.ownerId });
            window.broadcastDataMutation?.('stock_transfers', 'INSERT', { from_branch_id: fromBranchId, to_branch_id: toBranchId, owner_id: window.state?.ownerId });
        } catch (e) { }
        return data;
    },

    /**
     * Restock an existing Central Inventory product in the Main Store.
     * Increments main_store_stock, updates cost price & supplier, and logs movement audit trail.
     *
     * @param {object} payload - Restock payload
     * @returns {object} - Updated item record
     */
    restock: async (payload) => {
        const {
            item_id,
            quantity,
            cost_price,
            supplier_id,
            reference_no,
            capital_account_id,
            update_selling_prices,
            retail_price,
            wholesale_price,
            notes,
            owner_id
        } = payload;

        const restockQty = parseInt(quantity) || 0;
        if (restockQty <= 0) {
            throw new Error('Restock quantity must be greater than zero.');
        }

        const unitCost = Number(cost_price) || 0;
        const totalCost = restockQty * unitCost;

        // 1. Fetch current item details
        const { data: item, error: fetchErr } = await _db
            .from('central_inventory')
            .select('*')
            .eq('id', item_id)
            .single();

        if (fetchErr || !item) {
            throw new Error(fetchErr?.message || 'Item not found in Central Inventory.');
        }

        const currentStock = Number(item.main_store_stock) || 0;
        const newStock = currentStock + restockQty;

        const updatePayload = {
            main_store_stock: newStock,
            updated_at: new Date().toISOString()
        };

        if (unitCost > 0) {
            updatePayload.cost_price = unitCost;
        }

        if (supplier_id) {
            updatePayload.supplier_id = supplier_id;
        }

        if (update_selling_prices) {
            if (Number(retail_price) > 0) {
                updatePayload.retail_price = Number(retail_price);
                updatePayload.price = Number(retail_price);
            }
            if (Number(wholesale_price) > 0) {
                updatePayload.wholesale_price = Number(wholesale_price);
            }
        }

        // 2. Update Central Inventory record
        const { data: updatedItem, error: updateErr } = await _db
            .from('central_inventory')
            .update(updatePayload)
            .eq('id', item_id)
            .select('*, suppliers(name)')
            .single();

        if (updateErr) {
            throw new Error(updateErr.message);
        }

        // 3. Write Stock Movements Audit Entry
        try {
            await _db.from('stock_movements').insert([{
                owner_id: owner_id || item.owner_id,
                central_item_id: item_id,
                movement_type: 'restock',
                quantity: restockQty,
                unit_cost: unitCost,
                total_cost: totalCost,
                supplier_id: supplier_id || item.supplier_id || null,
                reference_number: reference_no || null,
                notes: notes || `Restocked +${restockQty} units into Main Store`
            }]);
        } catch (e) {
            console.warn('[dbCentralInventory.restock] stock_movements log notice:', e.message);
        }

        // 4. Record Capital Expense if specified
        if (capital_account_id && totalCost > 0) {
            try {
                await _db.from('expenses').insert([{
                    owner_id: owner_id || item.owner_id,
                    category: 'Inventory Restock',
                    amount: totalCost,
                    date: new Date().toISOString().split('T')[0],
                    notes: `Restock purchase: ${item.name} (${restockQty} units @ ${unitCost}) - Ref: ${reference_no || 'N/A'}`,
                    account_id: capital_account_id
                }]);
            } catch (e) {
                console.warn('[dbCentralInventory.restock] expense entry notice:', e.message);
            }
        }

        try {
            window.broadcastDataMutation?.('central_inventory', 'UPDATE', updatedItem);
        } catch (e) { }

        return updatedItem;
    },

    /**
     * Batch Restock multiple Central Inventory products in a single operation.
     *
     * @param {object} payload - Batch payload containing items array, supplier_id, reference_no, capital_account_id, etc.
     * @returns {object} - { success: true, count, totalUnits, totalCost, updatedItems }
     */
    batchRestock: async (payload) => {
        const {
            items, // Array of { item_id, quantity, cost_price, update_selling_prices, retail_price, wholesale_price }
            supplier_id,
            reference_no,
            capital_account_id,
            notes,
            owner_id
        } = payload;

        if (!Array.isArray(items) || items.length === 0) {
            throw new Error('No items provided for batch restock.');
        }

        let grandTotalCost = 0;
        let totalUnits = 0;
        const updatedItems = [];
        const stockMovementInserts = [];

        for (const line of items) {
            const restockQty = parseInt(line.quantity) || 0;
            if (restockQty <= 0) continue;

            const unitCost = Number(line.cost_price) || 0;
            const lineTotalCost = restockQty * unitCost;
            grandTotalCost += lineTotalCost;
            totalUnits += restockQty;

            // Fetch current item
            const { data: item, error: fetchErr } = await _db
                .from('central_inventory')
                .select('*')
                .eq('id', line.item_id)
                .single();

            if (fetchErr || !item) {
                console.warn(`[batchRestock] Item ${line.item_id} not found, skipping.`);
                continue;
            }

            const currentStock = Number(item.main_store_stock) || 0;
            const newStock = currentStock + restockQty;

            const updatePayload = {
                main_store_stock: newStock,
                updated_at: new Date().toISOString()
            };

            if (unitCost > 0) {
                updatePayload.cost_price = unitCost;
            }
            if (supplier_id) {
                updatePayload.supplier_id = supplier_id;
            }
            if (line.update_selling_prices) {
                if (Number(line.retail_price) > 0) {
                    updatePayload.retail_price = Number(line.retail_price);
                    updatePayload.price = Number(line.retail_price);
                }
                if (Number(line.wholesale_price) > 0) {
                    updatePayload.wholesale_price = Number(line.wholesale_price);
                }
            }

            const { data: updatedItem, error: updateErr } = await _db
                .from('central_inventory')
                .update(updatePayload)
                .eq('id', line.item_id)
                .select('*, suppliers(name)')
                .single();

            if (!updateErr && updatedItem) {
                updatedItems.push(updatedItem);
                try {
                    window.broadcastDataMutation?.('central_inventory', 'UPDATE', updatedItem);
                } catch (e) { }
            }

            stockMovementInserts.push({
                owner_id: owner_id || item.owner_id,
                central_item_id: line.item_id,
                movement_type: 'restock',
                quantity: restockQty,
                unit_cost: unitCost,
                total_cost: lineTotalCost,
                supplier_id: supplier_id || item.supplier_id || null,
                reference_number: reference_no || null,
                notes: notes || `Batch Restock: +${restockQty} units (Ref: ${reference_no || 'N/A'})`
            });
        }

        if (updatedItems.length === 0) {
            throw new Error('No items were updated. Please check restock quantities.');
        }

        // Insert stock movements audit entries
        if (stockMovementInserts.length > 0) {
            try {
                await _db.from('stock_movements').insert(stockMovementInserts);
            } catch (e) {
                console.warn('[dbCentralInventory.batchRestock] stock_movements log notice:', e.message);
            }
        }

        // Record single consolidated expense if capital account specified
        if (capital_account_id && grandTotalCost > 0) {
            try {
                await _db.from('expenses').insert([{
                    owner_id: owner_id || updatedItems[0]?.owner_id,
                    category: 'Inventory Restock',
                    amount: grandTotalCost,
                    date: new Date().toISOString().split('T')[0],
                    notes: `Batch Restock: ${updatedItems.length} products (${totalUnits} total units) - Ref: ${reference_no || 'N/A'}`,
                    account_id: capital_account_id
                }]);
            } catch (e) {
                console.warn('[dbCentralInventory.batchRestock] expense entry notice:', e.message);
            }
        }

        return {
            success: true,
            count: updatedItems.length,
            totalUnits,
            totalCost: grandTotalCost,
            updatedItems
        };
    }
};

export const dbStockMovements = {
    fetchAll: async (ownerId, { branchId = null, movementType = null, limit = 200 } = {}) => {
        if (!ownerId && !branchId) return [];
        try {
            let query = _db
                .from('stock_movements')
                .select('*, branches(name)');

            if (ownerId) query = query.eq('owner_id', ownerId);
            if (branchId) query = query.eq('branch_id', branchId);
            if (movementType) query = query.eq('movement_type', movementType);

            const res = await withTimeout(query.order('created_at', { ascending: false }).limit(limit), 12000, 'fetchStockMovements');
            const data = _check(res, 'fetchStockMovements');
            if (Array.isArray(data) && data.length > 0) {
                cacheLocalItems('stock_movements', data);
            }
            return Array.isArray(data) ? data : [];
        } catch (err) {
            console.warn('[dbStockMovements] fetchAll fallback to localDb:', err.message);
            return await getLocalItems('stock_movements', m => (!ownerId || m.owner_id === ownerId) && (!branchId || m.branch_id === branchId), 'created_at', false);
        }
    },

    addMovement: async (payload) => {
        const res = await _db.from('stock_movements').insert([payload]).select().single();
        const data = _check(res, 'addStockMovement');
        try {
            if (data) cacheLocalItems('stock_movements', [data]);
            window.broadcastDataMutation?.('stock_movements', 'INSERT', data || payload);
        } catch (e) { }
        return data;
    },

    add: async function (payload) {
        return this.addMovement(payload);
    }
};


export const dbInventory = {
    fetchAll: async (branchId, { page = 1, pageSize = 10, lowStockOnly = false, search = '' } = {}) => {
        let cleanBranchId = branchId;
        if (typeof cleanBranchId === 'object' && cleanBranchId !== null) {
            cleanBranchId = cleanBranchId.id || cleanBranchId.branch_id || cleanBranchId.branchId || null;
        }
        if (!cleanBranchId || cleanBranchId === 'null' || cleanBranchId === 'undefined' || cleanBranchId === '[object Object]') {
            return { items: [], count: 0 };
        }
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const cleanSearch = (search || '').trim();

        const buildQuery = () => {
            let query = _db
                .from('inventory')
                .select('*', { count: 'exact' })
                .eq('branch_id', cleanBranchId);

            if (cleanSearch) {
                query = query.or(`name.ilike.%${cleanSearch}%,sku.ilike.%${cleanSearch}%,category.ilike.%${cleanSearch}%`);
            }

            if (lowStockOnly) {
                return query.order('name', { ascending: true });
            }
            return query.order('name', { ascending: true }).range(from, to);
        };

        const getLocalFallback = async () => {
            const allLocal = await getLocalItems('inventory', i => i.branch_id === cleanBranchId, 'name', true);
            let filtered = allLocal;
            if (cleanSearch) {
                const kw = cleanSearch.toLowerCase();
                filtered = filtered.filter(i =>
                    (i.name || '').toLowerCase().includes(kw) ||
                    (i.sku || '').toLowerCase().includes(kw) ||
                    (i.category || '').toLowerCase().includes(kw)
                );
            }
            if (lowStockOnly) {
                filtered = filtered.filter(i => i.item_type !== 'service' && (Number(i.quantity) || 0) <= (Number(i.min_threshold) || 0));
                return { items: filtered, count: filtered.length };
            }
            const paged = filtered.slice(from, from + pageSize);
            return { items: paged, count: filtered.length };
        };

        const result = await _resilientFetch({
            queryFn: buildQuery,
            localFallbackFn: getLocalFallback,
            table: 'inventory',
            label: lowStockOnly ? 'fetchInventoryLowStock' : 'fetchInventory',
            isPaged: true
        });

        if (lowStockOnly && Array.isArray(result?.items)) {
            const filtered = result.items.filter(i => i.item_type !== 'service' && (Number(i.quantity) || 0) <= (Number(i.min_threshold) || 0));
            return { items: filtered, count: filtered.length };
        }
        return result;
    },

    fetchLowStockCount: async (branchId) => {
        let cleanBranchId = branchId;
        if (typeof cleanBranchId === 'object' && cleanBranchId !== null) {
            cleanBranchId = cleanBranchId.id || cleanBranchId.branch_id || cleanBranchId.branchId || null;
        }
        if (!cleanBranchId || cleanBranchId === 'null' || cleanBranchId === 'undefined' || cleanBranchId === '[object Object]') {
            return 0;
        }
        try {
            const res = await _db
                .from('inventory')
                .select('quantity, min_threshold, item_type')
                .eq('branch_id', cleanBranchId);

            const data = _check(res, 'fetchLowStockCount');
            return data.filter(i => i.item_type !== 'service' && (Number(i.quantity) || 0) <= (Number(i.min_threshold) || 0)).length;
        } catch (err) {
            console.warn('[dbInventory] fetchLowStockCount error, computing from localDb:', err.message);
            const allLocal = await getLocalItems('inventory', i => i.branch_id === cleanBranchId);
            return allLocal.filter(i => i.item_type !== 'service' && (Number(i.quantity) || 0) <= (Number(i.min_threshold) || 0)).length;
        }
    },

    fetchTotalValue: async (branchId) => {
        let cleanBranchId = branchId;
        if (typeof cleanBranchId === 'object' && cleanBranchId !== null) {
            cleanBranchId = cleanBranchId.id || cleanBranchId.branch_id || cleanBranchId.branchId || null;
        }
        if (!cleanBranchId || cleanBranchId === 'null' || cleanBranchId === 'undefined' || cleanBranchId === '[object Object]') {
            return 0;
        }
        try {
            const res = await _db
                .from('inventory')
                .select('quantity, price, item_type')
                .eq('branch_id', cleanBranchId);

            const data = _check(res, 'fetchTotalValue');
            return data.filter(i => i.item_type !== 'service').reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0);
        } catch (err) {
            console.warn('[dbInventory] fetchTotalValue error, computing from localDb:', err.message);
            const allLocal = await getLocalItems('inventory', i => i.branch_id === cleanBranchId);
            return allLocal.filter(i => i.item_type !== 'service').reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.price) || 0)), 0);
        }
    },

    fetchOne: async (id) => {
        try {
            const res = await _db.from('inventory').select('*').eq('id', id).single();
            const data = _check(res, 'fetchOneInventory');
            if (data) upsertLocalItem('inventory', data);
            return data;
        } catch (err) {
            console.warn('[dbInventory] fetchOne error, checking localDb:', err.message);
            const item = await localDb.inventory.get(id);
            if (item) return item;
            throw err;
        }
    },

    add: async (branchId, { name, sku, quantity, min_threshold, price, category, central_item_id, is_from_main_store, wholesale_price, retail_price, unit, cost_price, item_type, is_isolated, isolation_status }) => {
        const resolvedRetail = retail_price ?? price ?? 0;
        const resolvedWholesale = wholesale_price ?? price ?? 0;
        const isService = item_type === 'service' || (unit && unit.toLowerCase() === 'service') || (category && category.toLowerCase().includes('service'));
        const resolvedItemType = isService ? 'service' : (item_type || 'product');

        // 1. Try authoritative create_branch_item RPC first
        try {
            const { data, error } = await _db.rpc('create_branch_item', {
                p_branch_id: branchId,
                p_name: name,
                p_sku: sku || null,
                p_category: category || 'General',
                p_price: resolvedRetail,
                p_cost_price: cost_price || 0,
                p_min_threshold: min_threshold || 5,
                p_retail_price: resolvedRetail,
                p_wholesale_price: resolvedWholesale,
                p_unit: unit || null
            });
            if (!error && data) {
                return data;
            }
        } catch (e) {
            console.warn('[dbInventory.add] create_branch_item RPC fallback to direct insert:', e);
        }

        // 2. Fallback to direct table insertion
        const payload = {
            branch_id: branchId, name, sku, quantity: quantity || 0, min_threshold,
            price: resolvedRetail,
            retail_price: resolvedRetail,
            wholesale_price: resolvedWholesale,
            cost_price: cost_price || 0,
            unit: unit || null,
            category,
            item_type: resolvedItemType
        };
        if (central_item_id !== undefined) payload.central_item_id = central_item_id;
        if (is_from_main_store !== undefined) payload.is_from_main_store = is_from_main_store;
        if (is_isolated !== undefined) payload.is_isolated = is_isolated;
        if (isolation_status !== undefined) {
            payload.isolation_status = isolation_status;
        } else if (central_item_id) {
            payload.isolation_status = 'registered';
            payload.is_isolated = false;
        } else {
            payload.isolation_status = 'unregistered';
            payload.is_isolated = false;
        }

        const tempId = generateClientUUID();
        const fallbackRecord = {
            id: tempId,
            ...payload,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sync_status: 'PENDING'
        };


        try {
            let res = await withTimeout(
                _db.from('inventory').insert(payload).select().single(),
                5000,
                'addInventoryItem'
            );

            if (res.error && res.error.message && res.error.message.includes("column")) {
                const cleanPayload = { ...payload };
                delete cleanPayload.unit;
                delete cleanPayload.retail_price;
                delete cleanPayload.wholesale_price;
                delete cleanPayload.is_isolated;
                delete cleanPayload.isolation_status;
                res = await withTimeout(
                    _db.from('inventory').insert(cleanPayload).select().single(),
                    5000,
                    'addInventoryItemClean'
                );
            }
            const added = _check(res, 'addInventoryItem');
            if (added) {
                try {
                    added.sync_status = 'SYNCED';
                    await upsertLocalItem('inventory', added);
                    window.broadcastDataMutation?.('inventory', 'INSERT', added);
                } catch (e) { }
                return added;
            }
            return fallbackRecord;
        } catch (err) {
            console.warn('[dbInventory.add] Cloud write failed or offline, caching locally to sync queue:', err.message);
            await upsertLocalItem('inventory', fallbackRecord);
            try {
                await localDb.sync_queue.add({
                    operation_id: tempId,
                    operation_type: 'CREATE_INVENTORY',
                    entity_type: 'inventory',
                    entity_id: tempId,
                    payload,
                    created_at: new Date().toISOString(),
                    status: 'PENDING',
                    attempt_count: 0
                });
            } catch (qErr) { }
            try { window.broadcastDataMutation?.('inventory', 'INSERT', fallbackRecord); } catch (e) { }
            return fallbackRecord;
        }
    },

    setIsolated: async (itemId, isIsolated) => {
        const status = isIsolated ? 'isolated' : 'unregistered';
        const updates = {
            is_isolated: !!isIsolated,
            isolation_status: status,
            updated_at: new Date().toISOString()
        };
        try {
            let res = await withTimeout(
                _db.from('inventory').update(updates).eq('id', itemId).select().single(),
                5000,
                'setIsolatedInventory'
            );
            if (res.error && res.error.message && res.error.message.includes('column')) {
                console.warn('[dbInventory.setIsolated] Cloud column missing, saving locally');
            } else {
                const updated = _check(res, 'setIsolatedInventory');
                if (updated) {
                    await upsertLocalItem('inventory', updated);
                    window.broadcastDataMutation?.('inventory', 'UPDATE', updated);
                    return updated;
                }
            }
        } catch (e) {
            console.warn('[dbInventory.setIsolated] Cloud update failed or offline:', e.message);
        }
        try {
            const localItem = await getLocalItem('inventory', itemId);
            if (localItem) {
                const updated = { ...localItem, ...updates, sync_status: 'PENDING' };
                await upsertLocalItem('inventory', updated);
                await localDb.sync_queue.add({
                    operation_id: generateClientUUID(),
                    operation_type: 'UPDATE_INVENTORY',
                    entity_type: 'inventory',
                    entity_id: itemId,
                    payload: updates,
                    created_at: new Date().toISOString(),
                    status: 'PENDING',
                    attempt_count: 0
                });
                window.broadcastDataMutation?.('inventory', 'UPDATE', updated);
                return updated;
            }
        } catch (err) {
            console.error('[dbInventory.setIsolated] Local update error:', err);
        }
        return updates;
    },

    registerToCentral: async (branchItemId, centralItemPayload, { distributeToBranches = false, ownerBranchIds = [] } = {}) => {
        let centralItem = null;
        try {
            centralItem = await dbCentralInventory.add(centralItemPayload);
        } catch (e) {
            console.error('[dbInventory.registerToCentral] Failed to add central item:', e);
            throw e;
        }

        if (!centralItem || !centralItem.id) {
            throw new Error('Failed to create central item record');
        }

        const linkUpdates = {
            central_item_id: centralItem.id,
            is_isolated: false,
            isolation_status: 'registered',
            registered_at: new Date().toISOString(),
            registered_by: window.state?.profile?.id || window.state?.ownerId || null,
            updated_at: new Date().toISOString()
        };

        try {
            let res = await withTimeout(
                _db.from('inventory').update(linkUpdates).eq('id', branchItemId).select().single(),
                5000,
                'linkBranchToCentral'
            );
            if (res.error && res.error.message && res.error.message.includes('column')) {
                const cleanUpdates = { central_item_id: centralItem.id, updated_at: new Date().toISOString() };
                res = await withTimeout(
                    _db.from('inventory').update(cleanUpdates).eq('id', branchItemId).select().single(),
                    5000,
                    'linkBranchToCentralClean'
                );
            }
            const updated = _check(res, 'linkBranchToCentral');
            if (updated) {
                await upsertLocalItem('inventory', updated);
                window.broadcastDataMutation?.('inventory', 'UPDATE', updated);
            }
        } catch (e) {
            console.warn('[dbInventory.registerToCentral] Cloud link failed, updating locally:', e.message);
            const localItem = await getLocalItem('inventory', branchItemId);
            if (localItem) {
                const updated = { ...localItem, ...linkUpdates, sync_status: 'PENDING' };
                await upsertLocalItem('inventory', updated);
                try {
                    await localDb.sync_queue.add({
                        operation_id: generateClientUUID(),
                        operation_type: 'UPDATE_INVENTORY',
                        entity_type: 'inventory',
                        entity_id: branchItemId,
                        payload: linkUpdates,
                        created_at: new Date().toISOString(),
                        status: 'PENDING',
                        attempt_count: 0
                    });
                } catch (_) {}
                window.broadcastDataMutation?.('inventory', 'UPDATE', updated);
            }
        }

        if (distributeToBranches && Array.isArray(ownerBranchIds) && ownerBranchIds.length > 0) {
            const targetBranches = ownerBranchIds.filter(bId => bId && bId !== centralItemPayload.originating_branch_id);
            for (const bId of targetBranches) {
                try {
                    await dbInventory.add(bId, {
                        name: centralItem.name,
                        sku: centralItem.sku,
                        category: centralItem.category,
                        quantity: 0,
                        min_threshold: centralItem.min_threshold || 5,
                        price: centralItem.retail_price ?? centralItem.price ?? 0,
                        retail_price: centralItem.retail_price ?? centralItem.price ?? 0,
                        wholesale_price: centralItem.wholesale_price ?? centralItem.price ?? 0,
                        cost_price: centralItem.cost_price ?? 0,
                        unit: centralItem.unit || null,
                        item_type: centralItem.item_type || 'product',
                        central_item_id: centralItem.id,
                        is_from_main_store: true,
                        is_isolated: false,
                        isolation_status: 'registered'
                    });
                } catch (bErr) {
                    console.warn(`[dbInventory.registerToCentral] Could not distribute to branch ${bId}:`, bErr.message);
                }
            }
        }

        return centralItem;
    },


    updateQty: async (itemId, quantity) => {
        const res = await _db
            .from('inventory')
            .update({ quantity })
            .eq('id', itemId);
        const result = _check(res, 'updateInventoryQty');
        try {
            window.broadcastDataMutation?.('inventory', 'UPDATE', { id: itemId, quantity, branch_id: window.state?.branchId });
        } catch (e) { }
        return result;
    },

    update: async (id, { name, sku, category, quantity, min_threshold, price, retail_price, wholesale_price }) => {
        const resolvedRetail = retail_price ?? price ?? 0;
        const resolvedWholesale = wholesale_price ?? price ?? 0;
        const payload = {
            name, sku, category, quantity, min_threshold,
            price: resolvedRetail,
            retail_price: resolvedRetail,
            wholesale_price: resolvedWholesale
        };

        const res = await _db
            .from('inventory')
            .update(payload)
            .eq('id', id);
        const updated = _check(res, 'updateInventory');
        try {
            window.broadcastDataMutation?.('inventory', 'UPDATE', { id, ...payload, branch_id: window.state?.branchId });
        } catch (e) { }
        return updated;
    },

    delete: async (id) => {
        const res = await _db.from('inventory').delete().eq('id', id);
        const delRes = _check(res, 'deleteInventory');
        try {
            window.broadcastDataMutation?.('inventory', 'DELETE', { id, branch_id: window.state?.branchId });
        } catch (e) { }
        return delRes;
    },
    bulkDelete: async (ids) => {
        const res = await _db.from('inventory').delete().in('id', ids);
        const delRes = _check(res, 'bulkDeleteInventory');
        try {
            ids.forEach(id => window.broadcastDataMutation?.('inventory', 'DELETE', { id, branch_id: window.state?.branchId }));
        } catch (e) { }
        return delRes;
    },
    bulkAdd: async (records) => {
        let res = await _db.from('inventory').insert(records);
        if (res.error && res.error.message && res.error.message.includes("column")) {
            const cleanRecords = records.map(r => {
                const copy = { ...r };
                delete copy.unit;
                delete copy.retail_price;
                delete copy.wholesale_price;
                return copy;
            });
            res = await _db.from('inventory').insert(cleanRecords);
        }
        const bulkAdded = _check(res, 'bulkAddInventory');
        try {
            window.broadcastDataMutation?.('inventory', 'INSERT', { branch_id: window.state?.branchId, records });
        } catch (e) { }
        return bulkAdded;
    },

    bulkRestock: async (updates) => {

        const results = await Promise.all(updates.map(u =>
            _db.from('inventory')
                .update({ quantity: u.quantity, price: u.price })
                .eq('id', u.id)
        ));

        results.forEach(res => _check(res, 'bulkRestockItem'));
        try {
            updates.forEach(u => window.broadcastDataMutation?.('inventory', 'UPDATE', { id: u.id, quantity: u.quantity, branch_id: window.state?.branchId }));
        } catch (e) { }
        return true;
    }
};

export const dbInventoryTags = {
    fetchAll: async (branchId) => {
        const res = await _db.from('inventory_tags').select('*').eq('branch_id', branchId);
        return _check(res, 'fetchInventoryTags');
    },
    add: async (branchId, inventoryId, tag) => {
        const res = await _db.from('inventory_tags').insert([{ branch_id: branchId, inventory_id: inventoryId, tag }]);
        return _check(res, 'addInventoryTag');
    },
    delete: async (tagId) => {
        const res = await _db.from('inventory_tags').delete().eq('id', tagId);
        return _check(res, 'deleteInventoryTag');
    }
};

export const dbTasks = {

    fetchByOwner: async (ownerId) => {
        if (!ownerId) return [];
        return await _resilientFetch({
            queryFn: async () => {
                const branchesRes = await _db.from('branches').select('id, name').eq('owner_id', ownerId);
                const branchList = branchesRes?.data || [];
                const branchIds = branchList.map(b => b.id);
                const branchMap = new Map(branchList.map(b => [b.id, b.name]));

                if (branchIds.length === 0) return { data: [], error: null };

                const res = await _db
                    .from('tasks')
                    .select('*')
                    .in('branch_id', branchIds)
                    .order('created_at', { ascending: false });
                if (Array.isArray(res?.data)) {
                    res.data = res.data.map(t => ({
                        ...t,
                        branch: { name: branchMap.get(t.branch_id) || 'Branch' }
                    }));
                }
                return res;
            },
            localFallbackFn: () => getLocalItems('tasks', t => !ownerId || t.owner_id === ownerId, 'created_at', false),
            table: 'tasks',
            label: 'fetchTasksByOwner'
        });
    },

    fetchAll: async (branchId, { page = 1, pageSize = 10, statusFilter = null } = {}) => {
        if (!branchId || branchId === 'null' || branchId === 'undefined') {
            return { items: [], count: 0 };
        }
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const buildQuery = () => {
            let req = _db
                .from('tasks')
                .select('*', { count: 'exact' })
                .eq('branch_id', branchId);

            if (statusFilter && statusFilter !== 'all') {
                if (statusFilter === 'deleted') {
                    req = req.eq('id', '00000000-0000-0000-0000-000000000000');
                } else {
                    req = req.eq('status', statusFilter);
                }
            }

            return req.order('created_at', { ascending: false }).range(from, to);
        };

        const getLocalFallback = async () => {
            let allLocal = await getLocalItems('tasks', t => t.branch_id === branchId, 'created_at', false);
            if (statusFilter && statusFilter !== 'all') {
                if (statusFilter === 'deleted') {
                    allLocal = [];
                } else {
                    allLocal = allLocal.filter(t => t.status === statusFilter);
                }
            }
            const paged = allLocal.slice(from, from + pageSize);
            return { items: paged, count: allLocal.length };
        };

        return await _resilientFetch({
            queryFn: buildQuery,
            localFallbackFn: getLocalFallback,
            table: 'tasks',
            label: 'fetchTasks',
            isPaged: true
        });
    },


    fetchOne: async (id) => {
        try {
            const res = await _db
                .from('tasks')
                .select('*, branch:branches(name)')
                .eq('id', id)
                .single();
            const data = _check(res, 'fetchOneTask');
            if (data) upsertLocalItem('tasks', data);
            return data;
        } catch (err) {
            console.warn('[dbTasks] fetchOne error, checking localDb:', err.message);
            const item = await localDb.tasks.get(id);
            if (item) return item;
            throw err;
        }
    },

    add: async (branchId, { title, description, priority, deadline }) => {
        const res = await _db
            .from('tasks')
            .insert({ branch_id: branchId, title, description, priority, deadline, status: 'pending' })
            .select()
            .single();
        const data = _check(res, 'addTask');
        try {
            if (data) {
                upsertLocalItem('tasks', data);
                window.broadcastDataMutation?.('tasks', 'INSERT', data);
            }
        } catch (e) { }

        // Fire-and-forget background push notification alert to branch staff & managers
        try {
            fetch('/api/push/task-alert', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    branchId,
                    taskId: data?.id,
                    title,
                    description,
                    priority,
                    deadline
                })
            }).catch(() => { });
        } catch (e) { }

        return data;
    },

    updateStatus: async (taskId, status) => {
        const res = await _db
            .from('tasks')
            .update({ status })
            .eq('id', taskId);
        const updated = _check(res, 'updateTaskStatus');
        try {
            window.broadcastDataMutation?.('tasks', 'UPDATE', { id: taskId, status, branch_id: window.state?.branchId });
        } catch (e) { }
        return updated;
    },
    bulkDelete: async (ids) => {
        const res = await _db.from('tasks').delete().in('id', ids);
        const delRes = _check(res, 'bulkDeleteTasks');
        try {
            ids.forEach(id => window.broadcastDataMutation?.('tasks', 'DELETE', { id, branch_id: window.state?.branchId }));
        } catch (e) { }
        return delRes;
    }
};

export const dbTaskTags = {
    fetchAll: async (branchId) => {
        const res = await _db.from('task_tags').select('*').eq('branch_id', branchId);
        return _check(res, 'fetchTaskTags');
    },
    add: async (branchId, taskId, tag) => {
        const res = await _db.from('task_tags').insert([{ branch_id: branchId, task_id: taskId, tag }]);
        return _check(res, 'addTaskTag');
    },
    delete: async (tagId) => {
        const res = await _db.from('task_tags').delete().eq('id', tagId);
        return _check(res, 'deleteTaskTag');
    }
};

export const dbTaskComments = {

    fetchAll: async (taskId) => {
        const res = await _db
            .from('task_comments')
            .select('*')
            .eq('task_id', taskId)
            .order('created_at', { ascending: true });
        return _check(res, 'fetchTaskComments');
    },

    add: async (taskId, senderRole, senderName, message) => {
        const res = await _db
            .from('task_comments')
            .insert({ task_id: taskId, sender_role: senderRole, sender_name: senderName, message })
            .select()
            .single();
        const data = _check(res, 'addTaskComment');
        try {
            if (data) {
                window.broadcastDataMutation?.('task_comments', 'INSERT', data);
            }
        } catch (e) { }
        return data;
    },

    delete: async (commentId) => {
        const res = await _db.from('task_comments').delete().eq('id', commentId);
        const delRes = _check(res, 'deleteTaskComment');
        try {
            window.broadcastDataMutation?.('task_comments', 'DELETE', { id: commentId });
        } catch (e) { }
        return delRes;
    },

    markAsRead: async (commentId) => {
        const res = await _db.from('task_comments').update({ is_read: true }).eq('id', commentId);
        return _check(res, 'markTaskCommentRead');
    }
};

export const dbNotes = {
    fetchAll: async (branchId, { page = 1, pageSize = 10 } = {}) => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        return await _resilientFetch({
            queryFn: () => _db.from('notes').select('*', { count: 'exact' }).eq('branch_id', branchId).order('created_at', { ascending: false }).range(from, to),
            localFallbackFn: async () => {
                const allLocal = await getLocalItems('notes', n => n.branch_id === branchId, 'created_at', false);
                const paged = allLocal.slice(from, from + pageSize);
                return { items: paged, count: allLocal.length };
            },
            table: 'notes',
            label: 'fetchNotes',
            isPaged: true
        });
    },

    fetchOne: async (id) => {
        try {
            const res = await _db.from('notes').select('*').eq('id', id).single();
            const data = _check(res, 'fetchOneNote');
            if (data) upsertLocalItem('notes', data);
            return data;
        } catch (err) {
            console.warn('[dbNotes] fetchOne error, checking localDb:', err.message);
            const item = await localDb.notes.get(id);
            if (item) return item;
            throw err;
        }
    },

    add: async (branchId, { title, content, tag }) => {
        const res = await _db
            .from('notes')
            .insert({ branch_id: branchId, title, content, tag })
            .select()
            .single();
        const created = _check(res, 'addNote');
        try {
            if (created) {
                upsertLocalItem('notes', created);
                window.broadcastDataMutation?.('notes', 'INSERT', created);
            }
        } catch (e) { }
        return created;
    },

    delete: async (noteId) => {
        const res = await _db.from('notes').delete().eq('id', noteId);
        const delRes = _check(res, 'deleteNote');
        try {
            window.broadcastDataMutation?.('notes', 'DELETE', { id: noteId, branch_id: window.state?.branchId });
        } catch (e) { }
        return delRes;
    },

    update: async (id, { title, content, tag }) => {
        const res = await _db
            .from('notes')
            .update({ title, content, tag })
            .eq('id', id);
        const updated = _check(res, 'updateNote');
        try {
            window.broadcastDataMutation?.('notes', 'UPDATE', { id, title, content, tag, branch_id: window.state?.branchId });
        } catch (e) { }
        return updated;
    },
    bulkDelete: async (ids) => {
        const res = await _db.from('notes').delete().in('id', ids);
        const delRes = _check(res, 'bulkDeleteNotes');
        try {
            ids.forEach(id => window.broadcastDataMutation?.('notes', 'DELETE', { id, branch_id: window.state?.branchId }));
        } catch (e) { }
        return delRes;
    }
};

export const dbNoteTags = {
    fetchAll: async (branchId) => {
        const res = await _db.from('note_tags').select('*').eq('branch_id', branchId);
        return _check(res, 'fetchNoteTags');
    },
    add: async (branchId, noteId, tag) => {
        const res = await _db.from('note_tags').insert([{ branch_id: branchId, note_id: noteId, tag }]);
        return _check(res, 'addNoteTag');
    },
    delete: async (tagId) => {
        const res = await _db.from('note_tags').delete().eq('id', tagId);
        return _check(res, 'deleteNoteTag');
    }
};

export const dbLoans = {
    fetchAll: async (branchId, { page = 1, pageSize = 10 } = {}) => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        return await _resilientFetch({
            queryFn: () => _db.from('loans').select('*', { count: 'exact' }).eq('branch_id', branchId).order('created_at', { ascending: false }).range(from, to),
            localFallbackFn: async () => {
                const allLocal = await getLocalItems('loans', l => l.branch_id === branchId, 'created_at', false);
                const paged = allLocal.slice(from, from + pageSize);
                return { items: paged, count: allLocal.length };
            },
            table: 'loans',
            label: 'fetchLoans',
            isPaged: true
        });
    },

    fetchOne: async (id) => {
        try {
            const res = await _db.from('loans').select('*').eq('id', id).single();
            const data = _check(res, 'fetchOneLoan');
            if (data) upsertLocalItem('loans', data);
            return data;
        } catch (err) {
            console.warn('[dbLoans] fetchOne error, checking localDb:', err.message);
            const item = await localDb.loans.get(id);
            if (item) return item;
            throw err;
        }
    },

    add: async (branchId, { type, party, amount, notes }) => {
        const tempId = generateClientUUID();
        const fallbackLoan = {
            id: tempId,
            branch_id: branchId,
            type,
            party,
            amount: Number(amount),
            notes: notes || null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sync_status: 'PENDING'
        };


        try {
            const res = await withTimeout(
                _db.from('loans').insert({ branch_id: branchId, type, party, amount: Number(amount), notes }).select().single(),
                5000,
                'addLoan'
            );
            const data = _check(res, 'addLoan');
            if (data) {
                data.sync_status = 'SYNCED';
                upsertLocalItem('loans', data);
                try { window.broadcastDataMutation?.('loans', 'INSERT', data); } catch (e) { }
                return data;
            }
            return fallbackLoan;
        } catch (err) {
            console.warn('[dbLoans.add] Cloud write failed or offline, caching locally to sync queue:', err.message);
            upsertLocalItem('loans', fallbackLoan);
            try {
                await localDb.sync_queue.add({
                    operation_id: tempId,
                    operation_type: 'CREATE_LOAN',
                    entity_type: 'loans',
                    entity_id: tempId,
                    payload: { branch_id: branchId, type, party, amount: Number(amount), notes },
                    created_at: new Date().toISOString(),
                    status: 'PENDING',
                    attempt_count: 0
                });
            } catch (qErr) { }
            try { window.broadcastDataMutation?.('loans', 'INSERT', fallbackLoan); } catch (e) { }
            return fallbackLoan;
        }
    },


    update: async (id, { type, party, amount, notes }) => {
        const res = await _db.from('loans').update({ type, party, amount, notes }).eq('id', id);
        const updated = _check(res, 'updateLoan');
        try {
            window.broadcastDataMutation?.('loans', 'UPDATE', { id, type, party, amount, notes, branch_id: window.state?.branchId });
        } catch (e) { }
        return updated;
    },
    delete: async (id) => {
        const res = await _db.from('loans').delete().eq('id', id);
        const delRes = _check(res, 'deleteLoan');
        try {
            window.broadcastDataMutation?.('loans', 'DELETE', { id, branch_id: window.state?.branchId });
        } catch (e) { }
        return delRes;
    },
    bulkDelete: async (ids) => {
        const res = await _db.from('loans').delete().in('id', ids);
        const delRes = _check(res, 'bulkDeleteLoans');
        try {
            ids.forEach(id => window.broadcastDataMutation?.('loans', 'DELETE', { id, branch_id: window.state?.branchId }));
        } catch (e) { }
        return delRes;
    }
};

export const dbLoanTags = {
    fetchAll: async (branchId) => {
        const res = await _db.from('loan_tags').select('*').eq('branch_id', branchId);
        return _check(res, 'fetchLoanTags');
    },
    add: async (branchId, loanId, tag) => {
        const res = await _db.from('loan_tags').insert([{ branch_id: branchId, loan_id: loanId, tag }]);
        return _check(res, 'addLoanTag');
    },
    delete: async (tagId) => {
        const res = await _db.from('loan_tags').delete().eq('id', tagId);
        return _check(res, 'deleteLoanTag');
    }
};

export const dbActivities = {
    fetchRecent: async (branchIds, limit = 20) => {
        if (!branchIds || branchIds.length === 0) return [];

        const [salesRes, expRes, tasksRes] = await Promise.all([
            _db.from('sales').select('id, amount, created_at, branches(name)').in('branch_id', branchIds).order('created_at', { ascending: false }).limit(limit),
            _db.from('expenses').select('id, amount, description, created_at, branches(name)').in('branch_id', branchIds).order('created_at', { ascending: false }).limit(limit),
            _db.from('tasks').select('id, title, status, created_at, branches(name)').in('branch_id', branchIds).order('created_at', { ascending: false }).limit(limit)
        ]);

        const sales = _check(salesRes, 'fetchRecentSales').map(s => ({
            type: 'sale',
            message: 'New sale recorded',
            branch: s.branches?.name || 'Unknown',
            amount: s.amount,
            created_at: s.created_at,
            time: new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));

        const expenses = _check(expRes, 'fetchRecentExpenses').map(e => ({
            type: 'expense',
            message: e.description || 'Expense recorded',
            branch: e.branches?.name || 'Unknown',
            amount: e.amount,
            created_at: e.created_at,
            time: new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));

        const tasks = _check(tasksRes, 'fetchRecentTasks').map(t => ({
            type: t.status === 'completed' ? 'task_completed' : 'task_assigned',
            message: t.status === 'completed' ? `Completed: ${t.title}` : `New task: ${t.title}`,
            branch: t.branches?.name || 'Unknown',
            amount: null,
            created_at: t.created_at,
            time: new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }));

        const all = [...sales, ...expenses, ...tasks];

        all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return all.slice(0, limit);
    }
};

export const dbRequests = {

    fetchAll: async (ownerId) => {
        if (!ownerId || ownerId === 'null' || ownerId === 'undefined') return [];
        try {
            const res = await _db
                .from('requests')
                .select('*, branches(name)')
                .eq('owner_id', ownerId)
                .order('created_at', { ascending: false });
            const data = _check(res, 'fetchRequestsAll');
            if (Array.isArray(data)) {
                cacheLocalItems('requests', data);
            }
            return data;
        } catch (err) {
            console.warn('[dbRequests] fetchAll error, falling back to localDb:', err.message);
            return await getLocalItems('requests', r => !ownerId || r.owner_id === ownerId, 'created_at', false);
        }
    },

    fetchByBranch: async (branchId) => {
        if (!branchId || branchId === 'null' || branchId === 'undefined') {
            return [];
        }
        try {
            const res = await _db
                .from('requests')
                .select('*')
                .eq('branch_id', branchId)
                .order('created_at', { ascending: false });
            const data = _check(res, 'fetchRequestsByBranch');
            if (Array.isArray(data)) {
                cacheLocalItems('requests', data);
            }
            return data;
        } catch (err) {
            console.warn('[dbRequests] fetchByBranch error, falling back to localDb:', err.message);
            return await getLocalItems('requests', r => r.branch_id === branchId, 'created_at', false);
        }
    },

    add: async (payload) => {
        const tempId = payload.id || generateClientUUID();
        const fallbackRequest = {
            id: tempId,
            ...payload,
            status: payload.status || 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sync_status: 'LOCAL_PENDING'
        };

        try {
            const res = await withTimeout(
                _db.from('requests').insert([payload]).select().single(),
                12000,
                'addRequest'
            );
            const created = _check(res, 'addRequest');
            if (created) {
                upsertLocalItem('requests', created);
                try { window.broadcastDataMutation?.('requests', 'INSERT', created); } catch (e) { }
                return created;
            }
            return fallbackRequest;
        } catch (err) {
            console.warn('[dbRequests.add] Cloud insert failed or offline, saving locally:', err.message);
            upsertLocalItem('requests', fallbackRequest);
            try {
                await localDb.sync_queue.add({
                    operation_id: tempId,
                    operation_type: 'CREATE_REQUEST',
                    entity_type: 'requests',
                    entity_id: tempId,
                    payload: payload,
                    created_at: new Date().toISOString(),
                    status: 'PENDING',
                    attempt_count: 0
                });
            } catch (qErr) { }
            try { window.broadcastDataMutation?.('requests', 'INSERT', fallbackRequest); } catch (e) { }
            return fallbackRequest;
        }
    },

    update: async (id, data) => {
        const updatedPayload = { ...data, updated_at: new Date().toISOString() };
        try {
            if (window.localDb && window.localDb.requests) {
                await window.localDb.requests.update(id, updatedPayload);
            }
        } catch (e) { }

        try {
            const res = await withTimeout(
                _db.from('requests').update(updatedPayload).eq('id', id).select().single(),
                12000,
                'updateRequest'
            );
            const updated = _check(res, 'updateRequest');
            if (updated) {
                upsertLocalItem('requests', updated);
                try { window.broadcastDataMutation?.('requests', 'UPDATE', { id, ...updated, owner_id: window.state?.ownerId, branch_id: window.state?.branchId }); } catch (e) { }
                return updated;
            }
            return { id, ...updatedPayload };
        } catch (err) {
            console.warn('[dbRequests.update] Cloud update failed or offline, queued to sync queue:', err.message);
            try {
                await localDb.sync_queue.add({
                    operation_id: generateClientUUID(),
                    operation_type: 'UPDATE_REQUEST',
                    entity_type: 'requests',
                    entity_id: id,
                    payload: updatedPayload,
                    created_at: new Date().toISOString(),
                    status: 'PENDING',
                    attempt_count: 0
                });
            } catch (qErr) { }
            try { window.broadcastDataMutation?.('requests', 'UPDATE', { id, ...updatedPayload, owner_id: window.state?.ownerId, branch_id: window.state?.branchId }); } catch (e) { }
            return { id, ...updatedPayload };
        }
    },


    delete: async (id) => {
        const res = await _db.from('requests').delete().eq('id', id);
        const delRes = _check(res, 'deleteRequest');
        try {
            window.broadcastDataMutation?.('requests', 'DELETE', { id, owner_id: window.state?.ownerId, branch_id: window.state?.branchId });
        } catch (e) { }
        return delRes;
    }
};

export const dbInventoryPurchases = {

    add: async (payload) => {
        const res = await _db
            .from('inventory_purchases')
            .insert([payload])
            .select()
            .single();
        const added = _check(res, 'addInventoryPurchase');
        try {
            if (added) {
                window.broadcastDataMutation?.('inventory_purchases', 'INSERT', added);
            }
        } catch (e) { }
        return added;
    },

    fetchByBranch: async (branchId) => {
        if (!branchId || branchId === 'null' || branchId === 'undefined') {
            return [];
        }
        const res = await _db
            .from('inventory_purchases')
            .select('*, inventory(name)')
            .eq('branch_id', branchId)
            .order('purchase_date', { ascending: false });
        return _check(res, 'fetchPurchases');
    }
};

export const dbMessages = {

    send: async (payload) => {
        const res = await _db
            .from('messages')
            .insert([payload])
            .select()
            .single();
        return _check(res, 'sendMessage');
    },

    fetchLast: async (branchId, isGroup = false, groupId = null) => {
        let query = _db
            .from('messages')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1);

        if (groupId) {
            query = query.eq('group_id', groupId);
        } else if (isGroup) {
            query = query.eq('is_group', true).is('group_id', null);
        } else {
            query = query.eq('branch_id', branchId).eq('is_group', false);
        }

        const res = await query;
        return res.data?.[0] || null;
    },

    fetchConversation: async (branchId, isGroup = false, groupId = null) => {
        let query = _db
            .from('messages')
            .select('*')
            .order('created_at', { ascending: true });

        if (groupId) {
            query = query.eq('group_id', groupId);
        } else if (isGroup) {
            query = query.eq('is_group', true).is('group_id', null);
        } else {
            query = query.eq('branch_id', branchId).eq('is_group', false);
        }

        const res = await query;
        const messages = _check(res, 'fetchConversation');

        const currentId = state.role === 'owner' ? state.profile.id : state.branchId;
        return messages.filter(m => {
            const deletedFor = m.deleted_for || [];
            return !deletedFor.includes(currentId);
        });
    },

    markRead: async (branchId, role, groupId = null, isGlobal = false) => {
        let query = _db.from('messages').update({
            is_read: true,
            is_delivered: true
        });

        const activeBranchId = (branchId === 'null' || branchId === 'undefined') ? null : branchId;

        if (groupId) {
            query = query.eq('group_id', groupId);
        } else if (isGlobal) {
            query = query.eq('is_group', true).is('group_id', null);
        } else if (activeBranchId) {
            query = query.eq('branch_id', activeBranchId).eq('is_group', false);
        } else {
            return [];
        }

        const res = await query.neq('sender_role', role).eq('is_read', false);
        return _check(res, 'markRead');
    },

    markDelivered: async (branchId, role) => {
        const activeBranchId = (branchId === 'null' || branchId === 'undefined') ? null : branchId;
        if (!activeBranchId) return [];

        const res = await _db
            .from('messages')
            .update({ is_delivered: true })
            .eq('branch_id', activeBranchId)
            .neq('sender_role', role)
            .eq('is_delivered', false);
        return _check(res, 'markDelivered');
    },

    getUnreadCount: async (branchId, role, groupId = null, isGlobal = false, countMode = 'conversations') => {
        let query = _db
            .from('messages')
            .select('*', { count: 'exact', head: countMode === 'messages' })
            .neq('sender_role', role)
            .eq('is_read', false);

        const activeBranchId = (branchId === 'null' || branchId === 'undefined') ? null : branchId;

        if (groupId) {
            query = query.eq('group_id', groupId);
        } else if (isGlobal) {
            query = query.eq('is_group', true).is('group_id', null);
        } else if (activeBranchId) {
            query = query.eq('branch_id', activeBranchId).eq('is_group', false);
        } else {
            // If branchId is null/undefined and not querying group/global, return 0 count
            return 0;
        }

        const res = await query;
        if (countMode === 'messages') return res.count || 0;

        const messages = res.data || [];
        if (messages.length === 0) return 0;

        const distinctConvos = new Set();
        messages.forEach(msg => {
            if (msg.group_id) {
                distinctConvos.add(`group_${msg.group_id}`);
            } else if (msg.is_group && !msg.group_id) {
                distinctConvos.add('group_global');
            } else if (msg.branch_id) {
                distinctConvos.add(`branch_${msg.branch_id}`);
            }
        });

        return distinctConvos.size;
    },

    toggleReaction: async (messageId, emoji, userRef) => {

        const { data: msg } = await _db
            .from('messages')
            .select('reactions')
            .eq('id', messageId)
            .single();

        let reactions = msg?.reactions || [];
        const index = reactions.findIndex(r => r.userId === userRef.id && r.emoji === emoji);

        if (index > -1) {
            reactions.splice(index, 1);
        } else {
            reactions.push({ userId: userRef.id, name: userRef.name, emoji });
        }

        const res = await _db
            .from('messages')
            .update({ reactions })
            .eq('id', messageId);

        return _check(res, 'toggleReaction');
    },

    pinForBranch: async (messageId, branchId) => {
        const res = await _db
            .from('pinned_messages')
            .insert([{ message_id: messageId, branch_id: branchId }]);
        return _check(res, 'pinForBranch');
    },

    dismissPin: async (pinId) => {
        const res = await _db
            .from('pinned_messages')
            .delete()
            .eq('id', pinId);
        return _check(res, 'dismissPin');
    },

    fetchPins: async (branchId) => {
        const res = await _db
            .from('pinned_messages')
            .select('*, messages(*)')
            .eq('branch_id', branchId)
            .order('created_at', { ascending: false });
        return _check(res, 'fetchPins');
    },

    createGroup: async (name, memberBranchIds, createdBy) => {
        const { data: group, error: gErr } = await _db
            .from('chat_groups')
            .insert([{ name, created_by: createdBy }])
            .select()
            .single();
        if (gErr) throw gErr;

        const members = memberBranchIds.map(bid => ({ group_id: group.id, branch_id: bid }));
        const { error: mErr } = await _db.from('group_members').insert(members);
        if (mErr) throw mErr;

        return group;
    },

    fetchGroups: async (branchId = null) => {
        let query = _db.from('chat_groups').select('*, group_members!inner(*)');
        if (branchId) {
            query = query.eq('group_members.branch_id', branchId);
        }
        const res = await query;
        return _check(res, 'fetchGroups');
    },

    starMessage: async (messageId, userId) => {
        const res = await _db.from('starred_messages').insert([{ message_id: messageId, user_id: userId }]);
        return _check(res, 'starMessage');
    },

    unstarMessage: async (messageId, userId) => {
        const res = await _db.from('starred_messages').delete().match({ message_id: messageId, user_id: userId });
        return _check(res, 'unstarMessage');
    },

    fetchStarred: async (userId) => {
        const res = await _db.from('starred_messages').select('*, messages(*)').eq('user_id', userId);
        return _check(res, 'fetchStarred');
    },

    archiveRoom: async (userId, targetId, type) => {
        const res = await _db.from('archived_conversations').insert([{ user_id: userId, target_id: targetId, type }]);
        return _check(res, 'archiveRoom');
    },

    fetchArchived: async (userId) => {
        const res = await _db.from('archived_conversations').select('*').eq('user_id', userId);
        return _check(res, 'fetchArchived');
    },

    uploadFile: async (file, path = 'chat-attachments') => {
        const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
        const filePath = `${path}/${fileName}`;

        const { data, error } = await _db.storage
            .from('chat-attachments')
            .upload(filePath, file);

        if (error) throw error;

        const { data: { publicUrl } } = _db.storage
            .from('chat-attachments')
            .getPublicUrl(filePath);

        return {
            url: publicUrl,
            name: file.name,
            type: file.type,
            size: file.size
        };
    },

    softDelete: async (messageId, userId) => {

        const { data: msg } = await _db.from('messages').select('deleted_for').eq('id', messageId).single();
        const deletedFor = msg?.deleted_for || [];
        if (!deletedFor.includes(userId)) {
            deletedFor.push(userId);
        }
        const res = await _db.from('messages').update({ deleted_for: deletedFor }).eq('id', messageId);
        return _check(res, 'softDelete');
    },

    hardDelete: async (messageId) => {
        const res = await _db.from('messages').delete().eq('id', messageId);
        return _check(res, 'hardDelete');
    }
};

export const dbStaff = {
    fetchAllByOwner: async (ownerId) => {
        if (!ownerId) return [];
        return await _resilientFetch({
            queryFn: () => _db.from('staff').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false }),
            localFallbackFn: () => getLocalItems('staff', s => s.owner_id === ownerId, 'created_at', false),
            table: 'staff',
            label: 'fetchAllByOwnerStaff'
        });
    },
    fetchAll: async (branchId) => {
        if (!branchId) return [];
        return await _resilientFetch({
            queryFn: () => _db.from('staff').select('*').eq('branch_id', branchId).order('created_at', { ascending: false }),
            localFallbackFn: () => getLocalItems('staff', s => !branchId || s.branch_id === branchId, 'created_at', false),
            table: 'staff',
            label: 'fetchStaff'
        });
    },
    fetchOne: async (id) => {
        try {
            const res = await _db.from('staff').select('*').eq('id', id).single();
            const data = _check(res, 'fetchStaffOne');
            if (data) upsertLocalItem('staff', data);
            return data;
        } catch (err) {
            console.warn('[dbStaff] fetchOne error, checking localDb:', err.message);
            const item = await localDb.staff.get(id);
            if (item) return item;
            throw err;
        }
    },
    add: async (data) => {
        const tempId = data.id || crypto.randomUUID();
        const record = { id: tempId, created_at: new Date().toISOString(), ...data };
        upsertLocalItem('staff', record);
        try {
            const res = await _db.from('staff').insert([data]).select().single();
            const serverItem = _check(res, 'addStaff');
            const finalItem = serverItem || record;
            if (serverItem) upsertLocalItem('staff', serverItem);
            try {
                window.broadcastDataMutation?.('staff', 'INSERT', finalItem);
            } catch (e) { }
            return finalItem;
        } catch (err) {
            console.warn('[dbStaff] Cloud add error, queued locally:', err.message);
            if (typeof window.queueOfflineOperation === 'function') {
                window.queueOfflineOperation('staff', data);
            }
            try {
                window.broadcastDataMutation?.('staff', 'INSERT', record);
            } catch (e) { }
            return record;
        }
    },
    update: async (id, data) => {
        data.updated_at = new Date().toISOString();
        const existing = (await localDb.staff.get(id)) || {};
        const updatedRecord = { ...existing, ...data, id };
        upsertLocalItem('staff', updatedRecord);
        try {
            const res = await _db.from('staff').update(data).eq('id', id).select().single();
            const serverItem = _check(res, 'updateStaff');
            const finalItem = serverItem || updatedRecord;
            if (serverItem) upsertLocalItem('staff', serverItem);
            try {
                window.broadcastDataMutation?.('staff', 'UPDATE', finalItem);
            } catch (e) { }
            return finalItem;
        } catch (err) {
            console.warn('[dbStaff] Cloud update error, updated localDb:', err.message);
            try {
                window.broadcastDataMutation?.('staff', 'UPDATE', updatedRecord);
            } catch (e) { }
            return updatedRecord;
        }
    },
    delete: async (id) => {
        deleteLocalItem('staff', id);
        try {
            const res = await _db.from('staff').delete().eq('id', id);
            const delRes = _check(res, 'deleteStaff');
            try {
                window.broadcastDataMutation?.('staff', 'DELETE', { id, branch_id: window.state?.branchId, owner_id: window.state?.ownerId });
            } catch (e) { }
            return delRes;
        } catch (err) {
            console.warn('[dbStaff] Cloud delete error, deleted from localDb:', err.message);
            try {
                window.broadcastDataMutation?.('staff', 'DELETE', { id, branch_id: window.state?.branchId, owner_id: window.state?.ownerId });
            } catch (e) { }
            return true;
        }
    }
};

export const dbAttendance = {
    fetchForDate: async (branchId, date) => {
        try {
            const res = await withTimeout(
                _db.from('attendance')
                    .select('*, staff!inner(*)')
                    .eq('staff.branch_id', branchId)
                    .eq('date', date),
                12000,
                'fetchAttendance'
            );
            const data = _check(res, 'fetchAttendance');
            if (Array.isArray(data) && data.length > 0) {
                cacheLocalItems('attendance', data);
            }
            return data || [];
        } catch (err) {
            console.warn('[dbAttendance] fetchForDate fallback to localDb:', err.message);
            return await getLocalItems('attendance', a => a.date === date, 'created_at', false);
        }
    },
    fetchByBranchAndDate: async (branchId, date) => {
        if (!branchId) return [];
        try {
            const res = await withTimeout(
                _db.from('attendance').select('*').eq('branch_id', branchId).eq('date', date).order('created_at', { ascending: false }),
                12000,
                'fetchBranchAttendance'
            );
            const data = _check(res, 'fetchBranchAttendance') || [];
            if (Array.isArray(data) && data.length > 0) {
                cacheLocalItems('attendance', data);
            }
            return data;
        } catch (err) {
            console.warn('[dbAttendance] fetchByBranchAndDate fallback to localDb:', err.message);
            return await getLocalItems('attendance', a => a.branch_id === branchId && a.date === date, 'created_at', false);
        }
    },

    mark: async (data) => {
        const res = await _db.from('attendance').upsert([data], { onConflict: 'staff_id,date' }).select().single();
        const marked = _check(res, 'markAttendance');
        try {
            if (marked) {
                window.broadcastDataMutation?.('attendance', 'INSERT', marked);
            }
        } catch (e) { }
        return marked;
    },
    create: async (data) => {
        const res = await _db.from('attendance').insert(data).select().single();
        const created = _check(res, 'createAttendance');
        try {
            if (created) window.broadcastDataMutation?.('attendance', 'INSERT', created);
        } catch (e) { }
        return created;
    },
    clockOut: async (id) => {
        const now = new Date().toISOString();
        const res = await _db.from('attendance').update({ clock_out: now }).eq('id', id).select().single();
        const updated = _check(res, 'clockOutAttendance');
        try {
            if (updated) window.broadcastDataMutation?.('attendance', 'UPDATE', updated);
        } catch (e) { }
        return updated;
    },
    delete: async (id) => {
        const res = await _db.from('attendance').delete().eq('id', id);
        _check(res, 'deleteAttendance');
        try {
            window.broadcastDataMutation?.('attendance', 'DELETE', { id });
        } catch (e) { }
        return true;
    }
};


export const dbSuppliers = {
    fetchAll: async (enterpriseId) => {
        const targetId = enterpriseId || window.state?.ownerId;
        if (!targetId || targetId === 'null' || targetId === 'undefined') return [];
        return await _resilientFetch({
            queryFn: () => _db.from('suppliers').select('*').eq('enterprise_id', targetId).order('name', { ascending: true }),
            localFallbackFn: () => getLocalItems('suppliers', s => !targetId || s.enterprise_id === targetId || s.owner_id === targetId, 'name', true),
            table: 'suppliers',
            label: 'fetchSuppliers'
        });
    },
    fetchOne: async (id) => {
        try {
            const res = await _db.from('suppliers').select('*').eq('id', id).single();
            const data = _check(res, 'fetchSupplierOne');
            if (data) upsertLocalItem('suppliers', data);
            return data;
        } catch (err) {
            console.warn('[dbSuppliers] fetchOne error, checking localDb:', err.message);
            const item = await localDb.suppliers.get(id);
            if (item) return item;
            throw err;
        }
    },
    add: async (data) => {
        const tempId = generateClientUUID();
        const fallbackSupplier = {
            id: tempId,
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sync_status: 'PENDING'
        };


        try {
            const res = await withTimeout(
                _db.from('suppliers').insert([data]).select().single(),
                5000,
                'addSupplier'
            );
            const item = _check(res, 'addSupplier');
            if (item) {
                item.sync_status = 'SYNCED';
                upsertLocalItem('suppliers', item);
                try { window.broadcastDataMutation?.('suppliers', 'INSERT', item); } catch (e) { }
                return item;
            }
            return fallbackSupplier;
        } catch (err) {
            console.warn('[dbSuppliers.add] Cloud write failed or offline, caching locally to sync queue:', err.message);
            upsertLocalItem('suppliers', fallbackSupplier);
            try {
                await localDb.sync_queue.add({
                    operation_id: tempId,
                    operation_type: 'CREATE_SUPPLIER',
                    entity_type: 'suppliers',
                    entity_id: tempId,
                    payload: data,
                    created_at: new Date().toISOString(),
                    status: 'PENDING',
                    attempt_count: 0
                });
            } catch (qErr) { }
            try { window.broadcastDataMutation?.('suppliers', 'INSERT', fallbackSupplier); } catch (e) { }
            return fallbackSupplier;
        }
    },

    update: async (id, data) => {
        const res = await _db.from('suppliers').update(data).eq('id', id).select().single();
        const item = _check(res, 'updateSupplier');
        try {
            if (item) {
                upsertLocalItem('suppliers', item);
                window.broadcastDataMutation?.('suppliers', 'UPDATE', item);
            }
        } catch (e) { }
        return item;
    },
    delete: async (id) => {
        deleteLocalItem('suppliers', id);
        const res = await _db.from('suppliers').delete().eq('id', id);
        const delRes = _check(res, 'deleteSupplier');
        try {
            window.broadcastDataMutation?.('suppliers', 'DELETE', { id, owner_id: window.state?.ownerId });
        } catch (e) { }
        return delRes;
    }
};

export const dbPurchaseOrders = {
    fetchAll: async (branchId) => {
        try {
            const res = await withTimeout(
                _db.from('purchase_orders').select('*, suppliers(*)').eq('branch_id', branchId).order('created_at', { ascending: false }),
                12000,
                'fetchPOs'
            );
            const data = _check(res, 'fetchPOs');
            if (Array.isArray(data) && data.length > 0) {
                cacheLocalItems('purchase_orders', data);
            }
            return data || [];
        } catch (err) {
            console.warn('[dbPurchaseOrders] fetchAll fallback to localDb:', err.message);
            return await getLocalItems('purchase_orders', p => !branchId || p.branch_id === branchId, 'created_at', false);
        }
    },

    fetchWithItems: async (poId) => {
        const poRes = await _db.from('purchase_orders').select('*, suppliers(*)').eq('id', poId).single();
        const po = _check(poRes, 'fetchPO');
        if (!po) return null;
        const itemsRes = await _db.from('po_items').select('*').eq('po_id', poId);
        po.items = _check(itemsRes, 'fetchPOItems');
        return po;
    },
    create: async (poData, itemsData = [], clientTxId = null) => {
        const resolvedItems = (itemsData && itemsData.length > 0) ? itemsData : (poData.items || []);
        const { data, error } = await _db.rpc('create_purchase_order', {
            p_branch_id: poData.branch_id,
            p_supplier_id: poData.supplier_id || null,
            p_po_data: {
                order_date: poData.order_date || null,
                expected_date: poData.expected_date || null,
                notes: poData.notes || null,
                status: poData.status || 'draft'
            },
            p_items: resolvedItems.map(item => ({
                inventory_id: item.inventory_id || null,
                item_name: item.item_name || item.name || '',
                quantity: item.quantity,
                unit_cost: item.unit_cost
            })),
            p_client_tx_id: clientTxId || null
        });
        if (error) {
            console.error('[PO] create_purchase_order RPC error:', error.message);
            throw error;
        }
        try {
            if (data) {
                window.broadcastDataMutation?.('purchase_orders', 'INSERT', data);
            }
        } catch (e) { }
        return data;
    },
    add: async function (poData, itemsData = []) {
        return this.create(poData, itemsData);
    },
    updateStatus: async (id, status) => {
        const res = await _db.from('purchase_orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select().single();
        const po = _check(res, 'updatePOStatus');
        try {
            if (po) {
                window.broadcastDataMutation?.('purchase_orders', 'UPDATE', po);
            }
        } catch (e) { }
        return po;
    }
};

export const dbQuotations = {
    fetchAll: async (branchId) => {
        return await _resilientFetch({
            queryFn: () => _db.from('quotations').select('*').eq('branch_id', branchId).order('created_at', { ascending: false }),
            localFallbackFn: () => getLocalItems('quotations', q => !branchId || q.branch_id === branchId || q.owner_id === branchId, 'created_at', false),
            table: 'quotations',
            label: 'fetchQuotations'
        });
    },
    fetchWithItems: async (quoteId) => {
        try {
            const qRes = await _db.from('quotations').select('*').eq('id', quoteId).single();
            const quote = _check(qRes, 'fetchQuotation');
            if (!quote) return null;
            const itemsRes = await _db.from('quotation_items').select('*').eq('quotation_id', quoteId);
            quote.items = _check(itemsRes, 'fetchQuotationItems');
            if (quote) upsertLocalItem('quotations', quote);
            return quote;
        } catch (err) {
            console.warn('[dbQuotations] fetchWithItems error, checking localDb:', err.message);
            const item = await localDb.quotations.get(quoteId);
            if (item) return item;
            throw err;
        }
    },
    create: async (quoteData, itemsData) => {
        const { data: quote, error: qErr } = await _db.from('quotations').insert([quoteData]).select().single();
        if (qErr) throw qErr;

        const itemsToInsert = itemsData.map(item => ({ ...item, quotation_id: quote.id }));
        const { error: itemErr } = await _db.from('quotation_items').insert(itemsToInsert);
        if (itemErr) {

            await _db.from('quotations').delete().eq('id', quote.id);
            throw itemErr;
        }
        try {
            if (quote) {
                upsertLocalItem('quotations', quote);
                window.broadcastDataMutation?.('quotations', 'INSERT', quote);
            }
        } catch (e) { }

        return quote;
    },
    add: async function (quoteData, itemsData = []) {
        return this.create(quoteData, itemsData);
    },
    updateStatus: async (id, status) => {
        const res = await _db.from('quotations').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select().single();
        const updated = _check(res, 'updateQuotationStatus');
        try {
            if (updated) {
                window.broadcastDataMutation?.('quotations', 'UPDATE', updated);
            }
        } catch (e) { }
        return updated;
    },
    delete: async (id) => {
        deleteLocalItem('quotations', id);
        const res = await _db.from('quotations').delete().eq('id', id);
        const delRes = _check(res, 'deleteQuotation');
        try {
            window.broadcastDataMutation?.('quotations', 'DELETE', { id, branch_id: window.state?.branchId });
        } catch (e) { }
        return delRes;
    }
};

export const dbDocuments = {
    fetchAll: async (branchId) => {
        return await _resilientFetch({
            queryFn: () => _db.from('documents').select('*, document_items(*)').eq('branch_id', branchId).order('created_at', { ascending: false }),
            localFallbackFn: () => getLocalItems('documents', d => !branchId || d.branch_id === branchId, 'created_at', false),
            table: 'documents',
            label: 'fetchDocuments'
        });
    },
    fetchOne: async (id) => {
        try {
            const res = await _db.from('documents').select('*, document_items(*)').eq('id', id).single();
            const data = _check(res, 'fetchOneDocument');
            if (data) upsertLocalItem('documents', data);
            return data;
        } catch (err) {
            console.warn('[dbDocuments] fetchOne error, checking localDb:', err.message);
            const item = await localDb.documents.get(id);
            if (item) return item;
            throw err;
        }
    },
    fetchInvoices: async (branchId) => {
        return await _resilientFetch({
            queryFn: () => _db.from('documents').select('*, document_items(*)').eq('branch_id', branchId).eq('type', 'invoice').order('created_at', { ascending: false }),
            localFallbackFn: () => getLocalItems('documents', d => (!branchId || d.branch_id === branchId) && d.type === 'invoice', 'created_at', false),
            table: 'documents',
            label: 'fetchInvoices'
        });
    },
    add: async (data, itemsData = []) => {
        const { data: doc, error: docErr } = await _db.from('documents').insert([data]).select().single();
        if (docErr) throw docErr;

        if (itemsData && itemsData.length > 0) {
            const itemsToInsert = itemsData.map(item => ({ ...item, document_id: doc.id }));
            const { error: itemErr } = await _db.from('document_items').insert(itemsToInsert);
            if (itemErr) {

                await _db.from('documents').delete().eq('id', doc.id);
                throw itemErr;
            }
        }
        return doc;
    },
    delete: async (id) => {
        const res = await _db.from('documents').delete().eq('id', id);
        return _check(res, 'deleteDocument');
    }
};

export const dbCapital = {
    fetchAccounts: async (ownerId) => {
        const targetOwnerId = ownerId || window.state?.ownerId;
        if (!targetOwnerId) return [];
        return await _resilientFetch({
            queryFn: () => _db.from('capital_accounts').select('*').eq('owner_id', targetOwnerId).order('created_at', { ascending: false }),
            localFallbackFn: async () => {
                const local = await getLocalItems('capital_accounts', a => a.owner_id === targetOwnerId, 'created_at', false);
                if (local && local.length > 0) return local;
                try {
                    const cached = localStorage.getItem(`bms_cap_accs_${targetOwnerId}`);
                    if (cached) return JSON.parse(cached);
                } catch (e) {}
                return [];
            },
            table: 'capital_accounts',
            label: 'fetchCapitalAccounts'
        });
    },
    addAccount: async (data) => {
        const tempId = generateClientUUID();
        const fallbackAcc = {
            id: tempId,
            ...data,
            balance: Number(data.balance || data.initial_balance || 0),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sync_status: 'PENDING'
        };


        try {
            const res = await withTimeout(
                _db.from('capital_accounts').insert([data]).select().single(),
                5000,
                'addCapitalAccount'
            );
            const account = _check(res, 'addCapitalAccount');
            if (account) {
                account.sync_status = 'SYNCED';
                upsertLocalItem('capital_accounts', account);
                try { window.broadcastDataMutation?.('capital_accounts', 'INSERT', account); } catch (e) { }
                return account;
            }
            return fallbackAcc;
        } catch (err) {
            console.warn('[dbCapital.addAccount] Cloud write failed or offline, caching locally to sync queue:', err.message);
            upsertLocalItem('capital_accounts', fallbackAcc);
            try {
                await localDb.sync_queue.add({
                    operation_id: tempId,
                    operation_type: 'CREATE_CAPITAL_ACCOUNT',
                    entity_type: 'capital_accounts',
                    entity_id: tempId,
                    payload: data,
                    created_at: new Date().toISOString(),
                    status: 'PENDING',
                    attempt_count: 0
                });
            } catch (qErr) { }
            try { window.broadcastDataMutation?.('capital_accounts', 'INSERT', fallbackAcc); } catch (e) { }
            return fallbackAcc;
        }
    },
    createAccount: async function (data) {
        return this.addAccount(data);
    },
    updateAccount: async (id, data) => {
        const res = await _db.from('capital_accounts').update(data).eq('id', id).select().single();
        const account = _check(res, 'updateCapitalAccount');
        try {
            window.broadcastDataMutation?.('capital_accounts', 'UPDATE', account);
        } catch (e) { }
        return account;
    },
    deleteAccount: async (id) => {
        const res = await _db.from('capital_accounts').delete().eq('id', id);
        const delRes = _check(res, 'deleteCapitalAccount');
        try {
            window.broadcastDataMutation?.('capital_accounts', 'DELETE', { id });
        } catch (e) { }
        return delRes;
    },
    fetchTransactions: async (ownerId) => {
        if (!ownerId || ownerId === 'null' || ownerId === 'undefined') return [];
        try {
            const req = _db.from('capital_transactions').select('*').eq('owner_id', ownerId).order('transaction_date', { ascending: false });
            const res = await withTimeout(req, 7000, 'fetchCapitalTransactions');
            return _check(res, 'fetchCapitalTransactions') || [];
        } catch (err) {
            console.warn('[dbCapital] fetchTransactions fallback:', err);
            return [];
        }
    },
    addTransaction: async (data) => {
        const tempId = generateClientUUID();
        const fallbackTx = {
            id: tempId,
            ...data,
            created_at: new Date().toISOString(),
            sync_status: 'PENDING'
        };


        try {
            const res = await withTimeout(
                _db.from('capital_transactions').insert([data]).select().single(),
                5000,
                'addCapitalTransaction'
            );
            const tx = _check(res, 'addCapitalTransaction');
            if (tx) {
                try { window.broadcastDataMutation?.('capital_transactions', 'INSERT', tx); } catch (e) { }
                return tx;
            }
            return fallbackTx;
        } catch (err) {
            console.warn('[dbCapital.addTransaction] Cloud write failed or offline, caching locally to sync queue:', err.message);
            try {
                await localDb.sync_queue.add({
                    operation_id: tempId,
                    operation_type: 'CREATE_CAPITAL_TX',
                    entity_type: 'capital_transactions',
                    entity_id: tempId,
                    payload: data,
                    created_at: new Date().toISOString(),
                    status: 'PENDING',
                    attempt_count: 0
                });
            } catch (qErr) { }
            try { window.broadcastDataMutation?.('capital_transactions', 'INSERT', fallbackTx); } catch (e) { }
            return fallbackTx;
        }
    },

    adjustBalance: async (accountId, amountDelta, transactionDetails = null) => {
        if (!accountId || !amountDelta) return;
        const delta = parseFloat(amountDelta || 0);
        const ownerId = window.state?.ownerId || window.state?.currentUserUuid || (window.state?.profile && window.state.profile.id);

        try {
            if (accountId === 'external') {
                if (ownerId && transactionDetails) {
                    await dbCapital.addTransaction({
                        owner_id: ownerId,
                        account_id: null,
                        transaction_type: delta < 0 ? 'drawing' : 'injection',
                        amount: Math.abs(delta),
                        transaction_date: new Date().toISOString().slice(0, 10),
                        notes: `[External / Third-Party Source] ${transactionDetails.notes || 'External Capital Out of Pocket'}`,
                        reference_no: transactionDetails.reference_no || 'EXT-SOURCE'
                    });
                }
                return;
            }

            let localAcc = await localDb.capital_accounts.get(accountId);
            const currentBal = localAcc ? parseFloat(localAcc.balance || 0) : 0;
            const newBal = Math.max(0, currentBal + delta);

            if (localAcc) {
                localAcc.balance = newBal;
                localAcc.updated_at = new Date().toISOString();
                await localDb.capital_accounts.put(localAcc);
                try { window.broadcastDataMutation?.('capital_accounts', 'UPDATE', localAcc); } catch (e) { }
            }

            try {
                const resAcc = await _db.from('capital_accounts').select('balance, owner_id').eq('id', accountId).single();
                if (resAcc.data) {
                    const cloudCurrentBal = parseFloat(resAcc.data.balance || 0);
                    const cloudNewBal = Math.max(0, cloudCurrentBal + delta);
                    await _db.from('capital_accounts').update({ balance: cloudNewBal }).eq('id', accountId);
                }
            } catch (cloudErr) { }

            if (transactionDetails && ownerId) {
                await dbCapital.addTransaction({
                    owner_id: ownerId,
                    account_id: accountId,
                    transaction_type: delta < 0 ? 'drawing' : 'injection',
                    amount: Math.abs(delta),
                    transaction_date: new Date().toISOString().slice(0, 10),
                    notes: transactionDetails.notes || 'Capital Movement',
                    reference_no: transactionDetails.reference_no || null
                });
            }
        } catch (err) {
            console.warn('[dbCapital.adjustBalance] Error updating balance:', err);
        }
    }
};

export const dbAssets = {
    fetchAll: async (ownerId) => {
        const targetOwnerId = ownerId || window.state?.ownerId;
        if (!targetOwnerId) return [];
        return await _resilientFetch({
            queryFn: () => _db.from('business_assets').select('*').eq('owner_id', targetOwnerId).order('purchase_date', { ascending: false }),
            localFallbackFn: async () => {
                const local = await getLocalItems('business_assets', a => a.owner_id === targetOwnerId, 'purchase_date', false);
                if (local && local.length > 0) return local;
                try {
                    const cached = localStorage.getItem(`bms_cached_assets_${targetOwnerId}`);
                    if (cached) return JSON.parse(cached);
                } catch (e) {}
                return [];
            },
            table: 'business_assets',
            label: 'fetchBusinessAssets'
        });
    },

    add: async (data) => {
        const tempId = generateClientUUID();
        const fallbackAsset = {
            id: tempId,
            ...data,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            sync_status: 'PENDING'
        };

        try {
            const res = await withTimeout(
                _db.from('business_assets').insert([data]).select().single(),
                5000,
                'addBusinessAsset'
            );
            const item = _check(res, 'addBusinessAsset');
            if (item) {
                item.sync_status = 'SYNCED';
                upsertLocalItem('business_assets', item);
                try { window.broadcastDataMutation?.('business_assets', 'INSERT', item); } catch (e) { }
                return item;
            }
            return fallbackAsset;
        } catch (err) {
            console.warn('[dbAssets.add] Cloud write failed or offline, caching locally to sync queue:', err.message);
            upsertLocalItem('business_assets', fallbackAsset);
            try {
                await localDb.sync_queue.add({
                    operation_id: tempId,
                    operation_type: 'CREATE_ASSET',
                    entity_type: 'business_assets',
                    entity_id: tempId,
                    payload: data,
                    created_at: new Date().toISOString(),
                    status: 'PENDING',
                    attempt_count: 0
                });
            } catch (qErr) { }
            try { window.broadcastDataMutation?.('business_assets', 'INSERT', fallbackAsset); } catch (e) { }
            return fallbackAsset;
        }
    },

    addBatch: async (itemsArray) => {
        if (!itemsArray || itemsArray.length === 0) return [];
        const res = await _db.from('business_assets').insert(itemsArray).select();
        const items = _check(res, 'addBusinessAssetsBatch');
        try {
            window.broadcastDataMutation?.('business_assets', 'INSERT', { items });
        } catch (e) { }
        return items;
    },
    update: async (id, data) => {
        const res = await _db.from('business_assets').update(data).eq('id', id).select().single();
        const item = _check(res, 'updateBusinessAsset');
        try {
            if (item) {
                window.broadcastDataMutation?.('business_assets', 'UPDATE', item);
            }
        } catch (e) { }
        return item;
    },
    delete: async (id) => {
        const res = await _db.from('business_assets').delete().eq('id', id);
        const delRes = _check(res, 'deleteBusinessAsset');
        try {
            window.broadcastDataMutation?.('business_assets', 'DELETE', { id, owner_id: window.state?.ownerId });
        } catch (e) { }
        return delRes;
    }
};

export const dbAssetMaintenance = {
    fetchAll: async (ownerId) => {
        try {
            const res = await withTimeout(
                _db.from('asset_maintenance_logs').select('*').eq('owner_id', ownerId).order('service_date', { ascending: false }),
                12000,
                'fetchAssetMaintenanceLogs'
            );
            const data = _check(res, 'fetchAssetMaintenanceLogs') || [];
            if (Array.isArray(data) && data.length > 0) {
                cacheLocalItems('asset_maintenance', data);
            }
            return data;
        } catch (err) {
            console.warn('[dbAssetMaintenance] fetchAll fallback to localDb:', err);
            return await getLocalItems('asset_maintenance', m => !ownerId || m.owner_id === ownerId, 'maintenance_date', false);
        }
    },
    add: async (data) => {
        const res = await _db.from('asset_maintenance_logs').insert([data]).select().single();
        const item = _check(res, 'addAssetMaintenanceLog');
        try {
            if (item) {
                cacheLocalItems('asset_maintenance', [item]);
                window.broadcastDataMutation?.('business_assets', 'INSERT', item);
            }
        } catch (e) { }
        return item;
    },
    delete: async (id) => {
        deleteLocalItem('asset_maintenance', id);
        const res = await _db.from('asset_maintenance_logs').delete().eq('id', id);
        const delRes = _check(res, 'deleteAssetMaintenanceLog');
        try {
            window.broadcastDataMutation?.('business_assets', 'DELETE', { id, owner_id: window.state?.ownerId });
        } catch (e) { }
        return delRes;
    }
};

export const dbBusinessLoans = {
    fetchAll: async (ownerId) => {
        const targetOwnerId = ownerId || window.state?.ownerId;
        if (!targetOwnerId) return [];
        return await _resilientFetch({
            queryFn: () => _db.from('business_loans').select('*').eq('owner_id', targetOwnerId).order('created_at', { ascending: false }),
            localFallbackFn: () => getLocalItems('business_loans', l => l.owner_id === targetOwnerId, 'created_at', false),
            table: 'business_loans',
            label: 'fetchBusinessLoans'
        });
    },
    create: async (payload) => {
        const res = await _db.from('business_loans').insert([payload]).select().single();
        const item = _check(res, 'createBusinessLoan');
        try {
            if (item) {
                cacheLocalItems('business_loans', [item]);
                window.broadcastDataMutation?.('business_loans', 'INSERT', item);
            }
        } catch (e) { }
        return item;
    },
    add: async function (payload) {
        return this.create(payload);
    },
    addBatch: async function (itemsArray) {
        if (!itemsArray || itemsArray.length === 0) return [];
        const res = await _db.from('business_loans').insert(itemsArray).select();
        const items = _check(res, 'addBusinessLoansBatch');
        try {
            if (Array.isArray(items) && items.length > 0) {
                cacheLocalItems('business_loans', items);
                window.broadcastDataMutation?.('business_loans', 'INSERT', { items });
            }
        } catch (e) { }
        return items || [];
    },
    update: async (id, data) => {
        const res = await _db.from('business_loans').update(data).eq('id', id).select().single();
        const item = _check(res, 'updateBusinessLoan');
        try {
            if (item) {
                cacheLocalItems('business_loans', [item]);
                window.broadcastDataMutation?.('business_loans', 'UPDATE', item);
            }
        } catch (e) { }
        return item;
    },
    delete: async (id) => {
        deleteLocalItem('business_loans', id);
        const res = await _db.from('business_loans').delete().eq('id', id);
        const delRes = _check(res, 'deleteBusinessLoan');
        try {
            window.broadcastDataMutation?.('business_loans', 'DELETE', { id, owner_id: window.state?.ownerId });
        } catch (e) { }
        return delRes;
    },
    fetchRepayments: async (ownerId) => {
        if (!ownerId || ownerId === 'null' || ownerId === 'undefined') return [];
        try {
            const req = _db.from('loan_repayments').select('*').eq('owner_id', ownerId).order('payment_date', { ascending: false });
            const res = await withTimeout(req, 12000, 'fetchLoanRepayments');
            const data = _check(res, 'fetchLoanRepayments');
            const items = Array.isArray(data) ? data : [];
            if (items.length > 0) {
                try { localStorage.setItem(`bms_cached_loan_repayments_${ownerId}`, JSON.stringify(items)); } catch (e) { }
            }
            return items;
        } catch (err) {
            console.warn('[dbBusinessLoans] fetchRepayments fallback:', err);
            try {
                const cached = localStorage.getItem(`bms_cached_loan_repayments_${ownerId}`);
                if (cached) return JSON.parse(cached);
            } catch (e) { }
            return [];
        }
    },
    addRepayment: async (data) => {
        const res = await _db.from('loan_repayments').insert([data]).select().single();
        const item = _check(res, 'addLoanRepayment');
        try {
            if (item) {
                window.broadcastDataMutation?.('business_loans', 'UPDATE', item);
            }
        } catch (e) { }
        return item;
    }
};

export const dbPayroll = {
    fetchAll: async (ownerId) => {
        const targetOwnerId = ownerId || window.state?.ownerId;
        if (!targetOwnerId) return [];
        return await _resilientFetch({
            queryFn: () => _db.from('payroll').select('*').eq('owner_id', targetOwnerId).order('created_at', { ascending: false }),
            localFallbackFn: () => getLocalItems('payroll', p => !targetOwnerId || p.owner_id === targetOwnerId, 'created_at', false),
            table: 'payroll',
            label: 'fetchPayroll'
        });
    },
    create: async (payload) => {
        const res = await _db.from('payroll').insert(payload).select();
        const data = _check(res, 'createPayroll');
        try {
            if (data && data[0]) {
                cacheLocalItems('payroll', data);
                window.broadcastDataMutation?.('payroll', 'INSERT', data[0]);
            }
        } catch (e) { }
        return data;
    },
    add: async function (payload) {
        return this.create(payload);
    },
    markPaid: async (id) => {
        const res = await _db.from('payroll').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id).select();
        const data = _check(res, 'markPayrollPaid');
        try {
            if (data && data[0]) {
                cacheLocalItems('payroll', data);
                window.broadcastDataMutation?.('payroll', 'UPDATE', data[0]);
            }
        } catch (e) { }
        return data;
    },
    delete: async (id) => {
        deleteLocalItem('payroll', id);
        const res = await _db.from('payroll').delete().eq('id', id);
        _check(res, 'deletePayroll');
        try {
            window.broadcastDataMutation?.('payroll', 'DELETE', { id });
        } catch (e) { }
        return true;
    }
};

export const dbShifts = {
    fetchAll: async (ownerId, targetBIds = []) => {
        if (!ownerId) return [];
        const queryFn = () => {
            let q = _db.from('shifts').select('*').order('created_at', { ascending: false }).limit(200);
            if (Array.isArray(targetBIds) && targetBIds.length > 0) {
                q = q.in('branch_id', targetBIds);
            } else {
                q = q.eq('owner_id', ownerId);
            }
            return q;
        };
        return await _resilientFetch({
            queryFn,
            localFallbackFn: () => getLocalItems('shifts', s => (!ownerId || s.owner_id === ownerId) || (targetBIds.length > 0 && targetBIds.includes(s.branch_id)), 'created_at', false),
            table: 'shifts',
            label: 'fetchShifts'
        });
    },
    create: async (payload) => {
        const res = await _db.from('shifts').insert(payload).select();
        const data = _check(res, 'createShift');
        try {
            if (data && data[0]) {
                cacheLocalItems('shifts', data);
                window.broadcastDataMutation?.('shifts', 'INSERT', data[0]);
            }
        } catch (e) { }
        return data;
    },
    startShift: async (branchId, cashierId, openingCash = 0) => {
        const payload = {
            branch_id: branchId,
            cashier_id: cashierId,
            opening_cash: Number(openingCash) || 0,
            start_time: new Date().toISOString(),
            status: 'active'
        };
        const res = await _db.from('shifts').insert(payload).select().single();
        const data = _check(res, 'startShift');
        try {
            if (data) {
                cacheLocalItems('shifts', [data]);
                window.broadcastDataMutation?.('shifts', 'INSERT', data);
            }
        } catch (e) { }
        return data;
    },
    delete: async (id) => {
        deleteLocalItem('shifts', id);
        const res = await _db.from('shifts').delete().eq('id', id);
        _check(res, 'deleteShift');
        try {
            window.broadcastDataMutation?.('shifts', 'DELETE', { id });
        } catch (e) { }
        return true;
    }
};

export const dbAnnouncements = {
    fetchAll: async (ownerId) => {
        if (!ownerId || ownerId === 'null' || ownerId === 'undefined') return [];
        try {
            const res = await withTimeout(
                _db.from('announcements').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false }),
                12000,
                'fetchAnnouncements'
            );
            const data = _check(res, 'fetchAnnouncements');
            if (Array.isArray(data)) {
                cacheLocalItems('announcements', data);
            }
            return Array.isArray(data) ? data : [];
        } catch (err) {
            console.warn('[dbAnnouncements] fetchAll fallback to localDb:', err.message);
            const local = await getLocalItems('announcements', a => a.owner_id === ownerId, 'created_at', false);
            return local || [];
        }
    },
    create: async (payload) => {
        const res = await _db.from('announcements').insert(payload).select();
        const data = _check(res, 'createAnnouncement');
        try {
            if (data && data[0]) {
                cacheLocalItems('announcements', [data[0]]);
                window.broadcastDataMutation?.('announcements', 'INSERT', data[0]);
            }
        } catch (e) { }
        return data;
    },
    add: async function (payload) {
        return this.create(payload);
    },
    delete: async (id) => {
        const res = await _db.from('announcements').delete().eq('id', id);
        _check(res, 'deleteAnnouncement');
        try {
            deleteLocalItem('announcements', id);
            window.broadcastDataMutation?.('announcements', 'DELETE', { id });
        } catch (e) { }
        return true;
    }
};

export const dbPromotions = {
    fetchAll: async (ownerId) => {
        if (!ownerId || ownerId === 'null' || ownerId === 'undefined') return [];
        try {
            const res = await withTimeout(
                _db.from('promotions').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false }),
                12000,
                'fetchPromotions'
            );
            const data = _check(res, 'fetchPromotions');
            if (Array.isArray(data) && data.length > 0) {
                cacheLocalItems('promotions', data);
            }
            return Array.isArray(data) ? data : [];
        } catch (err) {
            console.warn('[dbPromotions] fetchAll fallback to localDb:', err.message);
            return await getLocalItems('promotions', p => !ownerId || p.owner_id === ownerId, 'created_at', false);
        }
    },
    create: async (payload) => {
        const res = await _db.from('promotions').insert(payload).select();
        const data = _check(res, 'createPromotion');
        try {
            if (data && data[0]) {
                cacheLocalItems('promotions', data);
                window.broadcastDataMutation?.('promotions', 'INSERT', data[0]);
            }
        } catch (e) { }
        return data;
    },
    add: async function (payload) {
        return this.create(payload);
    },
    toggleActive: async (id, newState) => {
        const res = await _db.from('promotions').update({ is_active: newState }).eq('id', id).select();
        const data = _check(res, 'togglePromotionActive');
        try {
            if (data && data[0]) {
                cacheLocalItems('promotions', data);
                window.broadcastDataMutation?.('promotions', 'UPDATE', data[0]);
            }
        } catch (e) { }
        return data;
    },
    delete: async (id) => {
        deleteLocalItem('promotions', id);
        const res = await _db.from('promotions').delete().eq('id', id);
        _check(res, 'deletePromotion');
        try {
            window.broadcastDataMutation?.('promotions', 'DELETE', { id });
        } catch (e) { }
        return true;
    }
};

export const dbGoals = {
    fetchAll: async (ownerId) => {
        if (!ownerId || ownerId === 'null' || ownerId === 'undefined') return [];
        try {
            const res = await withTimeout(
                _db.from('goals').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false }),
                12000,
                'fetchGoals'
            );
            const data = _check(res, 'fetchGoals');
            if (Array.isArray(data) && data.length > 0) {
                cacheLocalItems('goals', data);
            }
            return Array.isArray(data) ? data : [];
        } catch (err) {
            console.warn('[dbGoals] fetchAll fallback to localDb:', err.message);
            return await getLocalItems('goals', g => !ownerId || g.owner_id === ownerId, 'created_at', false);
        }
    },
    fetchMetrics: async (branchIds = [], currentMonth = '') => {
        if (!Array.isArray(branchIds) || branchIds.length === 0) {
            return { sales: [], tasks: [], customers: [] };
        }
        try {
            const [salesRes, tasksRes, custRes] = await Promise.all([
                _db.from('sales').select('amount, branch_id').in('branch_id', branchIds).gte('created_at', (currentMonth || new Date().toISOString().slice(0, 7)) + '-01'),
                _db.from('tasks').select('status, branch_id').in('branch_id', branchIds),
                _db.from('customers').select('id, branch_id').in('branch_id', branchIds)
            ]);
            return {
                sales: salesRes.data || [],
                tasks: tasksRes.data || [],
                customers: custRes.data || []
            };
        } catch (err) {
            console.warn('[dbGoals] fetchMetrics fallback:', err.message);
            return { sales: [], tasks: [], customers: [] };
        }
    },
    create: async (payload) => {
        const res = await _db.from('goals').insert(payload).select();
        const data = _check(res, 'createGoal');
        try {
            if (data && data[0]) {
                cacheLocalItems('goals', data);
                window.broadcastDataMutation?.('goals', 'INSERT', data[0]);
            }
        } catch (e) { }
        return data;
    },
    add: async function (payload) {
        return this.create(payload);
    },
    delete: async (id) => {
        const res = await _db.from('goals').delete().eq('id', id);
        _check(res, 'deleteGoal');
        try {
            window.broadcastDataMutation?.('goals', 'DELETE', { id });
        } catch (e) { }
        return true;
    }
};

export const dbBilling = {
    fetchPlans: async () => {
        try {
            const res = await withTimeout(
                _db.from('sys_pricing_plans').select('*'),
                7000,
                'fetchPricingPlans'
            );
            return _check(res, 'fetchPricingPlans') || [];
        } catch (err) {
            console.warn('[dbBilling] fetchPlans fallback:', err.message);
            return [];
        }
    },
    logAction: async (payload) => {
        try {
            await _db.from('saas_audit_logs').insert(payload);
        } catch (err) {
            console.warn('[dbBilling] logAction warning:', err.message);
        }
    }
};

export const dbCustomRoles = {
    fetchAll: async (ownerId) => {
        if (!ownerId || ownerId === 'null' || ownerId === 'undefined') return [];
        try {
            const res = await withTimeout(
                _db.from('sys_custom_roles').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false }),
                7000,
                'fetchCustomRoles'
            );
            return _check(res, 'fetchCustomRoles') || [];
        } catch (err) {
            console.warn('[dbCustomRoles] fetchAll fallback:', err.message);
            return [];
        }
    },
    create: async (payload) => {
        const res = await _db.from('sys_custom_roles').insert(payload).select();
        return _check(res, 'createCustomRole');
    },
    add: async function (payload) {
        return this.create(payload);
    }
};

export const dbBackup = {
    fetchFullBackupData: async (ownerId) => {
        if (!ownerId || ownerId === 'null' || ownerId === 'undefined') return null;
        try {
            const [salesRes, prodRes, custRes, expRes] = await Promise.all([
                _db.from('sales').select('*').eq('owner_id', ownerId).limit(5000),
                _db.from('products').select('*').eq('owner_id', ownerId).limit(5000),
                _db.from('customers').select('*').eq('owner_id', ownerId).limit(5000),
                _db.from('expenses').select('*').eq('owner_id', ownerId).limit(5000)
            ]);
            return {
                sales: salesRes.data || [],
                products: prodRes.data || [],
                customers: custRes.data || [],
                expenses: expRes.data || []
            };
        } catch (err) {
            console.warn('[dbBackup] fetchFullBackupData error:', err.message);
            return null;
        }
    }
};

export const dbAudit = {
    fetchAuditTrail: async ({ ownerId, targetBIds = [], since = '' }) => {
        try {
            const [sRes, eRes, tRes, rRes] = await Promise.all([
                _db.from('sales').select('id, amount, created_at, branch_id, payment').in('branch_id', targetBIds).gte('created_at', since).order('created_at', { ascending: false }).limit(80),
                _db.from('expenses').select('id, amount, category, description, created_at, branch_id').in('branch_id', targetBIds).gte('created_at', since).order('created_at', { ascending: false }).limit(80),
                _db.from('tasks').select('id, title, status, created_at, branch_id').in('branch_id', targetBIds).gte('created_at', since).order('created_at', { ascending: false }).limit(80),
                _db.from('requests').select('id, subject, type, status, created_at').eq('owner_id', ownerId).gte('created_at', since).order('created_at', { ascending: false }).limit(50)
            ]);
            return {
                sales: sRes.data || [],
                expenses: eRes.data || [],
                tasks: tRes.data || [],
                requests: rRes.data || []
            };
        } catch (err) {
            console.warn('[dbAudit] fetchAuditTrail fallback:', err.message);
            return { sales: [], expenses: [], tasks: [], requests: [] };
        }
    }
};

export const dbSecurity = {
    fetchActiveSessions: async (ownerId) => {
        try {
            const res = await _db.from('sys_active_sessions').select('*').eq('user_id', ownerId).order('last_seen', { ascending: false });
            return res.data || [];
        } catch (err) {
            console.warn('[dbSecurity] fetchActiveSessions fallback:', err.message);
            return [];
        }
    },
    fetchSecurityLogs: async (ownerId) => {
        if (!ownerId || ownerId === 'null' || ownerId === 'undefined') return [];
        try {
            const res = await _db.from('saas_audit_logs').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false }).limit(20);
            return res.data || [];
        } catch (err) {
            console.warn('[dbSecurity] fetchSecurityLogs fallback:', err.message);
            return [];
        }
    }
};

export const dbPopups = {
    fetchActive: async () => {
        try {
            const res = await _db.from('sys_popups').select('*').eq('active', true).order('created_at', { ascending: false });
            return res.data || [];
        } catch (err) {
            console.warn('[dbPopups] fetchActive fallback:', err.message);
            return [];
        }
    }
};

export const dbSurveys = {
    fetchActive: async () => {
        try {
            const res = await _db.from('sys_surveys').select('*').eq('status', 'active').order('created_at', { ascending: false });
            return res.data || [];
        } catch (err) {
            console.warn('[dbSurveys] fetchActive fallback:', err.message);
            return [];
        }
    },

    checkExistingResponse: async (surveyId, userId) => {
        try {
            const res = await _db.from('sys_survey_responses').select('id').eq('survey_id', surveyId).eq('user_id', userId).maybeSingle();
            return res.data || null;
        } catch (err) {
            return null;
        }
    },
    submitResponse: async (payload) => {
        try {
            const rpcRes = await _db.rpc('submit_sys_survey_response', payload);
            if (rpcRes.error) {
                return await _db.from('sys_survey_responses').insert({
                    survey_id: payload.p_survey_id,
                    user_id: payload.p_user_id || (await _db.auth.getUser())?.data?.user?.id,
                    rating: payload.p_rating,
                    feedback: payload.p_feedback,
                    nps_score: payload.p_nps_score,
                    metadata: payload.p_metadata || {}
                });
            }
            return rpcRes;
        } catch (err) {
            console.warn('[dbSurveys] submitResponse fallback:', err.message);
            return null;
        }
    }
};

export const dbBanners = {
    fetchActive: async () => {
        try {
            const rpcRes = await _db.rpc('get_active_sys_banners');
            if (rpcRes.data && Array.isArray(rpcRes.data)) {
                return rpcRes.data;
            }
            const res = await _db.from('sys_banners').select('*').eq('active', true);
            return res.data || [];
        } catch (err) {
            console.warn('[dbBanners] fetchActive fallback:', err.message);
            return [];
        }
    },
    recordCtaClick: async (bannerId) => {
        try {
            await _db.rpc('record_banner_cta_click', { p_banner_id: bannerId });
        } catch (err) {
            console.warn('[dbBanners] recordCtaClick warning:', err.message);
        }
    }
};

export const dbTickets = {
    create: async (payload) => {
        const res = await _db.from('sys_tickets').insert(payload).select();
        return _check(res, 'createSupportTicket');
    },
    add: async function (payload) {
        return this.create(payload);
    }
};

export const dbStockTransfers = {
    fetchAllForBranch: async (branchId) => {
        if (!branchId || branchId === 'null' || branchId === 'undefined') return [];
        try {
            const req = _db
                .from('stock_transfers')
                .select('*, from_branch:branches!stock_transfers_from_branch_id_fkey(name), to_branch:branches!stock_transfers_to_branch_id_fkey(name)')
                .or(`from_branch_id.eq.${branchId},to_branch_id.eq.${branchId}`)
                .order('created_at', { ascending: false });
            const res = await withTimeout(req, 12000, 'fetchStockTransfers');
            const data = _check(res, 'fetchStockTransfers') || [];
            if (Array.isArray(data) && data.length > 0) {
                cacheLocalItems('stock_transfers', data);
            }
            return data;
        } catch (err) {
            console.warn('[dbStockTransfers] fetchAllForBranch fallback to localDb:', err.message);
            return await getLocalItems('stock_transfers', t => t.from_branch_id === branchId || t.to_branch_id === branchId, 'created_at', false);
        }
    },
    create: async (payload) => {
        const tempId = generateClientUUID();
        const fallbackTransfer = {
            id: tempId,
            ...payload,
            status: payload.status || 'pending',
            created_at: new Date().toISOString(),
            sync_status: 'PENDING'
        };

        try {
            const res = await withTimeout(
                _db.from('stock_transfers').insert(payload).select().single(),
                5000,
                'createStockTransfer'
            );
            const created = _check(res, 'createStockTransfer');
            if (created) {
                cacheLocalItems('stock_transfers', [created]);
                try { window.broadcastDataMutation?.('stock_transfers', 'INSERT', created); } catch (e) { }
                return created;
            }
            return fallbackTransfer;
        } catch (err) {
            console.warn('[dbStockTransfers.create] Cloud write failed or offline, saving to sync queue:', err.message);
            cacheLocalItems('stock_transfers', [fallbackTransfer]);
            try {
                await localDb.sync_queue.add({
                    operation_id: tempId,
                    operation_type: 'CREATE_TRANSFER',
                    entity_type: 'stock_transfers',
                    entity_id: tempId,
                    payload: payload,
                    created_at: new Date().toISOString(),
                    status: 'PENDING',
                    attempt_count: 0
                });
            } catch (qErr) { }
            try { window.broadcastDataMutation?.('stock_transfers', 'INSERT', fallbackTransfer); } catch (e) { }
            return fallbackTransfer;
        }
    },
    add: async function (payload) {
        return this.create(payload);
    }
};

export const dbReturns = {
    fetchAll: async (branchId) => {
        if (!branchId || branchId === 'null' || branchId === 'undefined') return [];
        try {
            const req = _db
                .from('product_returns')
                .select('*')
                .eq('branch_id', branchId)
                .order('created_at', { ascending: false });
            const res = await withTimeout(req, 12000, 'fetchProductReturns');
            const data = _check(res, 'fetchProductReturns') || [];
            if (Array.isArray(data) && data.length > 0) {
                cacheLocalItems('product_returns', data);
            }
            return data;
        } catch (err) {
            console.warn('[dbReturns] fetchAll fallback to localDb:', err.message);
            return await getLocalItems('product_returns', r => !branchId || r.branch_id === branchId, 'created_at', false);
        }
    },
    create: async (payload) => {
        const tempId = generateClientUUID();
        const fallbackReturn = {
            id: tempId,
            ...payload,
            created_at: new Date().toISOString(),
            sync_status: 'PENDING'
        };

        try {
            const res = await withTimeout(
                _db.from('product_returns').insert(payload).select().single(),
                5000,
                'createProductReturn'
            );
            const created = _check(res, 'createProductReturn');
            if (created) {
                cacheLocalItems('product_returns', [created]);
                try { window.broadcastDataMutation?.('product_returns', 'INSERT', created); } catch (e) { }
                return created;
            }
            return fallbackReturn;
        } catch (err) {
            console.warn('[dbReturns.create] Cloud write failed or offline, caching locally to sync queue:', err.message);
            cacheLocalItems('product_returns', [fallbackReturn]);
            try {
                await localDb.sync_queue.add({
                    operation_id: tempId,
                    operation_type: 'CREATE_RETURN',
                    entity_type: 'product_returns',
                    entity_id: tempId,
                    payload: payload,
                    created_at: new Date().toISOString(),
                    status: 'PENDING',
                    attempt_count: 0
                });
            } catch (qErr) { }
            try { window.broadcastDataMutation?.('product_returns', 'INSERT', fallbackReturn); } catch (e) { }
            return fallbackReturn;
        }
    },
    delete: async (id) => {
        const res = await _db.from('product_returns').delete().eq('id', id);

        return _check(res, 'deleteProductReturn');
    }
};

export const dbLoyalty = {
    fetchCustomers: async (branchId) => {
        if (!branchId || branchId === 'null' || branchId === 'undefined') return [];
        try {
            const req = _db
                .from('customers')
                .select('id, name, loyalty_points, loyalty_tier, created_at')
                .eq('branch_id', branchId)
                .order('loyalty_points', { ascending: false });
            const res = await withTimeout(req, 7000, 'fetchLoyaltyCustomers');
            return _check(res, 'fetchLoyaltyCustomers') || [];
        } catch (err) {
            console.warn('[dbLoyalty] fetchCustomers fallback:', err.message);
            return [];
        }
    },
    fetchTransactions: async (branchId, limit = 30) => {
        if (!branchId || branchId === 'null' || branchId === 'undefined') return [];
        try {
            const req = _db
                .from('loyalty_transactions')
                .select('*, customers(name)')
                .eq('branch_id', branchId)
                .order('created_at', { ascending: false })
                .limit(limit);
            const res = await withTimeout(req, 7000, 'fetchLoyaltyTransactions');
            return _check(res, 'fetchLoyaltyTransactions') || [];
        } catch (err) {
            console.warn('[dbLoyalty] fetchTransactions fallback:', err.message);
            return [];
        }
    },
    recordTransaction: async ({ branchId, customerId, points, type, reason }) => {
        const res = await _db.from('loyalty_transactions').insert({
            branch_id: branchId,
            customer_id: customerId,
            points_delta: points,
            type,
            reason
        }).select().single();
        return _check(res, 'recordLoyaltyTransaction');
    }
};

export const dbModalMessages = {
    fetchActiveUnseen: async (userId = null, userRole = 'owner') => {
        const uid = userId || window.state?.user?.id || window.state?.userId;
        const role = userRole || window.state?.role || 'owner';

        // 1. Check local suppressed IDs from all localStorage keys and sessionStorage
        const localSeenSet = new Set();
        try {
            // Read universal keys
            const universalKeys = ['seen_modal_messages_universal', 'seen_modal_messages_all', 'seen_modal_messages_session'];
            universalKeys.forEach(k => {
                const val = localStorage.getItem(k) || sessionStorage.getItem(k);
                if (val) {
                    const parsed = JSON.parse(val);
                    if (Array.isArray(parsed)) parsed.forEach(id => localSeenSet.add(String(id)));
                }
            });

            // Read all user-specific keys
            for (let i = 0; i < localStorage.length; i++) {
                const k = localStorage.key(i);
                if (k && k.startsWith('seen_modal_messages')) {
                    const raw = localStorage.getItem(k);
                    if (raw) {
                        const list = JSON.parse(raw);
                        if (Array.isArray(list)) list.forEach(id => localSeenSet.add(String(id)));
                    }
                }
            }
        } catch (e) {}

        // Read from local IndexedDB seen records
        try {
            if (localDb?.user_seen_modal_messages) {
                const dbSeen = await localDb.user_seen_modal_messages.toArray();
                if (Array.isArray(dbSeen)) {
                    dbSeen.forEach(s => {
                        if (s.modal_message_id) localSeenSet.add(String(s.modal_message_id));
                    });
                }
            }
        } catch (e) {}

        // 2. Fetch from Supabase direct table query (clean standard REST, 0 RPC errors)
        try {
            if (_db && navigator.onLine) {
                const { data: tableRows, error: tableErr } = await _db
                    .from('admin_modal_messages')
                    .select('*')
                    .eq('is_active', true);

                if (!tableErr && Array.isArray(tableRows)) {
                    // Fetch user's cloud seen records if authenticated
                    if (uid && uid !== 'anonymous') {
                        try {
                            const { data: seenRecords } = await _db
                                .from('user_seen_modal_messages')
                                .select('modal_message_id')
                                .eq('user_id', uid);
                            if (Array.isArray(seenRecords)) {
                                seenRecords.forEach(s => localSeenSet.add(String(s.modal_message_id)));
                            }
                        } catch (sErr) {}
                    }

                    const now = new Date();
                    const filtered = tableRows.filter(m => {
                        if (localSeenSet.has(String(m.id))) return false;
                        if (m.start_time && new Date(m.start_time) > now) return false;
                        if (m.end_time && new Date(m.end_time) < now) return false;
                        if (m.target_audience === 'all') return true;
                        if (m.target_audience === 'owners' && role === 'owner') return true;
                        if (m.target_audience === 'branches' && (role === 'branch' || role === 'cashier')) return true;
                        if (m.target_user_id && uid && String(m.target_user_id) === String(uid)) return true;
                        return false;
                    });
                    cacheLocalItems('admin_modal_messages', tableRows);
                    return filtered;
                }
            }
        } catch (err) {
            console.debug('[dbModalMessages] Cloud query notice:', err.message);
        }

        // 3. Fallback to Local IndexedDB querying
        try {
            const allModals = await getLocalItems('admin_modal_messages', m => m.is_active !== false);
            const now = new Date();
            const matching = (allModals || []).filter(m => {
                if (localSeenSet.has(String(m.id))) return false;
                if (m.start_time && new Date(m.start_time) > now) return false;
                if (m.end_time && new Date(m.end_time) < now) return false;
                if (m.target_audience === 'all') return true;
                if (m.target_audience === 'owners' && role === 'owner') return true;
                if (m.target_audience === 'branches' && (role === 'branch' || role === 'cashier')) return true;
                if (m.target_user_id && uid && String(m.target_user_id) === String(uid)) return true;
                return false;
            });
            return matching;
        } catch (err) {
            console.debug('[dbModalMessages] Local fallback note:', err.message);
            return [];
        }
    },

    markSeen: async (modalId, action = 'dismissed') => {
        if (!modalId) return;
        const mid = String(modalId);
        const uid = window.state?.user?.id || window.state?.userId || 'anonymous';

        // 1. Instant universal local storage suppression (guarantees modal never pops up again)
        try {
            const universalKeys = ['seen_modal_messages_universal', 'seen_modal_messages_all', `seen_modal_messages_${uid}`];
            universalKeys.forEach(key => {
                const stored = localStorage.getItem(key);
                const seenList = stored ? JSON.parse(stored) : [];
                if (!seenList.includes(mid)) {
                    seenList.push(mid);
                    localStorage.setItem(key, JSON.stringify(seenList));
                }
            });

            // Session storage
            const sessionStored = sessionStorage.getItem('seen_modal_messages_session');
            const sessionList = sessionStored ? JSON.parse(sessionStored) : [];
            if (!sessionList.includes(mid)) {
                sessionList.push(mid);
                sessionStorage.setItem('seen_modal_messages_session', JSON.stringify(sessionList));
            }
        } catch (e) {}

        // 2. Instant IndexedDB write
        try {
            if (localDb?.user_seen_modal_messages) {
                await localDb.user_seen_modal_messages.put({
                    id: `${uid}_${mid}`,
                    user_id: uid,
                    modal_message_id: mid,
                    seen_at: new Date().toISOString(),
                    action_taken: action
                });
            }
        } catch (e) {}

        // 3. Cloud synchronization (direct table upsert)
        if (_db && navigator.onLine && uid !== 'anonymous') {
            try {
                await _db.from('user_seen_modal_messages').upsert({
                    user_id: uid,
                    modal_message_id: mid,
                    seen_at: new Date().toISOString(),
                    action_taken: action
                }, { onConflict: 'user_id, modal_message_id' });
            } catch (err) {
                console.debug('[dbModalMessages] Mark seen cloud sync notice:', err.message);
            }
        }
    },

    fetchAllAdmin: async () => {
        try {
            if (_db && navigator.onLine) {
                const req = _db
                    .from('admin_modal_messages')
                    .select('*, user_seen_modal_messages(count)')
                    .order('created_at', { ascending: false });
                const res = await withTimeout(req, 7000, 'fetchAllAdminModalMessages');
                const data = _check(res, 'fetchAllAdminModalMessages') || [];
                cacheLocalItems('admin_modal_messages', data);
                return data.map(item => ({
                    ...item,
                    seen_count: item.user_seen_modal_messages?.[0]?.count || 0
                }));
            }
        } catch (err) {
            console.debug('[dbModalMessages] Admin fetch fallback:', err.message);
        }
        return await getLocalItems('admin_modal_messages', null, 'created_at', false) || [];
    },

    create: async (payload) => {
        const cleanPayload = {
            title: payload.title,
            body: payload.body,
            type: payload.type || 'announcement',
            target_audience: payload.target_audience || 'all',
            target_user_id: payload.target_user_id || null,
            cta_text: payload.cta_text || 'Got It',
            cta_url: payload.cta_url || null,
            banner_url: payload.banner_url || null,
            is_active: payload.is_active !== false,
            created_by: window.state?.user?.id || null
        };

        if (_db && navigator.onLine) {
            const res = await _db.from('admin_modal_messages').insert(cleanPayload).select().single();
            const data = _check(res, 'createModalMessage');
            if (data) {
                cacheLocalItems('admin_modal_messages', [data]);
                window.broadcastDataMutation?.('admin_modal_messages', 'INSERT', data);
                return data;
            }
        }

        // Local fallback
        const localData = { ...cleanPayload, id: crypto.randomUUID(), created_at: new Date().toISOString() };
        cacheLocalItems('admin_modal_messages', [localData]);
        return localData;
    },

    update: async (id, updates) => {
        if (!id) return null;
        if (_db && navigator.onLine) {
            const res = await _db.from('admin_modal_messages').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', id).select().single();
            const data = _check(res, 'updateModalMessage');
            if (data) {
                cacheLocalItems('admin_modal_messages', [data]);
                window.broadcastDataMutation?.('admin_modal_messages', 'UPDATE', data);
                return data;
            }
        }
        return null;
    },

    delete: async (id) => {
        if (!id) return;
        if (_db && navigator.onLine) {
            await _db.from('admin_modal_messages').delete().eq('id', id);
        }
        deleteLocalItem('admin_modal_messages', id);
        window.broadcastDataMutation?.('admin_modal_messages', 'DELETE', { id });
    }
};

if (typeof window !== 'undefined') {
    window.dbAuth = dbAuth;
    window.dbProfile = dbProfile;
    window.dbBranches = dbBranches;
    window.dbSales = dbSales;
    window.dbSaleTags = dbSaleTags;
    window.dbExpenses = dbExpenses;
    window.dbExpenseTags = dbExpenseTags;
    window.dbCustomers = dbCustomers;
    window.dbCustomerTags = dbCustomerTags;
    window.dbInventory = dbInventory;
    window.dbInventoryTags = dbInventoryTags;
    window.dbCentralInventory = dbCentralInventory;
    window.dbStockMovements = dbStockMovements;
    window.dbStockTransfers = dbStockTransfers;
    window.dbReturns = dbReturns;
    window.dbLoyalty = dbLoyalty;
    window.dbSuppliers = dbSuppliers;
    window.dbCapital = dbCapital;
    window.dbPayroll = dbPayroll;
    window.dbShifts = dbShifts;
    window.dbAnnouncements = dbAnnouncements;
    window.dbPromotions = dbPromotions;
    window.dbGoals = dbGoals;
    window.dbBilling = dbBilling;
    window.dbCustomRoles = dbCustomRoles;
    window.dbModalMessages = dbModalMessages;

    window.dbBackup = dbBackup;
    window.dbAudit = dbAudit;
    window.dbSecurity = dbSecurity;
    window.dbPopups = dbPopups;
    window.dbSurveys = dbSurveys;
    window.dbBanners = dbBanners;
    window.dbTickets = dbTickets;
}



