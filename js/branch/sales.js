
export function generateReceipt(sale, format) {

    try {
        const prof = state.profile || state.currentProfile || {};

        const entName = prof.business_name || prof.full_name || 'Business';

        let branchName = state.currentUser || 'Branch';
        if (state.role === 'owner' && state.branches && state.branches.length > 0) {
            if (sale.branches && sale.branches.name) {
                branchName = sale.branches.name;
            } else if (state.branches.find(b => b.id === sale.branch_id)) {
                branchName = state.branches.find(b => b.id === sale.branch_id).name;
            }
        }

        const phone = prof.mobile_number || prof.phone || '';
        const address = prof.address || '';
        const email = prof.email || '';

        const taxId = prof.tax_id || '';

        const dateObj = new Date(sale.created_at || Date.now());
        const dateStr = dateObj.toISOString().slice(0, 10);
        const timeStr = dateObj.toLocaleTimeString();
        const transId = 'S-' + (sale.id || Date.now()).toString().slice(-13);
        const totalFormatted = fmt.currency(sale.amount || 0);

        // Build itemized list for thermal receipt
        let lineItemsList = [];
        if (Array.isArray(sale.cart_items) && sale.cart_items.length > 0) {
            lineItemsList = sale.cart_items;
        } else if (typeof sale.items === 'string' && sale.items.includes(',')) {
            const parts = sale.items.split(',').map(p => p.trim());
            lineItemsList = parts.map(p => {
                const match = p.match(/^(\d+)x\s*(.*)$/);
                if (match) {
                    return { name: match[2], qty: match[1], unit_price: null, subtotal: null };
                }
                return { name: p, qty: 1, unit_price: null, subtotal: null };
            });
        } else {
            let itemTitle = sale.items || 'Walk-in Sale';
            let itemQty = sale.quantity || '1';
            let itemPriceRaw = sale.amount || 0;
            const match = itemTitle.match(/^(\d+)x\s*(.*)$/);
            if (match) {
                itemQty = match[1];
                itemTitle = match[2];
                itemPriceRaw = (sale.amount || 0) / parseInt(itemQty);
            }
            lineItemsList = [{
                name: itemTitle,
                qty: itemQty,
                unit_price: itemPriceRaw,
                subtotal: sale.amount || 0
            }];
        }

        const itemsRowsHtml = lineItemsList.map(item => {
            const priceText = item.unit_price ? fmt.currency(item.unit_price * (parseInt(item.qty) || 1)) : (item.subtotal ? fmt.currency(item.subtotal) : '—');
            return `
            <div style="font-size:12px;margin-bottom:2px;font-weight:bold;">${item.name}</div>
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px;">
                <span style="flex:2;"></span>
                <span style="flex:0.5;text-align:right;">${item.qty}x</span>
                <span style="flex:1;text-align:right;">${priceText}</span>
            </div>`;
        }).join('');

        const receiptDiv = document.createElement('div');
        receiptDiv.id = 'receipt-render-target';
        receiptDiv.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;';
        receiptDiv.innerHTML = `
<div style="width:320px;font-family:'Courier New',Courier,monospace;background:#fff;color:#000;padding:0;">
    <div style="width:100%;overflow:hidden;line-height:0;">
        <svg width="320" height="14" viewBox="0 0 320 14" style="display:block;">
            <path d="M0 14 ${Array.from({ length: 32 }, (_, i) => `L${i * 10 + 5} 0 L${(i + 1) * 10} 14`).join(' ')}" fill="#000"/>
        </svg>
    </div>
    <div style="padding:16px 20px 8px;">
        <div style="text-align:center;margin-bottom:8px;">
            <div style="font-size:17px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">${entName}</div>
            <div style="font-size:14px;font-weight:bold;margin-top:2px;text-transform:uppercase;">${branchName}</div>
            ${(phone || address || email) ? `
            <div style="font-size:11px;margin-top:6px;line-height:1.4;">
                ${address ? `<div>${address}</div>` : ''}
                ${phone ? `<div>Tel: ${phone}</div>` : ''}
                ${email ? `<div>Email: ${email}</div>` : ''}
            </div>
            ` : ''}
            ${taxId ? `
            <div style="font-size:11px;margin-top:4px;font-weight:bold;">Tax ID: ${taxId}</div>
            ` : ''}
        </div>
        <div style="border-top:2px solid #000;margin:10px 0;"></div>
        <div style="text-align:center;font-size:15px;font-weight:bold;margin:8px 0;">SALES RECEIPT</div>
        <div style="border-top:1px solid #000;margin:8px 0;"></div>
        <div style="font-size:12px;line-height:1.7;">
            <div>Date: ${dateStr}</div>
            <div>Time: ${timeStr}</div>
            <div>Customer: ${(sale.customer || 'WALK IN').toUpperCase()}</div>
            ${sale.customer_address ? `<div style="font-size:10px;color:#444;">Address: ${sale.customer_address}</div>` : ''}
        </div>
        <div style="border-top:1px solid #000;margin:8px 0;"></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:bold;margin-bottom:4px;">
            <span style="flex:2;">ITEM/DESCRIPTION</span>
            <span style="flex:0.5;text-align:right;">QTY</span>
            <span style="flex:1;text-align:right;">PRICE</span>
        </div>
        ${itemsRowsHtml}
        <div style="height:12px;"></div>
        <div style="border-top:1px solid #000;margin:8px 0;"></div>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px;">
            <span>Subtotal:</span><span>${totalFormatted}</span>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:16px;font-weight:bold;margin-bottom:8px;">
            <span>TOTAL:</span><span>${totalFormatted}</span>
        </div>
        <div style="font-size:12px;margin-bottom:4px;">Payment: ${sale.payment || 'Cash'}</div>
        <div style="border-top:1px solid #000;margin:10px 0;"></div>
        <div style="text-align:center;font-size:12px;line-height:1.6;margin-bottom:8px;">
            <div style="font-weight:bold;">Thank you for your business!</div>
            <div>Visit us again</div>
        </div>
        <div style="border-top:1px dashed #000;margin:8px 0;"></div>
        <div style="text-align:center;font-size:10px;color:#444;margin-bottom:8px;">Trans ID: ${transId}</div>
    </div>
    <div style="width:100%;overflow:hidden;line-height:0;">
        <svg width="320" height="14" viewBox="0 0 320 14" style="display:block;">
            <path d="M0 0 ${Array.from({ length: 32 }, (_, i) => `L${i * 10 + 5} 14 L${(i + 1) * 10} 0`).join(' ')}" fill="#000"/>
        </svg>
    </div>
</div>`;
        document.body.appendChild(receiptDiv);

        const loadScript = (url) => new Promise((res, rej) => {
            const s = document.createElement('script');
            s.src = url;
            s.onload = res;
            s.onerror = rej;
            document.head.appendChild(s);
        });

        if (format === 'print') {
            const printWin = window.open('', '_blank');
            if (printWin) {
                printWin.document.write(`
                    <html>
                        <head>
                            <title>Receipt ${transId}</title>
                            <style>
                                html, body { height: 100%; margin: 0; }
                                body { display: flex; justify-content: center; align-items: center; background: #fff; }
                                @media print {
                                    @page { margin: 0; size: auto; }
                                    html, body { height: 100%; margin: 0; }
                                    body { display: flex; justify-content: center; align-items: center; }
                                }
                            </style>
                        </head>
                        <body>
                            ${receiptDiv.innerHTML}
                            <script>
                                setTimeout(() => {
                                    window.print();
                                    window.close();
                                }, 500);
                            </script>
                        </body>
                    </html>
                `);
                printWin.document.close();
                receiptDiv.remove();
            } else {
                showToast('Popup blocked. Please allow popups to print.', 'error');
                receiptDiv.remove();
            }
        } else if (format === 'pdf') {
            const target = receiptDiv.querySelector('div');
            const doPdf = async () => {
                try {
                    const cvs = await window.html2canvas(target, { scale: 2, backgroundColor: '#fff' });
                    const imgData = cvs.toDataURL('image/png');
                    const pxW = cvs.width;
                    const pxH = cvs.height;
                    const mmW = (pxW / 2) * 0.264583;
                    const mmH = (pxH / 2) * 0.264583;
                    const { jsPDF } = window.jspdf;
                    const pdf = new jsPDF({ unit: 'mm', format: [mmW, mmH] });
                    pdf.addImage(imgData, 'PNG', 0, 0, mmW, mmH);
                    pdf.save(`receipt-${transId}.pdf`);
                    showToast('PDF receipt downloaded', 'success');
                } catch (err) {
                    console.error(err);
                    showToast('Failed to generate PDF', 'error');
                } finally {
                    receiptDiv.remove();
                }
            };
            const needed = [];
            if (!window.html2canvas) needed.push(loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'));
            if (!window.jspdf) needed.push(loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'));
            Promise.all(needed).then(doPdf).catch(() => {
                receiptDiv.remove();
                showToast('Failed to load PDF library', 'error');
            });
        } else if (format === 'img') {
            const target = receiptDiv.querySelector('div');
            const doImg = () => {
                window.html2canvas(target, { scale: 2, backgroundColor: '#fff' }).then(cvs => {
                    const link = document.createElement('a');
                    link.download = `receipt-${transId}.png`;
                    link.href = cvs.toDataURL('image/png');
                    link.click();
                    receiptDiv.remove();
                    showToast('Image receipt downloaded', 'success');
                }).catch(err => {
                    console.error(err);
                    receiptDiv.remove();
                    showToast('Failed to generate image', 'error');
                });
            };
            if (window.html2canvas) {
                doImg();
            } else {
                loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js')
                    .then(doImg)
                    .catch(() => {
                        receiptDiv.remove();
                        showToast('Failed to load image library', 'error');
                    });
            }
        }
    } catch (err) {
        console.error('[Receipt] Fatal error in generateReceipt:', err);
        showToast('Receipt generation failed', 'error');
    }
};

export async function copySale(saleStr) {
    try {
        const sale = JSON.parse(decodeURIComponent(saleStr));
        const dateObj = new Date(sale.created_at || Date.now());
        const text = [
            `Product: ${sale.items || 'Unknown'}`,
            `Total: ${fmt.currency(sale.amount || 0)}`,
            `Payment: ${sale.payment || 'Cash'}`,
            `Customer: ${sale.customer || 'Walk-in'}`,
            `Date: ${dateObj.toLocaleString()}`
        ].join('\n');

        await navigator.clipboard.writeText(text);
        showToast('Copied to clipboard', 'success');
    } catch (err) {
        showToast('Copy failed', 'error');
    }
};

export function showReceiptDialog(saleStr) {

    try {
        const sale = JSON.parse(decodeURIComponent(saleStr));

        document.querySelectorAll('.receipt-format-popup').forEach(el => {

            el.remove();
        });

        const popup = document.createElement('div');
        popup.className = 'receipt-format-popup';

        popup.style.cssText = 'position:fixed !important; inset:0 !important; z-index:10000 !important; display:flex !important; align-items:center !important; justify-content:center !important; padding:1rem;';

        popup.innerHTML = `
            <div class="receipt-format-overlay" style="position:absolute; inset:0; background:rgba(0,0,0,0.45); backdrop-filter:blur(4px);"></div>
            <div class="receipt-format-dialog" style="position:relative; background:white; border-radius:1.5rem; padding:1.75rem; width:100%; max-width:320px; box-shadow:0 25px 50px -12px rgba(0,0,0,0.25);">
                <div style="font-weight:800; font-size:1.2rem; margin-bottom:1.25rem; text-align:center; color:#111827; letter-spacing:-0.025em;">Download Receipt</div>
                <div style="display:flex; gap:0.75rem; margin-bottom:1rem;">
                    <button class="receipt-fmt-btn" data-fmt="img" style="background:linear-gradient(135deg, #10b981, #059669); flex:1; border:none; color:white; padding:0.85rem; border-radius:1rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.5rem;">
                        <i data-lucide="image" class="w-4 h-4"></i> Image
                    </button>
                    <button class="receipt-fmt-btn" data-fmt="pdf" style="background:linear-gradient(135deg, #ef4444, #dc2626); flex:1; border:none; color:white; padding:0.85rem; border-radius:1rem; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:0.5rem;">
                        <i data-lucide="file-text" class="w-4 h-4"></i> PDF
                    </button>
                </div>
                <div style="text-align:center; margin-top:1.5rem; margin-bottom:0.5rem;">
                    <a href="#" class="receipt-fmt-print" style="color:#4f46e5; text-decoration:none; font-size:0.95rem; font-weight:700; border-bottom:2px solid #4f46e5; padding-bottom:2px;">Print Receipt</a>
                </div>
                <button class="receipt-fmt-cancel bg-red-600 text-white hover:bg-red-700 shadow-sm font-bold border-none" >Cancel</button>
            </div>
        `;
        document.body.appendChild(popup);

        if (window.lucide) {
            window.lucide.createIcons();
        } else {

        }

        const closePopup = () => {

            popup.remove();
        };
        popup.querySelector('.receipt-format-overlay').addEventListener('click', closePopup);
        popup.querySelector('.receipt-fmt-cancel').addEventListener('click', closePopup);

        popup.querySelector('.receipt-fmt-print').addEventListener('click', (e) => {
            e.preventDefault();

            closePopup();
            window.generateReceipt(sale, 'print');
        });

        popup.querySelectorAll('.receipt-fmt-btn').forEach(fmtBtn => {
            fmtBtn.addEventListener('click', () => {
                const fmt = fmtBtn.dataset.fmt;

                closePopup();
                window.generateReceipt(sale, fmt);
            });
        });

    } catch (err) {
        console.error('[Receipt] Error in showReceiptDialog:', err);
        showToast('Failed to open receipt dialog', 'error');
    }
};

let salesSelection = new Set();
window.salesSelection = salesSelection;
let salesPageState = {
    page: 1,
    pageSize: 10,
    totalCount: 0,
    filterMode: 'today', // 'today' | 'history'
    historyRange: 'all', // 'all' | 'yesterday' | '7d' | '30d'
    searchQuery: ''
};
window.salesPageState = salesPageState;

export function changeSalesPage(delta) {
    const newPage = salesPageState.page + delta;
    const maxPage = Math.ceil(salesPageState.totalCount / salesPageState.pageSize) || 1;
    if (newPage < 1 || newPage > maxPage) return;
    salesPageState.page = newPage;
    salesSelection.clear();
    refreshSalesModuleData();
}
window.changeSalesPage = changeSalesPage;

export function changeSalesPageTo(page) {
    const maxPage = Math.ceil(salesPageState.totalCount / salesPageState.pageSize) || 1;
    if (page < 1 || page > maxPage || page === salesPageState.page) return;
    salesPageState.page = page;
    salesSelection.clear();
    refreshSalesModuleData();
}
window.changeSalesPageTo = changeSalesPageTo;

export function changeSalesPageSize(size) {
    salesPageState.pageSize = parseInt(size, 10) || 10;
    salesPageState.page = 1;
    salesSelection.clear();
    const labelDesktop = document.getElementById('label-salesPageSizeSelect');
    if (labelDesktop) labelDesktop.textContent = `${salesPageState.pageSize} / page`;
    const labelMobile = document.getElementById('label-salesPageSizeSelectMobile');
    if (labelMobile) labelMobile.textContent = `${salesPageState.pageSize} / page`;
    refreshSalesModuleData();
}
window.changeSalesPageSize = changeSalesPageSize;

export function renderSalesPageSizeDroplist(id = 'salesPageSizeSelect', isMobile = false) {
    const options = [
        { value: '10', label: '10 / page' },
        { value: '25', label: '25 / page' },
        { value: '50', label: '50 / page' }
    ];
    if (typeof window.renderPremiumSelect === 'function') {
        return window.renderPremiumSelect({
            id,
            options,
            selectedValue: String(salesPageState.pageSize),
            placeholder: `${salesPageState.pageSize} / page`,
            searchable: false,
            classes: `!h-8 !py-1 !px-2.5 !text-xs !rounded-xl !bg-gray-50 dark:!bg-gray-900 !border !border-gray-200 dark:!border-gray-700 !font-bold !text-gray-800 dark:!text-gray-200 !shadow-2xs !pr-7 ${isMobile ? 'w-24' : 'w-28'}`,
            onChange: 'changeSalesPageSize(this.value)'
        });
    }

    return `
        <select onchange="changeSalesPageSize(this.value)" class="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer">
            <option value="10" ${salesPageState.pageSize === 10 ? 'selected' : ''}>10 / page</option>
            <option value="25" ${salesPageState.pageSize === 25 ? 'selected' : ''}>25 / page</option>
            <option value="50" ${salesPageState.pageSize === 50 ? 'selected' : ''}>50 / page</option>
        </select>
    `;
}
window.renderSalesPageSizeDroplist = renderSalesPageSizeDroplist;

export function setSalesFilterMode(mode) {
    if (salesPageState.filterMode === mode) return;
    salesPageState.filterMode = mode;
    salesPageState.page = 1;
    salesSelection.clear();
    updateSalesFilterUI();
    refreshSalesModuleData();
}
window.setSalesFilterMode = setSalesFilterMode;

export function setSalesHistoryRange(range) {
    if (salesPageState.historyRange === range) return;
    salesPageState.historyRange = range;
    salesPageState.page = 1;
    salesSelection.clear();
    updateSalesFilterUI();
    refreshSalesModuleData();
}
window.setSalesHistoryRange = setSalesHistoryRange;

let _salesSearchDebounce = null;
export function handleSalesSearchInput(value) {
    salesPageState.searchQuery = (value || '').trim();
    clearTimeout(_salesSearchDebounce);
    _salesSearchDebounce = setTimeout(() => {
        salesPageState.page = 1;
        salesSelection.clear();
        refreshSalesModuleData();
    }, 300);
}
window.handleSalesSearchInput = handleSalesSearchInput;

export function updateSalesFilterUI() {
    const todayBtn = document.getElementById('btnFilterTodaySales');
    const historyBtn = document.getElementById('btnFilterHistorySales');
    const historyPills = document.getElementById('salesHistoryRangePills');
    const searchInput = document.getElementById('salesSearchInput');
    const modeBadge = document.getElementById('salesFilterModeBadge');
    const ledgerTitle = document.getElementById('salesLedgerTitle');

    if (ledgerTitle) {
        ledgerTitle.textContent = salesPageState.filterMode === 'today' ? window.t('todays_sales', "Today's Sales") : window.t('sales_history', 'Sales History');
    }

    if (todayBtn && historyBtn) {
        if (salesPageState.filterMode === 'today') {
            todayBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 bg-emerald-600 text-white shadow-sm';
            const dot = todayBtn.querySelector('.today-dot');
            if (dot) {
                dot.className = 'today-dot w-2 h-2 rounded-full bg-white animate-pulse';
            }

            historyBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50';
            if (historyPills) {
                historyPills.classList.add('hidden');
                historyPills.classList.remove('flex');
            }
            if (searchInput) searchInput.placeholder = window.t('search_today_sales', "Search today's sales by product, customer, or tags...");
            if (modeBadge) {
                modeBadge.textContent = "Today's Orders";
                modeBadge.className = 'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
            }
        } else {
            todayBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50';
            const dot = todayBtn.querySelector('.today-dot');
            if (dot) {
                dot.className = 'today-dot w-2 h-2 rounded-full bg-gray-400';
            }

            historyBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 bg-indigo-600 text-white shadow-sm';
            if (historyPills) {
                historyPills.classList.remove('hidden');
                historyPills.classList.add('flex');
                historyPills.querySelectorAll('button[data-range]').forEach(btn => {
                    const r = btn.getAttribute('data-range');
                    if (r === salesPageState.historyRange) {
                        btn.className = 'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800';
                    } else {
                        btn.className = 'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700';
                    }
                });
            }
            if (searchInput) searchInput.placeholder = window.t('search_all_sales', 'Search sales history by product, customer, or tags...');
            if (modeBadge) {
                const label = salesPageState.historyRange === 'yesterday' ? "Yesterday" : (salesPageState.historyRange === '7d' ? "Last 7 Days" : (salesPageState.historyRange === '30d' ? "Last 30 Days" : "All History"));
                modeBadge.textContent = label;
                modeBadge.className = 'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800';
            }
        }
    }
}
window.updateSalesFilterUI = updateSalesFilterUI;

export function toggleSaleSelection(id) {
    if (salesSelection.has(id)) {
        salesSelection.delete(id);
    } else {
        salesSelection.add(id);
    }
    updateBulkActionBar();
}

export function toggleSelectAllSales(checked) {
    const checkboxes = document.querySelectorAll('.sale-checkbox');
    salesSelection.clear();
    checkboxes.forEach(cb => {
        cb.checked = checked;
        if (checked) salesSelection.add(cb.value);
    });
    updateBulkActionBar();
}

export function updateBulkActionBar() {
    const count = salesSelection.size;
    const countSpan = document.getElementById('salesSelectedCount');
    if (countSpan) countSpan.textContent = `${count} selected`;

    const deleteBtn = document.getElementById('btnBulkDeleteSales');
    if (deleteBtn) deleteBtn.disabled = count === 0;

    const tagBtn = document.getElementById('btnBulkTagSales');
    if (tagBtn) tagBtn.disabled = count === 0;

    const selectAll = document.getElementById('selectAllSales');
    const checkboxes = document.querySelectorAll('.sale-checkbox');
    if (selectAll && checkboxes.length > 0) {
        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        selectAll.checked = checkedCount === checkboxes.length && checkboxes.length > 0;
        selectAll.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
    }
};

export async function bulkDeleteSelectedSales() {
    const count = salesSelection.size;
    if (count === 0) return;

    const confirmed = await window.confirmModal('Confirm Deletion', 'Are you sure you want to delete the selected items?', 'Yes, Delete', 'Cancel');
    if (!confirmed) return;

    try {
        const ids = Array.from(salesSelection);
        await dbSales.bulkDelete(ids);
        salesSelection.clear();
        showToast(`Successfully deleted ${count} sales`, 'success');
        renderSalesModule();
    } catch (err) {
        showToast('Failed to delete sales: ' + err.message, 'error');
    }
}

export async function bulkTagSelectedSales() {
    const count = salesSelection.size;
    if (count === 0) return;
    openSalesTagModal(null, true);
}

export async function openSalesTagModal(saleId, isBulk = false) {

    document.querySelectorAll('.tags-modal-overlay').forEach(el => el.remove());

    const title = isBulk ? `Tag ${salesSelection.size} Sales` : 'Manage Sale Tags';

    let currentTags = [];
    if (!isBulk && saleId) {
        try {
            const allTags = await dbSaleTags.fetchAll(state.branchId);
            currentTags = allTags.filter(t => t.sale_id === saleId);
        } catch (err) { console.error(err); }
    }

    const overlay = document.createElement('div');
    overlay.className = 'tags-modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm transition-opacity duration-200';
    overlay.style.opacity = '0';

    overlay.innerHTML = `
        <div class="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden transform scale-95 transition-transform duration-200">
            <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <i data-lucide="tag" class="w-5 h-5 text-indigo-500"></i> ${title}
                </h3>
                <button type="button" class="close-tags-btn p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700 rounded-xl transition-colors">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <div class="p-6">
                <div class="flex gap-2 mb-6">
                    <input type="text" id="newTagName" placeholder="New tag name..." class="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                    <button id="submitTagBtn" class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2">
                        Add
                    </button>
                </div>

                ${!isBulk ? `
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Current Tags</p>
                    <div class="flex flex-wrap gap-2 mb-6" id="modalCurrentTags">
                        ${currentTags.length ? currentTags.map(t => `
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold">
                                # ${t.tag}
                                <i data-lucide="x" onclick="removeSaleTagModal('${t.id}', '${saleId}')" class="w-3.5 h-3.5 cursor-pointer hover:text-red-600"></i>
                            </span>
                        `).join('') : '<p class="text-xs text-gray-400 italic">No tags applied yet</p>'}
                    </div>
                ` : ''}

                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Suggested Tags</p>
                <div class="flex flex-wrap gap-2">
                    ${['Wholesale', 'Urgent', 'Review', 'Paid', 'Pending', 'Custom'].map(t => `
                        <button onclick="quickAddTag('${t}', '${saleId}', ${isBulk})" class="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:border-indigo-500 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all uppercase tracking-tight">
                            + ${t}
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button class="bg-gray-900 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors close-tags-btn">
                    Done
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    lucide.createIcons();

    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        overlay.querySelector('.transform').classList.replace('scale-95', 'scale-100');
    });

    const closeTagsModal = () => {
        overlay.style.opacity = '0';
        overlay.querySelector('.transform').classList.replace('scale-100', 'scale-95');
        setTimeout(() => overlay.remove(), 200);
        renderSalesModule();
    };

    overlay.querySelectorAll('.close-tags-btn').forEach(btn => btn.addEventListener('click', closeTagsModal));

    const submitBtn = overlay.querySelector('#submitTagBtn');
    const input = overlay.querySelector('#newTagName');

    const handleAdd = async () => {
        const tagName = input.value.trim();
        if (!tagName) return;

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>';

        try {
            if (isBulk) {
                const ids = Array.from(salesSelection);
                await Promise.all(ids.map(id => dbSaleTags.add(state.branchId, id, tagName)));
                showToast(`Applied tag to ${ids.length} items`, 'success');
                salesSelection.clear();
                closeTagsModal();
            } else {
                await dbSaleTags.add(state.branchId, saleId, tagName);
                showToast('Tag added', 'success');
                openSalesTagModal(saleId, false);
            }
        } catch (err) {
            showToast('Error adding tag', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add';
        }
    };

    submitBtn.addEventListener('click', handleAdd);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleAdd(); });

    window.removeSaleTagModal = async (tagId, saleId) => {
        try {
            await dbSaleTags.delete(tagId);
            openSalesTagModal(saleId, false);
        } catch (err) { showToast('Error', 'error'); }
    };

    window.quickAddTag = async (tagName, saleId, isBulk) => {
        input.value = tagName;
        handleAdd();
    };
};

export async function removeSaleTag(tagId) {
    try {
        await dbSaleTags.delete(tagId);
        showToast('Tag removed', 'success');
        renderSalesModule();
    } catch (err) {
        showToast('Failed to remove tag: ' + err.message, 'error');
    }
};

export function renderSalesModule() {
    salesSelection.clear();
    const container = document.getElementById('mainContent');

    const branch = state.branchProfile || (state.branches && state.branches.find(b => b.id === state.branchId)) || { name: 'Branch' };

    let shell = document.getElementById('salesShell');
    if (!shell) {
        container.innerHTML = `
        <div class="space-y-4 sm:space-y-5 slide-in" id="salesShell">
            <!-- Bento Top Header Strip -->
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div class="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div class="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center flex-shrink-0 text-emerald-600 dark:text-emerald-400">
                        <i data-lucide="shopping-cart" class="w-4 h-4 sm:w-6 sm:h-6"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <h2 class="text-sm sm:text-lg font-black text-gray-900 dark:text-white tracking-tight truncate">${window.t('sales_register', 'Sales Register')}</h2>
                        <p class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                            <i data-lucide="calendar" class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 shrink-0"></i>
                            <span class="truncate">${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                    <button onclick="openCameraScannerModal()" data-tooltip="Scan product barcode using camera or USB laser scanner" data-tooltip-title="Barcode Scanner" class="flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-700 rounded-xl text-[11px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap">
                        <i data-lucide="scan" class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400"></i>
                        <span>${window.t('scan_barcode', 'Scan Barcode')}</span>
                    </button>
                    <button onclick="openAddSaleModal()" data-tooltip="Open POS checkout to ring up product sales and print receipts" data-tooltip-title="New Sale" data-tooltip-variant="emerald" class="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all cursor-pointer shadow-xs whitespace-nowrap">
                        <i data-lucide="plus" class="w-3 h-3 sm:w-3.5 sm:h-3.5"></i>
                        <span>${window.t('new_sale', 'New Sale')}</span>
                    </button>
                </div>
            </div>

            <!-- Bento Top KPI Summary Row -->
            <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3.5" id="salesStatsGrid">
                ${[1, 2, 3, 4, 5].map(() => `<div class="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 animate-pulse h-16"></div>`).join('')}
            </div>

            <!-- Main Sales Ledger Container -->
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
                <div class="flex items-center justify-between mb-3.5">
                    <div>
                        <div class="flex items-center gap-2">
                            <h3 id="salesLedgerTitle" class="text-xs sm:text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">${salesPageState.filterMode === 'today' ? window.t('todays_sales', "Today's Sales") : window.t('sales_history', 'Sales History')}</h3>
                            <span id="salesFilterModeBadge" class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                ${salesPageState.filterMode === 'today' ? "Today's Orders" : (salesPageState.historyRange === 'yesterday' ? "Yesterday" : (salesPageState.historyRange === '7d' ? "Last 7 Days" : (salesPageState.historyRange === '30d' ? "Last 30 Days" : "All History")))}
                            </span>
                        </div>
                        <p class="text-[11px] text-gray-400 font-medium">${window.t('live_pos_records', 'Recent customer checkout orders')}</p>
                    </div>
                    <span id="salesPageInfoText" class="text-xs text-gray-400 font-medium">Loading...</span>
                </div>

                <!-- Scope Segmented Toggle & History Controls -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                    <div class="inline-flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-inner shrink-0">
                        <button type="button" id="btnFilterTodaySales" onclick="setSalesFilterMode('today')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${salesPageState.filterMode === 'today' ? 'bg-emerald-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50'}">
                            <span class="today-dot w-2 h-2 rounded-full ${salesPageState.filterMode === 'today' ? 'bg-white animate-pulse' : 'bg-gray-400'}"></span>
                            <span>${window.t('todays_sales', "Today's Sales")}</span>
                        </button>
                        <button type="button" id="btnFilterHistorySales" onclick="setSalesFilterMode('history')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${salesPageState.filterMode === 'history' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50'}">
                            <i data-lucide="history" class="w-3.5 h-3.5"></i>
                            <span>${window.t('sales_history', 'Sales History')}</span>
                        </button>
                    </div>

                    <!-- History Range Pills (Visible when in history mode) -->
                    <div id="salesHistoryRangePills" class="${salesPageState.filterMode === 'history' ? 'flex' : 'hidden'} items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                        <span class="text-[11px] font-semibold text-gray-400 mr-1 hidden sm:inline">${window.t('range', 'Range')}:</span>
                        <button type="button" data-range="all" onclick="setSalesHistoryRange('all')" class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${salesPageState.historyRange === 'all' ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800' : 'bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}">${window.t('all_history', 'All History')}</button>
                        <button type="button" data-range="yesterday" onclick="setSalesHistoryRange('yesterday')" class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${salesPageState.historyRange === 'yesterday' ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800' : 'bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}">${window.t('yesterday', 'Yesterday')}</button>
                        <button type="button" data-range="7d" onclick="setSalesHistoryRange('7d')" class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${salesPageState.historyRange === '7d' ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800' : 'bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}">${window.t('last_7_days', 'Last 7 Days')}</button>
                        <button type="button" data-range="30d" onclick="setSalesHistoryRange('30d')" class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${salesPageState.historyRange === '30d' ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800' : 'bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}">${window.t('last_30_days', 'Last 30 Days')}</button>
                    </div>

                    <!-- Items Per Page Selector (Premium Droplist) -->
                    <div class="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
                        <span>Show:</span>
                        ${renderSalesPageSizeDroplist('salesPageSizeSelect')}
                    </div>
                </div>

                <!-- Instant Search Input (Server-Side Debounced) -->
                <div class="relative mb-3">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                        <i data-lucide="search" class="w-4 h-4 text-gray-400"></i>
                    </div>
                    <input type="text" id="salesSearchInput" value="${salesPageState.searchQuery || ''}" placeholder="${salesPageState.filterMode === 'today' ? window.t('search_today_sales', "Search today's sales by product, customer, or tags...") : window.t('search_all_sales', 'Search sales history by product, customer, or tags...')}" oninput="handleSalesSearchInput(this.value)" class="w-full pl-10 pr-3.5 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder-gray-400" style="padding-left: 2.75rem !important;">
                </div>

                <!-- Select All Action Bar -->
                <div class="flex flex-wrap items-center justify-between bg-gray-50/70 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl p-2.5 mb-3.5 gap-2">
                    <div class="flex items-center gap-2.5 pl-1">
                        <input type="checkbox" id="selectAllSales" onchange="toggleSelectAllSales(this.checked)" class="rounded w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500 cursor-pointer">
                        <span class="text-xs font-bold text-gray-800 dark:text-gray-200">${window.t('select_all', 'Select All')} <span id="salesSelectedCount" class="font-normal text-xs text-gray-400 ml-1 hidden sm:inline-block">0 selected</span></span>
                    </div>
                    <div class="flex flex-wrap items-center gap-1.5">
                        <button id="btnBulkDeleteSales" disabled onclick="bulkDeleteSelectedSales()" data-tooltip="Delete checked sales and restore item inventory stock" data-tooltip-title="Bulk Delete" data-tooltip-variant="rose" class="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5 text-gray-400"></i>
                            <span class="hidden sm:inline-block">${window.t('delete_selected', 'Delete Selected')}</span>
                        </button>
                        <button id="btnBulkTagSales" disabled onclick="bulkTagSelectedSales()" data-tooltip="Apply categorized tag labels to checked sales" data-tooltip-title="Bulk Tag" data-tooltip-variant="indigo" class="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-indigo-50 hover:text-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                            <i data-lucide="tag" class="w-3.5 h-3.5 text-indigo-500"></i>
                            <span class="hidden sm:inline-block">${window.t('apply_tag', 'Apply Tag')}</span>
                        </button>
                    </div>
                </div>

                <!-- Sales List Container -->
                <div class="space-y-2.5" id="salesList">
                    ${[1, 2, 3].map(() => `<div class="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 animate-pulse h-20"></div>`).join('')}
                </div>

                <div id="salesPaginationFooter"></div>
            </div>
        </div>`;
        if (window.lucide) lucide.createIcons();
    }

    updateSalesFilterUI();
    refreshSalesModuleData();
    return '';
}

function renderSalesStatsDOM(summary, profit, breakdown = null) {
    const statsGrid = document.getElementById('salesStatsGrid');
    if (!statsGrid || !summary || !profit) return;

    const currencySymbol = (window.fmt && window.fmt.getSymbol) ? window.fmt.getSymbol() : 'TSh';
    const targetVal = state.branchProfile?.target || 0;
    const todayTotal = Number(summary.today_total || 0);
    const txCount = Number(summary.transaction_count || 0);
    const avgSale = Number(summary.avg_sale || 0);
    const grossProfit = Number(profit.gross_profit || 0);
    const targetPct = targetVal > 0 ? Math.min(100, Math.round((todayTotal / targetVal) * 100)) : 0;

    // Compute separate product order count and service count
    const prodOrders = breakdown?.productOrders !== undefined ? breakdown.productOrders : (summary?.product_orders_count !== undefined ? summary.product_orders_count : null);
    const svcs = breakdown?.services !== undefined ? breakdown.services : (summary?.services_count || 0);

    let orderSubtitle = `${txCount} orders`;
    let txSubtitle = window.t('pos_checkout', 'POS Live');

    if (prodOrders !== null || svcs > 0) {
        const resolvedProd = prodOrders !== null ? prodOrders : Math.max(0, txCount - svcs);
        if (svcs > 0) {
            orderSubtitle = `${resolvedProd} ${resolvedProd === 1 ? 'order' : 'orders'}, ${svcs} ${svcs === 1 ? 'service' : 'services'}`;
            txSubtitle = `${resolvedProd} ord · ${svcs} svc`;
        } else {
            orderSubtitle = `${resolvedProd} ${resolvedProd === 1 ? 'order' : 'orders'}`;
            txSubtitle = window.t('pos_checkout', 'POS Live');
        }
    }

    statsGrid.innerHTML = `
        <!-- Today's Total Sales -->
        <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card flex flex-col justify-between h-full min-w-0">
            <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs z-10">${currencySymbol}</div>
            <div class="flex items-center justify-between mb-1.5 pr-10">
                <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight truncate block">${window.t('todays_sales', "Today's Sales")}</span>
            </div>
            <div class="min-w-0 mt-auto pr-9">
                <p class="text-dynamic-lg font-black text-emerald-600 dark:text-emerald-400 truncate leading-tight" title="${fmt.currency(todayTotal)}">${fmt.number(todayTotal)}</p>
                <p class="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">${orderSubtitle}</p>
            </div>
            <svg class="absolute bottom-2 right-2 w-5 h-3 text-emerald-500 opacity-75" viewBox="0 0 36 24" fill="currentColor">
                <rect x="2" y="14" width="4.5" height="10" rx="1.5"/>
                <rect x="9" y="8" width="4.5" height="16" rx="1.5"/>
                <rect x="16" y="11" width="4.5" height="13" rx="1.5"/>
                <rect x="23" y="5" width="4.5" height="19" rx="1.5"/>
                <rect x="30" y="2" width="4.5" height="22" rx="1.5"/>
            </svg>
        </div>

        <!-- Transactions Count -->
        <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card flex flex-col justify-between h-full min-w-0">
            <div class="flex items-center justify-between mb-1.5 pr-10">
                <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight truncate block">${window.t('transactions', 'Transactions')}</span>
            </div>
            <div class="min-w-0 mt-auto pr-9">
                <p class="text-dynamic-lg font-black text-gray-900 dark:text-white truncate leading-tight">${txCount}</p>
                <p class="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5 truncate">${txSubtitle}</p>
            </div>
            <svg class="absolute bottom-2 right-2 w-5.5 h-3.5 opacity-75" viewBox="0 0 40 24" fill="none">
                <path d="M2 18 L10 12 L18 16 L26 8 L38 4" stroke="#3B86F7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="38" cy="4" r="2.5" fill="#3B86F7"/>
            </svg>
        </div>

        <!-- Daily Target Goal -->
        <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card flex flex-col justify-between h-full min-w-0">
            <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-2xs z-10">${currencySymbol}</div>
            <div class="flex items-center justify-between mb-1.5 pr-10">
                <span class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tight truncate block">${window.t('nav_goals', 'Target')}</span>
            </div>
            <div class="min-w-0 mt-auto pr-9">
                <p class="text-dynamic-lg font-black text-indigo-700 dark:text-indigo-300 truncate leading-tight" title="${fmt.currency(targetVal)}">${fmt.number(targetVal)}</p>
                <p class="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">${targetPct}% achieved</p>
            </div>
            <div class="absolute bottom-2 right-2 w-5.5 h-5.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 text-[10px] font-black shadow-2xs">
                <i data-lucide="target" class="w-3 h-3"></i>
            </div>
        </div>

        <!-- Average Ticket Size -->
        <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card flex flex-col justify-between h-full min-w-0">
            <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shadow-2xs z-10">${currencySymbol}</div>
            <div class="flex items-center justify-between mb-1.5 pr-10">
                <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight truncate block">${window.t('avg_sale', 'Avg Order')}</span>
            </div>
            <div class="min-w-0 mt-auto pr-9">
                <p class="text-dynamic-lg font-black text-gray-900 dark:text-white truncate leading-tight" title="${fmt.currency(avgSale)}">${fmt.number(avgSale)}</p>
                <p class="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">per checkout</p>
            </div>
            <svg class="absolute bottom-2 right-2 w-5.5 h-3.5 opacity-75" viewBox="0 0 40 24" fill="none">
                <path d="M2 14 L10 18 L18 10 L26 12 L38 5" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="38" cy="5" r="2.5" fill="#F59E0B"/>
            </svg>
        </div>

        <!-- Gross Profit -->
        <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card flex flex-col justify-between h-full col-span-2 sm:col-span-1 min-w-0">
            <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 shadow-2xs z-10">${currencySymbol}</div>
            <div class="flex items-center justify-between mb-1.5 pr-10">
                <span class="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-tight truncate block">${window.t('profit_margin', 'Gross Profit')}</span>
            </div>
            <div class="min-w-0 mt-auto pr-9">
                <p class="text-dynamic-lg font-black text-purple-600 dark:text-purple-400 truncate leading-tight" title="${fmt.currency(grossProfit)}">${fmt.number(grossProfit)}</p>
                <p class="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 truncate">Net earnings</p>
            </div>
            <div class="absolute bottom-2 right-2 w-5.5 h-5.5 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 flex items-center justify-center text-purple-600 text-[10px] font-black shadow-2xs">
                <i data-lucide="trending-up" class="w-3 h-3"></i>
            </div>
        </div>`;
    if (window.lucide) lucide.createIcons();
}

function _renderSalesItemsToDOM(sales, serviceNames, totalCount) {
    const listEl = document.getElementById('salesList');
    if (!listEl) return;

    salesPageState.totalCount = typeof totalCount === 'number' ? totalCount : sales.length;
    const totalPages = Math.ceil(salesPageState.totalCount / salesPageState.pageSize) || 1;

    const pageInfoText = document.getElementById('salesPageInfoText');
    if (pageInfoText) {
        const modeLabel = salesPageState.filterMode === 'today' ? "Today" : `History (${salesPageState.historyRange.toUpperCase()})`;
        pageInfoText.textContent = `Page ${salesPageState.page} of ${totalPages} • ${modeLabel}`;
    }

    if (sales.length === 0) {
        const isToday = salesPageState.filterMode === 'today';
        const hasSearch = Boolean(salesPageState.searchQuery);
        listEl.innerHTML = `
            <div class="py-10 px-4 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50/40 dark:bg-gray-800/40">
                <div class="w-12 h-12 rounded-2xl ${isToday ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400' : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'} mx-auto mb-3 flex items-center justify-center border border-gray-200/80 dark:border-gray-700">
                    <i data-lucide="${hasSearch ? 'search-x' : (isToday ? 'shopping-bag' : 'history')}" class="w-6 h-6"></i>
                </div>
                <h4 class="text-sm font-bold text-gray-900 dark:text-white mb-1">
                    ${hasSearch ? 'No matching sales found' : (isToday ? 'No sales recorded yet today' : 'No sales history found')}
                </h4>
                <p class="text-xs text-gray-400 max-w-sm mx-auto mb-4 font-medium">
                    ${hasSearch 
                        ? `No transactions match "${salesPageState.searchQuery}". Try clearing your search keyword.`
                        : (isToday 
                            ? 'Ready to record your first checkout of the day, or view past sales records from history.'
                            : 'No past transaction records were found for the selected time range.')}
                </p>
                <div class="flex flex-wrap items-center justify-center gap-2">
                    ${hasSearch ? `
                        <button onclick="document.getElementById('salesSearchInput').value=''; handleSalesSearchInput('');" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-xs">
                            <i data-lucide="x" class="w-3.5 h-3.5"></i>
                            <span>Clear Search</span>
                        </button>
                    ` : (isToday ? `
                        <button onclick="openAddSaleModal()" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs">
                            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                            <span>New Sale</span>
                        </button>
                        <button onclick="setSalesFilterMode('history')" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer">
                            <i data-lucide="history" class="w-3.5 h-3.5"></i>
                            <span>Fetch Sales History</span>
                        </button>
                    ` : `
                        <button onclick="setSalesFilterMode('today')" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors cursor-pointer">
                            <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                            <span>Back to Today's Sales</span>
                        </button>
                    `)}
                </div>
            </div>`;
    } else {
        listEl.innerHTML = sales.map((sale, idx) => {
            const rawItemText = (sale.items || sale.item_name || sale.product_name || (Array.isArray(sale.items) && sale.items[0] ? sale.items[0].name : '') || '').toLowerCase();
            const isService = sale.item_type === 'service'
                || (serviceNames && Array.from(serviceNames).some(sName => sName && rawItemText.includes(sName)))
                || rawItemText.includes('(service)')
                || rawItemText.includes('service');

            const itemName = sale.item_name || sale.product_name || (Array.isArray(sale.items) && sale.items[0] ? sale.items[0].name : '') || (typeof sale.items === 'string' ? sale.items : 'Sale Transaction');
            let priceType = (sale.price_type || '').toLowerCase();
            if (!['wholesale', 'custom', 'retail'].includes(priceType)) {
                if (rawItemText.includes('wholesale') || rawItemText.includes('(wholesale)') || rawItemText.includes('[wholesale]')) {
                    priceType = 'wholesale';
                } else if (rawItemText.includes('custom') || rawItemText.includes('(custom)') || rawItemText.includes('[custom]')) {
                    priceType = 'custom';
                } else {
                    priceType = 'retail';
                }
            }
            const customerName = sale.customer_name || sale.customer || 'Walk-in Customer';
            const initials = customerName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'CU';

            const pTypeBadge = isService ? '' : (priceType === 'wholesale' ? `
                <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 uppercase tracking-wider" title="Wholesale / Bei ya Jumla">Wholesale</span>
            ` : priceType === 'custom' ? `
                <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 uppercase tracking-wider" title="Custom Price / Bei Maalum">Custom</span>
            ` : `
                <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 uppercase tracking-wider" title="Retail / Bei ya Rejareja">Retail</span>
            `);

            const serviceBadge = isService ? `
                <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/80 dark:border-purple-800/80 uppercase tracking-wider shrink-0" title="Service Offering">
                    <i data-lucide="wrench" class="w-3 h-3 text-purple-600 dark:text-purple-400"></i>
                    <span>Service</span>
                </span>
            ` : '';

            return `
            <div onclick="openDetailsModal('sale', '${sale.id}')" data-search="${itemName.toLowerCase()} ${customerName.toLowerCase()} ${isService ? 'service' : 'product'}" class="bg-gray-50/70 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 sm:p-4 flex items-center justify-between gap-3 transition-colors group relative cursor-pointer">
                <div class="flex items-center gap-3 min-w-0" onclick="event.stopPropagation()">
                    <input type="checkbox" value="${sale.id}" onchange="toggleSaleSelection('${sale.id}')" class="sale-checkbox rounded w-4 h-4 text-emerald-600 border-gray-300 focus:ring-emerald-500 cursor-pointer" ${salesSelection.has(sale.id) ? 'checked' : ''}>
                    <div class="w-8 h-8 rounded-lg ${isService ? 'bg-purple-50 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-800' : 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-800'} font-bold text-[11px] flex items-center justify-center flex-shrink-0 border">
                        ${initials}
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <h4 class="font-bold text-gray-900 dark:text-white text-xs sm:text-sm truncate">${itemName}</h4>
                            ${!isService ? `<span class="text-xs text-gray-400 font-medium">x${sale.quantity || 1}</span>` : ''}
                            ${serviceBadge}
                            ${pTypeBadge}
                        </div>
                        <p class="text-[10px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                            <span>${customerName}</span>
                            <span>•</span>
                            <span>${fmt.dateTime(sale.created_at)}</span>
                        </p>
                    </div>
                </div>

                <div class="text-right flex-shrink-0">
                    <span class="text-xs sm:text-sm font-black ${isService ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-600 dark:text-emerald-400'}">${fmt.currency(sale.amount)}</span>
                </div>
            </div>`;
        }).join('');
    }

    // Pagination Footer Update
    const paginationEl = document.getElementById('salesPaginationFooter');
    if (paginationEl) {
        const fromItem = salesPageState.totalCount === 0 ? 0 : (salesPageState.page - 1) * salesPageState.pageSize + 1;
        const toItem = Math.min(salesPageState.page * salesPageState.pageSize, salesPageState.totalCount);

        paginationEl.innerHTML = `
        <div class="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-700 pt-3">
            <div class="flex items-center gap-2.5 text-xs text-gray-500 dark:text-gray-400">
                <p>Showing <span class="font-bold text-gray-900 dark:text-white">${fromItem}-${toItem}</span> of <span class="font-bold text-gray-900 dark:text-white">${salesPageState.totalCount}</span> ${salesPageState.filterMode === 'today' ? "today's orders" : "orders"}</p>
                <div class="sm:hidden flex items-center gap-1">
                    ${renderSalesPageSizeDroplist('salesPageSizeSelectMobile', true)}
                </div>
            </div>

            <div class="flex items-center gap-1.5">
                <button onclick="changeSalesPage(-1)" ${salesPageState.page === 1 ? 'disabled' : ''} class="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" title="Previous Page">
                    <i data-lucide="chevron-left" class="w-3.5 h-3.5 text-gray-600 dark:text-gray-300"></i>
                </button>
                <div class="flex items-center gap-1">
                    ${Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let p = i + 1;
                        if (totalPages > 5 && salesPageState.page > 3) {
                            p = salesPageState.page - 2 + i;
                            if (p > totalPages) p = totalPages - (4 - i);
                        }
                        return `<button onclick="changeSalesPageTo(${p})" class="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${salesPageState.page === p ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}">${p}</button>`;
                    }).join('')}
                </div>
                <button onclick="changeSalesPage(1)" ${salesPageState.page >= totalPages ? 'disabled' : ''} class="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" title="Next Page">
                    <i data-lucide="chevron-right" class="w-3.5 h-3.5 text-gray-600 dark:text-gray-300"></i>
                </button>
            </div>
        </div>`;
    }

    if (window.lucide) lucide.createIcons();
}

async function fetchBranchSalesServer(branchId, { page = 1, pageSize = 10, dateFilterStart = null, dateFilterEnd = null, searchQuery = '' } = {}) {
    if (!branchId) return { items: [], count: 0 };
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const cleanSearch = (searchQuery || '').trim();

    const client = window.supabaseClient || window.supabase;
    if (client && typeof client.from === 'function') {
        try {
            let query = client
                .from('sales')
                .select('*', { count: 'exact' })
                .eq('branch_id', branchId);

            if (dateFilterStart) {
                query = query.gte('created_at', dateFilterStart);
            }
            if (dateFilterEnd) {
                query = query.lt('created_at', dateFilterEnd);
            }
            if (cleanSearch) {
                query = query.or(`customer.ilike.%${cleanSearch}%,payment_method.ilike.%${cleanSearch}%,notes.ilike.%${cleanSearch}%,receipt_no.ilike.%${cleanSearch}%`);
            }

            const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
            if (!error && Array.isArray(data)) {
                return { items: data, count: count !== null && count !== undefined ? count : data.length };
            }
            if (error) {
                console.warn('[BranchSales] Supabase query returned error:', error.message);
            }
        } catch (err) {
            console.warn('[BranchSales] Supabase fetch error, trying local fallback:', err);
        }
    }

    // Fallback: local Dexie
    if (window.localDb?.sales) {
        try {
            const allLocal = await window.localDb.sales.where('branch_id').equals(branchId).reverse().sortBy('created_at');
            let filtered = allLocal;
            if (dateFilterStart) filtered = filtered.filter(s => (s.created_at || '') >= dateFilterStart);
            if (dateFilterEnd) filtered = filtered.filter(s => (s.created_at || '') < dateFilterEnd);
            if (cleanSearch) {
                const kw = cleanSearch.toLowerCase();
                filtered = filtered.filter(s =>
                    (s.customer || s.customer_name || '').toLowerCase().includes(kw) ||
                    (s.items || s.item_name || '').toLowerCase().includes(kw) ||
                    (s.notes || '').toLowerCase().includes(kw) ||
                    (s.receipt_no || '').toLowerCase().includes(kw)
                );
            }
            return { items: filtered.slice(from, from + pageSize), count: filtered.length };
        } catch (dexieErr) {
            console.warn('[BranchSales] Local Dexie fallback error:', dexieErr);
        }
    }

    return dbSales.fetchAll(branchId, { page, pageSize, dateFilter: dateFilterStart, searchQuery });
}

async function fetchBranchSalesKPIsServer(branchId, { dateFilterStart = null, dateFilterEnd = null } = {}) {
    const client = window.supabaseClient || window.supabase;
    if (client && typeof client.from === 'function') {
        try {
            let query = client
                .from('sales')
                .select('amount,gross_profit,cost_amount,items,quantity,created_at')
                .eq('branch_id', branchId);

            if (dateFilterStart) query = query.gte('created_at', dateFilterStart);
            if (dateFilterEnd) query = query.lt('created_at', dateFilterEnd);

            const { data, error } = await query;
            if (!error && Array.isArray(data)) {
                const total = data.reduce((s, row) => s + (Number(row.amount) || 0), 0);
                const count = data.length;
                const avg = count > 0 ? Math.round(total / count) : 0;
                const profit = data.reduce((s, row) => {
                    if (row.gross_profit != null && !isNaN(Number(row.gross_profit))) return s + Number(row.gross_profit);
                    if (row.cost_amount != null && !isNaN(Number(row.cost_amount))) return s + Math.max(0, (Number(row.amount) || 0) - Number(row.cost_amount));
                    return s + (Number(row.profit || (Number(row.amount) || 0) * 0.2) || 0);
                }, 0);
                return { today_total: total, transaction_count: count, avg_sale: avg, gross_profit: profit, items: data };
            }
        } catch (err) {
            console.warn('[BranchSales] Direct KPIs fetch error, trying local fallback:', err);
        }
    }

    // Local Dexie fallback
    if (window.localDb?.sales) {
        try {
            let allLocal = await window.localDb.sales.where('branch_id').equals(branchId).toArray();
            if (dateFilterStart) allLocal = allLocal.filter(s => (s.created_at || '') >= dateFilterStart);
            if (dateFilterEnd) allLocal = allLocal.filter(s => (s.created_at || '') < dateFilterEnd);
            const total = allLocal.reduce((s, row) => s + (Number(row.amount) || 0), 0);
            const count = allLocal.length;
            const avg = count > 0 ? Math.round(total / count) : 0;
            const profit = allLocal.reduce((s, row) => {
                if (row.gross_profit != null && !isNaN(Number(row.gross_profit))) return s + Number(row.gross_profit);
                if (row.cost_amount != null && !isNaN(Number(row.cost_amount))) return s + Math.max(0, (Number(row.amount) || 0) - Number(row.cost_amount));
                return s + (Number(row.profit || (Number(row.amount) || 0) * 0.2) || 0);
            }, 0);
            return { today_total: total, transaction_count: count, avg_sale: avg, gross_profit: profit, items: allLocal };
        } catch (e) {}
    }

    return { today_total: 0, transaction_count: 0, avg_sale: 0, gross_profit: 0, items: [] };
}

function refreshSalesModuleData() {
    const listEl = document.getElementById('salesList');

    const branchId = state.branchId || state.branchProfile?.id || (state.branches && state.branches[0]?.id);

    // Compute active date boundaries based on filterMode and historyRange
    let dateFilterStart = null;
    let dateFilterEnd = null;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (salesPageState.filterMode === 'today') {
        dateFilterStart = todayStart.toISOString();
        dateFilterEnd = null;
    } else if (salesPageState.filterMode === 'history') {
        if (salesPageState.historyRange === 'yesterday') {
            const yesterdayStart = new Date(todayStart);
            yesterdayStart.setDate(yesterdayStart.getDate() - 1);
            dateFilterStart = yesterdayStart.toISOString();
            dateFilterEnd = todayStart.toISOString();
        } else if (salesPageState.historyRange === '7d') {
            const d7 = new Date(todayStart);
            d7.setDate(d7.getDate() - 7);
            dateFilterStart = d7.toISOString();
            dateFilterEnd = null; // Includes today
        } else if (salesPageState.historyRange === '30d') {
            const d30 = new Date(todayStart);
            d30.setDate(d30.getDate() - 30);
            dateFilterStart = d30.toISOString();
            dateFilterEnd = null; // Includes today
        } else {
            // All History: all sales including today
            dateFilterStart = null;
            dateFilterEnd = null;
        }
    }

    // 1. FAST PATH: Immediately query and hydrate local IndexedDB sales & inventory in < 10ms
    if (window.localDb?.sales && branchId) {
        Promise.all([
            window.localDb.sales.where('branch_id').equals(branchId).reverse().sortBy('created_at').catch(() => []),
            window.localDb.inventory ? window.localDb.inventory.where('branch_id').equals(branchId).toArray().catch(() => []) : []
        ]).then(([localItems, localInventory]) => {
            if (Array.isArray(localItems) && localItems.length > 0) {
                let filteredLocal = localItems;
                if (dateFilterStart) {
                    filteredLocal = filteredLocal.filter(s => (s.created_at || '') >= dateFilterStart);
                }
                if (dateFilterEnd) {
                    filteredLocal = filteredLocal.filter(s => (s.created_at || '') < dateFilterEnd);
                }
                if (salesPageState.searchQuery) {
                    const q = salesPageState.searchQuery.toLowerCase();
                    filteredLocal = filteredLocal.filter(s => 
                        (s.customer || s.customer_name || '').toLowerCase().includes(q) ||
                        (s.items || s.item_name || '').toLowerCase().includes(q) ||
                        (s.receipt_no || '').toLowerCase().includes(q) ||
                        (s.notes || '').toLowerCase().includes(q)
                    );
                }

                // Build lookup set of known service item names from local inventory immediately
                const localServiceNames = new Set(
                    (localInventory || [])
                        .filter(i => i.item_type === 'service' || (i.category && i.category.toLowerCase().includes('service')) || (i.unit && i.unit.toLowerCase() === 'service'))
                        .map(i => (i.name || '').toLowerCase().trim())
                        .filter(Boolean)
                );
                window._branchServiceNamesCache = localServiceNames;

                // Compute local breakdown immediately to eliminate jumping subtitles
                let localSvcCount = 0;
                filteredLocal.forEach(s => {
                    const raw = (s.items || s.item_name || '').toLowerCase();
                    const isSvc = s.item_type === 'service'
                        || Array.from(localServiceNames).some(n => n && raw.includes(n))
                        || raw.includes('(service)')
                        || raw.includes('service');
                    if (isSvc) localSvcCount++;
                });
                const localBreakdown = {
                    services: localSvcCount,
                    productOrders: Math.max(0, filteredLocal.length - localSvcCount)
                };

                const localTotal = filteredLocal.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
                const localCount = filteredLocal.length;
                const localAvg = localCount > 0 ? Math.round(localTotal / localCount) : 0;
                const localProfit = filteredLocal.reduce((sum, s) => {
                    if (s.gross_profit != null && !isNaN(Number(s.gross_profit))) {
                        return sum + Number(s.gross_profit);
                    }
                    if (s.cost_amount != null && !isNaN(Number(s.cost_amount))) {
                        return sum + Math.max(0, (Number(s.amount) || 0) - Number(s.cost_amount));
                    }
                    return sum + (Number(s.profit || (Number(s.amount) || 0) * 0.2) || 0);
                }, 0);

                renderSalesStatsDOM(
                    { today_total: localTotal, transaction_count: localCount, avg_sale: localAvg },
                    { gross_profit: localProfit },
                    localBreakdown
                );

                const from = (salesPageState.page - 1) * salesPageState.pageSize;
                const pagedLocal = filteredLocal.slice(from, from + salesPageState.pageSize);
                _renderSalesItemsToDOM(pagedLocal, localServiceNames, filteredLocal.length);
            }
        }).catch(() => {});
    }

    // 2. RESILIENT CLOUD FETCH: Direct table queries (< 250ms) avoiding slow, hanging RPCs
    const remoteDataPromise = Promise.all([
        fetchBranchSalesServer(branchId, {
            page: salesPageState.page,
            pageSize: salesPageState.pageSize,
            dateFilterStart,
            dateFilterEnd,
            searchQuery: salesPageState.searchQuery
        }),
        fetchBranchSalesKPIsServer(branchId, {
            dateFilterStart,
            dateFilterEnd
        }),
        dbSaleTags ? dbSaleTags.fetchAll(branchId).catch(() => []) : Promise.resolve([])
    ]);

    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('sales_fetch_timeout')), 5500)
    );

    Promise.race([remoteDataPromise, timeoutPromise]).then(async ([salesRes, kpiSummary, tags]) => {
        const sales = salesRes?.items || [];
        const scopeSummary = kpiSummary || { today_total: 0, transaction_count: 0, avg_sale: 0, gross_profit: 0, items: [] };

        let serviceNames = window._branchServiceNamesCache;
        if (!serviceNames) {
            serviceNames = new Set();
        }

        // Compute service breakdown from scope items
        const scopeItems = scopeSummary.items || [];
        let svcCount = 0;
        scopeItems.forEach(s => {
            const raw = (s.items || s.item_name || '').toLowerCase();
            const isSvc = s.item_type === 'service'
                || Array.from(serviceNames).some(n => n && raw.includes(n))
                || raw.includes('(service)')
                || raw.includes('service');
            if (isSvc) svcCount++;
        });
        const breakdown = {
            services: svcCount,
            productOrders: Math.max(0, scopeItems.length - svcCount)
        };

        // Render stats DOM with exact matching values
        renderSalesStatsDOM(
            { today_total: scopeSummary.today_total, transaction_count: scopeSummary.transaction_count, avg_sale: scopeSummary.avg_sale },
            { gross_profit: scopeSummary.gross_profit },
            breakdown
        );

        // Render Sales List with server data
        _renderSalesItemsToDOM(sales, serviceNames, salesRes?.count);

    }).catch(err => {
        console.warn('[BranchSales] Background fetch notice:', err.message || err);
        if (listEl && listEl.querySelector('.animate-pulse')) {
            if (typeof window.renderModuleOfflineState === 'function') {
                listEl.innerHTML = window.renderModuleOfflineState({
                    viewId: 'sales',
                    title: 'Sales & POS Records',
                    entityName: 'Sales & Transaction Records',
                    retryAction: 'window.renderSalesModule()'
                });
                if (window.lucide) lucide.createIcons();
            } else {
                listEl.innerHTML = `<div class="py-12 text-center text-gray-500 font-bold">Couldn't load sales transactions while offline.</div>`;
            }
        }
    });
}

export async function openAddSaleModal() {
    try {

        const [inventoryRes, customersRes] = await Promise.all([
            dbInventory.fetchAll(state.branchId, { pageSize: 1000 }),
            dbCustomers.fetchAllList(state.branchId)
        ]);

        const inventory = inventoryRes.items || [];
        const customers = customersRes || [];

        // Build price lookup map so onSaleProductChange can resolve retail/wholesale prices and item_type
        window._salePriceMap = {};
        inventory.forEach(item => {
            const isService = item.item_type === 'service' || (item.unit && item.unit.toLowerCase() === 'service') || (item.category && item.category.toLowerCase().includes('service'));
            window._salePriceMap[item.id] = {
                name:      item.name || 'Item',
                retail:    parseFloat(item.retail_price    ?? item.price ?? 0),
                wholesale: parseFloat(item.wholesale_price ?? item.price ?? 0),
                item_type: isService ? 'service' : (item.item_type || 'product'),
                quantity:  item.quantity !== undefined ? item.quantity : 0
            };
        });

        if (inventory.length === 0) {
            showToast('No products or services found! Please add items to Inventory first.', 'warning');
        }

        openModal('addSale', { inventory, customers });
    } catch (err) {
        console.error('[Sales] Error loading inventory:', err);
        showToast('Failed to load product list: ' + err.message, 'error');
    }
};

export async function refreshSaleProducts() {
    try {
        const btn = document.querySelector('button[onclick="refreshSaleProducts()"]');
        const icon = btn ? btn.querySelector('i') : null;

        if (icon) icon.classList.add('hidden');

        const res = await dbInventory.fetchAll(state.branchId, { pageSize: 1000 });
        const inventory = res.items || [];
        const select = document.getElementById('saleProduct');

        if (!inventory || inventory.length === 0) {
            showToast('No products or services found.', 'warning');
            if (select) select.innerHTML = `<option value="" disabled selected>No items available</option>`;
        } else {
            showToast('Items refreshed!', 'success');

            const options = inventory.map(item => {
                const isService = item.item_type === 'service' || (item.unit && item.unit.toLowerCase() === 'service') || (item.category && item.category.toLowerCase().includes('service'));
                return `
                <option value="${item.id}" data-price="${item.retail_price || item.price}" data-name="${item.name}" data-type="${isService ? 'service' : 'product'}">
                    ${item.name} (${isService ? 'Service' : `${item.quantity} in stock`}) - ${fmt.currency(item.retail_price || item.price || 0)}
                </option>`;
            }).join('');

            if (select) select.innerHTML = `<option value="" disabled selected>Select a product or service...</option>${options}`;
        }

        if (icon) icon.classList.remove('hidden');
    } catch (err) {
        showToast('Failed to refresh: ' + err.message, 'error');
    }
};

export function updateSaleTotal() {
    const productInput = document.getElementById('saleProduct'); // hidden input from premium select
    const qtyInput = document.getElementById('saleQty');
    const amountInput = document.getElementById('saleAmount');
    const priceTypeInput = document.getElementById('salePriceType');

    const productId = productInput?.value;
    if (!productId) return;

    const prices = window._salePriceMap?.[productId];
    if (!prices) return;

    const priceType = priceTypeInput?.value || 'retail';
    if (priceType === 'custom') return; // user is typing manually

    const unitPrice = priceType === 'wholesale' ? prices.wholesale : prices.retail;
    const rawQty = (qtyInput?.value || '1').toString().replace(/,/g, '');
    const qty = parseFloat(rawQty) || 0;
    const total = unitPrice * qty;
    if (amountInput) {
        amountInput.value = fmt.number(total);
    }
};

// Called when a product is selected from the premium dropdown
window.onSaleProductChange = function () {
    const productInput = document.getElementById('saleProduct');
    const priceTypeRow = document.getElementById('salePriceTypeRow');

    if (!productInput || !priceTypeRow) return;

    const productId = productInput.value;
    const itemInfo = productId ? window._salePriceMap?.[productId] : null;

    if (itemInfo) {
        // Show the price type chooser
        priceTypeRow.classList.remove('hidden');

        // Update displayed amounts on each button
        const retailEl = document.getElementById('ptRetailAmt');
        const wholesaleEl = document.getElementById('ptWholesaleAmt');
        if (retailEl) retailEl.textContent = fmt.currency(itemInfo.retail);
        if (wholesaleEl) wholesaleEl.textContent = fmt.currency(itemInfo.wholesale);

        const isService = itemInfo.item_type === 'service';
        const ptWholesale = document.getElementById('ptWholesale');
        const ptRetail = document.getElementById('ptRetail');
        const ptRetailTitle = ptRetail ? ptRetail.querySelector('span') : null;

        if (ptWholesale) ptWholesale.classList.toggle('hidden', isService);
        if (ptRetailTitle) {
            ptRetailTitle.textContent = isService ? 'Service Price' : window.t('bei_ya_rejareja', 'Retail Price');
        }

        const stockHintEl = document.getElementById('saleProductStockHint');
        if (stockHintEl) {
            if (isService) {
                stockHintEl.innerHTML = `
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-xs font-bold border border-purple-200/60 dark:border-purple-800/60">
                        <i data-lucide="wrench" class="w-3.5 h-3.5"></i>
                        <span>Service Offering · Unlimited Availability</span>
                    </span>`;
            } else {
                const qty = itemInfo.quantity || 0;
                const isLow = qty <= 5;
                stockHintEl.innerHTML = `
                    <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg ${isLow ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60'} text-xs font-bold">
                        <i data-lucide="package" class="w-3.5 h-3.5"></i>
                        <span>Physical Stock: ${window.fmt.number(qty)} units available</span>
                    </span>`;
            }
            if (window.lucide) window.lucide.createIcons({ scope: stockHintEl });
        }

        // Default to retail / standard service price and fill amount
        window.setSalePriceType('retail');
    } else {
        priceTypeRow.classList.add('hidden');
        const stockHintEl = document.getElementById('saleProductStockHint');
        if (stockHintEl) stockHintEl.innerHTML = '';
    }
};


// Switch price type, update active button styles, auto-fill amount
window.setSalePriceType = function (type) {
    const priceTypeInput = document.getElementById('salePriceType');
    if (priceTypeInput) priceTypeInput.value = type;

    const btns = { retail: 'ptRetail', wholesale: 'ptWholesale', custom: 'ptCustom' };
    const activeClasses = {
        retail:    ['border-emerald-500', 'bg-emerald-50', 'text-emerald-700'],
        wholesale: ['border-indigo-500',  'bg-indigo-50',  'text-indigo-700'],
        custom:    ['border-amber-500',   'bg-amber-50',   'text-amber-700']
    };
    const inactiveClasses = ['border-gray-200', 'bg-gray-50', 'text-gray-500'];

    Object.entries(btns).forEach(([t, id]) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        // Strip all active-like border/bg/text classes first
        btn.classList.remove(
            'border-emerald-500', 'bg-emerald-50', 'text-emerald-700',
            'border-indigo-500',  'bg-indigo-50',  'text-indigo-700',
            'border-amber-500',   'bg-amber-50',   'text-amber-700',
            ...inactiveClasses
        );
        if (t === type) {
            btn.classList.add(...activeClasses[type]);
        } else {
            btn.classList.add(...inactiveClasses);
        }
    });

    // Make amount field editable for custom, read-only otherwise
    const amountInput = document.getElementById('saleAmount');
    if (amountInput) {
        amountInput.readOnly = type !== 'custom';
        amountInput.classList.toggle('bg-gray-50', type !== 'custom');
    }

    // Auto-fill total for retail/wholesale
    if (type !== 'custom') {
        updateSaleTotal();
    } else if (amountInput) {
        amountInput.readOnly = false;
        amountInput.focus();
        amountInput.select();
    }

    if (window.lucide) lucide.createIcons();
};

export async function handleBarcodeScan(barcodeStr) {
    if (!barcodeStr || String(barcodeStr).trim() === '') return;
    const rawSku = String(barcodeStr).trim();
    const sku = rawSku.toLowerCase();

    try {
        let matchedItem = null;
        let inventory = [];

        // 1. Search active branch inventory
        if (state.branchId) {
            const res = await dbInventory.fetchAll(state.branchId, { pageSize: 10000 });
            inventory = res.items || [];
            matchedItem = inventory.find(i => (i.sku || '').trim().toLowerCase() === sku || (i.name || '').trim().toLowerCase() === sku);
        }

        // 2. Search central inventory if business owner
        if (!matchedItem && state.role === 'owner' && state.ownerId) {
            const centralItems = await dbCentralInventory.fetchAll(state.ownerId);
            matchedItem = (centralItems || []).find(i => (i.sku || '').trim().toLowerCase() === sku || (i.name || '').trim().toLowerCase() === sku);
        }

        if (matchedItem) {
            // A1. If Multi-Item Cart Mode is Active
            if (window._activeSaleMode === 'cart' && typeof window.addSaleCartItem === 'function') {
                window.addSaleCartItem(matchedItem.id, 1);
                const cartBarcodeField = document.getElementById('saleCartBarcode') || document.getElementById('saleBarcode');
                if (cartBarcodeField) {
                    cartBarcodeField.value = '';
                    cartBarcodeField.focus();
                }
                const priceFormatted = window.fmt ? window.fmt.currency(matchedItem.retail_price || matchedItem.price || 0) : '';
                showToast(`✓ Added to Cart: ${matchedItem.name} ${priceFormatted ? `(${priceFormatted})` : ''}`, 'success');
                return;
            }

            // A2. If Single Item Sale Modal is open
            const productInput = document.getElementById('saleProduct');
            if (productInput) {
                if (typeof window.selectPremiumOption === 'function') {
                    window.selectPremiumOption('saleProduct', matchedItem.id, matchedItem.name);
                } else {
                    productInput.value = matchedItem.id;
                }

                const barcodeField = document.getElementById('saleBarcode');
                if (barcodeField) barcodeField.value = matchedItem.sku || rawSku;

                const priceFormatted = window.fmt ? window.fmt.currency(matchedItem.retail_price || matchedItem.price || 0) : '';
                showToast(`✓ Product Matched: ${matchedItem.name} ${priceFormatted ? `· ${priceFormatted}` : ''}`, 'success');

                if (typeof window.onSaleProductChange === 'function') window.onSaleProductChange();
                if (typeof updateSaleTotal === 'function') updateSaleTotal();

                const qtyField = document.getElementById('saleQty');
                if (qtyField) qtyField.focus();
                return;
            }

            // B. If Search Bar is visible in active view
            const searchInput = document.getElementById('inventorySearchInput') || document.getElementById('inventorySearch') || document.getElementById('searchInventory') || document.getElementById('salesSearch');
            if (searchInput) {
                searchInput.value = matchedItem.name;
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                if (searchInput.id === 'inventorySearchInput' && typeof window.handleInventorySearchInput === 'function') {
                    window.handleInventorySearchInput(matchedItem.name);
                }
                showToast(`Filtered for: ${matchedItem.name}`, 'info');
                return;
            }

            // C. Show Product Details view/modal if no form is open
            const priceFormatted = window.fmt ? window.fmt.currency(matchedItem.retail_price || matchedItem.price || 0) : '';
            showToast(`✓ Product: ${matchedItem.name} ${priceFormatted ? `(${priceFormatted})` : ''}`, 'success');
            if (state.role === 'branch' && typeof window.openBranchProductDetailsView === 'function') {
                window.openBranchProductDetailsView(matchedItem.id);
            } else if (typeof window.openModal === 'function') {
                window.openModal('inventoryDetails', matchedItem);
            }
        } else {
            showToast(`No catalog product found for SKU / Barcode: "${rawSku}"`, 'warning');
        }
    } catch (err) {
        console.error('[BarcodeScan] Error matching product:', err);
        showToast('Error matching barcode: ' + err.message, 'error');
    }
};

window.handleBarcodeScan = handleBarcodeScan;
window.openAddSaleModal = openAddSaleModal;
