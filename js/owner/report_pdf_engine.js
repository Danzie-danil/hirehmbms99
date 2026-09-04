import { supabase, dbBranches, dbCentralInventory, dbStockMovements, getLocalItems, localDb } from '../db.js';

/**
 * Resilient query helper with fast timeout and local fallback
 */
async function _safeFetch(promise, fallbackFn, timeoutMs = 12000) {
    try {
        const timer = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs));
        const res = await Promise.race([promise, timer]);
        if (res && res.data) return res.data;
        if (Array.isArray(res)) return res;
        return res || [];
    } catch (err) {
        if (typeof fallbackFn === 'function') {
            try {
                const localData = await fallbackFn();
                return localData || [];
            } catch (e) {
                return [];
            }
        }
        return [];
    }
}

/**
 * Clean & Minimalist Enterprise PDF & Data Export Engine
 * Supports Owner (Consolidated & Multi-Branch) and Branch reporting scopes.
 */

export const AVAILABLE_REPORT_TYPES = [
    {
        id: 'sales_invoices',
        name: 'Sales Report',
        category: 'sales',
        badge: 'Sales',
        icon: 'receipt',
        description: 'Audited log of sales transactions, customer details, products sold, unit pricing, and revenue totals.'
    },
    {
        id: 'expenses',
        name: 'Expenses Report',
        category: 'finance',
        badge: 'Expenses',
        icon: 'wallet',
        description: 'Detailed audit of operational expenses, category allocations, vendor costs, and disbursements.'
    },
    {
        id: 'inventory',
        name: 'Current Stock Inventory & Valuations',
        category: 'inventory',
        badge: 'Inventory',
        icon: 'package',
        description: 'Active branch inventory catalog, on-hand unit quantities, reorder thresholds, unit prices, and total asset valuation.'
    },
    {
        id: 'low_stock',
        name: 'Low Stock & Depletion Reorder Report',
        category: 'inventory',
        badge: 'Stock Alert',
        icon: 'alert-triangle',
        description: 'Complete audit of depleted and low-stock items below safety thresholds with shortage deficits and estimated replenishment costs.'
    },
    {
        id: 'loans',
        name: 'Loans, Borrowings & Credit Liabilities',
        category: 'finance',
        badge: 'Liabilities',
        icon: 'landmark',
        description: 'Comprehensive log of issued loans, repayments, outstanding receivables/payables, and counterparty balances.'
    },
    {
        id: 'financial_pl',
        name: 'Executive Financial & P&L Statement',
        category: 'finance',
        badge: 'Finance',
        icon: 'trending-up',
        description: 'Comprehensive Profit & Loss, gross revenue, operational expenses, profit margins, and payment method collections.'
    },
    {
        id: 'branch_performance',
        name: 'Branch Operations & Manager Scorecard',
        category: 'operations',
        badge: 'Operations',
        icon: 'store',
        description: 'Branch founding/opened dates, operating ages, manager sales volume, transaction counts, average ticket sizes, and task execution.'
    },
    {
        id: 'stock_flow',
        name: 'Dedicated Stock Lifecycle & Flow Ledger',
        category: 'inventory',
        badge: 'Supply Chain',
        icon: 'boxes',
        description: 'Traceable supply chain flow: Central warehouse purchases, dispatches to branches, consumption, and current balances.'
    },
    {
        id: 'stock_purchases',
        name: 'Central Purchases & Supplier Restocks',
        category: 'inventory',
        badge: 'Procurement',
        icon: 'truck',
        description: 'Chronological record of stock bought into main store warehouse with supplier names, costs, quantities, and dates.'
    },
    {
        id: 'stock_dispatches',
        name: 'Branch Dispatches & Transfer Flow',
        category: 'inventory',
        badge: 'Logistics',
        icon: 'arrow-right-left',
        description: 'Detailed logistics log of stock dispatched from Main Store to branches with retail values and dispatch timestamps.'
    },
    {
        id: 'best_sellers',
        name: 'Top Performing Products Ledger',
        category: 'inventory',
        badge: 'Catalog',
        icon: 'award',
        description: 'Ranked best sellers by sales revenue and unit volume versus slower-moving items across branches.'
    },
    {
        id: 'returns_refunds',
        name: 'Product Returns & Refund Ledger',
        category: 'sales',
        badge: 'Audits',
        icon: 'rotate-ccw',
        description: 'Complete breakdown of returned goods, refund amounts, reasons, item conditions, and branch return rates.'
    },
    {
        id: 'staff_productivity',
        name: 'Staff Attendance & Cashier Productivity',
        category: 'staff',
        badge: 'Human Resources',
        icon: 'users',
        description: 'Shifts logged, operating hours, transaction counts, and gross sales revenue processed per cashier and staff member.'
    },
    {
        id: 'consolidated_full',
        name: 'Master Consolidated Business Audit Dossier',
        category: 'executive',
        badge: 'Executive Master',
        icon: 'file-text',
        description: 'Exhaustive multi-page enterprise audit document binding financial P&L, branch scorecards, stock flow, sales, and staff.'
    }
];

// Helper to safely format numbers and currencies
const formatMoney = (amount) => {
    if (window.fmt && typeof window.fmt.currency === 'function') {
        return window.fmt.currency(Number(amount) || 0);
    }
    return 'TZS ' + (Number(amount) || 0).toLocaleString('en-US');
};

const formatNumber = (num) => {
    if (window.fmt && typeof window.fmt.number === 'function') {
        return window.fmt.number(Number(num) || 0);
    }
    return (Number(num) || 0).toLocaleString('en-US');
};

const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return dateStr;
    }
};

const formatAge = (createdDateStr) => {
    if (!createdDateStr) return '';
    try {
        const start = new Date(createdDateStr);
        const now = new Date();
        const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
        if (diffMonths < 1) {
            const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
            return `${diffDays} days active`;
        }
        const yrs = Math.floor(diffMonths / 12);
        const mos = diffMonths % 12;
        if (yrs > 0) {
            return `${yrs} yr${yrs > 1 ? 's' : ''} ${mos > 0 ? `${mos} mo` : ''} active`;
        }
        return `${mos} month${mos > 1 ? 's' : ''} active`;
    } catch {
        return '';
    }
};

/**
 * Universal Line Item Extractor: Unpacks batch sales, cart items, JSON arrays,
 * and comma-separated sales into individual discrete product line items with exact prices and quantities.
 */
export function extractSaleLineItems(sale, branchInventory = [], centralItems = []) {
    if (!sale) return [];

    // 1. Check cart_items array
    if (Array.isArray(sale.cart_items) && sale.cart_items.length > 0) {
        return sale.cart_items.map(ci => {
            const qty = Number(ci.qty || ci.quantity || 1);
            const unitPrice = Number(ci.unit_price || ci.price || (ci.subtotal ? ci.subtotal / qty : 0));
            const subtotal = Number(ci.subtotal || (unitPrice * qty));
            const pType = ci.price_type || sale.price_type || 'retail';
            const cleanName = (ci.name || ci.item_name || 'Product').replace(/^(\d+x\s+)+/i, '').trim();
            return {
                name: cleanName,
                product_id: ci.product_id || ci.id || null,
                sku: ci.sku || null,
                qty,
                unit_price: unitPrice,
                total_price: subtotal,
                price_type: pType,
                item_type: ci.item_type || 'product'
            };
        });
    }

    // 2. Check JSON serialized items
    if (typeof sale.items === 'string' && (sale.items.trim().startsWith('[') || sale.items.trim().startsWith('{'))) {
        try {
            const parsed = JSON.parse(sale.items.trim());
            const arr = Array.isArray(parsed) ? parsed : [parsed];
            if (arr.length > 0 && typeof arr[0] === 'object' && arr[0] !== null) {
                return arr.map(ci => {
                    const qty = Number(ci.qty || ci.quantity || 1);
                    const unitPrice = Number(ci.unit_price || ci.price || (ci.subtotal ? ci.subtotal / qty : 0));
                    const subtotal = Number(ci.subtotal || ci.total || (unitPrice * qty));
                    const pType = ci.price_type || sale.price_type || 'retail';
                    const cleanName = (ci.name || ci.item_name || 'Product').replace(/^(\d+x\s+)+/i, '').trim();
                    return {
                        name: cleanName,
                        product_id: ci.product_id || ci.id || null,
                        sku: ci.sku || null,
                        qty,
                        unit_price: unitPrice,
                        total_price: subtotal,
                        price_type: pType,
                        item_type: ci.item_type || 'product'
                    };
                });
            }
        } catch (e) { }
    }

    // 3. Check comma-separated item summary string (e.g. "Air pids, 3x BAR SOAPS" or "2x Air pids, 1x Oil")
    if (typeof sale.items === 'string' && sale.items.includes(',')) {
        const parts = sale.items.split(',').map(p => p.trim()).filter(Boolean);
        if (parts.length > 1) {
            const matchedItems = parts.map(part => {
                const qtyMatch = part.match(/^(\d+)x\s*(.*)$/i) || part.match(/^(.*?)\s*\((\d+)x\)$/i);
                let qty = 1;
                let rawName = part;
                if (qtyMatch) {
                    if (part.startsWith(qtyMatch[1] + 'x')) {
                        qty = parseInt(qtyMatch[1]) || 1;
                        rawName = qtyMatch[2].trim();
                    } else {
                        qty = parseInt(qtyMatch[2]) || 1;
                        rawName = qtyMatch[1].trim();
                    }
                }
                const cleanName = rawName.replace(/^(\d+x\s+)+/i, '').trim();
                const invItem = branchInventory.find(bi => bi.name && bi.name.trim().toLowerCase() === cleanName.toLowerCase()) ||
                                centralItems.find(ci => ci.name && ci.name.trim().toLowerCase() === cleanName.toLowerCase());
                const pType = sale.price_type || 'retail';
                let unitPrice = 0;
                if (invItem) {
                    unitPrice = pType === 'wholesale' ? Number(invItem.wholesale_price || invItem.price || 0) : Number(invItem.retail_price || invItem.price || 0);
                }
                return {
                    name: cleanName,
                    product_id: invItem?.id || null,
                    sku: invItem?.sku || null,
                    qty,
                    unit_price: unitPrice,
                    total_price: unitPrice * qty,
                    price_type: pType,
                    item_type: invItem?.item_type || 'product'
                };
            });

            const sumMatchedTotal = matchedItems.reduce((s, it) => s + it.total_price, 0);
            const totalSaleAmount = Number(sale.amount) || 0;
            if (sumMatchedTotal <= 0 && totalSaleAmount > 0) {
                const totalUnits = matchedItems.reduce((s, it) => s + it.qty, 0) || 1;
                const unitAmt = totalSaleAmount / totalUnits;
                matchedItems.forEach(it => {
                    it.unit_price = unitAmt;
                    it.total_price = unitAmt * it.qty;
                });
            } else if (sumMatchedTotal > 0 && Math.abs(sumMatchedTotal - totalSaleAmount) > 1) {
                const ratio = totalSaleAmount / sumMatchedTotal;
                matchedItems.forEach(it => {
                    it.unit_price = it.unit_price * ratio;
                    it.total_price = it.total_price * ratio;
                });
            }
            return matchedItems;
        }
    }

    // 4. Single item fallback
    const singleQty = Number(sale.quantity || (typeof sale.items === 'string' && sale.items.match(/^(\d+)x/)?.[1]) || 1);
    let singleName = (sale.item_name || sale.product_name || (typeof sale.items === 'string' ? sale.items : 'Sale Item')).replace(/^(\d+x\s+)+/i, '').trim();
    const singleUnitPrice = Number(sale.unit_price || (sale.amount ? Number(sale.amount) / singleQty : 0));
    return [{
        name: singleName,
        product_id: sale.product_id || null,
        sku: sale.sku || null,
        qty: singleQty,
        unit_price: singleUnitPrice,
        total_price: Number(sale.amount) || (singleUnitPrice * singleQty),
        price_type: sale.price_type || 'retail',
        item_type: sale.item_type || 'product'
    }];
}

if (typeof window !== 'undefined') {
    window.extractSaleLineItems = extractSaleLineItems;
}

/**
 * Fetch and aggregate complete data for reports (Ultra-fast, resilient, offline-capable)
 */
export async function fetchReportData({ scope = 'owner', ownerId, branchId = 'all', startDate, endDate }) {
    const targetOwnerId = ownerId || window.state?.ownerId || window.state?.currentUserUuid || (window.state?.profile && window.state.profile.id);

    const startIso = startDate ? (startDate.includes('T') ? startDate : `${startDate}T00:00:00`) : '1970-01-01T00:00:00';
    const endIso = endDate ? (endDate.includes('T') ? endDate : `${endDate}T23:59:59.999`) : '2099-12-31T23:59:59.999';

    const startTime = new Date(startIso).getTime();
    const endTime = new Date(endIso).getTime();

    const isDateInRange = (dateVal) => {
        if (!dateVal) return true;
        const t = new Date(dateVal).getTime();
        if (isNaN(t)) return true;
        return t >= startTime && t <= endTime;
    };

    // 1. Fetch Branches
    let branches = [];
    try {
        if (scope === 'branch' && window.state?.branchProfile) {
            branches = [window.state.branchProfile];
        } else {
            branches = await _safeFetch(
                dbBranches.fetchAll(targetOwnerId),
                () => getLocalItems('branches', b => !targetOwnerId || b.owner_id === targetOwnerId, 'name', true)
            );
            if ((!branches || !branches.length) && window.state?.branchProfile) {
                branches = [window.state.branchProfile];
            }
        }
    } catch (e) {
        console.warn('[ReportEngine] Failed to fetch branches:', e);
        if (window.state?.branchProfile) branches = [window.state.branchProfile];
    }

    const branchMap = new Map();
    (branches || []).forEach(b => { if (b && b.id) branchMap.set(b.id, b); });

    const selectedBranch = branchId !== 'all' ? branchMap.get(branchId) : null;
    const targetBranchIds = branchId !== 'all' ? [branchId] : (branches.map(b => b.id).filter(Boolean));

    // 2. Fetch All Entities in Parallel with Timeout & Local Fallback
    const [
        salesRaw,
        expensesRaw,
        returnsRaw,
        centralItemsRaw,
        branchInventoryRaw,
        movementsRaw,
        shiftsRaw,
        tasksRaw,
        loansRaw
    ] = await Promise.all([
        // Sales
        _safeFetch(
            (() => {
                let q = supabase.from('sales').select('*').gte('created_at', startIso).lte('created_at', endIso).order('created_at', { ascending: false });
                if (branchId !== 'all') q = q.eq('branch_id', branchId);
                else if (targetBranchIds.length > 0) q = q.in('branch_id', targetBranchIds);
                return q;
            })(),
            () => getLocalItems('sales', s => (branchId === 'all' || s.branch_id === branchId || (targetBranchIds.length && targetBranchIds.includes(s.branch_id))) && isDateInRange(s.created_at), 'created_at', false)
        ),
        // Expenses
        _safeFetch(
            (() => {
                let q = supabase.from('expenses').select('*').gte('created_at', startIso).lte('created_at', endIso).order('created_at', { ascending: false });
                if (branchId !== 'all') q = q.eq('branch_id', branchId);
                else if (targetBranchIds.length > 0) q = q.in('branch_id', targetBranchIds);
                return q;
            })(),
            () => getLocalItems('expenses', e => (branchId === 'all' || e.branch_id === branchId || (targetBranchIds.length && targetBranchIds.includes(e.branch_id))) && isDateInRange(e.created_at), 'created_at', false)
        ),
        // Returns
        _safeFetch(
            (() => {
                let q = supabase.from('product_returns').select('*').gte('created_at', startIso).lte('created_at', endIso).order('created_at', { ascending: false });
                if (branchId !== 'all') q = q.eq('branch_id', branchId);
                else if (targetBranchIds.length > 0) q = q.in('branch_id', targetBranchIds);
                return q;
            })(),
            () => getLocalItems('product_returns', r => (branchId === 'all' || r.branch_id === branchId || (targetBranchIds.length && targetBranchIds.includes(r.branch_id))) && isDateInRange(r.created_at), 'created_at', false)
        ),
        // Central Inventory
        _safeFetch(
            dbCentralInventory.fetchAll(targetOwnerId || window.state?.branchProfile?.owner_id),
            () => getLocalItems('central_inventory', i => !targetOwnerId || i.owner_id === targetOwnerId, 'name', true)
        ),
        // Branch Inventory
        _safeFetch(
            (() => {
                let q = supabase.from('inventory').select('*').order('name', { ascending: true });
                if (branchId !== 'all') q = q.eq('branch_id', branchId);
                else if (targetBranchIds.length > 0) q = q.in('branch_id', targetBranchIds);
                return q;
            })(),
            () => getLocalItems('inventory', i => branchId === 'all' || i.branch_id === branchId || (targetBranchIds.length && targetBranchIds.includes(i.branch_id)), 'name', true)
        ),
        // Stock Movements
        _safeFetch(
            dbStockMovements.fetchAll(targetOwnerId, { limit: 1000 }),
            () => getLocalItems('stock_movements', m => !targetOwnerId || m.owner_id === targetOwnerId, 'created_at', false)
        ),
        // Shifts
        _safeFetch(
            (() => {
                let q = supabase.from('shifts').select('*').gte('created_at', startIso).lte('created_at', endIso).order('created_at', { ascending: false });
                if (branchId !== 'all') q = q.eq('branch_id', branchId);
                else if (targetBranchIds.length > 0) q = q.in('branch_id', targetBranchIds);
                return q;
            })(),
            () => getLocalItems('shifts', s => (branchId === 'all' || s.branch_id === branchId || (targetBranchIds.length && targetBranchIds.includes(s.branch_id))) && isDateInRange(s.created_at), 'created_at', false)
        ),
        // Tasks
        _safeFetch(
            (() => {
                let q = supabase.from('tasks').select('*').gte('created_at', startIso).lte('created_at', endIso);
                if (branchId !== 'all') q = q.eq('branch_id', branchId);
                else if (targetBranchIds.length > 0) q = q.in('branch_id', targetBranchIds);
                return q;
            })(),
            () => getLocalItems('tasks', t => (branchId === 'all' || t.branch_id === branchId || (targetBranchIds.length && targetBranchIds.includes(t.branch_id))) && isDateInRange(t.created_at), 'created_at', false)
        ),
        // Loans
        _safeFetch(
            (() => {
                let q = supabase.from('loans').select('*').order('created_at', { ascending: false });
                if (branchId !== 'all') q = q.eq('branch_id', branchId);
                else if (targetBranchIds.length > 0) q = q.in('branch_id', targetBranchIds);
                return q;
            })(),
            () => getLocalItems('loans', l => branchId === 'all' || l.branch_id === branchId || (targetBranchIds.length && targetBranchIds.includes(l.branch_id)), 'created_at', false)
        )
    ]);

    const sales = Array.isArray(salesRaw) ? salesRaw : [];
    const expenses = Array.isArray(expensesRaw) ? expensesRaw : [];
    const returns = Array.isArray(returnsRaw) ? returnsRaw : [];
    const centralItems = Array.isArray(centralItemsRaw) ? centralItemsRaw : [];
    const branchInventory = Array.isArray(branchInventoryRaw) ? branchInventoryRaw : [];
    const shifts = Array.isArray(shiftsRaw) ? shiftsRaw : [];
    const tasks = Array.isArray(tasksRaw) ? tasksRaw : [];
    const loans = Array.isArray(loansRaw) ? loansRaw : [];

    const movements = (Array.isArray(movementsRaw) ? movementsRaw : []).filter(m => {
        const inDate = isDateInRange(m.created_at);
        if (!inDate) return false;
        if (branchId === 'all') return true;
        return m.branch_id === branchId || m.source_branch_id === branchId || m.destination_branch_id === branchId;
    });


    // Calculate Core Metrics & Comprehensive COGS Breakdown
    let totalCogs = 0;
    let totalUnitsSold = 0;
    const cogsMap = {};

    // Helper map for inventory lookup
    const invLookup = new Map();
    branchInventory.forEach(bi => {
        if (bi.id) invLookup.set(bi.id, bi);
        if (bi.name) invLookup.set(bi.name.trim().toLowerCase(), bi);
    });

    // 1. Trace Chronological In-Stock Countdown per Product
    // We sort sales chronologically ascending, and iterate backward from newest to oldest
    const salesChronological = [...sales].sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    const subsequentSoldMap = {};

    for (let i = salesChronological.length - 1; i >= 0; i--) {
        const s = salesChronological[i];
        const lineItems = extractSaleLineItems(s, branchInventory, centralItems);

        for (let j = lineItems.length - 1; j >= 0; j--) {
            const item = lineItems[j];
            const rawName = (item.name || 'Product').trim();
            const productKey = rawName.toLowerCase();
            const q = Number(item.qty || 1);

            const foundInv = (item.product_id && invLookup.get(item.product_id)) ||
                             invLookup.get(productKey) ||
                             branchInventory.find(b => (item.product_id && b.id === item.product_id) || (b.name && b.name.trim().toLowerCase() === productKey));

            const isService = (foundInv && (foundInv.item_type === 'service' || (foundInv.category && String(foundInv.category).toLowerCase().includes('service')))) ||
                              (item.item_type === 'service');

            if (isService) {
                item.inStock = '—';
                item.isService = true;
            } else {
                const currentQty = foundInv ? Number(foundInv.quantity || 0) : 0;
                const subsequentSold = subsequentSoldMap[productKey] || 0;
                const inStockAfterThisSale = currentQty + subsequentSold;

                subsequentSoldMap[productKey] = subsequentSold + q;

                item.inStock = inStockAfterThisSale;
                item.isService = false;
            }
        }

        s._unpackedLineItems = lineItems;
    }

    sales.forEach(s => {
        const lineItems = s._unpackedLineItems || extractSaleLineItems(s, branchInventory, centralItems);
        let saleCogsTotal = Number(s.cost_amount || 0);
        let computedCogsForSale = 0;

        lineItems.forEach(item => {
            if (!item) return;
            const rawName = (item.name || 'Product').trim();
            const key = rawName;
            const q = Number(item.qty || 1);
            const p = Number(item.unit_price || 0);
            
            let cp = Number(item.cost_price || 0);
            let foundInv = null;
            if (!cp) {
                foundInv = (item.product_id && invLookup.get(item.product_id)) ||
                           invLookup.get(rawName.toLowerCase()) ||
                           branchInventory.find(b => (item.product_id && b.id === item.product_id) || (b.name && b.name.toLowerCase() === rawName.toLowerCase())) ||
                           centralItems.find(c => (item.product_id && c.id === item.product_id) || (c.name && c.name.toLowerCase() === rawName.toLowerCase()));
                if (foundInv) cp = Number(foundInv.cost_price || 0);
            }

            const itemCogs = q * cp;
            const itemRev = item.total_price || (q * p);

            totalUnitsSold += q;
            computedCogsForSale += itemCogs;

            if (!cogsMap[key]) {
                cogsMap[key] = {
                    name: key,
                    sku: item.sku || foundInv?.sku || '—',
                    unitsSold: 0,
                    totalCogs: 0,
                    revenue: 0,
                    costPrice: cp,
                    unitPrice: p,
                    productId: item.product_id || foundInv?.id || null
                };
            }
            cogsMap[key].unitsSold += q;
            cogsMap[key].totalCogs += itemCogs;
            cogsMap[key].revenue += itemRev;
            if (!cogsMap[key].costPrice && cp) cogsMap[key].costPrice = cp;
            if (p > 0) cogsMap[key].unitPrice = p;
        });

        totalCogs += (saleCogsTotal || computedCogsForSale);
    });

    const cogsProductBreakdown = Object.values(cogsMap).map(p => {
        const grossProfit = p.revenue - p.totalCogs;
        const marginPct = p.revenue > 0 ? ((grossProfit / p.revenue) * 100).toFixed(1) : '0.0';
        return {
            ...p,
            grossProfit,
            marginPct
        };
    }).sort((a, b) => b.revenue - a.revenue);

    // Mini Stock Analysis for Items Sold in Period
    let miniStockAnalysis = Object.values(cogsMap).map(p => {
        const foundInv = (p.productId && invLookup.get(p.productId)) ||
                         invLookup.get(p.name.trim().toLowerCase()) ||
                         branchInventory.find(b => (p.productId && b.id === p.productId) || (b.name && b.name.trim().toLowerCase() === p.name.trim().toLowerCase()));

        const isService = foundInv && (foundInv.item_type === 'service' || (foundInv.category && String(foundInv.category).toLowerCase().includes('service')));
        const currentCount = isService ? 0 : (foundInv ? Number(foundInv.quantity || 0) : 0);
        const currentUnitPrice = foundInv ? Number(foundInv.price || foundInv.retail_price || p.unitPrice || 0) : Number(p.unitPrice || 0);
        const currentStockValue = isService ? 0 : (currentCount * currentUnitPrice);

        return {
            name: p.name,
            sku: p.sku || foundInv?.sku || '—',
            soldCount: p.unitsSold,
            soldStockValue: p.revenue,
            currentCount: currentCount,
            currentStockValue: currentStockValue,
            currentUnitPrice: currentUnitPrice,
            isService: !!isService
        };
    }).sort((a, b) => b.soldCount - a.soldCount);

    const miniStockTotals = {
        totalSoldCount: miniStockAnalysis.reduce((sum, item) => sum + item.soldCount, 0),
        totalSoldStockValue: miniStockAnalysis.reduce((sum, item) => sum + item.soldStockValue, 0),
        totalCurrentCount: miniStockAnalysis.reduce((sum, item) => sum + (item.isService ? 0 : item.currentCount), 0),
        totalCurrentStockValue: miniStockAnalysis.reduce((sum, item) => sum + item.currentStockValue, 0)
    };

    const totalSales = sales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalRefunds = returns.reduce((sum, r) => sum + (Number(r.return_amount || r.amount_refunded) || 0), 0);
    const grossProfit = totalSales - totalCogs;
    const netProfit = totalSales - totalCogs - totalExpenses - totalRefunds;
    const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : '0.0';

    // Inventory Valuation & Remaining stock on hand
    const physicalInv = branchInventory.filter(i => i.item_type !== 'service' && !(i.category && String(i.category).toLowerCase().includes('service')) && !(i.unit && String(i.unit).toLowerCase() === 'service'));
    const remainingStockUnits = physicalInv.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
    const remainingStockSkus = physicalInv.length || branchInventory.length;
    const remainingStockValuation = physicalInv.reduce((sum, i) => sum + ((Number(i.cost_price) || Number(i.price) || 0) * (Number(i.quantity) || 0)), 0);

    const mainStoreValuation = centralItems.reduce((sum, i) => sum + ((Number(i.cost_price) || 0) * (Number(i.main_store_stock) || 0)), 0);
    const branchStockValuation = remainingStockValuation;
    const totalInventoryValuation = mainStoreValuation + branchStockValuation;

    // Expense Categories aggregation
    const catMap = {};
    const catCount = {};
    expenses.forEach(e => {
        const c = e.category || 'General';
        catMap[c] = (catMap[c] || 0) + (Number(e.amount) || 0);
        catCount[c] = (catCount[c] || 0) + 1;
    });
    const expenseCategoryBreakdown = Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => ({
        category: cat,
        count: catCount[cat] || 0,
        totalSpent: amt,
        sharePct: totalExpenses > 0 ? ((amt / totalExpenses) * 100).toFixed(1) : '0.0'
    }));

    // Payment Methods aggregation
    const paymentMethods = {};
    sales.forEach(s => {
        const pm = (s.payment_method || s.payment || 'Cash').toLowerCase();
        paymentMethods[pm] = (paymentMethods[pm] || 0) + (Number(s.amount) || 0);
    });

    const bestSellers = cogsProductBreakdown.length ? cogsProductBreakdown : Object.values(cogsMap);

    // Branch Performance Breakdown
    const branchPerformance = branches.map(b => {
        const bSales = sales.filter(s => s.branch_id === b.id);
        const bExp = expenses.filter(e => e.branch_id === b.id);
        const bRet = returns.filter(r => r.branch_id === b.id);
        const bTasks = tasks.filter(t => t.branch_id === b.id);
        const bShifts = shifts.filter(s => s.branch_id === b.id);

        const rev = bSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
        const exp = bExp.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const ref = bRet.reduce((sum, r) => sum + (Number(r.return_amount || r.amount_refunded) || 0), 0);
        const profit = rev - exp - ref;
        const avgTicket = bSales.length > 0 ? rev / bSales.length : 0;
        const completedTasks = bTasks.filter(t => t.status === 'completed').length;
        const taskRate = bTasks.length > 0 ? Math.round((completedTasks / bTasks.length) * 100) : 100;

        return {
            id: b.id,
            name: b.name,
            location: b.location || b.address || '—',
            created_at: b.created_at,
            openingDateFormatted: formatDate(b.created_at),
            operatingAge: formatAge(b.created_at),
            managerName: b.manager_name || b.manager || 'Manager',
            transactionsCount: bSales.length,
            revenue: rev,
            expenses: exp,
            refunds: ref,
            profit: profit,
            profitMargin: rev > 0 ? ((profit / rev) * 100).toFixed(1) : '0.0',
            profitContribution: totalSales > 0 ? ((rev / totalSales) * 100).toFixed(1) : '0.0',
            avgTicket: avgTicket,
            completedTasks: completedTasks,
            totalTasks: bTasks.length,
            taskCompletionRate: taskRate,
            activeStaffCount: new Set(bShifts.map(s => s.staff_name || s.user_id)).size || bShifts.length
        };
    }).sort((a, b) => b.revenue - a.revenue);

    // Staff Performance Breakdown
    const staffSalesMap = {};
    sales.forEach(s => {
        const staffKey = s.staff_name || s.cashier_name || 'Unassigned Staff';
        if (!staffSalesMap[staffKey]) {
            staffSalesMap[staffKey] = {
                name: staffKey,
                branchName: branchMap.get(s.branch_id)?.name || 'Main Store',
                transactions: 0,
                totalSales: 0
            };
        }
        staffSalesMap[staffKey].transactions += 1;
        staffSalesMap[staffKey].totalSales += (Number(s.amount) || 0);
    });

    const staffPerformance = Object.values(staffSalesMap).sort((a, b) => b.totalSales - a.totalSales);

    // Stock Flow Traceability Breakdown
    const purchasesList = movements.filter(m => m.movement_type === 'purchase');
    const dispatchesList = movements.filter(m => m.movement_type === 'dispatch');
    const branchSalesList = movements.filter(m => m.movement_type === 'sale');

    // Low stock items filtering & reorder deficits
    const lowStockItems = (branchInventory.length ? branchInventory : centralItems)
        .filter(i => {
            const isSvc = i.item_type === 'service' || (i.category && String(i.category).toLowerCase().includes('service')) || (i.unit && String(i.unit).toLowerCase() === 'service');
            if (isSvc) return false;
            const q = Number(i.quantity) || 0;
            const thresh = Number(i.min_threshold) || Number(i.min_stock) || 5;
            return q <= thresh;
        })
        .map(i => {
            const q = Number(i.quantity) || 0;
            const thresh = Number(i.min_threshold) || Number(i.min_stock) || 5;
            const deficit = Math.max(0, thresh - q);
            const costPrice = Number(i.cost_price || i.buying_price || (Number(i.retail_price || i.price || 0) * 0.7));
            const retailPrice = Number(i.retail_price || i.price || 0);
            const estRestockCost = deficit * costPrice;
            const isOutOfStock = q <= 0;
            return {
                ...i,
                currentQty: q,
                threshold: thresh,
                deficit,
                costPrice,
                retailPrice,
                estRestockCost,
                isOutOfStock
            };
        })
        .sort((a, b) => (a.currentQty - b.currentQty) || (b.deficit - a.deficit));

    const totalLowStockCount = lowStockItems.length;
    const totalOutOfStockCount = lowStockItems.filter(i => i.isOutOfStock).length;
    const totalDeficitUnits = lowStockItems.reduce((acc, i) => acc + i.deficit, 0);
    const totalRestockCost = lowStockItems.reduce((acc, i) => acc + i.estRestockCost, 0);

    return {
        scope,
        startDate,
        endDate,
        branchId,
        selectedBranch,
        branches,
        branchMap,
        sales,
        expenses,
        returns,
        centralItems,
        branchInventory,
        physicalInv,
        lowStockItems,
        totalLowStockCount,
        totalOutOfStockCount,
        totalDeficitUnits,
        totalRestockCost,
        movements,
        shifts,
        tasks,
        loans,
        totalSales,
        totalExpenses,
        totalRefunds,
        totalCogs,
        totalUnitsSold,
        grossProfit,
        netProfit,
        profitMargin,
        cogsProductBreakdown,
        miniStockAnalysis,
        miniStockTotals,
        expenseCategoryBreakdown,
        remainingStockUnits,
        remainingStockSkus,
        remainingStockValuation,
        mainStoreValuation,
        branchStockValuation,
        totalInventoryValuation,
        paymentMethods,
        bestSellers,
        branchPerformance,
        staffPerformance,
        purchasesList,
        dispatchesList,
        branchSalesList
    };
}

/**
 * Helper to resolve custom branding colors or fallback to default AI Analytics palette
 */
function getReportBrandColors() {
    const profile = window.state?.profile || {};
    const hasCustomBranding = profile.custom_branding_enabled || profile.role === 'sysadmin' || profile.plan === 'enterprise';
    const customHex = (hasCustomBranding && profile.brand_color) || profile.invoice_settings?.brand_color || null;

    const hexToRgb = (hex, defaultRgb) => {
        if (!hex || typeof hex !== 'string') return defaultRgb;
        const cleaned = hex.replace('#', '').trim();
        if (cleaned.length === 6) {
            const r = parseInt(cleaned.substring(0, 2), 16);
            const g = parseInt(cleaned.substring(2, 4), 16);
            const b = parseInt(cleaned.substring(4, 6), 16);
            if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                return [r, g, b];
            }
        }
        return defaultRgb;
    };

    const hasCustom = Boolean(customHex && customHex.trim());
    const customRgb = hexToRgb(customHex, [71, 91, 110]);
    // Default AI Analytics table header color is [71, 91, 110] with bold white text
    const tableHeaderFill = hasCustom ? customRgb : [71, 91, 110];
    const accentBadgeColor = hasCustom ? customRgb : [79, 70, 229];

    return {
        hasCustom,
        tableHeaderFill,
        accentBadgeColor
    };
}

/**
 * Render first-glance clean hero header on jsPDF canvas
 */
function renderPdfHero(doc, data, reportTitle, reportCategoryName, subtitle = '') {
    const pw = doc.internal.pageSize.width;
    const m = 14;
    const profile = window.state?.profile || {};
    const enterpriseName = (window.state?.enterpriseName || profile.business_name || profile.company_name || 'BMS Enterprise').toUpperCase();
    const isSingleBranch = (data.scope === 'branch' || data.branchId !== 'all') && data.selectedBranch;
    const branchObj = isSingleBranch ? (data.selectedBranch || (data.scope === 'branch' ? window.state?.branchProfile : null) || {}) : {};

    const branchLocation = isSingleBranch
        ? (branchObj.location || branchObj.address || (data.scope === 'branch' ? window.state?.branchProfile?.address : null) || 'Headquarters')
        : 'Enterprise Multi-Branch Operations';

    const phone = isSingleBranch
        ? (branchObj.phone || (data.scope === 'branch' ? window.state?.branchProfile?.phone : null) || profile.phone || '—')
        : (profile.phone || '—');

    const email = isSingleBranch
        ? (branchObj.email || branchObj.manager_email || branchObj.branch_email || branchObj.contact_email || (data.scope === 'branch' ? (window.state?.branchProfile?.email || window.state?.branchProfile?.manager_email) : null) || '—')
        : (profile.email || '—');

    const tin = isSingleBranch
        ? (branchObj.branch_tin || (data.scope === 'branch' ? window.state?.branchProfile?.branch_tin : null) || profile.tax_id || '—')
        : (profile.tax_id || '—');

    const regNo = isSingleBranch
        ? (branchObj.branch_reg_no || (data.scope === 'branch' ? window.state?.branchProfile?.branch_reg_no : null) || profile.business_reg_no || '—')
        : (profile.business_reg_no || '—');

    const fontName = doc.getFontList()?.['Inter'] ? 'Inter' : 'helvetica';
    const { accentBadgeColor } = getReportBrandColors();

    // 1. Clean Top Header Bar (Subtle Slate Tint matching AI Analytics)
    doc.setFillColor(248, 250, 252); // #F8FAFC
    doc.rect(0, 0, pw, 42, 'F');

    // Hairline bottom border
    doc.setDrawColor(226, 232, 240); // #E2E8F0
    doc.setLineWidth(0.4);
    doc.line(0, 42, pw, 42);

    const safeSubtitle = subtitle ? (subtitle.length > 70 ? subtitle.substring(0, 68) + '...' : subtitle) : 'Official business operational audit report';

    if (isSingleBranch) {
        // 1. Branch Name as Bigger Header
        doc.setFont(fontName, 'bold');
        doc.setFontSize(14.5);
        doc.setTextColor(30, 41, 59); // #1E293B
        doc.text(data.selectedBranch.name.toUpperCase(), m, 12.5);

        // 2. Business / Enterprise Name Below Branch Name
        doc.setFont(fontName, 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(71, 91, 110); // #475B6E
        doc.text(enterpriseName, m, 18.5);

        // 3. Report Title
        doc.setFont(fontName, 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(...accentBadgeColor);
        doc.text(reportTitle.toUpperCase(), m, 25);

        // 4. Subtitle / Description
        doc.setFont(fontName, 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139); // #64748B
        doc.text(safeSubtitle, m, 31);
    } else {
        // Consolidated Enterprise Header
        doc.setFont(fontName, 'bold');
        doc.setFontSize(14.5);
        doc.setTextColor(30, 41, 59); // #1E293B
        doc.text(enterpriseName, m, 13);

        doc.setFont(fontName, 'bold');
        doc.setFontSize(10);
        doc.setTextColor(71, 91, 110); // #475B6E
        doc.text(reportTitle.toUpperCase(), m, 20);

        doc.setFont(fontName, 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139); // #64748B
        doc.text(safeSubtitle, m, 26);

        // Scope Badge
        doc.setFont(fontName, 'bold');
        doc.setFontSize(8);
        doc.setTextColor(...accentBadgeColor);
        doc.text(`CONSOLIDATED AUDIT (${data.branches.length} BRANCHES)`, m, 34);
    }

    // Right-aligned Legal & Contact Metadata
    doc.setFont(fontName, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); // #64748B
    doc.text(`TIN: ${tin}  |  Reg BL: ${regNo}`, pw - m, 12, { align: 'right' });
    doc.text(`${branchLocation}  |  ${phone}`, pw - m, 18, { align: 'right' });
    doc.text(`${email}`, pw - m, 24, { align: 'right' });
    doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, pw - m, 30, { align: 'right' });

    let y = 46;

    // 2. Key Metadata & Dates Sub-Banner (Cleanly separated Timeframe vs Branch Metadata)
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(m, y, pw - (m * 2), 11, 2, 2, 'FD');

    doc.setFont(fontName, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 91, 110);

    const now = new Date();
    const todayFallback = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const startStr = data.startDate || todayFallback;
    const endStr = data.endDate || todayFallback;
    let periodText = `Report Timeframe: ${formatDate(startStr)} to ${formatDate(endStr)}`;
    if (startStr === endStr) {
        periodText = `Report Date: ${formatDate(startStr)} (Daily Report)`;
    }
    doc.text(periodText, m + 4, y + 7);

    if (isSingleBranch && data.selectedBranch.created_at) {
        const openedText = `Branch: ${data.selectedBranch.name} | Stock: ${(data.remainingStockUnits || 0).toLocaleString()} units (${formatMoney(data.remainingStockValuation || 0)})`;
        doc.text(openedText, pw - m - 4, y + 7, { align: 'right' });
    } else {
        doc.text(`Branches: ${data.branches.length} | Stock: ${(data.remainingStockUnits || 0).toLocaleString()} units (${formatMoney(data.remainingStockValuation || 0)})`, pw - m - 4, y + 7, { align: 'right' });
    }

    y += 16;

    // 3. Dynamic First-Glance KPI Summary Cards Grid (4 boxes tailored per report type)
    const boxW = (pw - (m * 2) - 9) / 4;
    const boxH = 16;

    let cards = [];
    if (reportCategoryName === 'sales' || reportCategoryName === 'sales_invoices') {
        cards = [
            { label: 'GROSS SALES REVENUE', val: formatMoney(data.totalSales), sub: `${data.sales.length} transactions` },
            { label: 'COST OF GOODS (COGS)', val: formatMoney(data.totalCogs || 0), sub: `${(data.totalUnitsSold || 0).toLocaleString()} units sold / used` },
            { label: 'TOTAL EXPENSES', val: formatMoney(data.totalExpenses), sub: `${data.expenses.length} expense records` },
            { label: 'NET OPERATING PROFIT', val: formatMoney(data.netProfit), sub: `${data.profitMargin}% net margin` }
        ];
    } else if (reportCategoryName === 'expenses') {
        const catMap = {};
        data.expenses.forEach(e => {
            const c = e.category || 'General';
            catMap[c] = (catMap[c] || 0) + (Number(e.amount) || 0);
        });
        const topCatEntry = Object.entries(catMap).sort((a, b) => b[1] - a[1])[0] || ['None', 0];
        const avgExp = data.expenses.length ? data.totalExpenses / data.expenses.length : 0;
        const expRatio = data.totalSales > 0 ? ((data.totalExpenses / data.totalSales) * 100).toFixed(1) : '0.0';
        cards = [
            { label: 'TOTAL EXPENSES', val: formatMoney(data.totalExpenses), sub: `${data.expenses.length} expense records` },
            { label: 'TOP EXPENSE CATEGORY', val: topCatEntry[0].toUpperCase().substring(0, 16), sub: formatMoney(topCatEntry[1]) },
            { label: 'AVG EXPENSE VOUCHER', val: formatMoney(avgExp), sub: 'Per recorded entry' },
            { label: 'EXPENSE / SALES', val: `${expRatio}%`, sub: 'Of gross revenue' }
        ];
    } else if (reportCategoryName === 'inventory' || reportCategoryName === 'stock_inventory') {
        const physicalInv = data.branchInventory.filter(i => i.item_type !== 'service' && !(i.category && String(i.category).toLowerCase().includes('service')) && !(i.unit && String(i.unit).toLowerCase() === 'service'));
        const totalUnits = physicalInv.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
        const lowStock = physicalInv.filter(i => (Number(i.quantity) || 0) <= (Number(i.min_threshold) || 5)).length;
        const totalSkus = data.branchInventory.length || data.centralItems.length;
        cards = [
            { label: 'STOCK ASSET VALUATION', val: formatMoney(data.branchStockValuation || data.totalInventoryValuation), sub: 'Current retail valuation' },
            { label: 'TOTAL ACTIVE SKUS', val: `${totalSkus} SKUs`, sub: 'Product catalog' },
            { label: 'UNITS ON HAND', val: `${totalUnits.toLocaleString()} units`, sub: 'Physical stock' },
            { label: 'LOW STOCK WARNINGS', val: `${lowStock} items`, sub: 'At / below threshold' }
        ];
    } else if (reportCategoryName === 'low_stock') {
        cards = [
            { label: 'LOW STOCK SKUS', val: `${data.totalLowStockCount || (data.lowStockItems || []).length} items`, sub: 'At or below threshold' },
            { label: 'OUT OF STOCK', val: `${data.totalOutOfStockCount || 0} items`, sub: 'Zero on-hand quantity' },
            { label: 'UNITS TO REORDER', val: `${(data.totalDeficitUnits || 0).toLocaleString()} units`, sub: 'Total safety deficit' },
            { label: 'EST. REORDER COST', val: formatMoney(data.totalRestockCost || 0), sub: 'Estimated restocking capital' }
        ];
    } else if (reportCategoryName === 'stock_purchases') {
        const totalPurch = data.purchasesList.reduce((sum, p) => sum + ((Number(p.cost_price) || 0) * (Number(p.quantity) || 0)), 0);
        const totalUnits = data.purchasesList.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
        cards = [
            { label: 'PURCHASE EXPENDITURE', val: formatMoney(totalPurch), sub: `${data.purchasesList.length} supplier orders` },
            { label: 'UNITS RESTOCKED', val: `${totalUnits.toLocaleString()} units`, sub: 'Intake to warehouse' },
            { label: 'AVG PURCHASE BATCH', val: formatMoney(data.purchasesList.length ? totalPurch / data.purchasesList.length : 0), sub: 'Per supplier order' },
            { label: 'RESTOCK ORDERS', val: `${data.purchasesList.length} orders`, sub: 'Chronological entries' }
        ];
    } else if (reportCategoryName === 'stock_dispatches') {
        const totalDisp = data.dispatchesList.reduce((sum, d) => sum + ((Number(d.retail_price || d.price) || 0) * (Number(d.quantity) || 0)), 0);
        const totalUnits = data.dispatchesList.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);
        cards = [
            { label: 'DISPATCH RETAIL VALUE', val: formatMoney(totalDisp), sub: `${data.dispatchesList.length} shipments` },
            { label: 'UNITS DISPATCHED', val: `${totalUnits.toLocaleString()} units`, sub: 'Transferred out' },
            { label: 'AVG SHIPMENT VALUE', val: formatMoney(data.dispatchesList.length ? totalDisp / data.dispatchesList.length : 0), sub: 'Per transfer batch' },
            { label: 'OUTLET TRANSFERS', val: `${data.dispatchesList.length} shipments`, sub: 'Logistics transfers' }
        ];
    } else if (reportCategoryName === 'best_sellers') {
        const topItem = data.bestSellers[0] || { name: 'None', quantitySold: 0, revenue: 0, cost: 0 };
        const totalUnits = data.bestSellers.reduce((sum, s) => sum + s.quantitySold, 0);
        const totalProfit = data.bestSellers.reduce((sum, s) => sum + (s.revenue - s.cost), 0);
        cards = [
            { label: 'TOP PERFORMER', val: topItem.name.substring(0, 16), sub: `${topItem.quantitySold} units sold` },
            { label: 'TOP PRODUCT REVENUE', val: formatMoney(topItem.revenue), sub: 'Lead product revenue' },
            { label: 'TOTAL UNITS SOLD', val: `${totalUnits.toLocaleString()} units`, sub: 'All catalog items' },
            { label: 'EST. GROSS MARGIN', val: formatMoney(totalProfit), sub: 'Sales revenue minus cost' }
        ];
    } else if (reportCategoryName === 'loans') {
        const totalLoans = (data.loans || []).reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
        const totalRepaid = (data.loans || []).reduce((sum, l) => sum + (Number(l.repaid_amount || l.amount_paid) || 0), 0);
        const outstanding = totalLoans - totalRepaid;
        cards = [
            { label: 'TOTAL LOAN PORTFOLIO', val: formatMoney(totalLoans), sub: `${(data.loans || []).length} loan accounts` },
            { label: 'OUTSTANDING BALANCE', val: formatMoney(outstanding), sub: 'Remaining to collect' },
            { label: 'REPAYMENTS COLLECTED', val: formatMoney(totalRepaid), sub: 'Settled to date' },
            { label: 'LOAN ACCOUNTS', val: `${(data.loans || []).length} records`, sub: 'Active contracts' }
        ];
    } else if (reportCategoryName === 'returns_refunds') {
        const totalUnits = (data.returns || []).reduce((sum, r) => sum + (Number(r.quantity) || 1), 0);
        const returnRate = data.sales.length > 0 ? (((data.returns || []).length / data.sales.length) * 100).toFixed(1) : '0.0';
        cards = [
            { label: 'TOTAL REFUNDS PAID', val: formatMoney(data.totalRefunds), sub: 'Refund disbursements' },
            { label: 'RETURNED UNITS', val: `${totalUnits} items`, sub: 'Returned to branch' },
            { label: 'RETURN RATE', val: `${returnRate}%`, sub: 'Of completed sales' },
            { label: 'AUDITED RETURNS', val: `${(data.returns || []).length} cases`, sub: 'Logged claims' }
        ];
    } else if (reportCategoryName === 'staff_productivity') {
        const topStaff = data.staffPerformance[0] || { name: 'None', totalSales: 0 };
        cards = [
            { label: 'ACTIVE SALES STAFF', val: `${data.staffPerformance.length} staff`, sub: 'Assigned personnel' },
            { label: 'HANDLED SALES VOLUME', val: formatMoney(data.totalSales), sub: 'Across all shifts' },
            { label: 'CHECKOUT ORDERS', val: `${data.sales.length} orders`, sub: 'Completed tickets' },
            { label: 'TOP CASHIER', val: topStaff.name.substring(0, 16), sub: formatMoney(topStaff.totalSales) }
        ];
    } else if (reportCategoryName === 'branch_performance') {
        const avgRev = data.branchPerformance.length ? data.totalSales / data.branchPerformance.length : 0;
        const totalTasks = data.branchPerformance.reduce((sum, b) => sum + (b.totalTasks || 0), 0);
        const completedTasks = data.branchPerformance.reduce((sum, b) => sum + (b.completedTasks || 0), 0);
        const taskRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;
        cards = [
            { label: 'ACTIVE LOCATIONS', val: `${data.branchPerformance.length} branches`, sub: 'Operating network' },
            { label: 'COMBINED FLEET SALES', val: formatMoney(data.totalSales), sub: 'All branch locations' },
            { label: 'AVG BRANCH SALES', val: formatMoney(avgRev), sub: 'Per outlet average' },
            { label: 'TASK COMPLETION RATE', val: `${taskRate}%`, sub: 'Operational output' }
        ];
    } else if (reportCategoryName === 'stock_flow') {
        const totalPurch = data.purchasesList.reduce((sum, p) => sum + ((Number(p.cost_price) || 0) * (Number(p.quantity) || 0)), 0);
        const totalDisp = data.dispatchesList.reduce((sum, d) => sum + ((Number(d.retail_price || d.price) || 0) * (Number(d.quantity) || 0)), 0);
        const totalSkus = data.centralItems.length || data.branchInventory.length;
        cards = [
            { label: 'SUPPLIER RESTOCKS', val: formatMoney(totalPurch), sub: `${data.purchasesList.length} intake batches` },
            { label: 'BRANCH DISPATCHES', val: formatMoney(totalDisp), sub: `${data.dispatchesList.length} transfer shipments` },
            { label: 'TOTAL STOCK VALUE', val: formatMoney(data.totalInventoryValuation), sub: 'Warehouse + Branches' },
            { label: 'MANAGED CATALOG', val: `${totalSkus} SKUs`, sub: 'Registered products' }
        ];
    } else {
        cards = [
            { label: 'GROSS REVENUE', val: formatMoney(data.totalSales), sub: `${data.sales.length} transactions` },
            { label: 'TOTAL EXPENSES', val: formatMoney(data.totalExpenses), sub: `${data.expenses.length} records` },
            { label: 'NET PROFIT', val: formatMoney(data.netProfit), sub: `${data.profitMargin}% margin` },
            { label: 'STOCK VALUATION', val: formatMoney(data.totalInventoryValuation), sub: 'Warehouse + Branches' }
        ];
    }

    cards.forEach((c, i) => {
        const bx = m + (i * (boxW + 3));
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(bx, y, boxW, boxH, 2, 2, 'FD');

        doc.setFont(fontName, 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(c.label, bx + 3, y + 4.5);

        doc.setFont(fontName, 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(30, 41, 59);
        doc.text(c.val, bx + 3, y + 10);

        doc.setFont(fontName, 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text(c.sub, bx + 3, y + 14);
    });

    return y + boxH + 6;
}

/**
 * Universal AutoTable Theme Config matching AI Analytics Reports
 */
function getAutoTableTheme(doc = null) {
    const fontName = doc?.getFontList()?.['Inter'] ? 'Inter' : 'helvetica';
    const { tableHeaderFill } = getReportBrandColors();

    return {
        margin: { left: 14, right: 14 },
        styles: {
            font: fontName,
            fontSize: 7.5,
            cellPadding: 2.5,
            lineColor: [226, 232, 240],
            lineWidth: 0.2,
            textColor: [30, 41, 59],
            valign: 'top',
            overflow: 'linebreak'
        },
        headStyles: {
            font: fontName,
            fillColor: tableHeaderFill, // [71, 91, 110] (AI Analytics signature slate) or custom brand RGB
            textColor: [255, 255, 255],  // Crisp bold white
            fontStyle: 'bold',
            fontSize: 7.5,
            lineWidth: 0.3,
            lineColor: [203, 213, 225]
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]  // #F8FAFC
        },
        tableLineColor: [226, 232, 240],
        tableLineWidth: 0.3
    };
}

/**
 * Dynamic Footer for jsPDF matching AI Analytics
 */
function applyPdfFooter(doc) {
    const pageCount = doc.internal.getNumberOfPages();
    const pw = doc.internal.pageSize.width;
    const ph = doc.internal.pageSize.height;
    const fontName = doc.getFontList()?.['Inter'] ? 'Inter' : 'helvetica';

    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(14, ph - 12, pw - 14, ph - 12);

        doc.setFont(fontName, 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('BMS Enterprise Multi-Tenant System  |  Confidential Business Audit', 14, ph - 7);
        doc.text(`Page ${i} of ${pageCount}`, pw - 14, ph - 7, { align: 'right' });
    }
}

/**
 * MASTER EXPORT FUNCTION: Generates pixel-perfect PDFs for all specific categories
 */
export async function exportReportPdf(category, params) {
    if (typeof window.ensurePdfLibraries === 'function') {
        await window.ensurePdfLibraries();
    }
    if (!window.jspdf || !window.jspdf.jsPDF) {
        throw new Error('jsPDF library is not loaded');
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    let fontName = 'Inter';
    if (typeof window.ensureInterFont === 'function') {
        const hasInter = await window.ensureInterFont(doc);
        if (!hasInter) fontName = 'helvetica';
    } else {
        fontName = 'helvetica';
    }
    const data = await fetchReportData(params);

    const reportConfigs = {
        sales: {
            title: 'Sales Report',
            subtitle: 'Chronological ledger of retail transactions, customer invoices, payment channels, and settlement totals.'
        },
        sales_invoices: {
            title: 'Sales Report',
            subtitle: 'Chronological ledger of retail transactions, customer invoices, payment channels, and settlement totals.'
        },
        expenses: {
            title: 'Expenses Report',
            subtitle: 'Comprehensive audit of operational expenses, category allocations, vendor costs, and disbursements.'
        },
        inventory: {
            title: 'Current Stock Inventory & Asset Valuation Ledger',
            subtitle: 'Active inventory catalog, on-hand unit quantities, reorder thresholds, unit prices, and total asset valuation.'
        },
        stock_inventory: {
            title: 'Current Stock Inventory & Asset Valuation Ledger',
            subtitle: 'Active inventory catalog, on-hand unit quantities, reorder thresholds, unit prices, and total asset valuation.'
        },
        stock_flow: {
            title: 'Stock Lifecycle, Traceability & Supply Flow Ledger',
            subtitle: 'End-to-end supply chain audit: Supplier restocks, warehouse inventory, branch transfers, and customer sales.'
        },
        stock_purchases: {
            title: 'Central Main Store Purchases & Restocks Ledger',
            subtitle: 'Chronological record of supplier purchases, inventory restock batches, cost prices, and procurement totals.'
        },
        stock_dispatches: {
            title: 'Branch Dispatches & Transfer Flow Ledger',
            subtitle: 'Audited log of stock dispatches transferred from Main Store warehouse to destination branch locations.'
        },
        best_sellers: {
            title: 'Top Performing Stock Catalogs & Best Sellers',
            subtitle: 'Ranked product catalog performance by sales revenue generation, unit turnover volume, and gross margins.'
        },
        loans: {
            title: 'Loans, Borrowings & Credit Liabilities Ledger',
            subtitle: 'Comprehensive log of issued loans, repayments, outstanding debt balances, and counterparty records.'
        },
        returns_refunds: {
            title: 'Product Returns, Refunds & Condition Audit Log',
            subtitle: 'Detailed audit of customer item returns, refund amounts disbursed, return reasons, and restocked units.'
        },
        staff_productivity: {
            title: 'Staff Attendance, Shifts & Productivity Report',
            subtitle: 'Sales personnel performance, cashier checkout volumes, shift attendance, and average ticket contribution.'
        },
        branch_performance: {
            title: 'Branch Operations & Performance Scorecard',
            subtitle: 'Branch operational metrics, manager sales volume, transaction throughput, and task completion rates.'
        },
        financial_pl: {
            title: 'Executive Financial & P&L Statement',
            subtitle: 'Comprehensive Profit & Loss, branch-by-branch financial performance, gross revenue, operating costs, and margins.'
        },
        consolidated_full: {
            title: 'Consolidated Master Business Audit Dossier',
            subtitle: 'Complete enterprise operational, financial, inventory, and management performance audit dossier.'
        }
    };

    const cfg = reportConfigs[category] || {
        title: 'Business Performance Report',
        subtitle: 'Official business operational audit report'
    };

    let currentY = renderPdfHero(doc, data, cfg.title, category, cfg.subtitle);
    const theme = getAutoTableTheme(doc);

    // Optional Manager Notes / Operational Remarks Callout Box
    const notes = params?.managerNotes || data?.managerNotes;
    if (notes && String(notes).trim()) {
        const pw = doc.internal.pageSize.width;
        const m = 14;
        const noteBoxW = pw - (m * 2);
        
        doc.setFont(fontName, 'bold');
        doc.setFontSize(7.5);
        
        const splitNotes = doc.splitTextToSize(String(notes).trim(), noteBoxW - 8);
        const noteBoxH = Math.max(13, 7 + (splitNotes.length * 3.6));
        
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(m, currentY, noteBoxW, noteBoxH, 2, 2, 'FD');
        
        doc.setTextColor(79, 70, 229); // indigo
        doc.text('BRANCH MANAGER NOTES & DAILY REMARKS:', m + 4, currentY + 4.5);
        
        doc.setFont(fontName, 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85);
        doc.text(splitNotes, m + 4, currentY + 8.5);
        
        currentY += noteBoxH + 6;
    }

    // 1. EXPENSES DEDICATED REPORT
    if (category === 'expenses') {
        doc.setFont(fontName, 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text('1. Operational Expenses by Category', 14, currentY);
        currentY += 3;

        const catMap = {};
        const catCount = {};
        data.expenses.forEach(e => {
            const c = e.category || 'General';
            catMap[c] = (catMap[c] || 0) + (Number(e.amount) || 0);
            catCount[c] = (catCount[c] || 0) + 1;
        });

        const expenseCatRows = Object.entries(catMap).sort((a, b) => b[1] - a[1]).map(([cat, amt]) => {
            const share = data.totalExpenses > 0 ? ((amt / data.totalExpenses) * 100).toFixed(1) : '0.0';
            return [
                cat.toUpperCase(),
                (catCount[cat] || 0).toString(),
                formatMoney(amt),
                `${share}%`
            ];
        });

        expenseCatRows.push([
            'TOTAL OPERATIONAL EXPENSES',
            data.expenses.length.toString(),
            formatMoney(data.totalExpenses),
            '100.0%'
        ]);

        doc.autoTable({
            ...theme,
            startY: currentY,
            head: [['Expense Category', 'Voucher Count', 'Total Spent', '% Share of Expenses']],
            body: expenseCatRows.length ? expenseCatRows : [['—', '0', formatMoney(0), '0.0%']],
            columnStyles: {
                0: { cellWidth: 70 },
                1: { cellWidth: 32, halign: 'center' },
                2: { cellWidth: 45, halign: 'right', fontStyle: 'bold' },
                3: { cellWidth: 35, halign: 'center' }
            }
        });

        currentY = doc.lastAutoTable.finalY + 8;

        if (currentY + 35 > doc.internal.pageSize.height) {
            doc.addPage();
            currentY = 20;
        }

        doc.setFont(fontName, 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text('2. Itemized Operational Expense Records', 14, currentY);
        currentY += 3;

        const isBranchScoped = data.scope === 'branch' || (params?.branchId && params.branchId !== 'all') || data.isSingleBranch;

        if (isBranchScoped) {
            const itemizedExpRows = data.expenses.slice(0, 40).map(e => [
                formatDate(e.created_at),
                (e.category || 'General').toUpperCase(),
                e.description || e.notes || 'Expense record',
                formatMoney(e.amount)
            ]);

            doc.autoTable({
                ...theme,
                startY: currentY,
                head: [['Date', 'Category', 'Description / Details', 'Amount Spent']],
                body: itemizedExpRows.length ? itemizedExpRows : [['—', '—', 'No expense records in this timeframe', formatMoney(0)]],
                columnStyles: {
                    0: { cellWidth: 26, halign: 'center' },
                    1: { cellWidth: 38 },
                    2: { cellWidth: 88 },
                    3: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
                }
            });
        } else {
            const itemizedExpRows = data.expenses.slice(0, 35).map(e => [
                formatDate(e.created_at),
                data.branchMap.get(e.branch_id)?.name || 'Branch',
                (e.category || 'General').toUpperCase(),
                e.description || e.notes || 'Expense record',
                formatMoney(e.amount)
            ]);

            doc.autoTable({
                ...theme,
                startY: currentY,
                head: [['Date', 'Branch', 'Category', 'Description / Details', 'Amount']],
                body: itemizedExpRows.length ? itemizedExpRows : [['—', '—', '—', 'No expense records in this timeframe', '—']],
                columnStyles: {
                    0: { cellWidth: 22, halign: 'center' },
                    1: { cellWidth: 32 },
                    2: { cellWidth: 32 },
                    3: { cellWidth: 64 },
                    4: { cellWidth: 32, halign: 'right', fontStyle: 'bold' }
                }
            });
        }

        currentY = doc.lastAutoTable.finalY + 8;
    }

    // 2. INVENTORY DEDICATED REPORT
    if (category === 'inventory' || category === 'stock_inventory') {
        doc.setFont(fontName, 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text('1. Current Stock Inventory & Asset Valuations', 14, currentY);
        currentY += 3;

        const invRows = data.branchInventory.slice(0, 40).map(i => {
            const isService = i.item_type === 'service' || (i.category && String(i.category).toLowerCase().includes('service')) || (i.unit && String(i.unit).toLowerCase() === 'service');
            const qty = isService ? 0 : (Number(i.quantity) || 0);
            const threshold = Number(i.min_threshold) || 5;
            const price = Number(i.retail_price || i.price) || 0;
            const valuation = isService ? 0 : (qty * price);
            const status = isService ? 'Service' : (qty <= 0 ? 'Out of Stock' : (qty <= threshold ? 'Low Stock' : 'In Stock'));
            return [
                i.sku || '—',
                i.name || 'Unnamed Product',
                i.category || 'General',
                isService ? 'N/A' : formatNumber(qty),
                isService ? 'N/A' : formatNumber(threshold),
                formatMoney(price),
                isService ? 'N/A' : formatMoney(valuation),
                status
            ];
        });

        doc.autoTable({
            ...theme,
            startY: currentY,
            head: [['SKU Code', 'Product Name', 'Category', 'In-Stock', 'Safety Min', 'Unit Price', 'Total Valuation', 'Status']],
            body: invRows.length ? invRows : [['—', 'No inventory items found', '—', '—', '—', '—', '—', '—']],
            columnStyles: {
                0: { cellWidth: 24 },
                1: { cellWidth: 44 },
                2: { cellWidth: 24 },
                3: { cellWidth: 16, halign: 'center' },
                4: { cellWidth: 16, halign: 'center' },
                5: { cellWidth: 22, halign: 'right' },
                6: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
                7: { cellWidth: 18, halign: 'center' }
            }
        });

        currentY = doc.lastAutoTable.finalY + 8;
    }

    // 2b. LOW STOCK DEDICATED REPORT
    if (category === 'low_stock') {
        doc.setFont(fontName, 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text('1. Depleted Products & Restock Reorder Schedule', 14, currentY);
        currentY += 3;

        const lowStockRows = (data.lowStockItems || []).slice(0, 50).map(i => {
            const status = i.currentQty <= 0 ? 'OUT OF STOCK' : 'LOW STOCK';
            return [
                i.sku || '—',
                i.name || 'Unnamed Item',
                i.category || 'General',
                formatNumber(i.currentQty),
                formatNumber(i.threshold),
                formatNumber(i.deficit),
                formatMoney(i.costPrice),
                formatMoney(i.estRestockCost),
                status
            ];
        });

        doc.autoTable({
            ...theme,
            startY: currentY,
            head: [['SKU Code', 'Product / Item Name', 'Category', 'On-Hand', 'Safety Min', 'Deficit', 'Cost / Unit', 'Est. Capital', 'Status']],
            body: lowStockRows.length ? lowStockRows : [['—', 'All catalog inventory items are healthy and above minimum safety thresholds.', '—', '—', '—', '—', '—', '—', 'HEALTHY']],
            columnStyles: {
                0: { cellWidth: 20 },
                1: { cellWidth: 42 },
                2: { cellWidth: 22 },
                3: { cellWidth: 15, halign: 'center' },
                4: { cellWidth: 16, halign: 'center' },
                5: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
                6: { cellWidth: 20, halign: 'right' },
                7: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
                8: { cellWidth: 22, halign: 'center' }
            }
        });

        currentY = doc.lastAutoTable.finalY + 8;
    }

    // 3. LOANS DEDICATED REPORT
    if (category === 'loans') {
        doc.setFont(fontName, 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text('1. Loans, Borrowings & Credit Liabilities Ledger', 14, currentY);
        currentY += 3;

        const loanRows = (data.loans || []).slice(0, 35).map(l => {
            const principal = Number(l.amount) || 0;
            const repaid = Number(l.repaid_amount || l.amount_paid) || 0;
            const balance = principal - repaid;
            return [
                formatDate(l.created_at),
                data.branchMap.get(l.branch_id)?.name || 'Branch',
                l.party || l.borrower_name || 'Counterparty',
                (l.type || 'Loan').toUpperCase(),
                formatMoney(principal),
                formatMoney(repaid),
                formatMoney(balance),
                l.notes || l.status || 'Active'
            ];
        });

        doc.autoTable({
            ...theme,
            startY: currentY,
            head: [['Date', 'Branch', 'Borrower / Party', 'Type', 'Principal', 'Repaid', 'Balance', 'Notes / Status']],
            body: loanRows.length ? loanRows : [['—', '—', 'No loan accounts recorded', '—', '—', '—', '—', '—']],
            columnStyles: {
                0: { cellWidth: 20, halign: 'center' },
                1: { cellWidth: 26 },
                2: { cellWidth: 32 },
                3: { cellWidth: 18, halign: 'center' },
                4: { cellWidth: 22, halign: 'right' },
                5: { cellWidth: 22, halign: 'right' },
                6: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
                7: { cellWidth: 24 }
            }
        });

        currentY = doc.lastAutoTable.finalY + 8;
    }

    // 4. FINANCIAL P&L STATEMENT
    if (category === 'financial_pl' || category === 'consolidated_full') {
        // Section: P&L Summary Table
        doc.setFont(fontName, 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text('1. Branch-by-Branch Financial Performance', 14, currentY);
        currentY += 3;

        const plRows = data.branchPerformance.map((b, idx) => [
            `${idx + 1}. ${b.name}`,
            b.openingDateFormatted,
            formatMoney(b.revenue),
            formatMoney(b.expenses),
            formatMoney(b.profit),
            `${b.profitMargin}%`,
            `${b.profitContribution}%`
        ]);

        plRows.push([
            'CONSOLIDATED TOTAL',
            '—',
            formatMoney(data.totalSales),
            formatMoney(data.totalExpenses),
            formatMoney(data.netProfit),
            `${data.profitMargin}%`,
            '100.0%'
        ]);

        doc.autoTable({
            ...theme,
            startY: currentY,
            head: [['Branch Name', 'Opened Date', 'Gross Revenue', 'Expenses', 'Net Profit', 'Margin', 'Share']],
            body: plRows,
            columnStyles: {
                0: { cellWidth: 42 },
                1: { cellWidth: 24, halign: 'center' },
                2: { cellWidth: 28, halign: 'right' },
                3: { cellWidth: 25, halign: 'right' },
                4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
                5: { cellWidth: 18, halign: 'center' },
                6: { cellWidth: 17, halign: 'center' }
            }
        });

        currentY = doc.lastAutoTable.finalY + 8;

        if (currentY + 35 > doc.internal.pageSize.height) {
            doc.addPage();
            currentY = 20;
        }

        doc.setFont(fontName, 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text('2. Revenue by Payment Channel', 14, currentY);
        currentY += 3;

        const payRows = Object.entries(data.paymentMethods).map(([channel, amt]) => {
            const pct = data.totalSales > 0 ? ((amt / data.totalSales) * 100).toFixed(1) : '0.0';
            return [channel.toUpperCase(), formatMoney(amt), `${pct}%`];
        });

        doc.autoTable({
            ...theme,
            startY: currentY,
            head: [['Payment Channel / Method', 'Total Collected', 'Percentage of Total Revenue']],
            body: payRows.length ? payRows : [['Cash', formatMoney(0), '0.0%']],
            columnStyles: {
                0: { cellWidth: 70 },
                1: { cellWidth: 55, halign: 'right', fontStyle: 'bold' },
                2: { cellWidth: 57, halign: 'center' }
            }
        });

        currentY = doc.lastAutoTable.finalY + 8;
    }

    // 5. BRANCH PERFORMANCE
    if (category === 'branch_performance' || category === 'consolidated_full') {
        if (category === 'consolidated_full') {
            doc.addPage();
            currentY = 20;
        }

        doc.setFont(fontName, 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text('Branch Operations, Manager Output & Scorecard', 14, currentY);
        currentY += 3;

        const branchRows = data.branchPerformance.map(b => [
            b.name,
            b.operatingAge || b.openingDateFormatted,
            b.managerName,
            b.transactionsCount.toString(),
            formatMoney(b.avgTicket),
            `${b.completedTasks} / ${b.totalTasks} (${b.taskCompletionRate}%)`,
            formatMoney(b.revenue)
        ]);

        doc.autoTable({
            ...theme,
            startY: currentY,
            head: [['Branch Location', 'Operating Span', 'Branch Manager', 'Trans.', 'Avg Ticket', 'Task Completion', 'Total Sales']],
            body: branchRows.length ? branchRows : [['—', '—', 'No branch records', '—', '—', '—', '—']],
            columnStyles: {
                0: { cellWidth: 36 },
                1: { cellWidth: 26, halign: 'center' },
                2: { cellWidth: 30 },
                3: { cellWidth: 16, halign: 'center' },
                4: { cellWidth: 24, halign: 'right' },
                5: { cellWidth: 26, halign: 'center' },
                6: { cellWidth: 24, halign: 'right', fontStyle: 'bold' }
            }
        });

        currentY = doc.lastAutoTable.finalY + 8;
    }

    // 6. STOCK PURCHASES
    if (category === 'stock_flow' || category === 'stock_purchases' || category === 'consolidated_full') {
        if (category === 'consolidated_full') {
            doc.addPage();
            currentY = 20;
        }

        doc.setFont(fontName, 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text('Central Main Store Purchases & Restocks (Traceable Supplier Intake)', 14, currentY);
        currentY += 3;

        const purchaseRows = data.purchasesList.slice(0, 25).map(p => [
            formatDate(p.created_at),
            p.item_name || 'Stock Item',
            p.notes || 'Central Supplier Intake',
            formatNumber(p.quantity),
            formatMoney(p.cost_price),
            formatMoney(p.total_cost || ((p.cost_price || 0) * (p.quantity || 0)))
        ]);

        doc.autoTable({
            ...theme,
            startY: currentY,
            head: [['Date', 'Product / Item Name', 'Source / Notes', 'Qty Bought', 'Unit Cost', 'Total Cost Value']],
            body: purchaseRows.length ? purchaseRows : [['—', 'No purchase records in this period', '—', '—', '—', '—']],
            columnStyles: {
                0: { cellWidth: 22, halign: 'center' },
                1: { cellWidth: 50 },
                2: { cellWidth: 40 },
                3: { cellWidth: 20, halign: 'center' },
                4: { cellWidth: 25, halign: 'right' },
                5: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
            }
        });

        currentY = doc.lastAutoTable.finalY + 8;
    }

    // 7. STOCK DISPATCHES
    if (category === 'stock_flow' || category === 'stock_dispatches' || category === 'consolidated_full') {
        if (currentY + 40 > doc.internal.pageSize.height) {
            doc.addPage();
            currentY = 20;
        }

        doc.setFont(fontName, 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text('Stock Dispatches (Flow from Main Store -> Destination Branches)', 14, currentY);
        currentY += 3;

        const dispatchRows = data.dispatchesList.slice(0, 25).map(d => {
            const destBranch = data.branchMap.get(d.destination_branch_id || d.branch_id)?.name || 'Branch';
            return [
                formatDate(d.created_at),
                d.item_name || 'Dispatched Item',
                `Main Store → ${destBranch}`,
                formatNumber(d.quantity),
                formatMoney(d.retail_price || d.price),
                formatMoney(d.total_selling || ((d.retail_price || 0) * (d.quantity || 0)))
            ];
        });

        doc.autoTable({
            ...theme,
            startY: currentY,
            head: [['Date', 'Product Name', 'Dispatch Route', 'Qty Dispatched', 'Retail Price', 'Expected Sales Value']],
            body: dispatchRows.length ? dispatchRows : [['—', 'No stock dispatches in this period', '—', '—', '—', '—']],
            columnStyles: {
                0: { cellWidth: 22, halign: 'center' },
                1: { cellWidth: 50 },
                2: { cellWidth: 40 },
                3: { cellWidth: 20, halign: 'center' },
                4: { cellWidth: 25, halign: 'right' },
                5: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
            }
        });

        currentY = doc.lastAutoTable.finalY + 8;
    }

    // 8. BEST SELLERS
    if (category === 'stock_flow' || category === 'best_sellers' || category === 'consolidated_full') {
        if (currentY + 40 > doc.internal.pageSize.height) {
            doc.addPage();
            currentY = 20;
        }

        doc.setFont(fontName, 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text('Top Performing Stock Catalogs (Sales Volume & Revenue Drivers)', 14, currentY);
        currentY += 3;

        const sellerRows = data.bestSellers.slice(0, 20).map((s, idx) => [
            `${idx + 1}. ${s.name}`,
            s.sku || '—',
            formatNumber(s.quantitySold),
            formatMoney(s.revenue),
            formatMoney(s.revenue - s.cost)
        ]);

        doc.autoTable({
            ...theme,
            startY: currentY,
            head: [['Product Catalog', 'SKU Code', 'Units Sold', 'Total Revenue Generated', 'Estimated Gross Profit']],
            body: sellerRows.length ? sellerRows : [['—', 'No sales in this timeframe', '—', '—', '—']],
            columnStyles: {
                0: { cellWidth: 60 },
                1: { cellWidth: 30, halign: 'center' },
                2: { cellWidth: 24, halign: 'center' },
                3: { cellWidth: 34, halign: 'right' },
                4: { cellWidth: 34, halign: 'right', fontStyle: 'bold' }
            }
        });

        currentY = doc.lastAutoTable.finalY + 8;
    }

    // 9. SALES & INVOICES
    if (category === 'sales' || category === 'sales_invoices' || (category === 'consolidated_full' && currentY + 30 > doc.internal.pageSize.height)) {
        if (category === 'consolidated_full') {
            doc.addPage();
            currentY = 20;
        }

        doc.setFont(fontName, 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text('Customer Sales, Invoicing & Transactions Audit Log', 14, currentY);
        currentY += 3;

        const isBranchScoped = data.scope === 'branch' || (params?.branchId && params.branchId !== 'all') || data.isSingleBranch;

        let salesHead;
        let salesBody;
        let salesColStyles;

        if (isBranchScoped) {
            salesHead = [['Date / Time', 'Customer / Entity', 'Items / Products Sold', 'In stock', 'Qty', 'Unit Price', 'Total Sales Price']];
            salesColStyles = {
                0: { cellWidth: 24, halign: 'center' },
                1: { cellWidth: 32 },
                2: { cellWidth: 50 },
                3: { cellWidth: 16, halign: 'center' },
                4: { cellWidth: 12, halign: 'center' },
                5: { cellWidth: 24, halign: 'right' },
                6: { cellWidth: 24, halign: 'right', fontStyle: 'bold' }
            };
            salesBody = data.sales.flatMap(s => {
                const lineItems = s._unpackedLineItems || extractSaleLineItems(s, data.branchInventory || [], data.centralItems || []);
                const timeStr = s.created_at ? new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                const dateDisplay = `${formatDate(s.created_at)}${timeStr ? ` ${timeStr}` : ''}`;
                const customerDisplay = s.customer_name || s.customer || 'Walk-in Customer';

                return lineItems.map(item => {
                    const pType = (item.price_type || s.price_type || 'retail').toLowerCase();
                    const pBadge = pType === 'wholesale' ? ' (Wholesale)' : pType === 'custom' ? ' (Custom)' : '';
                    const itemNameDisplay = `${item.name}${pBadge}`;
                    const inStockDisplay = item.isService ? '—' : (typeof item.inStock === 'number' ? `${item.inStock} units` : (item.inStock || '—'));
                    const priceTypeStr = pType === 'wholesale' ? 'Wholesale' : pType === 'custom' ? 'Custom' : 'Retail';
                    const unitPriceDisplay = `${formatMoney(item.unit_price)}\n[${priceTypeStr}]`;

                    return [
                        dateDisplay,
                        customerDisplay,
                        itemNameDisplay,
                        inStockDisplay,
                        (item.qty || 1).toString(),
                        unitPriceDisplay,
                        formatMoney(item.total_price)
                    ];
                });
            }).slice(0, 80);
        } else {
            salesHead = [['Date', 'Branch', 'Customer / Entity', 'Method / Price Type', 'Status', 'Transaction Amount']];
            salesColStyles = {
                0: { cellWidth: 22, halign: 'center' },
                1: { cellWidth: 32 },
                2: { cellWidth: 48 },
                3: { cellWidth: 30, halign: 'center' },
                4: { cellWidth: 22, halign: 'center' },
                5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }
            };
            salesBody = data.sales.slice(0, 30).map(s => {
                const bName = data.branchMap.get(s.branch_id)?.name || 'Store';
                const rawItemsStr = (typeof s.items === 'string' ? s.items : JSON.stringify(s.items || '')).toLowerCase();
                let priceType = (s.price_type || '').toLowerCase();
                if (!['wholesale', 'custom', 'retail'].includes(priceType)) {
                    if (rawItemsStr.includes('wholesale') || rawItemsStr.includes('(wholesale)') || rawItemsStr.includes('[wholesale]')) {
                        priceType = 'wholesale';
                    } else if (rawItemsStr.includes('custom') || rawItemsStr.includes('(custom)') || rawItemsStr.includes('[custom]')) {
                        priceType = 'custom';
                    } else {
                        priceType = 'retail';
                    }
                }
                const priceTypeStr = priceType === 'wholesale' ? 'Wholesale' : priceType === 'custom' ? 'Custom' : 'Retail';
                return [
                    formatDate(s.created_at),
                    bName,
                    s.customer_name || 'Walk-in Customer',
                    `${(s.payment_method || s.payment || 'Cash').toUpperCase()}\n[${priceTypeStr}]`,
                    s.status || 'Completed',
                    formatMoney(s.amount)
                ];
            });
        }

        let totalSalesQty = 0;
        let totalSalesSum = 0;
        data.sales.forEach(s => {
            const lineItems = s._unpackedLineItems || extractSaleLineItems(s, data.branchInventory || [], data.centralItems || []);
            const q = lineItems.reduce((sum, it) => sum + (Number(it.qty) || 1), 0);
            totalSalesQty += q;
            totalSalesSum += (Number(s.amount) || 0);
        });

        const salesFoot = isBranchScoped
            ? [['TOTAL', '', `${data.sales.length} Transactions`, '', totalSalesQty.toString(), '', formatMoney(data.totalSales || totalSalesSum)]]
            : [['TOTAL', '', `${data.sales.length} Transactions`, '', '', formatMoney(data.totalSales || totalSalesSum)]];

        doc.autoTable({
            ...theme,
            startY: currentY,
            head: salesHead,
            body: salesBody.length ? salesBody : [['—', 'No sales transactions in this period', '—', '—', '—', '—', '—']],
            foot: salesBody.length ? salesFoot : undefined,
            footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7.5 },
            columnStyles: salesColStyles
        });

        currentY = doc.lastAutoTable.finalY + 8;

        if (category === 'sales' || category === 'sales_invoices') {
            // 9.1. MINI STOCK ANALYSIS (ITEMS SOLD IN PERIOD)
            if (currentY + 40 > doc.internal.pageSize.height) {
                doc.addPage();
                currentY = 20;
            }

            doc.setFont(fontName, 'bold');
            doc.setFontSize(10);
            doc.setTextColor(30, 41, 59);
            doc.text('Mini Stock Analysis (Items Sold in Period)', 14, currentY);
            currentY += 3;

            const miniStockRows = (data.miniStockAnalysis || []).map(m => [
                m.name,
                `${m.soldCount.toLocaleString()} units`,
                formatMoney(m.soldStockValue),
                m.isService ? '— (Service)' : `${m.currentCount.toLocaleString()} units`,
                m.isService ? '—' : formatMoney(m.currentStockValue)
            ]);

            const miniStockFoot = [
                ['TOTAL', `${(data.miniStockTotals?.totalSoldCount || 0).toLocaleString()} units`, formatMoney(data.miniStockTotals?.totalSoldStockValue || 0), `${(data.miniStockTotals?.totalCurrentCount || 0).toLocaleString()} units`, formatMoney(data.miniStockTotals?.totalCurrentStockValue || 0)]
            ];

            doc.autoTable({
                ...theme,
                startY: currentY,
                head: [['Product Name', 'Sold Item Count', 'Sold Stock Value', 'Current Item Count', 'Current Stock Value']],
                body: miniStockRows.length ? miniStockRows : [['—', '0 units', formatMoney(0), '0 units', formatMoney(0)]],
                foot: miniStockRows.length ? miniStockFoot : undefined,
                footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7.5 },
                columnStyles: {
                    0: { cellWidth: 56 },
                    1: { cellWidth: 28, halign: 'center' },
                    2: { cellWidth: 34, halign: 'right', fontStyle: 'bold' },
                    3: { cellWidth: 28, halign: 'center' },
                    4: { cellWidth: 36, halign: 'right', fontStyle: 'bold' }
                }
            });

            currentY = doc.lastAutoTable.finalY + 8;

            // 9.2. COST OF GOODS SOLD (COGS) & STOCK DEPLETION BREAKDOWN
            if (currentY + 40 > doc.internal.pageSize.height) {
                doc.addPage();
                currentY = 20;
            }

            doc.setFont(fontName, 'bold');
            doc.setFontSize(10);
            doc.setTextColor(30, 41, 59);
            doc.text('Cost of Goods Sold (COGS) & Stock Usage Analysis', 14, currentY);
            currentY += 3;

            const cogsRows = (data.cogsProductBreakdown || []).slice(0, 35).map(c => [
                c.name,
                c.sku || '—',
                `${c.unitsSold.toLocaleString()}x`,
                formatMoney(c.costPrice || 0),
                formatMoney(c.totalCogs),
                formatMoney(c.revenue),
                formatMoney(c.grossProfit),
                `${c.marginPct}%`
            ]);

            const cogsFoot = [
                ['TOTAL COGS / USED STOCK', '', `${data.totalUnitsSold.toLocaleString()} units`, '', formatMoney(data.totalCogs), formatMoney(data.totalSales), formatMoney(data.grossProfit), `${data.totalSales > 0 ? ((data.grossProfit / data.totalSales) * 100).toFixed(1) : '0.0'}%`]
            ];

            doc.autoTable({
                ...theme,
                startY: currentY,
                head: [['Product / Stock Item', 'SKU', 'Units Sold', 'Unit Cost', 'Total COGS', 'Sales Revenue', 'Gross Margin', 'Margin %']],
                body: cogsRows.length ? cogsRows : [['—', '—', '0 units', formatMoney(0), formatMoney(0), formatMoney(0), formatMoney(0), '0.0%']],
                foot: cogsRows.length ? cogsFoot : undefined,
                footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7.5 },
                columnStyles: {
                    0: { cellWidth: 42 },
                    1: { cellWidth: 20, halign: 'center' },
                    2: { cellWidth: 18, halign: 'center' },
                    3: { cellWidth: 20, halign: 'right' },
                    4: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
                    5: { cellWidth: 22, halign: 'right' },
                    6: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
                    7: { cellWidth: 16, halign: 'center' }
                }
            });

            currentY = doc.lastAutoTable.finalY + 8;

            // 9.3. OPERATIONAL EXPENSES BREAKDOWN FOR PERIOD
            if (currentY + 40 > doc.internal.pageSize.height) {
                doc.addPage();
                currentY = 20;
            }

            doc.setFont(fontName, 'bold');
            doc.setFontSize(10);
            doc.setTextColor(30, 41, 59);
            doc.text('Operational Expenses Breakdown for Period', 14, currentY);
            currentY += 3;

            const expenseRows = (data.expenseCategoryBreakdown || []).map(e => [
                e.category.toUpperCase(),
                `${e.count} vouchers`,
                formatMoney(e.totalSpent),
                `${e.sharePct}%`
            ]);

            const expenseFoot = [
                ['TOTAL OPERATIONAL EXPENSES', `${data.expenses.length} records`, formatMoney(data.totalExpenses), '100.0%']
            ];

            doc.autoTable({
                ...theme,
                startY: currentY,
                head: [['Expense Category', 'Voucher Count', 'Total Spent', '% Share of Expenses']],
                body: expenseRows.length ? expenseRows : [['General', '0 vouchers', formatMoney(0), '0.0%']],
                foot: expenseRows.length ? expenseFoot : undefined,
                footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7.5 },
                columnStyles: {
                    0: { cellWidth: 65 },
                    1: { cellWidth: 35, halign: 'center' },
                    2: { cellWidth: 45, halign: 'right', fontStyle: 'bold' },
                    3: { cellWidth: 37, halign: 'center' }
                }
            });

            currentY = doc.lastAutoTable.finalY + 8;

            // 9.4. REVENUE COLLECTED BY PAYMENT CHANNEL
            if (currentY + 35 > doc.internal.pageSize.height) {
                doc.addPage();
                currentY = 20;
            }

            doc.setFont(fontName, 'bold');
            doc.setFontSize(10);
            doc.setTextColor(30, 41, 59);
            doc.text('Revenue Collected by Payment Channel', 14, currentY);
            currentY += 3;

            const payRows = Object.entries(data.paymentMethods).map(([channel, amt]) => {
                const pct = data.totalSales > 0 ? ((amt / data.totalSales) * 100).toFixed(1) : '0.0';
                return [channel.toUpperCase(), formatMoney(amt), `${pct}%`];
            });

            doc.autoTable({
                ...theme,
                startY: currentY,
                head: [['Payment Channel / Method', 'Total Collected', 'Percentage of Total Revenue']],
                body: payRows.length ? payRows : [['Cash', formatMoney(0), '0.0%']],
                foot: payRows.length ? [['TOTAL', formatMoney(data.totalSales), '100.0%']] : undefined,
                footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 7.5 },
                columnStyles: {
                    0: { cellWidth: 70 },
                    1: { cellWidth: 55, halign: 'right', fontStyle: 'bold' },
                    2: { cellWidth: 57, halign: 'center' }
                }
            });

            currentY = doc.lastAutoTable.finalY + 8;
        }
    }

    // 10. RETURNS & REFUNDS
    if (category === 'returns_refunds') {
        doc.setFont(fontName, 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text('Product Returns & Refund Ledger', 14, currentY);
        currentY += 3;

        const returnRows = data.returns.slice(0, 30).map(r => [
            formatDate(r.created_at),
            data.branchMap.get(r.branch_id)?.name || 'Branch',
            r.item_name || 'Returned Item',
            r.quantity?.toString() || '1',
            r.reason || 'Not specified',
            formatMoney(r.return_amount || r.amount_refunded)
        ]);

        doc.autoTable({
            ...theme,
            startY: currentY,
            head: [['Date', 'Branch', 'Returned Item', 'Qty', 'Return Reason', 'Refunded Amount']],
            body: returnRows.length ? returnRows : [['—', 'No returns recorded in this period', '—', '—', '—', '—']],
            columnStyles: {
                0: { cellWidth: 22, halign: 'center' },
                1: { cellWidth: 35 },
                2: { cellWidth: 50 },
                3: { cellWidth: 15, halign: 'center' },
                4: { cellWidth: 35 },
                5: { cellWidth: 25, halign: 'right', fontStyle: 'bold' }
            }
        });

        currentY = doc.lastAutoTable.finalY + 8;
    }

    // 11. STAFF PRODUCTIVITY
    if (category === 'staff_productivity') {
        doc.setFont(fontName, 'bold');
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.text('Staff Productivity & Cashier Sales Performance', 14, currentY);
        currentY += 3;

        const staffRows = data.staffPerformance.map((st, idx) => [
            `${idx + 1}. ${st.name}`,
            st.branchName,
            st.transactions.toString(),
            formatMoney(st.totalSales),
            formatMoney(st.transactions > 0 ? st.totalSales / st.transactions : 0)
        ]);

        doc.autoTable({
            ...theme,
            startY: currentY,
            head: [['Staff / Cashier Name', 'Assigned Branch', 'Sales Count', 'Total Volume Handled', 'Average Transaction Size']],
            body: staffRows.length ? staffRows : [['—', 'No staff transactions recorded', '—', '—', '—']],
            columnStyles: {
                0: { cellWidth: 45 },
                1: { cellWidth: 40 },
                2: { cellWidth: 25, halign: 'center' },
                3: { cellWidth: 36, halign: 'right', fontStyle: 'bold' },
                4: { cellWidth: 36, halign: 'right' }
            }
        });

        currentY = doc.lastAutoTable.finalY + 8;
    }

    applyPdfFooter(doc);

    const filename = `bms_${category}_report_${data.startDate || 'all'}_to_${data.endDate || 'now'}.pdf`;
    doc.save(filename);
    return filename;
}

/**
 * Universal CSV Export Engine for all specific categories
 */
export async function exportReportCsv(category, params) {
    const data = await fetchReportData(params);
    let rows = [];
    let headers = [];

    if (category === 'expenses') {
        headers = ['Date', 'Branch', 'Category', 'Description', 'Amount'];
        rows = data.expenses.map(e => [
            `"${formatDate(e.created_at)}"`,
            `"${data.branchMap.get(e.branch_id)?.name || 'Branch'}"`,
            `"${e.category || 'General'}"`,
            `"${e.description || ''}"`,
            e.amount
        ]);
    } else if (category === 'inventory' || category === 'stock_inventory') {
        headers = ['SKU', 'Item Name', 'Category', 'Branch', 'Quantity On Hand', 'Min Threshold', 'Unit Price', 'Total Valuation'];
        rows = data.branchInventory.map(i => [
            `"${i.sku || '—'}"`,
            `"${i.name}"`,
            `"${i.category || 'General'}"`,
            `"${data.branchMap.get(i.branch_id)?.name || 'Branch'}"`,
            i.quantity,
            i.min_threshold || 5,
            i.retail_price || i.price || 0,
            (Number(i.quantity) || 0) * (Number(i.retail_price || i.price) || 0)
        ]);
    } else if (category === 'low_stock') {
        headers = ['SKU Code', 'Product / Item Name', 'Category', 'Current On-Hand', 'Safety Min Level', 'Shortage Deficit', 'Unit Cost Price', 'Est. Restock Cost', 'Status'];
        rows = (data.lowStockItems || []).map(i => [
            `"${i.sku || '—'}"`,
            `"${(i.name || 'Unnamed Item').replace(/"/g, '""')}"`,
            `"${(i.category || 'General').replace(/"/g, '""')}"`,
            i.currentQty,
            i.threshold,
            i.deficit,
            i.costPrice,
            i.estRestockCost,
            `"${i.currentQty <= 0 ? 'OUT OF STOCK' : 'LOW STOCK'}"`
        ]);
    } else if (category === 'loans') {
        headers = ['Date', 'Branch', 'Borrower / Party', 'Type', 'Principal Amount', 'Repaid Amount', 'Remaining Balance', 'Notes'];
        rows = (data.loans || []).map(l => [
            `"${formatDate(l.created_at)}"`,
            `"${data.branchMap.get(l.branch_id)?.name || 'Branch'}"`,
            `"${l.party || l.borrower_name || '—'}"`,
            `"${l.type || 'Loan'}"`,
            l.amount,
            l.repaid_amount || l.amount_paid || 0,
            (Number(l.amount) || 0) - (Number(l.repaid_amount || l.amount_paid) || 0),
            `"${l.notes || ''}"`
        ]);
    } else if (category === 'financial_pl' || category === 'branch_performance') {
        headers = ['Branch Name', 'Opening Date', 'Location', 'Gross Revenue', 'Expenses', 'Net Profit', 'Profit Margin %', 'Transactions Count', 'Avg Ticket'];
        rows = data.branchPerformance.map(b => [
            `"${b.name}"`,
            `"${b.openingDateFormatted}"`,
            `"${b.location}"`,
            b.revenue,
            b.expenses,
            b.profit,
            `"${b.profitMargin}%"`,
            b.transactionsCount,
            b.avgTicket
        ]);
    } else if (category === 'stock_flow' || category === 'best_sellers') {
        headers = ['Product Name', 'SKU', 'Units Sold', 'Revenue Generated', 'Cost Price Value', 'Gross Profit'];
        rows = data.bestSellers.map(s => [
            `"${s.name}"`,
            `"${s.sku}"`,
            s.quantitySold,
            s.revenue,
            s.cost,
            s.revenue - s.cost
        ]);
    } else if (category === 'stock_purchases') {
        headers = ['Date', 'Item Name', 'Supplier / Notes', 'Quantity', 'Cost Price', 'Total Cost'];
        rows = data.purchasesList.map(p => [
            `"${formatDate(p.created_at)}"`,
            `"${p.item_name}"`,
            `"${p.notes || ''}"`,
            p.quantity,
            p.cost_price,
            p.total_cost || ((p.cost_price || 0) * (p.quantity || 0))
        ]);
    } else if (category === 'stock_dispatches') {
        headers = ['Date', 'Item Name', 'Destination Branch', 'Quantity', 'Retail Price', 'Total Retail Value'];
        rows = data.dispatchesList.map(d => [
            `"${formatDate(d.created_at)}"`,
            `"${d.item_name}"`,
            `"${data.branchMap.get(d.destination_branch_id || d.branch_id)?.name || 'Branch'}"`,
            d.quantity,
            d.retail_price || d.price,
            d.total_selling || ((d.retail_price || 0) * (d.quantity || 0))
        ]);
    } else if (category === 'returns_refunds') {
        headers = ['Date', 'Branch', 'Item Name', 'Quantity', 'Reason', 'Refund Amount'];
        rows = data.returns.map(r => [
            `"${formatDate(r.created_at)}"`,
            `"${data.branchMap.get(r.branch_id)?.name || 'Branch'}"`,
            `"${r.item_name}"`,
            r.quantity,
            `"${r.reason || ''}"`,
            r.return_amount || r.amount_refunded || 0
        ]);
    } else if (category === 'staff_productivity') {
        headers = ['Staff Name', 'Branch', 'Sales Transactions', 'Total Sales Handled', 'Average Ticket'];
        rows = data.staffPerformance.map(st => [
            `"${st.name}"`,
            `"${st.branchName}"`,
            st.transactions,
            st.totalSales,
            st.transactions > 0 ? st.totalSales / st.transactions : 0
        ]);
    } else {
        const isBranchScoped = data.scope === 'branch' || (params?.branchId && params.branchId !== 'all') || data.isSingleBranch;
        if (isBranchScoped) {
            headers = ['Date & Time', 'Receipt #', 'Customer Name', 'Items / Products Sold', 'Total Quantity', 'Unit Price', 'Total Sales Revenue'];
            rows = data.sales.map(s => {
                let saleItems = [];
                if (Array.isArray(s.items)) {
                    saleItems = s.items;
                } else if (typeof s.items === 'string') {
                    try {
                        const parsed = JSON.parse(s.items);
                        saleItems = Array.isArray(parsed) ? parsed : [parsed];
                    } catch {
                        saleItems = [{ name: s.items, qty: Number(s.quantity) || 1, price: Number(s.amount) || 0 }];
                    }
                } else if (s.item_name || s.product_name) {
                    saleItems = [{ name: s.item_name || s.product_name, qty: Number(s.quantity) || 1, price: Number(s.amount) || 0 }];
                }

                const totalQty = saleItems.reduce((sum, it) => sum + (Number(it.qty || it.quantity) || 1), 0);
                const firstItem = saleItems[0];
                const unitPrice = firstItem ? Number(firstItem.price || firstItem.unit_price || s.amount) : Number(s.amount);

                const itemsSummary = saleItems.length > 0
                    ? saleItems.map(it => `${it.name || it.item_name || 'Product'} (${it.qty || it.quantity || 1}x)`).join('; ')
                    : (s.item_name || 'Retail Item');

                const timeStr = s.created_at ? new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                const dateDisplay = `${formatDate(s.created_at)}${timeStr ? ` ${timeStr}` : ''}`;

                return [
                    `"${dateDisplay}"`,
                    `"${s.receipt_number || s.invoice_number || '—'}"`,
                    `"${s.customer_name || 'Walk-in Customer'}"`,
                    `"${itemsSummary.replace(/"/g, '""')}"`,
                    totalQty,
                    unitPrice,
                    s.amount
                ];
            });
        } else {
            headers = ['Date', 'Branch', 'Customer', 'Payment Method', 'Status', 'Amount'];
            rows = data.sales.map(s => [
                `"${formatDate(s.created_at)}"`,
                `"${data.branchMap.get(s.branch_id)?.name || 'Main'}"`,
                `"${s.customer_name || 'Walk-in'}"`,
                `"${s.payment_method || s.payment || 'Cash'}"`,
                `"${s.status || 'Completed'}"`,
                s.amount
            ]);
        }
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bms_${category}_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

if (typeof window !== 'undefined') {
    window.exportReportPdf = exportReportPdf;
    window.exportReportCsv = exportReportCsv;
    window.fetchReportData = fetchReportData;
    window.AVAILABLE_REPORT_TYPES = AVAILABLE_REPORT_TYPES;
}
