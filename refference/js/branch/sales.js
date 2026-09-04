
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

        let itemTitle = sale.items || 'Walk-in Sale';
        let itemQty = sale.quantity || '1';
        let itemPriceRaw = sale.amount || 0;

        const match = itemTitle.match(/^(\d+)x\s*(.*)$/);
        if (match) {
            itemQty = match[1];
            itemTitle = match[2];
            itemPriceRaw = (sale.amount || 0) / parseInt(itemQty);
        }
        const priceFormatted = fmt.currency(itemPriceRaw);

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
        <div style="font-size:12px;margin-bottom:2px;">${itemTitle}</div>
        <div style="display:flex;justify-content:space-between;font-size:12px;">
            <span style="flex:2;"></span>
            <span style="flex:0.5;text-align:right;">${itemQty}</span>
            <span style="flex:1;text-align:right;">${priceFormatted}</span>
        </div>
        <div style="height:16px;"></div>
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
    pageSize: 5,
    totalCount: 0
};
window.salesPageState = salesPageState;

export function changeSalesPage(delta) {
    const newPage = salesPageState.page + delta;
    const maxPage = Math.ceil(salesPageState.totalCount / salesPageState.pageSize) || 1;
    if (newPage < 1 || newPage > maxPage) return;
    salesPageState.page = newPage;
    renderSalesModule();
}

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

    let shell = document.getElementById('salesShell');
    if (!shell) {
        container.innerHTML = `
        <div class="space-y-4 slide-in" id="salesShell">
            <div class="flex flex-nowrap items-center gap-2 sm:gap-3 justify-between">
                <div class="inline-flex items-center gap-2 sm:gap-3 bg-white border border-gray-200 shadow-sm rounded-xl sm:rounded-2xl p-1 sm:p-1.5 pr-3 sm:pr-5 cursor-default hover:shadow-md transition-shadow overflow-hidden">
                    <div class="bg-indigo-50 text-indigo-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold uppercase tracking-wider truncate">${window.t('sales_register', 'Sales Register')}</div>
                </div>
                <div class="flex gap-1.5 sm:gap-2">
                    <button onclick="openCameraScannerModal()" data-tooltip="Scan product barcode using camera or USB laser scanner" data-tooltip-title="Barcode Scanner" data-tooltip-position="bottom" class="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700 dark:hover:text-emerald-400 flex-shrink-0 flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer">
                        <i data-lucide="scan" class="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400"></i>
                        <span class="hidden sm:inline-block">${window.t('scan_barcode', 'Scan Barcode')}</span>
                    </button>
                    <button onclick="openAddSaleModal()" data-tooltip="Open POS checkout to ring up product sales and print receipts" data-tooltip-title="New Sale" data-tooltip-variant="emerald" data-tooltip-position="bottom" class="btn-primary btn-success text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 whitespace-nowrap flex-shrink-0 font-bold flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer">
                        <i data-lucide="plus" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> ${window.t('new_sale', 'New Sale')}
                    </button>
                </div>
            </div>

            <!-- Stats Row -->
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4" id="salesStatsGrid">
                ${[1, 2, 3, 4, 5].map(() => `<div class="bg-white p-4 rounded-2xl border border-gray-100 animate-pulse h-16"></div>`).join('')}
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-3.5 sm:p-5 mb-6">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="text-sm sm:text-base font-bold text-gray-900 dark:text-white uppercase tracking-wide">${window.t('sales_history', 'Recent Sales')}</h3>
                    <div class="flex items-center gap-2">
                        <span id="salesPageInfoText" class="text-xs text-gray-400 font-medium">Loading...</span>
                    </div>
                </div>

                <!-- Instant Search Input -->
                <div class="relative mb-3">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                        <i data-lucide="search" class="w-4 h-4 text-indigo-500"></i>
                    </div>
                    <input type="text" id="salesSearchInput" placeholder="${window.t('search_sales', 'Search sales...')}" oninput="filterList('salesList', this.value)" class="w-full pl-11 pr-3.5 py-1.5 sm:py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder-gray-400" style="padding-left: 2.85rem !important;">
                </div>

                <!-- Select All Action Bar -->
                <div class="flex flex-wrap items-center justify-between bg-gray-50/60 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl p-2 mb-3 gap-2">
                    <div class="flex items-center gap-2.5 pl-1.5">
                        <input type="checkbox" id="selectAllSales" onchange="toggleSelectAllSales(this.checked)" class="rounded w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer">
                        <span class="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">${window.t('select_all', 'Select All')} <span id="salesSelectedCount" class="font-normal text-xs text-gray-400 ml-1 hidden sm:inline-block">0 selected</span></span>
                    </div>
                    <div class="flex flex-wrap items-center gap-1.5">
                        <button id="btnBulkDeleteSales" disabled onclick="bulkDeleteSelectedSales()" data-tooltip="Delete checked sales and restore item inventory stock" data-tooltip-title="Bulk Delete" data-tooltip-variant="rose" class="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5 text-gray-400"></i> <span class="hidden sm:inline-block">${window.t('delete_selected', 'Delete Selected')}</span>
                        </button>
                        <button id="btnBulkTagSales" disabled onclick="bulkTagSelectedSales()" data-tooltip="Apply categorized tag labels to checked sales" data-tooltip-title="Bulk Tag" data-tooltip-variant="indigo" class="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 hover:text-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                            <i data-lucide="tag" class="w-3.5 h-3.5 text-indigo-500"></i> <span class="hidden sm:inline-block">${window.t('apply_tag', 'Apply Tag')}</span>
                        </button>
                    </div>
                </div>

                <!-- Sales List Container -->
                <div class="space-y-2.5" id="salesList">
                    ${[1, 2, 3].map(() => `<div class="bg-white p-6 rounded-2xl animate-pulse h-24"></div>`).join('')}
                </div>

                <div id="salesPaginationFooter"></div>
            </div>
        </div>`;
        if (window.lucide) lucide.createIcons();
    }

    refreshSalesModuleData();
    return '';
}

function refreshSalesModuleData() {
    const listEl = document.getElementById('salesList');
    if (listEl) {
        listEl.innerHTML = [1, 2, 3].map(() => `<div class="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 animate-pulse h-20"></div>`).join('');
    }

    Promise.all([
        dbSales.fetchAll(state.branchId, {
            page: salesPageState.page,
            pageSize: salesPageState.pageSize
        }),
        dbSales.fetchSummary(state.branchId),
        dbSales.fetchProfit(state.branchId),
        dbInventory.fetchAll(state.branchId),
        dbSaleTags.fetchAll(state.branchId)
    ]).then(([salesRes, summary, profit, inventoryRes, tags]) => {
        const sales = salesRes.items;
        salesPageState.totalCount = salesRes.count;
        const totalPages = Math.ceil(salesPageState.totalCount / salesPageState.pageSize) || 1;

        const pageInfoText = document.getElementById('salesPageInfoText');
        if (pageInfoText) pageInfoText.textContent = `Page ${salesPageState.page} of ${totalPages}`;

        // Stats Grid Update
        const statsGrid = document.getElementById('salesStatsGrid');
        if (statsGrid) {
            const currencySymbol = (window.fmt && window.fmt.getSymbol) ? window.fmt.getSymbol() : 'TSh';
            statsGrid.innerHTML = `
                <div class="relative bg-white dark:bg-gray-800 px-3 py-2.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between h-full">
                    <div class="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs z-10">${currencySymbol}</div>
                    <p class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight whitespace-normal break-words font-bold leading-tight" title="${window.t('todays_sales', "Today's Sales")}">${window.t('todays_sales', "Today's Total")}</p>
                    <p class="text-dynamic-lg font-black text-emerald-600 dark:text-emerald-400 truncate leading-none my-auto py-1" title="${fmt.currency(summary.today_total)}">${fmt.number(summary.today_total)}</p>
                </div>
                <div class="bg-white dark:bg-gray-800 px-3 py-2.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between h-full">
                    <p class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight whitespace-normal break-words font-bold leading-tight" title="${window.t('transactions', 'Transactions')}">${window.t('transactions', 'Transactions')}</p>
                    <p class="text-dynamic-lg font-black text-gray-900 dark:text-white truncate leading-none my-auto py-1">${summary.transaction_count}</p>
                </div>
                <div class="relative bg-white dark:bg-gray-800 px-3 py-2.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 bg-indigo-50/20 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/30 flex flex-col justify-between h-full">
                    <div class="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-2xs z-10">${currencySymbol}</div>
                    <p class="text-[11px] sm:text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-tight whitespace-normal break-words font-bold leading-tight" title="${window.t('nav_goals', 'Sales Target')}">${window.t('nav_goals', 'Sales Target')}</p>
                    <p class="text-dynamic-lg font-black text-indigo-700 dark:text-indigo-300 truncate leading-none my-auto py-1" title="${fmt.currency(state.branchProfile?.target || 0)}">${fmt.number(state.branchProfile?.target || 0)}</p>
                </div>
                <div class="relative bg-white dark:bg-gray-800 px-3 py-2.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between h-full">
                    <div class="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-gray-600 shadow-2xs z-10">${currencySymbol}</div>
                    <p class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight whitespace-normal break-words font-bold leading-tight" title="${window.t('avg_sale', 'Average Sale')}">${window.t('avg_sale', 'Avg Sale')}</p>
                    <p class="text-dynamic-lg font-black text-gray-900 dark:text-white truncate leading-none my-auto py-1" title="${fmt.currency(summary.avg_sale)}">${fmt.number(summary.avg_sale)}</p>
                </div>
                <div class="relative bg-white dark:bg-gray-800 px-3 py-2.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 bg-violet-50/20 dark:bg-violet-900/10 border-violet-100 dark:border-violet-800/30 flex flex-col justify-between h-full">
                    <div class="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 shadow-2xs z-10">${currencySymbol}</div>
                    <p class="text-[11px] sm:text-xs text-violet-600 dark:text-violet-400 uppercase tracking-tight whitespace-normal break-words font-bold leading-tight" title="${window.t('profit_margin', 'Gross Profit')}">${window.t('profit_margin', 'Gross Profit')}</p>
                    <p class="text-dynamic-lg font-black text-violet-700 dark:text-violet-300 truncate leading-none my-auto py-1" title="${fmt.currency(profit.gross_profit)}">${fmt.number(profit.gross_profit)}</p>
                </div>`;
        }

        // Sales List Update
        if (listEl) {
            listEl.innerHTML = sales.length === 0 ? `
                <div class="py-6 sm:py-8 text-center border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-2xl">
                    <i data-lucide="shopping-cart" class="w-7 h-7 text-gray-300 dark:text-gray-600 mx-auto mb-1.5"></i>
                    <p class="text-gray-400 text-xs font-medium">No sales history found for this page</p>
                </div>
            ` : sales.map((sale, idx) => {
                const outlineColors = ['border-l-emerald-500', 'border-l-blue-500', 'border-l-indigo-500', 'border-l-purple-500', 'border-l-rose-500', 'border-l-amber-500'];
                const accentBorder = outlineColors[idx % outlineColors.length];
                const itemName = sale.item_name || sale.product_name || (Array.isArray(sale.items) && sale.items[0] ? sale.items[0].name : '') || 'Sale Transaction';
                const priceType = sale.price_type || 'retail';
                const pTypeBadge = priceType === 'wholesale' ? `
                    <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-indigo-50 text-indigo-600 border border-indigo-100 uppercase tracking-wider" title="Wholesale / Bei ya Jumla">JML</span>
                ` : priceType === 'custom' ? `
                    <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-50 text-amber-600 border border-amber-100 uppercase tracking-wider" title="Custom Price / Bei Maalum">CST</span>
                ` : `
                    <span class="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wider" title="Retail / Bei ya Rejareja">RTL</span>
                `;

                return `
                <div onclick="openDetailsModal('sales', '${sale.id}')" data-search="${itemName.toLowerCase()} ${(sale.customer_name || '').toLowerCase()}" class="bg-white border border-gray-200 border-l-[4px] ${accentBorder} rounded-2xl p-5 md:p-6 flex gap-4 hover:shadow-md transition-all group relative cursor-pointer">
                    <div class="pt-1" onclick="event.stopPropagation()">
                        <input type="checkbox" value="${sale.id}" onchange="toggleSaleSelection('${sale.id}')" class="sale-checkbox rounded w-5 h-5 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer" ${salesSelection.has(sale.id) ? 'checked' : ''}>
                    </div>

                    <div class="flex-1 min-w-0">
                        <div class="flex items-start justify-between gap-3 mb-1">
                            <div class="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                                <h4 class="font-bold text-gray-900 text-sm sm:text-base truncate">${itemName}</h4>
                                <span class="text-xs text-gray-400 font-medium whitespace-nowrap flex-shrink-0">x${sale.quantity || 1}</span>
                                ${pTypeBadge}
                            </div>
                            <div class="text-right">
                                <p class="text-[10px] uppercase font-bold text-gray-400 leading-none">${fmt.dateTime(sale.created_at)}</p>
                            </div>
                        </div>
                        <div class="flex items-end justify-between gap-3">
                            <div class="flex flex-wrap gap-1.5 overflow-hidden pt-1">
                                ${tags.filter(t => t.sale_id === sale.id).map(t => `
                                    <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100 whitespace-nowrap flex-shrink-0 cursor-default">
                                        # ${t.tag}
                                    </span>
                                `).join('')}
                            </div>
                            <span class="text-sm sm:text-lg font-black text-emerald-600 whitespace-nowrap">${fmt.currency(sale.amount)}</span>
                        </div>
                    </div>
                </div>`;
            }).join('');
        }

        const searchInput = document.getElementById('salesSearchInput');
        if (searchInput && searchInput.value) {
            filterList('salesList', searchInput.value);
        }

        // Pagination Footer Update
        const paginationEl = document.getElementById('salesPaginationFooter');
        if (paginationEl) {
            paginationEl.innerHTML = `
            <div class="mt-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3">
                <p class="text-xs text-gray-500 dark:text-gray-400">Showing <span class="font-bold text-gray-900 dark:text-white">${sales.length}</span> of <span class="font-bold text-gray-900 dark:text-white">${salesPageState.totalCount}</span> sales</p>
                <div class="flex items-center gap-1.5">
                    <button onclick="changeSalesPage(-1)" ${salesPageState.page === 1 ? 'disabled' : ''} class="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <i data-lucide="chevron-left" class="w-3.5 h-3.5 text-gray-600 dark:text-gray-300"></i>
                    </button>
                    <div class="flex items-center gap-1">
                        ${Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = i + 1;
                return `<button onclick="window.salesPageState.page = ${p}; renderSalesModule()" class="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${salesPageState.page === p ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}">${p}</button>`;
            }).join('')}
                    </div>
                    <button onclick="changeSalesPage(1)" ${salesPageState.page === totalPages ? 'disabled' : ''} class="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <i data-lucide="chevron-right" class="w-3.5 h-3.5 text-gray-600 dark:text-gray-300"></i>
                    </button>
                </div>
            </div>`;
        }

        if (window.lucide) lucide.createIcons();
    }).catch(err => {
        console.error('[BranchSales] Error loading sales:', err);
        if (listEl) {
            if (typeof window.renderModuleOfflineState === 'function') {
                listEl.innerHTML = window.renderModuleOfflineState({
                    viewId: 'sales',
                    title: 'Sales & POS Records',
                    entityName: 'Sales & Transaction Records',
                    retryAction: 'window.renderSalesModule()'
                });
                if (window.lucide) window.lucide.createIcons();
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

        // Build price lookup map so onSaleProductChange can resolve retail/wholesale prices
        window._salePriceMap = {};
        inventory.forEach(item => {
            window._salePriceMap[item.id] = {
                name:      item.name || 'Item',
                retail:    parseFloat(item.retail_price    ?? item.price ?? 0),
                wholesale: parseFloat(item.wholesale_price ?? item.price ?? 0)
            };
        });

        if (inventory.length === 0) {
            showToast('No products found! Please add items to Inventory first.', 'warning');
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
            showToast('No products found.', 'warning');
            if (select) select.innerHTML = `<option value="" disabled selected>No products available</option>`;
        } else {
            showToast('Products refreshed!', 'success');

            const options = inventory.map(item => `
                <option value="${item.id}" data-price="${item.price}" data-name="${item.name}">
                    ${item.name} (${item.quantity} in stock) - ${fmt.currency(item.price)}
                </option>
            `).join('');

            if (select) select.innerHTML = `<option value="" disabled selected>Select a product...</option>${options}`;
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
    const qty = parseFloat(qtyInput?.value) || 0;
    if (amountInput) amountInput.value = (unitPrice * qty).toFixed(2);
};

// Called when a product is selected from the premium dropdown
window.onSaleProductChange = function () {
    const productInput = document.getElementById('saleProduct');
    const priceTypeRow = document.getElementById('salePriceTypeRow');

    if (!productInput || !priceTypeRow) return;

    const productId = productInput.value;
    const prices = productId ? window._salePriceMap?.[productId] : null;

    if (prices) {
        // Show the price type chooser
        priceTypeRow.classList.remove('hidden');

        // Update displayed amounts on each button
        const retailEl = document.getElementById('ptRetailAmt');
        const wholesaleEl = document.getElementById('ptWholesaleAmt');
        if (retailEl) retailEl.textContent = fmt.currency(prices.retail);
        if (wholesaleEl) wholesaleEl.textContent = fmt.currency(prices.wholesale);

        // Default to retail and fill amount
        window.setSalePriceType('retail');
    } else {
        priceTypeRow.classList.add('hidden');
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
            // A. If New Sale Modal is open
            const productInput = document.getElementById('saleProduct');
            if (productInput) {
                if (typeof window.selectPremiumOption === 'function') {
                    window.selectPremiumOption('saleProduct', matchedItem.id, matchedItem.name);
                } else {
                    productInput.value = matchedItem.id;
                }

                const barcodeField = document.getElementById('saleBarcode');
                if (barcodeField) barcodeField.value = matchedItem.sku || rawSku;

                showToast(`Product Matched: ${matchedItem.name}`, 'success');

                if (typeof window.onSaleProductChange === 'function') window.onSaleProductChange();
                if (typeof updateSaleTotal === 'function') updateSaleTotal();

                const qtyField = document.getElementById('saleQty');
                if (qtyField) qtyField.focus();
                return;
            }

            // B. If Search Bar is visible in active view
            const searchInput = document.getElementById('inventorySearch') || document.getElementById('searchInventory') || document.getElementById('salesSearch');
            if (searchInput) {
                searchInput.value = matchedItem.sku || matchedItem.name;
                searchInput.dispatchEvent(new Event('input', { bubbles: true }));
                showToast(`Filtered for: ${matchedItem.name}`, 'info');
                return;
            }

            // C. Show Product Details modal if no form is open
            showToast(`Product Matched: ${matchedItem.name} (${matchedItem.sku || 'No SKU'})`, 'success');
            if (typeof window.openModal === 'function') {
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
