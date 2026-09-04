import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // 1. Business Owner Profiles & Global Settings
  profiles: defineTable({
    legacyId: v.optional(v.string()),
    userId: v.string(),
    email: v.string(),
    fullName: v.optional(v.string()),
    businessName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    logoUrl: v.optional(v.string()),
    mobileNumber: v.optional(v.string()),
    address: v.optional(v.string()),
    streetAddress: v.optional(v.string()),
    city: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    taxId: v.optional(v.string()),
    industry: v.optional(v.string()),
    brandColor: v.optional(v.string()),
    theme: v.optional(v.string()),
    language: v.optional(v.string()),
    preferredLanguage: v.optional(v.string()),
    timezone: v.optional(v.string()),
    currency: v.optional(v.string()),
    baseCurrency: v.optional(v.string()),
    plan: v.string(), // free_trial, pro, enterprise, exclusive
    currentPlan: v.optional(v.string()),
    billingCycle: v.optional(v.string()),
    status: v.string(), // active, suspended, cancelled
    isSuspended: v.boolean(),
    hasSeenTour: v.optional(v.boolean()),
    optedOutTrial: v.optional(v.boolean()),
    newsletterSubscribed: v.optional(v.boolean()),
    twoFactor: v.optional(v.boolean()),
    pinExpiryDays: v.optional(v.number()),
    sessionDurationHrs: v.optional(v.number()),
    defaultTarget: v.optional(v.number()),
    receiptText: v.optional(v.string()),
    operatingHours: v.optional(v.any()),
    invoiceSettings: v.optional(v.any()),
    notifications: v.optional(v.any()),
    trialEndsAt: v.optional(v.string()),
    subscriptionExpiresAt: v.optional(v.string()),
    lastNotifCheck: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_user_id", ["userId"])
    .index("by_email", ["email"])
    .index("by_plan", ["plan"])
    .index("by_status", ["status"]),

  // 2. SysAdmin User Registry
  sysAdmins: defineTable({
    legacyId: v.optional(v.string()),
    userId: v.string(),
    email: v.string(),
    mfaEnabled: v.boolean(),
    addedBy: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_user_id", ["userId"])
    .index("by_email", ["email"]),

  // 3. SysAdmin Elevated Step-Up Sessions (15-minute challenge)
  sysStepUpSessions: defineTable({
    userId: v.string(),
    action: v.string(),
    verifiedAt: v.string(),
    expiresAt: v.string(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_user_id", ["userId"])
    .index("by_expires_at", ["expiresAt"]),

  // 4. Branches
  branches: defineTable({
    legacyId: v.optional(v.string()),
    ownerId: v.string(),
    ownerEmail: v.optional(v.string()),
    name: v.string(),
    branchCode: v.string(),
    branchRegNo: v.optional(v.string()),
    branchTin: v.optional(v.string()),
    managerId: v.optional(v.string()),
    manager: v.optional(v.string()),
    managerEmail: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    pin: v.optional(v.string()),
    pinUpdatedAt: v.optional(v.string()),
    location: v.optional(v.string()),
    address: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    currency: v.optional(v.string()),
    target: v.optional(v.number()),
    taxRate: v.optional(v.number()),
    theme: v.optional(v.string()),
    status: v.string(), // active, inactive, suspended
    hasSeenBranchTour: v.optional(v.boolean()),
    lowStockNotifications: v.optional(v.boolean()),
    openingTime: v.optional(v.string()),
    closingTime: v.optional(v.string()),
    invoiceSettings: v.optional(v.any()),
    preferences: v.optional(v.any()),
    lastNotifCheck: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_owner_id", ["ownerId"])
    .index("by_branch_code", ["branchCode"])
    .index("by_manager_id", ["managerId"])
    .index("by_status", ["status"]),

  // 5. Staff & Employee Roster
  staff: defineTable({
    legacyId: v.optional(v.string()),
    ownerId: v.string(),
    branchId: v.optional(v.string()),
    fullName: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.string(), // Cashier, Sales Clerk, Inventory Manager, Staff
    salary: v.optional(v.number()),
    status: v.string(), // active, on_leave, terminated
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_owner_id", ["ownerId"])
    .index("by_branch_id", ["branchId"])
    .index("by_owner_and_branch", ["ownerId", "branchId"])
    .index("by_role", ["role"])
    .index("by_status", ["status"]),

  // 6. SaaS Pricing Plans
  pricingPlans: defineTable({
    legacyId: v.optional(v.string()),
    name: v.string(), // free_trial, pro, enterprise, exclusive
    title: v.string(),
    priceMonthly: v.number(),
    priceAnnual: v.number(),
    maxBranches: v.number(),
    maxUsers: v.number(),
    features: v.array(v.string()),
    isPopular: v.optional(v.boolean()),
    createdAt: v.string(),
  }).index("by_name", ["name"]),

  // 7. SaaS Subscription Audit Logs
  saasAuditLogs: defineTable({
    ownerId: v.string(),
    eventType: v.string(),
    previousPlan: v.optional(v.string()),
    newPlan: v.string(),
    mrrChange: v.optional(v.number()),
    metadata: v.optional(v.any()),
    createdAt: v.string(),
  })
    .index("by_owner_id", ["ownerId"])
    .index("by_created_at", ["createdAt"]),

  // 8. Central Master Inventory (Enterprise Master Product Catalog)
  centralInventory: defineTable({
    legacyId: v.optional(v.string()),
    ownerId: v.string(),
    name: v.string(),
    sku: v.string(),
    barcode: v.optional(v.string()),
    category: v.string(),
    quantity: v.number(),
    minThreshold: v.number(),
    costPrice: v.number(),
    price: v.number(),
    retailPrice: v.number(),
    wholesalePrice: v.optional(v.number()),
    itemType: v.string(), // product, service, composite
    deletedAt: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_owner_id", ["ownerId"])
    .index("by_sku", ["sku"])
    .index("by_barcode", ["barcode"])
    .index("by_owner_and_sku", ["ownerId", "sku"])
    .index("by_category", ["category"]),

  // 9. Branch Inventory
  inventory: defineTable({
    legacyId: v.optional(v.string()),
    branchId: v.string(),
    ownerId: v.string(),
    centralItemId: v.optional(v.string()),
    name: v.string(),
    sku: v.string(),
    barcode: v.optional(v.string()),
    category: v.string(),
    quantity: v.number(),
    minThreshold: v.number(),
    costPrice: v.number(),
    price: v.number(),
    retailPrice: v.number(),
    wholesalePrice: v.optional(v.number()),
    isFromMainStore: v.boolean(),
    isIsolated: v.boolean(),
    isolationStatus: v.string(), // unregistered, registered, isolated
    registeredAt: v.optional(v.string()),
    registeredBy: v.optional(v.string()),
    deletedAt: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_branch_id", ["branchId"])
    .index("by_owner_id", ["ownerId"])
    .index("by_central_item_id", ["centralItemId"])
    .index("by_branch_and_central", ["branchId", "centralItemId"])
    .index("by_sku", ["sku"])
    .index("by_branch_and_sku", ["branchId", "sku"])
    .index("by_isolation", ["branchId", "isIsolated", "isolationStatus"]),

  // 10. Services (Zero physical stock consumables)
  services: defineTable({
    legacyId: v.optional(v.string()),
    branchId: v.string(),
    ownerId: v.string(),
    name: v.string(),
    category: v.string(),
    price: v.number(),
    costPrice: v.optional(v.number()),
    isActive: v.boolean(),
    deletedAt: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_branch_id", ["branchId"])
    .index("by_owner_id", ["ownerId"])
    .index("by_branch_and_active", ["branchId", "isActive"]),

  // 11. Product & Service Categories
  categories: defineTable({
    legacyId: v.optional(v.string()),
    ownerId: v.string(),
    name: v.string(),
    type: v.string(), // product, service, all
    description: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_owner_id", ["ownerId"])
    .index("by_type", ["type"]),

  // 12. Stock Movements Ledger (Strictly Append-Only & Immutable)
  stockMovements: defineTable({
    legacyId: v.optional(v.string()),
    ownerId: v.string(),
    branchId: v.string(),
    inventoryId: v.string(),
    movementType: v.string(), // sale, purchase, transfer_in, transfer_out, adjustment, return
    quantity: v.number(),
    previousQuantity: v.number(),
    newQuantity: v.number(),
    referenceId: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_branch_id", ["branchId"])
    .index("by_owner_id", ["ownerId"])
    .index("by_inventory_id", ["inventoryId"])
    .index("by_movement_type", ["movementType"])
    .index("by_created_at", ["createdAt"]),

  // 13. Stock Transfers (Branch-to-Branch & Central-to-Branch)
  stockTransfers: defineTable({
    legacyId: v.optional(v.string()),
    ownerId: v.string(),
    fromBranchId: v.string(), // branchId or 'central'
    toBranchId: v.string(),
    itemName: v.string(),
    quantity: v.number(),
    status: v.string(), // pending, approved, in_transit, received, rejected
    notes: v.optional(v.string()),
    requestedAt: v.string(),
    resolvedAt: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_owner_id", ["ownerId"])
    .index("by_from_branch", ["fromBranchId"])
    .index("by_to_branch", ["toBranchId"])
    .index("by_status", ["status"]),

  // 14. Sales & POS Transactions
  sales: defineTable({
    legacyId: v.optional(v.string()),
    branchId: v.string(),
    ownerId: v.string(),
    productId: v.optional(v.string()),
    clientTxId: v.string(), // Offline POS idempotency key
    customer: v.optional(v.string()),
    customerName: v.string(),
    items: v.any(), // JSON array of line items
    quantity: v.number(),
    amount: v.number(),
    costAmount: v.number(),
    grossProfit: v.number(),
    profit: v.number(),
    payment: v.string(),
    paymentMethod: v.string(), // cash, mobile_money, card, credit, split
    priceType: v.string(), // retail, wholesale
    itemType: v.string(), // product, service, mixed
    itemName: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_branch_id", ["branchId"])
    .index("by_owner_id", ["ownerId"])
    .index("by_client_tx_id", ["clientTxId"])
    .index("by_created_at", ["createdAt"])
    .index("by_branch_and_created", ["branchId", "createdAt"]),

  // 15. Cash Drawer Till Sessions
  cashDrawer: defineTable({
    legacyId: v.optional(v.string()),
    branchId: v.string(),
    ownerId: v.string(),
    openingBalance: v.number(),
    closingBalance: v.optional(v.number()),
    expectedBalance: v.optional(v.number()),
    difference: v.optional(v.number()),
    status: v.string(), // open, closed
    openedBy: v.string(),
    closedBy: v.optional(v.string()),
    openedAt: v.string(),
    closedAt: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_branch_id", ["branchId"])
    .index("by_branch_and_status", ["branchId", "status"]),

  // 16. Cash Drawer Transactions (Cash In, Cash Out, Safe Drops)
  cashTransactions: defineTable({
    legacyId: v.optional(v.string()),
    drawerId: v.string(),
    branchId: v.string(),
    ownerId: v.string(),
    type: v.string(), // cash_in, cash_out, drop
    amount: v.number(),
    reason: v.string(),
    performedBy: v.string(),
    createdAt: v.string(),
  })
    .index("by_drawer_id", ["drawerId"])
    .index("by_branch_id", ["branchId"]),

  // 17. Customers Directory
  customers: defineTable({
    legacyId: v.optional(v.string()),
    branchId: v.string(),
    ownerId: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    email: v.optional(v.string()),
    address: v.optional(v.string()),
    creditLimit: v.number(),
    currentBalance: v.number(),
    loyaltyPoints: v.number(),
    notes: v.optional(v.string()),
    status: v.string(), // active, blacklisted, inactive
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_branch_id", ["branchId"])
    .index("by_owner_id", ["ownerId"])
    .index("by_phone", ["phone"]),

  // 18. Customer Debt Settlements & Payments
  customerPayments: defineTable({
    legacyId: v.optional(v.string()),
    branchId: v.string(),
    ownerId: v.string(),
    customerId: v.string(),
    documentId: v.optional(v.string()),
    amount: v.number(),
    paymentMethod: v.string(), // cash, bank, mobile_money
    referenceNo: v.optional(v.string()),
    paymentDate: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_branch_id", ["branchId"])
    .index("by_customer_id", ["customerId"]),

  // 19. Customer Micro-Loans
  loans: defineTable({
    legacyId: v.optional(v.string()),
    branchId: v.string(),
    ownerId: v.string(),
    borrowerName: v.string(),
    principalAmount: v.number(),
    interestRate: v.number(),
    totalPayable: v.number(),
    totalPaid: v.number(),
    balance: v.number(),
    status: v.string(), // active, cleared, defaulted
    startDate: v.string(),
    dueDate: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_branch_id", ["branchId"])
    .index("by_owner_id", ["ownerId"])
    .index("by_status", ["status"]),

  // 20. Capital Accounts (Banking, Mobile Money, Petty Cash)
  capitalAccounts: defineTable({
    legacyId: v.optional(v.string()),
    ownerId: v.string(),
    branchId: v.optional(v.string()),
    accountName: v.string(),
    accountType: v.string(), // bank, cash, mobile_money, petty_cash
    balance: v.number(),
    currency: v.string(),
    accountNumber: v.optional(v.string()),
    bankName: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_owner_id", ["ownerId"]),

  // 21. Capital Transactions
  capitalTransactions: defineTable({
    legacyId: v.optional(v.string()),
    accountId: v.string(),
    ownerId: v.string(),
    type: v.string(), // deposit, withdrawal, transfer
    amount: v.number(),
    reference: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_account_id", ["accountId"])
    .index("by_owner_id", ["ownerId"]),

  // 22. Fixed Business Assets
  businessAssets: defineTable({
    legacyId: v.optional(v.string()),
    ownerId: v.string(),
    branchId: v.optional(v.string()),
    assetName: v.string(),
    category: v.string(), // vehicle, machinery, it_hardware, furniture, property, tools
    purchaseCost: v.number(),
    purchaseDate: v.string(),
    salvageValue: v.number(),
    usefulLifeYears: v.number(),
    depreciationMethod: v.string(), // straight_line, declining_balance
    currentBookValue: v.number(),
    status: v.string(), // active, under_maintenance, disposed, written_off
    serialNumber: v.optional(v.string()),
    supplierName: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_owner_id", ["ownerId"]),

  // 23. Commercial Business Borrowings
  businessLoans: defineTable({
    legacyId: v.optional(v.string()),
    ownerId: v.string(),
    lenderName: v.string(),
    loanType: v.string(), // bank_loan, supplier_credit, owner_loan
    principalAmount: v.number(),
    interestRateAnnual: v.number(),
    startDate: v.string(),
    dueDate: v.string(),
    remainingBalance: v.number(),
    monthlyInstallment: v.number(),
    status: v.string(), // active, fully_paid, defaulted
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_owner_id", ["ownerId"]),

  // 24. Operating Expenses
  expenses: defineTable({
    legacyId: v.optional(v.string()),
    branchId: v.string(),
    ownerId: v.string(),
    category: v.string(),
    amount: v.number(),
    description: v.string(),
    paymentMethod: v.string(),
    receiptUrl: v.optional(v.string()),
    expenseDate: v.string(),
    createdBy: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_branch_id", ["branchId"])
    .index("by_owner_id", ["ownerId"])
    .index("by_created_at", ["createdAt"]),

  // 25. Staff Payroll Cycles
  payroll: defineTable({
    legacyId: v.optional(v.string()),
    ownerId: v.string(),
    branchId: v.string(),
    staffId: v.string(),
    staffName: v.string(),
    role: v.string(),
    period: v.string(),
    amount: v.number(),
    status: v.string(), // paid, pending, processing
    paidAt: v.optional(v.string()),
    createdAt: v.string(),
  })
    .index("by_owner_id", ["ownerId"])
    .index("by_branch_id", ["branchId"])
    .index("by_staff_id", ["staffId"]),

  // 26. Realtime Team Messaging
  messages: defineTable({
    legacyId: v.optional(v.string()),
    senderId: v.string(),
    senderName: v.string(),
    senderRole: v.string(), // owner, branch, staff, sysadmin
    groupId: v.optional(v.string()),
    parentId: v.optional(v.string()),
    branchId: v.optional(v.string()),
    content: v.string(),
    isGroup: v.boolean(),
    isDelivered: v.boolean(),
    isRead: v.boolean(),
    metadata: v.optional(v.any()),
    reactions: v.optional(v.any()),
    deletedFor: v.optional(v.array(v.string())),
    createdAt: v.string(),
  })
    .index("by_group_id", ["groupId"])
    .index("by_branch_id", ["branchId"])
    .index("by_sender_id", ["senderId"])
    .index("by_created_at", ["createdAt"]),

  // 27. Chat Groups
  chatGroups: defineTable({
    legacyId: v.optional(v.string()),
    name: v.string(),
    createdBy: v.string(),
    branchId: v.optional(v.string()),
    ownerId: v.string(),
    createdAt: v.string(),
  })
    .index("by_owner_id", ["ownerId"])
    .index("by_branch_id", ["branchId"]),

  // 28. Group Members
  groupMembers: defineTable({
    groupId: v.string(),
    userId: v.string(),
    joinedAt: v.string(),
  })
    .index("by_group_id", ["groupId"])
    .index("by_user_id", ["userId"]),

  // 29. Branch Requisitions & Requests (Stock, Expenses, Services)
  requests: defineTable({
    legacyId: v.optional(v.string()),
    ownerId: v.string(),
    branchId: v.string(),
    subject: v.string(),
    message: v.string(),
    type: v.string(), // stock, expense, service, general
    status: v.string(), // pending, approved, rejected
    priority: v.string(), // low, medium, urgent
    adminResponse: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_owner_id", ["ownerId"])
    .index("by_branch_id", ["branchId"])
    .index("by_status", ["status"]),

  // 30. Operational Tasks
  tasks: defineTable({
    legacyId: v.optional(v.string()),
    branchId: v.string(),
    ownerId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.string(), // pending, in_progress, completed, cancelled
    priority: v.string(), // low, medium, urgent
    deadline: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_branch_id", ["branchId"])
    .index("by_owner_id", ["ownerId"])
    .index("by_status", ["status"]),

  // 31. Task Comments Discussion
  taskComments: defineTable({
    taskId: v.string(),
    userId: v.string(),
    userName: v.string(),
    comment: v.string(),
    createdAt: v.string(),
  }).index("by_task_id", ["taskId"]),

  // 32. In-App Notifications
  notifications: defineTable({
    userId: v.string(),
    title: v.string(),
    message: v.string(),
    type: v.string(), // info, success, warning, alert
    read: v.boolean(),
    metadata: v.optional(v.any()),
    createdAt: v.string(),
  })
    .index("by_user_id", ["userId"])
    .index("by_user_and_read", ["userId", "read"]),

  // 33. SysAdmin Broadcast Modal Messages
  adminModalMessages: defineTable({
    legacyId: v.optional(v.string()),
    title: v.string(),
    body: v.string(),
    type: v.string(), // announcement, feature, warning, urgent
    targetAudience: v.string(), // all, owners, branches
    ctaText: v.optional(v.string()),
    ctaUrl: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_active", ["isActive"])
    .index("by_audience", ["targetAudience"]),

  // 34. User Seen Broadcast Messages (Prevents Re-popping)
  userSeenModalMessages: defineTable({
    userId: v.string(),
    modalMessageId: v.string(),
    seenAt: v.string(),
  }).index("by_user_and_modal", ["userId", "modalMessageId"]),

  // 35. System Security Events
  sysSecurityEvents: defineTable({
    eventType: v.string(), // failed_login, mfa_challenge, rate_limit_exceeded, step_up_success
    severity: v.string(), // info, warning, critical
    userId: v.optional(v.string()),
    ownerId: v.optional(v.string()),
    email: v.optional(v.string()),
    ipAddress: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.string(),
  })
    .index("by_user_id", ["userId"])
    .index("by_event_type", ["eventType"])
    .index("by_created_at", ["createdAt"]),

  // 36. Global Platform Settings
  sysSettings: defineTable({
    key: v.string(), // app_version, maintenance_mode, allow_signups
    value: v.any(),
    updatedAt: v.string(),
  }).index("by_key", ["key"]),

  // 37. Suppliers & Vendors
  suppliers: defineTable({
    legacyId: v.optional(v.string()),
    ownerId: v.string(),
    name: v.string(),
    contactPerson: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_owner_id", ["ownerId"]),

  // 38. Purchase Orders
  purchaseOrders: defineTable({
    legacyId: v.optional(v.string()),
    ownerId: v.string(),
    branchId: v.string(),
    supplierId: v.string(),
    poNumber: v.string(),
    items: v.any(),
    totalAmount: v.number(),
    status: v.string(), // draft, pending, ordered, received, cancelled
    orderDate: v.string(),
    expectedDeliveryDate: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_owner_id", ["ownerId"])
    .index("by_branch_id", ["branchId"])
    .index("by_supplier_id", ["supplierId"]),

  // 39. Cashier Work Shifts
  shifts: defineTable({
    legacyId: v.optional(v.string()),
    branchId: v.string(),
    cashierId: v.string(),
    cashierName: v.string(),
    status: v.string(), // active, closed
    startTime: v.string(),
    endTime: v.optional(v.string()),
    startingCash: v.number(),
    expectedCash: v.optional(v.number()),
    actualCash: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  }).index("by_branch_id", ["branchId"]),

  // 40. Quotations & Proforma Invoices
  quotations: defineTable({
    legacyId: v.optional(v.string()),
    ownerId: v.string(),
    branchId: v.string(),
    quoteNumber: v.string(),
    customerName: v.string(),
    items: v.any(),
    subtotal: v.number(),
    taxAmount: v.number(),
    totalAmount: v.number(),
    status: v.string(), // draft, sent, accepted, rejected, expired
    validUntil: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_owner_id", ["ownerId"])
    .index("by_branch_id", ["branchId"]),

  // 41. Customer Billing Invoices
  invoices: defineTable({
    legacyId: v.optional(v.string()),
    ownerId: v.string(),
    branchId: v.string(),
    invoiceNumber: v.string(),
    customerName: v.string(),
    customerId: v.optional(v.string()),
    items: v.any(),
    subtotal: v.number(),
    taxAmount: v.number(),
    totalAmount: v.number(),
    status: v.string(), // unpaid, partially_paid, paid, overdue, void
    dueDate: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_owner_id", ["ownerId"])
    .index("by_branch_id", ["branchId"]),

  // 42. Customer Product Returns
  productReturns: defineTable({
    legacyId: v.optional(v.string()),
    branchId: v.string(),
    ownerId: v.string(),
    saleId: v.string(),
    items: v.any(),
    refundAmount: v.number(),
    reason: v.string(),
    createdAt: v.string(),
  })
    .index("by_branch_id", ["branchId"])
    .index("by_owner_id", ["ownerId"]),

  // 43. Staff Daily Attendance
  attendance: defineTable({
    legacyId: v.optional(v.string()),
    ownerId: v.string(),
    branchId: v.string(),
    staffId: v.string(),
    date: v.string(),
    status: v.string(), // present, absent, late, excused
    clockIn: v.optional(v.string()),
    clockOut: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_owner_id", ["ownerId"])
    .index("by_branch_id", ["branchId"])
    .index("by_staff_id", ["staffId"]),

  // 44. Enterprise Announcements
  announcements: defineTable({
    legacyId: v.optional(v.string()),
    ownerId: v.string(),
    branchId: v.optional(v.string()),
    title: v.string(),
    content: v.string(),
    createdAt: v.string(),
    updatedAt: v.string(),
  })
    .index("by_owner_id", ["ownerId"])
    .index("by_branch_id", ["branchId"]),

  // 45. Internal Migration ID Mapping (Maps Supabase UUIDs -> Convex Document IDs)
  migrationIdMap: defineTable({
    entityType: v.string(),
    oldSupabaseId: v.string(),
    newConvexId: v.string(),
    createdAt: v.string(),
  })
    .index("by_old_id", ["entityType", "oldSupabaseId"])
    .index("by_new_id", ["newConvexId"]),
});
