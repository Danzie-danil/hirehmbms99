
let invoicesActiveTab = 'invoice';
window.invoicesActiveTab = invoicesActiveTab;
let docCustomers = [];

export async function renderInvoicesModule() {
    const container = document.getElementById('mainContent');

    try {
        docCustomers = await dbCustomers.fetchAllList(state.branchId);
    } catch (e) {  }

    let invoices = [];
    try {
        invoices = await dbDocuments.fetchInvoices(state.branchId);
    } catch (e) {  }

    const customerOptionsData = [
        { value: '', label: '-- Walk-in --', icon: 'user-minus' },
        ...docCustomers.map(c => ({ value: c.id, label: c.name, icon: 'user' })),
        { value: 'manual', label: 'Enter Manually', icon: 'edit-3' }
    ];
    const invoiceOptionsData = [
        { value: '', label: '-- No Invoice --', icon: 'file-minus' },
        ...invoices.filter(i => i.type === 'invoice').map(i => ({
            value: i.id,
            label: `${i.document_number} - ${fmt.currency(i.amount)}`,
            icon: 'file-text'
        }))
    ];

    container.innerHTML = `
    <div class="space-y-6 slide-in max-w-4xl mx-auto">
        <div class="flex flex-nowrap items-center gap-2 sm:gap-3 justify-between">
            <div class="inline-flex items-center gap-2 sm:gap-3 bg-white border border-gray-200 shadow-sm rounded-xl sm:rounded-2xl p-1 sm:p-1.5 pr-3 sm:pr-5 cursor-default hover:shadow-md transition-shadow">
                <div class="bg-indigo-50 text-indigo-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold uppercase tracking-wider">${window.t('invoice_management', 'Invoices & Receipts')}</div>
            </div>
        </div>

        <div class="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 md:p-8">
            <h2 class="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <i data-lucide="file-text" class="w-6 h-6 text-indigo-600"></i> ${window.t('create_document', 'Create Document')}
            </h2>

            <div class="grid grid-cols-2 gap-3 mb-8 bg-gray-50 p-1.5 rounded-2xl">
                <button id="tab-invoice" onclick="switchInvoiceTab('invoice')" class="transaction-tab py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-1.5 ${window.invoicesActiveTab === 'invoice' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}" title="${window.t('tab_doc_invoice', 'Invoice')}">
                    <i data-lucide="file-text" class="w-4 h-4"></i> ${window.t('tab_doc_invoice', 'Invoice')}
                </button>
                <button id="tab-receipt" onclick="switchInvoiceTab('receipt')" class="transaction-tab py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 flex items-center justify-center gap-1.5 ${window.invoicesActiveTab === 'receipt' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}" title="${window.t('tab_doc_receipt', 'Receipt')}">
                    <i data-lucide="receipt" class="w-4 h-4"></i> ${window.t('tab_doc_receipt', 'Receipt')}
                </button>
            </div>

            <form onsubmit="createDocumentRecord(event)" id="documentForm" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="form-group space-y-1.5">
                        <label class="block text-sm font-medium text-gray-700" id="customerLabel">${window.t('bill_to', 'Bill To')}</label>
                        ${window.renderPremiumSelect({
        id: 'docCustomer',
        selectedValue: '',
        onchange: 'updateDocCustomerField()',
        options: customerOptionsData
    })}
                    </div>

                    <div id="manualCustomerField" class="hidden space-y-4 col-span-1 md:col-span-2 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
                        <div class="form-group space-y-1.5">
                            <label class="block text-sm font-medium text-gray-700">${window.t('customer_name_input', 'Customer Name')}</label>
                            <input type="text" id="manualCustomerName" class="form-input w-full rounded-xl" placeholder="${window.t('customer_name_input', 'Enter customer name')}">
                        </div>
                        <div class="form-group space-y-1.5">
                            <label class="block text-sm font-medium text-gray-700">${window.t('customer_email_input', 'Customer Email')}</label>
                            <input type="email" id="manualCustomerEmail" class="form-input w-full rounded-xl" placeholder="customer@email.com">
                        </div>
                        <div class="form-group space-y-1.5">
                            <label class="block text-sm font-medium text-gray-700">${window.t('customer_phone_input', 'Customer Phone')}</label>
                            <input type="text" id="manualCustomerPhone" class="form-input w-full rounded-xl" placeholder="${window.t('customer_phone_input', 'Phone number')}">
                        </div>
                        <div class="form-group space-y-1.5">
                            <label class="block text-sm font-medium text-gray-700">${window.t('customer_address_input', 'Customer Address')}</label>
                            <input type="text" id="manualCustomerAddress" class="form-input w-full rounded-xl" placeholder="${window.t('customer_address_input', 'Customer address')}">
                        </div>
                    </div>

                    <div class="form-group space-y-1.5 hidden col-span-1 md:col-span-2" id="invoiceSelectionGroup">
                        <label class="block text-sm font-medium text-gray-700">${window.t('related_invoice', 'Related Invoice (Optional)')}</label>
                        ${window.renderPremiumSelect({
        id: 'docInvoice',
        selectedValue: '',
        options: invoiceOptionsData
    })}
                    </div>
                </div>

                <div class="form-group space-y-1.5 mt-4" id="lineItemsGroup">
                    <label class="block text-sm font-medium text-gray-700">${window.t('items_services', 'Items / Services')}</label>
                    <div id="docItemsContainer" class="space-y-3">
                        <!-- Items will be generated here by initDocItemRow -->
                    </div>
                    <button type="button" onclick="window.addDocItemRow()" class="w-full py-2 mt-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-all">
                        ${window.t('btn_add_item_row', '+ ADD ITEM')}
                    </button>
                </div>

                <div class="form-group space-y-1.5 mt-4">
                    <label class="block text-sm font-medium text-gray-700">${window.t('description_notes', 'Description / Notes')}</label>
                    <textarea id="docDescription" class="form-input w-full rounded-xl" placeholder="${window.t('description_notes', 'Payment for services rendered')}" rows="2"></textarea>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="form-group space-y-1.5">
                        <label class="block text-sm font-medium text-gray-700">${window.t('subtotal_label', 'Subtotal (Auto-calculated)')}</label>
                        <div class="relative">
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span class="text-gray-500 sm:text-sm font-medium">${state.profile?.currency || 'USD'}</span>
                            </div>
                            <input type="number" step="0.01" id="docSubTotal" class="form-input w-full pl-12 rounded-xl bg-gray-50" value="0.00" readonly>
                        </div>
                    </div>

                    <div class="form-group space-y-1.5">
                        <label class="block text-sm font-medium text-gray-700">${window.t('tax_rate_label', 'Tax Rate (%)')}</label>
                        <input type="number" step="1" id="docTaxRate" class="form-input w-full rounded-xl" placeholder="0" value="0" oninput="window.calcDocTotal()">
                    </div>

                    <div class="form-group space-y-1.5">
                        <label class="block text-sm font-medium text-gray-700">${window.t('total_amount', 'Total Amount')}</label>
                        <div class="relative">
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span class="text-gray-500 sm:text-sm font-medium">${state.profile?.currency || 'USD'}</span>
                            </div>
                            <input type="number" step="0.01" id="docAmount" class="form-input w-full pl-12 rounded-xl bg-gray-50 font-bold" value="0.00" readonly>
                        </div>
                    </div>

                    <div class="form-group space-y-1.5" id="paymentMethodGroup">
                        <label class="block text-sm font-medium text-gray-700">${window.t('payment_method', 'Payment Method')}</label>
                        ${window.renderPremiumSelect({
        id: 'docPaymentMethod',
        selectedValue: 'Cash',
        options: [
            { value: 'Cash', label: 'Cash', icon: 'banknote' },
            { value: 'M-Pesa', label: 'M-Pesa', icon: 'smartphone' },
            { value: 'Bank Transfer', label: 'Bank Transfer', icon: 'landmark' },
            { value: 'Card', label: 'Card', icon: 'credit-card' },
            { value: 'Airtel Money', label: 'Airtel Money', icon: 'smartphone' },
            { value: 'Halopesa', label: 'Halopesa', icon: 'smartphone' }
        ]
    })}
                    </div>
                    <div class="form-group space-y-1.5">
                        <label class="block text-sm font-medium text-gray-700">${window.t('reference_number', 'Reference Number (Optional)')}</label>
                        <input type="text" id="docReference" class="form-input w-full rounded-xl" placeholder="REF123XYZ">
                    </div>

                    <div class="form-group space-y-1.5" id="dueDateGroup">
                        <label class="block text-sm font-medium text-gray-700">${window.t('due_date', 'Payment Due Date')}</label>
                        ${window.renderPremiumDatePicker ? window.renderPremiumDatePicker({
                            id: 'docDueDate',
                            selectedValue: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
                            placeholder: 'Select Due Date',
                            classes: 'w-full rounded-xl'
                        }) : `<input type="date" id="docDueDate" class="form-input w-full rounded-xl" value="${new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]}">`}
                    </div>

                    <div class="form-group space-y-1.5" id="docStatusGroup">
                        <label class="block text-sm font-medium text-gray-700">${window.t('invoice_status', 'Initial Status')}</label>
                        <select id="docStatus" class="form-input w-full rounded-xl font-semibold text-sm" onchange="window.toggleDocPaidAmountField()">
                            <option value="sent">Sent / Unpaid</option>
                            <option value="partially_paid">Partially Paid</option>
                            <option value="paid">Paid in Full</option>
                            <option value="draft">Draft</option>
                        </select>
                    </div>

                    <div class="form-group space-y-1.5 hidden col-span-1 md:col-span-2" id="docPaidAmountGroup">
                        <label class="block text-sm font-medium text-amber-700">Initial Paid Amount (Deposit)</label>
                        <div class="relative">
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <span class="text-gray-500 sm:text-sm font-medium">${state.profile?.currency || 'USD'}</span>
                            </div>
                            <input type="number" step="0.01" id="docPaidAmount" class="form-input w-full pl-12 rounded-xl border-amber-300 focus:ring-amber-500" placeholder="0.00">
                        </div>
                    </div>
                </div>

                <div class="pt-4">
                    <button type="submit" id="docSubmitBtn" class="w-full btn-primary py-3 rounded-xl justify-center text-lg shadow-md hover:shadow-lg transition-all">
                        ${window.t('btn_create_document', 'Create Document')}
                    </button>
                </div>
            </form>
        </div>

        <!-- Recent Documents History -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-3.5 sm:p-5 mt-4">
            <div class="flex items-center justify-between mb-4">
                <h3 class="text-sm sm:text-base font-bold text-gray-900 dark:text-white uppercase tracking-wide">${window.t('recent_documents', 'Recent Documents')}</h3>
                <span class="text-xs text-gray-400 font-medium">Invoices & Receipts</span>
            </div>
            <div id="recentDocumentsList" class="space-y-2.5">
                <div class="flex justify-center p-4"><i class="fas fa-spinner fa-spin text-gray-400"></i></div>
            </div>
        </div>
    </div>`;

    lucide.createIcons();
    switchInvoiceTab(window.invoicesActiveTab);
    window.addDocItemRow();
    loadRecentDocuments();
};

window.toggleDocPaidAmountField = function() {
    const status = document.getElementById('docStatus')?.value;
    const paidGrp = document.getElementById('docPaidAmountGroup');
    if (paidGrp) {
        if (status === 'partially_paid') {
            paidGrp.classList.remove('hidden');
        } else {
            paidGrp.classList.add('hidden');
        }
    }
};

export function addDocItemRow() {
    const container = document.getElementById('docItemsContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'flex gap-2 items-start';
    div.innerHTML = `
        <input type="text" class="doc-item-name form-input flex-1 text-sm rounded-xl" placeholder="Item/Service Description" required>
        <input type="number" step="1" min="1" class="doc-item-qty form-input w-20 text-sm rounded-xl" placeholder="Qty" value="1" oninput="window.calcDocTotal()" required>
        <input type="number" step="0.01" class="doc-item-price form-input w-24 text-sm rounded-xl" placeholder="Price" oninput="window.calcDocTotal()" required>
        <button type="button" onclick="this.parentElement.remove(); window.calcDocTotal()" class="h-10 w-10 bg-red-50 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-xl flex items-center justify-center transition-colors"><i data-lucide="x" class="w-4 h-4"></i></button>
    `;
    container.appendChild(div);
    lucide.createIcons();
};

export function calcDocTotal() {
    let subtotal = 0;
    const rows = document.getElementById('docItemsContainer').children;
    for (const row of rows) {
        const qty = parseFloat(row.querySelector('.doc-item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.doc-item-price').value) || 0;
        subtotal += (qty * price);
    }

    const taxRate = parseFloat(document.getElementById('docTaxRate').value) || 0;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    document.getElementById('docSubTotal').value = subtotal.toFixed(2);
    document.getElementById('docAmount').value = total.toFixed(2);
};

export function switchInvoiceTab(tabName) {
    window.invoicesActiveTab = tabName;
    const tabInvoice = document.getElementById('tab-invoice');
    const tabReceipt = document.getElementById('tab-receipt');
    const invoiceGroup = document.getElementById('invoiceSelectionGroup');
    const paymentGroup = document.getElementById('paymentMethodGroup');
    const dueDateGroup = document.getElementById('dueDateGroup');
    const docStatusGroup = document.getElementById('docStatusGroup');
    const docPaidAmountGroup = document.getElementById('docPaidAmountGroup');
    const submitBtn = document.getElementById('docSubmitBtn');
    const customerLabel = document.getElementById('customerLabel');

    if (tabName === 'invoice') {
        tabInvoice.className = "transaction-tab py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 bg-white text-indigo-700 shadow-sm";
        tabReceipt.className = "transaction-tab py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 text-gray-500 hover:text-gray-700";
        invoiceGroup.classList.add('hidden');
        paymentGroup.classList.add('hidden');
        if (dueDateGroup) dueDateGroup.classList.remove('hidden');
        if (docStatusGroup) docStatusGroup.classList.remove('hidden');
        window.toggleDocPaidAmountField();
        submitBtn.innerHTML = '<i data-lucide="file-plus" class="w-5 h-5 mr-2"></i> Create Invoice';
        submitBtn.className = "w-full focus:outline-none flex items-center justify-center py-3 rounded-xl text-white font-bold text-base transition-all bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg";
        customerLabel.innerText = "Bill To";
    } else {
        tabReceipt.className = "transaction-tab py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 bg-white text-emerald-700 shadow-sm";
        tabInvoice.className = "transaction-tab py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 text-gray-500 hover:text-gray-700";
        invoiceGroup.classList.remove('hidden');
        paymentGroup.classList.remove('hidden');
        if (dueDateGroup) dueDateGroup.classList.add('hidden');
        if (docStatusGroup) docStatusGroup.classList.add('hidden');
        if (docPaidAmountGroup) docPaidAmountGroup.classList.add('hidden');
        submitBtn.innerHTML = '<i data-lucide="receipt" class="w-5 h-5 mr-2"></i> Create Receipt';
        submitBtn.className = "w-full focus:outline-none flex items-center justify-center py-3 rounded-xl text-white font-bold text-base transition-all bg-emerald-600 hover:bg-emerald-700 shadow-md hover:shadow-lg";
        customerLabel.innerText = "Received From";
    }
    lucide.createIcons();
};

export function updateDocCustomerField() {
    const sel = document.getElementById('docCustomer').value;
    const manualGrp = document.getElementById('manualCustomerField');
    const nameInput = document.getElementById('manualCustomerName');
    const emailInput = document.getElementById('manualCustomerEmail');
    const phoneInput = document.getElementById('manualCustomerPhone');
    const addressInput = document.getElementById('manualCustomerAddress');

    if (sel === 'manual') {
        manualGrp.classList.remove('hidden');
        nameInput.value = '';
        emailInput.value = '';
        phoneInput.value = '';
        addressInput.value = '';
        nameInput.disabled = false;
        emailInput.disabled = false;
        phoneInput.disabled = false;
        addressInput.disabled = false;
        nameInput.setAttribute('required', 'true');
    } else if (sel === '') {
        manualGrp.classList.add('hidden');
        nameInput.removeAttribute('required');
    } else {
        const customer = docCustomers.find(c => c.id === sel);
        if (customer) {
            manualGrp.classList.remove('hidden');
            nameInput.value = customer.name || '';
            emailInput.value = customer.email || '';
            phoneInput.value = customer.phone || '';
            addressInput.value = customer.address || '';

            nameInput.disabled = true;
            emailInput.disabled = true;
            phoneInput.disabled = true;
            addressInput.disabled = true;
            nameInput.removeAttribute('required');
        } else {
            manualGrp.classList.add('hidden');
        }
    }
};

export async function createDocumentRecord(e) {
    e.preventDefault();

    const type = window.invoicesActiveTab;
    const customerSel = document.getElementById('docCustomer').value;
    const manualName = document.getElementById('manualCustomerName').value;
    const manualEmail = document.getElementById('manualCustomerEmail').value;
    const manualAddress = document.getElementById('manualCustomerAddress').value;
    const description = document.getElementById('docDescription').value;

    const amount = parseFloat(document.getElementById('docAmount').value);

    const itemsData = [];
    const rows = document.getElementById('docItemsContainer').children;
    for (const row of rows) {
        const item_name = row.querySelector('.doc-item-name').value.trim();
        const quantity = parseFloat(row.querySelector('.doc-item-qty').value) || 0;
        const unit_price = parseFloat(row.querySelector('.doc-item-price').value) || 0;
        if (item_name && quantity > 0) {
            itemsData.push({ item_name, quantity, unit_price });
        }
    }

    if (itemsData.length === 0) {
        showToast("Please add at least one item or service.", "error");
        return;
    }

    const paymentMethod = type === 'receipt' ? document.getElementById('docPaymentMethod').value : null;
    const docReference = document.getElementById('docReference').value;
    const docInvoice = document.getElementById('docInvoice') ? document.getElementById('docInvoice').value : null;
    const docDueDate = document.getElementById('docDueDate')?.value || null;
    const docStatus = type === 'receipt' ? 'paid' : (document.getElementById('docStatus')?.value || 'sent');
    
    let paidAmount = 0;
    let balanceDue = amount;

    if (type === 'receipt' || docStatus === 'paid') {
        paidAmount = amount;
        balanceDue = 0;
    } else if (docStatus === 'partially_paid') {
        paidAmount = parseFloat(document.getElementById('docPaidAmount')?.value) || 0;
        balanceDue = Math.max(0, amount - paidAmount);
    } else {
        paidAmount = 0;
        balanceDue = amount;
    }

    let customer_id = null;
    let customer_name = "Walk-in";
    let customer_email = null;
    let customer_address = null;

    if (customerSel === 'manual') {
        customer_name = manualName;
        customer_email = manualEmail || null;
        customer_address = manualAddress || null;
    } else if (customerSel) {
        customer_id = customerSel;
        customer_name = manualName;
        customer_email = manualEmail || null;
        customer_address = manualAddress || null;
    }

    const docPrefix = type === 'invoice' ? 'INV' : 'REC';
    const uniqueNumber = `${docPrefix}-${Math.floor(1000 + Math.random() * 9000)}`;

    const activeInvoiceSettings = state.branchProfile?.invoice_settings || state.profile?.invoice_settings || null;

    const data = {
        branch_id: state.branchId,
        type: type,
        customer_id: customer_id,
        customer_name: customer_name,
        customer_email: customer_email,
        customer_address: customer_address,
        description: description,
        amount: amount,
        paid_amount: paidAmount,
        balance_due: balanceDue,
        status: docStatus,
        due_date: docDueDate,
        payment_method: paymentMethod,
        reference_number: docReference || null,
        document_number: uniqueNumber,
        related_invoice_id: (type === 'receipt' && docInvoice) ? docInvoice : null,
        mobile_payment_details: activeInvoiceSettings
    };

    const btn = document.getElementById('docSubmitBtn');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 mr-2 animate-spin"></i> Saving...';

    try {
        await dbDocuments.add(data, itemsData);
        showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} ${uniqueNumber} created effectively!`, 'success');
        document.getElementById('documentForm').reset();
        window.updateDocCustomerField();
        document.getElementById('docItemsContainer').innerHTML = '';
        window.addDocItemRow();
        window.calcDocTotal();
        loadRecentDocuments();
    } catch (err) {
        showToast("Error creating document: " + err.message, "error");
        console.error(err);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

export async function loadRecentDocuments() {
    const list = document.getElementById('recentDocumentsList');
    if (!list) return;
    try {
        const docs = await dbDocuments.fetchAll(state.branchId);
        if (!docs || docs.length === 0) {
            list.innerHTML = '<div class="text-center py-6 text-gray-400 text-sm">No documents generated yet.</div>';
            return;
        }

        const now = new Date();

        list.innerHTML = docs.slice(0, 15).map(d => {
            const isInvoice = d.type === 'invoice';
            const icon = isInvoice ? 'file-text' : 'receipt';
            const color = isInvoice ? 'text-indigo-600 bg-indigo-50 border-indigo-100' : 'text-emerald-600 bg-emerald-50 border-emerald-100';
            
            let status = d.status || (isInvoice ? 'sent' : 'paid');
            if (isInvoice && status === 'sent' && d.due_date && new Date(d.due_date) < now) {
                status = 'overdue';
            }

            let statusBadge = '';
            if (status === 'paid') {
                statusBadge = '<span class="text-[9px] font-black px-2 py-0.5 rounded-full uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">Paid</span>';
            } else if (status === 'partially_paid') {
                statusBadge = `<span class="text-[9px] font-black px-2 py-0.5 rounded-full uppercase bg-amber-50 text-amber-700 border border-amber-200">Partial (Due: ${fmt.currency(d.balance_due || 0)})</span>`;
            } else if (status === 'overdue') {
                statusBadge = '<span class="text-[9px] font-black px-2 py-0.5 rounded-full uppercase bg-red-50 text-red-700 border border-red-200 animate-pulse">Overdue</span>';
            } else if (status === 'draft') {
                statusBadge = '<span class="text-[9px] font-black px-2 py-0.5 rounded-full uppercase bg-gray-100 text-gray-600 border border-gray-200">Draft</span>';
            } else {
                statusBadge = '<span class="text-[9px] font-black px-2 py-0.5 rounded-full uppercase bg-blue-50 text-blue-700 border border-blue-200">Sent / Unpaid</span>';
            }

            return `
            <div class="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 bg-gray-50 border border-gray-100 rounded-xl hover:bg-white hover:shadow-sm transition-all gap-3">
                <div class="flex items-center gap-3 sm:gap-4 truncate">
                    <div class="w-10 h-10 rounded-xl ${color} border flex items-center justify-center flex-shrink-0">
                        <i data-lucide="${icon}" class="w-5 h-5"></i>
                    </div>
                    <div class="truncate">
                        <div class="flex items-center gap-2">
                            <p class="text-sm font-bold text-gray-900 truncate">${d.document_number} &bull; ${d.customer_name || 'Walk-in'}</p>
                            ${statusBadge}
                        </div>
                        <p class="text-[11px] text-gray-500 truncate pt-0.5">${d.description || 'No description'}</p>
                        <p class="text-[10px] text-gray-400 mt-0.5 font-medium">${fmt.date(d.created_at)} ${d.due_date ? `&bull; Due: ${fmt.date(d.due_date)}` : ''}</p>
                    </div>
                </div>
                <div class="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                    <div class="text-left sm:text-right">
                        <p class="text-base font-black text-gray-900">${fmt.currency(d.amount)}</p>
                        ${(d.balance_due && d.balance_due > 0 && status !== 'paid') ? `<p class="text-[10px] font-bold text-red-500">Bal: ${fmt.currency(d.balance_due)}</p>` : ''}
                    </div>
                    <div class="flex items-center gap-1.5">
                        <button onclick="downloadDocumentPDF('${d.id}')" title="Download High-Res PDF" class="p-2 bg-white border border-gray-200 rounded-xl text-gray-600 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 shadow-sm transition-all cursor-pointer">
                            <i data-lucide="download" class="w-4 h-4"></i>
                        </button>
                        <button onclick="window.shareInvoiceWhatsApp('${d.id}')" title="Share via WhatsApp (Enterprise)" class="p-2 bg-white border border-gray-200 rounded-xl text-emerald-600 hover:bg-emerald-50 hover:border-emerald-300 shadow-sm transition-all cursor-pointer">
                            <i data-lucide="message-circle" class="w-4 h-4"></i>
                        </button>
                        ${(isInvoice && status !== 'paid') ? `
                        <button onclick="window.openUpdateInvoicePaymentModal('${d.id}')" title="Record Payment" class="p-2 bg-white border border-gray-200 rounded-xl text-indigo-600 hover:bg-indigo-50 hover:border-indigo-300 shadow-sm transition-all cursor-pointer">
                            <i data-lucide="credit-card" class="w-4 h-4"></i>
                        </button>
                        ` : ''}
                    </div>
                </div>
            </div>
            `;
        }).join('');
        lucide.createIcons();
    } catch (e) {
        list.innerHTML = '<div class="text-center py-6 text-red-500 text-sm">To use this module, please run the latest database migration schema containing the documents table.</div>';
    }
};

window.shareInvoiceWhatsApp = async function(docId) {
    if (typeof window.hasFeature === 'function' && !window.hasFeature('whatsapp_invoicing')) {
        if (typeof window.openPlanUpgradeModal === 'function') {
            window.openPlanUpgradeModal('whatsapp_invoicing');
        } else {
            showToast('WhatsApp Invoicing is an Enterprise & Exclusive feature. Please upgrade your plan.', 'warning');
        }
        return;
    }

    try {
        const d = await dbDocuments.fetchOne(docId);
        if (!d) { showToast('Document not found', 'error'); return; }

        const entName = state.enterpriseName || state.profile?.business_name || 'BMS Enterprise';
        const invSettings = state.branchProfile?.invoice_settings || state.profile?.invoice_settings || {};
        const momoProvider = invSettings.mobile_money_provider || 'M-Pesa';
        const momoTill = invSettings.mobile_money_till || '';
        const momoPaybill = invSettings.mobile_money_paybill || '';
        const bankName = invSettings.bank_name || '';
        const bankAcc = invSettings.bank_account_no || '';
        const instructions = invSettings.mobile_money_instructions || '';

        let msg = `*${d.type.toUpperCase()}: ${d.document_number}*\n\n`;
        msg += `Dear *${d.customer_name || 'Customer'}*,\n`;
        msg += `Here is your document details from *${entName}*:\n`;
        msg += `• Total Amount: *${fmt.currency(d.amount)}*\n`;
        if (d.balance_due && d.balance_due > 0) {
            msg += `• Balance Due: *${fmt.currency(d.balance_due)}*\n`;
        }
        if (d.due_date) {
            msg += `• Due Date: *${fmt.date(d.due_date)}*\n`;
        }

        if (momoTill || momoPaybill || bankAcc) {
            msg += `\n*Payment Details:*\n`;
            if (momoTill) msg += `• ${momoProvider} (Lipa Namba/Till): *${momoTill}*\n`;
            if (momoPaybill) msg += `• Paybill: *${momoPaybill}* | Acc: *${d.document_number}*\n`;
            if (instructions) msg += `• Info: ${instructions}\n`;
            if (bankAcc) msg += `• Bank: *${bankName}* - Acc: *${bankAcc}*\n`;
        }

        msg += `\nThank you for doing business with us!`;

        let phone = (d.customer_phone || '').replace(/[^0-9]/g, '');
        if (phone.startsWith('0')) {
            phone = '255' + phone.substring(1);
        }

        const url = phone 
            ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
            : `https://wa.me/?text=${encodeURIComponent(msg)}`;

        window.open(url, '_blank');
    } catch (err) {
        showToast('WhatsApp dispatch error: ' + err.message, 'error');
    }
};

window.openUpdateInvoicePaymentModal = async function(docId) {
    try {
        const d = await dbDocuments.fetchOne(docId);
        if (!d) return;

        const modalHtml = `
        <div id="paymentModalOverlay" class="fixed inset-0 z-[50000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div class="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-gray-100 dark:border-gray-800">
                <div class="flex items-center justify-between">
                    <h3 class="text-base font-bold text-gray-900 dark:text-white">Record Payment on ${d.document_number}</h3>
                    <button onclick="document.getElementById('paymentModalOverlay').remove()" class="p-1.5 text-gray-400 hover:text-gray-600 rounded-xl"><i data-lucide="x" class="w-4 h-4"></i></button>
                </div>
                <div class="p-3.5 bg-gray-50 rounded-2xl space-y-1 text-xs">
                    <p class="text-gray-500">Total Invoice Amount: <strong class="text-gray-900 font-bold">${fmt.currency(d.amount)}</strong></p>
                    <p class="text-gray-500">Current Paid: <strong class="text-emerald-600 font-bold">${fmt.currency(d.paid_amount || 0)}</strong></p>
                    <p class="text-gray-500">Remaining Balance: <strong class="text-red-600 font-bold">${fmt.currency(d.balance_due || d.amount)}</strong></p>
                </div>
                <div class="space-y-3">
                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-1">New Payment Received</label>
                        <input type="number" step="0.01" id="recPayAmount" value="${d.balance_due || d.amount}" class="form-input w-full rounded-xl text-sm font-bold">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 mb-1">Payment Method</label>
                        <select id="recPayMethod" class="form-input w-full rounded-xl text-sm">
                            <option value="Cash">Cash</option>
                            <option value="M-Pesa">M-Pesa</option>
                            <option value="Bank Transfer">Bank Transfer</option>
                            <option value="Airtel Money">Airtel Money</option>
                            <option value="Halopesa">HaloPesa</option>
                        </select>
                    </div>
                </div>
                <div class="flex gap-2 pt-2">
                    <button onclick="document.getElementById('paymentModalOverlay').remove()" class="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold">Cancel</button>
                    <button onclick="window.submitInvoicePayment('${d.id}', ${d.amount}, ${d.paid_amount || 0})" class="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all">Save Payment</button>
                </div>
            </div>
        </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        if (window.lucide) lucide.createIcons();
    } catch (e) {
        showToast(e.message, 'error');
    }
};

window.submitInvoicePayment = async function(docId, totalAmount, previousPaid) {
    const newPaid = parseFloat(document.getElementById('recPayAmount')?.value) || 0;
    const method = document.getElementById('recPayMethod')?.value || 'Cash';
    if (newPaid <= 0) {
        showToast('Please enter a valid payment amount', 'warning');
        return;
    }

    const totalPaidNow = previousPaid + newPaid;
    const newBalance = Math.max(0, totalAmount - totalPaidNow);
    const newStatus = newBalance <= 0 ? 'paid' : 'partially_paid';

    try {
        await supabase.from('documents').update({
            paid_amount: totalPaidNow,
            balance_due: newBalance,
            status: newStatus,
            payment_method: method
        }).eq('id', docId);

        document.getElementById('paymentModalOverlay')?.remove();
        showToast('Payment recorded successfully!', 'success');
        loadRecentDocuments();
    } catch (err) {
        showToast('Failed updating payment: ' + err.message, 'error');
    }
};
