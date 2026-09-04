import { supabase, dbBranches, dbCentralInventory, dbStockMovements } from '../db.js';

/**
 * Clean & Minimalist Enterprise PDF & Data Export Engine
 * Supports Owner (Consolidated & Multi-Branch) and Branch reporting scopes.
 */

export const AVAILABLE_REPORT_TYPES = [
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
        id: 'sales_invoices',
        name: 'Sales Transactions & Invoicing Audit',
        category: 'sales',
        badge: 'Sales',
        icon: 'receipt',
        description: 'Audited log of sales receipts, customer details, payment channels, invoice completion status, and cash flow.'
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
 * Fetch and aggregate complete data for reports
 */
export async function fetchReportData({ scope = 'owner', ownerId, branchId = 'all', startDate, endDate }) {
    const startIso = startDate ? (startDate.includes('T') ? startDate : `${startDate}T00:00:00`) : '1970-01-01T00:00:00';
    const endIso = endDate ? (endDate.includes('T') ? endDate : `${endDate}T23:59:59`) : '2099-12-31T23:59:59';

    // 1. Fetch Branches
    let branches = [];
    try {
        if (scope === 'branch' && window.state?.branchProfile) {
            branches = [window.state.branchProfile];
        } else {
            branches = await dbBranches.fetchAll(ownerId || window.state?.ownerId);
            if ((!branches || !branches.length) && window.state?.branchProfile) {
                branches = [window.state.branchProfile];
            }
        }
    } catch (e) {
        console.warn('Failed to fetch branches:', e);
        if (window.state?.branchProfile) branches = [window.state.branchProfile];
    }

    const branchMap = new Map();
    (branches || []).forEach(b => { if (b && b.id) branchMap.set(b.id, b); });

    const selectedBranch = branchId !== 'all' ? branchMap.get(branchId) : null;
    const targetBranchIds = branchId !== 'all' ? [branchId] : (branches.map(b => b.id).length ? branches.map(b => b.id) : ['00000000-0000-0000-0000-000000000000']);

    // 2. Fetch Sales
    let sales = [];
    try {
        let salesQuery = supabase
            .from('sales')
            .select('*')
            .gte('created_at', startIso)
            .lte('created_at', endIso)
            .order('created_at', { ascending: false });

        if (branchId !== 'all') {
            salesQuery = salesQuery.eq('branch_id', branchId);
        } else if (targetBranchIds.length > 0) {
            salesQuery = salesQuery.in('branch_id', targetBranchIds);
        }

        const { data: salesRaw } = await salesQuery;
        sales = salesRaw || [];
    } catch (e) {
        console.warn('Sales fetch failed:', e);
        sales = [];
    }

    // 3. Fetch Expenses
    let expenses = [];
    try {
        let expQuery = supabase
            .from('expenses')
            .select('*')
            .gte('created_at', startIso)
            .lte('created_at', endIso)
            .order('created_at', { ascending: false });

        if (branchId !== 'all') {
            expQuery = expQuery.eq('branch_id', branchId);
        } else if (targetBranchIds.length > 0) {
            expQuery = expQuery.in('branch_id', targetBranchIds);
        }

        const { data: expensesRaw } = await expQuery;
        expenses = expensesRaw || [];
    } catch (e) {
        console.warn('Expenses fetch failed:', e);
        expenses = [];
    }

    // 4. Fetch Returns (product_returns table)
    let returns = [];
    try {
        let returnsQuery = supabase
            .from('product_returns')
            .select('*')
            .gte('created_at', startIso)
            .lte('created_at', endIso)
            .order('created_at', { ascending: false });

        if (branchId !== 'all') {
            returnsQuery = returnsQuery.eq('branch_id', branchId);
        } else if (targetBranchIds.length > 0) {
            returnsQuery = returnsQuery.in('branch_id', targetBranchIds);
        }

        const { data: returnsRaw } = await returnsQuery;
        returns = returnsRaw || [];
    } catch (e) {
        console.warn('Product returns fetch failed or table not found:', e);
        returns = [];
    }

    // 5. Fetch Central Inventory & Branch Inventory
    let centralItems = [];
    try {
        centralItems = await dbCentralInventory.fetchAll(ownerId || window.state?.ownerId);
    } catch (e) {
        console.warn('Central inventory fetch failed:', e);
        centralItems = [];
    }

    let branchInventory = [];
    try {
        let branchInventoryQuery = supabase
            .from('inventory')
            .select('*')
            .order('name', { ascending: true });

        if (branchId !== 'all') {
            branchInventoryQuery = branchInventoryQuery.eq('branch_id', branchId);
        } else if (targetBranchIds.length > 0) {
            branchInventoryQuery = branchInventoryQuery.in('branch_id', targetBranchIds);
        }

        const { data: branchInventoryRaw } = await branchInventoryQuery;
        branchInventory = branchInventoryRaw || [];
    } catch (e) {
        console.warn('Branch inventory fetch failed:', e);
        branchInventory = [];
    }

    // 6. Fetch Stock Movements (Audit Trail)
    let movements = [];
    try {
        movements = await dbStockMovements.fetchAll(ownerId || window.state?.ownerId, { limit: 1000 });
        movements = (movements || []).filter(m => {
            const d = m.created_at;
            const inDate = d >= startIso && d <= endIso;
            if (!inDate) return false;
            if (branchId === 'all') return true;
            return m.branch_id === branchId || m.source_branch_id === branchId || m.destination_branch_id === branchId;
        });
    } catch (e) {
        console.warn('Stock movements fetch failed:', e);
        movements = [];
    }

    // 7. Fetch Staff / Shifts
    let shifts = [];
    try {
        let shiftsQuery = supabase
            .from('shifts')
            .select('*')
            .gte('created_at', startIso)
            .lte('created_at', endIso)
            .order('created_at', { ascending: false });

        if (branchId !== 'all') {
            shiftsQuery = shiftsQuery.eq('branch_id', branchId);
        } else if (targetBranchIds.length > 0) {
            shiftsQuery = shiftsQuery.in('branch_id', targetBranchIds);
        }

        const { data: shiftsRaw } = await shiftsQuery;
        shifts = shiftsRaw || [];
    } catch (e) {
        console.warn('Shifts fetch failed:', e);
        shifts = [];
    }

    // 8. Fetch Tasks
    let tasks = [];
    try {
        let tasksQuery = supabase
            .from('tasks')
            .select('*')
            .gte('created_at', startIso)
            .lte('created_at', endIso);

        if (branchId !== 'all') {
            tasksQuery = tasksQuery.eq('branch_id', branchId);
        } else if (targetBranchIds.length > 0) {
            tasksQuery = tasksQuery.in('branch_id', targetBranchIds);
        }

        const { data: tasksRaw } = await tasksQuery;
        tasks = tasksRaw || [];
    } catch (e) {
        console.warn('Tasks fetch failed:', e);
        tasks = [];
    }

    // Calculate Core Metrics
    const totalSales = sales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalRefunds = returns.reduce((sum, r) => sum + (Number(r.return_amount || r.amount_refunded) || 0), 0);
    const netProfit = totalSales - totalExpenses - totalRefunds;
    const profitMargin = totalSales > 0 ? ((netProfit / totalSales) * 100).toFixed(1) : '0.0';

    // Inventory Valuation
    const mainStoreValuation = centralItems.reduce((sum, i) => sum + ((Number(i.cost_price) || 0) * (Number(i.main_store_stock) || 0)), 0);
    const branchStockValuation = branchInventory.reduce((sum, i) => sum + ((Number(i.cost_price) || Number(i.price) || 0) * (Number(i.quantity) || 0)), 0);
    const totalInventoryValuation = mainStoreValuation + branchStockValuation;

    // Payment Methods aggregation
    const paymentMethods = {};
    sales.forEach(s => {
        const pm = (s.payment_method || s.payment || 'Cash').toLowerCase();
        paymentMethods[pm] = (paymentMethods[pm] || 0) + (Number(s.amount) || 0);
    });

    // Best Selling Products aggregation
    const productSalesMap = {};
    sales.forEach(s => {
        let items = [];
        if (Array.isArray(s.items)) {
            items = s.items;
        } else if (typeof s.items === 'string' && s.items.trim()) {
            const trimmed = s.items.trim();
            if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    items = Array.isArray(parsed) ? parsed : [parsed];
                } catch (e) {
                    items = [{ name: trimmed, qty: Number(s.quantity) || 1, price: Number(s.amount) || 0, cost_price: 0 }];
                }
            } else {
                items = [{ name: trimmed, qty: Number(s.quantity) || 1, price: Number(s.amount) || 0, cost_price: 0 }];
            }
        } else if (s.item_name || s.product_name) {
            items = [{ name: s.item_name || s.product_name, qty: Number(s.quantity) || 1, price: Number(s.amount) || 0, cost_price: 0 }];
        }

        items.forEach(item => {
            if (!item) return;
            const key = item.name || item.item_name || 'Unnamed Product';
            if (!productSalesMap[key]) {
                productSalesMap[key] = {
                    name: key,
                    sku: item.sku || '—',
                    quantitySold: 0,
                    revenue: 0,
                    cost: 0
                };
            }
            const q = Number(item.qty || item.quantity || 1);
            const p = Number(item.price || item.unit_price || 0);
            const c = Number(item.cost_price || 0);
            productSalesMap[key].quantitySold += q;
            productSalesMap[key].revenue += (q * p);
            productSalesMap[key].cost += (q * c);
        });
    });

    const bestSellers = Object.values(productSalesMap).sort((a, b) => b.revenue - a.revenue);

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
        movements,
        shifts,
        tasks,
        totalSales,
        totalExpenses,
        totalRefunds,
        netProfit,
        profitMargin,
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
 * Render first-glance clean hero header on jsPDF canvas
 */
function renderPdfHero(doc, data, reportTitle, reportCategoryName) {
    const pw = doc.internal.pageSize.width;
    const m = 14;
    const profile = window.state?.profile || {};
    const enterpriseName = (window.state?.enterpriseName || profile.company_name || 'BMS Enterprise').toUpperCase();
    const isSingleBranch = data.branchId !== 'all' && data.selectedBranch;

    const branchOrScopeText = isSingleBranch
        ? `BRANCH: ${data.selectedBranch.name.toUpperCase()}`
        : `CONSOLIDATED AUDIT (${data.branches.length} BRANCHES)`;

    const branchLocation = isSingleBranch
        ? (data.selectedBranch.location || data.selectedBranch.address || 'Headquarters')
        : 'Enterprise Multi-Branch Operations';

    const phone = isSingleBranch ? (data.selectedBranch.phone || profile.phone || '—') : (profile.phone || '—');
    const email = isSingleBranch ? (data.selectedBranch.email || profile.email || '—') : (profile.email || '—');
    const tin = isSingleBranch ? (data.selectedBranch.branch_tin || profile.tax_id || '—') : (profile.tax_id || '—');
    const regNo = isSingleBranch ? (data.selectedBranch.branch_reg_no || '—') : (profile.business_reg_no || '—');

    const fontName = doc.getFontList()?.['Inter'] ? 'Inter' : 'helvetica';

    // 1. Clean Top Header Bar (Subtle Slate Tint)
    doc.setFillColor(248, 250, 252); // #F8FAFC
    doc.rect(0, 0, pw, 38, 'F');

    // Hairline bottom border
    doc.setDrawColor(226, 232, 240); // #E2E8F0
    doc.setLineWidth(0.4);
    doc.line(0, 38, pw, 38);

    // Enterprise Name & Title
    doc.setFont(fontName, 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59); // #1E293B
    doc.text(enterpriseName, m, 14);

    doc.setFont(fontName, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(71, 91, 110); // #475B6E
    doc.text(reportTitle.toUpperCase(), m, 22);

    // Scope Pill / Badge
    doc.setFont(fontName, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(79, 70, 229); // #4F46E5
    doc.text(branchOrScopeText, m, 30);

    // Right-aligned Legal & Contact Metadata
    doc.setFont(fontName, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); // #64748B
    doc.text(`TIN: ${tin}  |  Reg BL: ${regNo}`, pw - m, 12, { align: 'right' });
    doc.text(`${branchLocation}  |  ${phone}`, pw - m, 18, { align: 'right' });
    doc.text(`${email}`, pw - m, 24, { align: 'right' });
    doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, pw - m, 30, { align: 'right' });

    let y = 44;

    // 2. Key Metadata & Dates Sub-Banner
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(m, y, pw - (m * 2), 12, 2, 2, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 91, 110);

    const periodText = `Report Timeframe: ${formatDate(data.startDate)} to ${formatDate(data.endDate)}`;
    doc.text(periodText, m + 4, y + 7.5);

    if (isSingleBranch && data.selectedBranch.created_at) {
        const openedText = `Branch Opened: ${formatDate(data.selectedBranch.created_at)} (${formatAge(data.selectedBranch.created_at)})`;
        doc.text(openedText, pw - m - 4, y + 7.5, { align: 'right' });
    } else {
        doc.text(`Total Active Branches: ${data.branches.length}`, pw - m - 4, y + 7.5, { align: 'right' });
    }

    y += 16;

    // 3. Clean First-Glance KPI Summary Cards Grid (4 boxes)
    const boxW = (pw - (m * 2) - 9) / 4;
    const boxH = 16;

    const cards = [
        { label: 'GROSS REVENUE', val: formatMoney(data.totalSales), sub: `${data.sales.length} transactions` },
        { label: 'TOTAL EXPENSES', val: formatMoney(data.totalExpenses), sub: `${data.expenses.length} records` },
        { label: 'NET PROFIT', val: formatMoney(data.netProfit), sub: `${data.profitMargin}% margin` },
        { label: 'STOCK VALUATION', val: formatMoney(data.totalInventoryValuation), sub: 'Warehouse + Branches' }
    ];

    cards.forEach((c, i) => {
        const bx = m + (i * (boxW + 3));
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(bx, y, boxW, boxH, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(c.label, bx + 3, y + 4.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text(c.val, bx + 3, y + 10);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(148, 163, 184);
        doc.text(c.sub, bx + 3, y + 14);
    });

    return y + boxH + 6;
}

/**
 * Universal AutoTable Theme Config
 */
function getAutoTableTheme(doc = null) {
    const fontName = doc?.getFontList()?.['Inter'] ? 'Inter' : 'helvetica';
    return {
        theme: 'plain',
        styles: {
            font: fontName,
            fontSize: 7.5,
            cellPadding: 2,
            lineColor: [226, 232, 240],
            lineWidth: 0.2,
            textColor: [51, 65, 85],
            valign: 'middle'
        },
        headStyles: {
            font: fontName,
            fillColor: [241, 245, 249], // #F1F5F9 clean slate
            textColor: [30, 41, 59],     // #1E293B
            fontStyle: 'bold',
            fontSize: 7.5,
            lineWidth: 0.3,
            lineColor: [203, 213, 225]
        },
        alternateRowStyles: {
            fillColor: [248, 250, 252]  // #F8FAFC
        },
        margin: { left: 14, right: 14 }
    };
}

/**
 * Dynamic Footer for jsPDF
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
    if (typeof window.ensureInterFont === 'function') {
        await window.ensureInterFont(doc);
    }
    const data = await fetchReportData(params);

    const titles = {
        financial_pl: 'Executive Financial & P&L Statement',
        branch_performance: 'Branch Operations & Performance Scorecard',
        stock_flow: 'Stock Lifecycle, Traceability & Supply Flow Ledger',
        stock_purchases: 'Central Main Store Purchases & Restocks Ledger',
        stock_dispatches: 'Branch Dispatches & Transfer Flow Ledger',
        best_sellers: 'Top Performing Stock Catalogs & Best Sellers',
        sales_invoices: 'Sales Transactions, Invoices & Debts Audit Log',
        returns_refunds: 'Product Returns, Refunds & Condition Audit',
        staff_productivity: 'Staff Attendance, Shifts & Productivity Report',
        consolidated_full: 'Consolidated Master Business Audit Dossier'
    };

    const title = titles[category] || 'Business Performance Report';
    let currentY = renderPdfHero(doc, data, title, category);
    const theme = getAutoTableTheme();

    if (category === 'financial_pl' || category === 'consolidated_full') {
        // Section: P&L Summary Table
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
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

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
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
            body: payRows,
            columnStyles: {
                0: { cellWidth: 70 },
                1: { cellWidth: 55, halign: 'right', fontStyle: 'bold' },
                2: { cellWidth: 57, halign: 'center' }
            }
        });

        currentY = doc.lastAutoTable.finalY + 8;
    }

    if (category === 'branch_performance' || category === 'consolidated_full') {
        if (category === 'consolidated_full') {
            doc.addPage();
            currentY = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
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
            body: branchRows,
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

    if (category === 'stock_flow' || category === 'stock_purchases' || category === 'consolidated_full') {
        if (category === 'consolidated_full') {
            doc.addPage();
            currentY = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
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

    if (category === 'stock_flow' || category === 'stock_dispatches' || category === 'consolidated_full') {
        if (currentY + 40 > doc.internal.pageSize.height) {
            doc.addPage();
            currentY = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
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

    if (category === 'stock_flow' || category === 'best_sellers' || category === 'consolidated_full') {
        if (currentY + 40 > doc.internal.pageSize.height) {
            doc.addPage();
            currentY = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
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

    if (category === 'sales_invoices' || (category === 'consolidated_full' && currentY + 30 > doc.internal.pageSize.height)) {
        if (category === 'consolidated_full') {
            doc.addPage();
            currentY = 20;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(30, 41, 59);
        doc.text('Customer Sales, Invoicing & Transactions Audit Log', 14, currentY);
        currentY += 3;

        const salesAuditRows = data.sales.slice(0, 30).map(s => {
            const bName = data.branchMap.get(s.branch_id)?.name || 'Store';
            return [
                formatDate(s.created_at),
                bName,
                s.customer_name || 'Walk-in Customer',
                (s.payment_method || s.payment || 'Cash').toUpperCase(),
                s.status || 'Completed',
                formatMoney(s.amount)
            ];
        });

        doc.autoTable({
            ...theme,
            startY: currentY,
            head: [['Date', 'Branch', 'Customer / Entity', 'Payment Method', 'Status', 'Transaction Amount']],
            body: salesAuditRows.length ? salesAuditRows : [['—', 'No sales transactions in this period', '—', '—', '—', '—']],
            columnStyles: {
                0: { cellWidth: 22, halign: 'center' },
                1: { cellWidth: 32 },
                2: { cellWidth: 50 },
                3: { cellWidth: 28, halign: 'center' },
                4: { cellWidth: 22, halign: 'center' },
                5: { cellWidth: 28, halign: 'right', fontStyle: 'bold' }
            }
        });

        currentY = doc.lastAutoTable.finalY + 8;
    }

    if (category === 'returns_refunds') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
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

    if (category === 'staff_productivity') {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
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

    if (category === 'financial_pl' || category === 'branch_performance') {
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

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `bms_${category}_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
