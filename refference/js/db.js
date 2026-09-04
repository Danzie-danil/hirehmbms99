
import { supabase } from './supabase.js';
import { cacheLocalItems, getLocalItems, upsertLocalItem, deleteLocalItem, localDb } from './data/db.js';
export { supabase, cacheLocalItems, getLocalItems, upsertLocalItem, deleteLocalItem, localDb };

const _db = supabase;

export function withTimeout(promise, ms = 7000, label = 'DB Query') {
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
        try {
            const res = await _db
                .from('branches')
                .select('*')
                .eq('owner_id', ownerId)
                .order('created_at', { ascending: true });
            const data = _check(res, 'fetchBranches');
            if (Array.isArray(data) && data.length > 0) {
                cacheLocalItems('branches', data);
                try { localStorage.setItem(`bms_cached_branches_${ownerId}`, JSON.stringify(data)); } catch (e) {}
            }
            return Array.isArray(data) ? data : [];
        } catch (err) {
            console.warn('[dbBranches] fetch error, checking cache:', err.message);
            try {
                const local = await getLocalItems('branches', b => b.owner_id === ownerId, 'created_at', true);
                if (local && local.length > 0) return local;
                const cached = localStorage.getItem(`bms_cached_branches_${ownerId}`);
                if (cached) return JSON.parse(cached);
            } catch (e) {}
            return [];
        }
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
            return await runQuery();
        } catch (e) {
            if (e && (e.name === 'AbortError' || (e.message && e.message.includes('Lock broken')))) {
                await new Promise(r => setTimeout(r, 80));
                try {
                    return await runQuery();
                } catch (retryErr) {
                    console.warn('[dbBranches] fetchByManager retry warning:', retryErr.message);
                    return null;
                }
            }
            console.warn('[dbBranches] fetchByManager error:', e.message);
            return null;
        }
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
        const res = await _db
            .from('branches')
            .update({ preferences })
            .eq('id', branchId)
            .select()
            .single();
        return _check(res, 'updateBranchPreferences');
    },

    delete: async (branchId) => {
        const res = await _db
            .from('branches')
            .delete()
            .eq('id', branchId);
        return _check(res, 'deleteBranch');
    }
};

export const dbSales = {

    fetchAll: async (branchId, { page = 1, pageSize = 10, dateFilter = null, search = '' } = {}) => {
        if (!branchId || branchId === 'null' || branchId === 'undefined') {
            return { items: [], count: 0 };
        }
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const cleanSearch = (search || '').trim();

        try {
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

            const res = await query.order('created_at', { ascending: false }).range(from, to);
            const data = _check(res, 'fetchSales');
            if (Array.isArray(data)) {
                cacheLocalItems('sales', data);
            }
            return { items: data, count: res.count || data.length };
        } catch (err) {
            console.warn('[dbSales] fetchAll error, falling back to localDb:', err.message);
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
        }
    },

    fetchSummary: async (branchId) => {
        if (!branchId || branchId === 'null' || branchId === 'undefined') {
            return { today_total: 0, transaction_count: 0, avg_sale: 0 };
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        try {
            const res = await _db.rpc('get_branch_sales_summary', {
                p_branch_id: branchId,
                p_today_start: today.toISOString()
            });
            const data = _check(res, 'fetchSalesSummary');
            return data[0] || { today_total: 0, transaction_count: 0, avg_sale: 0 };
        } catch (err) {
            console.warn('[dbSales] fetchSummary error, computing from local sales:', err.message);
            const todayIso = today.toISOString().split('T')[0];
            const allLocal = await getLocalItems('sales', s => s.branch_id === branchId && (s.created_at || '').startsWith(todayIso));
            const total = allLocal.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
            const count = allLocal.length;
            const avg = count > 0 ? Math.round(total / count) : 0;
            return { today_total: total, transaction_count: count, avg_sale: avg };
        }
    },

    fetchProfit: async (branchId) => {
        if (!branchId || branchId === 'null' || branchId === 'undefined') {
            return { gross_profit: 0 };
        }
        try {
            const res = await _db.rpc('get_branch_profit_stats', { p_branch_id: branchId });
            const data = _check(res, 'fetchProfitStats');
            return data[0] || { gross_profit: 0 };
        } catch (err) {
            console.warn('[dbSales] fetchProfit error, returning fallback:', err.message);
            return { gross_profit: 0 };
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
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
        const isTodayFn = (item) => {
            if (!item) return false;
            const raw = item.created_at || item.date;
            if (!raw) return false;
            const d = new Date(raw);
            return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
        };

        try {
            const res = await _db
                .from('sales')
                .select('amount, created_at')
                .eq('branch_id', branchId)
                .gte('created_at', startOfDay);
            const data = _check(res, 'salesTodayTotal') || [];
            const todayData = data.filter(isTodayFn);
            return todayData.reduce((s, r) => s + Number(r.amount || 0), 0);
        } catch (err) {
            console.warn('[dbSales] todayTotal error, computing from local sales:', err.message);
            const allLocal = await getLocalItems('sales', s => s.branch_id === branchId && isTodayFn(s));
            return allLocal.reduce((s, r) => s + (Number(r.amount) || 0), 0);
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

        const { data, error } = await _db.rpc('create_sale', {
            p_branch_id:    branchId,
            p_customer:     customer || null,
            p_items:        items || null,
            p_amount:       Number(amount) || 0,
            p_payment:      payment || 'cash',
            p_product_id:   productId || null,
            p_qty:          parseInt(qty) || 1,
            p_price_type:   price_type,
            p_client_tx_id: clientTxId || null
        });

        if (error) {
            console.error('[Sales] create_sale RPC error:', error.message);
            throw error;
        }
        const createdId = (data && data.id) || clientTxId || ('sale_' + Date.now());
        upsertLocalItem('sales', {
            id: createdId,
            branch_id: branchId,
            client_tx_id: clientTxId,
            customer_name: customer,
            amount: Number(amount) || 0,
            payment_method: payment,
            items,
            product_id: productId,
            quantity: qty,
            price_type,
            created_at: new Date().toISOString(),
            sync_status: 'SYNCED'
        });
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

        try {
            const res = await _db
                .from('expenses')
                .select('*', { count: 'exact' })
                .eq('branch_id', branchId)
                .order('created_at', { ascending: false })
                .range(from, to);
            const data = _check(res, 'fetchExpenses');
            if (Array.isArray(data)) {
                cacheLocalItems('expenses', data);
            }
            return { items: data, count: res.count || data.length };
        } catch (err) {
            console.warn('[dbExpenses] fetchAll error, falling back to localDb:', err.message);
            const allLocal = await getLocalItems('expenses', e => e.branch_id === branchId, 'created_at', false);
            const paged = allLocal.slice(from, from + pageSize);
            return { items: paged, count: allLocal.length };
        }
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
        const { data, error } = await _db.rpc('create_expense', {
            p_branch_id: branchId,
            p_category: category,
            p_description: description || null,
            p_amount: Number(amount),
            p_client_tx_id: clientTxId || null
        });
        if (error) {
            console.error('[Expense] create_expense RPC error:', error.message);
            throw error;
        }
        return data;
    },

    update: async (id, { category, description, amount }) => {
        const res = await _db
            .from('expenses')
            .update({ category, description, amount })
            .eq('id', id);
        return _check(res, 'updateExpense');
    },

    delete: async (id) => {
        const res = await _db.from('expenses').delete().eq('id', id);
        return _check(res, 'deleteExpense');
    },
    bulkDelete: async (ids) => {
        const res = await _db.from('expenses').delete().in('id', ids);
        return _check(res, 'bulkDeleteExpenses');
    },
    bulkAdd: async (records) => {
        const res = await _db.from('expenses').insert(records);
        return _check(res, 'bulkAddExpenses');
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
    fetchAll: async (branchId, { page = 1, pageSize = 10, search = '' } = {}) => {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const cleanSearch = (search || '').trim();

        try {
            let query = _db
                .from('customers')
                .select('*', { count: 'exact' })
                .eq('branch_id', branchId);

            if (cleanSearch) {
                query = query.or(`name.ilike.%${cleanSearch}%,phone.ilike.%${cleanSearch}%,email.ilike.%${cleanSearch}%,address.ilike.%${cleanSearch}%`);
            }

            const res = await query
                .order('created_at', { ascending: false })
                .range(from, to);

            const data = _check(res, 'fetchCustomers');
            if (Array.isArray(data)) {
                cacheLocalItems('customers', data);
            }
            return { items: data, count: res.count || data.length };
        } catch (err) {
            console.warn('[dbCustomers] fetchAll error, falling back to localDb:', err.message);
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
        }
    },

    fetchAllList: async (branchId) => {
        try {
            const res = await _db.from('customers').select('*').eq('branch_id', branchId).order('name', { ascending: true });
            const data = _check(res, 'fetchCustomersList');
            if (Array.isArray(data)) {
                cacheLocalItems('customers', data);
            }
            return data;
        } catch (err) {
            console.warn('[dbCustomers] fetchAllList error, falling back to localDb:', err.message);
            return await getLocalItems('customers', c => c.branch_id === branchId, 'name', true);
        }
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
        const res = await _db
            .from('customers')
            .insert({ branch_id: branchId, name, phone, email, address })
            .select()
            .single();
        return _check(res, 'addCustomer');
    },

    update: async (id, { name, phone, email, address }) => {
        const res = await _db
            .from('customers')
            .update({ name, phone, email, address })
            .eq('id', id);
        return _check(res, 'updateCustomer');
    },

    delete: async (id) => {
        const res = await _db.from('customers').delete().eq('id', id);
        return _check(res, 'deleteCustomer');
    },
    bulkDelete: async (ids) => {
        const res = await _db.from('customers').delete().in('id', ids);
        return _check(res, 'bulkDeleteCustomers');
    },
    bulkAdd: async (records) => {
        const res = await _db.from('customers').insert(records);
        return _check(res, 'bulkAddCustomers');
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
        if (!ownerId || ownerId === 'null' || ownerId === 'undefined') return [];
        try {
            const res = await _db
                .from('central_inventory')
                .select('*, suppliers(name)')
                .eq('owner_id', ownerId)
                .order('name', { ascending: true });
            const data = _check(res, 'fetchCentralInventory');
            const items = Array.isArray(data) ? data.filter(item => !item.deleted_at && item.is_active !== false) : [];
            if (items.length > 0) {
                cacheLocalItems('central_inventory', items);
            }
            return items;
        } catch (err) {
            console.warn('[dbCentralInventory] fetchAll error, falling back to localDb:', err.message);
            return await getLocalItems('central_inventory', i => !ownerId || i.owner_id === ownerId, 'name', true);
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

        const { data, error } = await _db.rpc('create_central_item', {
            p_name:              payload.name,
            p_sku:               payload.sku || null,
            p_category:          payload.category || null,
            p_price:             retailPrice,
            p_cost_price:        costPrice,
            p_min_threshold:     parseInt(payload.min_threshold) || 5,
            p_supplier_id:       payload.supplier_id || null,
            p_description:       payload.description || null,
            p_requires_approval: payload.requires_approval || false
        });

        if (error) {
            console.error('[CentralInventory] create_central_item RPC error:', error.message);
            throw error;
        }

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

        // Fallback: If RPC returned data without explicit ID key, query by owner_id + sku
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

        // Immediately persist initial main store stock, cost_price, wholesale, and retail prices into central_inventory record
        if (newItemId) {
            await _db.from('central_inventory')
                     .update({
                         main_store_stock: initialStock,
                         cost_price: costPrice,
                         retail_price: retailPrice,
                         wholesale_price: wholesalePrice,
                         price: retailPrice
                     })
                     .eq('id', newItemId);
        }

        return { 
            ...(typeof data === 'object' ? data : {}), 
            id: newItemId, 
            name: payload.name,
            sku: payload.sku,
            category: payload.category,
            main_store_stock: initialStock,
            cost_price: costPrice,
            retail_price: retailPrice,
            wholesale_price: wholesalePrice,
            price: retailPrice,
            min_threshold: payload.min_threshold
        };
    },
    update: async (id, payload) => {
        const res = await _db.from('central_inventory').update(payload).eq('id', id).select().single();

        if (!res.error && res.data) {
            const { name, sku, category, price, cost_price, retail_price, wholesale_price } = res.data;
            await _db.from('inventory')
                     .update({
                         name, sku, category,
                         price,
                         cost_price: cost_price || 0,
                         retail_price: retail_price || price || 0,
                         wholesale_price: wholesale_price || price || 0
                     })
                     .eq('central_item_id', id);
        }
        return _check(res, 'updateCentralInventory');
    },
    delete: async (id) => {
        if (!id) return true;
        // Server-authoritative RPC handles linked branch items and mutation guards atomically
        const { data, error } = await _db.rpc('delete_central_item', { p_item_id: id });
        if (!error) {
            return data;
        }
        console.warn('[CentralInventory] delete_central_item RPC notice, trying direct deletion:', error.message);
        const res = await _db.from('central_inventory').delete().eq('id', id);
        return _check(res, 'deleteCentralInventory');
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
     *
     * The backend:
     *  - Locks the central_inventory row (prevents oversell under concurrency)
     *  - Validates cross-tenant access (branch must belong to the same owner)
     *  - Enforces subscription + feature (Enterprise/Exclusive) entitlements
     *  - Atomically deducts main_store_stock and adds to branch inventory
     *  - Writes the stock_movements audit ledger entry
     *
     * @param {string} centralItemId       - Central inventory item UUID
     * @param {string} branchId            - Target branch UUID
     * @param {number} quantityToDispatch  - Units to move (positive integer)
     * @param {string} [notes]             - Optional movement notes
     * @returns {boolean}                  - true on success
     */
    dispatchStock: async (centralItemId, branchId, quantityToDispatch, notes = '') => {
        const { data, error } = await _db.rpc('dispatch_central_stock', {
            p_central_item_id: centralItemId,
            p_branch_id:       branchId,
            p_qty:             parseInt(quantityToDispatch),
            p_notes:           notes || null
        });

        if (error) {
            console.error('[CentralInventory] dispatch_central_stock RPC error:', error.message);
            throw new Error(error.message);
        }
        return data;
    }
};

export const dbStockMovements = {
    fetchAll: async (ownerId, { branchId = null, movementType = null, limit = 200 } = {}) => {
        let query = _db
            .from('stock_movements')
            .select('*, branches(name)')
            .eq('owner_id', ownerId);

        if (branchId) query = query.eq('branch_id', branchId);
        if (movementType) query = query.eq('movement_type', movementType);

        const res = await query.order('created_at', { ascending: false }).limit(limit);
        return _check(res, 'fetchStockMovements');
    },

    addMovement: async (payload) => {
        const res = await _db.from('stock_movements').insert([payload]).select().single();
        return _check(res, 'addStockMovement');
    }
};

export const dbInventory = {
    fetchAll: async (branchId, { page = 1, pageSize = 10, lowStockOnly = false, search = '' } = {}) => {
        if (!branchId || branchId === 'null' || branchId === 'undefined') {
            return { items: [], count: 0 };
        }
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        const cleanSearch = (search || '').trim();

        try {
            let query = _db
                .from('inventory')
                .select('*', { count: 'exact' })
                .eq('branch_id', branchId);

            if (cleanSearch) {
                query = query.or(`name.ilike.%${cleanSearch}%,sku.ilike.%${cleanSearch}%,category.ilike.%${cleanSearch}%`);
            }

            if (lowStockOnly) {
                const res = await query.order('name', { ascending: true });
                const rawItems = _check(res, 'fetchInventoryLowStock');
                if (Array.isArray(rawItems)) {
                    cacheLocalItems('inventory', rawItems);
                }
                const filtered = rawItems.filter(i => (Number(i.quantity) || 0) <= (Number(i.min_threshold) || 0));

                return { items: filtered, count: filtered.length };
            }

            const res = await query
                .order('name', { ascending: true })
                .range(from, to);

            const data = _check(res, 'fetchInventory');
            if (Array.isArray(data)) {
                cacheLocalItems('inventory', data);
            }
            return { items: data, count: res.count || data.length };
        } catch (err) {
            console.warn('[dbInventory] fetchAll error, falling back to localDb:', err.message);
            const allLocal = await getLocalItems('inventory', i => i.branch_id === branchId, 'name', true);
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
                filtered = filtered.filter(i => (Number(i.quantity) || 0) <= (Number(i.min_threshold) || 0));
            }
            const paged = (pageSize >= 500) ? filtered : filtered.slice(from, from + pageSize);
            return { items: paged, count: filtered.length };
        }
    },

    fetchLowStockCount: async (branchId) => {
        try {
            const res = await _db
                .from('inventory')
                .select('quantity, min_threshold')
                .eq('branch_id', branchId);

            const data = _check(res, 'fetchLowStockCount');
            return data.filter(i => (Number(i.quantity) || 0) <= (Number(i.min_threshold) || 0)).length;
        } catch (err) {
            console.warn('[dbInventory] fetchLowStockCount error, computing from localDb:', err.message);
            const allLocal = await getLocalItems('inventory', i => i.branch_id === branchId);
            return allLocal.filter(i => (Number(i.quantity) || 0) <= (Number(i.min_threshold) || 0)).length;
        }
    },

    fetchTotalValue: async (branchId) => {
        try {
            const res = await _db
                .from('inventory')
                .select('quantity, price')
                .eq('branch_id', branchId);

            const data = _check(res, 'fetchTotalValue');
            return data.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.price)), 0);
        } catch (err) {
            console.warn('[dbInventory] fetchTotalValue error, computing from localDb:', err.message);
            const allLocal = await getLocalItems('inventory', i => i.branch_id === branchId);
            return allLocal.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.price) || 0)), 0);
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

    add: async (branchId, { name, sku, quantity, min_threshold, price, category, central_item_id, is_from_main_store, wholesale_price, retail_price, unit, cost_price }) => {
        const resolvedRetail = retail_price ?? price ?? 0;
        const resolvedWholesale = wholesale_price ?? price ?? 0;

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
            category
        };
        if (central_item_id !== undefined) payload.central_item_id = central_item_id;
        if (is_from_main_store !== undefined) payload.is_from_main_store = is_from_main_store;

        let res = await _db
            .from('inventory')
            .insert(payload)
            .select()
            .single();

        if (res.error && res.error.message && res.error.message.includes("column")) {
            const cleanPayload = { ...payload };
            delete cleanPayload.unit;
            delete cleanPayload.retail_price;
            delete cleanPayload.wholesale_price;
            res = await _db.from('inventory').insert(cleanPayload).select().single();
        }
        return _check(res, 'addInventoryItem');
    },

    updateQty: async (itemId, quantity) => {
        const res = await _db
            .from('inventory')
            .update({ quantity })
            .eq('id', itemId);
        return _check(res, 'updateInventoryQty');
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
        return _check(res, 'updateInventory');
    },

    delete: async (id) => {
        const res = await _db.from('inventory').delete().eq('id', id);
        return _check(res, 'deleteInventory');
    },
    bulkDelete: async (ids) => {
        const res = await _db.from('inventory').delete().in('id', ids);
        return _check(res, 'bulkDeleteInventory');
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
        return _check(res, 'bulkAddInventory');
    },

    bulkRestock: async (updates) => {

        const results = await Promise.all(updates.map(u =>
            _db.from('inventory')
                .update({ quantity: u.quantity, price: u.price })
                .eq('id', u.id)
        ));

        results.forEach(res => _check(res, 'bulkRestockItem'));
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
        try {
            const branchesRes = await _db.from('branches').select('id, name').eq('owner_id', ownerId);
            const branchList = branchesRes?.data || [];
            const branchIds = branchList.map(b => b.id);
            const branchMap = new Map(branchList.map(b => [b.id, b.name]));

            if (branchIds.length === 0) return [];

            const res = await _db
                .from('tasks')
                .select('*')
                .in('branch_id', branchIds)
                .order('created_at', { ascending: false });
            const data = _check(res, 'fetchTasksByOwner');
            if (Array.isArray(data)) {
                const enriched = data.map(t => ({
                    ...t,
                    branch: { name: branchMap.get(t.branch_id) || 'Branch' }
                }));
                cacheLocalItems('tasks', enriched);
                return enriched;
            }
            return [];
        } catch (err) {
            console.warn('[dbTasks] fetchByOwner error, falling back to localDb:', err.message);
            return await getLocalItems('tasks', t => !ownerId || t.owner_id === ownerId, 'created_at', false);
        }
    },

    fetchAll: async (branchId, { page = 1, pageSize = 10 } = {}) => {
        if (!branchId || branchId === 'null' || branchId === 'undefined') {
            return { items: [], count: 0 };
        }
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        try {
            const res = await _db
                .from('tasks')
                .select('*', { count: 'exact' })
                .eq('branch_id', branchId)
                .order('created_at', { ascending: false })
                .range(from, to);
            const data = _check(res, 'fetchTasks');
            if (Array.isArray(data)) {
                cacheLocalItems('tasks', data);
            }
            return { items: data, count: res.count || data.length };
        } catch (err) {
            console.warn('[dbTasks] fetchAll error, falling back to localDb:', err.message);
            const allLocal = await getLocalItems('tasks', t => t.branch_id === branchId, 'created_at', false);
            const paged = allLocal.slice(from, from + pageSize);
            return { items: paged, count: allLocal.length };
        }
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
            }).catch(() => {});
        } catch (e) {}

        return data;
    },

    updateStatus: async (taskId, status) => {
        const res = await _db
            .from('tasks')
            .update({ status })
            .eq('id', taskId);
        return _check(res, 'updateTaskStatus');
    },
    bulkDelete: async (ids) => {
        const res = await _db.from('tasks').delete().in('id', ids);
        return _check(res, 'bulkDeleteTasks');
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
        return _check(res, 'addTaskComment');
    },

    delete: async (commentId) => {
        const res = await _db.from('task_comments').delete().eq('id', commentId);
        return _check(res, 'deleteTaskComment');
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

        try {
            const res = await _db
                .from('notes')
                .select('*', { count: 'exact' })
                .eq('branch_id', branchId)
                .order('created_at', { ascending: false })
                .range(from, to);
            const data = _check(res, 'fetchNotes');
            if (Array.isArray(data)) {
                cacheLocalItems('notes', data);
            }
            return { items: data, count: res.count || data.length };
        } catch (err) {
            console.warn('[dbNotes] fetchAll error, falling back to localDb:', err.message);
            const allLocal = await getLocalItems('notes', n => n.branch_id === branchId, 'created_at', false);
            const paged = allLocal.slice(from, from + pageSize);
            return { items: paged, count: allLocal.length };
        }
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
        return _check(res, 'addNote');
    },

    delete: async (noteId) => {
        const res = await _db.from('notes').delete().eq('id', noteId);
        return _check(res, 'deleteNote');
    },

    update: async (id, { title, content, tag }) => {
        const res = await _db
            .from('notes')
            .update({ title, content, tag })
            .eq('id', id);
        return _check(res, 'updateNote');
    },
    bulkDelete: async (ids) => {
        const res = await _db.from('notes').delete().in('id', ids);
        return _check(res, 'bulkDeleteNotes');
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

        try {
            const res = await _db
                .from('loans')
                .select('*', { count: 'exact' })
                .eq('branch_id', branchId)
                .order('created_at', { ascending: false })
                .range(from, to);
            const data = _check(res, 'fetchLoans');
            if (Array.isArray(data)) {
                cacheLocalItems('loans', data);
            }
            return { items: data, count: res.count || data.length };
        } catch (err) {
            console.warn('[dbLoans] fetchAll error, falling back to localDb:', err.message);
            const allLocal = await getLocalItems('loans', l => l.branch_id === branchId, 'created_at', false);
            const paged = allLocal.slice(from, from + pageSize);
            return { items: paged, count: allLocal.length };
        }
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
        const res = await _db
            .from('loans')
            .insert({ branch_id: branchId, type, party, amount, notes })
            .select()
            .single();
        return _check(res, 'addLoan');
    },

    update: async (id, { type, party, amount, notes }) => {
        const res = await _db.from('loans').update({ type, party, amount, notes }).eq('id', id);
        return _check(res, 'updateLoan');
    },
    delete: async (id) => {
        const res = await _db.from('loans').delete().eq('id', id);
        return _check(res, 'deleteLoan');
    },
    bulkDelete: async (ids) => {
        const res = await _db.from('loans').delete().in('id', ids);
        return _check(res, 'bulkDeleteLoans');
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
        const res = await _db
            .from('requests')
            .insert([payload])
            .select()
            .single();
        return _check(res, 'addRequest');
    },

    update: async (id, data) => {
        const res = await _db
            .from('requests')
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq('id', id);
        return _check(res, 'updateRequest');
    },

    delete: async (id) => {
        const res = await _db.from('requests').delete().eq('id', id);
        return _check(res, 'deleteRequest');
    }
};

export const dbInventoryPurchases = {

    add: async (payload) => {
        const res = await _db
            .from('inventory_purchases')
            .insert([payload])
            .select()
            .single();
        return _check(res, 'addInventoryPurchase');
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
        try {
            const req = _db.from('staff').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false });
            const res = await withTimeout(req, 7000, 'fetchAllByOwnerStaff');
            const data = _check(res, 'fetchAllByOwnerStaff');
            if (Array.isArray(data) && data.length > 0) {
                cacheLocalItems('staff', data);
                return data;
            }
            return data || [];
        } catch (err) {
            console.warn('[dbStaff] fetchAllByOwner error, falling back to localDb:', err.message);
            return await getLocalItems('staff', s => s.owner_id === ownerId, 'created_at', false);
        }
    },
    fetchAll: async (branchId) => {
        try {
            const req = _db.from('staff').select('*').eq('branch_id', branchId).order('created_at', { ascending: false });
            const res = await withTimeout(req, 7000, 'fetchStaff');
            const data = _check(res, 'fetchStaff');
            if (Array.isArray(data)) {
                cacheLocalItems('staff', data);
            }
            return data;
        } catch (err) {
            console.warn('[dbStaff] fetchAll error, falling back to localDb:', err.message);
            return await getLocalItems('staff', s => !branchId || s.branch_id === branchId, 'created_at', false);
        }
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
            if (serverItem) upsertLocalItem('staff', serverItem);
            return serverItem || record;
        } catch (err) {
            console.warn('[dbStaff] Cloud add error, queued locally:', err.message);
            if (typeof window.queueOfflineOperation === 'function') {
                window.queueOfflineOperation('staff', data);
            }
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
            if (serverItem) upsertLocalItem('staff', serverItem);
            return serverItem || updatedRecord;
        } catch (err) {
            console.warn('[dbStaff] Cloud update error, updated localDb:', err.message);
            return updatedRecord;
        }
    },
    delete: async (id) => {
        deleteLocalItem('staff', id);
        try {
            const res = await _db.from('staff').delete().eq('id', id);
            return _check(res, 'deleteStaff');
        } catch (err) {
            console.warn('[dbStaff] Cloud delete error, deleted from localDb:', err.message);
            return true;
        }
    }
};

export const dbAttendance = {
    fetchForDate: async (branchId, date) => {
        const res = await _db
            .from('attendance')
            .select('*, staff!inner(*)')
            .eq('staff.branch_id', branchId)
            .eq('date', date);
        return _check(res, 'fetchAttendance');
    },
    mark: async (data) => {

        const res = await _db.from('attendance').upsert([data], { onConflict: 'staff_id,date' }).select().single();
        return _check(res, 'markAttendance');
    }
};

export const dbSuppliers = {
    fetchAll: async (enterpriseId) => {
        if (!enterpriseId || enterpriseId === 'null' || enterpriseId === 'undefined') return [];
        try {
            const res = await _db.from('suppliers').select('*').eq('enterprise_id', enterpriseId).order('name', { ascending: true });
            const data = _check(res, 'fetchSuppliers');
            if (Array.isArray(data)) {
                cacheLocalItems('suppliers', data);
            }
            return data;
        } catch (err) {
            console.warn('[dbSuppliers] fetchAll error, falling back to localDb:', err.message);
            return await getLocalItems('suppliers', s => !enterpriseId || s.enterprise_id === enterpriseId || s.owner_id === enterpriseId, 'name', true);
        }
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
        const res = await _db.from('suppliers').insert([data]).select().single();
        return _check(res, 'addSupplier');
    },
    update: async (id, data) => {
        const res = await _db.from('suppliers').update(data).eq('id', id).select().single();
        return _check(res, 'updateSupplier');
    },
    delete: async (id) => {
        const res = await _db.from('suppliers').delete().eq('id', id);
        return _check(res, 'deleteSupplier');
    }
};

export const dbPurchaseOrders = {
    fetchAll: async (branchId) => {
        const res = await _db.from('purchase_orders').select('*, suppliers(*)').eq('branch_id', branchId).order('created_at', { ascending: false });

        return _check(res, 'fetchPOs');
    },
    fetchWithItems: async (poId) => {
        const poRes = await _db.from('purchase_orders').select('*, suppliers(*)').eq('id', poId).single();
        const po = _check(poRes, 'fetchPO');
        if (!po) return null;
        const itemsRes = await _db.from('po_items').select('*').eq('po_id', poId);
        po.items = _check(itemsRes, 'fetchPOItems');
        return po;
    },
    create: async (poData, itemsData, clientTxId = null) => {
        const { data, error } = await _db.rpc('create_purchase_order', {
            p_branch_id: poData.branch_id,
            p_supplier_id: poData.supplier_id || null,
            p_po_data: {
                order_date: poData.order_date || null,
                expected_date: poData.expected_date || null,
                notes: poData.notes || null,
                status: poData.status || 'draft'
            },
            p_items: itemsData.map(item => ({
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
        return data;
    },
    updateStatus: async (id, status) => {
        const res = await _db.from('purchase_orders').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select().single();
        return _check(res, 'updatePOStatus');
    }
};

export const dbQuotations = {
    fetchAll: async (branchId) => {
        try {
            const res = await _db.from('quotations').select('*').eq('branch_id', branchId).order('created_at', { ascending: false });
            const data = _check(res, 'fetchQuotations');
            if (Array.isArray(data)) {
                cacheLocalItems('quotations', data);
            }
            return data;
        } catch (err) {
            console.warn('[dbQuotations] fetchAll error, falling back to localDb:', err.message);
            return await getLocalItems('quotations', q => !branchId || q.branch_id === branchId || q.owner_id === branchId, 'created_at', false);
        }
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

        return quote;
    },
    updateStatus: async (id, status) => {
        const res = await _db.from('quotations').update({ status, updated_at: new Date().toISOString() }).eq('id', id).select().single();
        return _check(res, 'updateQuotationStatus');
    },
    delete: async (id) => {
        const res = await _db.from('quotations').delete().eq('id', id);
        return _check(res, 'deleteQuotation');
    }
};

export const dbDocuments = {
    fetchAll: async (branchId) => {
        try {
            const res = await _db.from('documents').select('*, document_items(*)').eq('branch_id', branchId).order('created_at', { ascending: false });
            const data = _check(res, 'fetchDocuments');
            if (Array.isArray(data)) {
                cacheLocalItems('documents', data);
            }
            return data;
        } catch (err) {
            console.warn('[dbDocuments] fetchAll error, falling back to localDb:', err.message);
            return await getLocalItems('documents', d => !branchId || d.branch_id === branchId, 'created_at', false);
        }
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
        try {
            const res = await _db.from('documents').select('*, document_items(*)').eq('branch_id', branchId).eq('type', 'invoice').order('created_at', { ascending: false });
            const data = _check(res, 'fetchInvoices');
            if (Array.isArray(data)) {
                cacheLocalItems('documents', data);
            }
            return data;
        } catch (err) {
            console.warn('[dbDocuments] fetchInvoices error, falling back to localDb:', err.message);
            return await getLocalItems('documents', d => (!branchId || d.branch_id === branchId) && d.type === 'invoice', 'created_at', false);
        }
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
        if (!ownerId) return [];
        const cacheKey = `bms_cap_accs_${ownerId}`;
        try {
            const res = await _db.from('capital_accounts').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false });
            const data = _check(res, 'fetchCapitalAccounts');
            if (Array.isArray(data) && data.length > 0) {
                try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch (e) {}
            }
            return data || [];
        } catch (err) {
            console.warn('[dbCapital] fetchAccounts fallback to cached accounts:', err);
            try {
                const cached = localStorage.getItem(cacheKey);
                if (cached) return JSON.parse(cached) || [];
            } catch (e) {}
            return [];
        }
    },
    addAccount: async (data) => {
        const res = await _db.from('capital_accounts').insert([data]).select().single();
        return _check(res, 'addCapitalAccount');
    },
    updateAccount: async (id, data) => {
        const res = await _db.from('capital_accounts').update(data).eq('id', id).select().single();
        return _check(res, 'updateCapitalAccount');
    },
    deleteAccount: async (id) => {
        const res = await _db.from('capital_accounts').delete().eq('id', id);
        return _check(res, 'deleteCapitalAccount');
    },
    fetchTransactions: async (ownerId) => {
        try {
            const res = await _db.from('capital_transactions').select('*').eq('owner_id', ownerId).order('transaction_date', { ascending: false });
            return _check(res, 'fetchCapitalTransactions') || [];
        } catch (err) {
            console.warn('[dbCapital] fetchTransactions fallback:', err);
            return [];
        }
    },
    addTransaction: async (data) => {
        const res = await _db.from('capital_transactions').insert([data]).select().single();
        return _check(res, 'addCapitalTransaction');
    },
    adjustBalance: async (accountId, amountDelta, transactionDetails = null) => {
        if (!accountId || !amountDelta) return;
        try {
            const resAcc = await _db.from('capital_accounts').select('balance, owner_id').eq('id', accountId).single();
            if (resAcc.error || !resAcc.data) return;

            const currentBal = parseFloat(resAcc.data.balance || 0);
            const delta = parseFloat(amountDelta || 0);
            const newBal = Math.max(0, currentBal + delta);

            await _db.from('capital_accounts').update({ balance: newBal }).eq('id', accountId);

            if (transactionDetails && resAcc.data.owner_id) {
                await _db.from('capital_transactions').insert([{
                    owner_id: resAcc.data.owner_id,
                    account_id: accountId,
                    transaction_type: delta < 0 ? 'drawing' : 'injection',
                    amount: Math.abs(delta),
                    transaction_date: new Date().toISOString().slice(0, 10),
                    notes: transactionDetails.notes || 'Capital Movement',
                    reference_no: transactionDetails.reference_no || null
                }]);
            }
        } catch (err) {
            console.warn('[dbCapital.adjustBalance] Error updating balance:', err);
        }
    }
};

export const dbAssets = {
    fetchAll: async (ownerId) => {
        try {
            const res = await _db.from('business_assets').select('*').eq('owner_id', ownerId).order('purchase_date', { ascending: false });
            return _check(res, 'fetchBusinessAssets') || [];
        } catch (err) {
            console.warn('[dbAssets] fetchAll fallback:', err);
            return [];
        }
    },
    add: async (data) => {
        const res = await _db.from('business_assets').insert([data]).select().single();
        return _check(res, 'addBusinessAsset');
    },
    addBatch: async (itemsArray) => {
        if (!itemsArray || itemsArray.length === 0) return [];
        const res = await _db.from('business_assets').insert(itemsArray).select();
        return _check(res, 'addBusinessAssetsBatch');
    },
    update: async (id, data) => {
        const res = await _db.from('business_assets').update(data).eq('id', id).select().single();
        return _check(res, 'updateBusinessAsset');
    },
    delete: async (id) => {
        const res = await _db.from('business_assets').delete().eq('id', id);
        return _check(res, 'deleteBusinessAsset');
    }
};

export const dbAssetMaintenance = {
    fetchAll: async (ownerId) => {
        try {
            const res = await _db.from('asset_maintenance_logs').select('*').eq('owner_id', ownerId).order('service_date', { ascending: false });
            return _check(res, 'fetchAssetMaintenanceLogs') || [];
        } catch (err) {
            console.warn('[dbAssetMaintenance] fetchAll fallback:', err);
            return [];
        }
    },
    add: async (data) => {
        const res = await _db.from('asset_maintenance_logs').insert([data]).select().single();
        return _check(res, 'addAssetMaintenanceLog');
    },
    delete: async (id) => {
        const res = await _db.from('asset_maintenance_logs').delete().eq('id', id);
        return _check(res, 'deleteAssetMaintenanceLog');
    }
};

export const dbBusinessLoans = {
    fetchAll: async (ownerId) => {
        try {
            const res = await _db.from('business_loans').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false });
            return _check(res, 'fetchBusinessLoans') || [];
        } catch (err) {
            console.warn('[dbBusinessLoans] fetchAll fallback:', err);
            return [];
        }
    },
    add: async (data) => {
        const res = await _db.from('business_loans').insert([data]).select().single();
        return _check(res, 'addBusinessLoan');
    },
    addBatch: async (itemsArray) => {
        if (!itemsArray || itemsArray.length === 0) return [];
        const res = await _db.from('business_loans').insert(itemsArray).select();
        return _check(res, 'addBusinessLoansBatch');
    },
    update: async (id, data) => {
        const res = await _db.from('business_loans').update(data).eq('id', id).select().single();
        return _check(res, 'updateBusinessLoan');
    },
    delete: async (id) => {
        const res = await _db.from('business_loans').delete().eq('id', id);
        return _check(res, 'deleteBusinessLoan');
    },
    fetchRepayments: async (ownerId) => {
        try {
            const res = await _db.from('loan_repayments').select('*').eq('owner_id', ownerId).order('payment_date', { ascending: false });
            return _check(res, 'fetchLoanRepayments') || [];
        } catch (err) {
            console.warn('[dbBusinessLoans] fetchRepayments fallback:', err);
            return [];
        }
    },
    addRepayment: async (data) => {
        const res = await _db.from('loan_repayments').insert([data]).select().single();
        return _check(res, 'addLoanRepayment');
    }
};
