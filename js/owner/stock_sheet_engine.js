import { dbCentralInventory, dbBranches, dbInventory, supabase, getLocalItems } from '../db.js';
import { ensurePdfLibraries } from '../utils.js';

/**
 * Master Inventory Stock Sheet Engine
 * Generates curated Stock Sheet reports (PDF & CSV) and provides a modal preview.
 * 
 * Curated Columns:
 * 1. Product (Product Name & Total Count)
 * 2. In Store (Unit count in Main Store)
 * 3. In Branches (Unit count in Branches)
 * 4. Prices (Retail & Wholesale)
 * 5. Value (Cash value for the whole stock units)
 */

export async function prepareStockSheetData(ownerId = null) {
    const fetchOwnerId = ownerId || window.state?.ownerId || (window.state?.user?.role === 'owner' ? window.state?.user?.id : null);
    
    let items = [];
    if (Array.isArray(window._cachedCentralItems) && window._cachedCentralItems.length > 0) {
        items = window._cachedCentralItems;
    } else {
        try {
            items = await dbCentralInventory.fetchAll(fetchOwnerId);
            if (typeof window.populateCentralItemsWithBranchInventory === 'function') {
                await window.populateCentralItemsWithBranchInventory(items, fetchOwnerId);
            }
        } catch (e) {
            console.warn('[StockSheetEngine] fetch items fallback:', e);
            items = await getLocalItems('central_inventory', i => !fetchOwnerId || i.owner_id === fetchOwnerId, 'name', true);
        }
    }

    // Filter to inventory products only (exclude services)
    const products = (items || []).filter(i => 
        (i.item_type || 'product') === 'product' && 
        !((i.category && String(i.category).toLowerCase().includes('service')) || (i.unit && String(i.unit).toLowerCase() === 'service'))
    );

    let totalHQUnits = 0;
    let totalBranchUnits = 0;
    let totalStockUnits = 0;
    let totalCashValuation = 0;

    const rows = products.map((item, index) => {
        const name = item.name || 'Unnamed Product';
        const sku = item.sku ? `SKU: ${item.sku}` : '';
        const inStore = Number(item.main_store_stock || 0);
        const inBranches = Number(item.globalQty || 0);
        const totalCount = inStore + inBranches;
        const retailPrice = Number(item.retail_price || item.price || 0);
        const wholesalePrice = Number(item.wholesale_price || 0);
        const costPrice = Number(item.cost_price || 0);
        const value = totalCount * retailPrice;

        totalHQUnits += inStore;
        totalBranchUnits += inBranches;
        totalStockUnits += totalCount;
        totalCashValuation += value;

        return {
            index: index + 1,
            id: item.id,
            name,
            sku: item.sku || '',
            category: item.category || 'General',
            inStore,
            inBranches,
            totalCount,
            retailPrice,
            wholesalePrice,
            costPrice,
            value,
            unit: item.unit || 'pcs'
        };
    });

    const profile = window.state?.profile || {};
    const user = window.state?.user || {};
    const userMeta = user.user_metadata || {};

    // Dynamic Business Name resolution
    const rawBusinessName = profile.business_name || 
                            profile.company_name || 
                            window.state?.enterpriseName || 
                            window.state?.business?.name || 
                            window.state?.userProfile?.business_name || 
                            userMeta.business_name ||
                            user.business_name || 
                            '';
    const businessName = rawBusinessName.trim() || 'My Business';

    // Dynamic Owner Name resolution
    const rawOwnerName = profile.full_name || 
                         profile.name || 
                         window.state?.currentUser || 
                         userMeta.full_name || 
                         userMeta.name || 
                         (user.email ? user.email.split('@')[0] : '') || 
                         '';
    const ownerName = rawOwnerName.trim() || 'Business Owner';

    return {
        products: rows,
        summary: {
            totalProducts: rows.length,
            totalHQUnits,
            totalBranchUnits,
            totalStockUnits,
            totalCashValuation,
            currency: window.fmt ? window.fmt.getSymbol() : 'TSh',
            businessName,
            ownerName,
            generatedAt: new Date()
        }
    };
}

/**
 * Export Curated Stock Sheet as PDF
 */
export async function exportStockSheetPdf(ownerId = null) {
    try {
        if (typeof ensurePdfLibraries === 'function') {
            await ensurePdfLibraries();
        } else if (typeof window.ensurePdfLibraries === 'function') {
            await window.ensurePdfLibraries();
        }

        if (!window.jspdf || !window.jspdf.jsPDF) {
            throw new Error('PDF generation library is still loading. Please retry in a few seconds.');
        }

        const data = await prepareStockSheetData(ownerId);
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });

        const pageWidth = doc.internal.pageSize.width;
        const margin = 14;
        let currentY = 16;
        const currencySymbol = data.summary.currency;

        // Header Background Banner (Light Grey Clean Theme)
        doc.setFillColor(248, 250, 252); // #F8FAFC light grey
        doc.rect(0, 0, pageWidth, 38, 'F');
        doc.setDrawColor(226, 232, 240); // #E2E8F0
        doc.setLineWidth(0.4);
        doc.line(0, 38, pageWidth, 38);

        // Business Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13.5);
        doc.setTextColor(15, 23, 42); // #0F172A dark slate
        doc.text(data.summary.businessName.toUpperCase(), margin, 13);

        // Document Title
        doc.setFontSize(9.5);
        doc.setTextColor(37, 99, 235); // #2563EB blue
        doc.text('MASTER INVENTORY STOCK SHEET', margin, 19.5);

        // Owner Name & Subtitle / Date
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139); // #64748B slate-500
        const dateStr = data.summary.generatedAt.toLocaleString('en-US', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
        doc.text(`Owner: ${data.summary.ownerName}  •  Date: ${dateStr}  •  Scope: Consolidated HQ & Branch Inventory`, margin, 26);

        // Currency Badge on right
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`CURRENCY: ${currencySymbol}`, pageWidth - margin, 13, { align: 'right' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139);
        doc.text(`Total Catalogs: ${data.summary.totalProducts} Items`, pageWidth - margin, 19.5, { align: 'right' });

        currentY = 44;

        // KPI Summary Box Strip (4 Metric Blocks - Light Grey Card Tiles)
        const boxW = (pageWidth - (margin * 2) - 9) / 4;
        const boxH = 15;

        const kpis = [
            { label: 'TOTAL PRODUCTS', val: `${data.summary.totalProducts} Items`, color: [14, 116, 144] },
            { label: 'IN MAIN STORE', val: `${data.summary.totalHQUnits.toLocaleString()} Units`, color: [37, 99, 235] },
            { label: 'IN BRANCHES', val: `${data.summary.totalBranchUnits.toLocaleString()} Units`, color: [13, 148, 136] },
            { label: 'TOTAL CASH VALUE', val: `${currencySymbol} ${data.summary.totalCashValuation.toLocaleString()}`, color: [16, 185, 129] }
        ];

        kpis.forEach((kpi, idx) => {
            const bx = margin + (idx * (boxW + 3));
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(bx, currentY, boxW, boxH, 2, 2, 'FD');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(6.5);
            doc.setTextColor(100, 116, 139);
            doc.text(kpi.label, bx + 3, currentY + 4.5);

            doc.setFontSize(8.5);
            doc.setTextColor(kpi.color[0], kpi.color[1], kpi.color[2]);
            doc.text(kpi.val, bx + 3, currentY + 10.5);
        });

        currentY += boxH + 6;

        // Table Rows Definition
        const tableBody = data.products.map(p => {
            // Column 1: Product Name & Count
            const productCell = `${p.name}${p.sku ? `\nSKU: ${p.sku}` : ''}\nTotal: ${p.totalCount.toLocaleString()} units`;
            
            // Column 2: In Store (HQ)
            const inStoreCell = `${p.inStore.toLocaleString()} units`;

            // Column 3: In Branches
            const inBranchesCell = `${p.inBranches.toLocaleString()} units`;

            // Column 4: Prices (Retail & Wholesale)
            const retailStr = `Retail: ${currencySymbol} ${p.retailPrice.toLocaleString()}`;
            const wholesaleStr = p.wholesalePrice > 0 ? `\nWholesale: ${currencySymbol} ${p.wholesalePrice.toLocaleString()}` : '';
            const pricesCell = `${retailStr}${wholesaleStr}`;

            // Column 5: Stock Cash Value
            const valueCell = `${currencySymbol} ${p.value.toLocaleString()}`;

            return [productCell, inStoreCell, inBranchesCell, pricesCell, valueCell];
        });

        // Add Grand Total Footer Row
        tableBody.push([
            `GRAND TOTAL (${data.summary.totalProducts} Products)\nTotal Stock: ${data.summary.totalStockUnits.toLocaleString()} units`,
            `${data.summary.totalHQUnits.toLocaleString()} units`,
            `${data.summary.totalBranchUnits.toLocaleString()} units`,
            `—`,
            `${currencySymbol} ${data.summary.totalCashValuation.toLocaleString()}`
        ]);

        if (typeof doc.autoTable === 'function') {
            doc.autoTable({
                startY: currentY,
                margin: { left: margin, right: margin, bottom: 16 },
                head: [[
                    'Product (Name & Total Units)',
                    'In Store (HQ)',
                    'In Branches',
                    'Prices (Retail / Wholesale)',
                    'Stock Value (Cash)'
                ]],
                body: tableBody,
                theme: 'plain',
                styles: {
                    fontSize: 7.5,
                    cellPadding: 3,
                    lineColor: [226, 232, 240],
                    lineWidth: 0.2,
                    textColor: [30, 41, 59],
                    overflow: 'linebreak'
                },
                headStyles: {
                    fillColor: [241, 245, 249], // #F1F5F9 light grey table header
                    textColor: [15, 23, 42], // #0F172A dark text
                    fontStyle: 'bold',
                    fontSize: 7.5,
                    lineColor: [203, 213, 225],
                    lineWidth: 0.3,
                    halign: 'left'
                },
                columnStyles: {
                    0: { cellWidth: 55, fontStyle: 'bold' },
                    1: { cellWidth: 28, halign: 'right' },
                    2: { cellWidth: 28, halign: 'right' },
                    3: { cellWidth: 42, halign: 'left' },
                    4: { cellWidth: 32, halign: 'right', fontStyle: 'bold', textColor: [16, 185, 129] }
                },
                alternateRowStyles: {
                    fillColor: [250, 250, 250]
                },
                didParseCell: function (hookData) {
                    // Style the grand total row
                    if (hookData.section === 'body' && hookData.row.index === tableBody.length - 1) {
                        hookData.cell.styles.fillColor = [241, 245, 249];
                        hookData.cell.styles.fontStyle = 'bold';
                        hookData.cell.styles.textColor = [15, 23, 42];
                    }
                },
                didDrawPage: function (pageData) {
                    // Footer on every page
                    const pageCount = doc.internal.getNumberOfPages();
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(7);
                    doc.setTextColor(148, 163, 184);
                    doc.text(
                        `Master Inventory Stock Sheet • ${data.summary.businessName} • Page ${pageData.pageNumber} of ${pageCount}`,
                        margin,
                        doc.internal.pageSize.height - 8
                    );
                }
            });
        }

        const dateFile = new Date().toISOString().slice(0, 10);
        doc.save(`StockSheet_${data.summary.businessName.replace(/[^a-zA-Z0-9]/g, '_')}_${dateFile}.pdf`);

        if (window.toast) {
            window.toast.success('Stock Sheet PDF downloaded successfully!');
        }
    } catch (err) {
        console.error('[exportStockSheetPdf] Error:', err);
        if (window.toast) {
            window.toast.error(err.message || 'Failed to generate Stock Sheet PDF');
        } else {
            alert('Failed to generate Stock Sheet PDF: ' + err.message);
        }
    }
}

/**
 * Export Curated Stock Sheet as CSV
 */
export async function exportStockSheetCsv(ownerId = null) {
    try {
        const data = await prepareStockSheetData(ownerId);
        const currencySymbol = data.summary.currency;

        const headers = [
            '#',
            'Product Name',
            'SKU',
            'Category',
            'Total Stock Units',
            'In Store (HQ Units)',
            'In Branches (Units)',
            `Retail Price (${currencySymbol})`,
            `Wholesale Price (${currencySymbol})`,
            `Total Stock Value (${currencySymbol})`
        ];

        const csvRows = [headers];

        data.products.forEach(p => {
            csvRows.push([
                p.index,
                `"${(p.name || '').replace(/"/g, '""')}"`,
                `"${(p.sku || '').replace(/"/g, '""')}"`,
                `"${(p.category || '').replace(/"/g, '""')}"`,
                p.totalCount,
                p.inStore,
                p.inBranches,
                p.retailPrice,
                p.wholesalePrice,
                p.value
            ]);
        });

        // Summary Row
        csvRows.push([
            'TOTAL',
            `"Total Products: ${data.summary.totalProducts}"`,
            '""',
            '""',
            data.summary.totalStockUnits,
            data.summary.totalHQUnits,
            data.summary.totalBranchUnits,
            '""',
            '""',
            data.summary.totalCashValuation
        ]);

        const csvContent = '\uFEFF' + csvRows.map(row => row.join(',')).join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const dateFile = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `StockSheet_${data.summary.businessName.replace(/[^a-zA-Z0-9]/g, '_')}_${dateFile}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (window.toast) {
            window.toast.success('Stock Sheet CSV exported successfully!');
        }
    } catch (err) {
        console.error('[exportStockSheetCsv] Error:', err);
        if (window.toast) {
            window.toast.error('Failed to export Stock Sheet CSV');
        }
    }
}

/**
 * Open Interactive Download Stock Sheet Modal
 */
export async function openDownloadStockSheetModal(ownerId = null) {
    try {
        const data = await prepareStockSheetData(ownerId);
        const currencySymbol = data.summary.currency;

        const modalHtml = `
            <div id="stockSheetModalBackdrop" class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
                <div class="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl flex flex-col overflow-hidden animate-scale-up">
                    
                    <!-- Modal Header -->
                    <div class="flex-none p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0 shadow-xs">
                                <i data-lucide="file-spreadsheet" class="w-5 h-5"></i>
                            </div>
                            <div>
                                <h3 class="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight leading-tight">${data.summary.businessName} • Stock Sheet</h3>
                                <p class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium">Owner: <span class="font-bold text-gray-700 dark:text-gray-300">${data.summary.ownerName}</span> • Consolidated HQ & Branch Stock overview.</p>
                            </div>
                        </div>
                        <button type="button" onclick="window.closeDownloadStockSheetModal()" class="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer">
                            <i data-lucide="x" class="w-4 h-4"></i>
                        </button>
                    </div>

                    <!-- Summary KPI Banner -->
                    <div class="p-3 sm:p-4 bg-slate-50 dark:bg-gray-800/60 border-b border-gray-200/80 dark:border-gray-700/80 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        <div class="bg-white dark:bg-gray-800 p-2.5 sm:p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs">
                            <p class="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight">Total Products</p>
                            <p class="text-base sm:text-lg font-black text-gray-900 dark:text-white mt-0.5">${data.summary.totalProducts} <span class="text-xs font-semibold text-gray-400">SKUs</span></p>
                        </div>
                        <div class="bg-white dark:bg-gray-800 p-2.5 sm:p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs">
                            <p class="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-tight">In Store (HQ)</p>
                            <p class="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400 mt-0.5">${data.summary.totalHQUnits.toLocaleString()} <span class="text-xs font-semibold opacity-75">Units</span></p>
                        </div>
                        <div class="bg-white dark:bg-gray-800 p-2.5 sm:p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs">
                            <p class="text-[10px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-tight">In Branches</p>
                            <p class="text-base sm:text-lg font-black text-teal-600 dark:text-teal-400 mt-0.5">${data.summary.totalBranchUnits.toLocaleString()} <span class="text-xs font-semibold opacity-75">Units</span></p>
                        </div>
                        <div class="bg-white dark:bg-gray-800 p-2.5 sm:p-3 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xs">
                            <p class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tight">Total Stock Value</p>
                            <p class="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5 truncate" title="${currencySymbol} ${data.summary.totalCashValuation.toLocaleString()}">${currencySymbol} ${window.fmt ? window.fmt.number(data.summary.totalCashValuation) : data.summary.totalCashValuation.toLocaleString()}</p>
                        </div>
                    </div>

                    <!-- Scrollable Table Preview -->
                    <div class="flex-1 overflow-y-auto p-3 sm:p-5">
                        <div class="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
                            <table class="w-full text-left text-xs">
                                <thead class="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 font-bold border-b border-gray-200 dark:border-gray-700">
                                    <tr>
                                        <th class="py-3 px-3.5">Product (Name & Count)</th>
                                        <th class="py-3 px-3 text-right">In Store</th>
                                        <th class="py-3 px-3 text-right">In Branches</th>
                                        <th class="py-3 px-3.5">Prices</th>
                                        <th class="py-3 px-3.5 text-right">Value (Cash)</th>
                                    </tr>
                                </thead>
                                <tbody class="divide-y divide-gray-100 dark:divide-gray-800 text-gray-800 dark:text-gray-200">
                                    ${data.products.map(p => `
                                        <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td class="py-2.5 px-3.5">
                                                <p class="font-extrabold text-gray-900 dark:text-white leading-snug">${p.name}</p>
                                                <div class="flex items-center gap-1.5 mt-0.5">
                                                    <span class="px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">${p.totalCount.toLocaleString()} units total</span>
                                                    ${p.sku ? `<span class="text-[10px] text-gray-400">SKU: ${p.sku}</span>` : ''}
                                                </div>
                                            </td>
                                            <td class="py-2.5 px-3 text-right font-bold text-blue-600 dark:text-blue-400">
                                                ${p.inStore.toLocaleString()} <span class="text-[10px] font-normal text-gray-400">units</span>
                                            </td>
                                            <td class="py-2.5 px-3 text-right font-bold text-teal-600 dark:text-teal-400">
                                                ${p.inBranches.toLocaleString()} <span class="text-[10px] font-normal text-gray-400">units</span>
                                            </td>
                                            <td class="py-2.5 px-3.5 leading-snug">
                                                <p class="font-bold text-gray-900 dark:text-gray-100"><span class="text-[10px] font-medium text-gray-400">Retail:</span> ${currencySymbol} ${p.retailPrice.toLocaleString()}</p>
                                                ${p.wholesalePrice > 0 ? `
                                                    <p class="text-[11px] font-semibold text-amber-600 dark:text-amber-400"><span class="text-[10px] font-medium text-gray-400">Wholesale:</span> ${currencySymbol} ${p.wholesalePrice.toLocaleString()}</p>
                                                ` : ''}
                                            </td>
                                            <td class="py-2.5 px-3.5 text-right font-black text-emerald-600 dark:text-emerald-400">
                                                ${currencySymbol} ${p.value.toLocaleString()}
                                            </td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                                <tfoot class="bg-gray-50 dark:bg-gray-800/80 border-t-2 border-gray-300 dark:border-gray-600 font-bold">
                                    <tr>
                                        <td class="py-3 px-3.5 text-gray-900 dark:text-white">
                                            GRAND TOTAL (${data.summary.totalProducts} Products)
                                        </td>
                                        <td class="py-3 px-3 text-right text-blue-600 dark:text-blue-400">
                                            ${data.summary.totalHQUnits.toLocaleString()} units
                                        </td>
                                        <td class="py-3 px-3 text-right text-teal-600 dark:text-teal-400">
                                            ${data.summary.totalBranchUnits.toLocaleString()} units
                                        </td>
                                        <td class="py-3 px-3.5 text-gray-400">
                                            Total: ${data.summary.totalStockUnits.toLocaleString()} units
                                        </td>
                                        <td class="py-3 px-3.5 text-right font-black text-emerald-600 dark:text-emerald-400">
                                            ${currencySymbol} ${data.summary.totalCashValuation.toLocaleString()}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>

                    <!-- Modal Footer Actions -->
                    <div class="flex-none p-3.5 sm:p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80 flex flex-wrap items-center justify-between gap-2.5">
                        <p class="text-[11px] text-gray-400 font-medium">Ready to export in curated high-resolution format.</p>
                        
                        <div class="flex items-center gap-2 flex-wrap">
                            <button type="button" onclick="window.exportStockSheetCsv()" class="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 border border-emerald-200 dark:border-emerald-800 active:scale-[0.98] transition-all cursor-pointer shadow-xs">
                                <i data-lucide="file-spreadsheet" class="w-3.5 h-3.5 text-emerald-600"></i>
                                <span>Download Excel / CSV</span>
                            </button>
                            <button type="button" onclick="window.exportStockSheetPdf()" class="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] transition-all cursor-pointer shadow-md">
                                <i data-lucide="download" class="w-3.5 h-3.5 text-white"></i>
                                <span>Download PDF Stock Sheet</span>
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        `;

        const existingModal = document.getElementById('stockSheetModalBackdrop');
        if (existingModal) existingModal.remove();

        document.body.insertAdjacentHTML('beforeend', modalHtml);
        if (window.lucide) window.lucide.createIcons();

    } catch (err) {
        console.error('[openDownloadStockSheetModal] Error:', err);
        if (window.toast) window.toast.error('Failed to prepare Stock Sheet preview');
    }
}

export function closeDownloadStockSheetModal() {
    const modal = document.getElementById('stockSheetModalBackdrop');
    if (modal) modal.remove();
}

// Attach globally to window
window.prepareStockSheetData = prepareStockSheetData;
window.exportStockSheetPdf = exportStockSheetPdf;
window.exportStockSheetCsv = exportStockSheetCsv;
window.openDownloadStockSheetModal = openDownloadStockSheetModal;
window.closeDownloadStockSheetModal = closeDownloadStockSheetModal;
