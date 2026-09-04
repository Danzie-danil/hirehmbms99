const fs = require('fs');
const path = require('path');

const exportDir = path.resolve(__dirname, '../export/data');
const transformDir = path.resolve(__dirname, 'data');

if (!fs.existsSync(transformDir)) {
    fs.mkdirSync(transformDir, { recursive: true });
}

console.log('====================================================');
console.log('CONVEX DATA NORMALIZATION & TRANSFORMATION PIPELINE');
console.log('Input directory:', exportDir);
console.log('Output directory:', transformDir);
console.log('====================================================\n');

function readExport(filename) {
    const file = path.join(exportDir, filename);
    if (!fs.existsSync(file)) return [];
    try {
        const content = fs.readFileSync(file, 'utf8');
        return JSON.parse(content);
    } catch {
        return [];
    }
}

// 1. Profiles
function transformProfiles() {
    return readExport('profiles.json').map(r => ({
        legacyId: r.id,
        userId: r.id,
        email: r.email || `${r.id}@bmstz.local`,
        fullName: r.full_name || 'Business Owner',
        businessName: r.business_name || 'My Business',
        avatarUrl: r.avatar_url || undefined,
        logoUrl: r.logo_url || undefined,
        mobileNumber: r.mobile_number || undefined,
        address: r.address || undefined,
        streetAddress: r.street_address || undefined,
        city: r.city || undefined,
        zipCode: r.zip_code || undefined,
        taxId: r.tax_id || undefined,
        industry: r.industry || undefined,
        brandColor: r.brand_color || undefined,
        theme: r.theme || 'light',
        language: r.language || 'en',
        preferredLanguage: r.preferred_language || 'en',
        timezone: r.timezone || 'UTC',
        currency: r.currency || 'TZS',
        baseCurrency: r.base_currency || 'USD',
        plan: r.plan || 'free_trial',
        currentPlan: r.current_plan || undefined,
        billingCycle: r.billing_cycle || 'monthly',
        status: r.status || 'active',
        isSuspended: Boolean(r.is_suspended),
        hasSeenTour: Boolean(r.has_seen_tour),
        optedOutTrial: Boolean(r.opted_out_trial),
        newsletterSubscribed: Boolean(r.newsletter_subscribed),
        twoFactor: Boolean(r.two_factor),
        pinExpiryDays: r.pin_expiry_days ? Number(r.pin_expiry_days) : 90,
        sessionDurationHrs: r.session_duration_hrs ? Number(r.session_duration_hrs) : 8,
        defaultTarget: r.default_target ? Number(r.default_target) : 10000,
        receiptText: r.receipt_text || undefined,
        operatingHours: r.operating_hours || undefined,
        invoiceSettings: r.invoice_settings || undefined,
        notifications: r.notifications || undefined,
        trialEndsAt: r.trial_ends_at || undefined,
        subscriptionExpiresAt: r.subscription_expires_at || undefined,
        lastNotifCheck: r.last_notif_check || undefined,
        createdAt: r.created_at || r.updated_at || new Date().toISOString(),
        updatedAt: r.updated_at || new Date().toISOString()
    }));
}

// 2. SysAdmins
function transformSysAdmins() {
    return readExport('sys_admins.json').map(r => ({
        legacyId: r.id,
        userId: r.user_id || r.id,
        email: r.email,
        mfaEnabled: Boolean(r.mfa_enabled),
        addedBy: r.added_by || undefined,
        createdAt: r.created_at || new Date().toISOString()
    }));
}

// 3. Branches
function transformBranches() {
    return readExport('branches.json').map((r, i) => ({
        legacyId: r.id,
        ownerId: r.owner_id,
        ownerEmail: r.owner_email || undefined,
        name: r.name,
        branchCode: r.branch_code || `BR-${String(i + 1).padStart(3, '0')}`,
        branchRegNo: r.branch_reg_no || undefined,
        branchTin: r.branch_tin || undefined,
        managerId: r.manager_id || undefined,
        manager: r.manager || undefined,
        managerEmail: r.manager_email || undefined,
        email: r.email || undefined,
        phone: r.phone || undefined,
        pin: r.pin || undefined,
        pinUpdatedAt: r.pin_updated_at || undefined,
        location: r.location || undefined,
        address: r.address || undefined,
        avatarUrl: r.avatar_url || undefined,
        currency: r.currency || 'TZS',
        target: r.target ? Number(r.target) : 0,
        taxRate: r.tax_rate ? Number(r.tax_rate) : 0,
        theme: r.theme || 'light',
        status: r.status || 'active',
        hasSeenBranchTour: Boolean(r.has_seen_branch_tour),
        lowStockNotifications: r.low_stock_notifications !== false,
        openingTime: r.opening_time || '08:00',
        closingTime: r.closing_time || '18:00',
        invoiceSettings: r.invoice_settings || undefined,
        preferences: r.preferences || undefined,
        lastNotifCheck: r.last_notif_check || undefined,
        createdAt: r.created_at || new Date().toISOString(),
        updatedAt: r.updated_at || new Date().toISOString()
    }));
}

// 4. Staff
function transformStaff() {
    return readExport('staff.json').map(r => ({
        legacyId: r.id,
        ownerId: r.owner_id,
        branchId: r.branch_id,
        fullName: r.full_name || 'Staff Member',
        email: r.email || `${r.id}@bmstz.local`,
        phone: r.phone || undefined,
        role: r.role || 'Staff',
        salary: Number(r.salary || 0),
        status: r.status || 'active',
        createdAt: r.created_at || new Date().toISOString(),
        updatedAt: r.updated_at || new Date().toISOString()
    }));
}

// 5. Pricing Plans
function transformPricingPlans() {
    return readExport('sys_pricing_plans.json').map(r => ({
        legacyId: r.id,
        name: (r.plan_name || 'starter').toLowerCase(),
        title: r.plan_name || 'Starter',
        priceMonthly: Number(r.price || 0),
        priceAnnual: Number(r.price || 0) * 10,
        maxBranches: Number(r.max_branches || 1),
        maxUsers: Number(r.max_branches || 1) * 5,
        features: [r.description || 'Core features'],
        isPopular: r.plan_name?.toLowerCase() === 'enterprise',
        createdAt: r.created_at || new Date().toISOString()
    }));
}

// 6. Central Inventory
function transformCentralInventory() {
    return readExport('central_inventory.json').map(r => ({
        legacyId: r.id,
        ownerId: r.owner_id,
        name: r.name,
        sku: r.sku || undefined,
        barcode: r.barcode || undefined,
        category: r.category || 'General',
        quantity: Number(r.quantity || 0),
        minThreshold: Number(r.min_threshold || 5),
        costPrice: Number(r.cost_price || 0),
        price: Number(r.price || 0),
        retailPrice: r.retail_price ? Number(r.retail_price) : undefined,
        wholesalePrice: r.wholesale_price ? Number(r.wholesale_price) : undefined,
        itemType: r.item_type || 'product',
        deletedAt: r.deleted_at || undefined,
        createdAt: r.created_at || new Date().toISOString(),
        updatedAt: r.updated_at || new Date().toISOString()
    }));
}

// 7. Branch Inventory
function transformInventory() {
    return readExport('inventory.json').map(r => ({
        legacyId: r.id,
        ownerId: r.owner_id,
        branchId: r.branch_id,
        name: r.name,
        sku: r.sku || undefined,
        barcode: r.barcode || undefined,
        category: r.category || 'General',
        quantity: Number(r.quantity || 0),
        minThreshold: Number(r.min_threshold || 5),
        costPrice: Number(r.cost_price || 0),
        price: Number(r.price || 0),
        retailPrice: r.retail_price ? Number(r.retail_price) : undefined,
        wholesalePrice: r.wholesale_price ? Number(r.wholesale_price) : undefined,
        itemType: r.item_type || 'product',
        deletedAt: r.deleted_at || undefined,
        createdAt: r.created_at || new Date().toISOString(),
        updatedAt: r.updated_at || new Date().toISOString()
    }));
}

// 8. Services
function transformServices() {
    return readExport('services.json').map(r => ({
        legacyId: r.id,
        ownerId: r.owner_id,
        branchId: r.branch_id || undefined,
        name: r.name,
        category: r.category || 'Service',
        cost: Number(r.cost || 0),
        price: Number(r.price || 0),
        chargeType: r.charge_type || 'fixed',
        description: r.description || undefined,
        status: r.status || 'active',
        createdAt: r.created_at || new Date().toISOString(),
        updatedAt: r.updated_at || new Date().toISOString()
    }));
}

// 9. Customers
function transformCustomers() {
    return readExport('customers.json').map(r => ({
        legacyId: r.id,
        ownerId: r.owner_id,
        branchId: r.branch_id || undefined,
        name: r.name,
        phone: r.phone || undefined,
        email: r.email || undefined,
        address: r.address || undefined,
        totalPurchases: Number(r.total_purchases || 0),
        balance: Number(r.balance || 0),
        status: r.status || 'active',
        createdAt: r.created_at || new Date().toISOString(),
        updatedAt: r.updated_at || new Date().toISOString()
    }));
}

// 10. Sales
function transformSales() {
    return readExport('sales.json').map(r => ({
        legacyId: r.id,
        clientTxId: r.client_tx_id || undefined,
        ownerId: r.owner_id,
        branchId: r.branch_id,
        customerName: r.customer_name || r.customer || 'Walk-in Customer',
        customerId: r.customer_id || undefined,
        cashierId: r.cashier_id || undefined,
        cashierName: r.cashier_name || undefined,
        items: Array.isArray(r.items) ? r.items : [],
        total: Number(r.total || 0),
        amountPaid: Number(r.amount_paid || r.total || 0),
        balanceDue: Number(r.balance_due || 0),
        profit: Number(r.profit || r.gross_profit || 0),
        paymentMethod: r.payment_method || r.payment || 'cash',
        status: r.status || 'completed',
        notes: r.notes || undefined,
        createdAt: r.created_at || new Date().toISOString()
    }));
}

// 11. Expenses
function transformExpenses() {
    return readExport('expenses.json').map(r => ({
        legacyId: r.id,
        ownerId: r.owner_id,
        branchId: r.branch_id,
        category: r.category || 'General',
        title: r.title || r.name || 'Expense',
        amount: Number(r.amount || 0),
        date: r.date || new Date().toISOString().split('T')[0],
        notes: r.notes || undefined,
        paymentMethod: r.payment_method || 'cash',
        approvedBy: r.approved_by || undefined,
        receiptUrl: r.receipt_url || undefined,
        createdAt: r.created_at || new Date().toISOString()
    }));
}

// 12. System Settings
function transformSysSettings() {
    return readExport('sys_settings.json').map(r => ({
        key: r.key,
        value: r.value,
        updatedAt: r.updated_at || new Date().toISOString()
    }));
}

// Transformation registry
const transformers = [
    { name: 'profiles', fn: transformProfiles },
    { name: 'sysAdmins', fn: transformSysAdmins },
    { name: 'branches', fn: transformBranches },
    { name: 'staff', fn: transformStaff },
    { name: 'pricingPlans', fn: transformPricingPlans },
    { name: 'centralInventory', fn: transformCentralInventory },
    { name: 'inventory', fn: transformInventory },
    { name: 'services', fn: transformServices },
    { name: 'customers', fn: transformCustomers },
    { name: 'sales', fn: transformSales },
    { name: 'expenses', fn: transformExpenses },
    { name: 'sysSettings', fn: transformSysSettings }
];

console.log('Processing transformations:');
for (const t of transformers) {
    const records = t.fn();
    const dest = path.join(transformDir, `${t.name}.json`);
    fs.writeFileSync(dest, JSON.stringify(records, null, 2), 'utf8');
    console.log(`- ${t.name.padEnd(18)} : ${records.length} records transformed`);
}

console.log('\nTransformation pipeline successfully executed.');
