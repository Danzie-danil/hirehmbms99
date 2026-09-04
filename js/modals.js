window.renderPremiumSelect = function ({ id, options, selectedValue, placeholder = 'Select an option...', classes = '', searchable = true, onChange = '' }) {
    const selectedOption = options.find(o => o.value === selectedValue) || { label: placeholder, value: selectedValue || '' };
    const displayLabel = selectedOption.label;

    const itemsHtml = options.map(o => `
        <div class="dropdown-premium-item ${o.value === selectedValue ? 'active' : ''}"
             onclick="window.selectPremiumOption('${id}', '${o.value.toString().replace(/'/g, "\\'")}', '${o.label.toString().replace(/'/g, "\\'")}')"
             data-value="${o.value.toString()}"
             data-search="${o.label.toLowerCase()}">
            ${o.icon ? `<i data-lucide="${o.icon}" class="w-4 h-4"></i>` : ''}
            <span>${o.label}</span>
        </div>
    `).join('');

    const onChangeAttr = onChange ? ` data-onchange="${onChange.toString().replace(/"/g, '&quot;')}"` : '';

    return `
        <div class="relative premium-dropdown-container" id="container-${id}">
            <button type="button" class="form-input flex justify-between items-center pr-10 font-bold ${classes.includes('rounded-') ? '' : 'rounded-full'} ${classes}"
                    onclick="window.togglePremiumDropdown('${id}')">
                <span id="label-${id}" class="truncate text-left flex-1 min-w-0 mr-1">${displayLabel}</span>
                <input type="hidden" id="${id}" value="${selectedValue}"${onChangeAttr}>
                <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <i data-lucide="chevron-down" class="w-4 h-4"></i>
                </div>
            </button>
            <div id="list-${id}" class="dropdown-premium-list fixed z-[9999] hidden flex flex-col animate-in fade-in duration-150">
                ${searchable ? `
                <div class="p-2 bg-gray-50/60 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-800">
                    <div class="relative">
                        <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 pointer-events-none z-10"></i>
                        <input type="text" placeholder="${window.t('search', 'Search...')}"
                               class="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full pr-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none placeholder-gray-400"
                               style="padding-left: 2.85rem !important;"
                               onmousedown="event.stopPropagation()"
                               ontouchstart="event.stopPropagation()"
                               onclick="event.stopPropagation()"
                               oninput="window.filterPremiumDropdown('${id}', this.value)">
                    </div>
                </div>` : ''}
                <div class="max-h-[210px] sm:max-h-[400px] overflow-y-auto scroller-custom p-0" id="items-${id}">
                    ${itemsHtml}
                </div>
            </div>
        </div>
    `;
};

window.renderPremiumCategorySelect = function ({
    id = 'ciCategory',
    categories = [],
    selectedValue = '',
    itemType = 'product',
    placeholder = null,
    classes = ''
}) {
    const isService = itemType === 'service';
    const defaultPlaceholder = placeholder || (isService ? 'Select or type service category...' : 'Select or type category...');
    const selectedVal = (selectedValue || '').trim();

    // Filter strictly by itemType if type metadata exists on category objects
    const rawOptions = (categories || []).filter(c => {
        if (!c) return false;
        if (typeof c === 'object' && c.type) {
            const catType = c.type.toLowerCase().trim();
            if (isService) return catType === 'service';
            return catType === 'product';
        }
        return true;
    }).map(c => typeof c === 'string' ? c : c.name).filter(Boolean);
    const uniqueOptions = [...new Set(rawOptions)];

    if (selectedVal && !uniqueOptions.some(o => o.toLowerCase() === selectedVal.toLowerCase())) {
        uniqueOptions.unshift(selectedVal);
    }

    const isSelected = !!selectedVal;
    const displayLabel = isSelected ? selectedVal : defaultPlaceholder;

    const itemsHtml = uniqueOptions.map(cat => {
        const isCur = selectedVal.toLowerCase() === cat.toLowerCase();
        return `
        <div class="dropdown-premium-item ${isCur ? 'active bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-bold' : ''} flex items-center justify-between py-2 px-3.5 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors border-b border-gray-100/60 dark:border-gray-800/60 last:border-0"
             onclick="window.selectPremiumCategoryOption('${id}', '${cat.replace(/'/g, "\\'")}', '${itemType}')"
             data-value="${cat}"
             data-search="${cat.toLowerCase()}">
            <div class="flex items-center gap-2.5 min-w-0">
                <i data-lucide="${isService ? 'wrench' : 'tag'}" class="w-4 h-4 text-indigo-500 shrink-0"></i>
                <span class="truncate text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">${cat}</span>
            </div>
            ${isCur ? '<i data-lucide="check" class="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0"></i>' : ''}
        </div>
        `;
    }).join('');

    return `
        <div class="relative premium-dropdown-container" id="container-${id}">
            <button type="button" class="form-input flex justify-between items-center pr-10 font-bold w-full rounded-xl py-2.5 px-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm ${classes}"
                    onclick="window.togglePremiumDropdown('${id}')">
                <span id="label-${id}" data-placeholder="${defaultPlaceholder.replace(/"/g, '&quot;')}" class="truncate text-left flex-1 min-w-0 mr-1 text-xs sm:text-sm ${isSelected ? 'text-gray-900 dark:text-white font-bold' : 'text-gray-400 font-normal'}">${displayLabel}</span>
                <input type="hidden" id="${id}" value="${selectedVal}">
                <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <i data-lucide="chevron-down" class="w-4 h-4"></i>
                </div>
            </button>
            <div id="list-${id}" class="dropdown-premium-list fixed z-[9999] hidden flex flex-col animate-in fade-in duration-150 shadow-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-2xl overflow-hidden min-w-[260px] max-w-[380px]">
                <div class="p-2.5 bg-gray-50/90 dark:bg-gray-800/90 border-b border-gray-100 dark:border-gray-800">
                    <div class="relative">
                        <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 pointer-events-none z-10"></i>
                        <input type="text" id="search-input-${id}" placeholder="${isService ? 'Search or type new service category...' : 'Search or type new product category...'}"
                               class="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl pr-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none placeholder-gray-400"
                               style="padding-left: 2.5rem !important;"
                               onmousedown="event.stopPropagation()"
                               ontouchstart="event.stopPropagation()"
                               onclick="event.stopPropagation()"
                               oninput="window.filterPremiumCategoryDropdown('${id}', this.value, '${itemType}')">
                    </div>
                </div>
                <!-- Dynamic In-Place Create Button when no exact match or on query -->
                <div id="create-action-${id}" class="hidden p-2 border-b border-gray-100 dark:border-gray-800 bg-indigo-50/60 dark:bg-indigo-950/40">
                    <button type="button" id="create-btn-${id}" onclick="window.createAndSelectNewCategory('${id}', '${itemType}')" class="w-full py-1.5 px-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer">
                        <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i> <span id="create-text-${id}">Add as new category</span>
                    </button>
                </div>
                <div class="max-h-[220px] overflow-y-auto scroller-custom p-0" id="items-${id}">
                    ${itemsHtml || `<div id="empty-notice-${id}" class="text-xs text-gray-400 text-center py-4 px-3">No categories yet. Type above to add one!</div>`}
                </div>
            </div>
        </div>
    `;
};

window.filterPremiumCategoryDropdown = function (id, query, itemType = 'product') {
    const list = document.getElementById(`list-${id}`);
    if (!list) return;

    const cleanQuery = (query || '').trim();
    const qLower = cleanQuery.toLowerCase();
    const items = list.querySelectorAll('.dropdown-premium-item');
    let matchCount = 0;
    let exactMatch = false;

    items.forEach(item => {
        const itemText = (item.getAttribute('data-search') || '').toLowerCase();
        if (!qLower || itemText.includes(qLower)) {
            item.classList.remove('hidden');
            matchCount++;
            if (itemText === qLower) exactMatch = true;
        } else {
            item.classList.add('hidden');
        }
    });

    const createAction = document.getElementById(`create-action-${id}`);
    const createText = document.getElementById(`create-text-${id}`);
    const emptyNotice = document.getElementById(`empty-notice-${id}`);

    if (cleanQuery && !exactMatch) {
        if (createAction) {
            createAction.classList.remove('hidden');
            if (createText) createText.textContent = `+ Add "${cleanQuery}" as new category`;
        }
        if (emptyNotice) emptyNotice.classList.add('hidden');
    } else {
        if (createAction) createAction.classList.add('hidden');
        if (emptyNotice) emptyNotice.classList.toggle('hidden', matchCount > 0);
    }
};

window.createAndSelectNewCategory = async function (id, itemType = 'product') {
    const searchInput = document.getElementById(`search-input-${id}`);
    const newCatName = searchInput ? searchInput.value.trim() : '';
    if (!newCatName) return;

    await window.selectPremiumCategoryOption(id, newCatName, itemType);
};

window.selectPremiumCategoryOption = async function (id, categoryName, itemType = 'product') {
    const input = document.getElementById(id);
    const labelSpan = document.getElementById(`label-${id}`);

    if (input) {
        input.value = categoryName;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (labelSpan) {
        labelSpan.textContent = categoryName;
        labelSpan.classList.remove('text-gray-400', 'font-normal');
        labelSpan.classList.add('text-gray-900', 'dark:text-white', 'font-bold');
    }

    // Register / ensure category in local & remote database in the background
    if (categoryName && window.dbCategories && window.state?.ownerId) {
        try {
            window.dbCategories.ensureCategory(window.state.ownerId, categoryName, itemType);
        } catch (e) {}
    }

    window.closePremiumDropdown(id);

    // If autoFillSKU is applicable
    if (id === 'ciCategory' && typeof window.autoFillSKU === 'function') {
        const skuInput = document.getElementById('ciSku');
        const nameInput = document.getElementById('ciName');
        if (skuInput && (!skuInput.value || skuInput.value.startsWith('GEN-') || skuInput.value.startsWith('SRV-'))) {
            window.autoFillSKU('ciCategory', 'ciName', 'ciSku');
        }
    }
};

window.renderPremiumMultiSelect = function ({ id, options, selectedValues = [], placeholder = 'Select staff/personnel...', classes = '', searchable = true, onChange = '' }) {
    const displayLabel = selectedValues.length > 0 ? selectedValues.join(', ') : placeholder;
    const onChangeAttr = onChange ? ` data-onchange="${onChange.toString().replace(/"/g, '&quot;')}"` : '';

    const itemsHtml = options.map(o => {
        const valStr = o.value.toString();
        const isSelected = selectedValues.includes(valStr);
        return `
        <div class="dropdown-premium-item ${isSelected ? 'active bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 font-bold' : ''} flex items-center justify-between py-1.5 px-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-b border-gray-100/50 dark:border-gray-800/50 last:border-0"
             onclick="window.togglePremiumMultiSelectOption('${id}', '${valStr.replace(/'/g, "\\'")}', '${o.label.replace(/'/g, "\\'")}')"
             data-value="${valStr}"
             data-search="${(o.label + ' ' + (o.subtitle || '')).toLowerCase()}">
            <div class="flex items-center gap-2 min-w-0 flex-1">
                ${o.icon ? `<i data-lucide="${o.icon}" class="w-4 h-4 text-indigo-500 shrink-0"></i>` : ''}
                <div class="flex flex-col min-w-0 flex-1">
                    <span class="truncate text-xs font-bold text-gray-900 dark:text-white leading-tight">${o.label}</span>
                    ${o.subtitle ? `<span class="text-[10px] text-gray-400 font-medium">${o.subtitle}</span>` : ''}
                </div>
            </div>
            <div class="w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 dark:border-gray-600'}">
                ${isSelected ? '<i data-lucide="check" class="w-3 h-3 stroke-[3]"></i>' : ''}
            </div>
        </div>`;
    }).join('');

    return `
        <div class="relative premium-dropdown-container" id="container-${id}">
            <button type="button" class="form-input flex justify-between items-center pr-10 font-bold w-full rounded-2xl ${classes}"
                    onclick="window.togglePremiumDropdown('${id}')">
                <span id="label-${id}" data-placeholder="${placeholder.replace(/"/g, '&quot;')}" class="truncate text-left flex-1 min-w-0 mr-1 text-xs text-gray-900 dark:text-white font-bold">${displayLabel}</span>
                <input type="hidden" id="${id}" value="${selectedValues.join(', ')}"${onChangeAttr}>
                <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <i data-lucide="chevron-down" class="w-4 h-4"></i>
                </div>
            </button>
            <div id="list-${id}" class="dropdown-premium-list fixed z-[9999] hidden flex flex-col animate-in fade-in duration-150 shadow-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-2xl overflow-hidden min-w-[280px]">
                ${searchable ? `
                <div class="p-2 bg-gray-50/60 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-800">
                    <div class="relative">
                        <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 pointer-events-none z-10"></i>
                        <input type="text" placeholder="${window.t('search', 'Search staff & customers...')}"
                               class="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full pr-3 py-1.5 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none placeholder-gray-400"
                               style="padding-left: 2.85rem !important;"
                               onmousedown="event.stopPropagation()"
                               ontouchstart="event.stopPropagation()"
                               onclick="event.stopPropagation()"
                               oninput="window.filterPremiumDropdown('${id}', this.value)">
                    </div>
                </div>` : ''}
                <div class="max-h-[210px] sm:max-h-[300px] overflow-y-auto scroller-custom p-0" id="items-${id}">
                    ${itemsHtml}
                </div>
            </div>
        </div>
    `;
};

window.togglePremiumMultiSelectOption = function (id, value, label) {
    const input = document.getElementById(id);
    const labelSpan = document.getElementById(`label-${id}`);
    const list = document.getElementById(`list-${id}`);
    const placeholder = labelSpan?.getAttribute('data-placeholder') || 'Select options...';

    if (!input) return;

    let selectedArray = input.value.split(',').map(s => s.trim()).filter(Boolean);
    const valIndex = selectedArray.indexOf(value);

    if (valIndex >= 0) {
        selectedArray.splice(valIndex, 1);
    } else {
        selectedArray.push(value);
    }

    input.value = selectedArray.join(', ');
    input.dispatchEvent(new Event('change', { bubbles: true }));

    if (labelSpan) {
        labelSpan.textContent = selectedArray.length > 0 ? selectedArray.join(', ') : placeholder;
    }

    // Auto update shiftStaffCount if id is shiftStaff
    if (id === 'shiftStaff') {
        const countInput = document.getElementById('shiftStaffCount');
        if (countInput) {
            countInput.value = Math.max(1, selectedArray.length);
        }
    }

    if (list) {
        list.querySelectorAll('.dropdown-premium-item').forEach(item => {
            const itemVal = item.getAttribute('data-value');
            const isSel = selectedArray.includes(itemVal);
            item.classList.toggle('active', isSel);
            item.classList.toggle('bg-indigo-50/80', isSel);
            item.classList.toggle('dark:bg-indigo-950/40', isSel);
            item.classList.toggle('text-indigo-600', isSel);
            item.classList.toggle('dark:text-indigo-300', isSel);
            item.classList.toggle('font-bold', isSel);

            const checkIcon = item.querySelector('.w-4.h-4.rounded');
            if (checkIcon) {
                checkIcon.className = `w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSel ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-gray-300 dark:border-gray-600'}`;
                checkIcon.innerHTML = isSel ? '<i data-lucide="check" class="w-3 h-3 stroke-[3]"></i>' : '';
            }
        });
        if (window.lucide) window.lucide.createIcons({ scope: list });
    }
};

window.formatReportDisplayDate = function (dateStr) {
    if (!dateStr) return 'Select Date';
    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const year = parts[0];
            const month = parseInt(parts[1], 10);
            const day = parseInt(parts[2], 10);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            if (months[month - 1]) {
                return `${months[month - 1]} ${day}, ${year}`;
            }
        }
    } catch (e) {}
    return dateStr;
};

window._calState = {};

window.renderCalendarGridHtml = function (id, year, month, view = 'days') {
    const hiddenInput = document.getElementById(id);
    const selectedDate = hiddenInput ? hiddenInput.value : '';
    const minDate = hiddenInput ? (hiddenInput.getAttribute('data-min') || hiddenInput.getAttribute('min') || '') : '';
    const maxDate = hiddenInput ? (hiddenInput.getAttribute('data-max') || hiddenInput.getAttribute('max') || '') : '';
    const now = new Date();
    const currentYear = now.getFullYear();
    const todayIso = `${currentYear}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    // 1. YEAR SELECTOR VIEW
    if (view === 'year') {
        const startYr = currentYear - 20;
        const endYr = currentYear + 20;
        let yearsHtml = '';

        for (let y = startYr; y <= endYr; y++) {
            const isSelected = y === year;
            yearsHtml += `
                <button type="button" class="py-2 px-1 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${isSelected ? 'bg-indigo-600 text-white shadow-xs scale-105' : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60'}" onclick="window.selectCalendarYear('${id}', ${y})">
                    ${y}
                </button>
            `;
        }

        return `
            <div class="p-1 space-y-3 select-none">
                <div class="flex items-center justify-between px-1 border-b border-gray-100 dark:border-gray-700/60 pb-2">
                    <span class="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Select Year</span>
                    <button type="button" class="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer" onclick="window.setCalendarView('${id}', 'days')">Cancel</button>
                </div>
                <div class="max-h-[220px] overflow-y-auto scroller-custom grid grid-cols-3 gap-2 p-1" id="cal-years-${id}">
                    ${yearsHtml}
                </div>
            </div>
        `;
    }

    // 2. MONTH SELECTOR VIEW
    if (view === 'month') {
        let monthsHtml = '';
        for (let m = 0; m < 12; m++) {
            const isSelected = m === month;
            monthsHtml += `
                <button type="button" class="py-2.5 px-1 text-xs font-extrabold rounded-xl transition-all cursor-pointer ${isSelected ? 'bg-indigo-600 text-white shadow-xs scale-105' : 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60'}" onclick="window.selectCalendarMonth('${id}', ${m})">
                    ${monthShort[m]}
                </button>
            `;
        }

        return `
            <div class="p-1 space-y-3 select-none">
                <div class="flex items-center justify-between px-1 border-b border-gray-100 dark:border-gray-700/60 pb-2">
                    <span class="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Select Month (${year})</span>
                    <button type="button" class="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer" onclick="window.setCalendarView('${id}', 'days')">Cancel</button>
                </div>
                <div class="grid grid-cols-3 gap-2 p-1">
                    ${monthsHtml}
                </div>
            </div>
        `;
    }

    // 3. DAY GRID CALENDAR VIEW (DEFAULT)
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    let daysHtml = '';

    // Previous Month Filler Days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
        const dayNum = prevMonthDays - i;
        daysHtml += `<div class="h-8 flex items-center justify-center text-[11px] font-semibold text-gray-300 dark:text-gray-600 cursor-not-allowed select-none">${dayNum}</div>`;
    }

    // Current Month Days
    for (let day = 1; day <= totalDays; day++) {
        const mStr = String(month + 1).padStart(2, '0');
        const dStr = String(day).padStart(2, '0');
        const dateIso = `${year}-${mStr}-${dStr}`;

        const isSelected = dateIso === selectedDate;
        const isToday = dateIso === todayIso;
        const isOutOfBounds = (minDate && dateIso < minDate) || (maxDate && dateIso > maxDate);

        if (isOutOfBounds) {
            daysHtml += `
                <button type="button" disabled class="h-8 w-8 mx-auto flex items-center justify-center text-xs font-medium rounded-xl text-gray-300 dark:text-gray-600 opacity-40 cursor-not-allowed select-none">
                    ${day}
                </button>
            `;
        } else {
            let cellClasses = 'h-8 w-8 mx-auto flex items-center justify-center text-xs font-extrabold rounded-xl transition-all cursor-pointer ';
            if (isSelected) {
                cellClasses += 'bg-indigo-600 text-white shadow-xs scale-105';
            } else if (isToday) {
                cellClasses += 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 hover:bg-indigo-100';
            } else {
                cellClasses += 'text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/60 active:scale-95';
            }

            daysHtml += `
                <button type="button" class="${cellClasses}" onclick="window.selectCalendarDay('${id}', '${dateIso}')">
                    ${day}
                </button>
            `;
        }
    }

    return `
        <div class="p-1 space-y-3 select-none">
            <!-- Calendar Header Navigation -->
            <div class="flex items-center justify-between px-1">
                <button type="button" class="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer" onclick="window.changeCalendarMonth('${id}', -1)">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i>
                </button>
                <button type="button" class="px-2 py-1 rounded-xl hover:bg-indigo-50 dark:hover:bg-gray-700/80 text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider transition-colors cursor-pointer flex items-center gap-1 group" onclick="window.setCalendarView('${id}', 'year')">
                    <span>${monthNames[month]} ${year}</span>
                    <i data-lucide="chevron-down" class="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-500 transition-colors"></i>
                </button>
                <button type="button" class="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors cursor-pointer" onclick="window.changeCalendarMonth('${id}', 1)">
                    <i data-lucide="chevron-right" class="w-4 h-4"></i>
                </button>
            </div>

            <!-- Day of Week Headers -->
            <div class="grid grid-cols-7 gap-1 text-center border-b border-gray-100 dark:border-gray-700/60 pb-1.5">
                ${daysOfWeek.map(d => `<span class="text-[10px] font-black text-gray-400 uppercase tracking-wider">${d}</span>`).join('')}
            </div>

            <!-- Days Grid -->
            <div class="grid grid-cols-7 gap-1 text-center">
                ${daysHtml}
            </div>

            <!-- Footer Actions -->
            <div class="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/60 text-[11px] font-bold">
                <button type="button" onclick="window.selectCalendarDay('${id}', '${todayIso}')" class="text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer">
                    Today
                </button>
                <button type="button" onclick="window.closePremiumDropdown('${id}')" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer">
                    Done
                </button>
            </div>
        </div>
    `;
};

window.setCalendarView = function (id, view) {
    if (!window._calState[id]) return;
    window._calState[id].view = view;
    const { year, month } = window._calState[id];
    const list = document.getElementById(`list-${id}`);
    if (list) {
        list.innerHTML = window.renderCalendarGridHtml(id, year, month, view);
        if (window.lucide) window.lucide.createIcons({ scope: list });
        if (view === 'year') {
            setTimeout(() => {
                const activeYrBtn = list.querySelector('.bg-indigo-600');
                if (activeYrBtn) activeYrBtn.scrollIntoView({ block: 'center' });
            }, 50);
        }
    }
};

window.selectCalendarYear = function (id, year) {
    if (!window._calState[id]) return;
    window._calState[id].year = year;
    window.setCalendarView(id, 'month');
};

window.selectCalendarMonth = function (id, month) {
    if (!window._calState[id]) return;
    window._calState[id].month = month;
    window.setCalendarView(id, 'days');
};

window.renderPremiumDatePicker = function ({ id, selectedValue, onChange = '', classes = '', placeholder = 'Select Date', required = false, min = '', max = '' }) {
    const formattedDate = window.formatReportDisplayDate ? window.formatReportDisplayDate(selectedValue) : (selectedValue || placeholder);
    const onChangeAttr = onChange ? ` data-onchange="${onChange.toString().replace(/"/g, '&quot;')}"` : '';
    const minAttr = min ? ` data-min="${min}"` : '';
    const maxAttr = max ? ` data-max="${max}"` : '';
    const reqAttr = required ? ' required' : '';

    return `
        <div class="relative premium-dropdown-container w-full" id="container-${id}">
            <button type="button" class="form-input flex justify-between items-center pr-10 font-bold ${classes.includes('rounded-') ? '' : 'rounded-full'} ${classes}"
                    onclick="window.toggleCustomCalendarPicker('${id}')">
                <div class="flex items-center gap-2 min-w-0 pointer-events-none">
                    <i data-lucide="calendar" class="w-4 h-4 text-indigo-500 shrink-0"></i>
                    <span class="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200 truncate" id="label-${id}">${formattedDate}</span>
                </div>
                <input type="hidden" id="${id}" value="${selectedValue || ''}"${onChangeAttr}${minAttr}${maxAttr}${reqAttr}>
                <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <i data-lucide="chevron-down" class="w-4 h-4"></i>
                </div>
            </button>
            <div id="list-${id}" class="dropdown-premium-list fixed z-[9999] hidden flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-md p-3 w-[270px] sm:w-[290px] animate-in fade-in duration-150">
            </div>
        </div>
    `;
};

window.toggleCustomCalendarPicker = function (id) {
    const input = document.getElementById(id);
    const dateVal = input ? input.value : '';
    let yr = new Date().getFullYear();
    let mo = new Date().getMonth();

    if (dateVal && dateVal.includes('-')) {
        const parts = dateVal.split('-');
        if (parts.length === 3) {
            yr = parseInt(parts[0], 10) || yr;
            mo = (parseInt(parts[1], 10) - 1);
            if (isNaN(mo) || mo < 0 || mo > 11) mo = new Date().getMonth();
        }
    }

    window._calState[id] = { year: yr, month: mo, view: 'days' };
    const list = document.getElementById(`list-${id}`);
    if (list) {
        list.innerHTML = window.renderCalendarGridHtml(id, yr, mo, 'days');
    }
    window.togglePremiumDropdown(id);
};

window.changeCalendarMonth = function (id, delta) {
    if (!window._calState[id]) return;
    let { year, month } = window._calState[id];
    month += delta;
    if (month < 0) {
        month = 11;
        year -= 1;
    } else if (month > 11) {
        month = 0;
        year += 1;
    }
    window._calState[id] = { year, month };
    const list = document.getElementById(`list-${id}`);
    if (list) {
        list.innerHTML = window.renderCalendarGridHtml(id, year, month);
        if (window.lucide) window.lucide.createIcons({ scope: list });
    }
};

window.selectCalendarDay = function (id, isoDateStr) {
    const input = document.getElementById(id);
    const labelSpan = document.getElementById(`label-${id}`);
    if (input) {
        input.value = isoDateStr;
        const onChangeAttr = input.getAttribute('data-onchange');
        if (onChangeAttr) {
            try {
                const fn = new Function('value', onChangeAttr.replace(/this\.value/g, 'value'));
                fn(isoDateStr);
            } catch (e) {
                console.error('Error executing date picker onchange:', e);
            }
        }
        input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (labelSpan) {
        labelSpan.textContent = window.formatReportDisplayDate ? window.formatReportDisplayDate(isoDateStr) : isoDateStr;
    }
    window.closePremiumDropdown(id);
};

window.closePremiumDropdown = function (id) {
    const list = document.getElementById(`list-${id}`);
    const container = document.getElementById(`container-${id}`);
    if (list) {
        // Do not close if user is actively focusing an input inside the dropdown on mobile
        const activeEl = document.activeElement;
        if (activeEl && list.contains(activeEl) && window.innerWidth < 1024) {
            return;
        }

        list.classList.add('hidden');
        const searchInput = list.querySelector('input[type="text"]');
        if (searchInput) {
            searchInput.value = '';
            window.filterPremiumDropdown(id, '');
        }
        // Return to original container to keep DOM tree clean on view re-renders
        if (container && list.parentNode === document.body) {
            container.appendChild(list);
        }
    }
};

window.togglePremiumDropdown = function (id) {
    document.querySelectorAll('.dropdown-premium-picker-modal, .dropdown-premium-list').forEach(el => {
        if (el.id !== `list-${id}`) {
            const otherId = el.id.replace('list-', '');
            window.closePremiumDropdown(otherId);
        }
    });
    const list = document.getElementById(`list-${id}`);
    const container = document.getElementById(`container-${id}`);
    if (list && container) {
        const isHidden = list.classList.contains('hidden');
        if (isHidden) {
            // Append to body (Portal pattern) so it floats freely and ignores parent pointer event clipping
            document.body.appendChild(list);
            
            // Temporarily show to read measurements
            list.classList.remove('hidden');
            
            if (list.classList.contains('dropdown-premium-list')) {
                const rect = container.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const itemsContainer = list.querySelector(`#items-${id}`) || list.querySelector('.scroller-custom') || list.querySelector('.overflow-y-auto');
                const searchBox = list.querySelector('.p-2.bg-gray-50\\/60') || list.querySelector('.p-2');
                const searchHeight = searchBox ? searchBox.offsetHeight : 45;
                
                // Find scrollable parent container to check for potential clipping
                let scrollParent = null;
                let p = container.parentNode;
                while (p && p !== document.body) {
                    const style = window.getComputedStyle(p);
                    if (style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflow === 'auto' || style.overflow === 'scroll') {
                        scrollParent = p;
                        break;
                    }
                    p = p.parentNode;
                }
                
                let spaceBelow = viewportHeight - rect.bottom - 12;
                let spaceAbove = rect.top - 12;
                if (scrollParent) {
                    const parentRect = scrollParent.getBoundingClientRect();
                    const parentSpaceBelow = parentRect.bottom - rect.bottom - 12;
                    const parentSpaceAbove = rect.top - parentRect.top - 12;
                    if (parentSpaceBelow > 80) spaceBelow = Math.min(spaceBelow, parentSpaceBelow);
                    if (parentSpaceAbove > 80) spaceAbove = Math.min(spaceAbove, parentSpaceAbove);
                }
                
                const isCalendar = Boolean(list.querySelector('.grid-cols-7') || window._calState[id]);
                const pickerWidth = isCalendar ? Math.max(rect.width, 280) : rect.width;
                let leftPos = rect.left;
                if (leftPos + pickerWidth > window.innerWidth - 12) {
                    leftPos = Math.max(12, window.innerWidth - pickerWidth - 12);
                }

                list.style.position = 'fixed';
                list.style.left = `${leftPos}px`;
                list.style.width = `${pickerWidth}px`;
                list.style.bottom = 'auto';
                list.style.zIndex = '99999';
                
                // Remove previous animation classes
                list.classList.remove('slide-in-from-top-2', 'slide-in-from-bottom-2');
                
                const forceUp = list.classList.contains('open-up');
                const forceDown = list.classList.contains('open-down');
                const shouldOpenUp = forceUp || (!forceDown && (spaceBelow < 250 && spaceAbove > spaceBelow));
                
                if (shouldOpenUp) {
                    const maxAvailable = Math.max(120, spaceAbove - 8);
                    const maxItemsHeight = Math.min(320, Math.max(70, maxAvailable - searchHeight));
                    if (itemsContainer) itemsContainer.style.maxHeight = `${maxItemsHeight}px`;
                    const actualDropdownHeight = list.offsetHeight || (maxItemsHeight + searchHeight);
                    list.style.top = `${Math.max(8, rect.top - actualDropdownHeight - 6)}px`;
                    list.classList.add('slide-in-from-bottom-2');
                } else {
                    const maxAvailable = Math.max(120, spaceBelow - 8);
                    const maxItemsHeight = Math.min(320, Math.max(70, maxAvailable - searchHeight));
                    if (itemsContainer) itemsContainer.style.maxHeight = `${maxItemsHeight}px`;
                    list.style.top = `${rect.bottom + 6}px`;
                    list.classList.add('slide-in-from-top-2');
                }
            }
            
            lucide.createIcons({ scope: list });
            const searchInput = list.querySelector('input[type="text"]');
            if (searchInput) {
                setTimeout(() => searchInput.focus(), 80);
            }
        } else {
            window.closePremiumDropdown(id);
        }
    }
};

window.updatePremiumSelectOptions = function (id, options, selectedValue = '') {
    const container = document.getElementById(`container-${id}`);
    const itemsContainer = document.getElementById(`items-${id}`) || document.getElementById(`list-${id}`);
    const label = document.getElementById(`label-${id}`);
    const hiddenInput = document.getElementById(id);

    if (!itemsContainer || !container) return;

    const itemsHtml = options.map(o => `
        <div class="dropdown-premium-item ${o.value === selectedValue ? 'active' : ''}"
             onclick="window.selectPremiumOption('${id}', '${o.value.toString().replace(/'/g, "\\'")}', '${o.label.toString().replace(/'/g, "\\'")}')"
             data-value="${o.value.toString()}"
             data-search="${o.label.toLowerCase()}">
            ${o.icon ? `<i data-lucide="${o.icon}" class="w-4 h-4"></i>` : ''}
            <span>${o.label}</span>
        </div>
    `).join('');

    itemsContainer.innerHTML = itemsHtml;

    if (selectedValue !== undefined) {
        const selectedOption = options.find(o => o.value === selectedValue) || { label: 'Select an option...', value: selectedValue || '' };
        if (label) label.textContent = selectedOption.label;
        if (hiddenInput) hiddenInput.value = selectedValue;
    }

    lucide.createIcons({ scope: itemsContainer });
};

window.filterPremiumDropdown = function (id, query) {
    const itemsContainer = document.getElementById(`items-${id}`) || document.getElementById(`list-${id}`);
    if (!itemsContainer) return;
    const q = query.toLowerCase();
    itemsContainer.querySelectorAll('.dropdown-premium-item').forEach(item => {
        const text = item.getAttribute('data-search') || '';
        item.style.display = text.includes(q) ? '' : 'none';
    });
};

window.selectPremiumOption = function (id, value, label) {
    const input = document.getElementById(id);
    const labelSpan = document.getElementById(`label-${id}`);
    const list = document.getElementById(`list-${id}`);
    if (input) {
        input.value = value;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        const onchangeAttr = input.getAttribute('data-onchange');
        if (onchangeAttr) {
            try {
                const fn = new Function('value', onchangeAttr.replace(/this\.value/g, 'value'));
                fn(value);
            } catch (e) {
                console.error('Error executing select onchange:', e);
            }
        }
        if (id === 'saleProduct' && window.onSaleProductChange) window.onSaleProductChange();
        else if (window.updateSaleTotal) window.updateSaleTotal();
    }
    if (labelSpan) labelSpan.textContent = label;
    if (list) {
        list.querySelectorAll('.dropdown-premium-item').forEach(item => {
            item.classList.toggle('active', item.getAttribute('data-value') === value.toString());
        });
    }
    // Force close when an option is selected
    if (list) {
        list.classList.add('hidden');
        const container = document.getElementById(`container-${id}`);
        if (container && list.parentNode === document.body) {
            container.appendChild(list);
        }
    }
};

document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.premium-dropdown-container') && !e.target.closest('.dropdown-premium-picker-modal') && !e.target.closest('.dropdown-premium-list')) {
        document.querySelectorAll('.dropdown-premium-picker-modal, .dropdown-premium-list').forEach(el => {
            const id = el.id.replace('list-', '');
            // Force close on explicit click outside
            el.classList.add('hidden');
            const container = document.getElementById(`container-${id}`);
            if (container && el.parentNode === document.body) {
                container.appendChild(el);
            }
        });
    }
});

document.addEventListener('touchstart', (e) => {
    if (!e.target.closest('.premium-dropdown-container') && !e.target.closest('.dropdown-premium-picker-modal') && !e.target.closest('.dropdown-premium-list')) {
        document.querySelectorAll('.dropdown-premium-picker-modal, .dropdown-premium-list').forEach(el => {
            const id = el.id.replace('list-', '');
            el.classList.add('hidden');
            const container = document.getElementById(`container-${id}`);
            if (container && el.parentNode === document.body) {
                container.appendChild(el);
            }
        });
    }
}, { passive: true });

document.addEventListener('scroll', (e) => {
    document.querySelectorAll('.dropdown-premium-list').forEach(el => {
        if (el.classList.contains('hidden')) return;

        // Do not close if focus is currently inside the search input or dropdown
        const activeEl = document.activeElement;
        if (activeEl && (el.contains(activeEl) || activeEl.closest('.dropdown-premium-list') === el)) {
            return;
        }

        // Do not close if scroll target is inside the dropdown list itself
        if (el.contains(e.target)) return;

        // Ignore window/modal scroll events on mobile devices triggered by soft keyboard opening
        if (window.innerWidth < 1024) {
            return;
        }

        const id = el.id.replace('list-', '');
        const container = document.getElementById(`container-${id}`);
        el.classList.add('hidden');
        if (container && el.parentNode === document.body) {
            container.appendChild(el);
        }
    });
}, true);

window.getModalHTML = function (type, data) {
    switch (type) {
        case 'daily_summary':
        case 'dailySummary': {
            const breakdown = (Array.isArray(data) ? data : (window.currentBranchBreakdown || []));
            const totalRev = breakdown.reduce((s, b) => s + (b.revenue || 0), 0);
            const totalCogs = breakdown.reduce((s, b) => s + (b.cogs || 0), 0);
            const totalProfit = breakdown.reduce((s, b) => s + (b.profit || 0), 0);
            const totalCount = breakdown.reduce((s, b) => s + (b.count || 0), 0);
            const overallMargin = totalRev > 0 ? Math.round((totalProfit / totalRev) * 100) : 0;
            const totalProfitClass = totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
            const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

            const tableRowsHtml = breakdown.map(b => {
                const margin = b.revenue > 0 ? Math.round((b.profit / b.revenue) * 100) : 0;
                const profitClass = b.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
                const branchName = b.branch ? (b.branch.name || b.branch) : 'Branch';
                return `
                <tr class="hover:bg-slate-50/70 dark:hover:bg-gray-800/50 transition-colors">
                    <td class="px-3 sm:px-4 py-3 font-bold text-gray-900 dark:text-white">
                        <div class="flex items-center gap-2">
                            <span class="w-2 h-2 rounded-full ${b.revenue > 0 ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-gray-600'}"></span>
                            <span class="truncate">${branchName}</span>
                        </div>
                    </td>
                    <td class="px-3 sm:px-4 py-3 text-right font-black text-slate-900 dark:text-white">${fmt.currency(b.revenue)}</td>
                    <td class="px-3 sm:px-4 py-3 text-right font-medium text-amber-600 dark:text-amber-400">${fmt.currency(b.cogs)}</td>
                    <td class="px-3 sm:px-4 py-3 text-right font-black ${profitClass}">${fmt.currency(b.profit)}</td>
                    <td class="px-3 sm:px-4 py-3 text-right font-bold text-slate-500 dark:text-gray-400">${margin}%</td>
                    <td class="px-3 sm:px-4 py-3 text-right font-bold text-slate-600 dark:text-gray-300">${b.count}</td>
                </tr>`;
            }).join('');

            const cardsHtml = breakdown.map(b => {
                const margin = b.revenue > 0 ? Math.round((b.profit / b.revenue) * 100) : 0;
                const profitClass = b.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
                const progressPct = Math.min(100, Math.max(0, margin));
                const branchName = b.branch ? (b.branch.name || b.branch) : 'Branch';
                return `
                <div class="bg-white dark:bg-gray-800 rounded-2xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-gray-700/80 shadow-xs space-y-3">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-2 min-w-0">
                            <span class="w-2.5 h-2.5 rounded-full ${b.revenue > 0 ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-gray-600'}"></span>
                            <h4 class="font-extrabold text-sm text-gray-900 dark:text-white truncate">${branchName}</h4>
                        </div>
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300">${b.count} txns</span>
                    </div>
                    <div class="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-gray-700/60 text-center">
                        <div>
                            <p class="text-[9px] font-bold uppercase tracking-wider text-slate-400">Revenue</p>
                            <p class="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">${fmt.currency(b.revenue)}</p>
                        </div>
                        <div>
                            <p class="text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">COGS</p>
                            <p class="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 truncate">${fmt.currency(b.cogs)}</p>
                        </div>
                        <div>
                            <p class="text-[9px] font-bold uppercase tracking-wider ${profitClass}">Profit (${margin}%)</p>
                            <p class="text-xs sm:text-sm font-black ${profitClass} truncate">${fmt.currency(b.profit)}</p>
                        </div>
                    </div>
                    <div class="w-full bg-slate-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                        <div class="h-1.5 rounded-full ${b.profit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}" style="width: ${progressPct}%"></div>
                    </div>
                </div>`;
            }).join('');

            return `
            <!-- Top Navigation Header -->
            <div class="modal-top-nav flex-none flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3.5 bg-white dark:bg-gray-800 border-b border-slate-200/80 dark:border-gray-700/80">
                <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <button type="button" onclick="closeModal()" data-close-text="${typeof window.t === 'function' ? window.t('back', 'Back') : 'Back'}" class="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                        <i data-lucide="chevron-left" class="w-4 h-4"></i>
                        <span>${typeof window.t === 'function' ? window.t('back', 'Back') : 'Back'}</span>
                    </button>
                    <div class="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <i data-lucide="bar-chart-2" class="w-4 h-4"></i>
                    </div>
                    <div class="min-w-0">
                        <h3 class="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate">Daily Branch Summary</h3>
                        <p class="text-[10px] text-slate-400 font-medium truncate">${todayLabel} · Performance Breakdown</p>
                    </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <span class="px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-slate-100 dark:bg-gray-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-gray-600">
                        ${breakdown.length} Branches
                    </span>
                    <span class="hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40">
                        ${totalCount} Transactions
                    </span>
                </div>
            </div>

            <!-- Scrollable Main Content -->
            <div class="modal-main-content flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-6 space-y-4 scroller-custom">
                <!-- KPI Summary Strip -->
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                    <div class="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-gray-700/80 shadow-xs">
                        <p class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Revenue</p>
                        <p class="text-sm sm:text-xl font-black text-slate-900 dark:text-white truncate mt-0.5">${fmt.currency(totalRev)}</p>
                    </div>
                    <div class="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-gray-700/80 shadow-xs">
                        <p class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Cost of Goods</p>
                        <p class="text-sm sm:text-xl font-black text-amber-600 dark:text-amber-400 truncate mt-0.5">${fmt.currency(totalCogs)}</p>
                    </div>
                    <div class="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-gray-700/80 shadow-xs">
                        <p class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${totalProfitClass}">Gross Profit (${overallMargin}%)</p>
                        <p class="text-sm sm:text-xl font-black ${totalProfitClass} truncate mt-0.5">${fmt.currency(totalProfit)}</p>
                    </div>
                    <div class="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-gray-700/80 shadow-xs">
                        <p class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Active Branches</p>
                        <p class="text-sm sm:text-xl font-black text-indigo-600 dark:text-indigo-400 truncate mt-0.5">${breakdown.filter(b => b.revenue > 0).length} / ${breakdown.length}</p>
                    </div>
                </div>

                <!-- Desktop Matrix Table -->
                <div class="hidden sm:block bg-white dark:bg-gray-800 rounded-2xl border border-slate-200/80 dark:border-gray-700/80 shadow-xs overflow-hidden">
                    <div class="px-4 py-3 border-b border-slate-100 dark:border-gray-700/80 flex items-center justify-between">
                        <h4 class="font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-wider">Branch Financial Matrix</h4>
                        <span class="text-[10px] font-bold text-slate-400">All amounts in ${(window.state && window.state.profile && window.state.profile.currency) || 'TZS'}</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-xs">
                            <thead class="bg-slate-50/80 dark:bg-gray-900/60 border-b border-slate-200/80 dark:border-gray-700/80">
                                <tr>
                                    <th class="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Branch</th>
                                    <th class="text-right px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Today Revenue</th>
                                    <th class="text-right px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">COGS</th>
                                    <th class="text-right px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Gross Profit</th>
                                    <th class="text-right px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Margin</th>
                                    <th class="text-right px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Sales</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 dark:divide-gray-700/60">
                                ${tableRowsHtml}
                            </tbody>
                            <tfoot class="bg-slate-100/60 dark:bg-gray-900/80 font-black border-t-2 border-slate-200 dark:border-gray-700">
                                <tr>
                                    <td class="px-4 py-3 text-slate-900 dark:text-white uppercase tracking-wider">Consolidated Total</td>
                                    <td class="px-4 py-3 text-right text-slate-900 dark:text-white">${fmt.currency(totalRev)}</td>
                                    <td class="px-4 py-3 text-right text-amber-600 dark:text-amber-400">${fmt.currency(totalCogs)}</td>
                                    <td class="px-4 py-3 text-right ${totalProfitClass}">${fmt.currency(totalProfit)}</td>
                                    <td class="px-4 py-3 text-right text-slate-600 dark:text-gray-300">${overallMargin}%</td>
                                    <td class="px-4 py-3 text-right text-slate-900 dark:text-white">${totalCount}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>

                <!-- Mobile Branch Cards -->
                <div class="sm:hidden space-y-2.5">
                    ${cardsHtml}
                </div>
            </div>

            <!-- Fixed Bottom Action Nav -->
            <div class="modal-bottom-nav flex-none flex items-center justify-center gap-2 px-3 sm:px-6 py-2.5 sm:py-3 bg-white dark:bg-gray-800 border-t border-slate-200/80 dark:border-gray-700/80">
                <button type="button" onclick="closeModal()" class="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-slate-800 dark:text-white font-bold text-xs rounded-full transition-all cursor-pointer">
                    Back to Overview
                </button>
            </div>
            `;
        }

        case 'manageSubscription': {
            const profile = data || {};
            const formattedDate = profile.trial_ends_at ? new Date(profile.trial_ends_at).toISOString().split('T')[0] : '';
            return `
            <div class="p-6 md:p-8 space-y-6">
                <div>
                    <h2 class="text-xl font-black text-gray-900 dark:text-white mb-1">Manage Subscription</h2>
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">${profile.business_name || 'Business Settings'}</p>
                </div>

                <div class="space-y-4">
                    <div>
                        <label for="adminPlanSelect" class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Pricing Plan</label>
                        <select id="adminPlanSelect" class="form-input">
                            <option value="free_trial" ${(!profile.plan || profile.plan === 'free_trial') ? 'selected' : ''}>Free Trial</option>
                            <option value="starter" ${profile.plan === 'starter' ? 'selected' : ''}>Starter (TSh 5,000 / mo - Up to 3 Branches)</option>
                            <option value="enterprise" ${profile.plan === 'enterprise' ? 'selected' : ''}>Enterprise (TSh 15,000 / mo - Up to 10 Branches)</option>
                            <option value="exclusive" ${profile.plan === 'exclusive' ? 'selected' : ''}>Exclusive (TSh 25,000 / mo - Unlimited Branches)</option>
                        </select>
                    </div>

                    <div>
                        <label for="adminTrialEndsInput" class="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Subscription Expiration Date</label>
                        ${window.renderPremiumDatePicker({
                            id: 'adminTrialEndsInput',
                            selectedValue: formattedDate,
                            placeholder: 'Select Expiration Date',
                            classes: 'w-full'
                        })}
                    </div>
                </div>

                <div class="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <button onclick="closeModal()" class="flex-1 py-3 text-sm font-medium rounded-xl transition-all bg-red-600 text-white hover:bg-red-700 shadow-sm font-bold border-none">Cancel</button>
                    <button onclick="saveUserSubscription('${profile.id}')" class="flex-1 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-100 transition-all">Save Changes</button>
                </div>
            </div>`;
        }

        case 'auditDetails': {
            let prettyJson = data;
            try { prettyJson = JSON.stringify(JSON.parse(data), null, 4); } catch(e){}
            return `
            <div class="p-6">
                <div class="flex items-center justify-between mb-4 border-b border-gray-100 dark:border-gray-800 pb-4">
                    <h3 class="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                        <i data-lucide="file-json" class="w-5 h-5 text-indigo-600"></i> Audit Details
                    </h3>
                    <button onclick="closeModal()" class="w-8 h-8 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-400 transition-colors">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                <div class="bg-gray-900 rounded-xl p-4 overflow-auto max-h-[60vh] custom-scrollbar">
                    <pre class="text-xs text-green-400 font-mono whitespace-pre-wrap">${prettyJson}</pre>
                </div>
                <div class="mt-6 flex justify-end">
                    <button onclick="closeModal()" class="btn-primary px-6 py-2 rounded-xl">Close</button>
                </div>
            </div>`;
        }

        case 'chatBranchInfo': return `
        <div class="p-6">
            <div class="flex items-center justify-between mb-8">
                <div class="flex items-center gap-4">
                    <div class="w-14 h-14 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                        <i data-lucide="building-2" class="w-7 h-7"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-black text-gray-900 dark:text-white">${data.name}</h3>
                        <p class="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">${data.manager || 'No Manager'}</p>
                    </div>
                </div>
                <button onclick="closeModal()" class="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-400">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="grid grid-cols-1 gap-4">
                <div class="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl flex items-center justify-between border border-transparent dark:border-white/5">
                    <div>
                        <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                        <span class="text-sm font-bold text-emerald-600 capitalize">${data.status}</span>
                    </div>
                    <div class="w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                </div>
                <div class="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-transparent dark:border-white/5">
                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Location</p>
                    <p class="text-sm font-bold text-[var(--text-primary)]">${data.location || 'Not set'}</p>
                </div>
                <div class="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-transparent dark:border-white/5">
                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Active Since</p>
                    <p class="text-sm font-bold text-[var(--text-primary)]">${new Date(data.created_at).toLocaleDateString()}</p>
                </div>
            </div>
            <div class="mt-8 grid grid-cols-2 gap-3">
                <button onclick="window.toggleMute()" class="p-3 bg-gray-100 dark:bg-white/5 rounded-xl font-bold text-xs hover:bg-gray-200 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                    <i data-lucide="bell-off" class="w-4 h-4"></i> Mute Branch
                </button>
                <button onclick="window.clearChat()" class="p-3 bg-red-50 text-red-600 rounded-xl font-bold text-xs hover:bg-red-100 transition-all flex items-center justify-center gap-2">
                    <i data-lucide="trash-2" class="w-4 h-4"></i> Clear Chat
                </button>
            </div>
        </div>`;

        case 'chatParticipants': {
            const participants = data.participants || [];
            return `
            <div class="p-6">
                <div class="flex items-center justify-between mb-8">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg">
                            <i data-lucide="users" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-bold text-gray-900 dark:text-white">Chat Participants</h3>
                            <p class="text-xs text-gray-500">${participants.length} members in this conversation</p>
                        </div>
                    </div>
                    <button onclick="closeModal()" class="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-400">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
                <div class="max-h-[60vh] overflow-y-auto space-y-2 pr-2 scroller-custom">
                    ${participants.map(p => {
                const isOnline = window.onlineUsers && window.onlineUsers[p.id];
                return `
                        <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 transition-all hover:border-emerald-500/30">
                            <div class="flex items-center gap-4">
                                <div class="w-10 h-10 rounded-full ${isOnline ? 'bg-emerald-500 text-white' : 'bg-gray-200 dark:bg-white/10 text-gray-500'} flex items-center justify-center font-black text-xs transition-colors">
                                    ${p.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p class="text-sm font-bold text-gray-900 dark:text-white">${p.name}</p>
                                    <p class="text-[10px] text-gray-400 font-bold uppercase tracking-widest">${p.role}</p>
                                </div>
                            </div>
                            <div class="flex flex-col items-end gap-1">
                                <div class="flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300 dark:bg-white/10'}"></span>
                                    <span class="text-[10px] font-black ${isOnline ? 'text-emerald-500' : 'text-gray-400'} uppercase">${isOnline ? 'Online' : 'Offline'}</span>
                                </div>
                                ${isOnline ? `<p class="text-[9px] text-emerald-500/60 font-medium">Currently active</p>` : ''}
                            </div>
                        </div>
                        `;
            }).join('')}
                </div>
                <button onclick="closeModal()" class="w-full mt-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-500/20">
                    Close Details
                </button>
            </div>`;
        }

        case 'chatPreferences': return `
        <div class="p-6">
            <div class="flex items-center justify-between mb-8">
                <h3 class="text-xl font-black text-gray-900 dark:text-white">Chat Preferences</h3>
                <button onclick="closeModal()" class="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-400">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="space-y-6">
                <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-transparent dark:border-white/5">
                    <div>
                        <p class="text-sm font-bold text-gray-900 dark:text-white">Chat Sounds</p>
                        <p class="text-xs text-gray-500">Play alert on new messages</p>
                    </div>
                    <button id="prefSounds" onclick="window.toggleChatPref('sounds')" class="w-12 h-6 bg-emerald-500 rounded-full relative transition-all shadow-inner">
                        <div class="absolute top-1 left-7 w-4 h-4 bg-white rounded-full shadow-sm transition-all"></div>
                    </button>
                </div>
                <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-transparent dark:border-white/5">
                    <div>
                        <p class="text-sm font-bold text-gray-900 dark:text-white">Enter to Send</p>
                        <p class="text-xs text-gray-500">Use Enter key to send message</p>
                    </div>
                    <button id="prefEnter" onclick="window.toggleChatPref('enter')" class="w-12 h-6 bg-emerald-500 rounded-full relative transition-all shadow-inner">
                        <div class="absolute top-1 left-7 w-4 h-4 bg-white rounded-full shadow-sm transition-all"></div>
                    </button>
                </div>
                <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-transparent dark:border-white/5">
                    <div>
                        <p class="text-sm font-bold text-gray-900 dark:text-white">Read Receipts</p>
                        <p class="text-xs text-gray-500">Show when you've read messages</p>
                    </div>
                    <button class="w-12 h-6 bg-emerald-500 rounded-full relative transition-all opacity-50 cursor-not-allowed">
                        <div class="absolute top-1 left-7 w-4 h-4 bg-white rounded-full shadow-sm transition-all"></div>
                    </button>
                </div>
            </div>
            <p class="mt-8 text-[10px] text-center text-gray-400 font-bold uppercase tracking-widest">End-to-End Encrypted</p>
        </div>`;

        case 'chatCreateGroup': return `
        <div class="p-6">
            <div class="flex items-center justify-between mb-8">
                <h3 class="text-xl font-black text-gray-900 dark:text-white">Create Group Room</h3>
                <button onclick="closeModal()" class="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-400">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <form onsubmit="window.handleCreateChatGroup(event)" class="space-y-6">
                <div class="flex justify-center mb-4">
                    <div class="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 rounded-full flex items-center justify-center shadow-inner cursor-pointer hover:scale-105 transition-all">
                        <i data-lucide="camera" class="w-8 h-8"></i>
                    </div>
                </div>
                <div>
                    <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Group Name</label>
                    <input type="text" id="groupName" required placeholder="Project Alpha, HQ Connect..." class="w-full bg-gray-50 dark:bg-white/5 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-emerald-500 transition-all outline-none">
                </div>
                <div>
                    <label class="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Add Branches</label>
                    <div class="max-h-48 overflow-y-auto space-y-2 p-2 bg-gray-50 dark:bg-white/5 rounded-2xl border border-transparent dark:border-white/5">
                        ${state.branches.map(b => `
                            <label class="flex items-center justify-between p-3 hover:bg-white/10 rounded-xl cursor-pointer transition-colors group">
                                <span class="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-emerald-500">${b.name}</span>
                                <input type="checkbox" name="groupBranches" value="${b.id}" class="w-5 h-5 rounded-lg border-gray-300 text-emerald-500 focus:ring-emerald-500">
                            </label>
                        `).join('')}
                    </div>
                </div>
                <button type="submit" class="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                    Create Room
                </button>
            </form>
        </div>`;

        case 'chatStarredMessages': return `
        <div class="p-0">
            <div class="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <h3 class="text-xl font-black text-gray-900 dark:text-white">Starred Messages</h3>
                <button onclick="closeModal()" class="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-400">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="p-6 max-h-[500px] overflow-y-auto space-y-4 bg-gray-50/50 dark:bg-[#0b141a]">
                <div class="flex flex-col items-center justify-center py-20 text-center opacity-40">
                    <i data-lucide="star" class="w-12 h-12 mb-4"></i>
                    <p class="text-sm font-medium">No starred messages yet.</p>
                </div>
            </div>
        </div>`;

        case 'chatArchivedRooms': return `
        <div class="p-0">
            <div class="p-6 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                <h3 class="text-xl font-black text-gray-900 dark:text-white">Archived Chats</h3>
                <button onclick="closeModal()" class="w-10 h-10 rounded-full hover:bg-gray-100 dark:hover:bg-white/5 flex items-center justify-center text-gray-400">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="p-6 max-h-[500px] overflow-y-auto space-y-4 bg-gray-50/50 dark:bg-[#0b141a]">
                <div class="flex flex-col items-center justify-center py-20 text-center opacity-40">
                    <i data-lucide="archive" class="w-12 h-12 mb-4"></i>
                    <p class="text-sm font-medium">Your archived chats will appear here.</p>
                </div>
            </div>
        </div>`;
        case 'chatBranchInfo': return `
        <div class="p-6">
            <div class="flex items-center justify-between mb-8">
                <div class="flex items-center gap-4">
                    <div class="w-14 h-14 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 rounded-2xl flex items-center justify-center shadow-inner">
                        <i data-lucide="building-2" class="w-7 h-7"></i>
                    </div>
                    <div>
                        <h3 class="text-xl font-black text-gray-900 dark:text-white">${data.name}</h3>
                        <p class="text-xs text-emerald-500 font-bold uppercase tracking-widest">${data.location || 'Main Office'}</p>
                    </div>
                </div>
                <button onclick="closeModal()" class="w-10 h-10 flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-8">
                <div class="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                    <p class="text-[10px] text-gray-400 uppercase font-black mb-1">Weekly Sales</p>
                    <p class="text-lg font-bold text-gray-900 dark:text-white">${fmt.currency(42500)}</p>
                </div>
                <div class="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl border border-gray-100 dark:border-white/5">
                    <p class="text-[10px] text-gray-400 uppercase font-black mb-1">Performance</p>
                    <p class="text-lg font-bold text-emerald-500">+12.5%</p>
                </div>
            </div>

            <div class="space-y-4">
                <div class="flex items-center gap-4 p-4 border border-gray-100 dark:border-white/5 rounded-2xl group hover:border-emerald-500/30 transition-colors">
                    <div class="w-10 h-10 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center">
                        <i data-lucide="phone" class="w-5 h-5"></i>
                    </div>
                    <div class="flex-1">
                        <p class="text-[10px] text-gray-400 uppercase font-black">Contact Number</p>
                        <p class="text-sm font-bold text-gray-800 dark:text-gray-200">${data.contact_number || '+254 7XX XXX XXX'}</p>
                    </div>
                </div>
                <div class="flex items-center gap-4 p-4 border border-gray-100 dark:border-white/5 rounded-2xl group hover:border-emerald-500/30 transition-colors">
                    <div class="w-10 h-10 bg-orange-50 dark:bg-orange-500/10 text-orange-500 rounded-xl flex items-center justify-center">
                        <i data-lucide="mail" class="w-5 h-5"></i>
                    </div>
                    <div class="flex-1">
                        <p class="text-[10px] text-gray-400 uppercase font-black">Branch Email</p>
                        <p class="text-sm font-bold text-gray-800 dark:text-gray-200">${data.login_id}@bms.com</p>
                    </div>
                </div>
            </div>

            <button onclick="closeModal()" class="w-full mt-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">
                Close Profile
            </button>
        </div>`;

        case 'chatPreferences': return `
        <div class="p-6">
            <div class="flex items-center justify-between mb-8">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shadow-lg">
                        <i data-lucide="settings" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-gray-900 dark:text-white">Chat Preferences</h3>
                        <p class="text-xs text-gray-500">Customize your messaging experience</p>
                    </div>
                </div>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <div class="space-y-2">
                <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                    <div>
                        <p class="text-sm font-bold text-gray-800 dark:text-gray-200">Message Sounds</p>
                        <p class="text-[11px] text-gray-500">Play alert on new messages</p>
                    </div>
                    <button id="prefSounds" onclick="window.toggleChatPref('sounds')" class="w-12 h-6 bg-emerald-500 rounded-full relative transition-colors">
                        <div class="w-4 h-4 bg-white rounded-full absolute top-1 left-7 shadow-sm transition-all transform pointer-events-none"></div>
                    </button>
                </div>

                <div class="flex items-center justify-between p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5">
                    <div>
                        <p class="text-sm font-bold text-gray-800 dark:text-gray-200">Enter to Send</p>
                        <p class="text-[11px] text-gray-500">Send message when pressing Enter</p>
                    </div>
                    <button id="prefEnter" onclick="window.toggleChatPref('enter')" class="w-12 h-6 bg-emerald-500 rounded-full relative transition-colors">
                        <div class="w-4 h-4 bg-white rounded-full absolute top-1 left-7 shadow-sm transition-all transform pointer-events-none"></div>
                    </button>
                </div>

                <div class="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl mt-4">
                    <p class="text-[10px] text-red-500 uppercase font-bold mb-2">Danger Zone</p>
                    <button onclick="window.handleChatAction('Clear Messages')" class="w-full py-3 bg-red-500 hover:bg-red-600 text-white text-xs font-black rounded-xl transition-all active:scale-95">
                        Clear All Conversations
                    </button>
                </div>
            </div>
        </div>`;

        case 'requestAttention': return `
        <div class="p-6">
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                        <i data-lucide="message-square" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-gray-900">Request Attention</h3>
                        <p class="text-xs text-gray-500 font-medium">Message for Approval concerning this ${data.type}</p>
                    </div>
                </div>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <form onsubmit="handleRequestAttention(event)" class="space-y-4">
                <input type="hidden" id="reqType" value="${data.type}">
                <input type="hidden" id="reqRelatedId" value="${data.id}">
                <input type="hidden" id="reqSummary" value="${data.summary}">

                <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 mb-4">
                    <p class="text-[10px] text-gray-500 uppercase font-bold mb-1">Related to</p>
                    <p class="text-sm font-semibold text-gray-800">${data.summary}</p>
                </div>

                <div>
                    <label for="reqSubject" class="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <input type="text" id="reqSubject" required class="form-input" placeholder="What's this about?">
                </div>
                <div>
                    <label for="reqPriority" class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    ${window.renderPremiumSelect({
            id: 'reqPriority',
            selectedValue: 'medium',
            options: [
                { value: 'low', label: 'Low - General Feedback', icon: 'info' },
                { value: 'medium', label: 'Medium - Needs Review', icon: 'shield-check' },
                { value: 'high', label: 'High - Immediate Attention', icon: 'alert-circle' }
            ]
        })}
                </div>
                <div>
                    <label for="reqMessage" class="block text-sm font-medium text-gray-700 mb-1">Your Message / Suggestion</label>
                    <textarea id="reqMessage" required rows="4" class="form-input" placeholder="Explain your proposal or concern..."></textarea>
                </div>
                <div class="flex gap-3 pt-2">
                    <button type="button" onclick="closeModal()" class="flex-1 px-4 py-2 rounded-lg font-medium hover: text-sm bg-red-600 text-white hover:bg-red-700 shadow-sm font-bold border-none">Cancel</button>
                    <button type="submit" class="flex-1 btn-primary justify-center">Request Approval</button>
                </div>
            </form>
        </div>`;

        case 'assignTask': {
            const hasAi = typeof window.hasFeature === 'function' && window.hasFeature('modal_ai_assistant') && window.sysSettings?.enable_modal_ai_assistant !== 'false';
            return `
        <div class="flex flex-col h-full bg-slate-50/50 dark:bg-gray-900 overflow-hidden">
            <div class="modal-top-nav flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-none">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0">
                        <i data-lucide="check-square" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h3 class="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">${window.t('assign_task', 'Assign New Task')}</h3>
                        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">${window.t('assign_task_desc', 'Create and dispatch task assignments to branch managers')}</p>
                    </div>
                </div>
                <button type="button" onclick="closeModal()" data-close-text="${window.t('btn_close', 'Close')}" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <form onsubmit="handleAssignTask(event)" class="flex flex-col flex-1 overflow-hidden">
                <div class="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-4 scroller-custom">
                    ${hasAi ? `
                    <button type="button" onclick="window.openAiWithContext('tasks')"
                        class="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 bg-indigo-50/60 dark:bg-indigo-950/30 hover:bg-indigo-100/70 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs sm:text-sm font-bold tracking-wide transition-all active:scale-[0.98] shadow-xs">
                        <i data-lucide="sparkles" class="w-4 h-4 text-indigo-600 dark:text-indigo-400"></i>
                        <span>BMSTz Assistant — Get task writing guidance</span>
                    </button>` : ''}

                    <div class="bg-white dark:bg-gray-800/90 p-5 sm:p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-4">
                        <div>
                            <label for="taskBranch" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('assign_to_branch', 'Assign to Branch')}</label>
                            ${window.renderPremiumSelect({
                                id: 'taskBranch',
                                selectedValue: state.branches[0]?.id || '',
                                options: state.branches.map(b => ({ value: b.id, label: b.name, icon: 'building-2' }))
                            })}
                        </div>

                        <div>
                            <label for="taskTitle" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('task_title', 'Task Title')}</label>
                            <input type="text" id="taskTitle" required class="form-input w-full" placeholder="${window.t('enter_task_title', 'Enter task title')}">
                        </div>

                        <div>
                            <label for="taskDesc" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('description_optional', 'Description (optional)')}</label>
                            <textarea id="taskDesc" rows="3" class="form-input w-full" placeholder="${window.t('add_details', 'Add details...')}"></textarea>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label for="taskPriority" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('priority', 'Priority')}</label>
                                ${window.renderPremiumSelect({
                                    id: 'taskPriority',
                                    selectedValue: 'medium',
                                    options: [
                                        { value: 'low', label: window.t('low', 'Low'), icon: 'chevron-down' },
                                        { value: 'medium', label: window.t('medium', 'Medium'), icon: 'minus' },
                                        { value: 'high', label: window.t('high', 'High'), icon: 'chevron-up' }
                                    ]
                                })}
                            </div>
                            <div>
                                <label for="taskDeadline" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('deadline', 'Deadline')}</label>
                                ${window.renderPremiumDatePicker({
                                    id: 'taskDeadline',
                                    selectedValue: '',
                                    placeholder: 'Select Deadline',
                                    required: true,
                                    classes: 'w-full'
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="modal-bottom-nav flex-none p-3.5 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center gap-3 z-20">
                    <button type="button" onclick="closeModal()" class="flex-1 py-3 px-4 rounded-2xl font-extrabold text-xs sm:text-sm bg-red-600 hover:bg-red-700 text-white shadow-xs transition-all cursor-pointer">
                        ${window.t('btn_cancel', 'Cancel')}
                    </button>
                    <button type="submit" class="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2">
                        <span>${window.t('assign_task', 'Assign Task')}</span>
                    </button>
                </div>
            </form>
        </div>`;
        }

        case 'addSale': {
            const { inventory = [], customers = [] } = data || {};
            const canSaleDirect = window.branchCanDo && branchCanDo('sales_add');

            // Reset cart state upon opening modal
            window._activeSaleMode = 'single';
            window._activeSaleCart = [];

            const productSelectOptions = [
                { value: '', label: 'Select a product or service offering...', disabled: true, selected: true },
                ...inventory.map(item => {
                    const isService = item.item_type === 'service' || (item.unit && item.unit.toLowerCase() === 'service') || (item.category && item.category.toLowerCase().includes('service'));
                    const icon = isService ? 'wrench' : 'package';
                    const stock = Number(item.quantity !== undefined ? item.quantity : 0);
                    const isOutOfStock = !isService && stock <= 0;
                    const label = isService
                        ? `${item.name} (Service) - ${fmt.currency(item.retail_price || item.price || 0)}`
                        : `${item.name} (${isOutOfStock ? 'Out of stock' : `${stock} in stock`}) - ${fmt.currency(item.retail_price || item.price || 0)}`;
                    return { value: item.id, label, icon, disabled: isOutOfStock };
                })
            ];

            const customerItems = customers.map(c => `
                <div class="customer-item p-3 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-500/10 font-bold text-xs text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-white/5"
                     onclick="window.selectSaleCustomer('${c.name.replace(/'/g, "\\'")}')"
                     data-name="${c.name.toLowerCase()}">
                    ${c.name}
                </div>
            `).join('');

            return `
            <form onsubmit="handleAddSale(event)" novalidate class="flex flex-col h-full min-h-0 overflow-hidden">
                <!-- TOP NAV / HEADER -->
                <div class="modal-top-nav flex-none p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center gap-3.5 justify-start z-20">
                    <button type="button" onclick="closeModal()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                        <i data-lucide="chevron-left" class="w-4 h-4"></i>
                        <span>${window.t('back', 'Back')}</span>
                    </button>
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <i data-lucide="shopping-cart" class="w-5 h-5"></i>
                        </div>
                        <div class="min-w-0">
                            <h3 class="text-base font-black text-gray-900 dark:text-white truncate">${canSaleDirect ? 'Record New Sale' : 'Request Sale Approval'}</h3>
                            <p class="text-[11px] font-bold ${canSaleDirect ? 'text-emerald-600' : 'text-gray-500'} truncate">
                                ${canSaleDirect ? 'Allowed — will be recorded directly' : 'Sales require admin approval'}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- POS MODE SELECTOR STRIP -->
                <div class="px-4 sm:px-6 pt-3 pb-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40 flex flex-wrap items-center justify-between gap-2.5">
                    <div class="inline-flex items-center p-1 bg-gray-200/80 dark:bg-gray-800 rounded-xl border border-gray-300/80 dark:border-gray-700 shadow-inner">
                        <button type="button" onclick="window.setSaleMode('single')" id="tabSaleSingle"
                            class="px-3.5 sm:px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer bg-emerald-600 text-white shadow-sm flex items-center gap-1.5">
                            <i data-lucide="zap" class="w-3.5 h-3.5"></i>
                            <span>Quick Single Item</span>
                        </button>
                        <button type="button" onclick="window.setSaleMode('cart')" id="tabSaleCart"
                            class="px-3.5 sm:px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50 flex items-center gap-1.5">
                            <i data-lucide="shopping-bag" class="w-3.5 h-3.5"></i>
                            <span>Multi-Item Cart (Batch)</span>
                            <span id="saleCartBadge" class="hidden px-1.5 py-0.2 text-[10px] font-black rounded-full bg-emerald-600 text-white ml-1">0</span>
                        </button>
                    </div>
                    <div class="text-[11px] font-bold text-gray-400 dark:text-gray-500 hidden sm:block">
                        <span id="saleModeHelpText">Quick 1-click single product record</span>
                    </div>
                </div>

                <!-- MAIN CONTENTS (SCROLLABLE AREA) -->
                <div class="modal-main-content flex-1 overflow-y-auto min-h-0 p-4 sm:p-6">
                    <div class="w-full space-y-4">
                        
                        <!-- Customer Selection Row (Common to both modes) -->
                        <div>
                            <label class="block text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Customer Name</label>
                            <div class="relative" id="saleCustomerDropdown">
                                <div class="relative">
                                    <input type="text" id="saleCustomer" class="form-input pr-10 font-bold"
                                           placeholder="Walk-in Customer" value="Walk-in Customer"
                                           onfocus="window.toggleSaleCustomerDropdown(true)"
                                           oninput="window.filterSaleCustomers(this.value)"
                                           autocomplete="off">
                                    <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                        <i data-lucide="chevron-down" class="w-4 h-4"></i>
                                    </div>
                                </div>
                                <div id="saleCustomerListContainer" class="absolute z-[100] w-full mt-2 bg-white dark:bg-[#111b21] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl hidden overflow-hidden fade-in">
                                    <div class="max-h-[250px] overflow-y-auto scroller-custom">
                                        <div class="customer-item p-3 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-500/10 font-black text-xs uppercase tracking-widest text-emerald-600 border-b border-gray-100 dark:border-white/5"
                                             onclick="window.selectSaleCustomer('Walk-in Customer')"
                                             data-name="walk-in customer">
                                            Walk-in Customer
                                        </div>
                                        ${customerItems}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- ──────────────── MODE 1: SINGLE ITEM SALE (QUICK) ──────────────── -->
                        <div id="saleSingleModeView" class="space-y-4">
                            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-start w-full">
                                
                                <!-- LEFT COLUMN: Item & Service Selection -->
                                <div class="w-full bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 p-4 sm:p-5 space-y-3.5 shadow-2xs">
                                    <div class="flex items-center gap-2 pb-1 border-b border-gray-200/60 dark:border-white/5">
                                        <i data-lucide="package-search" class="w-4 h-4 text-emerald-600 dark:text-emerald-400"></i>
                                        <h4 class="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Catalog & Item Lookup</h4>
                                    </div>

                                    <!-- Barcode / SKU Scan -->
                                    <div>
                                        <label for="saleBarcode" class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">${window.t('scan_barcode', 'Scan Barcode')}</label>
                                        <div class="flex gap-2">
                                            <div class="relative flex-1">
                                                <i data-lucide="barcode" class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500"></i>
                                                <input type="text" id="saleBarcode" class="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500" placeholder="${window.t('scan_barcode', 'Scan or enter SKU...')}" oninput="handleBarcodeScan(this.value)">
                                            </div>
                                            <button type="button" onclick="window.openCameraScannerModal()" class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs flex-shrink-0 cursor-pointer">
                                                <i data-lucide="camera" class="w-4 h-4"></i>
                                                <span>${window.t('open_camera', 'Camera')}</span>
                                            </button>
                                        </div>
                                    </div>

                                    <div class="relative flex items-center py-0.5">
                                        <div class="flex-grow border-t border-gray-200 dark:border-gray-800"></div>
                                        <span class="flex-shrink-0 mx-3 text-gray-400 text-[10px] font-bold uppercase tracking-widest">or manually select</span>
                                        <div class="flex-grow border-t border-gray-200 dark:border-gray-800"></div>
                                    </div>

                                    <!-- Select Product / Service -->
                                    <div>
                                        <label for="saleProduct" class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Select Item or Service</label>
                                        <div class="flex gap-2">
                                            <div class="flex-1">
                                                ${window.renderPremiumSelect({
                        id: 'saleProduct',
                        selectedValue: '',
                        placeholder: 'Select a product or service offering...',
                        options: productSelectOptions,
                        onchange: 'window.onSaleProductChange()'
                    })}
                                            </div>
                                            <button type="button" onclick="refreshSaleProducts()" class="p-2 text-gray-500 hover:text-indigo-600 border border-gray-300 dark:border-gray-700 rounded-xl flex items-center justify-center min-w-[38px] min-h-[38px] cursor-pointer" title="Refresh Products & Services">
                                                <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                                            </button>
                                        </div>
                                        <div id="saleProductStockHint" class="mt-1 flex items-center gap-1 min-h-[18px]"></div>
                                    </div>

                                    <!-- Price Type Selector (shows after product selected) -->
                                    <div id="salePriceTypeRow" class="hidden pt-1">
                                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">${window.t('price_type', 'Price Type')}</label>
                                        <div class="grid grid-cols-3 gap-2" role="group">
                                            <button type="button" id="ptRetail" onclick="window.setSalePriceType('retail')"
                                                class="price-type-btn active flex flex-col items-center justify-center py-2 px-1.5 rounded-xl border-2 border-emerald-500 bg-emerald-50 text-emerald-700 transition-all overflow-hidden text-center min-w-0 cursor-pointer">
                                                <div class="flex items-center justify-center gap-1 w-full min-w-0">
                                                    <i data-lucide="shopping-bag" class="w-3.5 h-3.5 shrink-0"></i>
                                                    <span class="text-[9px] sm:text-[10px] font-black uppercase tracking-tight truncate">${window.t('bei_ya_rejareja', 'Retail Price')}</span>
                                                </div>
                                                <span id="ptRetailAmt" class="text-xs font-extrabold mt-1 truncate max-w-full">—</span>
                                            </button>
                                            <button type="button" id="ptWholesale" onclick="window.setSalePriceType('wholesale')"
                                                class="price-type-btn flex flex-col items-center justify-center py-2 px-1.5 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-500 transition-all overflow-hidden text-center min-w-0 cursor-pointer">
                                                <div class="flex items-center justify-center gap-1 w-full min-w-0">
                                                    <i data-lucide="package-open" class="w-3.5 h-3.5 shrink-0"></i>
                                                    <span class="text-[9px] sm:text-[10px] font-black uppercase tracking-tight truncate">${window.t('bei_ya_jumla', 'Wholesale Price')}</span>
                                                </div>
                                                <span id="ptWholesaleAmt" class="text-xs font-extrabold mt-1 truncate max-w-full">—</span>
                                            </button>
                                            <button type="button" id="ptCustom" onclick="window.setSalePriceType('custom')"
                                                class="price-type-btn flex flex-col items-center justify-center py-2 px-1.5 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-500 transition-all overflow-hidden text-center min-w-0 cursor-pointer">
                                                <div class="flex items-center justify-center gap-1 w-full min-w-0">
                                                    <i data-lucide="pen-line" class="w-3.5 h-3.5 shrink-0"></i>
                                                    <span class="text-[9px] sm:text-[10px] font-black uppercase tracking-tight truncate">${window.t('bei_maalum', 'Custom Price')}</span>
                                                </div>
                                                <span class="text-xs font-extrabold mt-1 truncate max-w-full">Edit</span>
                                            </button>
                                        </div>
                                        <input type="hidden" id="salePriceType" value="retail">
                                    </div>
                                </div>

                                <!-- RIGHT COLUMN: Pricing, Quantity & Checkout Details -->
                                <div class="w-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 space-y-4 shadow-sm">
                                    <div class="flex items-center gap-2 pb-1 border-b border-gray-100 dark:border-gray-700">
                                        <i data-lucide="calculator" class="w-4 h-4 text-indigo-600 dark:text-indigo-400"></i>
                                        <h4 class="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Sale & Payment Details</h4>
                                    </div>

                                    <div class="grid grid-cols-2 gap-3">
                                        <div>
                                            <label for="saleQty" class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                                            <input type="text" inputmode="decimal" id="saleQty" value="1" class="form-input number-format font-bold" oninput="updateSaleTotal()">
                                        </div>
                                        <div>
                                            <label for="saleAmount" class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Total Amount (${fmt.getSymbol()})</label>
                                            <input type="text" inputmode="decimal" id="saleAmount" class="form-input number-format font-black text-emerald-600 dark:text-emerald-400 text-base" placeholder="0.00">
                                        </div>
                                    </div>

                                    <div>
                                        <label for="salePayment" class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                                        ${window.renderPremiumSelect({
                        id: 'salePayment',
                        selectedValue: 'cash',
                        options: [
                            { value: 'cash', label: 'Cash', icon: 'banknote' },
                            { value: 'card', label: 'Credit Card', icon: 'credit-card' },
                            { value: 'transfer', label: 'Bank Transfer', icon: 'landmark' },
                            { value: 'mobile', label: 'Mobile Money', icon: 'smartphone' }
                        ]
                    })}
                                    </div>

                                    <div class="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/30 space-y-1.5 text-xs">
                                        <div class="flex justify-between items-center text-gray-500 dark:text-gray-400">
                                            <span>Status</span>
                                            <span class="font-bold ${canSaleDirect ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}">${canSaleDirect ? 'Direct Record' : 'Requires Approval'}</span>
                                        </div>
                                        <div class="flex justify-between items-center text-gray-500 dark:text-gray-400">
                                            <span>Receipt No</span>
                                            <span class="font-bold text-gray-700 dark:text-gray-300">Auto-Generated</span>
                                        </div>
                                    </div>
                                </div>

                            </div>
                        </div>

                        <!-- ──────────────── MODE 2: MULTI-ITEM CART BATCH SALE ──────────────── -->
                        <div id="saleCartModeView" class="hidden space-y-4">
                            <!-- Quick Add Bar -->
                            <div class="bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-200/80 dark:border-white/10 p-3.5 sm:p-4 space-y-3 shadow-2xs">
                                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-gray-200/60 dark:border-white/5">
                                    <div class="flex items-center gap-2">
                                        <i data-lucide="scan-barcode" class="w-4 h-4 text-emerald-600 dark:text-emerald-400"></i>
                                        <h4 class="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider whitespace-nowrap">Add Products to Basket</h4>
                                    </div>
                                    
                                    <div class="flex items-center gap-2 flex-1 sm:justify-end max-w-full sm:max-w-md">
                                        <!-- Barcode / SKU Scanner Field in Header -->
                                        <div class="flex items-center gap-1.5 flex-1 max-w-xs">
                                            <div class="relative flex-1">
                                                <i data-lucide="barcode" class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-500 pointer-events-none"></i>
                                                <input type="text" id="saleCartBarcode" class="w-full pl-8 pr-2.5 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 font-medium placeholder-gray-400" placeholder="Scan Barcode / SKU..." oninput="handleBarcodeScan(this.value)">
                                            </div>
                                            <button type="button" onclick="window.openCameraScannerModal()" class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-2xs" title="Camera Scanner">
                                                <i data-lucide="camera" class="w-3.5 h-3.5"></i>
                                            </button>
                                        </div>
                                        <button type="button" onclick="window.clearSaleCart()" class="text-[11px] font-bold text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer whitespace-nowrap ml-1">
                                            Clear Basket
                                        </button>
                                    </div>
                                </div>

                                <!-- Step 1: Catalog Selector -->
                                <div>
                                    <label class="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">Select Catalog Item or Service</label>
                                    ${window.renderPremiumSelect({
                        id: 'saleCartProductSelect',
                        selectedValue: '',
                        placeholder: 'Select item or service...',
                        options: productSelectOptions,
                        onChange: 'window.onSaleCartProductChange(this.value)'
                    })}
                                </div>

                                <!-- Step 2: Price Type & Quantity Controls (shows when item selected) -->
                                <div id="saleCartQuickPriceRow" class="hidden pt-2 border-t border-gray-200/60 dark:border-white/5 space-y-2.5 animate-in fade-in duration-150">
                                    <div class="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3">
                                        <!-- Price Type Selector -->
                                        <div class="flex-1 min-w-0 w-full">
                                            <label class="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">Price Type</label>
                                            <div class="flex items-center gap-2 flex-wrap" role="group">
                                                <button type="button" id="ptCartRetail" onclick="window.setSaleCartQuickPriceType('retail')"
                                                    class="price-type-btn active flex items-center gap-1.5 py-1.5 px-3 rounded-xl border-2 border-emerald-500 bg-emerald-50 text-emerald-700 text-xs font-bold transition-all cursor-pointer">
                                                    <i data-lucide="shopping-bag" class="w-3.5 h-3.5 shrink-0"></i>
                                                    <span id="ptCartRetailLabel">${window.t('retail', 'Retail')}</span>
                                                    <span id="ptCartRetailAmt" class="font-extrabold text-[11px] ml-0.5">—</span>
                                                </button>
                                                <button type="button" id="ptCartWholesale" onclick="window.setSaleCartQuickPriceType('wholesale')"
                                                    class="price-type-btn flex items-center gap-1.5 py-1.5 px-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-500 text-xs font-bold transition-all cursor-pointer">
                                                    <i data-lucide="package-open" class="w-3.5 h-3.5 shrink-0"></i>
                                                    <span>${window.t('wholesale', 'Wholesale')}</span>
                                                    <span id="ptCartWholesaleAmt" class="font-extrabold text-[11px] ml-0.5">—</span>
                                                </button>
                                                <button type="button" id="ptCartCustom" onclick="window.setSaleCartQuickPriceType('custom')"
                                                    class="price-type-btn flex items-center gap-1.5 py-1.5 px-3 rounded-xl border-2 border-gray-200 bg-gray-50 text-gray-500 text-xs font-bold transition-all cursor-pointer">
                                                    <i data-lucide="pen-line" class="w-3.5 h-3.5 shrink-0"></i>
                                                    <span>${window.t('custom', 'Custom')}</span>
                                                </button>

                                                <!-- Custom Price Input -->
                                                <div id="saleCartQuickCustomContainer" class="hidden items-center gap-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl px-2.5 py-1">
                                                    <span class="text-[10.5px] text-amber-700 dark:text-amber-300 font-black uppercase tracking-tight">Price:</span>
                                                    <input type="text" inputmode="decimal" id="saleCartQuickCustomPrice" class="w-24 text-xs font-black py-0.5 px-1.5 bg-white dark:bg-gray-900 border border-amber-400 dark:border-amber-600 rounded-lg text-amber-900 dark:text-amber-100 number-format outline-none" placeholder="0">
                                                </div>
                                            </div>
                                            <input type="hidden" id="saleCartQuickPriceType" value="retail">
                                        </div>

                                        <!-- Qty & Add Item -->
                                        <div class="flex items-end gap-2 shrink-0 w-full sm:w-auto justify-end">
                                            <div class="w-20">
                                                <label class="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1 text-center">Qty</label>
                                                <input type="number" min="1" value="1" id="saleCartQuickQty" class="w-full text-center py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-xs font-black">
                                            </div>
                                            <button type="button" onclick="window.addSaleCartItemFromQuickBar()" class="py-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all cursor-pointer">
                                                <i data-lucide="plus" class="w-4 h-4"></i>
                                                <span>Add Item</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Cart Items List Container -->
                            <div class="space-y-2.5" id="saleCartItemsList">
                                <!-- Populated dynamically by window.renderSaleCartTable() -->
                            </div>

                            <!-- Checkout & Payment Method Strip -->
                            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 space-y-4 shadow-sm">
                                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                                    <div>
                                        <label for="saleCartPayment" class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                                        ${window.renderPremiumSelect({
                        id: 'saleCartPayment',
                        selectedValue: 'cash',
                        options: [
                            { value: 'cash', label: 'Cash', icon: 'banknote' },
                            { value: 'card', label: 'Credit Card', icon: 'credit-card' },
                            { value: 'transfer', label: 'Bank Transfer', icon: 'landmark' },
                            { value: 'mobile', label: 'Mobile Money', icon: 'smartphone' }
                        ]
                    })}
                                    </div>

                                    <!-- Floating Cart Summary Pill -->
                                    <div class="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between gap-3">
                                        <div>
                                            <p class="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider">Grand Total</p>
                                            <p id="saleCartGrandTotalText" class="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 leading-tight">TSh 0</p>
                                        </div>
                                        <div class="text-right">
                                            <span id="saleCartDistinctCount" class="text-xs font-black text-gray-700 dark:text-gray-200 block">0 items</span>
                                            <span id="saleCartTotalUnits" class="text-[10px] font-bold text-gray-400 dark:text-gray-500 block">0 units</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <!-- BOTTOM NAV / FOOTER -->
                <div class="modal-bottom-nav flex-none p-4 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center gap-3 z-20">
                    <button type="button" onclick="closeModal()" class="px-5 py-2.5 rounded-xl font-bold text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border-none cursor-pointer">
                        ${window.t('cancel', 'Cancel')}
                    </button>
                    <button type="submit" class="px-6 py-2.5 rounded-xl font-black text-xs ${canSaleDirect ? 'bg-emerald-600 hover:bg-emerald-700' : 'btn-primary'} text-white shadow-md transition-all cursor-pointer flex items-center gap-2">
                        <span id="saleSubmitBtnText">${canSaleDirect ? window.t('record_sale', 'Record Sale') : window.t('submit_for_approval', 'Submit for Approval')}</span>
                    </button>
                </div>
            </form>`;
        }

        case 'addExpense': {
            const canExpenseDirect = window.branchCanDo && branchCanDo('expenses_add');
            return `
            <form onsubmit="handleAddExpense(event)" class="flex flex-col h-full min-h-0 overflow-hidden">
                <!-- TOP NAV / HEADER -->
                <div class="modal-top-nav flex-none p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center gap-3.5 justify-start z-20">
                    <button type="button" onclick="closeModal()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                        <i data-lucide="chevron-left" class="w-4 h-4"></i>
                        <span>${window.t('back', 'Back')}</span>
                    </button>
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                            <i data-lucide="receipt" class="w-5 h-5"></i>
                        </div>
                        <div class="min-w-0">
                            <h3 class="text-base font-black text-gray-900 dark:text-white truncate">${canExpenseDirect ? 'Record Expense' : 'Request Expense Approval'}</h3>
                            <p class="text-[11px] font-bold ${canExpenseDirect ? 'text-rose-600' : 'text-gray-500'} truncate">
                                ${canExpenseDirect ? 'Allowed — will be recorded directly' : 'Expenses require admin approval'}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- MAIN CONTENTS (SCROLLABLE AREA) -->
                <div class="modal-main-content flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4">
                    ${(typeof window.hasFeature === 'function' && window.hasFeature('modal_ai_assistant') && window.sysSettings?.enable_modal_ai_assistant !== 'false') ? `
                    <button type="button" onclick="window.openAiWithContext('expense')"
                        class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#475B6E]/30 bg-[#475B6E]/5 hover:bg-[#475B6E]/10 text-[#475B6E] dark:text-[#a0b4c4] text-xs font-bold tracking-wide transition-all active:scale-[0.98]">
                        <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
                        BMSTz Assistant — Get expense category guidance
                    </button>` : ''}
                    <div>
                        <label for="expenseCategory" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                        ${window.renderPremiumSelect({
                    id: 'expenseCategory',
                    selectedValue: 'supplies',
                    options: [
                        { value: 'supplies', label: 'Supplies', icon: 'package' },
                        { value: 'utilities', label: 'Utilities', icon: 'zap' },
                        { value: 'salary', label: 'Salary', icon: 'users' },
                        { value: 'rent', label: 'Rent', icon: 'home' },
                        { value: 'maintenance', label: 'Maintenance', icon: 'wrench' },
                        { value: 'marketing', label: 'Marketing', icon: 'megaphone' },
                        { value: 'other', label: 'Other', icon: 'more-horizontal' }
                    ]
                })}
                    </div>
                    <div>
                        <label for="expenseDesc" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                        <input type="text" id="expenseDesc" required class="form-input" placeholder="Enter description">
                    </div>
                    <div>
                        <label for="expenseAmount" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (${fmt.getSymbol()})</label>
                        <input type="text" inputmode="decimal" id="expenseAmount" required class="form-input number-format" placeholder="0">
                    </div>
                </div>

                <!-- BOTTOM NAV / FOOTER -->
                <div class="modal-bottom-nav flex-none p-4 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center gap-3 z-20">
                    <button type="button" onclick="closeModal()" class="px-5 py-2.5 rounded-xl font-bold text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border-none">
                        Cancel
                    </button>
                    <button type="submit" class="px-6 py-2.5 rounded-xl font-black text-xs ${canExpenseDirect ? 'bg-rose-600 hover:bg-rose-700' : 'btn-primary'} text-white shadow-md transition-all">
                        ${canExpenseDirect ? 'Record Expense' : 'Submit for Approval'}
                    </button>
                </div>
            </form>`;
        }

        case 'addCustomer': {
            const canCustomerDirect = window.branchCanDo && branchCanDo('customers_add');
            const titleText = canCustomerDirect 
                ? window.t('add_new_customer', 'Add New Customer') 
                : window.t('request_customer_addition', 'Request Customer Addition');
            const statusText = canCustomerDirect 
                ? window.t('customer_direct_allowed', 'Allowed — will be added directly') 
                : window.t('customer_requires_approval', 'Additions require admin approval');

            return `
            <form onsubmit="handleAddCustomer(event)" class="flex flex-col h-full min-h-0 overflow-hidden">
                <!-- TOP NAV / HEADER -->
                <div class="modal-top-nav flex-none p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center gap-3.5 justify-start z-20">
                    <button type="button" onclick="closeModal()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                        <i data-lucide="chevron-left" class="w-4 h-4"></i>
                        <span>${window.t('back', 'Back')}</span>
                    </button>
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold shrink-0">
                            <i data-lucide="${canCustomerDirect ? 'user-plus' : 'user-check'}" class="w-5 h-5"></i>
                        </div>
                        <div class="min-w-0">
                            <h3 class="text-base font-black text-gray-900 dark:text-white truncate">${titleText}</h3>
                            <p class="text-[11px] font-bold ${canCustomerDirect ? 'text-cyan-600 dark:text-cyan-400' : 'text-amber-600 dark:text-amber-400'} truncate">
                                ${statusText}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- MAIN CONTENTS (SCROLLABLE AREA) -->
                <div class="modal-main-content flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4">
                    <div class="bg-white dark:bg-gray-800/90 p-5 sm:p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-4">
                        <div>
                            <label for="customerName" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('full_name', 'Full Name')}</label>
                            <input type="text" id="customerName" required class="form-input w-full" placeholder="${window.t('ph_enter_full_name', 'Enter full name')}">
                        </div>
                        <div>
                            <label for="customerPhone" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('phone_number', 'Phone Number')}</label>
                            <input type="tel" id="customerPhone" class="form-input w-full" placeholder="+255 ...">
                        </div>
                        <div>
                            <label for="customerEmail" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('email', 'Email')}</label>
                            <input type="email" id="customerEmail" class="form-input w-full" placeholder="customer@example.com">
                        </div>
                        <div>
                            <label for="customerAddress" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('address', 'Address')}</label>
                            <textarea id="customerAddress" class="form-input w-full" rows="3" placeholder="${window.t('ph_enter_address', 'Enter customer address')}"></textarea>
                        </div>
                    </div>
                </div>

                <!-- BOTTOM NAV / FOOTER -->
                <div class="modal-bottom-nav flex-none p-4 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center gap-3 z-20">
                    <button type="button" onclick="closeModal()" class="px-5 py-2.5 rounded-xl font-bold text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border-none">
                        ${window.t('btn_cancel', 'Cancel')}
                    </button>
                    <button type="submit" class="px-6 py-2.5 rounded-xl font-black text-xs ${canCustomerDirect ? 'bg-cyan-600 hover:bg-cyan-700' : 'btn-primary'} text-white shadow-md transition-all">
                        ${canCustomerDirect ? window.t('add_customer', 'Add Customer') : window.t('submit_for_approval', 'Submit for Approval')}
                    </button>
                </div>
            </form>`;
        }

        case 'resetManagerPassword': {
            const branch = state.branches.find(b => b.id === data);
            if (!branch) return null;
            return `
        <div class="p-6">
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-xl font-bold text-gray-900">Reset Manager Password</h3>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex gap-3">
                <i data-lucide="alert-triangle" class="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5"></i>
                <p class="text-sm text-yellow-800">You are resetting the login password for the manager of <strong>${branch.name}</strong>. The manager will need to use this new password to log in.</p>
            </div>
            <form onsubmit="handleResetManagerPassword(event, '${data}')" class="space-y-4">
                <div>
                    <label for="newPassword" class="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                    <div class="relative">
                        <input type="password" id="newPassword" required minlength="6" class="form-input pr-10" placeholder="••••••••">
                        <button type="button" onclick="togglePasswordVisibility('newPassword', this)"
                            class="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none">
                            <i data-lucide="eye" class="w-4 h-4 text-gray-400"></i>
                        </button>
                    </div>
                </div>
                <div>
                    <label for="confirmPassword" class="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                    <div class="relative">
                        <input type="password" id="confirmPassword" required minlength="6" class="form-input pr-10" placeholder="••••••••">
                        <button type="button" onclick="togglePasswordVisibility('confirmPassword', this)"
                            class="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none">
                            <i data-lucide="eye" class="w-4 h-4 text-gray-400"></i>
                        </button>
                    </div>
                </div>
                <div class="flex gap-3 pt-2">
                    <button type="button" onclick="closeModal()" class="flex-1 px-4 py-2 rounded-lg font-medium hover: text-sm bg-red-600 text-white hover:bg-red-700 shadow-sm font-bold border-none">Cancel</button>
                    <button type="submit" class="flex-1 btn-primary justify-center">Reset Password</button>
                </div>
            </form>
        </div>`;
        }

        case 'addBranch': {
            const defCurr = (state.profile && state.profile.currency) ? state.profile.currency : 'USD';

            return `
        <div class="flex flex-col h-full bg-slate-50/50 dark:bg-gray-900 overflow-hidden">
            <div class="modal-top-nav flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-none">
                <h3 class="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">${window.t('add_new_branch', 'Add New Branch')}</h3>
                <button type="button" onclick="closeModal()" data-close-text="${window.t('btn_close', 'Close')}" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <form onsubmit="handleAddBranch(event)" class="flex flex-col flex-1 overflow-hidden">
                <div class="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-4 scroller-custom">
                    <div class="bg-white dark:bg-gray-800/90 p-5 sm:p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-4">
                        <div>
                            <label for="branchName" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('branch_name', 'Branch Name')}</label>
                            <input type="text" id="branchName" required class="form-input w-full" placeholder="e.g. WESTSIDE BRANCH" oninput="this.value = this.value.toUpperCase()">
                        </div>
                        <div>
                            <label for="branchLocation" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('location_label', 'Location')}</label>
                            <input type="text" id="branchLocation" class="form-input w-full" placeholder="e.g. 123 Main St">
                        </div>
                        <div>
                            <label for="branchManager" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('manager_name', 'Manager Name')}</label>
                            <input type="text" id="branchManager" class="form-input w-full" placeholder="Manager's full name">
                        </div>
                        <div>
                            <label for="managerEmail" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('manager_email', 'Manager Email')}</label>
                            <input type="email" id="managerEmail" required class="form-input w-full" placeholder="manager@branch.com" autocomplete="email">
                            <p class="text-xs text-gray-400 mt-1">${window.t('manager_email_help', 'The manager will use this email to log in to this branch.')}</p>
                        </div>
                        <div>
                            <label for="branchPassword" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('manager_password', 'Manager Password')}</label>
                            <div class="relative">
                                <input type="password" id="branchPassword" required minlength="6" class="form-input w-full pr-10" placeholder="••••••••" autocomplete="new-password">
                                <button type="button" onclick="togglePasswordVisibility('branchPassword', this)"
                                    class="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none">
                                    <i data-lucide="eye" class="w-4 h-4 text-gray-400"></i>
                                </button>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label for="branchCurrency" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('branch_currency', 'Branch Currency')}</label>
                                ${window.renderPremiumSelect({
                                    id: 'branchCurrency',
                                    selectedValue: defCurr,
                                    options: [
                                        { value: 'USD', label: 'USD ($)', icon: 'dollar-sign' },
                                        { value: 'EUR', label: 'EUR (€)', icon: 'euro' },
                                        { value: 'GBP', label: 'GBP (£)', icon: 'coins' },
                                        { value: 'KES', label: 'KES (KSh)', icon: 'coins' },
                                        { value: 'TZS', label: 'TZS (TZS)', icon: 'coins' },
                                        { value: 'NGN', label: 'NGN (₦)', icon: 'coins' },
                                        { value: 'UGX', label: 'UGX (USh)', icon: 'coins' },
                                        { value: 'ZAR', label: 'ZAR (R)', icon: 'coins' },
                                        { value: 'INR', label: 'INR (₹)', icon: 'indian-rupee' }
                                    ]
                                })}
                            </div>
                            <div>
                                <label for="branchTarget" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('sales_target', 'Sales Target')}</label>
                                <input type="text" inputmode="decimal" id="branchTarget" required class="form-input w-full number-format" placeholder="15000">
                            </div>
                        </div>
                        <button type="button" onclick="showToast('${window.t('submit_first_toast', 'Please submit and create the branch first before setting preferences')}', 'warning')" class="w-full flex items-center justify-center gap-2 p-3 bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-500 rounded-xl font-bold text-xs border border-gray-200 dark:border-white/10 cursor-not-allowed opacity-80" title="Create branch first">
                            <i data-lucide="toggle-left" class="w-4 h-4"></i> ${window.t('branch_prefs_save_first', 'Branch Preferences & Allowlist (Save first)')}
                        </button>
                    </div>
                </div>

                <div class="modal-bottom-nav flex-none p-3.5 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center gap-3 z-20">
                    <button type="button" onclick="closeModal()" class="flex-1 py-3 px-4 rounded-2xl font-extrabold text-xs sm:text-sm bg-red-600 hover:bg-red-700 text-white shadow-xs transition-all cursor-pointer">
                        ${window.t('cancel', 'Cancel')}
                    </button>
                    <button type="submit" class="flex-1 py-3 px-4 bg-[#475B6E] hover:bg-[#394958] text-white rounded-2xl font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2">
                        <span>${window.t('create_branch', 'Create Branch')}</span>
                    </button>
                </div>
            </form>
        </div>`;
        }

        case 'editBranch': {
            const defaultEditCurr = data.currency || (state.profile?.currency || 'USD');
            return `
        <div class="flex flex-col h-full bg-slate-50/50 dark:bg-gray-900 overflow-hidden">
            <!-- TOP NAV / HEADER -->
            <div class="modal-top-nav flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-none z-20">
                <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <button type="button" onclick="closeModal()" data-close-text="${window.t('back', 'Back')}" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                        <i data-lucide="chevron-left" class="w-4 h-4"></i>
                        <span>${window.t('back', 'Back')}</span>
                    </button>
                    <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <i data-lucide="building-2" class="w-4 h-4 sm:w-5 sm:h-5"></i>
                    </div>
                    <div class="min-w-0">
                        <h3 class="text-sm sm:text-base font-black text-gray-900 dark:text-white leading-tight truncate">${window.t('edit_branch_settings', 'Edit Branch Settings')}</h3>
                        <p class="text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 truncate">${data.name || 'Update branch configurations'}</p>
                    </div>
                </div>
                <button type="button" onclick="closeModal()" data-close-text="${window.t('btn_close', 'Close')}" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <!-- SCROLLABLE FORM CONTENT -->
            <form onsubmit="handleEditBranch(event, '${data.id}')" class="flex flex-col flex-1 overflow-hidden">
                <div class="modal-main-content flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-4 scroller-custom">
                    <div class="bg-white dark:bg-gray-800/90 p-4 sm:p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-4">
                        <div>
                            <label for="editBranchName" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('branch_name', 'Branch Name')}</label>
                            <input type="text" id="editBranchName" value="${data.name}" required class="form-input w-full" oninput="this.value = this.value.toUpperCase()">
                        </div>
                        <div>
                            <label for="editBranchLocation" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('location_label', 'Location')}</label>
                            <input type="text" id="editBranchLocation" value="${data.location || ''}" class="form-input w-full" placeholder="e.g. 214 Morombo">
                        </div>
                        <div>
                            <label for="editBranchManager" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('manager_name', 'Manager Name')}</label>
                            <input type="text" id="editBranchManager" value="${data.manager || ''}" class="form-input w-full" placeholder="Branch manager name">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('manager_email', 'Manager Email (Login)')}</label>
                            <div class="flex gap-2">
                                <input type="text" value="${data.manager_email || 'No email assigned'}" readonly class="form-input bg-gray-50 dark:bg-gray-900 text-gray-500 flex-1">
                                <button type="button" onclick="openModal('resetManagerPassword', '${data.id}')" class="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold hover:bg-indigo-100 transition-colors border border-indigo-100 dark:border-indigo-800/60 flex items-center gap-1.5 whitespace-nowrap cursor-pointer">
                                    <i data-lucide="key-round" class="w-3.5 h-3.5"></i> Reset Pass
                                </button>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label for="editBranchCurrency" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('branch_currency', 'Branch Currency')}</label>
                                ${window.renderPremiumSelect({
                                    id: 'editBranchCurrency',
                                    selectedValue: defaultEditCurr,
                                    options: [
                                        { value: 'USD', label: 'USD ($)', icon: 'dollar-sign' },
                                        { value: 'EUR', label: 'EUR (€)', icon: 'euro' },
                                        { value: 'GBP', label: 'GBP (£)', icon: 'coins' },
                                        { value: 'KES', label: 'KES (KSh)', icon: 'coins' },
                                        { value: 'TZS', label: 'TZS (TSh)', icon: 'coins' },
                                        { value: 'NGN', label: 'NGN (₦)', icon: 'coins' },
                                        { value: 'UGX', label: 'UGX (USh)', icon: 'coins' },
                                        { value: 'ZAR', label: 'ZAR (R)', icon: 'coins' },
                                        { value: 'INR', label: 'INR (₹)', icon: 'indian-rupee' }
                                    ]
                                })}
                            </div>
                            <div>
                                <label for="editBranchTarget" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('sales_target', 'Sales Target')} (${fmt.getSymbol()})</label>
                                <input type="text" inputmode="decimal" id="editBranchTarget" value="${data.target}" required class="form-input w-full number-format">
                            </div>
                        </div>

                        <button type="button" onclick="openBranchPreferencesModal(this.dataset.branch)" data-branch='${JSON.stringify(data).replace(/'/g, "&#39;")}' class="w-full mt-2 flex items-center justify-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 rounded-xl font-bold text-xs hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors border border-amber-200/80 dark:border-amber-800/60 cursor-pointer">
                            <i data-lucide="toggle-left" class="w-4 h-4"></i> ${window.t('branch_prefs_allowlist', 'Branch Preferences & Allowlist')}
                        </button>
                    </div>
                </div>

                <!-- BOTTOM NAV / FOOTER -->
                <div class="modal-bottom-nav flex-none p-3.5 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center gap-3 z-20">
                    <button type="button" onclick="closeModal()" class="flex-1 py-3 px-4 rounded-2xl font-extrabold text-xs sm:text-sm bg-red-600 hover:bg-red-700 text-white shadow-xs transition-all cursor-pointer">
                        ${window.t('cancel', 'Cancel')}
                    </button>
                    <button type="submit" class="flex-1 py-3 px-4 bg-[#475B6E] hover:bg-[#394958] text-white rounded-2xl font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2">
                        <span>${window.t('save_changes', 'Save Changes')}</span>
                    </button>
                </div>
            </form>
        </div>`;
        }

        case 'addNote': return `
        <form onsubmit="handleAddNote(event)" class="flex flex-col h-full min-h-0 overflow-hidden">
            <!-- TOP NAV / HEADER -->
            <div class="modal-top-nav flex-none p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center gap-3.5 justify-start z-20">
                <button type="button" onclick="closeModal()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i>
                    <span>${window.t('back', 'Back')}</span>
                </button>
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <i data-lucide="file-text" class="w-5 h-5"></i>
                    </div>
                    <div class="min-w-0">
                        <h3 class="text-base font-black text-gray-900 dark:text-white truncate">Add Note</h3>
                        <p class="text-[11px] font-bold text-gray-500 truncate">Create a new branch note or reminder</p>
                    </div>
                </div>
            </div>

            <!-- MAIN CONTENTS (SCROLLABLE AREA) -->
            <div class="modal-main-content flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4">
                <div>
                    <label for="noteTitle" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                    <input type="text" id="noteTitle" required class="form-input" placeholder="Note title">
                </div>
                <div>
                    <label for="noteContent" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content</label>
                    <textarea id="noteContent" required rows="5" class="form-input" placeholder="Write your note..."></textarea>
                </div>
                <div>
                    <label for="noteTag" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tag</label>
                    ${window.renderPremiumSelect({
            id: 'noteTag',
            selectedValue: 'general',
            options: [
                { value: 'general', label: 'General', icon: 'tag' },
                { value: 'important', label: 'Important', icon: 'alert-triangle' },
                { value: 'reminder', label: 'Reminder', icon: 'clock' },
                { value: 'incident', label: 'Incident', icon: 'shield-alert' }
            ]
        })}
                </div>
            </div>

            <!-- BOTTOM NAV / FOOTER -->
            <div class="modal-bottom-nav flex-none p-4 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center gap-3 z-20">
                <button type="button" onclick="closeModal()" class="px-5 py-2.5 rounded-xl font-bold text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border-none">
                    Cancel
                </button>
                <button type="submit" class="px-6 py-2.5 rounded-xl font-black text-xs btn-primary text-white shadow-md transition-all">
                    Save Note
                </button>
            </div>
        </form>`;

        case 'addLoan': {
            const canLoanDirect = window.branchCanDo && branchCanDo('loans_add');
            return `
            <form onsubmit="handleAddLoan(event)" class="flex flex-col h-full min-h-0 overflow-hidden">
                <!-- TOP NAV / HEADER -->
                <div class="modal-top-nav flex-none p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center gap-3.5 justify-start z-20">
                    <button type="button" onclick="closeModal()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                        <i data-lucide="chevron-left" class="w-4 h-4"></i>
                        <span>${window.t('back', 'Back')}</span>
                    </button>
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <i data-lucide="landmark" class="w-5 h-5"></i>
                        </div>
                        <div class="min-w-0">
                            <h3 class="text-base font-black text-gray-900 dark:text-white truncate">${canLoanDirect ? 'Record Loan / Income' : 'Request Loan Approval'}</h3>
                            <p class="text-[11px] font-bold ${canLoanDirect ? 'text-amber-600' : 'text-gray-500'} truncate">
                                ${canLoanDirect ? 'Allowed — will be recorded directly' : 'Loans require admin approval'}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- MAIN CONTENTS (SCROLLABLE AREA) -->
                <div class="modal-main-content flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4">
                    <div>
                        <label for="loanType" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                        ${window.renderPremiumSelect({
                id: 'loanType',
                selectedValue: 'income',
                options: [
                    { value: 'income', label: 'Other Income', icon: 'trending-up' },
                    { value: 'loan_given', label: 'Loan Given', icon: 'arrow-up-right' },
                    { value: 'loan_received', label: 'Loan Received', icon: 'arrow-down-left' },
                    { value: 'repayment', label: 'Repayment Received', icon: 'rotate-ccw' }
                ]
            })}
                    </div>
                    <div>
                        <label for="loanParty" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Party (Name)</label>
                        <input type="text" id="loanParty" class="form-input" placeholder="Customer or entity name">
                    </div>
                    <div>
                        <label for="loanAmount" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (${fmt.getSymbol()})</label>
                        <input type="text" inputmode="decimal" id="loanAmount" required class="form-input number-format" placeholder="0">
                    </div>
                    <div>
                        <label for="loanNotes" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                        <textarea id="loanNotes" rows="2" class="form-input" placeholder="Additional details..."></textarea>
                    </div>
                </div>

                <!-- BOTTOM NAV / FOOTER -->
                <div class="modal-bottom-nav flex-none p-4 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center gap-3 z-20">
                    <button type="button" onclick="closeModal()" class="px-5 py-2.5 rounded-xl font-bold text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border-none">
                        Cancel
                    </button>
                    <button type="submit" class="px-6 py-2.5 rounded-xl font-black text-xs ${canLoanDirect ? 'bg-amber-600 hover:bg-amber-700' : 'btn-primary'} text-white shadow-md transition-all">
                        ${canLoanDirect ? 'Record Loan' : 'Submit for Approval'}
                    </button>
                </div>
            </form>`;
        }

        case 'addInventoryItem': {
            const canAddDirect = window.branchCanDo && branchCanDo('inventory_update');
            return `
            <form onsubmit="handleAddInventoryItem(event)" class="flex flex-col h-full min-h-0 overflow-hidden">
                <!-- TOP NAV / HEADER -->
                <div class="modal-top-nav flex-none p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center gap-3.5 justify-start z-20">
                    <button type="button" onclick="closeModal()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                        <i data-lucide="chevron-left" class="w-4 h-4"></i>
                        <span>${window.t('back', 'Back')}</span>
                    </button>
                    <div class="flex items-center gap-3 min-w-0">
                        <div id="invModalIconWrap" class="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <i id="invModalIcon" data-lucide="package-plus" class="w-5 h-5"></i>
                        </div>
                        <div class="min-w-0">
                            <h3 id="invModalTitle" class="text-base font-black text-gray-900 dark:text-white truncate">${canAddDirect ? 'Add New Stock' : 'Request New Stock'}</h3>
                            <p id="invModalSubtitle" class="text-[11px] font-bold ${canAddDirect ? 'text-emerald-600' : 'text-gray-500'} truncate">
                                ${canAddDirect ? 'Allowed — will be added directly' : 'Additions require admin approval'}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- MAIN CONTENTS (SCROLLABLE AREA) -->
                <div class="modal-main-content flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4">
                    <!-- Item Type Segmented Toggle -->
                    <div class="p-3 bg-gray-50 dark:bg-gray-800/80 rounded-2xl border border-gray-200/80 dark:border-gray-700/80">
                        <label class="block text-[10px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Item Type</label>
                        <div class="grid grid-cols-2 gap-2">
                            <label class="flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold cursor-pointer transition-all border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 dark:has-[:checked]:bg-indigo-950/40 has-[:checked]:text-indigo-600 dark:has-[:checked]:text-indigo-400 shadow-2xs">
                                <input type="radio" name="invItemType" value="product" checked onchange="window.toggleBranchAddInvType('product')" class="sr-only">
                                <i data-lucide="package" class="w-4 h-4"></i>
                                <span>📦 Physical Product</span>
                            </label>
                            <label class="flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold cursor-pointer transition-all border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 dark:has-[:checked]:bg-indigo-950/40 has-[:checked]:text-indigo-600 dark:has-[:checked]:text-indigo-400 shadow-2xs">
                                <input type="radio" name="invItemType" value="service" onchange="window.toggleBranchAddInvType('service')" class="sr-only">
                                <i data-lucide="wrench" class="w-4 h-4"></i>
                                <span>🛠️ Service / Offering</span>
                            </label>
                        </div>
                    </div>

                    <div class="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100/50 dark:border-blue-900/30 space-y-3">
                        <p class="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-black tracking-wider" id="invItemInfoTitle">Item Information</p>
                        <div>
                            <label for="itemName" id="itemNameLabel" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Item Name</label>
                            <input type="text" id="itemName" required class="form-input" placeholder="e.g. Product A">
                        </div>
                        <div class="grid grid-cols-2 gap-3" id="skuCategoryGrid">
                            <div id="itemSkuContainer">
                                <label for="itemSku" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SKU / Code</label>
                                <input type="text" id="itemSku" class="form-input" placeholder="PRD-001" value="${data && data.suggestedSku ? data.suggestedSku : ''}">
                            </div>
                            <div id="itemCategoryContainer">
                                <label for="itemCategory" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                                ${window.renderPremiumSelect({
                    id: 'itemCategory',
                    selectedValue: 'General',
                    options: [
                        { value: 'General', label: 'General', icon: 'grid' },
                        { value: 'Electronics', label: 'Electronics', icon: 'cpu' },
                        { value: 'Clothing', label: 'Clothing', icon: 'shirt' },
                        { value: 'Groceries', label: 'Groceries', icon: 'shopping-cart' },
                        { value: 'Home & Garden', label: 'Home & Garden', icon: 'home' },
                        { value: 'Health & Beauty', label: 'Health & Beauty', icon: 'sparkles' },
                        { value: 'Stationery', label: 'Stationery', icon: 'pen-tool' },
                        { value: 'Services', label: 'Services', icon: 'briefcase' },
                        { value: 'Other', label: 'Other', icon: 'more-horizontal' }
                    ]
                })}
                            </div>
                        </div>
                    </div>

                    <div class="p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-100/50 dark:border-amber-900/30 space-y-3" id="invFinancialDetailsCard">
                        <p class="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-black tracking-wider" id="invFinancialDetailsTitle">Purchase &amp; Supplier Details</p>
                        <div id="itemSupplierContainer">
                            <label for="itemSupplier" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier Name</label>
                            ${window.renderPremiumSelect({
                    id: 'itemSupplier',
                    selectedValue: '',
                    placeholder: 'Select a supplier',
                    options: [], // Populated dynamically by js
                    classes: 'text-amber-900 dark:text-amber-200'
                })}
                        </div>
                        <div class="grid grid-cols-3 gap-3" id="itemPricesQtyGrid">
                            <div id="itemQtyContainer">
                                <label for="itemQty" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Qty</label>
                                <input type="text" inputmode="decimal" id="itemQty" required class="form-input number-format" placeholder="0">
                            </div>
                            <div id="itemCostContainer">
                                <label for="itemCost" id="itemCostLabel" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Unit Cost</label>
                                <input type="text" inputmode="decimal" id="itemCost" required class="form-input number-format font-bold text-amber-600" placeholder="0.00">
                            </div>
                            <div class="col-span-1" id="itemSellingPricesContainer">
                                <label class="block text-[10px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-wider mb-1.5" id="itemSellingPricesLabel">Selling Prices</label>
                                <div class="space-y-2">
                                    <div class="relative" id="itemWholesaleWrapper">
                                        <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-indigo-500 uppercase tracking-wider pointer-events-none">JML</div>
                                        <input type="text" inputmode="decimal" id="itemWholesalePrice" class="form-input number-format font-bold text-indigo-600 pl-10 text-sm" placeholder="0.00" title="Bei ya Jumla / Wholesale Price">
                                    </div>
                                    <div class="relative" id="itemRetailWrapper">
                                        <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-500 uppercase tracking-wider pointer-events-none" id="itemRetailPrefix">RTL</div>
                                        <input type="text" inputmode="decimal" id="itemRetailPrice" required class="form-input number-format font-bold text-emerald-600 pl-10 text-sm" placeholder="0.00" title="Bei ya Rejareja / Retail Price">
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="grid grid-cols-2 gap-2 p-2.5 bg-purple-50 dark:bg-purple-950/20 rounded-xl border border-purple-100/60 dark:border-purple-900/30" id="itemWholesaleRetailHelp">
                            <div class="text-center">
                                <p class="text-[9px] font-black text-indigo-500 uppercase tracking-wider">Bei ya Jumla</p>
                                <p class="text-[10px] text-gray-500 font-medium">Wholesale / Partner</p>
                            </div>
                            <div class="text-center">
                                <p class="text-[9px] font-black text-emerald-500 uppercase tracking-wider">Bei ya Rejareja</p>
                                <p class="text-[10px] text-gray-500 font-medium">Retail / Standard Fee</p>
                            </div>
                        </div>
                        <div id="itemMinThresholdContainer">
                            <label for="itemMinThreshold" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Min. Alert Threshold</label>
                            <input type="text" inputmode="decimal" id="itemMinThreshold" required class="form-input number-format" placeholder="10">
                        </div>
                    </div>
                </div>

                <!-- BOTTOM NAV / FOOTER -->
                <div class="modal-bottom-nav flex-none p-4 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center gap-3 z-20">
                    <button type="button" onclick="closeModal()" class="px-5 py-2.5 rounded-xl font-bold text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border-none">
                        Cancel
                    </button>
                    <button type="submit" id="invSubmitBtn" class="px-6 py-2.5 rounded-xl font-black text-xs ${canAddDirect ? 'bg-emerald-600 hover:bg-emerald-700' : 'btn-primary'} text-white shadow-md transition-all">
                        ${canAddDirect ? 'Add to Inventory' : 'Submit for Approval'}
                    </button>
                </div>
            </form>`;
        }

        case 'restockStock': {
            const canRestockDirect = window.branchCanDo && branchCanDo('inventory_update');
            return `
            <form onsubmit="handleRestockStock(event, '${data.id}')" class="flex flex-col h-full min-h-0 overflow-hidden">
                <input type="hidden" id="restockName" value="${data.name}">
                <!-- TOP NAV / HEADER -->
                <div class="modal-top-nav flex-none p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center gap-3.5 justify-start z-20">
                    <button type="button" onclick="closeModal()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                        <i data-lucide="chevron-left" class="w-4 h-4"></i>
                        <span>${window.t('back', 'Back')}</span>
                    </button>
                    <div class="flex items-center gap-3 min-w-0">
                        <div class="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <i data-lucide="refresh-cw" class="w-5 h-5"></i>
                        </div>
                        <div class="min-w-0">
                            <h3 class="text-base font-black text-gray-900 dark:text-white truncate">${canRestockDirect ? 'Restock Item' : 'Request Stock Addition'}</h3>
                            <p class="text-[11px] font-bold ${canRestockDirect ? 'text-emerald-600' : 'text-gray-500'} truncate">
                                ${data.name} (SKU: ${data.sku || 'N/A'}) ${canRestockDirect ? '— Allowed directly' : ''}
                            </p>
                        </div>
                    </div>
                </div>

                <!-- MAIN CONTENTS (SCROLLABLE AREA) -->
                <div class="modal-main-content flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4">
                    ${(typeof window.hasFeature === 'function' && window.hasFeature('modal_ai_assistant') && window.sysSettings?.enable_modal_ai_assistant !== 'false') ? `
                    <button type="button" onclick="window.openAiWithContext('restock')"
                        class="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[#475B6E]/30 bg-[#475B6E]/5 hover:bg-[#475B6E]/10 text-[#475B6E] dark:text-[#a0b4c4] text-xs font-bold tracking-wide transition-all active:scale-[0.98]">
                        <i data-lucide="sparkles" class="w-3.5 h-3.5"></i>
                        BMSTz Assistant — Get restock guidance
                    </button>` : ''}

                    <div class="p-3.5 sm:p-4 bg-amber-50/50 dark:bg-amber-950/20 rounded-2xl border border-amber-100/50 dark:border-amber-900/30">
                        <p class="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-black tracking-wider mb-2">Purchase & Supplier Details</p>
                        <div class="space-y-3">
                            <div>
                                <label for="restockSupplier" class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Supplier Name</label>
                                ${window.renderPremiumSelect({
                        id: 'restockSupplier',
                        selectedValue: '',
                        placeholder: 'Select a supplier',
                        options: [], // Populated dynamically
                        classes: 'text-amber-900 dark:text-amber-200'
                    })}
                            </div>
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label for="restockQty" class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Quantity to Add</label>
                                    <input type="text" inputmode="decimal" id="restockQty" required class="form-input number-format" placeholder="0">
                                </div>
                                <div>
                                    <label for="restockCost" class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Unit Cost</label>
                                    <input type="text" inputmode="decimal" id="restockCost" required class="form-input number-format font-bold text-amber-600" placeholder="0.00">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- BOTTOM NAV / FOOTER -->
                <div class="modal-bottom-nav flex-none p-4 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center gap-3 z-20">
                    <button type="button" onclick="closeModal()" class="px-5 py-2.5 rounded-xl font-bold text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border-none">
                        Cancel
                    </button>
                    <button type="submit" class="px-6 py-2.5 rounded-xl font-black text-xs ${canRestockDirect ? 'bg-emerald-600 hover:bg-emerald-700' : 'btn-primary'} text-white shadow-md transition-all">
                        ${canRestockDirect ? 'Restock Now' : 'Submit Request'}
                    </button>
                </div>
            </form>`;
        }

        case 'editGeneralRequest': return `
        <div class="p-6">
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center">
                        <i data-lucide="edit-3" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h3 class="text-lg font-bold text-gray-900">Edit Request</h3>
                        <p class="text-xs text-gray-500 font-medium truncate w-48">${data.subject}</p>
                    </div>
                </div>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <form onsubmit="handleEditGeneralRequest(event, '${data.id}')" class="space-y-4">
                <div>
                    <label for="editReqSubject" class="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                    <input type="text" id="editReqSubject" required class="form-input" value="${data.subject}">
                </div>
                <div>
                    <label for="editReqPriority" class="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    ${window.renderPremiumSelect({
            id: 'editReqPriority',
            selectedValue: data.priority,
            options: [
                { value: 'low', label: 'Low - General Feedback', icon: 'info' },
                { value: 'medium', label: 'Medium - Needs Review', icon: 'shield-check' },
                { value: 'high', label: 'High - Immediate Attention', icon: 'alert-circle' }
            ]
        })}
                </div>
                <div>
                    <label for="editReqMessage" class="block text-sm font-medium text-gray-700 mb-1">Your Message</label>
                    <textarea id="editReqMessage" required rows="4" class="form-input">${data.message}</textarea>
                </div>
                <div class="flex gap-3 pt-2">
                    <button type="button" onclick="closeModal()" class="flex-1 px-4 py-2 rounded-lg font-medium hover: text-sm bg-red-600 text-white hover:bg-red-700 shadow-sm font-bold border-none">Cancel</button>
                    <button type="submit" class="flex-1 btn-primary justify-center">Update Request</button>
                </div>
            </form>
        </div>`;

        case 'editInventoryAddRequest': {
            const meta = data.metadata || {};
            const isService = meta.item_type === 'service' || (data.subject && data.subject.toLowerCase().includes('service'));
            return `
        <div class="p-6">
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h3 class="text-xl font-bold text-gray-900">${isService ? 'Edit Service Request' : 'Edit Stock Request'}</h3>
                    <p class="text-xs text-gray-500 font-medium">${isService ? 'Update proposed service details' : 'Update proposed item details'}</p>
                </div>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <form onsubmit="handleEditInventoryAddRequest(event, '${data.id}')" class="space-y-4">
                <input type="hidden" id="editItemTypeAdd" value="${isService ? 'service' : 'product'}">
                <div class="p-4 bg-blue-50/50 rounded-2xl border border-blue-100/50 mb-4">
                    <p class="text-[10px] text-blue-600 uppercase font-black tracking-wider mb-2">${isService ? 'Service Information' : 'Item Information'}</p>
                    <div class="space-y-3">
                        <div>
                            <label for="editItemNameAdd" class="block text-sm font-bold text-gray-700 mb-1">${isService ? 'Service Name' : 'Item Name'}</label>
                            <input type="text" id="editItemNameAdd" required class="form-input" value="${meta.name || ''}">
                        </div>
                        <div class="grid ${isService ? 'grid-cols-1' : 'grid-cols-2'} gap-3">
                            ${!isService ? `
                            <div>
                                <label for="editItemSkuAdd" class="block text-sm font-bold text-gray-700 mb-1">SKU</label>
                                <input type="text" id="editItemSkuAdd" class="form-input" value="${meta.sku || ''}">
                            </div>` : `<input type="hidden" id="editItemSkuAdd" value="${meta.sku || ''}">`}
                            <div>
                                <label for="editItemCategoryAdd" class="block text-sm font-bold text-gray-700 mb-1">Category</label>
                                ${window.renderPremiumSelect({
                id: 'editItemCategoryAdd',
                selectedValue: meta.category || (isService ? 'Services' : 'General'),
                options: [
                    { value: 'General', label: 'General', icon: 'grid' },
                    { value: 'Electronics', label: 'Electronics', icon: 'cpu' },
                    { value: 'Clothing', label: 'Clothing', icon: 'shirt' },
                    { value: 'Groceries', label: 'Groceries', icon: 'shopping-cart' },
                    { value: 'Home & Garden', label: 'Home & Garden', icon: 'home' },
                    { value: 'Health & Beauty', label: 'Health & Beauty', icon: 'sparkles' },
                    { value: 'Stationery', label: 'Stationery', icon: 'pen-tool' },
                    { value: 'Services', label: 'Services', icon: 'briefcase' },
                    { value: 'Other', label: 'Other', icon: 'more-horizontal' }
                ]
            })}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50 mb-4">
                    <p class="text-[10px] text-amber-600 uppercase font-black tracking-wider mb-2">${isService ? 'Service Pricing & Cost Details' : 'Purchase & Supplier Details'}</p>
                    <div class="space-y-3">
                        ${!isService ? `
                        <div>
                            <label for="editItemSupplierAdd" class="block text-sm font-bold text-gray-700 mb-1">Supplier Name</label>
                            ${window.renderPremiumSelect({
                id: 'editItemSupplierAdd',
                selectedValue: '',
                placeholder: 'Select a supplier',
                options: [],
                classes: 'text-amber-900'
            })}
                        </div>` : `<input type="hidden" id="editItemSupplierAdd" value="">`}
                        <div class="grid ${isService ? 'grid-cols-2' : 'grid-cols-3'} gap-3">
                            ${!isService ? `
                            <div class="col-span-1">
                                <label for="editItemQtyAdd" class="block text-sm font-bold text-gray-700 mb-1">Qty</label>
                                <input type="text" inputmode="decimal" id="editItemQtyAdd" required class="form-input number-format" value="${meta.quantity !== undefined ? meta.quantity : ''}">
                            </div>` : `<input type="hidden" id="editItemQtyAdd" value="0">`}
                            <div class="col-span-1">
                                <label for="editItemCostAdd" class="block text-sm font-bold text-gray-700 mb-1">${isService ? 'Service Cost' : 'Unit Cost'}</label>
                                <input type="text" inputmode="decimal" id="editItemCostAdd" class="form-input number-format font-bold text-amber-600" value="${meta.cost_price !== undefined ? meta.cost_price : ''}">
                            </div>
                            <div class="col-span-1">
                                <label for="editItemPriceAdd" class="block text-sm font-bold text-gray-700 mb-1">${isService ? 'Service Price' : 'Sale Price'}</label>
                                <input type="text" inputmode="decimal" id="editItemPriceAdd" required class="form-input number-format font-bold text-emerald-600" value="${meta.price !== undefined ? meta.price : (meta.retail_price !== undefined ? meta.retail_price : '')}">
                            </div>
                        </div>
                        ${!isService ? `
                        <div>
                            <label for="editItemMinThresholdAdd" class="block text-sm font-bold text-gray-700 mb-1">Min. Alert Threshold</label>
                            <input type="text" inputmode="decimal" id="editItemMinThresholdAdd" required class="form-input number-format" value="${meta.min_threshold !== undefined ? meta.min_threshold : ''}">
                        </div>` : `<input type="hidden" id="editItemMinThresholdAdd" value="0">`}
                    </div>
                </div>

                <div class="flex gap-3 pt-2">
                    <button type="button" onclick="closeModal()" class="flex-1 px-4 py-2 rounded-lg font-medium hover: text-sm bg-red-600 text-white hover:bg-red-700 shadow-sm font-bold border-none">Cancel</button>
                    <button type="submit" class="flex-1 btn-primary justify-center font-black">${isService ? 'Update Service Request' : 'Update Request'}</button>
                </div>
            </form>
        </div>`;
        }

        case 'editRestockRequest': {
            const meta = data.metadata || {};
            return `
        <div class="p-6">
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h3 class="text-xl font-bold text-gray-900">Edit Restock Request</h3>
                    <p class="text-xs text-gray-500 font-medium">${meta.name || ''} (SKU: ${meta.sku || 'N/A'})</p>
                </div>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <form onsubmit="handleEditRestockRequest(event, '${data.id}')" class="space-y-4">
                <input type="hidden" id="editRestockName" value="${meta.name || ''}">
                <input type="hidden" id="editRestockInvId" value="${meta.inventory_id || ''}">

                <div class="p-4 bg-amber-50/50 rounded-2xl border border-amber-100/50 mb-4">
                    <p class="text-[10px] text-amber-600 uppercase font-black tracking-wider mb-2">Purchase & Supplier Details</p>
                    <div class="space-y-3">
                        <div>
                            <label for="editRestockSupplier" class="block text-sm font-bold text-gray-700 mb-1">Supplier Name</label>
                            ${window.renderPremiumSelect({
                id: 'editRestockSupplier',
                selectedValue: '',
                placeholder: 'Select a supplier',
                options: [],
                classes: 'text-amber-900'
            })}
                        </div>
                        <div class="grid grid-cols-2 gap-3">
                            <div>
                                <label for="editRestockQty" class="block text-sm font-bold text-gray-700 mb-1">Quantity to Add</label>
                                <input type="text" inputmode="decimal" id="editRestockQty" required class="form-input number-format" value="${meta.quantity !== undefined ? meta.quantity : ''}">
                            </div>
                            <div>
                                <label for="editRestockCost" class="block text-sm font-bold text-gray-700 mb-1">Unit Cost</label>
                                <input type="text" inputmode="decimal" id="editRestockCost" required class="form-input number-format font-bold text-amber-600" value="${meta.cost_price !== undefined ? meta.cost_price : ''}">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="flex gap-3 pt-2">
                    <button type="button" onclick="closeModal()" class="flex-1 px-4 py-2 rounded-lg font-medium hover: text-sm bg-red-600 text-white hover:bg-red-700 shadow-sm font-bold border-none">Cancel</button>
                    <button type="submit" class="flex-1 btn-primary justify-center font-black">Update Request</button>
                </div>
            </form>
        </div>`;
        }

        case 'editSale': return `
        <div class="p-6">
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-xl font-bold text-gray-900">Edit Sale</h3>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <form onsubmit="handleEditSale(event, '${data.id}')" class="space-y-4">
                <div>
                    <label for="editSaleCustomer" class="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                    <input type="text" id="editSaleCustomer" value="${data.customer}" class="form-input">
                </div>
                <div>
                    <label for="editSaleItems" class="block text-sm font-medium text-gray-700 mb-1">Items / Description</label>
                    <input type="text" id="editSaleItems" value="${data.items || ''}" class="form-input">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="editSaleAmount" class="block text-sm font-medium text-gray-700 mb-1">Amount (${fmt.getSymbol()})</label>
                        <input type="text" inputmode="decimal" id="editSaleAmount" value="${data.amount}" required class="form-input number-format">
                    </div>
                    <div>
                        <label for="editSalePayment" class="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                        ${window.renderPremiumSelect({
            id: 'editSalePayment',
            selectedValue: data.payment,
            options: [
                { value: 'cash', label: 'Cash', icon: 'banknote' },
                { value: 'card', label: 'Credit Card', icon: 'credit-card' },
                { value: 'transfer', label: 'Bank Transfer', icon: 'landmark' },
                { value: 'mobile', label: 'Mobile Money', icon: 'smartphone' }
            ]
        })}
                    </div>
                </div>
                <div class="flex gap-3 pt-2">
                    <button type="button" onclick="closeModal()" class="flex-1 px-4 py-2 rounded-lg font-medium hover: text-sm bg-red-600 text-white hover:bg-red-700 shadow-sm font-bold border-none">Cancel</button>
                    <button type="submit" class="flex-1 btn-primary justify-center">Update Sale</button>
                </div>
            </form>
        </div>`;

        case 'editInventoryItem': return `
        <div class="p-6">
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-xl font-bold text-gray-900">Edit Item</h3>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <form onsubmit="handleEditInventoryItem(event, '${data.id}')" class="space-y-4">
                <div>
                    <label for="editItemName" class="block text-sm font-medium text-gray-700 mb-1">Item Name</label>
                    <input type="text" id="editItemName" value="${data.name}" required class="form-input">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="editItemSku" class="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                        <input type="text" id="editItemSku" value="${data.sku || ''}" class="form-input">
                    </div>
                    <div>
                        <label for="editItemCategory" class="block text-sm font-medium text-gray-700 mb-1">Category</label>
                        ${window.renderPremiumSelect({
            id: 'editItemCategory',
            selectedValue: data.category,
            options: [
                { value: 'General', label: 'General', icon: 'grid' },
                { value: 'Electronics', label: 'Electronics', icon: 'cpu' },
                { value: 'Clothing', label: 'Clothing', icon: 'shirt' },
                { value: 'Groceries', label: 'Groceries', icon: 'shopping-cart' },
                { value: 'Home & Garden', label: 'Home & Garden', icon: 'home' },
                { value: 'Health & Beauty', label: 'Health & Beauty', icon: 'sparkles' },
                { value: 'Stationery', label: 'Stationery', icon: 'pen-tool' },
                { value: 'Services', label: 'Services', icon: 'briefcase' },
                { value: 'Other', label: 'Other', icon: 'more-horizontal' }
            ]
        })}
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="editItemQty" class="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                        <input type="text" inputmode="decimal" id="editItemQty" value="${data.quantity}" required class="form-input number-format">
                    </div>
                    <div>
                        <label class="block text-[10px] font-black text-purple-600 uppercase tracking-wider mb-1.5">Selling Prices</label>
                        <div class="space-y-2">
                            <div class="relative">
                                <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-indigo-500 uppercase tracking-wider pointer-events-none">JML</div>
                                <input type="text" inputmode="decimal" id="editItemWholesalePrice" value="${data.wholesale_price ?? data.price ?? 0}" class="form-input number-format font-bold text-indigo-600 pl-10 text-sm" placeholder="0.00" title="Bei ya Jumla / Wholesale Price">
                            </div>
                            <div class="relative">
                                <div class="absolute left-2.5 top-1/2 -translate-y-1/2 text-[9px] font-black text-emerald-500 uppercase tracking-wider pointer-events-none">RTL</div>
                                <input type="text" inputmode="decimal" id="editItemRetailPrice" value="${data.retail_price ?? data.price ?? 0}" required class="form-input number-format font-bold text-emerald-600 pl-10 text-sm" placeholder="0.00" title="Bei ya Rejareja / Retail Price">
                            </div>
                        </div>
                    </div>
                </div>
                <div class="pt-2">
                    <label for="editItemMinThreshold" class="block text-sm font-medium text-gray-700 mb-1">Min. Threshold</label>
                    <input type="text" inputmode="decimal" id="editItemMinThreshold" value="${data.min_threshold}" required class="form-input number-format">
                </div>
                <div class="flex gap-3 pt-2">
                    <button type="button" onclick="closeModal()" class="flex-1 px-4 py-2 rounded-lg font-medium hover: text-sm bg-red-600 text-white hover:bg-red-700 shadow-sm font-bold border-none">Cancel</button>
                    <button type="submit" class="flex-1 btn-primary justify-center">Update Item</button>
                </div>
            </form>
        </div>`;

        case 'editNote': return `
        <div class="p-6">
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-xl font-bold text-gray-900">Edit Note</h3>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <form onsubmit="handleEditNote(event, '${data.id}')" class="space-y-4">
                <div>
                    <label for="editNoteTitle" class="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input type="text" id="editNoteTitle" value="${data.title}" required class="form-input">
                </div>
                <div>
                    <label for="editNoteContent" class="block text-sm font-medium text-gray-700 mb-1">Content</label>
                    <textarea id="editNoteContent" required rows="5" class="form-input">${data.content}</textarea>
                </div>
                <div>
                    <label for="editNoteTag" class="block text-sm font-medium text-gray-700 mb-1">Tag</label>
                    ${window.renderPremiumSelect({
            id: 'editNoteTag',
            selectedValue: data.tag,
            options: [
                { value: 'general', label: 'General', icon: 'tag' },
                { value: 'important', label: 'Important', icon: 'alert-triangle' },
                { value: 'reminder', label: 'Reminder', icon: 'clock' },
                { value: 'incident', label: 'Incident', icon: 'shield-alert' }
            ]
        })}
                </div>
                <div class="flex gap-3 pt-2">
                    <button type="button" onclick="closeModal()" class="flex-1 px-4 py-2 rounded-lg font-medium hover: text-sm bg-red-600 text-white hover:bg-red-700 shadow-sm font-bold border-none">Cancel</button>
                    <button type="submit" class="flex-1 btn-primary justify-center">Update Note</button>
                </div>
            </form>
        </div>`;

        case 'importCentralInventoryInfo': return `
        <div class="p-6">
            <div class="flex items-center justify-between mb-8">
                <h3 class="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <i data-lucide="package-plus" class="w-6 h-6 text-indigo-600"></i>
                    Central Catalog & Services Import
                </h3>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Section 1: Main Store Stock Products -->
                <div class="flex flex-col bg-slate-50 rounded-2xl p-5 border border-slate-200">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                            <i data-lucide="package" class="w-5 h-5 text-indigo-600"></i>
                        </div>
                        <div>
                            <h4 class="font-bold text-gray-900 leading-tight">Main Store Products</h4>
                            <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Physical Stock Items</p>
                        </div>
                    </div>

                    <p class="text-xs text-gray-600 mb-6 leading-relaxed flex-1">
                        Use this option to bulk-add physical items to your <b>Main Store</b>. Download the template, fill in Item Name, SKU/Code, Category, Stock, Purchase Cost, Selling Price, and Low Stock Threshold.
                    </p>

                    <div class="space-y-3 pt-4 border-t border-slate-200">
                        <button onclick="window.downloadCentralCSVTemplate()" class="w-full flex items-center justify-between px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all group">
                            <span class="flex items-center gap-2">
                                <i data-lucide="download" class="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600"></i>
                                Download Product Template
                            </span>
                            <i data-lucide="chevron-right" class="w-3 h-3 text-slate-300"></i>
                        </button>
                        <button onclick="window.importCentralCSV(); closeModal()" class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
                            <i data-lucide="upload" class="w-4 h-4"></i>
                            Select & Import Products
                        </button>
                    </div>
                </div>

                <!-- Section 2: Services & Offerings -->
                <div class="flex flex-col bg-purple-50/70 rounded-2xl p-5 border border-purple-200">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                            <i data-lucide="wrench" class="w-5 h-5 text-purple-600"></i>
                        </div>
                        <div>
                            <h4 class="font-bold text-gray-900 leading-tight">Service Offerings</h4>
                            <p class="text-[10px] text-purple-700 font-bold uppercase tracking-wider">Services Catalog</p>
                        </div>
                    </div>

                    <p class="text-xs text-gray-600 mb-6 leading-relaxed flex-1">
                        Use this option to bulk-add billable <b>Services & Offerings</b>. Download the template, fill in Service Name, Category, Service Price / Rate, Direct Cost (optional), and Description.
                    </p>

                    <div class="space-y-3 pt-4 border-t border-purple-200">
                        <button onclick="window.downloadServicesCSVTemplate()" class="w-full flex items-center justify-between px-4 py-2 bg-white border border-purple-200 rounded-xl text-xs font-bold text-purple-700 hover:bg-purple-50 transition-all group">
                            <span class="flex items-center gap-2">
                                <i data-lucide="download" class="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-600"></i>
                                Download Service Template
                            </span>
                            <i data-lucide="chevron-right" class="w-3 h-3 text-purple-300"></i>
                        </button>
                        <button onclick="window.importServicesCSV(); closeModal()" class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-200">
                            <i data-lucide="upload" class="w-4 h-4"></i>
                            Select & Import Services
                        </button>
                    </div>
                </div>
            </div>
        </div>`;

        case 'importInventoryInfo': return `
        <div class="p-6">
            <div class="flex items-center justify-between mb-8">
                <h3 class="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <i data-lucide="package-plus" class="w-6 h-6 text-indigo-600"></i>
                    Inventory Management
                </h3>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Section 1: Fresh Inventory -->
                <div class="flex flex-col bg-slate-50 rounded-2xl p-5 border border-slate-200">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                            <i data-lucide="sparkles" class="w-5 h-5 text-indigo-600"></i>
                        </div>
                        <div>
                            <h4 class="font-bold text-gray-900 leading-tight">Fresh Inventory</h4>
                            <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Add New Items</p>
                        </div>
                    </div>

                    <p class="text-xs text-gray-600 mb-6 leading-relaxed flex-1">
                        Use this option to bulk-add **brand new products** to your database. Ensure all required fields (Name, Price, Quantity) are filled.
                    </p>

                    <div class="space-y-3 pt-4 border-t border-slate-200">
                        <button onclick="downloadInventoryCSVTemplate()" class="w-full flex items-center justify-between px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-all group">
                            <span class="flex items-center gap-2">
                                <i data-lucide="download" class="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600"></i>
                                CSV Template
                            </span>
                            <i data-lucide="chevron-right" class="w-3 h-3 text-slate-300"></i>
                        </button>
                        <button onclick="importInventoryCSV(); closeModal()" class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
                            <i data-lucide="upload" class="w-4 h-4"></i>
                            Select & Import Fresh
                        </button>
                    </div>
                </div>

                <!-- Section 2: Restock -->
                <div class="flex flex-col bg-emerald-50 rounded-2xl p-5 border border-emerald-200">
                    <div class="flex items-center gap-3 mb-4">
                        <div class="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                            <i data-lucide="refresh-cw" class="w-5 h-5 text-emerald-600"></i>
                        </div>
                        <div>
                            <h4 class="font-bold text-gray-900 leading-tight">Restock Inventory</h4>
                            <p class="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Replenish Low Items</p>
                        </div>
                    </div>

                    <p class="text-xs text-gray-600 mb-6 leading-relaxed flex-1">
                        Instantly restock **low-stock items**. The template is automatically pre-filled with items that need attention. Just enter the added amount.
                    </p>

                    <div class="space-y-3 pt-4 border-t border-emerald-200">
                        <button onclick="downloadRestockCSVTemplate()" class="w-full flex items-center justify-between px-4 py-2 bg-white border border-emerald-200 rounded-xl text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-all group">
                            <span class="flex items-center gap-2">
                                <i data-lucide="download" class="w-3.5 h-3.5 text-emerald-400 group-hover:text-emerald-600"></i>
                                Restock Template
                            </span>
                            <i data-lucide="chevron-right" class="w-3 h-3 text-emerald-300"></i>
                        </button>
                        <button onclick="importRestockCSV(); closeModal()" class="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200">
                            <i data-lucide="truck" class="w-4 h-4"></i>
                            Select & Update Stock
                        </button>
                    </div>
                </div>
            </div>

            <div class="mt-8 p-4 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-3">
                <i data-lucide="info" class="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"></i>
                <p class="text-[11px] text-amber-900 leading-relaxed font-medium">
                    Do not modify the column headers in the CSV templates. For **Restock**, the <span class="font-bold">added_quantity</span> will be added to your current stock level.
                </p>
            </div>
        </div>`;

        case 'importCustomersInfo': return `
        <div class="p-6">
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-xl font-bold text-gray-900">Import Customers</h3>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <div class="space-y-4 text-sm text-gray-600 mb-6">
                <p>To import multiple customers, please download the template and fill it out following these rules:</p>

                <div class="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-2 text-indigo-900">
                    <p><strong><span class="text-indigo-600">name</span></strong>: (Required) Full name of the customer</p>
                    <p><strong><span class="text-indigo-600">phone</span></strong>: Optional phone number</p>
                    <p><strong><span class="text-indigo-600">email</span></strong>: Optional email address</p>
                </div>

                <div class="p-3 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-200 text-xs font-medium">
                    <i data-lucide="alert-circle" class="w-4 h-4 inline mr-1 -mt-0.5"></i>
                    Do not change the header names in the first row of the template.
                </div>
            </div>

            <div class="flex flex-col sm:flex-row gap-3 mt-4">
                <button type="button" onclick="downloadCustomersCSVTemplate()" class="flex-1 px-4 py-2 border border-indigo-200 text-indigo-700 bg-indigo-50 rounded-lg font-bold hover:bg-indigo-100 flex items-center justify-center text-sm transition-colors">
                    <i data-lucide="download" class="w-4 h-4 mr-2"></i> Template
                </button>
                <button type="button" onclick="importCustomersCSV(); closeModal()" class="flex-1 btn-primary justify-center">
                    <i data-lucide="upload" class="w-4 h-4 mr-2"></i> Select CSV to Import
                </button>
            </div>
        </div>`;

        case 'importExpensesInfo': return `
        <div class="p-6">
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-xl font-bold text-gray-900">Import Expenses</h3>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <div class="space-y-4 text-sm text-gray-600 mb-6">
                <p>To import multiple expenses, please download the template and fill it out following these rules:</p>

                <div class="bg-indigo-50 p-4 rounded-xl border border-indigo-100 space-y-2 text-indigo-900">
                    <p><strong><span class="text-indigo-600">category</span></strong>: Must be one of: supplies, utilities, salary, rent, maintenance, marketing, other</p>
                    <p><strong><span class="text-indigo-600">description</span></strong>: (Required) Short description of the expense</p>
                    <p><strong><span class="text-indigo-600">amount</span></strong>: (Required) The total amount (Numbers only, e.g., 50.00)</p>
                </div>

                <div class="p-3 bg-yellow-50 text-yellow-800 rounded-xl border border-yellow-200 text-xs font-medium">
                    <i data-lucide="alert-circle" class="w-4 h-4 inline mr-1 -mt-0.5"></i>
                    Do not change the header names in the first row of the template.
                </div>
            </div>

            <div class="flex flex-col sm:flex-row gap-3 mt-4">
                <button type="button" onclick="downloadExpensesCSVTemplate()" class="flex-1 px-4 py-2 border border-indigo-200 text-indigo-700 bg-indigo-50 rounded-lg font-bold hover:bg-indigo-100 flex items-center justify-center text-sm transition-colors">
                    <i data-lucide="download" class="w-4 h-4 mr-2"></i> Template
                </button>
                <button type="button" onclick="importExpensesCSV(); closeModal()" class="flex-1 btn-primary justify-center">
                    <i data-lucide="upload" class="w-4 h-4 mr-2"></i> Select CSV to Import
                </button>
            </div>
        </div>`;

        case 'editExpense': return `
        <div class="p-6">
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-xl font-bold text-gray-900">Edit Expense</h3>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <form onsubmit="handleEditExpense(event, '${data.id}')" class="space-y-4">
                <div>
                    <label for="editExpenseCategory" class="block text-sm font-medium text-gray-700 mb-1">Category</label>
                    ${window.renderPremiumSelect({
            id: 'editExpenseCategory',
            selectedValue: data.category,
            options: [
                { value: 'supplies', label: 'Supplies', icon: 'package' },
                { value: 'utilities', label: 'Utilities', icon: 'zap' },
                { value: 'salary', label: 'Salary', icon: 'users' },
                { value: 'rent', label: 'Rent', icon: 'home' },
                { value: 'maintenance', label: 'Maintenance', icon: 'tool' },
                { value: 'marketing', label: 'Marketing', icon: 'megaphone' },
                { value: 'other', label: 'Other', icon: 'more-horizontal' }
            ]
        })}
                </div>
                <div>
                    <label for="editExpenseDesc" class="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <input type="text" id="editExpenseDesc" value="${data.description}" required class="form-input">
                </div>
                <div>
                    <label for="editExpenseAmount" class="block text-sm font-medium text-gray-700 mb-1">Amount (${fmt.getSymbol()})</label>
                    <input type="text" inputmode="decimal" id="editExpenseAmount" value="${data.amount}" required class="form-input number-format">
                </div>
                <div class="flex gap-3 pt-2">
                    <button type="button" onclick="closeModal()" class="flex-1 px-4 py-2 rounded-lg font-medium hover: text-sm bg-red-600 text-white hover:bg-red-700 shadow-sm font-bold border-none">Cancel</button>
                    <button type="submit" class="flex-1 btn-primary btn-danger justify-center">Update Expense</button>
                </div>
            </form>
        </div>`;

        case 'editCustomer': return _getEditCustomerHTML(data);
        case 'editLoan': return _getEditLoanHTML(data);

        case 'saleDetails': {
            const rawText = (data.items || '').toLowerCase();
            const isService = data.item_type === 'service' || rawText.includes('(service)') || rawText.includes('service');
            return `
        <div class="p-6">
            <div class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-2">
                    <h3 class="text-xl font-bold text-gray-900">Sale Details</h3>
                    ${isService ? `<span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-purple-50 text-purple-700 border border-purple-200">🛠️ Service</span>` : ''}
                </div>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="space-y-3">
                <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center">
                    <p class="text-[10px] text-gray-500 uppercase font-bold">Customer</p>
                    <p class="text-sm font-semibold">${data.customer || 'Walk-in'}</p>
                </div>
                <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center">
                    <p class="text-[10px] text-gray-500 uppercase font-bold">Revenue</p>
                    <p class="text-sm font-black ${isService ? 'text-purple-600' : 'text-emerald-600'}">${fmt.currency(data.amount)}</p>
                </div>
                <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center">
                    <p class="text-[10px] text-gray-500 uppercase font-bold">Est. Profit</p>
                    <p class="text-sm font-black text-indigo-600">${data.profit !== undefined ? fmt.currency(data.profit) : '—'}</p>
                </div>
                <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center">
                    <p class="text-[10px] text-gray-500 uppercase font-bold">Items / Description</p>
                    <p class="text-sm font-medium text-gray-800">${data.items || 'N/A'}</p>
                </div>
                <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center">
                    <p class="text-[10px] text-gray-500 uppercase font-bold">Payment & Price Type</p>
                    <div class="flex items-center gap-1.5">
                        <span class="text-sm font-semibold capitalize text-gray-700">${data.payment || 'Cash'}</span>
                        ${(() => {
                            const rawItemsStr = (typeof data.items === 'string' ? data.items : JSON.stringify(data.items || '')).toLowerCase();
                            let priceType = (data.price_type || '').toLowerCase();
                            if (!['wholesale', 'custom', 'retail'].includes(priceType)) {
                                if (rawItemsStr.includes('wholesale') || rawItemsStr.includes('(wholesale)') || rawItemsStr.includes('[wholesale]')) priceType = 'wholesale';
                                else if (rawItemsStr.includes('custom') || rawItemsStr.includes('(custom)') || rawItemsStr.includes('[custom]')) priceType = 'custom';
                                else priceType = 'retail';
                            }
                            return `<span class="px-2 py-0.5 rounded text-[10px] font-black ${priceType === 'wholesale' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' : priceType === 'custom' ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'} uppercase">${priceType}</span>`;
                        })()}
                    </div>
                </div>
                <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center">
                    <p class="text-[10px] text-gray-500 uppercase font-bold">Date & Time</p>
                    <p class="text-[11px] font-medium text-gray-600">${new Date(data.created_at).toLocaleString()}</p>
                </div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-8">
                <button onclick="openEditModal('editSale', '${data.id}')" class="flex items-center justify-center gap-2 p-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-colors">
                    <i data-lucide="edit-2" class="w-4 h-4"></i> Edit
                </button>
                <button onclick="showReceiptDialog('${encodeURIComponent(JSON.stringify(data))}')" class="flex items-center justify-center gap-2 p-2.5 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-colors">
                    <i data-lucide="download" class="w-4 h-4"></i> Receipt
                </button>
                <button onclick="openRequestModal('sale', '${data.id}', 'Sale: ${data.customer || 'Walk-in'} - ${fmt.currency(data.amount)}')" class="flex items-center justify-center gap-2 p-2.5 bg-amber-50 text-amber-700 rounded-xl font-bold text-xs hover:bg-amber-100 transition-colors">
                    <i data-lucide="message-square" class="w-4 h-4"></i> Request
                </button>
                <button onclick="confirmDelete('sale', '${data.id}')" class="flex items-center justify-center gap-2 p-2.5 bg-red-50 text-red-700 rounded-xl font-bold text-xs hover:bg-red-100 transition-colors">
                    <i data-lucide="trash-2" class="w-4 h-4"></i> Delete
                </button>
            </div>
        </div>`;
        }

        case 'downloadReports': return `
        <div class="flex flex-col h-full bg-slate-50/50 dark:bg-gray-900 overflow-hidden">
            <!-- TOP NAV / HEADER -->
            <div class="modal-top-nav flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-none z-20">
                <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <button type="button" onclick="closeModal()" data-close-text="${window.t('back', 'Back')}" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                        <i data-lucide="chevron-left" class="w-4 h-4"></i>
                        <span>${window.t('back', 'Back')}</span>
                    </button>
                    <div class="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                        <i data-lucide="file-text" class="w-4 h-4 sm:w-5 sm:h-5"></i>
                    </div>
                    <div class="min-w-0">
                        <h3 class="text-sm sm:text-base font-black text-gray-900 dark:text-white leading-tight truncate">${window.t('download_reports', 'Download Reports')}</h3>
                        <p class="text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 truncate">Generate and export branch operational PDF reports</p>
                    </div>
                </div>
                <button type="button" onclick="closeModal()" data-close-text="${window.t('btn_close', 'Close')}" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <!-- SCROLLABLE FORM CONTENT -->
            <form onsubmit="event.preventDefault(); window.handleGeneratePDFReport(event)" class="flex flex-col flex-1 overflow-hidden">
                <div class="modal-main-content flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-4 scroller-custom">
                    <div class="bg-white dark:bg-gray-800/90 p-4 sm:p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('report_module', 'Report Module')}</label>
                            ${window.renderPremiumSelect({
                                id: 'reportModule',
                                selectedValue: 'sales',
                                options: [
                                    { value: 'sales', label: 'Sales Report', icon: 'shopping-bag' },
                                    { value: 'expenses', label: 'Expenses Report', icon: 'receipt' },
                                    { value: 'inventory', label: 'Inventory Report', icon: 'package' },
                                    { value: 'loans', label: 'Loans & Income Report', icon: 'landmark' },
                                    { value: 'income', label: 'Income Report', icon: 'banknote' }
                                ],
                                classes: 'w-full dark:text-white',
                                isDark: true
                            })}
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('report_timeframe', 'Report Timeframe')}</label>
                            ${window.renderPremiumSelect({
                                id: 'reportTimeframe',
                                selectedValue: 'daily',
                                options: [
                                    { value: 'daily', label: 'Daily (Today)', icon: 'calendar' },
                                    { value: 'weekly', label: 'Weekly (Last 7 Days)', icon: 'calendar-days' },
                                    { value: 'monthly', label: 'Monthly (Last 30 Days)', icon: 'calendar-range' },
                                    { value: 'all', label: 'All Time', icon: 'history' },
                                    { value: 'custom', label: 'Custom Date Range', icon: 'settings-2' }
                                ],
                                classes: 'w-full dark:text-white',
                                isDark: true,
                                onchange: 'toggleReportCustomDates(this.value)'
                            })}
                        </div>
                        <div id="reportCustomDates" class="hidden grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                            <div>
                                <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Start Date</label>
                                ${window.renderPremiumDatePicker({
                                    id: 'reportStartDate',
                                    selectedValue: new Date().toISOString().split('T')[0],
                                    placeholder: 'Start Date'
                                })}
                            </div>
                            <div>
                                <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">End Date</label>
                                ${window.renderPremiumDatePicker({
                                    id: 'reportEndDate',
                                    selectedValue: new Date().toISOString().split('T')[0],
                                    placeholder: 'End Date'
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- BOTTOM NAV / FOOTER -->
                <div class="modal-bottom-nav flex-none p-3.5 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center gap-3 z-20">
                    <button type="button" onclick="closeModal()" class="flex-1 py-3 px-4 rounded-2xl font-extrabold text-xs sm:text-sm bg-red-600 hover:bg-red-700 text-white shadow-xs transition-all cursor-pointer">
                        ${window.t('cancel', 'Cancel')}
                    </button>
                    <button type="submit" class="flex-1 py-3 px-4 bg-[#475B6E] hover:bg-[#394958] text-white rounded-2xl font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2">
                        <i data-lucide="download" class="w-4 h-4"></i>
                        <span>${window.t('generate_pdf', 'Generate PDF')}</span>
                    </button>
                </div>
            </form>
        </div>`;

        case 'inventoryDetails': return `
        <div class="p-6">
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-xl font-bold text-gray-900">Product Details</h3>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="space-y-3">
                <div class="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100 mb-2 flex flex-col items-center text-center">
                    <h4 class="text-lg font-bold text-indigo-900 mb-0.5">${data.name}</h4>
                    <p class="text-xs text-indigo-600 font-medium mb-3">SKU: <span class="font-mono font-bold">${data.sku || 'N/A'}</span></p>
                    
                    <div class="w-full bg-white p-3 rounded-xl border border-indigo-100 flex flex-col items-center justify-center shadow-xs">
                        <svg id="barcode-${data.id}" class="max-w-full h-14"></svg>
                        <button type="button" onclick="window.downloadBarcodeImage('${data.sku || ''}', '${(data.name || '').replace(/'/g, "\\'")}')" 
                            class="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95">
                            <i data-lucide="download" class="w-3.5 h-3.5"></i> Download Barcode PNG
                        </button>
                    </div>
                </div>
                <div class="bg-gray-50 p-3 rounded-xl flex justify-between items-center border border-gray-100">
                    <p class="text-[10px] text-gray-500 uppercase font-bold">Category</p>
                    <p class="text-sm font-semibold">${data.category || 'General'}</p>
                </div>
                <div class="bg-gray-50 p-3 rounded-xl flex justify-between items-center border border-gray-100">
                    <p class="text-[10px] text-gray-500 uppercase font-bold">Unit Price</p>
                    <p class="text-sm font-bold text-gray-900">${fmt.currency(data.price)}</p>
                </div>
                <div class="bg-gray-50 p-3 rounded-xl flex justify-between items-center border border-gray-100">
                    <p class="text-[10px] text-gray-500 uppercase font-bold">In Stock</p>
                    ${(data.item_type === 'service' || (data.category && String(data.category).toLowerCase().includes('service')) || (data.unit && String(data.unit).toLowerCase() === 'service')) 
                        ? `<p class="text-sm font-bold text-purple-600">🛠️ Service (Non-physical)</p>`
                        : `<p class="text-sm font-bold ${data.quantity <= data.min_threshold ? 'text-red-600' : 'text-emerald-600'}">${data.quantity} units</p>`
                    }
                </div>
                <div class="bg-gray-50 p-3 rounded-xl flex justify-between items-center border border-gray-100">
                    <p class="text-[10px] text-gray-500 uppercase font-bold">Min Threshold</p>
                    <p class="text-sm font-semibold">${data.min_threshold} units</p>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-2 mt-8">
                <button onclick="openEditModal('editInventoryItem', '${data.id}')" class="flex items-center justify-center gap-2 p-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-colors">
                    <i data-lucide="edit-2" class="w-4 h-4"></i> Edit Product
                </button>
                <button onclick="openModal('restockStock', ${JSON.stringify(data).replace(/"/g, '&quot;')})" class="flex items-center justify-center gap-2 p-2.5 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-colors">
                    <i data-lucide="plus-circle" class="w-4 h-4"></i> Restock Stock
                </button>
                <button onclick="openInventoryTagModal('${data.id}', false)" class="flex items-center justify-center gap-2 p-2.5 bg-amber-50 text-amber-700 rounded-xl font-bold text-xs hover:bg-amber-100 transition-colors">
                    <i data-lucide="tag" class="w-4 h-4"></i> Tags
                </button>
                <button onclick="openRequestModal('inventory', '${data.id}', 'Item: ${data.name} (SKU: ${data.sku || 'N/A'})')" class="flex items-center justify-center gap-2 p-2.5 bg-blue-50 text-blue-700 rounded-xl font-bold text-xs hover:bg-blue-100 transition-colors">
                    <i data-lucide="message-square" class="w-4 h-4"></i> Request Attention
                </button>
                <button onclick="confirmDelete('inventory', '${data.id}', '${data.name}')" class="flex items-center justify-center gap-2 p-2.5 bg-red-50 text-red-700 rounded-xl font-bold text-xs hover:bg-red-100 transition-colors col-span-2">
                    <i data-lucide="trash-2" class="w-4 h-4"></i> Delete Product
                </button>
            </div>
        </div>`;

        case 'expenseDetails': return `
        <div class="p-6">
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-xl font-bold text-gray-900">Expense Details</h3>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="space-y-3">
                <div class="bg-red-50 p-4 rounded-2xl border border-red-100 mb-2">
                    <p class="text-[10px] text-red-600 uppercase font-bold mb-1">Total Amount</p>
                    <p class="text-2xl font-black text-red-700">${fmt.currency(data.amount)}</p>
                </div>
                <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center text-right">
                    <p class="text-[10px] text-gray-500 uppercase font-bold text-left w-1/3">Category</p>
                    <p class="text-sm font-semibold capitalize w-2/3">${data.category}</p>
                </div>
                <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-start text-right">
                    <p class="text-[10px] text-gray-500 uppercase font-bold text-left w-1/3 pt-0.5">Description</p>
                    <p class="text-sm w-2/3">${data.description || 'N/A'}</p>
                </div>
                <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center text-right">
                    <p class="text-[10px] text-gray-500 uppercase font-bold text-left w-1/3">Date recorded</p>
                    <p class="text-xs w-2/3">${new Date(data.created_at).toLocaleDateString()} at ${new Date(data.created_at).toLocaleTimeString()}</p>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-2 mt-8">
                <button onclick="openEditModal('editExpense', '${data.id}')" class="flex items-center justify-center gap-2 p-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-colors">
                    <i data-lucide="edit-2" class="w-4 h-4"></i> Edit
                </button>
                <button onclick="openRequestModal('expense', '${data.id}', 'Expense: ${data.description || 'N/A'} - ${fmt.currency(data.amount)}')" class="flex items-center justify-center gap-2 p-2.5 bg-amber-50 text-amber-700 rounded-xl font-bold text-xs hover:bg-amber-100 transition-colors">
                    <i data-lucide="message-square" class="w-4 h-4"></i> Request
                </button>
                <button onclick="confirmDelete('expense', '${data.id}', '${data.description}')" class="flex items-center justify-center gap-2 p-2.5 bg-red-50 text-red-700 rounded-xl font-bold text-xs hover:bg-red-100 transition-colors">
                    <i data-lucide="trash-2" class="w-4 h-4"></i> Delete
                </button>
            </div>
        </div>`;

        case 'customerDetails': return `
        <div class="p-6">
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-xl font-bold text-gray-900">Customer Profile</h3>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="space-y-3">
                <div class="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center mb-2">
                    <div class="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <i data-lucide="user" class="w-8 h-8"></i>
                    </div>
                    <h4 class="text-lg font-bold text-blue-900 mb-1">${data.name}</h4>
                    <p class="text-xs text-blue-600 font-medium">${data.customer_id || 'ID: ' + data.id.slice(0, 8)}</p>
                </div>
                <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center text-right">
                    <p class="text-[10px] text-gray-500 uppercase font-bold text-left w-1/3">Phone</p>
                    <p class="text-sm font-semibold w-2/3">${data.phone || 'N/A'}</p>
                </div>
                <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center text-right">
                    <p class="text-[10px] text-gray-500 uppercase font-bold text-left w-1/3">Email</p>
                    <p class="text-sm font-semibold truncate w-2/3" title="${data.email || ''}">${data.email || 'N/A'}</p>
                </div>
                <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-start text-right">
                    <p class="text-[10px] text-gray-500 uppercase font-bold text-left w-1/3 pt-0.5">Notes</p>
                    <p class="text-xs font-semibold italic text-gray-400 w-2/3">Integration pending...</p>
                </div>
            </div>
            <div class="grid grid-cols-3 gap-2 mt-8">
                <button onclick="openEditModal('editCustomer', '${data.id}')" class="flex items-center justify-center gap-2 p-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-colors">
                    <i data-lucide="edit-2" class="w-4 h-4"></i> Edit
                </button>
                <button onclick="openRequestModal('customer', '${data.id}', 'Customer: ${data.name}')" class="flex items-center justify-center gap-2 p-2.5 bg-amber-50 text-amber-700 rounded-xl font-bold text-xs hover:bg-amber-100 transition-colors">
                    <i data-lucide="message-square" class="w-4 h-4"></i> Request
                </button>
                <button onclick="confirmDelete('customer', '${data.id}', '${data.name}')" class="flex items-center justify-center gap-2 p-2.5 bg-red-50 text-red-700 rounded-xl font-bold text-xs hover:bg-red-100 transition-colors">
                    <i data-lucide="trash-2" class="w-4 h-4"></i> Remove
                </button>
            </div>
        </div>`;

        case 'noteDetails': return `
        <div class="p-6">
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-xl font-bold text-gray-900">Note Details</h3>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="space-y-3">
                <div class="bg-amber-50 p-4 rounded-2xl border border-amber-100 text-center mb-2">
                    <h4 class="text-lg font-bold text-amber-900 mb-1">${data.title}</h4>
                    <span class="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">${data.tag || 'General'}</span>
                </div>
                <div class="bg-gray-50 p-4 rounded-xl border border-gray-100 min-h-[100px]">
                    <p class="text-[10px] text-gray-500 uppercase font-bold mb-2">Content</p>
                    <p class="text-sm text-gray-700 whitespace-pre-wrap">${data.content}</p>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3 mt-8">
                <button onclick="openEditModal('editNote', '${data.id}')" class="flex items-center justify-center gap-2 p-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-colors">
                    <i data-lucide="edit-2" class="w-4 h-4"></i> Edit Note
                </button>
                <button onclick="confirmDelete('note', '${data.id}', '${data.title}')" class="flex items-center justify-center gap-2 p-2.5 bg-red-50 text-red-700 rounded-xl font-bold text-xs hover:bg-red-100 transition-colors">
                    <i data-lucide="trash-2" class="w-4 h-4"></i> Delete Note
                </button>
            </div>
        </div>`;

        case 'loanDetails': return `
        <div class="p-6">
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-xl font-bold text-gray-900">Transaction Record</h3>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="space-y-3">
                <div class="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 text-center mb-2">
                    <p class="text-[10px] text-emerald-600 uppercase font-bold mb-1">${data.type.replace('_', ' ')}</p>
                    <p class="text-2xl font-black text-emerald-700">${fmt.currency(data.amount)}</p>
                </div>
                <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center text-right">
                    <p class="text-[10px] text-gray-500 uppercase font-bold text-left w-1/3">Party</p>
                    <p class="text-sm font-semibold w-2/3">${data.party || 'Anonymous'}</p>
                </div>
                <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center text-right">
                    <p class="text-[10px] text-gray-500 uppercase font-bold text-left w-1/3">Date</p>
                    <p class="text-sm font-semibold w-2/3">${fmt.date(data.created_at)}</p>
                </div>
                <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-start text-right">
                    <p class="text-[10px] text-gray-500 uppercase font-bold text-left w-1/3 pt-0.5">Notes</p>
                    <p class="text-xs text-gray-600 italic w-2/3">${data.notes || 'No additional notes provided.'}</p>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-3 mt-8">
                <button onclick="openEditModal('editLoan', '${data.id}')" class="flex items-center justify-center gap-2 p-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-colors">
                    <i data-lucide="edit-2" class="w-4 h-4"></i> Edit Record
                </button>
                <button onclick="confirmDelete('loan', '${data.id}', 'this record')" class="flex items-center justify-center gap-2 p-2.5 bg-red-50 text-red-700 rounded-xl font-bold text-xs hover:bg-red-100 transition-colors">
                    <i data-lucide="trash-2" class="w-4 h-4"></i> Delete Record
                </button>
            </div>
        </div>`;

        case 'branchDetails': {
            window._branchDetailsData = data;
            window._branchStagedRestocks = {};
            const items = data._inventory || [];
            const sales = data._sales || [];
            const expenses = data._expenses || [];
            
            const isItemService = (i) => i.is_service || i.item_type === 'service' || (i.category && String(i.category).toLowerCase().includes('service')) || (i.unit && String(i.unit).toLowerCase() === 'service');
            const physicalProducts = items.filter(i => !isItemService(i));
            const services = items.filter(i => isItemService(i));
            const lowStockItems = physicalProducts.filter(i => (Number(i.quantity) || 0) <= (Number(i.min_threshold) || 5));
            
            const totalAssignedStockUnits = physicalProducts.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
            const totalStockValuationCost = physicalProducts.reduce((sum, i) => sum + ((Number(i.quantity) || 0) * (Number(i.buying_price || i.cost_price) || 0)), 0);
            const totalExpectedSalesRevenue = physicalProducts.reduce((sum, i) => sum + ((Number(i.quantity) || 0) * (Number(i.selling_price || i.price) || 0)), 0);
            
            const totalUnitsSold = sales.reduce((sum, s) => {
                const q = parseInt(s.quantity || (s.items?.match(/^(\d+)x/)?.[1] || 1)) || 1;
                return sum + q;
            }, 0);
            const totalSalesRevenue = sales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
            
            const todayStr = new Date().toISOString().split('T')[0];
            const todaySalesList = sales.filter(s => (s.created_at || '').startsWith(todayStr) || (s.date || '').startsWith(todayStr));
            const todaySalesTotal = todaySalesList.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
            const todayExpensesList = expenses.filter(e => (e.created_at || '').startsWith(todayStr) || (e.date || '').startsWith(todayStr));
            const todayExpensesTotal = todayExpensesList.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
            const todayProfit = todaySalesTotal - todayExpensesTotal;
            
            const currencySymbol = (window.fmt && window.fmt.getSymbol) ? window.fmt.getSymbol() : (data.currency || 'TSh');

            return `
        <div class="flex flex-col h-full bg-slate-50/50 dark:bg-gray-900 overflow-hidden">
            <div class="modal-top-nav flex items-center justify-between px-4 sm:px-6 py-2.5 sm:py-3.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-none gap-3">
                <!-- Left Title & Desktop Details Section -->
                <div class="flex items-center gap-3 min-w-0 flex-1">
                    <h3 class="text-base sm:text-lg font-black text-gray-900 dark:text-white flex items-center gap-2 shrink-0">
                        <i data-lucide="building-2" class="w-5 h-5 text-indigo-600 dark:text-indigo-400"></i> ${window.t('branch_details_title', 'Branch Details')}
                    </h3>

                    <!-- Desktop Branch Header Details (hidden on mobile/tablet, visible on desktop lg:flex) -->
                    <div class="hidden lg:flex items-center gap-3 pl-3 border-l border-gray-200 dark:border-gray-800 min-w-0 flex-1 justify-between">
                        <div class="flex items-center gap-2.5 min-w-0 flex-wrap">
                            <div class="flex items-center gap-1.5 shrink-0">
                                <h2 class="text-sm font-black text-gray-900 dark:text-white tracking-tight">${data.name}</h2>
                                <span class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold ${data.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}">
                                    <span class="w-1.5 h-1.5 rounded-full ${data.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}"></span>
                                    ${data.status || 'active'}
                                </span>
                            </div>
                            <span class="text-gray-300 dark:text-gray-700">•</span>
                            <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                                <i data-lucide="map-pin" class="w-3 h-3 text-indigo-500 shrink-0"></i>
                                <span>${data.location || 'No location'}</span>
                            </div>
                            <span class="text-gray-300 dark:text-gray-700">•</span>
                            <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                                <i data-lucide="user-check" class="w-3 h-3 text-indigo-500 shrink-0"></i>
                                <span>Mgr: <strong class="text-gray-900 dark:text-white font-bold">${data.manager || '—'}</strong></span>
                            </div>
                            <span class="text-gray-300 dark:text-gray-700">•</span>
                            <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                                <i data-lucide="target" class="w-3 h-3 text-amber-500 shrink-0"></i>
                                <span>Target: <strong class="text-gray-900 dark:text-white font-bold">${fmt.currency(data.target)}</strong></span>
                            </div>
                            <span class="text-gray-300 dark:text-gray-700">•</span>
                            <div class="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 font-medium">
                                <i data-lucide="coins" class="w-3 h-3 text-blue-500 shrink-0"></i>
                                <span class="uppercase font-bold text-gray-900 dark:text-white">${data.currency || 'TZS'}</span>
                            </div>
                        </div>

                        <!-- Desktop Action Buttons (Stacked Vertically) -->
                        <div class="flex flex-col gap-1 shrink-0 ml-2">
                            <button onclick='openModal("editBranch", ${JSON.stringify(data).replace(/'/g, "&apos;")})' class="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-300 rounded-full font-bold text-[10.5px] transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer">
                                <i data-lucide="settings" class="w-2.5 h-2.5"></i> ${window.t('settings', 'Settings')}
                            </button>
                            <button onclick="if(typeof window.openDownloadReportsModal === 'function') { window.openDownloadReportsModal('${data.id}'); } else { state.branchId = '${data.id}'; openModal('downloadReports'); }" class="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-300 rounded-full font-bold text-[10.5px] transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer">
                                <i data-lucide="file-text" class="w-2.5 h-2.5"></i> ${window.t('reports', 'Reports')}
                            </button>
                        </div>
                    </div>
                </div>

                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors shrink-0">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <!-- Scrollable content area -->
            <div class="flex-1 overflow-y-auto px-3 sm:px-6 py-3.5 sm:py-4 w-full space-y-3.5 scroller-custom">
                <!-- Mobile / Tablet Top Branch Profile Header Card (hidden on desktop lg:hidden) -->
                <div class="lg:hidden bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700/80 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 shadow-2xs flex items-center justify-between gap-2.5">
                    <!-- Left Content Column -->
                    <div class="space-y-1 min-w-0 flex-1">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <h2 class="text-xs sm:text-base font-black text-gray-900 dark:text-white tracking-tight break-words">${data.name}</h2>
                            <span class="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[8.5px] sm:text-[9.5px] font-bold ${data.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}">
                                <span class="w-1.5 h-1.5 rounded-full ${data.status === 'active' ? 'bg-emerald-500' : 'bg-gray-400'}"></span>
                                <span class="lowercase">${data.status || 'active'}</span>
                            </span>
                        </div>
                        <div class="flex items-center gap-1.5 sm:gap-2.5 flex-wrap text-[9.5px] sm:text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-tight">
                            <div class="flex items-center gap-1">
                                <i data-lucide="map-pin" class="w-2.5 h-2.5 text-indigo-500 shrink-0"></i>
                                <span class="truncate max-w-[110px] sm:max-w-none">${data.location || 'No location'}</span>
                            </div>
                            <span class="text-gray-300 dark:text-gray-600">•</span>
                            <div class="flex items-center gap-1">
                                <i data-lucide="user-check" class="w-2.5 h-2.5 text-indigo-500 shrink-0"></i>
                                <span>Mgr: <strong class="text-gray-900 dark:text-white font-bold">${data.manager || '—'}</strong></span>
                            </div>
                        </div>
                        <div class="flex items-center gap-1.5 sm:gap-2.5 flex-wrap text-[9.5px] sm:text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-tight">
                            <div class="flex items-center gap-1">
                                <i data-lucide="target" class="w-2.5 h-2.5 text-amber-500 shrink-0"></i>
                                <span>Target: <strong class="text-gray-900 dark:text-white font-bold">${fmt.currency(data.target)}</strong></span>
                            </div>
                            <span class="text-gray-300 dark:text-gray-600">•</span>
                            <div class="flex items-center gap-1">
                                <i data-lucide="coins" class="w-2.5 h-2.5 text-blue-500 shrink-0"></i>
                                <span class="uppercase font-bold text-gray-900 dark:text-white">${data.currency || 'TZS'}</span>
                            </div>
                        </div>
                    </div>

                    <!-- Right Stacked Action Buttons Column -->
                    <div class="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-1.5 shrink-0">
                        <button onclick='openModal("editBranch", ${JSON.stringify(data).replace(/'/g, "&apos;")})' class="px-2.5 py-0.8 sm:py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 dark:text-indigo-300 rounded-full font-bold text-[9.5px] sm:text-xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer">
                            <i data-lucide="settings" class="w-2.5 h-2.5 sm:w-3 sm:h-3"></i> ${window.t('settings', 'Settings')}
                        </button>
                        <button onclick="if(typeof window.openDownloadReportsModal === 'function') { window.openDownloadReportsModal('${data.id}'); } else { state.branchId = '${data.id}'; openModal('downloadReports'); }" class="px-2.5 py-0.8 sm:py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/50 dark:text-emerald-300 rounded-full font-bold text-[9.5px] sm:text-xs transition-all active:scale-95 flex items-center gap-1 cursor-pointer">
                            <i data-lucide="file-text" class="w-2.5 h-2.5 sm:w-3 sm:h-3"></i> ${window.t('reports', 'Reports')}
                        </button>
                    </div>
                </div>

                <!-- Executive KPI Bento Grid: 6 Core Performance & Stock Metrics (3 columns on mid devices & desktop) -->
                <div class="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-3.5">
                    <!-- 1. See all stock assigned to that branch -->
                    <div onclick="window.setBranchDetailsTab('all')" class="relative bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col justify-between h-full stat-card min-w-0 cursor-pointer active:scale-[0.99] transition-all">
                        <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-2xs z-10">Stock</div>
                        <div class="text-gray-500 dark:text-gray-400 mb-1 pr-1 sm:pr-2 min-w-0">
                            <span class="text-[11px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-wider block whitespace-normal break-words leading-tight">Assigned Stock</span>
                        </div>
                        <p id="branchDetailsStatAssigned" class="text-dynamic-lg font-black text-gray-900 dark:text-white leading-tight my-1 pr-1 sm:pr-2">${physicalProducts.length} Items <span class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">(${totalAssignedStockUnits} Units)</span></p>
                        <p class="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 leading-tight mt-auto pr-6 truncate">Physical inventory at branch</p>
                        <div class="absolute bottom-1 right-1 w-4.5 h-4.5 rounded-[6px] bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-2xs">
                            <i data-lucide="package" class="w-2.5 h-2.5"></i>
                        </div>
                    </div>

                    <!-- 2. Stock Value -->
                    <div class="relative bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col justify-between h-full stat-card min-w-0">
                        <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shadow-2xs z-10">${currencySymbol}</div>
                        <div class="text-gray-500 dark:text-gray-400 mb-1 pr-1 sm:pr-2 min-w-0">
                            <span class="text-[11px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-wider block whitespace-normal break-words leading-tight">Stock Cost Valuation</span>
                        </div>
                        <p id="branchDetailsStatValuation" class="text-dynamic-lg font-black text-amber-600 dark:text-amber-400 leading-tight my-1 pr-1 sm:pr-2" title="${window.fmt.currency(totalStockValuationCost)}">${window.fmt.number(totalStockValuationCost)}</p>
                        <p class="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 leading-tight mt-auto pr-6 truncate">Est. Sales: ${window.fmt.currency(totalExpectedSalesRevenue)}</p>
                        <div class="absolute bottom-1 right-1 w-4.5 h-4.5 rounded-[6px] bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-2xs">
                            <i data-lucide="dollar-sign" class="w-2.5 h-2.5"></i>
                        </div>
                    </div>

                    <!-- 3. How many sold -->
                    <div class="relative bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col justify-between h-full stat-card min-w-0">
                        <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs z-10">Sales</div>
                        <div class="text-gray-500 dark:text-gray-400 mb-1 pr-1 sm:pr-2 min-w-0">
                            <span class="text-[11px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-wider block whitespace-normal break-words leading-tight">Units Sold</span>
                        </div>
                        <p class="text-dynamic-lg font-black text-emerald-600 dark:text-emerald-400 leading-tight my-1 pr-1 sm:pr-2">${totalUnitsSold} Units <span class="text-[11px] font-medium text-gray-500 dark:text-gray-400">(${sales.length} txns)</span></p>
                        <p class="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 leading-tight mt-auto pr-6 truncate">Total Revenue: ${window.fmt.currency(totalSalesRevenue)}</p>
                        <div class="absolute bottom-1 right-1 w-4.5 h-4.5 rounded-[6px] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-2xs">
                            <i data-lucide="shopping-cart" class="w-2.5 h-2.5"></i>
                        </div>
                    </div>

                    <!-- 4. Services offered so far -->
                    <div onclick="window.setBranchDetailsTab('services')" class="relative bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col justify-between h-full stat-card min-w-0 cursor-pointer active:scale-[0.99] transition-all">
                        <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 shadow-2xs z-10">Services</div>
                        <div class="text-gray-500 dark:text-gray-400 mb-1 pr-1 sm:pr-2 min-w-0">
                            <span class="text-[11px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-wider block whitespace-normal break-words leading-tight">Services Offered</span>
                        </div>
                        <p class="text-dynamic-lg font-black text-purple-600 dark:text-purple-400 leading-tight my-1 pr-1 sm:pr-2">${services.length} Active Services</p>
                        <p class="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 leading-tight mt-auto pr-6 truncate">${services.length > 0 ? 'Service catalog active' : 'No services configured'}</p>
                        <div class="absolute bottom-1 right-1 w-4.5 h-4.5 rounded-[6px] bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center shadow-2xs">
                            <i data-lucide="sparkles" class="w-2.5 h-2.5"></i>
                        </div>
                    </div>

                    <!-- 5. How many on low stock -->
                    <div onclick="window.setBranchDetailsTab('low')" class="relative bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col justify-between h-full stat-card min-w-0 cursor-pointer active:scale-[0.99] transition-all">
                        <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 shadow-2xs z-10">Alert</div>
                        <div class="text-gray-500 dark:text-gray-400 mb-1 pr-1 sm:pr-2 min-w-0">
                            <span class="text-[11px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-wider block whitespace-normal break-words leading-tight">Low Stock Alerts</span>
                        </div>
                        <p id="branchDetailsStatLowStock" class="text-dynamic-lg font-black text-rose-600 dark:text-rose-400 leading-tight my-1 pr-1 sm:pr-2">${lowStockItems.length} Items Low</p>
                        <p class="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 leading-tight mt-auto pr-6 truncate">${lowStockItems.length > 0 ? 'Replenishment needed' : 'All stock levels healthy'}</p>
                        <div class="absolute bottom-1 right-1 w-4.5 h-4.5 rounded-[6px] bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-2xs">
                            <i data-lucide="alert-triangle" class="w-2.5 h-2.5"></i>
                        </div>
                    </div>

                    <!-- 6. Daily operations in terms of expenses, profit, sales -->
                    <div onclick="window.setBranchDetailsTab('daily')" class="relative bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-3 sm:p-4 shadow-xs flex flex-col justify-between h-full stat-card min-w-0 cursor-pointer active:scale-[0.99] transition-all">
                        <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shadow-2xs z-10">Today</div>
                        <div class="text-gray-500 dark:text-gray-400 mb-1 pr-1 sm:pr-2 min-w-0">
                            <span class="text-[11px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-wider block whitespace-normal break-words leading-tight">Today Operations</span>
                        </div>
                        <p class="text-dynamic-lg font-black text-gray-900 dark:text-white leading-tight my-1 pr-1 sm:pr-2">${window.fmt.currency(todaySalesTotal)}</p>
                        <p class="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 leading-tight mt-auto pr-6 truncate">Exp: ${window.fmt.currency(todayExpensesTotal)} • Profit: ${window.fmt.currency(todayProfit)}</p>
                        <div class="absolute bottom-1 right-1 w-4.5 h-4.5 rounded-[6px] bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs">
                            <i data-lucide="activity" class="w-2.5 h-2.5"></i>
                        </div>
                    </div>
                </div>

                <!-- 7. Interactive Sub-Navigation Tabs & Live Search -->
                <div class="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-3">
                    <div class="flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                        <!-- Sub Tabs -->
                        <div class="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scroller-custom">
                            <button id="branchDetailsTabBtnAll" onclick="window.setBranchDetailsTab('all')" data-tab="all" class="branch-details-tab-btn px-3 py-1.5 rounded-full text-xs font-bold transition-all bg-indigo-600 text-white shadow-xs shrink-0 cursor-pointer">
                                All Stock (${physicalProducts.length})
                            </button>
                            <button id="branchDetailsTabBtnLow" onclick="window.setBranchDetailsTab('low')" data-tab="low" class="branch-details-tab-btn px-3 py-1.5 rounded-full text-xs font-bold transition-all bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 shrink-0 cursor-pointer">
                                Low Stock (${lowStockItems.length})
                            </button>
                            <button onclick="window.setBranchDetailsTab('services')" data-tab="services" class="branch-details-tab-btn px-3 py-1.5 rounded-full text-xs font-bold transition-all bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 shrink-0 cursor-pointer">
                                Services (${services.length})
                            </button>
                            <button onclick="window.setBranchDetailsTab('daily')" data-tab="daily" class="branch-details-tab-btn px-3 py-1.5 rounded-full text-xs font-bold transition-all bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 shrink-0 cursor-pointer">
                                Daily Ledger (${todaySalesList.length + todayExpensesList.length})
                            </button>
                        </div>

                        <!-- Live Search Input -->
                        <div class="relative w-full md:w-64">
                            <i data-lucide="search" class="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input type="text" oninput="window.onBranchDetailsSearch(this.value)" placeholder="Search branch items / SKU..." class="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-full text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500">
                        </div>
                    </div>

                    <!-- Dynamic Stock Table & Cards Container (Limited to 3 rows with internal scroll) -->
                    <div id="branchDetailsTableContainer" class="pt-1 max-h-[385px] overflow-y-auto scroller-custom pr-1">
                        <!-- Rendered by window.renderBranchDetailsTable() -->
                    </div>
                </div>
            </div>

            <!-- Instant Failsafe Script Loader to render Table immediately -->
            <img src="data:image/svg+xml;utf8,<svg></svg>" onerror="window.renderBranchDetailsTable &amp;&amp; window.renderBranchDetailsTable()" class="hidden" />

            <!-- Fixed Bottom Navigation Bar for Action Buttons -->
            <div class="modal-bottom-nav flex-none p-3.5 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center gap-3 z-20">
                <button onclick='openBranchPreferencesModal(${JSON.stringify(data).replace(/'/g, "&apos;")})' class="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white rounded-2xl font-extrabold text-xs sm:text-sm shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer">
                    <i data-lucide="sliders-horizontal" class="w-4 h-4"></i> ${window.t('allowlist', 'Allowlist')}
                </button>
                <button id="branchDetailsRestockAllBtn" onclick="window.applyBranchDetailsRestockAll()" class="hidden flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white rounded-2xl font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer">
                    <i data-lucide="package-plus" class="w-4 h-4"></i> Restock All (<span id="branchDetailsRestockCount">0</span>)
                </button>
                <button onclick="deleteBranchRow('${data.id}', '${data.name}')" class="flex-1 py-3 px-4 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white rounded-2xl font-extrabold text-xs sm:text-sm shadow-md shadow-rose-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer">
                    <i data-lucide="trash-2" class="w-4 h-4"></i> Delete Branch
                </button>
            </div>
        </div>`;
        }

        case 'branchPreferences': {
            const prefs = data.preferences || {};
            const ACTIONS = [
                {
                    key: 'inventory_add',
                    label: 'Add New Stock',
                    desc: 'Branch can add new inventory items directly without approval',
                    icon: 'package-plus',
                    color: 'indigo'
                },
                {
                    key: 'inventory_update',
                    label: 'Restock Items',
                    desc: 'Branch can restock / increase quantities directly without approval',
                    icon: 'refresh-ccw',
                    color: 'violet'
                },
                {
                    key: 'expenses_add',
                    label: 'Add Expenses',
                    desc: 'Branch can record expenses without requiring approval',
                    icon: 'receipt',
                    color: 'rose'
                },
                {
                    key: 'sales_add',
                    label: 'Record Sales',
                    desc: 'Branch can record sales directly (default: allowed)',
                    icon: 'shopping-cart',
                    color: 'emerald'
                },
                {
                    key: 'customers_add',
                    label: 'Add Customers',
                    desc: 'Branch can add new customers directly',
                    icon: 'user-plus',
                    color: 'cyan'
                }
            ];

            const colorMap = {
                indigo: { on: 'bg-indigo-600', ring: 'ring-indigo-300', badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300', iconColor: 'text-indigo-500' },
                violet: { on: 'bg-violet-600', ring: 'ring-violet-300', badge: 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300', iconColor: 'text-violet-500' },
                rose: { on: 'bg-rose-600', ring: 'ring-rose-300', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300', iconColor: 'text-rose-500' },
                emerald: { on: 'bg-emerald-600', ring: 'ring-emerald-300', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300', iconColor: 'text-emerald-500' },
                cyan: { on: 'bg-cyan-600', ring: 'ring-cyan-300', badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300', iconColor: 'text-cyan-500' }
            };

            return `
            <div class="flex flex-col h-full bg-slate-50/50 dark:bg-gray-900 overflow-hidden">
                <div class="modal-top-nav flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-none">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 rounded-xl flex items-center justify-center">
                            <i data-lucide="sliders-horizontal" class="w-5 h-5"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-black text-gray-900 dark:text-white">${window.t('allowlist', 'Allowlist')}</h3>
                            <p class="text-xs text-gray-400 font-bold uppercase tracking-widest">${data.name}</p>
                        </div>
                    </div>
                    <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>

                <!-- Scrollable Content Area -->
                <div class="flex-1 overflow-y-auto p-4 sm:p-6 max-w-5xl mx-auto w-full space-y-4">
                    <div class="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
                        <i data-lucide="info" class="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5"></i>
                        <p class="text-xs sm:text-sm text-amber-900 dark:text-amber-200 font-medium leading-relaxed">
                            Toggle which actions this branch can perform <strong>directly</strong> without requiring admin approval. Off = requires approval (default).
                        </p>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3" id="prefActionList">
                        ${ACTIONS.map(act => {
                const isOn = prefs[act.key] === true;
                const c = colorMap[act.color];
                return `
                            <div class="flex items-center justify-between p-4 sm:p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs hover:shadow-md transition-shadow gap-3" id="pref-row-${act.key}">
                                <div class="min-w-0 flex-1">
                                    <p class="text-sm font-bold text-gray-900 dark:text-white leading-tight mb-1 flex items-center gap-2">
                                        <i data-lucide="${act.icon}" class="w-4 h-4 ${c.iconColor} flex-shrink-0"></i>
                                        <span>${act.label}</span>
                                    </p>
                                    <p class="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed">${act.desc}</p>
                                </div>
                                <div class="flex flex-col items-end gap-1.5 flex-shrink-0 ml-2">
                                    <span class="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${isOn ? c.badge : 'bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-400'}" id="pref-badge-${act.key}">
                                        ${isOn ? 'Allowed' : 'Approval'}
                                    </span>
                                    <button
                                        type="button"
                                        id="pref-toggle-${act.key}"
                                        data-key="${act.key}"
                                        data-on="${isOn ? '1' : '0'}"
                                        data-color-on="${c.on}"
                                        data-color-badge-on="${c.badge}"
                                        onclick="toggleBranchPrefUI(this)"
                                        class="relative w-12 h-6 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 cursor-pointer ${isOn ? c.on + ' ' + c.ring : 'bg-gray-200 dark:bg-gray-700'}"
                                        aria-checked="${isOn}"
                                    >
                                        <span class="absolute top-1 transition-all duration-200 w-4 h-4 bg-white rounded-full shadow-sm ${isOn ? 'left-7' : 'left-1'}"></span>
                                    </button>
                                </div>
                            </div>`;
            }).join('')}
                    </div>
                </div>

                <!-- Fixed Bottom Navigation Bar for Action Buttons -->
                <div class="modal-bottom-nav flex-none p-3.5 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center gap-3 z-20">
                    <button type="button" onclick="closeModal()" class="flex-1 py-3 px-4 rounded-2xl font-extrabold text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-all cursor-pointer">
                        ${window.t('btn_cancel', 'Cancel')}
                    </button>
                    <button type="button" onclick="handleSaveBranchPreferences('${data.id}')" class="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-white rounded-2xl font-extrabold text-xs sm:text-sm shadow-lg shadow-amber-500/20 transition-all cursor-pointer">
                        ${window.t('save_preferences', 'Save Preferences')}
                    </button>
                </div>
            </div>`;
        }

        case 'addStaff': return `
        <form onsubmit="handleAddStaff(event)" class="flex flex-col h-full min-h-0 overflow-hidden">
            <!-- TOP NAV / HEADER -->
            <div class="modal-top-nav flex-none p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center gap-3.5 justify-start z-20">
                <button type="button" onclick="closeModal()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i>
                    <span>${window.t('back', 'Back')}</span>
                </button>
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <i data-lucide="user-plus" class="w-5 h-5"></i>
                    </div>
                    <div class="min-w-0">
                        <h3 class="text-base font-black text-gray-900 dark:text-white truncate">Add New Staff</h3>
                        <p class="text-[11px] font-bold text-gray-500 truncate">Register a new employee for this branch</p>
                    </div>
                </div>
            </div>

            <!-- MAIN CONTENTS (SCROLLABLE AREA) -->
            <div class="modal-main-content flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4">
                <div>
                    <label for="staffName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                    <input type="text" id="staffName" required class="form-input" placeholder="Enter full name">
                </div>
                <div>
                    <label for="staffRole" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role/Position</label>
                    <input type="text" id="staffRole" required class="form-input" placeholder="e.g. Sales Associate">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="staffPhone" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                        <input type="tel" id="staffPhone" class="form-input" placeholder="+123456789">
                    </div>
                    <div>
                        <label for="staffEmail" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input type="email" id="staffEmail" class="form-input" placeholder="staff@example.com">
                    </div>
                </div>
                <div>
                    <label for="staffSalary" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Base Salary</label>
                    <input type="text" inputmode="decimal" id="staffSalary" class="form-input number-format" placeholder="0.00">
                </div>
            </div>

            <!-- BOTTOM NAV / FOOTER -->
            <div class="modal-bottom-nav flex-none p-4 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center gap-3 z-20">
                <button type="button" onclick="closeModal()" class="px-5 py-2.5 rounded-xl font-bold text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border-none">
                    Cancel
                </button>
                <button type="submit" class="px-6 py-2.5 rounded-xl font-black text-xs btn-primary text-white shadow-md transition-all">
                    Add Staff
                </button>
            </div>
        </form>`;

        case 'editStaff': return `
        <form onsubmit="handleEditStaff(event, '${data.id}')" class="flex flex-col h-full min-h-0 overflow-hidden">
            <!-- TOP NAV / HEADER -->
            <div class="modal-top-nav flex-none p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center gap-3.5 justify-start z-20">
                <button type="button" onclick="closeModal()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i>
                    <span>${window.t('back', 'Back')}</span>
                </button>
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <i data-lucide="user" class="w-5 h-5"></i>
                    </div>
                    <div class="min-w-0">
                        <h3 class="text-base font-black text-gray-900 dark:text-white truncate">Edit Staff</h3>
                        <p class="text-[11px] font-bold text-gray-500 truncate">${data.name || ''}</p>
                    </div>
                </div>
            </div>

            <!-- MAIN CONTENTS (SCROLLABLE AREA) -->
            <div class="modal-main-content flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4">
                <div>
                    <label for="editStaffName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                    <input type="text" id="editStaffName" value="${data.name || ''}" required class="form-input">
                </div>
                <div>
                    <label for="editStaffRole" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role/Position</label>
                    <input type="text" id="editStaffRole" value="${data.role || ''}" required class="form-input">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="editStaffPhone" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                        <input type="tel" id="editStaffPhone" value="${data.phone || ''}" class="form-input">
                    </div>
                    <div>
                        <label for="editStaffEmail" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input type="email" id="editStaffEmail" value="${data.email || ''}" class="form-input">
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="editStaffSalary" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Base Salary</label>
                        <input type="text" inputmode="decimal" id="editStaffSalary" value="${data.salary || 0}" class="form-input number-format">
                    </div>
                    <div>
                        <label for="editStaffStatus" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                        ${window.renderPremiumSelect({
            id: 'editStaffStatus',
            selectedValue: data.status,
            options: [
                { value: 'active', label: 'Active', icon: 'check-circle' },
                { value: 'inactive', label: 'Inactive', icon: 'x-circle' }
            ]
        })}
                    </div>
                </div>
            </div>

            <!-- BOTTOM NAV / FOOTER -->
            <div class="modal-bottom-nav flex-none p-4 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center gap-3 z-20">
                <button type="button" onclick="closeModal()" class="px-5 py-2.5 rounded-xl font-bold text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border-none">
                    Cancel
                </button>
                <button type="submit" class="px-6 py-2.5 rounded-xl font-black text-xs btn-primary text-white shadow-md transition-all">
                    Update Staff
                </button>
            </div>
        </form>`;

        case 'markAttendance': return `
        <form onsubmit="handleMarkAttendance(event)" class="flex flex-col h-full min-h-0 overflow-hidden">
            <!-- TOP NAV / HEADER -->
            <div class="modal-top-nav flex-none p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center gap-3.5 justify-start z-20">
                <button type="button" onclick="closeModal()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i>
                    <span>${window.t('back', 'Back')}</span>
                </button>
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <i data-lucide="calendar-check" class="w-5 h-5"></i>
                    </div>
                    <div class="min-w-0">
                        <h3 class="text-base font-black text-gray-900 dark:text-white truncate">Mark Attendance</h3>
                        <p class="text-[11px] font-bold text-gray-500 truncate">Record staff daily attendance status</p>
                    </div>
                </div>
            </div>

            <!-- MAIN CONTENTS (SCROLLABLE AREA) -->
            <div class="modal-main-content flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4">
                <div>
                    <label for="attDate" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                    ${window.renderPremiumDatePicker({
                        id: 'attDate',
                        selectedValue: new Date().toISOString().split('T')[0],
                        max: new Date().toISOString().split('T')[0],
                        required: true,
                        classes: 'w-full'
                    })}
                </div>
                <div>
                    <label for="attStaffId" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Staff</label>
                    ${window.renderPremiumSelect({
            id: 'attStaffId',
            selectedValue: '',
            placeholder: 'Select Staff Member',
            options: window._currentStaffList ? window._currentStaffList.map(s => ({ value: s.id, label: `${s.name} - ${s.role}`, icon: 'user' })) : []
        })}
                </div>
                <div>
                    <label for="attStatus" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                    ${window.renderPremiumSelect({
            id: 'attStatus',
            selectedValue: 'present',
            options: [
                { value: 'present', label: 'Present', icon: 'check' },
                { value: 'absent', label: 'Absent', icon: 'x' },
                { value: 'leave', label: 'On Leave', icon: 'palmtree' },
                { value: 'half-day', label: 'Half Day', icon: 'clock' }
            ]
        })}
                </div>
                <div>
                    <label for="attNotes" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes (Optional)</label>
                    <input type="text" id="attNotes" class="form-input" placeholder="e.g. Arrived late">
                </div>
            </div>

            <!-- BOTTOM NAV / FOOTER -->
            <div class="modal-bottom-nav flex-none p-4 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center gap-3 z-20">
                <button type="button" onclick="closeModal()" class="px-5 py-2.5 rounded-xl font-bold text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border-none">
                    Cancel
                </button>
                <button type="submit" class="px-6 py-2.5 rounded-xl font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all">
                    Save Attendance
                </button>
            </div>
        </form>`;

        case 'addSupplier': return `
        <form onsubmit="handleAddSupplier(event)" class="flex flex-col h-full min-h-0 overflow-hidden">
            <!-- TOP NAV / HEADER -->
            <div class="modal-top-nav flex-none p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center gap-3.5 justify-start z-20">
                <button type="button" onclick="closeModal()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i>
                    <span>${window.t('back', 'Back')}</span>
                </button>
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                        <i data-lucide="factory" class="w-5 h-5"></i>
                    </div>
                    <div class="min-w-0">
                        <h3 class="text-base font-black text-gray-900 dark:text-white truncate">Add Supplier</h3>
                        <p class="text-[11px] font-bold text-gray-500 truncate">Register vendor or supplier details</p>
                    </div>
                </div>
            </div>

            <!-- MAIN CONTENTS (SCROLLABLE AREA) -->
            <div class="modal-main-content flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4">
                <div>
                    <label for="supplierName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company/Supplier Name</label>
                    <input type="text" id="supplierName" required class="form-input">
                </div>
                <div>
                    <label for="supplierContactPerson" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Person</label>
                    <input type="text" id="supplierContactPerson" class="form-input">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="supplierPhone" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                        <input type="text" id="supplierPhone" class="form-input">
                    </div>
                    <div>
                        <label for="supplierEmail" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input type="email" id="supplierEmail" class="form-input">
                    </div>
                </div>
                <div>
                    <label for="supplierAddress" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address/Notes</label>
                    <textarea id="supplierAddress" class="form-input" rows="2"></textarea>
                </div>
            </div>

            <!-- BOTTOM NAV / FOOTER -->
            <div class="modal-bottom-nav flex-none p-4 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center gap-3 z-20">
                <button type="button" onclick="closeModal()" class="px-5 py-2.5 rounded-xl font-bold text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border-none">
                    Cancel
                </button>
                <button type="submit" class="px-6 py-2.5 rounded-xl font-black text-xs btn-primary text-white shadow-md transition-all">
                    Save Supplier
                </button>
            </div>
        </form>`;

        case 'editSupplier': return `
        <form onsubmit="handleEditSupplier(event, '${data.id}')" class="flex flex-col h-full min-h-0 overflow-hidden">
            <!-- TOP NAV / HEADER -->
            <div class="modal-top-nav flex-none p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center gap-3.5 justify-start z-20">
                <button type="button" onclick="closeModal()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i>
                    <span>${window.t('back', 'Back')}</span>
                </button>
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                        <i data-lucide="factory" class="w-5 h-5"></i>
                    </div>
                    <div class="min-w-0">
                        <h3 class="text-base font-black text-gray-900 dark:text-white truncate">Edit Supplier</h3>
                        <p class="text-[11px] font-bold text-gray-500 truncate">${data.name || ''}</p>
                    </div>
                </div>
            </div>

            <!-- MAIN CONTENTS (SCROLLABLE AREA) -->
            <div class="modal-main-content flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4">
                <div>
                    <label for="editSupplierName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Company/Supplier Name</label>
                    <input type="text" id="editSupplierName" value="${data.name || ''}" required class="form-input">
                </div>
                <div>
                    <label for="editSupplierContactPerson" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Person</label>
                    <input type="text" id="editSupplierContactPerson" value="${data.contact_person || ''}" class="form-input">
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="editSupplierPhone" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                        <input type="text" id="editSupplierPhone" value="${data.phone || ''}" class="form-input">
                    </div>
                    <div>
                        <label for="editSupplierEmail" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                        <input type="email" id="editSupplierEmail" value="${data.email || ''}" class="form-input">
                    </div>
                </div>
                <div>
                    <label for="editSupplierAddress" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address/Notes</label>
                    <textarea id="editSupplierAddress" class="form-input" rows="2">${data.address || ''}</textarea>
                </div>
                <div class="pt-2">
                     <label for="editSupplierStatus" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                     ${window.renderPremiumSelect({
            id: 'editSupplierStatus',
            selectedValue: data.status !== 'inactive' ? 'active' : 'inactive',
            options: [
                { value: 'active', label: 'Active', icon: 'check-circle' },
                { value: 'inactive', label: 'Inactive', icon: 'x-circle' }
            ]
        })}
                </div>
            </div>

            <!-- BOTTOM NAV / FOOTER -->
            <div class="modal-bottom-nav flex-none p-4 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center gap-3 z-20">
                <button type="button" onclick="closeModal()" class="px-5 py-2.5 rounded-xl font-bold text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border-none">
                    Cancel
                </button>
                <button type="submit" class="px-6 py-2.5 rounded-xl font-black text-xs btn-primary text-white shadow-md transition-all">
                    Save Changes
                </button>
            </div>
        </form>`;

        case 'addPO': return `
        <form onsubmit="handleCreatePO(event)" class="flex flex-col h-full min-h-0 overflow-hidden">
            <!-- TOP NAV / HEADER -->
            <div class="modal-top-nav flex-none p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center gap-3.5 justify-start z-20">
                <button type="button" onclick="closeModal()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i>
                    <span>${window.t('back', 'Back')}</span>
                </button>
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <i data-lucide="file-plus" class="w-5 h-5"></i>
                    </div>
                    <div class="min-w-0">
                        <h3 class="text-base font-black text-gray-900 dark:text-white truncate">Create Purchase Order</h3>
                        <p class="text-[11px] font-bold text-gray-500 truncate">Generate official purchase order to vendor</p>
                    </div>
                </div>
            </div>

            <!-- MAIN CONTENTS (SCROLLABLE AREA) -->
            <div class="modal-main-content flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4">
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="poSupplierId" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supplier</label>
                        ${window.renderPremiumSelect({
            id: 'poSupplierId',
            selectedValue: '',
            placeholder: 'Select a supplier',
            options: window._currentSuppliersList ? window._currentSuppliersList.map(s => ({ value: s.id, label: s.name, icon: 'factory' })) : []
        })}
                    </div>
                    <div>
                        <label for="poExpectedDate" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expected Date</label>
                        ${window.renderPremiumDatePicker({
                            id: 'poExpectedDate',
                            selectedValue: '',
                            placeholder: 'Expected Date',
                            classes: 'w-full'
                        })}
                    </div>
                </div>
                <div>
                    <div class="flex justify-between items-center mb-1">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Line Items</label>
                        <button type="button" onclick="window.addPoItemRow()" class="text-xs text-indigo-600 font-bold hover:underline">
                            + Add Item
                        </button>
                    </div>
                    <div id="poItemsContainer" class="space-y-2 max-h-48 overflow-y-auto p-1">
                        <!-- Items injected here -->
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Expected Amount</label>
                    <input type="text" id="poTotalAmountDisplay" readonly class="form-input bg-gray-50 dark:bg-gray-800 font-bold text-gray-600 dark:text-gray-300" value="${fmt.currency(0)}">
                    <input type="hidden" id="poTotalAmountVal" value="0">
                </div>
            </div>

            <!-- BOTTOM NAV / FOOTER -->
            <div class="modal-bottom-nav flex-none p-4 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center gap-3 z-20">
                <button type="button" onclick="closeModal()" class="px-5 py-2.5 rounded-xl font-bold text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border-none">
                    Cancel
                </button>
                <button type="submit" class="px-6 py-2.5 rounded-xl font-black text-xs btn-primary bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all">
                    Create & Save PO
                </button>
            </div>
        </form>
        <script>
            if(window.initPoModal) window.initPoModal();
        </script>
        `;

        case 'viewPO': return `
        <div class="p-6">
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h3 class="text-xl font-bold text-gray-900">Purchase Order Details</h3>
                    <p class="text-sm font-bold text-indigo-600">${data.po_number}</p>
                </div>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>
            <div class="space-y-3 mb-6">
                <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center">
                    <p class="text-[10px] text-gray-500 uppercase font-bold">Supplier</p>
                    <p class="text-sm font-semibold">${data.supplier_name}</p>
                </div>
                <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center">
                    <p class="text-[10px] text-gray-500 uppercase font-bold">Total Amount</p>
                    <p class="text-sm font-black text-emerald-600">${fmt.currency(data.total_amount)}</p>
                </div>
                <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-center">
                    <p class="text-[10px] text-gray-500 uppercase font-bold">Status</p>
                    <p class="text-sm font-bold uppercase ${data.status === 'received' ? 'text-emerald-500' : 'text-amber-500'}">${data.status}</p>
                </div>
            </div>

            <h4 class="text-xs font-bold text-gray-500 uppercase mb-2">Line Items</h4>
            <div class="space-y-2 max-h-48 overflow-y-auto mb-6">
                ${data.items && data.items.length > 0 ? data.items.map(item => `
                    <div class="p-3 border border-gray-100 rounded-lg flex justify-between items-center bg-gray-50">
                        <div>
                            <p class="font-bold text-sm">${item.item_name}</p>
                            <p class="text-xs text-gray-500">${item.quantity} units @ ${fmt.currency(item.unit_price)}</p>
                        </div>
                        <p class="font-black text-gray-700">${fmt.currency(item.quantity * item.unit_price)}</p>
                    </div>
                `).join('') : '<p class="text-sm text-gray-500">No items on this PO.</p>'}
            </div>

            <div class="grid grid-cols-2 gap-2 mt-4">
                <button onclick="updatePOStatus('${data.id}', 'pending')" class="p-2.5 bg-amber-50 text-amber-700 rounded-xl font-bold text-xs hover:bg-amber-100 transition-colors">Mark Pending</button>
                <button onclick="updatePOStatus('${data.id}', 'approved')" class="p-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-colors">Mark Approved</button>
                <button onclick="updatePOStatus('${data.id}', 'received')" class="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-xs hover:bg-emerald-100 transition-colors">Mark Received</button>
                <button onclick="updatePOStatus('${data.id}', 'cancelled')" class="p-2.5 bg-red-50 text-red-700 rounded-xl font-bold text-xs hover:bg-red-100 transition-colors">Cancel PO</button>
            </div>
        </div>`;

        case 'createQuotation': return `
        <form onsubmit="handleCreateQuotation(event)" class="flex flex-col h-full min-h-0 overflow-hidden">
            <!-- TOP NAV / HEADER -->
            <div class="modal-top-nav flex-none p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center gap-3.5 justify-start z-20">
                <button type="button" onclick="closeModal()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i>
                    <span>${window.t('back', 'Back')}</span>
                </button>
                <div class="flex items-center gap-3 min-w-0">
                    <div class="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <i data-lucide="file-spreadsheet" class="w-5 h-5"></i>
                    </div>
                    <div class="min-w-0">
                        <h3 class="text-base font-black text-gray-900 dark:text-white truncate">Create Quotation</h3>
                        <p class="text-[11px] font-bold text-gray-500 truncate">Generate customer price quote</p>
                    </div>
                </div>
            </div>

            <!-- MAIN CONTENTS (SCROLLABLE AREA) -->
            <div class="modal-main-content flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4">
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label for="quoteCustomerId" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer (Optional)</label>
                        ${window.renderPremiumSelect({
            id: 'quoteCustomerId',
            selectedValue: '',
            placeholder: 'Walk-in Customer',
            options: [
                { value: '', label: 'Walk-in Customer', icon: 'user' },
                ...(window._currentCustomersList ? window._currentCustomersList.map(c => ({ value: c.id, label: c.name, icon: 'user' })) : [])
            ]
        })}
                    </div>
                    <div>
                        <label for="quoteCustomerNameOverride" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Or Specific Name</label>
                        <input type="text" id="quoteCustomerNameOverride" class="form-input" placeholder="e.g. Acme Corp">
                    </div>
                </div>
                <div>
                    <label for="quoteCustomerAddressOverride" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Address</label>
                    <textarea id="quoteCustomerAddressOverride" class="form-input" rows="2" placeholder="Customer address..."></textarea>
                </div>
                <div>
                     <label for="quoteValidUntil" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Valid Until</label>
                     ${window.renderPremiumDatePicker({
                         id: 'quoteValidUntil',
                         selectedValue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                         placeholder: 'Valid Until',
                         classes: 'w-full'
                     })}
                </div>
                <div>
                    <div class="flex justify-between items-center mb-1">
                        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">Line Items</label>
                        <button type="button" onclick="window.addQuoteItemRow()" class="text-xs text-indigo-600 font-bold hover:underline">
                            + Add Item
                        </button>
                    </div>
                    <div id="quoteItemsContainer" class="space-y-2 max-h-48 overflow-y-auto p-1">
                        <!-- Items injected here -->
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Total Quote Amount</label>
                    <input type="text" id="quoteTotalAmountDisplay" readonly class="form-input bg-gray-50 dark:bg-gray-800 font-bold text-gray-600 dark:text-gray-300" value="${fmt.currency(0)}">
                    <input type="hidden" id="quoteTotalAmountVal" value="0">
                </div>
            </div>

            <!-- BOTTOM NAV / FOOTER -->
            <div class="modal-bottom-nav flex-none p-4 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center gap-3 z-20">
                <button type="button" onclick="closeModal()" class="px-5 py-2.5 rounded-xl font-bold text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border-none">
                    Cancel
                </button>
                <button type="submit" class="px-6 py-2.5 rounded-xl font-black text-xs btn-primary bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all">
                    Save & Generate Quote
                </button>
            </div>
        </form>
        <script>
            if(window.initQuoteModal) window.initQuoteModal();
        </script>
        `;

        case 'viewQuotation': return `
        <div class="p-6">
            <div class="flex items-center justify-between mb-6">
                <div>
                    <h3 class="text-xl font-bold text-gray-900">Quotation Details</h3>
                    <p class="text-sm font-bold text-indigo-600">${data.quote_number}</p>
                </div>
                <button onclick="closeModal()" class="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-6">
                <div class="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p class="text-[10px] text-gray-500 uppercase font-bold">To</p>
                    <p class="text-sm font-semibold">${data.customer_name}</p>
                    ${data.customer_address ? `<p class="text-[10px] text-gray-400 mt-1">${data.customer_address}</p>` : ''}
                </div>
                <div class="bg-gray-50 p-3 rounded-xl border border-gray-100">
                    <p class="text-[10px] text-gray-500 uppercase font-bold">Status</p>
                    <p class="text-sm font-bold uppercase ${data.status === 'accepted' ? 'text-emerald-500' : (data.status === 'rejected' ? 'text-red-500' : 'text-amber-500')}">${data.status}</p>
                </div>
                <div class="bg-gray-50 p-3 rounded-xl border border-gray-100 col-span-2">
                    <p class="text-[10px] text-gray-500 uppercase font-bold">Total Amount</p>
                    <p class="text-xl font-black text-indigo-600">${fmt.currency(data.total_amount)}</p>
                </div>
            </div>

            <h4 class="text-xs font-bold text-gray-500 uppercase mb-2">Line Items</h4>
            <div class="space-y-2 max-h-48 overflow-y-auto mb-6">
                ${data.items && data.items.length > 0 ? data.items.map(item => `
                    <div class="p-3 border border-gray-100 rounded-lg flex justify-between items-center bg-gray-50">
                        <div>
                            <p class="font-bold text-sm">${item.item_name}</p>
                            <p class="text-xs text-gray-500">${item.quantity} units @ ${fmt.currency(item.unit_price)}</p>
                        </div>
                        <p class="font-black text-gray-700">${fmt.currency(item.quantity * item.unit_price)}</p>
                    </div>
                `).join('') : '<p class="text-sm text-gray-500">No items.</p>'}
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button onclick="updateQuotationStatus('${data.id}', 'sent')" class="p-2 bg-blue-50 text-blue-700 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-blue-100">Mark Sent</button>
                <button onclick="updateQuotationStatus('${data.id}', 'accepted')" class="p-2 bg-emerald-50 text-emerald-700 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-emerald-100">Mark Accepted</button>
                <button onclick="updateQuotationStatus('${data.id}', 'rejected')" class="p-2 bg-red-50 text-red-700 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-red-100">Mark Rejected</button>
                <button onclick="downloadQuotationPDF('${data.id}')" class="p-2 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-[10px] uppercase tracking-wider hover:bg-indigo-100 flex items-center justify-center gap-1"><i data-lucide="download" class="w-3 h-3"></i> PDF</button>
            </div>
        </div>`;

        case 'taskDetails': {
            const comments = data._comments || [];
            const isOwner = window.state && state.role === 'owner';
            const branchName = data.branch?.name || window.state?.branchProfile?.name || 'Branch';

            if (isOwner) {
                const commentThread = comments.length === 0
                    ? `<div class="py-10 text-center text-gray-400 dark:text-gray-500 flex flex-col items-center justify-center">
                        <i data-lucide="message-circle-dashed" class="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2"></i>
                        <p class="text-xs font-medium">No reminders or replies yet</p>
                    </div>`
                    : comments.map(c => {
                        const isAdmin = c.sender_role === 'owner';
                        return `
                        <div class="flex ${isAdmin ? 'justify-end' : 'justify-start'}">
                            <div class="max-w-[88%] ${isAdmin
                                ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-xs'
                                : 'bg-slate-100 dark:bg-gray-700/70 text-gray-800 dark:text-gray-100 border border-gray-200/60 dark:border-gray-600/60 rounded-2xl rounded-tl-xs'
                            } px-3.5 py-2.5 shadow-2xs">
                                <div class="flex items-center justify-between gap-3 mb-0.5">
                                    <p class="text-[9px] font-black uppercase tracking-wider ${isAdmin ? 'text-indigo-200' : 'text-indigo-600 dark:text-indigo-400'}">
                                        ${isAdmin ? 'You' : (c.sender_name || branchName)}
                                    </p>
                                    <span class="text-[9px] ${isAdmin ? 'text-indigo-200/80' : 'text-gray-400'}">${fmt.dateTime(c.created_at)}</span>
                                </div>
                                <p class="text-xs leading-snug break-words">${c.message}</p>
                            </div>
                        </div>`;
                    }).join('');

                return `
                <!-- Fixed Top Navigation Header -->
                <div class="modal-top-nav flex-none flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-20">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <button type="button" onclick="closeModal()" data-close-text="${window.t('back', 'Back')}" class="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                            <i data-lucide="chevron-left" class="w-4 h-4"></i>
                            <span>${window.t('back', 'Back')}</span>
                        </button>
                        <div class="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0">
                            <i data-lucide="list-todo" class="w-5 h-5"></i>
                        </div>
                        <div class="min-w-0">
                            <h2 class="text-sm sm:text-base font-black text-gray-900 dark:text-white leading-tight truncate">${window.t('task_details', 'Task Details')}</h2>
                            <p class="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate">${branchName} · Assignment & Monitoring</p>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 shrink-0">
                        <div class="scale-95 origin-right flex items-center gap-1.5">
                            ${priorityBadge(data.priority)}
                            ${statusBadge(data.status)}
                        </div>
                    </div>
                </div>

                <!-- Scrollable Main Content Body -->
                <div class="modal-main-content p-3.5 sm:p-5 lg:p-6 scroller-custom flex-1 overflow-y-auto space-y-4">
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                        <!-- Left Column: Task Overview & Instructions -->
                        <div class="lg:col-span-2 space-y-4">
                            <!-- Hero Card -->
                            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 p-4 sm:p-5 shadow-xs border-l-4 ${data.status === 'completed' ? 'border-l-emerald-500' : 'border-l-indigo-500'}">
                                <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                                    <span class="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Assigned Branch Task</span>
                                    <span class="text-xs text-gray-400 font-medium flex items-center gap-1">
                                        <i data-lucide="clock" class="w-3.5 h-3.5"></i>
                                        ${data.created_at ? fmt.date(data.created_at) : 'Active'}
                                    </span>
                                </div>
                                <h3 class="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-snug mb-3">${data.title}</h3>
                                
                                <!-- Meta Chips Grid -->
                                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-700/60">
                                    <div class="bg-slate-50 dark:bg-gray-900/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                        <p class="text-[9px] font-bold uppercase text-gray-400 tracking-wider">Priority</p>
                                        <div class="mt-1">${priorityBadge(data.priority)}</div>
                                    </div>
                                    <div class="bg-slate-50 dark:bg-gray-900/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                        <p class="text-[9px] font-bold uppercase text-gray-400 tracking-wider">Status</p>
                                        <div class="mt-1">${statusBadge(data.status)}</div>
                                    </div>
                                    <div class="bg-slate-50 dark:bg-gray-900/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700/50 col-span-2 sm:col-span-1">
                                        <p class="text-[9px] font-bold uppercase text-gray-400 tracking-wider">Deadline</p>
                                        <p class="text-xs sm:text-sm font-black ${data.deadline ? 'text-red-600 dark:text-red-400' : 'text-gray-400'} mt-1 truncate">
                                            ${data.deadline ? fmt.date(data.deadline) : 'No Deadline'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <!-- Instructions Card -->
                            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 p-4 sm:p-5 shadow-xs">
                                <div class="flex items-center gap-2 mb-3">
                                    <div class="w-7 h-7 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center">
                                        <i data-lucide="file-text" class="w-4 h-4"></i>
                                    </div>
                                    <h4 class="text-xs sm:text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Instructions & Guidelines</h4>
                                </div>
                                <div class="p-3.5 sm:p-4 bg-slate-50 dark:bg-gray-900/60 rounded-xl border border-gray-150 dark:border-gray-700/60 text-xs sm:text-sm text-gray-700 dark:text-gray-200 leading-relaxed font-normal whitespace-pre-line">
                                    ${data.description ? data.description : '<span class="text-gray-400 italic">No specific instructions provided for this task.</span>'}
                                </div>
                            </div>
                        </div>

                        <!-- Right Column: Reminders & Thread -->
                        <div class="lg:col-span-1 space-y-4 flex flex-col">
                            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 p-4 sm:p-5 shadow-xs flex-1 flex flex-col">
                                <div class="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-700/60">
                                    <div class="flex items-center gap-2">
                                        <div class="w-7 h-7 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center">
                                            <i data-lucide="messages-square" class="w-4 h-4"></i>
                                        </div>
                                        <h4 class="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">Discussion</h4>
                                    </div>
                                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">${comments.length}</span>
                                </div>

                                <div class="space-y-2.5 flex-1 max-h-[300px] overflow-y-auto scroller-custom pr-1 mb-3" id="taskCommentThread">
                                    ${commentThread}
                                </div>

                                <div class="pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-center gap-2">
                                    <input type="text" id="adminReminderInput" placeholder="Send a reminder to branch…"
                                        class="form-input flex-1 text-xs px-3.5 py-2 rounded-full bg-gray-50/80 dark:bg-gray-900/80 border border-gray-200/90 dark:border-gray-700/80 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault();handleSendTaskReminder('${data.id}');}">
                                    <button type="button" onclick="handleSendTaskReminder('${data.id}')"
                                        class="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shrink-0 shadow-xs transition-transform active:scale-95 cursor-pointer">
                                        <i data-lucide="send" class="w-3.5 h-3.5"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Fixed Bottom Navigation Footer -->
                <div class="modal-bottom-nav flex-none p-2.5 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-between gap-2 sm:gap-3 z-20">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 sm:py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0">
                        <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
                        <span>${window.t('back_to_tasks', 'Back to Tasks')}</span>
                    </button>

                    <div class="flex items-center gap-2">
                        <div class="w-36">
                            ${window.renderPremiumSelect({
                                id: 'adminTaskStatusSelect',
                                selectedValue: data.status,
                                options: [
                                    { value: 'pending', label: 'Pending', icon: 'clock' },
                                    { value: 'in_progress', label: 'In Progress', icon: 'play-circle' },
                                    { value: 'completed', label: 'Completed', icon: 'check-circle' }
                                ],
                                onchange: `handleAdminUpdateTaskStatus('${data.id}', this.value)`,
                                classes: 'text-xs py-1.5 font-bold rounded-full'
                            })}
                        </div>
                        <button type="button" onclick="handleAdminDeleteTask('${data.id}')" class="px-3.5 py-2 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full text-xs font-bold flex items-center gap-1 border border-red-200 dark:border-red-800/60 transition-colors cursor-pointer shrink-0">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            <span class="hidden sm:inline">Delete Task</span>
                        </button>
                    </div>
                </div>`;

            } else {
                // Branch View
                const commentThread = comments.length === 0
                    ? `<div class="py-10 text-center text-gray-400 dark:text-gray-500 flex flex-col items-center justify-center">
                        <i data-lucide="message-circle-dashed" class="w-8 h-8 text-gray-300 dark:text-gray-600 mb-2"></i>
                        <p class="text-xs font-medium">No comments or reminders yet</p>
                    </div>`
                    : comments.map(c => {
                        const isBranch = c.sender_role === 'branch';
                        return `
                        <div class="flex ${isBranch ? 'justify-end' : 'justify-start'}">
                            <div class="max-w-[88%] ${isBranch
                                ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-xs'
                                : 'bg-slate-100 dark:bg-gray-700/70 text-gray-800 dark:text-gray-100 border border-gray-200/60 dark:border-gray-600/60 rounded-2xl rounded-tl-xs'
                            } px-3.5 py-2.5 shadow-2xs">
                                <div class="flex items-center justify-between gap-3 mb-0.5">
                                    <p class="text-[9px] font-black uppercase tracking-wider ${isBranch ? 'text-indigo-200' : 'text-indigo-600 dark:text-indigo-400'}">
                                        ${isBranch ? 'You' : 'Admin'}
                                    </p>
                                    <span class="text-[9px] ${isBranch ? 'text-indigo-200/80' : 'text-gray-400'}">${fmt.dateTime(c.created_at)}</span>
                                </div>
                                <p class="text-xs leading-snug break-words">${c.message}</p>
                            </div>
                        </div>`;
                    }).join('');

                return `
                <!-- Fixed Top Navigation Header -->
                <div class="modal-top-nav flex-none flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-20">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <button type="button" onclick="closeModal()" data-close-text="${window.t('back', 'Back')}" class="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                            <i data-lucide="chevron-left" class="w-4 h-4"></i>
                            <span>${window.t('back', 'Back')}</span>
                        </button>
                        <div class="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0">
                            <i data-lucide="list-todo" class="w-5 h-5"></i>
                        </div>
                        <div class="min-w-0">
                            <h2 class="text-sm sm:text-base font-black text-gray-900 dark:text-white leading-tight truncate">${window.t('task_details', 'Task Details')}</h2>
                            <p class="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate">${branchName} · Instructions & Discussion</p>
                        </div>
                    </div>

                    <div class="flex items-center gap-2 shrink-0">
                        <div class="scale-95 origin-right flex items-center gap-1.5">
                            ${priorityBadge(data.priority)}
                            ${statusBadge(data.status)}
                        </div>
                    </div>
                </div>

                <!-- Scrollable Main Content Body -->
                <div class="modal-main-content p-3.5 sm:p-5 lg:p-6 scroller-custom flex-1 overflow-y-auto space-y-4">
                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                        <!-- Left Column: Task Overview & Instructions -->
                        <div class="lg:col-span-2 space-y-4">
                            <!-- Hero Card -->
                            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 p-4 sm:p-5 shadow-xs border-l-4 ${data.status === 'completed' ? 'border-l-emerald-500' : 'border-l-indigo-500'}">
                                <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                                    <span class="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Assigned Task</span>
                                    <span class="text-xs text-gray-400 font-medium flex items-center gap-1">
                                        <i data-lucide="clock" class="w-3.5 h-3.5"></i>
                                        ${data.created_at ? fmt.date(data.created_at) : 'Active'}
                                    </span>
                                </div>
                                <h3 class="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-snug mb-3">${data.title}</h3>
                                
                                <!-- Meta Chips Grid -->
                                <div class="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 border-t border-gray-100 dark:border-gray-700/60">
                                    <div class="bg-slate-50 dark:bg-gray-900/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                        <p class="text-[9px] font-bold uppercase text-gray-400 tracking-wider">Priority</p>
                                        <div class="mt-1">${priorityBadge(data.priority)}</div>
                                    </div>
                                    <div class="bg-slate-50 dark:bg-gray-900/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                        <p class="text-[9px] font-bold uppercase text-gray-400 tracking-wider">Status</p>
                                        <div class="mt-1">${statusBadge(data.status)}</div>
                                    </div>
                                    <div class="bg-slate-50 dark:bg-gray-900/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700/50 col-span-2 sm:col-span-1">
                                        <p class="text-[9px] font-bold uppercase text-gray-400 tracking-wider">Deadline</p>
                                        <p class="text-xs sm:text-sm font-black ${data.deadline ? 'text-red-600 dark:text-red-400' : 'text-gray-400'} mt-1 truncate">
                                            ${data.deadline ? fmt.date(data.deadline) : 'No Deadline'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <!-- Instructions Card -->
                            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 p-4 sm:p-5 shadow-xs">
                                <div class="flex items-center gap-2 mb-3">
                                    <div class="w-7 h-7 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg flex items-center justify-center">
                                        <i data-lucide="file-text" class="w-4 h-4"></i>
                                    </div>
                                    <h4 class="text-xs sm:text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">Instructions & Guidelines</h4>
                                </div>
                                <div class="p-3.5 sm:p-4 bg-slate-50 dark:bg-gray-900/60 rounded-xl border border-gray-150 dark:border-gray-700/60 text-xs sm:text-sm text-gray-700 dark:text-gray-200 leading-relaxed font-normal whitespace-pre-line">
                                    ${data.description ? data.description : '<span class="text-gray-400 italic">No specific instructions provided for this task.</span>'}
                                </div>
                            </div>
                        </div>

                        <!-- Right Column: Reminders & Thread -->
                        <div class="lg:col-span-1 space-y-4 flex flex-col">
                            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 p-4 sm:p-5 shadow-xs flex-1 flex flex-col">
                                <div class="flex items-center justify-between mb-3 pb-2 border-b border-gray-100 dark:border-gray-700/60">
                                    <div class="flex items-center gap-2">
                                        <div class="w-7 h-7 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-lg flex items-center justify-center">
                                            <i data-lucide="messages-square" class="w-4 h-4"></i>
                                        </div>
                                        <h4 class="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">Discussion</h4>
                                    </div>
                                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">${comments.length}</span>
                                </div>

                                <div class="space-y-2.5 flex-1 max-h-[300px] overflow-y-auto scroller-custom pr-1 mb-3" id="taskCommentThread">
                                    ${commentThread}
                                </div>

                                <div class="pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-center gap-2">
                                    <input type="text" id="branchReplyInput" placeholder="Reply to admin…"
                                        class="form-input flex-1 text-xs px-3.5 py-2 rounded-full bg-gray-50/80 dark:bg-gray-900/80 border border-gray-200/90 dark:border-gray-700/80 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        onkeydown="if(event.key==='Enter'){event.preventDefault();handleBranchReplyToTask('${data.id}');}">
                                    <button type="button" onclick="handleBranchReplyToTask('${data.id}')"
                                        class="w-8 h-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shrink-0 shadow-xs transition-transform active:scale-95 cursor-pointer">
                                        <i data-lucide="send" class="w-3.5 h-3.5"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Fixed Bottom Navigation Footer -->
                <div class="modal-bottom-nav flex-none p-2.5 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-between gap-2 sm:gap-3 z-20">
                    <button type="button" onclick="closeModal()" class="px-4 py-2 sm:py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0">
                        <i data-lucide="arrow-left" class="w-3.5 h-3.5"></i>
                        <span>${window.t('back_to_tasks', 'Back to Tasks')}</span>
                    </button>

                    ${data.status !== 'completed' ? `
                        <button type="button" onclick="handleBranchCompleteTask('${data.id}')" class="flex-1 max-w-xs py-2 sm:py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer">
                            <i data-lucide="check-circle" class="w-4 h-4"></i>
                            <span>${window.t('mark_as_completed', 'Mark as Completed')}</span>
                        </button>
                    ` : `
                        <div class="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-full text-xs font-bold border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                            <i data-lucide="check-check" class="w-4 h-4 text-emerald-600"></i>
                            <span>${window.t('task_completed', 'Task Completed')}</span>
                        </div>
                    `}
                </div>`;
            }
        }

        default: return null;
    }
};

function _getEditCustomerHTML(data) {
    return `
    <form onsubmit="handleEditCustomer(event, '${data.id}')" class="flex flex-col h-full min-h-0 overflow-hidden">
        <!-- TOP NAV / HEADER -->
        <div class="modal-top-nav flex-none p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center gap-3.5 justify-start z-20">
            <button type="button" onclick="closeModal()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                <i data-lucide="chevron-left" class="w-4 h-4"></i>
                <span>${window.t('back', 'Back')}</span>
            </button>
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0">
                    <i data-lucide="user-pen" class="w-5 h-5"></i>
                </div>
                <div class="min-w-0">
                    <h3 class="text-base font-black text-gray-900 dark:text-white truncate">Edit Customer</h3>
                    <p class="text-[11px] font-bold text-gray-500 truncate">${data.name || ''}</p>
                </div>
            </div>
        </div>

        <!-- MAIN CONTENTS (SCROLLABLE AREA) -->
        <div class="modal-main-content flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4">
            <div>
                <label for="editCustomerName" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                <input type="text" id="editCustomerName" value="${data.name}" required class="form-input">
            </div>
            <div>
                <label for="editCustomerPhone" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                <input type="tel" id="editCustomerPhone" value="${data.phone || ''}" class="form-input">
            </div>
            <div>
                <label for="editCustomerEmail" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <input type="email" id="editCustomerEmail" value="${data.email || ''}" class="form-input">
            </div>
            <div>
                <label for="editCustomerAddress" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                <textarea id="editCustomerAddress" class="form-input" rows="2">${data.address || ''}</textarea>
            </div>
        </div>

        <!-- BOTTOM NAV / FOOTER -->
        <div class="modal-bottom-nav flex-none p-4 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center gap-3 z-20">
            <button type="button" onclick="closeModal()" class="px-5 py-2.5 rounded-xl font-bold text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border-none">
                Cancel
            </button>
            <button type="submit" class="px-6 py-2.5 rounded-xl font-black text-xs btn-primary text-white shadow-md transition-all">
                Update Customer
            </button>
        </div>
    </form>`;
}

function _getEditLoanHTML(data) {
    return `
    <form onsubmit="handleEditLoan(event, '${data.id}')" class="flex flex-col h-full min-h-0 overflow-hidden">
        <!-- TOP NAV / HEADER -->
        <div class="modal-top-nav flex-none p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center gap-3.5 justify-start z-20">
            <button type="button" onclick="closeModal()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                <i data-lucide="chevron-left" class="w-4 h-4"></i>
                <span>${window.t('back', 'Back')}</span>
            </button>
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <i data-lucide="landmark" class="w-5 h-5"></i>
                </div>
                <div class="min-w-0">
                    <h3 class="text-base font-black text-gray-900 dark:text-white truncate">Edit Record</h3>
                    <p class="text-[11px] font-bold text-gray-500 truncate">${data.party || 'Loan / Income'}</p>
                </div>
            </div>
        </div>

        <!-- MAIN CONTENTS (SCROLLABLE AREA) -->
        <div class="modal-main-content flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4">
            <div>
                <label for="editLoanType" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
                ${window.renderPremiumSelect({
        id: 'editLoanType',
        selectedValue: data.type,
        options: [
            { value: 'income', label: 'Other Income', icon: 'trending-up' },
            { value: 'loan_given', label: 'Loan Given', icon: 'arrow-up-right' },
            { value: 'loan_received', label: 'Loan Received', icon: 'arrow-down-left' },
            { value: 'repayment', label: 'Repayment Received', icon: 'rotate-ccw' }
        ]
    })}
            </div>
            <div>
                <label for="editLoanParty" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Party (Name)</label>
                <input type="text" id="editLoanParty" value="${data.party || ''}" class="form-input">
            </div>
            <div>
                <label for="editLoanAmount" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount (${fmt.getSymbol()})</label>
                <input type="text" inputmode="decimal" id="editLoanAmount" value="${data.amount}" required class="form-input number-format">
            </div>
            <div>
                <label for="editLoanNotes" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea id="editLoanNotes" rows="2" class="form-input">${data.notes || ''}</textarea>
            </div>
        </div>

        <!-- BOTTOM NAV / FOOTER -->
        <div class="modal-bottom-nav flex-none p-4 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center gap-3 z-20">
            <button type="button" onclick="closeModal()" class="px-5 py-2.5 rounded-xl font-bold text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border-none">
                Cancel
            </button>
            <button type="submit" class="px-6 py-2.5 rounded-xl font-black text-xs btn-primary text-white shadow-md transition-all">
                Update Record
            </button>
        </div>
    </form>`;
}

function _setSubmitLoading(form, loading, originalText) {
    const btn = form.querySelector('[type="submit"]');
    if (!btn) return;
    btn.disabled = loading;
    btn.textContent = loading ? 'Saving…' : originalText;
}

window.openBranchPreferencesModal = async function (branchData) {
    try {
        if (typeof branchData === 'string') {
            try {
                branchData = JSON.parse(branchData);
            } catch (e) {
                if (branchData.length >= 10) {
                    branchData = { id: branchData.trim() };
                } else {
                    console.error('[Modals] Failed to parse branchData string:', e);
                }
            }
        }

        const branchId = branchData?.id || branchData?.branch_id || (typeof branchData === 'string' ? branchData : null);
        if (!branchId) {
            console.error('[Modals] openBranchPreferencesModal: Invalid branchData provided', branchData);
            showToast('Unable to open allowlist: Invalid branch reference', 'error');
            return;
        }

        const freshBranch = await dbBranches.fetchOne(branchId).catch(() => null);
        const resolvedData = freshBranch || (typeof branchData === 'object' ? { ...branchData, id: branchId } : { id: branchId, name: 'Branch' });
        openModal('branchPreferences', resolvedData);
    } catch (err) {
        console.error('[Modals] openBranchPreferencesModal error:', err);
        const branchId = branchData?.id || branchData?.branch_id;
        if (branchId) {
            openModal('branchPreferences', typeof branchData === 'object' ? { ...branchData, id: branchId } : { id: branchId, name: 'Branch' });
        }
    }
};

window.toggleBranchPrefUI = function (btn) {
    const isCurrentlyOn = btn.dataset.on === '1';
    const key = btn.dataset.key;
    const colorOn = btn.dataset.colorOn;
    const badgeColorOn = btn.dataset.colorBadgeOn;
    const thumb = btn.querySelector('span');
    const badge = document.getElementById(`pref-badge-${key}`);

    if (isCurrentlyOn) {
        btn.dataset.on = '0';
        btn.setAttribute('aria-checked', 'false');
        btn.className = btn.className.replace(colorOn, 'bg-gray-200 dark:bg-gray-700').replace(/ring-\S+/, '');
        if (thumb) { thumb.classList.remove('left-7'); thumb.classList.add('left-1'); }
        if (badge) {
            badge.className = 'text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-400';
            badge.textContent = 'Approval';
        }
    } else {
        btn.dataset.on = '1';
        btn.setAttribute('aria-checked', 'true');
        btn.className = btn.className.replace('bg-gray-200 dark:bg-gray-700', colorOn).replace('bg-gray-200', colorOn);
        if (thumb) { thumb.classList.remove('left-1'); thumb.classList.add('left-7'); }
        if (badge) {
            badge.className = `text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeColorOn}`;
            badge.textContent = 'Allowed';
        }
    }
};

window.handleSaveBranchPreferences = async function (branchId) {
    if (!branchId || branchId === 'undefined' || branchId === 'null') {
        showToast('Error: Invalid branch reference. Please refresh the page.', 'error');
        console.error('[Modals] handleSaveBranchPreferences called with invalid branchId:', branchId);
        return;
    }
    const cleanId = String(branchId).trim();

    const toggles = document.querySelectorAll('[id^="pref-toggle-"]');
    const preferences = {};
    toggles.forEach(t => {
        preferences[t.dataset.key] = t.dataset.on === '1';
    });

    const saveBtn = document.querySelector('[onclick*="handleSaveBranchPreferences"]');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = 'Saving…'; }

    try {
        const updatedBranch = await dbBranches.updatePreferences(cleanId, preferences);

        if (state.branches) {
            const idx = state.branches.findIndex(b => String(b.id) === cleanId);
            if (idx > -1) state.branches[idx] = { ...state.branches[idx], preferences };
        }

        if (state.branchProfile && String(state.branchProfile.id) === cleanId) {
            state.branchProfile.preferences = preferences;
        }

        showToast('Branch allowlist preferences saved!', 'success');
        closeModal();
    } catch (err) {
        showToast('Failed to save preferences: ' + err.message, 'error');
        if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = 'Save Preferences'; }
    }
};

window.updateActiveModalAllowlistUI = function (freshPreferences, targetBranchId = null) {
    if (!freshPreferences || typeof freshPreferences !== 'object') return;

    // 1. Branch live reactive UI update
    if (state.role === 'branch' && (!targetBranchId || String(targetBranchId).toLowerCase() === String(state.branchId).toLowerCase())) {
        if (state.branchProfile) {
            state.branchProfile.preferences = { ...state.branchProfile.preferences, ...freshPreferences };
        }

        // Add Expense Modal
        const canExpense = freshPreferences.expenses_add === true;
        const expHeader = document.querySelector('#modalContainer form[onsubmit*="handleAddExpense"] .modal-top-nav h3');
        const expBadge = document.querySelector('#modalContainer form[onsubmit*="handleAddExpense"] .modal-top-nav p');
        const expSubmit = document.querySelector('#modalContainer form[onsubmit*="handleAddExpense"] button[type="submit"]');
        if (expHeader) {
            expHeader.textContent = canExpense ? 'Record Expense' : 'Request Expense Approval';
            if (expBadge) {
                expBadge.className = `text-[11px] font-bold ${canExpense ? 'text-rose-600' : 'text-gray-500'} truncate`;
                expBadge.textContent = canExpense ? 'Allowed — will be recorded directly' : 'Expenses require admin approval';
            }
            if (expSubmit) {
                expSubmit.className = `px-6 py-2.5 rounded-xl font-black text-xs ${canExpense ? 'bg-rose-600 hover:bg-rose-700' : 'btn-primary'} text-white shadow-md transition-all cursor-pointer flex items-center gap-2`;
                expSubmit.textContent = canExpense ? 'Record Expense' : 'Submit for Approval';
            }
        }

        // Add Customer Modal
        const canCustomer = freshPreferences.customers_add === true;
        const custHeader = document.querySelector('#modalContainer form[onsubmit*="handleAddCustomer"] .modal-top-nav h3');
        const custBadge = document.querySelector('#modalContainer form[onsubmit*="handleAddCustomer"] .modal-top-nav p');
        const custSubmit = document.querySelector('#modalContainer form[onsubmit*="handleAddCustomer"] button[type="submit"]');
        if (custHeader) {
            custHeader.textContent = canCustomer ? 'Add Customer' : 'Request Customer Approval';
            if (custBadge) {
                custBadge.className = `text-[11px] font-bold ${canCustomer ? 'text-blue-600' : 'text-gray-500'} truncate`;
                custBadge.textContent = canCustomer ? 'Allowed — customer will be added directly' : 'Adding customers requires admin approval';
            }
            if (custSubmit) {
                custSubmit.className = `px-6 py-2.5 rounded-xl font-black text-xs ${canCustomer ? 'bg-blue-600 hover:bg-blue-700' : 'btn-primary'} text-white shadow-md transition-all cursor-pointer flex items-center gap-2`;
                custSubmit.textContent = canCustomer ? 'Add Customer' : 'Submit for Approval';
            }
        }

        // Add Stock Modal
        const canAddStock = freshPreferences.inventory_add === true;
        const stockHeader = document.querySelector('#modalContainer form[onsubmit*="handleAddInventory"] .modal-top-nav h3');
        const stockBadge = document.querySelector('#modalContainer form[onsubmit*="handleAddInventory"] .modal-top-nav p');
        const stockSubmit = document.querySelector('#modalContainer form[onsubmit*="handleAddInventory"] button[type="submit"]');
        if (stockHeader) {
            stockHeader.textContent = canAddStock ? 'Add Stock' : 'Request Stock Addition';
            if (stockBadge) {
                stockBadge.className = `text-[11px] font-bold ${canAddStock ? 'text-indigo-600' : 'text-gray-500'} truncate`;
                stockBadge.textContent = canAddStock ? 'Allowed — stock will be added directly' : 'Adding stock requires admin approval';
            }
            if (stockSubmit) {
                stockSubmit.className = `px-6 py-2.5 rounded-xl font-black text-xs ${canAddStock ? 'bg-indigo-600 hover:bg-indigo-700' : 'btn-primary'} text-white shadow-md transition-all cursor-pointer flex items-center gap-2`;
                stockSubmit.textContent = canAddStock ? 'Add Stock' : 'Submit for Approval';
            }
        }

        // Sale Checkout Mode
        const canSale = freshPreferences.sales_add !== false;
        const saleSubmitText = document.getElementById('saleSubmitBtnText');
        if (saleSubmitText) {
            saleSubmitText.textContent = canSale ? (window.t ? window.t('record_sale', 'Record Sale') : 'Record Sale') : (window.t ? window.t('submit_for_approval', 'Submit for Approval') : 'Submit for Approval');
        }
    }

    // 2. Owner live reactive UI update for open allowlist modal
    const prefActionList = document.getElementById('prefActionList');
    if (prefActionList) {
        Object.entries(freshPreferences).forEach(([actKey, isOn]) => {
            const btn = document.getElementById(`pref-toggle-${actKey}`);
            const badge = document.getElementById(`pref-badge-${actKey}`);
            if (btn) {
                const colorOn = btn.dataset.colorOn || 'bg-indigo-600';
                const badgeColorOn = btn.dataset.colorBadgeOn || 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300';
                const thumb = btn.querySelector('span');
                btn.dataset.on = isOn ? '1' : '0';
                btn.setAttribute('aria-checked', String(isOn));
                if (isOn) {
                    btn.className = `relative w-12 h-6 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 cursor-pointer ${colorOn}`;
                    if (thumb) { thumb.classList.remove('left-1'); thumb.classList.add('left-7'); }
                    if (badge) {
                        badge.className = `text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeColorOn}`;
                        badge.textContent = 'Allowed';
                    }
                } else {
                    btn.className = `relative w-12 h-6 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 cursor-pointer bg-gray-200 dark:bg-gray-700`;
                    if (thumb) { thumb.classList.remove('left-7'); thumb.classList.add('left-1'); }
                    if (badge) {
                        badge.className = `text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-400`;
                        badge.textContent = 'Approval';
                    }
                }
            }
        });
    }
};

window.handleAssignTask = async function (e) {
    e.preventDefault();
    _setSubmitLoading(e.target, true, 'Assign Task');
    try {
        const branchId = document.getElementById('taskBranch').value;
        const title = document.getElementById('taskTitle').value;
        const description = document.getElementById('taskDesc').value;
        const priority = document.getElementById('taskPriority').value;
        const deadline = document.getElementById('taskDeadline').value;
        await dbTasks.add(branchId, { title, description, priority, deadline });
        closeModal();
        const branch = state.branches.find(b => b.id === branchId);
        addActivity('task_assigned', `New task assigned: ${title} `, branch?.name || 'Branch');
        showToast('Task assigned successfully!', 'success');
        switchView('tasks');
    } catch (err) {
        showToast('Failed to assign task: ' + err.message, 'error');
        _setSubmitLoading(e.target, false, 'Assign Task');
    }
};

window._activeSaleMode = 'single';
window._activeSaleCart = [];

window.setSaleMode = function (mode) {
    window._activeSaleMode = mode;
    const tabSingle = document.getElementById('tabSaleSingle');
    const tabCart = document.getElementById('tabSaleCart');
    const viewSingle = document.getElementById('saleSingleModeView');
    const viewCart = document.getElementById('saleCartModeView');
    const helpText = document.getElementById('saleModeHelpText');
    const submitBtnText = document.getElementById('saleSubmitBtnText');

    if (mode === 'cart') {
        if (tabSingle) tabSingle.className = "px-3.5 sm:px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50 flex items-center gap-1.5";
        if (tabCart) tabCart.className = "px-3.5 sm:px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer bg-emerald-600 text-white shadow-sm flex items-center gap-1.5";
        if (viewSingle) viewSingle.classList.add('hidden');
        if (viewCart) viewCart.classList.remove('hidden');
        if (helpText) helpText.textContent = "Record multiple items in a single transaction & receipt";
        window.renderSaleCartTable();
    } else {
        if (tabSingle) tabSingle.className = "px-3.5 sm:px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer bg-emerald-600 text-white shadow-sm flex items-center gap-1.5";
        if (tabCart) tabCart.className = "px-3.5 sm:px-4 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50 flex items-center gap-1.5";
        if (viewSingle) viewSingle.classList.remove('hidden');
        if (viewCart) viewCart.classList.add('hidden');
        if (helpText) helpText.textContent = "Quick 1-click single product record";
        if (submitBtnText) submitBtnText.textContent = "Record Sale";
    }
    if (window.lucide) lucide.createIcons();
};

window.onSaleCartProductChange = function (productId) {
    const row = document.getElementById('saleCartQuickPriceRow');
    if (!row) return;

    if (!productId) {
        row.classList.add('hidden');
        return;
    }

    const priceInfo = window._salePriceMap?.[productId];
    if (!priceInfo) {
        row.classList.add('hidden');
        return;
    }

    row.classList.remove('hidden');

    const isService = priceInfo.item_type === 'service';
    const retailAmt = document.getElementById('ptCartRetailAmt');
    const wholesaleAmt = document.getElementById('ptCartWholesaleAmt');
    const wholesaleBtn = document.getElementById('ptCartWholesale');
    const retailLabel = document.getElementById('ptCartRetailLabel');
    const customInput = document.getElementById('saleCartQuickCustomPrice');

    if (retailAmt) retailAmt.textContent = window.fmt.currency(priceInfo.retail || 0);
    if (wholesaleAmt) wholesaleAmt.textContent = window.fmt.currency(priceInfo.wholesale || 0);
    if (wholesaleBtn) wholesaleBtn.classList.toggle('hidden', isService);
    if (retailLabel) retailLabel.textContent = isService ? 'Service Fee' : window.t('retail', 'Retail');
    if (customInput) customInput.value = window.fmt.number(priceInfo.retail || 0);

    window.setSaleCartQuickPriceType('retail');
    if (window.lucide) window.lucide.createIcons({ scope: row });
};

window.setSaleCartQuickPriceType = function (type) {
    const input = document.getElementById('saleCartQuickPriceType');
    if (input) input.value = type;

    const btns = { retail: 'ptCartRetail', wholesale: 'ptCartWholesale', custom: 'ptCartCustom' };
    const activeClasses = {
        retail:    ['border-emerald-500', 'bg-emerald-50', 'text-emerald-700'],
        wholesale: ['border-indigo-500',  'bg-indigo-50',  'text-indigo-700'],
        custom:    ['border-amber-500',   'bg-amber-50',   'text-amber-700']
    };
    const inactiveClasses = ['border-gray-200', 'bg-gray-50', 'text-gray-500'];

    Object.entries(btns).forEach(([t, id]) => {
        const btn = document.getElementById(id);
        if (!btn) return;
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

    const customContainer = document.getElementById('saleCartQuickCustomContainer');
    if (customContainer) {
        if (type === 'custom') {
            customContainer.classList.remove('hidden');
            customContainer.classList.add('inline-flex');
            const customInput = document.getElementById('saleCartQuickCustomPrice');
            if (customInput) {
                customInput.focus();
                customInput.select();
            }
        } else {
            customContainer.classList.add('hidden');
            customContainer.classList.remove('inline-flex');
        }
    }
    if (window.lucide) window.lucide.createIcons();
};

window.addSaleCartItemFromQuickBar = function () {
    const productSelect = document.getElementById('saleCartProductSelect');
    const qtyInput = document.getElementById('saleCartQuickQty');
    const priceTypeInput = document.getElementById('saleCartQuickPriceType');
    const customPriceInput = document.getElementById('saleCartQuickCustomPrice');

    if (!productSelect || !productSelect.value) {
        showToast('Please select a product or service offering', 'warning');
        return;
    }
    const productId = productSelect.value;
    const qty = parseFloat(qtyInput?.value) || 1;
    const priceType = priceTypeInput?.value || 'retail';
    const customPrice = priceType === 'custom' ? (customPriceInput?.value || null) : null;

    window.addSaleCartItem(productId, qty, priceType, customPrice);

    if (qtyInput) qtyInput.value = '1';
    if (typeof window.selectPremiumOption === 'function') {
        window.selectPremiumOption('saleCartProductSelect', '', 'Select item or service...');
    } else {
        productSelect.value = '';
    }
    const priceRow = document.getElementById('saleCartQuickPriceRow');
    if (priceRow) priceRow.classList.add('hidden');
};

window.addSaleCartItem = function (productId, qty = 1, priceType = 'retail', customPrice = null) {
    if (!productId) return;
    const priceInfo = window._salePriceMap?.[productId];
    if (!priceInfo) {
        showToast('Item details not found', 'warning');
        return;
    }

    const isService = priceInfo.item_type === 'service';
    const availableStock = Number(priceInfo.quantity || 0);

    // Guard: Prevent adding 0 stock physical items
    if (!isService && availableStock <= 0) {
        showToast(`"${priceInfo.name}" is out of stock (0 available).`, 'warning');
        return;
    }

    let unitPrice = priceInfo.retail || 0;
    if (priceType === 'wholesale') {
        unitPrice = priceInfo.wholesale || 0;
    } else if (priceType === 'custom') {
        const parsedCustom = customPrice !== null ? parseFloat(String(customPrice).replace(/,/g, '')) : null;
        unitPrice = (parsedCustom !== null && !isNaN(parsedCustom)) ? parsedCustom : (priceInfo.retail || 0);
    }

    const existingIdx = window._activeSaleCart.findIndex(i => i.productId === productId);
    if (existingIdx >= 0) {
        const item = window._activeSaleCart[existingIdx];
        if (!isService && item.qty >= availableStock) {
            showToast(`Maximum stock limit reached for ${item.name} (${availableStock} in stock).`, 'warning');
            return;
        }
        item.qty = !isService ? Math.min(availableStock, item.qty + qty) : (item.qty + qty);
        item.price_type = priceType;
        item.unitPrice = unitPrice;
        if (priceType === 'custom') item.customPrice = unitPrice;
        item.subtotal = item.unitPrice * item.qty;
        showToast(`Updated ${item.name} (${item.qty}x in basket)`, 'info');
    } else {
        const initialQty = !isService ? Math.min(availableStock, Math.max(1, qty)) : Math.max(1, qty);
        window._activeSaleCart.push({
            productId: productId,
            name: priceInfo.name || 'Item',
            item_type: priceInfo.item_type || 'product',
            availableStock: availableStock,
            price_type: priceType,
            unitPrice: unitPrice,
            customPrice: priceType === 'custom' ? unitPrice : null,
            retailPrice: priceInfo.retail || 0,
            wholesalePrice: priceInfo.wholesale || 0,
            qty: initialQty,
            subtotal: unitPrice * initialQty
        });
        showToast(`Added ${priceInfo.name} to basket`, 'success');
    }

    window.renderSaleCartTable();
};

window.updateSaleCartItemQty = function (index, newQty) {
    if (!window._activeSaleCart[index]) return;
    const item = window._activeSaleCart[index];
    const isService = item.item_type === 'service';
    let parsed = Math.max(1, parseFloat(newQty) || 1);
    if (!isService) {
        if (parsed > item.availableStock) {
            parsed = Math.max(1, item.availableStock);
            showToast(`Only ${item.availableStock} units available for ${item.name}`, 'warning');
        }
    }
    item.qty = parsed;
    item.subtotal = item.unitPrice * item.qty;
    window.renderSaleCartTable();
};

window.updateSaleCartItemPriceType = function (index, priceType) {
    if (!window._activeSaleCart[index]) return;
    const item = window._activeSaleCart[index];
    item.price_type = priceType;
    if (priceType === 'wholesale') {
        item.unitPrice = item.wholesalePrice;
    } else if (priceType === 'retail') {
        item.unitPrice = item.retailPrice;
    } else if (priceType === 'custom') {
        if (!item.customPrice && item.customPrice !== 0) {
            item.customPrice = item.unitPrice || item.retailPrice || 0;
        }
        item.unitPrice = item.customPrice;
    }
    item.subtotal = item.unitPrice * item.qty;
    window.renderSaleCartTable();
};

window.updateSaleCartItemCustomPrice = function (index, customPrice) {
    if (!window._activeSaleCart[index]) return;
    const item = window._activeSaleCart[index];
    item.price_type = 'custom';
    const parsed = Math.max(0, parseFloat(String(customPrice).replace(/,/g, '')) || 0);
    item.customPrice = parsed;
    item.unitPrice = parsed;
    item.subtotal = item.unitPrice * item.qty;
    
    // Live update subtotal and grand total in DOM
    const lineSubtotalEl = document.getElementById(`cartItemSubtotal_${index}`);
    if (lineSubtotalEl) {
        lineSubtotalEl.textContent = window.fmt.currency(item.subtotal);
    }
    const grandTotalEl = document.getElementById('saleCartGrandTotalText');
    const grandTotal = window._activeSaleCart.reduce((sum, i) => sum + i.subtotal, 0);
    if (grandTotalEl) grandTotalEl.textContent = window.fmt.currency(grandTotal);

    const submitBtnText = document.getElementById('saleSubmitBtnText');
    if (window._activeSaleMode === 'cart' && submitBtnText) {
        const distinctCount = window._activeSaleCart.length;
        submitBtnText.textContent = distinctCount > 0 
            ? `Record Batch Sale (${distinctCount} items • ${window.fmt.currency(grandTotal)})` 
            : 'Record Batch Sale';
    }
};

window.removeSaleCartItem = function (index) {
    if (!window._activeSaleCart[index]) return;
    const removed = window._activeSaleCart.splice(index, 1);
    if (removed && removed[0]) showToast(`Removed ${removed[0].name}`, 'info');
    window.renderSaleCartTable();
};

window.clearSaleCart = function () {
    window._activeSaleCart = [];
    window.renderSaleCartTable();
    showToast('Basket cleared', 'info');
};

window.renderSaleCartTable = function () {
    const listContainer = document.getElementById('saleCartItemsList');
    const badgeEl = document.getElementById('saleCartBadge');
    const submitBtnText = document.getElementById('saleSubmitBtnText');
    const grandTotalEl = document.getElementById('saleCartGrandTotalText');
    const distinctCountEl = document.getElementById('saleCartDistinctCount');
    const totalUnitsEl = document.getElementById('saleCartTotalUnits');

    const distinctCount = window._activeSaleCart.length;
    const totalUnits = window._activeSaleCart.reduce((sum, i) => sum + i.qty, 0);
    const grandTotal = window._activeSaleCart.reduce((sum, i) => sum + i.subtotal, 0);

    if (badgeEl) {
        badgeEl.textContent = distinctCount;
        badgeEl.classList.toggle('hidden', distinctCount === 0);
    }
    if (grandTotalEl) grandTotalEl.textContent = window.fmt.currency(grandTotal);
    if (distinctCountEl) distinctCountEl.textContent = `${distinctCount} item${distinctCount !== 1 ? 's' : ''}`;
    if (totalUnitsEl) totalUnitsEl.textContent = `${totalUnits} unit${totalUnits !== 1 ? 's' : ''}`;

    if (window._activeSaleMode === 'cart' && submitBtnText) {
        submitBtnText.textContent = distinctCount > 0 
            ? `Record Batch Sale (${distinctCount} items • ${window.fmt.currency(grandTotal)})` 
            : 'Record Batch Sale';
    }

    if (!listContainer) return;

    if (distinctCount === 0) {
        listContainer.innerHTML = `
            <div class="p-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-700/80 rounded-2xl bg-gray-50/50 dark:bg-gray-800/20 text-gray-400 dark:text-gray-500 text-xs font-bold flex flex-col items-center justify-center gap-2.5">
                <div class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                    <i data-lucide="shopping-cart" class="w-6 h-6"></i>
                </div>
                <div>
                    <p class="text-sm font-black text-gray-700 dark:text-gray-300">Your Basket is Empty</p>
                    <p class="text-[11px] font-normal text-gray-400 dark:text-gray-500 mt-0.5">Scan product barcodes or use the selector above to add items to this batch sale.</p>
                </div>
            </div>`;
    } else {
        listContainer.innerHTML = window._activeSaleCart.map((item, idx) => {
            const isService = item.item_type === 'service';
            const isStockExceeded = !isService && item.qty > item.availableStock;
            return `
            <div class="p-3 sm:p-3.5 bg-white dark:bg-gray-800 rounded-2xl border ${isStockExceeded ? 'border-rose-300 dark:border-rose-800 bg-rose-50/20' : 'border-gray-200/90 dark:border-gray-700/80'} shadow-2xs space-y-2.5 transition-all">
                <div class="flex items-start justify-between gap-2.5">
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="text-xs sm:text-sm font-black text-gray-900 dark:text-white truncate">${item.name}</span>
                            <span class="px-2 py-0.5 rounded-md text-[9.5px] font-bold uppercase tracking-wider ${isService ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300' : 'bg-slate-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'}">
                                ${isService ? 'Service' : 'Product'}
                            </span>
                            ${!isService ? `
                            <span class="text-[10.5px] font-bold ${item.availableStock <= 5 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}">
                                (${item.availableStock} in stock)
                            </span>` : ''}
                        </div>
                        ${isStockExceeded ? `
                        <p class="text-[10px] font-bold text-rose-600 dark:text-rose-400 mt-0.5 flex items-center gap-1">
                            <i data-lucide="alert-circle" class="w-3 h-3"></i>
                            <span>Requested qty (${item.qty}) exceeds available stock (${item.availableStock})</span>
                        </p>` : ''}
                    </div>

                    <!-- Delete Row Button -->
                    <button type="button" onclick="window.removeSaleCartItem(${idx})" class="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer shrink-0" title="Remove Item">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>

                <!-- Controls Row: Price Type + Quantity + Subtotal -->
                <div class="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-gray-100 dark:border-gray-700/60">
                    <!-- Price Type Selector & Custom Price Input -->
                    <div class="flex items-center gap-2 flex-wrap">
                        ${item.item_type === 'service' ? `
                        <div class="inline-flex items-center p-0.5 bg-gray-100 dark:bg-gray-700/60 rounded-xl border border-gray-200/80 dark:border-gray-600 shrink-0 text-[10px] font-bold">
                            <button type="button" onclick="window.updateSaleCartItemPriceType(${idx}, 'retail')"
                                class="px-2 py-1 rounded-lg transition-all cursor-pointer ${item.price_type === 'retail' ? 'bg-purple-600 text-white font-black shadow-2xs' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'}">
                                Standard Fee (${window.fmt.number(item.retailPrice)})
                            </button>
                            <button type="button" onclick="window.updateSaleCartItemPriceType(${idx}, 'custom')"
                                class="px-2 py-1 rounded-lg transition-all cursor-pointer ${item.price_type === 'custom' ? 'bg-amber-600 text-white font-black shadow-2xs' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'}">
                                ${window.t('custom', 'Custom')}
                            </button>
                        </div>
                        ` : `
                        <div class="inline-flex items-center p-0.5 bg-gray-100 dark:bg-gray-700/60 rounded-xl border border-gray-200/80 dark:border-gray-600 shrink-0 text-[10px] font-bold">
                            <button type="button" onclick="window.updateSaleCartItemPriceType(${idx}, 'retail')"
                                class="px-2 py-1 rounded-lg transition-all cursor-pointer ${item.price_type === 'retail' ? 'bg-emerald-600 text-white font-black shadow-2xs' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'}">
                                ${window.t('retail', 'Retail')} (${window.fmt.number(item.retailPrice)})
                            </button>
                            <button type="button" onclick="window.updateSaleCartItemPriceType(${idx}, 'wholesale')"
                                class="px-2 py-1 rounded-lg transition-all cursor-pointer ${item.price_type === 'wholesale' ? 'bg-indigo-600 text-white font-black shadow-2xs' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'}">
                                ${window.t('wholesale', 'Wholesale')} (${window.fmt.number(item.wholesalePrice)})
                            </button>
                            <button type="button" onclick="window.updateSaleCartItemPriceType(${idx}, 'custom')"
                                class="px-2 py-1 rounded-lg transition-all cursor-pointer ${item.price_type === 'custom' ? 'bg-amber-600 text-white font-black shadow-2xs' : 'text-gray-500 hover:text-gray-800 dark:text-gray-400'}">
                                ${window.t('custom', 'Custom')}
                            </button>
                        </div>
                        `}

                        ${item.price_type === 'custom' ? `
                        <div class="inline-flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl px-2 py-1 animate-in fade-in duration-150">
                            <span class="text-[10px] text-amber-700 dark:text-amber-300 font-black uppercase tracking-tight">${window.t('custom_price', 'Custom Price')}:</span>
                            <div class="relative inline-flex items-center">
                                <input type="text" inputmode="decimal" id="cartItemCustomPriceInput_${idx}" value="${window.fmt.number(item.unitPrice)}" 
                                    oninput="window.updateSaleCartItemCustomPrice(${idx}, this.value)" 
                                    class="w-24 text-xs font-black py-0.5 px-2 rounded-lg bg-white dark:bg-gray-900 border border-amber-400 dark:border-amber-600 text-amber-900 dark:text-amber-100 number-format outline-none focus:ring-1 focus:ring-amber-500" placeholder="0">
                            </div>
                        </div>` : ''}
                    </div>

                    <!-- Quantity Stepper & Subtotal -->
                    <div class="flex items-center gap-3 shrink-0 ml-auto">
                        <div class="flex items-center gap-1 shrink-0">
                            <button type="button" onclick="window.updateSaleCartItemQty(${idx}, ${item.qty - 1})" class="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 font-black text-xs flex items-center justify-center cursor-pointer active:scale-95 transition-all text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600">-</button>
                            <input type="number" min="1" value="${item.qty}" onchange="window.updateSaleCartItemQty(${idx}, this.value)" class="w-14 text-center text-xs font-black py-1 px-1 rounded-lg bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white">
                            <button type="button" onclick="window.updateSaleCartItemQty(${idx}, ${item.qty + 1})" class="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 font-black text-xs flex items-center justify-center cursor-pointer active:scale-95 transition-all text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600">+</button>
                        </div>

                        <!-- Line Subtotal -->
                        <div class="text-right shrink-0 min-w-[70px]">
                            <span id="cartItemSubtotal_${idx}" class="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400">${window.fmt.currency(item.subtotal)}</span>
                        </div>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    if (window.lucide) lucide.createIcons();
};

window.handleAddSale = async function (e) {
    e.preventDefault();
    const isCartMode = window._activeSaleMode === 'cart';
    const btnLabel = isCartMode ? 'Record Batch Sale' : 'Record Sale';
    _setSubmitLoading(e.target, true, btnLabel);

    try {
        const customer = document.getElementById('saleCustomer')?.value || 'Walk-in Customer';
        const clientTxId = crypto.randomUUID();
        let salePayload = null;

        if (isCartMode) {
            // Validate cart items
            if (!window._activeSaleCart || window._activeSaleCart.length === 0) {
                showToast('Please add at least one item to the basket before recording sale.', 'warning');
                _setSubmitLoading(e.target, false, btnLabel);
                return;
            }

            // Check stock constraints
            const stockErrors = window._activeSaleCart.filter(i => i.item_type !== 'service' && i.qty > i.availableStock);
            if (stockErrors.length > 0) {
                const names = stockErrors.map(i => `${i.name} (has ${i.availableStock}, requested ${i.qty})`).join(', ');
                showToast(`Insufficient stock: ${names}`, 'error');
                _setSubmitLoading(e.target, false, btnLabel);
                return;
            }

            const payment = document.getElementById('saleCartPayment')?.value || 'cash';
            const totalAmount = window._activeSaleCart.reduce((sum, i) => sum + i.subtotal, 0);
            const totalUnits = window._activeSaleCart.reduce((sum, i) => sum + i.qty, 0);
            const itemsSummary = window._activeSaleCart.map(i => `${i.qty}x ${i.name}`).join(', ');

            const firstItemPriceType = window._activeSaleCart[0]?.price_type;
            const validPriceType = ['retail', 'wholesale', 'custom'].includes(firstItemPriceType) ? firstItemPriceType : 'retail';

            salePayload = {
                customer,
                items: itemsSummary,
                amount: totalAmount,
                payment,
                productId: window._activeSaleCart[0]?.productId || null,
                qty: totalUnits,
                price_type: validPriceType,
                item_type: window._activeSaleCart[0]?.item_type || 'product',
                cart_items: window._activeSaleCart.map(i => ({
                    product_id: i.productId,
                    name: i.name,
                    qty: i.qty,
                    unit_price: i.unitPrice,
                    price_type: i.price_type,
                    item_type: i.item_type,
                    subtotal: i.subtotal
                }))
            };
        } else {
            // Single Item Mode
            const rawAmount = document.getElementById('saleAmount')?.value;
            const amount = fmt.parseNumber(rawAmount);
            const qty = fmt.parseNumber(document.getElementById('saleQty')?.value) || 1;

            if (!rawAmount || isNaN(amount) || amount <= 0) {
                showToast('Please enter a valid sale amount or select a product.', 'warning');
                _setSubmitLoading(e.target, false, btnLabel);
                return;
            }

            const payment = document.getElementById('salePayment')?.value || 'cash';
            const price_type = document.getElementById('salePriceType')?.value || 'retail';

            const productInput = document.getElementById('saleProduct');
            let items = '';
            let productId = null;
            let item_type = 'product';

            if (productInput && productInput.value) {
                productId = productInput.value;
                const priceInfo = window._salePriceMap?.[productId];
                const pName = priceInfo?.name || 'Item';
                item_type = priceInfo?.item_type || 'product';
                items = `${qty}x ${pName}`;

                // Guard physical items with insufficient stock (services are completely exempt)
                if (item_type !== 'service' && Number(priceInfo?.quantity || 0) < qty) {
                    showToast(`Insufficient stock: only ${priceInfo?.quantity || 0} available for "${pName}".`, 'error');
                    _setSubmitLoading(e.target, false, btnLabel);
                    return;
                }
            } else {
                items = 'Custom Item';
                item_type = 'product';
            }

            salePayload = { customer, items, amount, payment, productId, qty, price_type, item_type };
        }

        const canSaleDirect = state.role === 'owner' || state.role === 'sysadmin' || (window.branchCanDo ? branchCanDo('sales_add') : true);

        if (!canSaleDirect) {
            const requestPayload = {
                branch_id: state.branchId,
                owner_id: state.ownerId || state.profile?.id,
                type: 'sales_add',
                subject: `Sale Approval Request: ${fmt.currency(salePayload.amount)} (${customer})`,
                message: `Branch requested approval to record sale of ${salePayload.items || 'Items'}. Payment: ${salePayload.payment}. Total: ${fmt.currency(salePayload.amount)}.`,
                metadata: {
                    ...salePayload,
                    client_tx_id: clientTxId
                },
                priority: 'high',
                status: 'pending'
            };

            try {
                _setSubmitLoading(e.target, true, 'Submitting for Approval...');
                await dbRequests.add(requestPayload);
                showToast('Sale submitted for owner approval!', 'success');
                if (window.clearFormDraft) window.clearFormDraft('addSale');
                closeModal();
                if (window.renderBranchRequestsList) renderBranchRequestsList();
                if (typeof switchView === 'function') switchView('requests');
            } catch (reqErr) {
                showToast('Failed to submit sale for approval: ' + reqErr.message, 'error');
            } finally {
                _setSubmitLoading(e.target, false, btnLabel);
            }
            return;
        }

        if (!navigator.onLine) {
            window.queueOfflineSale({ ...salePayload, client_tx_id: clientTxId });
            if (window.clearFormDraft) window.clearFormDraft('addSale');
            closeModal();
            const branch = (state.branches || []).find(b => b.id === state.branchId) || { name: 'Branch' };
            if (typeof addActivity === 'function') addActivity('sale', `New sale (Offline) to ${customer} `, branch.name, salePayload.amount);
            switchView('sales');
            return;
        }

        try {
            await dbSales.add(state.branchId, salePayload, clientTxId);
            if (window.clearFormDraft) window.clearFormDraft('addSale');
            closeModal();
            const branch = (state.branches || []).find(b => b.id === state.branchId) || { name: 'Branch' };
            if (typeof addActivity === 'function') addActivity('sale', `New sale to ${customer} `, branch.name, salePayload.amount);
            showToast(`Sale of ${fmt.currency(salePayload.amount)} recorded!`, 'success');
            switchView('sales');
        } catch (dbErr) {
            const isNetworkError = !navigator.onLine || 
                (dbErr && dbErr.message && (
                    dbErr.message.toLowerCase().includes('fetch') ||
                    dbErr.message.toLowerCase().includes('network') ||
                    dbErr.message.toLowerCase().includes('offline') ||
                    dbErr.message.toLowerCase().includes('failed')
                ));

            if (isNetworkError) {
                window.queueOfflineSale({ ...salePayload, client_tx_id: clientTxId });
                closeModal();
                const branch = (state.branches || []).find(b => b.id === state.branchId) || { name: 'Branch' };
                if (typeof addActivity === 'function') addActivity('sale', `New sale (Offline) to ${customer} `, branch.name, salePayload.amount);
                switchView('sales');
                return;
            }
            throw dbErr;
        }
    } catch (err) {
        showToast('Failed to record sale: ' + err.message, 'error');
        _setSubmitLoading(e.target, false, btnLabel);
    }
};

window.toggleSaleCustomerDropdown = function (show) {
    const list = document.getElementById('saleCustomerListContainer');
    if (!list) return;
    if (show) {
        list.classList.remove('hidden');
        lucide.createIcons();
    } else {
        setTimeout(() => list.classList.add('hidden'), 200);
    }
};

window.filterSaleCustomers = function (query) {
    const container = document.getElementById('saleCustomerListContainer');
    if (!container) return;
    const items = container.querySelectorAll('.customer-item');
    const q = query.toLowerCase();

    let hasResults = false;
    items.forEach(item => {
        const name = item.getAttribute('data-name');
        if (name && name.includes(q)) {
            item.classList.remove('hidden');
            hasResults = true;
        } else {
            item.classList.add('hidden');
        }
    });

    const empty = document.getElementById('saleCustomerEmpty');
    if (empty) {
        if (!hasResults && q) {
            empty.classList.remove('hidden');
        } else {
            empty.classList.add('hidden');
        }
    }

    container.classList.remove('hidden');
};

window.selectSaleCustomer = function (name, phone) {
    const input = document.getElementById('saleCustomer');
    if (input) input.value = name;
    window.toggleSaleCustomerDropdown(false);
};

document.addEventListener('mousedown', (e) => {
    const dropdown = document.getElementById('saleCustomerDropdown');
    const list = document.getElementById('saleCustomerListContainer');
    if (dropdown && list && !dropdown.contains(e.target)) {
        list.classList.add('hidden');
    }
});

window.handleAddExpense = async function (e) {
    e.preventDefault();
    _setSubmitLoading(e.target, true, 'Add Expense');
    try {
        const amount = fmt.parseNumber(document.getElementById('expenseAmount').value);
        const category = document.getElementById('expenseCategory').value;
        const description = document.getElementById('expenseDesc').value;
        const payload = { branch_id: state.branchId, category, description, amount };

        const canExpenseDirect = state.role === 'owner' || state.role === 'sysadmin' || (window.branchCanDo ? branchCanDo('expenses_add') : true);

        if (!canExpenseDirect) {
            const requestPayload = {
                branch_id: state.branchId,
                owner_id: state.ownerId || state.profile?.id,
                type: 'expenses_add',
                subject: `Expense Approval Request: ${fmt.currency(amount)} (${category})`,
                message: `Branch requested approval for expense: ${description || category}. Category: ${category}. Amount: ${fmt.currency(amount)}.`,
                metadata: payload,
                priority: 'medium',
                status: 'pending'
            };

            try {
                await dbRequests.add(requestPayload);
                showToast('Expense submitted for owner approval!', 'success');
                closeModal();
                if (window.renderBranchRequestsList) renderBranchRequestsList();
                if (typeof switchView === 'function') switchView('requests');
            } catch (reqErr) {
                showToast('Failed to submit expense for approval: ' + reqErr.message, 'error');
            } finally {
                _setSubmitLoading(e.target, false, 'Add Expense');
            }
            return;
        }

        if (!navigator.onLine) {
            await window.queueOfflineOperation('expenses', payload);
            if (window.clearFormDraft) window.clearFormDraft('addExpense');
            closeModal();
            const branch = (state.branches || []).find(b => b.id === state.branchId) || { name: 'Branch' };
            if (typeof addActivity === 'function') addActivity('expense', `Expense (Offline): ${description} `, branch.name, amount);
            switchView('expenses');
            return;
        }

        try {
            await dbExpenses.add(state.branchId, payload);
            if (window.clearFormDraft) window.clearFormDraft('addExpense');
            closeModal();
            const branch = (state.branches || []).find(b => b.id === state.branchId) || { name: 'Branch' };
            if (typeof addActivity === 'function') addActivity('expense', `Expense: ${description} `, branch.name, amount);
            showToast(`Expense of ${fmt.currency(amount)} recorded!`, 'success');
            switchView('expenses');
        } catch (netErr) {
            console.warn('[AddExpense] Network failed, queueing offline:', netErr);
            await window.queueOfflineOperation('expenses', payload);
            if (window.clearFormDraft) window.clearFormDraft('addExpense');
            closeModal();
            switchView('expenses');
        }
    } catch (err) {
        showToast('Failed to record expense: ' + err.message, 'error');
        _setSubmitLoading(e.target, false, 'Add Expense');
    }
};

window.handleAddCustomer = async function (e) {
    e.preventDefault();
    _setSubmitLoading(e.target, true, 'Add Customer');
    try {
        const name = document.getElementById('customerName').value;
        const phone = document.getElementById('customerPhone').value;
        const email = document.getElementById('customerEmail').value;
        const address = document.getElementById('customerAddress').value;
        const payload = { branch_id: state.branchId, name, phone, email, address };

        const canCustomerDirect = state.role === 'owner' || state.role === 'sysadmin' || (window.branchCanDo ? branchCanDo('customers_add') : true);

        if (!canCustomerDirect) {
            const requestPayload = {
                branch_id: state.branchId,
                owner_id: state.ownerId || state.profile?.id,
                type: 'customers_add',
                subject: `New Customer Request: ${name}`,
                message: `Branch requested to add customer ${name}. Phone: ${phone || 'N/A'}. Email: ${email || 'N/A'}.`,
                metadata: payload,
                priority: 'medium',
                status: 'pending'
            };

            try {
                await dbRequests.add(requestPayload);
                showToast('Customer addition submitted for owner approval!', 'success');
                if (window.clearFormDraft) window.clearFormDraft('addCustomer');
                closeModal();
                if (window.renderBranchRequestsList) renderBranchRequestsList();
                if (typeof switchView === 'function') switchView('requests');
            } catch (reqErr) {
                showToast('Failed to submit customer for approval: ' + reqErr.message, 'error');
            } finally {
                _setSubmitLoading(e.target, false, 'Add Customer');
            }
            return;
        }

        if (!navigator.onLine) {
            await window.queueOfflineOperation('customers', payload);
            if (window.clearFormDraft) window.clearFormDraft('addCustomer');
            closeModal();
            switchView('customers');
            return;
        }

        try {
            await dbCustomers.add(state.branchId, payload);
            if (window.clearFormDraft) window.clearFormDraft('addCustomer');
            closeModal();
            showToast('Customer added successfully!', 'success');
            switchView('customers');
        } catch (netErr) {
            console.warn('[AddCustomer] Network failed, queueing offline:', netErr);
            await window.queueOfflineOperation('customers', payload);
            if (window.clearFormDraft) window.clearFormDraft('addCustomer');
            closeModal();
            switchView('customers');
        }
    } catch (err) {
        showToast('Failed to add customer: ' + err.message, 'error');
        _setSubmitLoading(e.target, false, 'Add Customer');
    }
};


window.handleResetManagerPassword = async function (e, branchId) {
    e.preventDefault();
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    if (newPassword !== confirmPassword) { showToast('Passwords do not match!', 'error'); return; }
    if (newPassword.length < 6) { showToast('Password must be at least 6 characters', 'error'); return; }
    _setSubmitLoading(e.target, true, 'Reset Password');
    try {
        await dbBranches.updateManagerPassword(branchId, newPassword);
        if (window.clearFormDraft) window.clearFormDraft('resetPassword');
        closeModal();
        const branch = state.branches.find(b => b.id === branchId);
        showToast(`Manager password for ${branch?.name || 'branch'} reset successfully!`, 'success');
    } catch (err) {
        showToast('Failed to reset password: ' + err.message, 'error');
    } finally {
        _setSubmitLoading(e.target, false, 'Reset Password');
    }
};

window.handleAddBranch = async function (e) {
    e.preventDefault();
    _setSubmitLoading(e.target, true, 'Create Branch');
    try {
        const name = document.getElementById('branchName').value.trim();
        const location = document.getElementById('branchLocation').value.trim();
        const manager = document.getElementById('branchManager').value.trim();
        const email = document.getElementById('branchEmail').value.trim();
        const password = document.getElementById('branchPassword').value;
        const target = fmt.parseNumber(document.getElementById('branchTarget').value) || 10000;
        const currency = document.getElementById('branchCurrency').value;

        if (!name || !location || !email || !password) {
            showToast('Please fill all required fields!', 'error');
            _setSubmitLoading(e.target, false, 'Create Branch');
            return;
        }

        const branch = await dbBranches.createAdmin({
            name,
            location,
            manager,
            email,
            password,
            target,
            currency
        });

        if (window.clearFormDraft) window.clearFormDraft('addBranch');
        closeModal();
        showToast(`Branch "${branch.name}" created successfully!`, 'success');

        if (typeof renderBranchesModule === 'function') {
            renderBranchesModule();
        } else {
            switchView('branches');
        }

        setTimeout(() => {
            if (typeof openDetailsModal === 'function') {
                openDetailsModal('branch', branch.id);
            }
        }, 300);
    } catch (err) {
        showToast('Failed to add branch: ' + err.message, 'error');
        _setSubmitLoading(e.target, false, 'Create Branch');
    }
};

window.handleEditBranch = async function (e, branchId) {
    e.preventDefault();
    _setSubmitLoading(e.target, true, 'Save Changes');
    try {
        const payload = {
            name: document.getElementById('editBranchName').value.trim(),
            location: document.getElementById('editBranchLocation').value.trim(),
            manager: document.getElementById('editBranchManager').value.trim(),
            target: fmt.parseNumber(document.getElementById('editBranchTarget').value) || 10000,
            currency: document.getElementById('editBranchCurrency').value
        };

        const updatedBranch = await dbBranches.updateAdmin(branchId, payload);

        const index = state.branches.findIndex(b => b.id === branchId);
        if (index !== -1) {
            state.branches[index] = { ...state.branches[index], ...updatedBranch };
        }

        closeModal();
        showToast('Branch updated successfully!', 'success');
        switchView('branches');
    } catch (err) {
        showToast('Failed to edit branch: ' + err.message, 'error');
        _setSubmitLoading(e.target, false, 'Save Changes');
    }
};

window.handleAddNote = async function (e) {
    e.preventDefault();
    _setSubmitLoading(e.target, true, 'Save Note');
    try {
        const title = document.getElementById('noteTitle').value;
        const content = document.getElementById('noteContent').value;
        const tag = document.getElementById('noteTag').value;
        const payload = { branch_id: state.branchId, title, content, tag };

        if (!navigator.onLine) {
            await window.queueOfflineOperation('notes', payload);
            if (window.clearFormDraft) window.clearFormDraft('addNote');
            closeModal();
            switchView('notes');
            return;
        }

        try {
            await dbNotes.add(state.branchId, payload);
            if (window.clearFormDraft) window.clearFormDraft('addNote');
            closeModal();
            showToast('Note saved!', 'success');
            switchView('notes');
        } catch (netErr) {
            console.warn('[AddNote] Network failed, queueing offline:', netErr);
            await window.queueOfflineOperation('notes', payload);
            if (window.clearFormDraft) window.clearFormDraft('addNote');
            closeModal();
            switchView('notes');
        }
    } catch (err) {
        showToast('Failed to save note: ' + err.message, 'error');
        _setSubmitLoading(e.target, false, 'Save Note');
    }
};

window.handleAddLoan = async function (e) {
    e.preventDefault();
    _setSubmitLoading(e.target, true, 'Save Record');
    try {
        const type = document.getElementById('loanType').value;
        const party = document.getElementById('loanParty').value || 'Unknown';
        const amount = fmt.parseNumber(document.getElementById('loanAmount').value);
        const notes = document.getElementById('loanNotes').value;
        const payload = { branch_id: state.branchId, type, party, amount, notes };

        if (!navigator.onLine) {
            await window.queueOfflineOperation('loans', payload);
            if (window.clearFormDraft) window.clearFormDraft('addLoan');
            closeModal();
            switchView('loans');
            return;
        }

        try {
            await dbLoans.add(state.branchId, payload);
            if (window.clearFormDraft) window.clearFormDraft('addLoan');
            closeModal();
            showToast('Record saved!', 'success');
            switchView('loans');
        } catch (netErr) {
            console.warn('[AddLoan] Network failed, queueing offline:', netErr);
            await window.queueOfflineOperation('loans', payload);
            if (window.clearFormDraft) window.clearFormDraft('addLoan');
            closeModal();
            switchView('loans');
        }
    } catch (err) {
        showToast('Failed to save record: ' + err.message, 'error');
        _setSubmitLoading(e.target, false, 'Save Record');
    }
};

window.toggleBranchAddInvType = function (type) {
    const isService = type === 'service';
    const canAddDirect = window.branchCanDo && branchCanDo('inventory_update');

    const skuContainer = document.getElementById('itemSkuContainer');
    const skuCategoryGrid = document.getElementById('skuCategoryGrid');
    const qtyContainer = document.getElementById('itemQtyContainer');
    const minThresholdContainer = document.getElementById('itemMinThresholdContainer');
    const supplierContainer = document.getElementById('itemSupplierContainer');
    const wholesaleWrapper = document.getElementById('itemWholesaleWrapper');
    const wholesaleRetailHelp = document.getElementById('itemWholesaleRetailHelp');
    const retailPrefix = document.getElementById('itemRetailPrefix');
    const retailPriceInput = document.getElementById('itemRetailPrice');
    const pricesQtyGrid = document.getElementById('itemPricesQtyGrid');
    const financialTitle = document.getElementById('invFinancialDetailsTitle');
    const costLabel = document.getElementById('itemCostLabel');
    const sellingPricesLabel = document.getElementById('itemSellingPricesLabel');
    const itemNameLabel = document.getElementById('itemNameLabel');
    const itemNameInput = document.getElementById('itemName');
    const modalTitle = document.getElementById('invModalTitle');
    const modalSubtitle = document.getElementById('invModalSubtitle');
    const submitBtn = document.getElementById('invSubmitBtn');
    const iconWrap = document.getElementById('invModalIconWrap');

    if (skuContainer) skuContainer.classList.toggle('hidden', isService);
    if (skuCategoryGrid) {
        skuCategoryGrid.classList.toggle('grid-cols-2', !isService);
        skuCategoryGrid.classList.toggle('grid-cols-1', isService);
    }
    if (qtyContainer) qtyContainer.classList.toggle('hidden', isService);
    if (minThresholdContainer) minThresholdContainer.classList.toggle('hidden', isService);
    if (supplierContainer) supplierContainer.classList.toggle('hidden', isService);
    if (wholesaleWrapper) wholesaleWrapper.classList.toggle('hidden', isService);
    if (wholesaleRetailHelp) wholesaleRetailHelp.classList.toggle('hidden', isService);
    if (retailPrefix) retailPrefix.classList.toggle('hidden', isService);

    if (retailPriceInput) {
        retailPriceInput.classList.toggle('pl-10', !isService);
        retailPriceInput.placeholder = '0.00';
        retailPriceInput.title = isService ? 'Service Price (Charged to customer)' : 'Bei ya Rejareja / Retail Price';
    }

    if (pricesQtyGrid) {
        pricesQtyGrid.classList.toggle('grid-cols-3', !isService);
        pricesQtyGrid.classList.toggle('grid-cols-2', isService);
    }

    if (financialTitle) {
        financialTitle.textContent = isService ? 'Service Pricing & Cost Details' : 'Purchase & Supplier Details';
    }
    if (costLabel) {
        costLabel.textContent = isService ? 'Service Cost (Direct expense / consumables, optional)' : 'Unit Cost';
    }
    if (sellingPricesLabel) {
        sellingPricesLabel.textContent = isService ? 'Service Price (Charged to customer)' : 'Selling Prices';
    }
    if (itemNameLabel) {
        itemNameLabel.textContent = isService ? 'Service Name' : 'Item Name';
    }
    if (itemNameInput) {
        itemNameInput.placeholder = isService ? 'e.g. Consultation, Haircut, Device Repair' : 'e.g. Product A';
    }

    if (modalTitle) {
        modalTitle.textContent = canAddDirect
            ? (isService ? 'Add New Service' : 'Add New Stock')
            : (isService ? 'Request New Service' : 'Request New Stock');
    }
    if (modalSubtitle) {
        modalSubtitle.textContent = canAddDirect
            ? (isService ? 'Allowed — service will be added directly' : 'Allowed — will be added directly')
            : (isService ? 'Services require admin approval' : 'Additions require admin approval');
    }
    if (submitBtn) {
        submitBtn.textContent = canAddDirect
            ? (isService ? 'Add Service' : 'Add to Inventory')
            : (isService ? 'Submit Service Request' : 'Submit for Approval');
    }
    if (iconWrap) {
        iconWrap.innerHTML = `<i data-lucide="${isService ? 'wrench' : 'package-plus'}" class="w-5 h-5"></i>`;
        if (window.lucide) lucide.createIcons();
    }

    const qtyInput = document.getElementById('itemQty');
    const thresholdInput = document.getElementById('itemMinThreshold');
    const costInput = document.getElementById('itemCost');
    if (qtyInput) qtyInput.required = !isService;
    if (thresholdInput) thresholdInput.required = !isService;
    if (costInput) costInput.required = false;

    // Suggest default category for services if untouched
    const catInput = document.getElementById('itemCategory');
    if (catInput && isService && (!catInput.value || catInput.value === 'General')) {
        if (typeof window.setPremiumSelectValue === 'function') {
            window.setPremiumSelectValue('itemCategory', 'Services');
        } else {
            catInput.value = 'Services';
        }
    }
};

window.handleAddInventoryItem = async function (e) {
    if (e) e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');

    const itemType = document.querySelector('input[name="invItemType"]:checked')?.value || 'product';
    const isService = itemType === 'service';

    const name = document.getElementById('itemName').value?.trim();
    const category = document.getElementById('itemCategory')?.value || (isService ? 'Services' : 'General');
    const sku = isService
        ? (document.getElementById('itemSku')?.value?.trim() || (typeof window.generateAutoSKU === 'function' ? window.generateAutoSKU('Services', name) : `SVC-${Date.now().toString().slice(-6)}`))
        : (document.getElementById('itemSku')?.value?.trim() || (typeof window.generateAutoSKU === 'function' ? window.generateAutoSKU(category, name) : `PRD-${Date.now().toString().slice(-6)}`));

    const retailPrice = fmt.parseNumber(document.getElementById('itemRetailPrice')?.value) || 0;
    const wholesalePrice = isService ? retailPrice : (fmt.parseNumber(document.getElementById('itemWholesalePrice')?.value) || 0);
    const costPrice = fmt.parseNumber(document.getElementById('itemCost')?.value) || 0;

    const itemData = {
        branch_id: state.branchId,
        name,
        sku,
        category,
        item_type: itemType,
        retail_price: retailPrice,
        wholesale_price: wholesalePrice,
        price: retailPrice, // legacy compat
        quantity: isService ? 0 : (fmt.parseNumber(document.getElementById('itemQty')?.value) || 0),
        min_threshold: isService ? 0 : (fmt.parseNumber(document.getElementById('itemMinThreshold')?.value) || 10),
        cost_price: costPrice,
        supplier: isService ? null : (document.getElementById('itemSupplier')?.value || null),
        is_isolated: false,
        isolation_status: 'unregistered'
    };

    if (window.branchCanDo && branchCanDo('inventory_add')) {
        if (!navigator.onLine) {
            await window.queueOfflineOperation('inventory', itemData);
            if (window.clearFormDraft) window.clearFormDraft('addInventoryItem');
            closeModal();
            if (window.renderInventoryModule) renderInventoryModule();
            return;
        }

        try {
            _setSubmitLoading(btn, true, isService ? 'Adding Service...' : 'Adding...');
            await dbInventory.add(state.branchId, itemData);
            showToast(`${itemData.name} ${isService ? 'service' : 'item'} added to inventory!`, 'success');
            if (window.clearFormDraft) window.clearFormDraft('addInventoryItem');
            closeModal();
            if (window.renderInventoryModule) renderInventoryModule();
        } catch (err) {
            console.warn('[AddInventory] Network failed, queueing offline:', err);
            await window.queueOfflineOperation('inventory', itemData);
            if (window.clearFormDraft) window.clearFormDraft('addInventoryItem');
            closeModal();
            if (window.renderInventoryModule) renderInventoryModule();
        } finally {
            _setSubmitLoading(btn, false, isService ? 'Add Service' : 'Add to Inventory');
        }
        return;
    }

    const requestPayload = {
        branch_id: state.branchId,
        owner_id: state.ownerId || state.profile?.id,
        type: 'inventory_add',
        subject: isService ? `New Service Request: ${itemData.name}` : `New Stock Request: ${itemData.name}`,
        message: isService
            ? `Requesting to add service: ${itemData.name}. Service Price: ${fmt.currency(itemData.price)}. Service Cost: ${fmt.currency(itemData.cost_price || 0)}.`
            : `Requesting to add ${itemData.quantity} units of ${itemData.name}. Supplier: ${itemData.supplier || 'N/A'}. Total Cost Basis: ${fmt.currency(itemData.quantity * itemData.cost_price)}`,
        metadata: itemData,
        priority: 'medium',
        status: 'pending'
    };

    try {
        _setSubmitLoading(btn, true, 'Submitting...');
        await dbRequests.add(requestPayload);
        showToast(isService ? 'Service request submitted for approval!' : 'Stock addition request submitted for approval!', 'success');
        closeModal();
        if (window.renderInventoryModule) renderInventoryModule();
        if (window.renderBranchRequestsList) renderBranchRequestsList();
    } catch (err) {
        showToast('Failed to submit request: ' + err.message, 'error');
    } finally {
        _setSubmitLoading(btn, false, isService ? 'Submit Service Request' : 'Submit for Approval');
    }
};

window.handleRestockStock = async function (e, id) {
    if (e) e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');

    const restockData = {
        inventory_id: id,
        name: document.getElementById('restockName').value,
        quantity: fmt.parseNumber(document.getElementById('restockQty').value) || 0,
        cost_price: fmt.parseNumber(document.getElementById('restockCost').value) || 0,
        supplier: document.getElementById('restockSupplier').value
    };

    if (window.branchCanDo && branchCanDo('inventory_update')) {

        try {
            _setSubmitLoading(btn, true, 'Restocking...');

            const currentItem = await dbInventory.fetchOne(id);
            if (currentItem) {
                await dbInventory.updateQty(id, currentItem.quantity + restockData.quantity);
                showToast(`${restockData.name} restocked with ${restockData.quantity} units!`, 'success');
                closeModal();
                if (window.renderInventoryModule) renderInventoryModule();
            } else {
                showToast('Could not find inventory item.', 'error');
            }
        } catch (err) {
            showToast('Failed to restock: ' + err.message, 'error');
        } finally {
            _setSubmitLoading(btn, false, 'Restock Now');
        }
        return;
    }

    const requestPayload = {
        branch_id: state.branchId,
        owner_id: state.ownerId || state.profile?.id,
        type: 'inventory_update',
        subject: `Restock Request: ${restockData.name} `,
        message: `Requesting restock of ${restockData.quantity} units for ${restockData.name}.Supplier: ${restockData.supplier}.Cost: ${fmt.currency(restockData.quantity * restockData.cost_price)} `,
        metadata: restockData,
        priority: 'medium',
        status: 'pending'
    };

    try {
        _setSubmitLoading(btn, true, 'Submitting...');
        await dbRequests.add(requestPayload);
        showToast('Restock request submitted!', 'success');
        closeModal();
        if (window.renderBranchRequestsList) renderBranchRequestsList();
    } catch (err) {
        showToast('Failed to submit request: ' + err.message, 'error');
    } finally {
        _setSubmitLoading(btn, false, 'Submit Request');
    }
};

window.handleEditSale = async function (e, id) {
    e.preventDefault();
    _setSubmitLoading(e.target, true, 'Update Sale');
    try {
        const amount = fmt.parseNumber(document.getElementById('editSaleAmount').value);
        const customer = document.getElementById('editSaleCustomer').value;
        const items = document.getElementById('editSaleItems').value;
        const payment = document.getElementById('editSalePayment').value;
        await dbSales.update(id, { customer, items, amount, payment });
        closeModal();
        showToast('Sale updated successfully', 'success');
        switchView('sales');
    } catch (err) {
        showToast('Failed to update sale: ' + err.message, 'error');
        _setSubmitLoading(e.target, false, 'Update Sale');
    }
};

window.handleEditInventoryItem = async function (e, id) {
    e.preventDefault();
    if (state.role === 'branch' || state.role === 'cashier') {
        showToast('Only business owners can modify product master records. Please submit a restock/change request.', 'warning');
        closeModal();
        return;
    }
    _setSubmitLoading(e.target, true, 'Update Item');
    try {
        const name = document.getElementById('editItemName').value;
        const sku = document.getElementById('editItemSku').value;
        const category = document.getElementById('editItemCategory').value;
        const retail_price = fmt.parseNumber(document.getElementById('editItemRetailPrice').value);
        const wholesale_price = fmt.parseNumber(document.getElementById('editItemWholesalePrice').value);
        const quantity = parseInt(document.getElementById('editItemQty').value, 10);
        const min_threshold = parseInt(document.getElementById('editItemMinThreshold').value, 10);
        await dbInventory.update(id, { name, sku, category, retail_price, wholesale_price, price: retail_price, quantity, min_threshold });
        closeModal();
        showToast('Item updated successfully', 'success');
        switchView('inventory');
    } catch (err) {
        showToast('Failed to update item: ' + err.message, 'error');
        _setSubmitLoading(e.target, false, 'Update Item');
    }
};

window.handleEditNote = async function (e, id) {
    e.preventDefault();
    _setSubmitLoading(e.target, true, 'Update Note');
    try {
        const title = document.getElementById('editNoteTitle').value;
        const content = document.getElementById('editNoteContent').value;
        const tag = document.getElementById('editNoteTag').value;
        await dbNotes.update(id, { title, content, tag });
        closeModal();
        showToast('Note updated successfully', 'success');
        switchView('notes');
    } catch (err) {
        showToast('Failed to update note: ' + err.message, 'error');
        _setSubmitLoading(e.target, false, 'Update Note');
    }
};

window.handleEditExpense = async function (e, id) {
    e.preventDefault();
    _setSubmitLoading(e.target, true, 'Update Expense');
    try {
        const amount = fmt.parseNumber(document.getElementById('editExpenseAmount').value);
        const category = document.getElementById('editExpenseCategory').value;
        const description = document.getElementById('editExpenseDesc').value;
        await dbExpenses.update(id, { category, description, amount });
        closeModal();
        showToast('Expense updated successfully', 'success');
        switchView('expenses');
    } catch (err) {
        showToast('Failed to update expense: ' + err.message, 'error');
        _setSubmitLoading(e.target, false, 'Update Expense');
    }
};

window.handleEditCustomer = async function (e, id) {
    e.preventDefault();
    _setSubmitLoading(e.target, true, 'Update Customer');
    try {
        const name = document.getElementById('editCustomerName').value;
        const phone = document.getElementById('editCustomerPhone').value;
        const email = document.getElementById('editCustomerEmail').value;
        const address = document.getElementById('editCustomerAddress').value;
        await dbCustomers.update(id, { name, phone, email, address });
        closeModal();
        showToast('Customer updated successfully', 'success');
        switchView('customers');
    } catch (err) {
        showToast('Failed to update customer: ' + err.message, 'error');
        _setSubmitLoading(e.target, false, 'Update Customer');
    }
};

window.handleEditLoan = async function (e, id) {
    e.preventDefault();
    _setSubmitLoading(e.target, true, 'Update Record');
    try {
        const type = document.getElementById('editLoanType').value;
        const party = document.getElementById('editLoanParty').value;
        const amount = fmt.parseNumber(document.getElementById('editLoanAmount').value);
        const notes = document.getElementById('editLoanNotes').value;
        await dbLoans.update(id, { type, party, amount, notes });
        closeModal();
        showToast('Record updated successfully', 'success');
        switchView('loans');
    } catch (err) {
        showToast('Failed to update record: ' + err.message, 'error');
        _setSubmitLoading(e.target, false, 'Update Record');
    }
};

window.toggleReportCustomDates = function (val) {
    const el = document.getElementById('reportCustomDates');
    if (el) {
        if (val === 'custom') {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    }
};

window.handleGeneratePDFReport = async function (e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    try {
        const moduleVal = document.getElementById('reportModule')?.value || 'sales';
        const timeframeVal = document.getElementById('reportTimeframe')?.value || 'daily';

        let startDate = null;
        let endDate = null;
        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);

        if (timeframeVal === 'daily') {
            startDate = todayStr;
            endDate = todayStr;
        } else if (timeframeVal === 'weekly') {
            const d = new Date(now);
            d.setDate(d.getDate() - 7);
            startDate = d.toISOString().slice(0, 10);
            endDate = todayStr;
        } else if (timeframeVal === 'monthly') {
            const d = new Date(now);
            d.setDate(d.getDate() - 30);
            startDate = d.toISOString().slice(0, 10);
            endDate = todayStr;
        } else if (timeframeVal === 'all') {
            startDate = '2020-01-01';
            endDate = todayStr;
        } else if (timeframeVal === 'custom') {
            startDate = document.getElementById('reportStartDate')?.value || todayStr;
            endDate = document.getElementById('reportEndDate')?.value || todayStr;
        }

        const categoryMap = {
            sales: 'sales_invoices',
            expenses: 'expenses',
            inventory: 'inventory',
            loans: 'loans',
            income: 'financial_pl'
        };

        const targetCategory = categoryMap[moduleVal] || 'sales_invoices';
        const branchId = window.state?.branchId || null;
        const ownerId = window.state?.ownerId || null;

        if (typeof window.showLoader === 'function') {
            window.showLoader('Generating PDF report...');
        }

        if (typeof window.exportReportPdf !== 'function') {
            try {
                const mod = await import('./owner/report_pdf_engine.js');
                if (mod && mod.exportReportPdf) {
                    window.exportReportPdf = mod.exportReportPdf;
                }
            } catch (loadErr) {
                console.warn('[handleGeneratePDFReport] Failed dynamic import of report_pdf_engine:', loadErr);
            }
        }

        if (typeof window.exportReportPdf !== 'function') {
            throw new Error('Report engine is initializing. Please try again.');
        }

        const filename = await window.exportReportPdf(targetCategory, {
            scope: branchId ? 'branch' : 'owner',
            branchId: branchId,
            ownerId: ownerId,
            startDate: startDate,
            endDate: endDate
        });

        if (typeof window.hideLoader === 'function') window.hideLoader();
        if (typeof window.closeModal === 'function') window.closeModal();
        if (typeof window.showToast === 'function') {
            window.showToast(`Report "${filename || 'PDF'}" exported successfully!`, 'success');
        }
    } catch (err) {
        console.error('[handleGeneratePDFReport] Error:', err);
        if (typeof window.hideLoader === 'function') window.hideLoader();
        if (typeof window.showToast === 'function') {
            window.showToast('Failed to generate report: ' + err.message, 'error');
        }
    }
};

window.openRequestModal = function (type, id, summary) {
    openModal('requestAttention', { type, id, summary });
};

window.handleRequestAttention = async function (e) {
    if (e) e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');

    const rawRelatedId = document.getElementById('reqRelatedId').value;
    const payload = {
        branch_id: state.branchId,
        owner_id: state.ownerId || state.profile?.id,
        type: document.getElementById('reqType').value,
        related_id: (rawRelatedId && rawRelatedId !== 'null' && rawRelatedId !== '') ? rawRelatedId : null,
        related_summary: document.getElementById('reqSummary').value,
        subject: document.getElementById('reqSubject').value,
        message: document.getElementById('reqMessage').value,
        priority: document.getElementById('reqPriority').value,
        status: 'pending'
    };

    try {
        _setSubmitLoading(btn, true, 'Sending...');
        await dbRequests.add(payload);
        showToast('Approval request sent successfully!', 'success');
        closeModal();
        if (window.renderBranchRequestsList) renderBranchRequestsList();
    } catch (err) {
        showToast('Failed to send request: ' + err.message, 'error');
    } finally {
        _setSubmitLoading(btn, false, 'Request Approval');
    }
};

window.handleEditGeneralRequest = async function (e, id) {
    if (e) e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const updateData = {
        subject: document.getElementById('editReqSubject').value,
        message: document.getElementById('editReqMessage').value,
        priority: document.getElementById('editReqPriority').value
    };
    try {
        _setSubmitLoading(btn, true, 'Updating...');
        await dbRequests.update(id, updateData);
        showToast('Request updated successfully!', 'success');
        closeModal();
        if (window.renderBranchRequestsList) renderBranchRequestsList();
    } catch (err) {
        showToast('Failed to update request: ' + err.message, 'error');
    } finally {
        _setSubmitLoading(btn, false, 'Update Request');
    }
};

window.handleEditInventoryAddRequest = async function (e, id) {
    if (e) e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');

    const itemType = document.getElementById('editItemTypeAdd')?.value || 'product';
    const isService = itemType === 'service';

    const price = fmt.parseNumber(document.getElementById('editItemPriceAdd').value) || 0;
    const cost_price = fmt.parseNumber(document.getElementById('editItemCostAdd').value) || 0;
    const name = document.getElementById('editItemNameAdd').value?.trim();
    const category = document.getElementById('editItemCategoryAdd').value || (isService ? 'Services' : 'General');
    const sku = document.getElementById('editItemSkuAdd')?.value || (isService ? (typeof window.generateAutoSKU === 'function' ? window.generateAutoSKU('Services', name) : `SVC-${Date.now().toString().slice(-6)}`) : '');

    const itemData = {
        name,
        sku,
        category,
        item_type: itemType,
        price,
        retail_price: price,
        wholesale_price: price,
        quantity: isService ? 0 : (fmt.parseNumber(document.getElementById('editItemQtyAdd')?.value) || 0),
        min_threshold: isService ? 0 : (fmt.parseNumber(document.getElementById('editItemMinThresholdAdd')?.value) || 10),
        cost_price: cost_price,
        supplier: isService ? null : (document.getElementById('editItemSupplierAdd')?.value || null),
        is_isolated: false,
        isolation_status: 'unregistered'
    };

    const updateData = {
        subject: isService ? `New Service Request: ${itemData.name} (Updated)` : `New Stock Request: ${itemData.name} (Updated)`,
        message: isService
            ? `Requesting to add service: ${itemData.name}. Service Price: ${fmt.currency(itemData.price)}. Service Cost: ${fmt.currency(itemData.cost_price || 0)}.`
            : `Requesting to add ${itemData.quantity} units of ${itemData.name}. Supplier: ${itemData.supplier || 'N/A'}. Total Cost Basis: ${fmt.currency(itemData.quantity * itemData.cost_price)}`,
        metadata: itemData
    };

    try {
        _setSubmitLoading(btn, true, 'Updating...');
        await dbRequests.update(id, updateData);
        showToast(isService ? 'Service request updated!' : 'Stock request updated!', 'success');
        closeModal();
        if (window.renderBranchRequestsList) renderBranchRequestsList();
    } catch (err) {
        showToast('Failed to update request: ' + err.message, 'error');
    } finally {
        _setSubmitLoading(btn, false, isService ? 'Update Service Request' : 'Update Request');
    }
};

window.handleEditRestockRequest = async function (e, id) {
    if (e) e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');

    const restockData = {
        inventory_id: document.getElementById('editRestockInvId').value,
        name: document.getElementById('editRestockName').value,
        quantity: fmt.parseNumber(document.getElementById('editRestockQty').value) || 0,
        cost_price: fmt.parseNumber(document.getElementById('editRestockCost').value) || 0,
        supplier: document.getElementById('editRestockSupplier').value
    };

    const updateData = {
        subject: `Restock Request: ${restockData.name} (Updated)`,
        message: `Requesting restock of ${restockData.quantity} units for ${restockData.name}.Supplier: ${restockData.supplier}.Cost: ${fmt.currency(restockData.quantity * restockData.cost_price)} `,
        metadata: restockData
    };

    try {
        _setSubmitLoading(btn, true, 'Updating...');
        await dbRequests.update(id, updateData);
        showToast('Restock request updated!', 'success');
        closeModal();
        if (window.renderBranchRequestsList) renderBranchRequestsList();
    } catch (err) {
        showToast('Failed to update request: ' + err.message, 'error');
    } finally {
        _setSubmitLoading(btn, false, 'Update Request');
    }
};

window.handleAdminUpdateTaskStatus = async function (taskId, newStatus) {
    try {
        await dbTasks.updateStatus(taskId, newStatus);
        showToast('Task status updated', 'success');
        if (window.renderTasksManagement) window.renderTasksManagement();
    } catch (err) {
        showToast('Failed to update status', 'error');
    }
};

window.handleAdminDeleteTask = async function (taskId) {
    const confirmed = await window.confirmModal('Delete Task', 'Are you sure you want to delete this task?', 'Yes, Delete', 'Cancel', 'bg-red-600 hover:bg-red-700');
    if (!confirmed) return;
    try {
        await dbTasks.bulkDelete([taskId]);
        showToast('Task deleted', 'success');
        closeModal();
        if (window.renderTasksManagement) window.renderTasksManagement();
    } catch (err) {
        showToast('Failed to delete task', 'error');
    }
};

window.handleSendTaskReminder = async function (taskId) {
    const input = document.getElementById('adminReminderInput');
    if (!input || !input.value.trim()) return;
    const msg = input.value.trim();

    try {
        input.disabled = true;
        await dbTaskComments.add(taskId, 'owner', state.profile?.name || 'Admin', msg);
        showToast('Reminder sent', 'success');

        const freshTask = await dbTasks.fetchOne(taskId);
        if (freshTask) {
            freshTask._comments = await dbTaskComments.fetchAll(taskId);
            openModal('taskDetails', freshTask);
        }
    } catch (err) {
        showToast('Failed to send reminder', 'error');
        input.disabled = false;
    }
};

window.handleBranchReplyToTask = async function (taskId) {
    const input = document.getElementById('branchReplyInput');
    if (!input || !input.value.trim()) return;
    const msg = input.value.trim();

    try {
        input.disabled = true;
        await dbTaskComments.add(taskId, 'branch', state.branchProfile?.name || 'Branch', msg);
        showToast('Reply sent', 'success');

        const freshTask = await dbTasks.fetchOne(taskId);
        if (freshTask) {
            freshTask._comments = await dbTaskComments.fetchAll(taskId);
            openModal('taskDetails', freshTask);
        }
    } catch (err) {
        showToast('Failed to send reply', 'error');
        input.disabled = false;
    }
};

window.handleBranchCompleteTask = async function (taskId) {
    const confirmed = await window.confirmModal('Complete Task', 'Are you sure you want to mark this task as completed?', 'Yes, Complete', 'Cancel', 'bg-emerald-600 hover:bg-emerald-700');
    if (!confirmed) return;
    try {
        await dbTasks.updateStatus(taskId, 'completed');

        const branchName = state.branchProfile?.name || 'Branch';
        if (typeof addActivity === 'function') {
            addActivity('task_completed', `Task completed`, branchName);
        }

        showToast('Task completed!', 'success');
        closeModal();
        if (window.renderBranchTasks) renderBranchTasks();
    } catch (err) {
        showToast('Failed to complete task: ' + err.message, 'error');
    }
};

function _modalsInit() {
    document.getElementById('modalOverlay')
        ?.addEventListener('click', e => { if (e.target.id === 'modalOverlay') closeModal(); });
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _modalsInit);
} else {
    _modalsInit();
}

window.handleAddStaff = async function (e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    _setSubmitLoading(btn, true);

    const payload = {
        branch_id: state.branchId,
        name: document.getElementById('staffName').value.trim(),
        role: document.getElementById('staffRole').value.trim(),
        salary: parseFloat(document.getElementById('staffSalary').value) || 0,
        phone: document.getElementById('staffPhone').value.trim(),
        email: document.getElementById('staffEmail').value.trim(),
        status: 'active'
    };

    if (!navigator.onLine) {
        await window.queueOfflineOperation('staff', payload);
        closeModal();
        if (window.renderStaffModule) renderStaffModule();
        return;
    }

    try {
        await dbStaff.add(payload);
        showToast('Staff member added successfully', 'success');
        closeModal();
        if (window.renderStaffModule) renderStaffModule();
    } catch (err) {
        console.warn('[AddStaff] Network failed, queueing offline:', err);
        await window.queueOfflineOperation('staff', payload);
        closeModal();
        if (window.renderStaffModule) renderStaffModule();
    } finally {
        _setSubmitLoading(btn, false, 'Save Staff');
    }
};

window.handleEditStaff = async function (e, id) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    _setSubmitLoading(btn, true);

    const payload = {
        name: document.getElementById('editStaffName').value.trim(),
        role: document.getElementById('editStaffRole').value.trim(),
        salary: parseFloat(document.getElementById('editStaffSalary').value) || 0,
        phone: document.getElementById('editStaffPhone').value.trim(),
        email: document.getElementById('editStaffEmail').value.trim(),
        status: document.getElementById('editStaffStatus').value
    };

    try {
        await dbStaff.update(id, payload);
        showToast('Staff member updated', 'success');
        closeModal();
        if (window.renderStaffModule) renderStaffModule();
    } catch (err) {
        showToast('Failed to update staff: ' + err.message, 'error');
    } finally {
        _setSubmitLoading(btn, false, 'Save Changes');
    }
};

window.handleMarkAttendance = async function (e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    _setSubmitLoading(btn, true);

    const payload = {
        staff_id: document.getElementById('attStaffId')?.value || document.getElementById('attendanceStaffId')?.value || '',
        date: document.getElementById('attDate')?.value || document.getElementById('attendanceDate')?.value || '',
        status: document.getElementById('attStatus')?.value || document.getElementById('attendanceStatus')?.value || 'present',
        notes: (document.getElementById('attNotes')?.value || document.getElementById('attendanceNotes')?.value || '').trim()
    };

    if (!payload.staff_id) {
        showToast('Please select a staff member.', 'error');
        _setSubmitLoading(btn, false, 'Save Attendance');
        return;
    }

    try {
        await dbAttendance.mark(payload);
        showToast('Attendance recorded!', 'success');
        closeModal();
        if (window.renderStaffModule) renderStaffModule();
        if (window.renderAttendanceModule) renderAttendanceModule();
    } catch (err) {
        showToast('Failed to record attendance: ' + err.message, 'error');
    } finally {
        _setSubmitLoading(btn, false, 'Save Attendance');
    }
};

window.handleAddSupplier = async function (e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    _setSubmitLoading(btn, true);

    const payload = {
        enterprise_id: state.ownerId,
        name: document.getElementById('supplierName').value.trim(),
        contact_person: document.getElementById('supplierContactPerson').value.trim(),
        phone: document.getElementById('supplierPhone').value.trim(),
        email: document.getElementById('supplierEmail').value.trim(),
        address: document.getElementById('supplierAddress').value.trim(),
        status: 'active'
    };

    if (!navigator.onLine) {
        await window.queueOfflineOperation('suppliers', payload);
        window._currentSuppliersList = null;
        if (window.clearFormDraft) window.clearFormDraft('addSupplier');
        closeModal();
        if (state.role === 'owner' && window.renderOwnerSuppliersModule) renderOwnerSuppliersModule();
        else if (window.renderSuppliersModule) renderSuppliersModule();
        return;
    }

    try {
        await dbSuppliers.add(payload);
        showToast('Supplier added successfully', 'success');

        window._currentSuppliersList = null;

        if (window.clearFormDraft) window.clearFormDraft('addSupplier');
        closeModal();
        if (state.role === 'owner' && window.renderOwnerSuppliersModule) renderOwnerSuppliersModule();
        else if (window.renderSuppliersModule) renderSuppliersModule();
    } catch (err) {
        console.warn('[AddSupplier] Network failed, queueing offline:', err);
        await window.queueOfflineOperation('suppliers', payload);
        window._currentSuppliersList = null;
        if (window.clearFormDraft) window.clearFormDraft('addSupplier');
        closeModal();
        if (state.role === 'owner' && window.renderOwnerSuppliersModule) renderOwnerSuppliersModule();
        else if (window.renderSuppliersModule) renderSuppliersModule();
    } finally {
        _setSubmitLoading(btn, false, 'Save Supplier');
    }
};

window.handleEditSupplier = async function (e, id) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    _setSubmitLoading(btn, true);

    const payload = {
        name: document.getElementById('editSupplierName').value.trim(),
        contact_person: document.getElementById('editSupplierContactPerson').value.trim(),
        phone: document.getElementById('editSupplierPhone').value.trim(),
        email: document.getElementById('editSupplierEmail').value.trim(),
        address: document.getElementById('editSupplierAddress').value.trim(),
        status: document.getElementById('editSupplierStatus').value
    };

    try {
        await dbSuppliers.update(id, payload);
        showToast('Supplier updated successfully', 'success');

        window._currentSuppliersList = null;

        closeModal();
        if (state.role === 'owner' && window.renderOwnerSuppliersModule) renderOwnerSuppliersModule();
        else if (window.renderSuppliersModule) renderSuppliersModule();
    } catch (err) {
        showToast('Failed to update supplier: ' + err.message, 'error');
    } finally {
        _setSubmitLoading(btn, false, 'Update Supplier');
    }
};

window.handleCreatePO = async function (e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');

    const items = [];
    const rows = document.getElementById('poItemsContainer').children;
    for (const row of rows) {
        const name = row.querySelector('.po-item-name').value.trim();
        const qty = parseFloat(row.querySelector('.po-item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.po-item-price').value) || 0;
        if (name && qty > 0) {
            items.push({
                item_name: name,
                quantity: qty,
                unit_price: price,
                total_price: qty * price
            });
        }
    }

    if (items.length === 0) {
        showToast("Please add at least one item to the PO.", "error");
        return;
    }

    _setSubmitLoading(btn, true);

    const supplierSelect = document.getElementById('poSupplierId');
    const total_amount = parseFloat(document.getElementById('poTotalAmountVal').value) || 0;

    const poPayload = {
        branch_id: state.branchId,
        supplier_id: supplierSelect.value,
        supplier_name: supplierSelect.options[supplierSelect.selectedIndex].text,
        po_number: 'PO-' + Date.now().toString().slice(-6),
        status: 'draft',
        total_amount: total_amount,
        expected_date: document.getElementById('poExpectedDate').value || null
    };

    try {
        const poId = await dbPurchaseOrders.createWithItems(poPayload, items);
        showToast(`PO ${poPayload.po_number} created`, 'success');
        closeModal();
        if (window.renderSuppliersModule) renderSuppliersModule();
    } catch (err) {
        showToast('Failed to create PO: ' + err.message, 'error');
    } finally {
        _setSubmitLoading(btn, false, 'Create & Save PO');
    }
};

window.updatePOStatus = async function (poId, newStatus) {
    try {
        await dbPurchaseOrders.updateStatus(poId, newStatus);
        showToast('PO status updated', 'success');
        if (window.renderSuppliersModule) renderSuppliersModule();

        const po = await dbPurchaseOrders.fetchOne(poId);
        openModal('viewPO', po);
    } catch (err) {
        showToast('Failed to update PO status', 'error');
    }
};

window.handleCreateQuotation = async function (e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');

    const items = [];
    const rows = document.getElementById('quoteItemsContainer').children;
    for (const row of rows) {
        const name = row.querySelector('.quote-item-name').value.trim();
        const qty = parseFloat(row.querySelector('.quote-item-qty').value) || 0;
        const price = parseFloat(row.querySelector('.quote-item-price').value) || 0;
        if (name && qty > 0) {
            items.push({
                item_name: name,
                quantity: qty,
                unit_price: price
            });
        }
    }

    if (items.length === 0) {
        showToast("Please add at least one line item.", "error");
        return;
    }

    _setSubmitLoading(btn, true);

    const overrideName = document.getElementById('quoteCustomerNameOverride').value.trim();
    const overrideAddress = document.getElementById('quoteCustomerAddressOverride').value.trim();
    const custSel = document.getElementById('quoteCustomerId');
    let cId = custSel.value || null;
    let cName = overrideName || (cId ? custSel.options[custSel.selectedIndex].text : 'Walk-in / General');
    let cAddress = overrideAddress || null;

    if (!cAddress && cId && window._currentCustomersList) {
        const cust = _currentCustomersList.find(c => c.id === cId);
        if (cust) cAddress = cust.address;
    }

    const total_amount = parseFloat(document.getElementById('quoteTotalAmountVal').value) || 0;

    const quotePayload = {
        branch_id: state.branchId,
        customer_name: cName,
        customer_address: cAddress,
        quote_number: 'QT-' + Date.now().toString().slice(-6),
        status: 'draft',
        total_amount: total_amount,
        valid_until: document.getElementById('quoteValidUntil').value
    };

    try {
        const quoteId = await dbQuotations.create(quotePayload, items);
        showToast(`Quotation ${quotePayload.quote_number} generated`, 'success');
        closeModal();
        if (window.renderQuotationsModule) renderQuotationsModule();
    } catch (err) {
        showToast('Failed to generate quote: ' + err.message, 'error');
    } finally {
        _setSubmitLoading(btn, false, 'Save & Generate Quote');
    }
};

window.updateQuotationStatus = async function (quoteId, newStatus) {
    try {
        await dbQuotations.updateStatus(quoteId, newStatus);
        showToast('Quote status updated', 'success');
        if (window.renderQuotationsModule) renderQuotationsModule();

        const quote = await dbQuotations.fetchWithItems(quoteId);
        if (quote) openModal('viewQuotation', quote);
    } catch (err) {
        showToast('Failed to update quote status', 'error');
    }
};

window.downloadQuotationPDF = async function (quoteId) {
    try {
        showToast('Generating PDF...', 'info');
        if (typeof window.ensurePdfLibraries === 'function') {
            await window.ensurePdfLibraries();
        }
        const data = await dbQuotations.fetchWithItems(quoteId);
        if (!data) { showToast('Quotation not found', 'error'); return; }

        const items = data.items || [];
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const pw = doc.internal.pageSize.width;
        const ph = doc.internal.pageSize.height;
        const now = new Date();
        const m = 14;

        const accent = [75, 85, 99];
        const dark = [17, 24, 39];
        const mid = [55, 65, 81];
        const muted = [107, 114, 128];
        const light = [243, 244, 246];
        const border = [156, 163, 175];
        const white = [255, 255, 255];

        const entName = state.enterpriseName || 'BMS Enterprise';
        const branch = state.branchProfile || (state.branches && state.branches.find(b => b.id === state.branchId)) || {};
        const bAddress = branch.address || branch.location || '';
        const bPhone = branch.phone || state.profile?.phone || '';
        const bEmail = branch.email || state.profile?.email || '';
        const bTin = branch.branch_tin || state.profile?.tax_id || '';
        const bRegNo = branch.branch_reg_no || branch.branch_code || '';
        const bFax = branch.fax || '';

        const hLine = (y, x1, x2) => {
            doc.setDrawColor(...border);
            doc.setLineWidth(0.3);
            doc.line(x1 || m, y, x2 || pw - m, y);
        };

        doc.setFillColor(...accent);
        doc.rect(0, 0, pw, 4, 'F');

        doc.setFontSize(24);
        doc.setFont('helvetica', 'bolditalic');
        doc.setTextColor(...dark);
        doc.text(entName, m, 18);

        doc.setFontSize(28);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...accent);
        doc.text('Quote', pw - m, 18, { align: 'right' });

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...muted);
        doc.text(bAddress || 'Business Management System', m, 25);

        hLine(28);

        const infoBoxX = pw / 2 + 15;
        const infoBoxW = pw - m - infoBoxX;
        let iy = 33;

        doc.setFillColor(...light);
        doc.rect(infoBoxX, iy - 4, infoBoxW, 8, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...mid);
        doc.text('DATE :', infoBoxX + 2, iy);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...dark);
        doc.text(new Date(data.created_at || now).toLocaleDateString(), pw - m - 2, iy, { align: 'right' });

        iy += 10;
        doc.setFillColor(...white);
        doc.rect(infoBoxX, iy - 4, infoBoxW, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...mid);
        doc.text('QUOTE NO :', infoBoxX + 2, iy);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...accent);
        doc.text(data.quote_number || 'N/A', pw - m - 2, iy, { align: 'right' });

        iy += 10;
        doc.setFillColor(...light);
        doc.rect(infoBoxX, iy - 4, infoBoxW, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...mid);
        doc.text('EXPIRATION DATE :', infoBoxX + 2, iy);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...dark);
        doc.text(data.valid_until ? new Date(data.valid_until).toLocaleDateString() : 'N/A', pw - m - 2, iy, { align: 'right' });

        let cy = iy + 14;
        const colMid = pw / 2 + 5;

        doc.setFillColor(...accent);
        doc.rect(m, cy - 4, 20, 7, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...white);
        doc.text('TO :', m + 2, cy);

        doc.rect(colMid, cy - 4, 40, 7, 'F');
        doc.setTextColor(...white);
        doc.text('Prepared by :', colMid + 2, cy);

        cy += 8;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...dark);

        doc.text(data.customer_name || 'Walk-in Customer', m, cy);
        if (data.customer_phone) {
            cy += 5;
            doc.text(`Phone: ${data.customer_phone}`, m, cy);
        }
        if (data.customer_address) {
            cy += 5;
            const addrLines = doc.splitTextToSize(`Address: ${data.customer_address}`, (pw / 2) - m - 10);
            doc.text(addrLines, m, cy);
            cy += (addrLines.length - 1) * 5;
        }

        let cy2 = cy - (data.customer_phone ? 5 : 0);
        doc.text(entName, colMid, cy2);
        cy2 += 5;
        if (bAddress) { doc.text(bAddress, colMid, cy2); cy2 += 5; }
        if (bPhone) { doc.text(`Phone : ${bPhone}`, colMid, cy2); cy2 += 5; }
        if (bEmail) { doc.text(`Email : ${bEmail}`, colMid, cy2); cy2 += 5; }

        cy = Math.max(cy, cy2) + 6;
        hLine(cy);

        cy += 4;

        const columns = ['#', 'DESCRIPTION', 'QUANTITY', 'UNIT PRICE', 'TOTAL'];
        const rows = items.map((item, i) => [
            i + 1,
            item.item_name || 'N/A',
            item.quantity,
            fmt.currency(item.unit_price),
            fmt.currency(item.quantity * item.unit_price)
        ]);

        while (rows.length < 5) {
            rows.push(['', '', '', '', '']);
        }

        doc.autoTable({
            startY: cy,
            head: [columns],
            body: rows,
            theme: 'grid',
            headStyles: {
                fillColor: accent,
                textColor: white,
                fontStyle: 'bold',
                fontSize: 9,
                halign: 'center'
            },
            styles: {
                fontSize: 9,
                cellPadding: 3,
                textColor: mid,
                lineColor: border,
                lineWidth: 0.3
            },
            columnStyles: {
                0: { cellWidth: 15, halign: 'center' },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 28, halign: 'center' },
                3: { cellWidth: 35, halign: 'right' },
                4: { cellWidth: 35, halign: 'right' }
            },
            margin: { left: m, right: m },
            didDrawPage: function () {

                doc.setFillColor(...light);
                doc.rect(0, ph - 12, pw, 12, 'F');
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(...muted);
                doc.text('Page ' + doc.internal.getNumberOfPages(), m, ph - 4);
                doc.text(`Generated by BMS © ${now.getFullYear()}`, pw - m, ph - 4, { align: 'right' });
            }
        });

        let fy = doc.lastAutoTable.finalY || cy + 40;
        const subTotal = items.reduce((s, it) => s + (it.quantity * it.unit_price), 0);
        const taxRate = 0;
        const taxAmount = subTotal * taxRate;
        const grandTotal = subTotal + taxAmount;
        const totalsX = pw - m - 90;

        doc.setFillColor(...light);
        doc.setDrawColor(...border);
        doc.setLineWidth(0.3);
        doc.rect(totalsX, fy, 90, 9, 'FD');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...mid);
        doc.text('SUB TOTAL', totalsX + 3, fy + 6);
        doc.setTextColor(...dark);
        doc.text(fmt.currency(subTotal), pw - m - 3, fy + 6, { align: 'right' });

        fy += 9;

        doc.setFillColor(...white);
        doc.rect(totalsX, fy, 90, 9, 'FD');
        doc.setTextColor(...mid);
        doc.text(`TAX ${taxRate > 0 ? (taxRate * 100) + '%' : ''}`, totalsX + 3, fy + 6);
        doc.setTextColor(...dark);
        doc.text(fmt.currency(taxAmount), pw - m - 3, fy + 6, { align: 'right' });

        fy += 9;

        doc.setFillColor(...accent);
        doc.rect(totalsX, fy, 90, 11, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...white);
        doc.text('GRAND TOTAL', totalsX + 3, fy + 7.5);
        doc.text(fmt.currency(grandTotal), pw - m - 3, fy + 7.5, { align: 'right' });

        fy += 18;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...accent);
        doc.text('INSTRUCTIONS:', m, fy);
        fy += 6;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...mid);
        doc.text('1. Once signed, please fax or mail it to the provided address.', m + 3, fy);
        fy += 4;
        if (data.notes) {
            doc.text(`2. ${data.notes}`, m + 3, fy);
            fy += 4;
        }
        doc.text(`${data.notes ? '3' : '2'}. This quotation is valid until ${data.valid_until ? new Date(data.valid_until).toLocaleDateString() : 'further notice'}.`, m + 3, fy);

        fy += 10;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.setTextColor(...mid);
        doc.text('Please confirm your acceptance of this quote by signing this document:', m, fy);

        fy += 5;

        doc.autoTable({
            startY: fy,
            head: [['NAME', 'SIGNATURE', 'DATE']],
            body: [['', '', '']],
            theme: 'grid',
            headStyles: {
                fillColor: accent,
                textColor: white,
                fontStyle: 'bold',
                fontSize: 8,
                halign: 'center',
                cellPadding: 2
            },
            styles: {
                fontSize: 8,
                cellPadding: 3,
                textColor: mid,
                lineColor: border,
                lineWidth: 0.3,
                minCellHeight: 10
            },
            columnStyles: {
                0: { cellWidth: 80 },
                1: { cellWidth: 60 },
                2: { cellWidth: 40 }
            },
            margin: { left: m, right: m }
        });

        let footY = doc.lastAutoTable.finalY + 8;

        if (footY > ph - 40) {
            doc.addPage();
            footY = 20;
        }

        doc.setFillColor(...light);
        doc.rect(m, footY, pw - m * 2, 12, 'F');
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...accent);
        doc.text('THANK YOU FOR YOUR BUSINESS!', pw / 2, footY + 8, { align: 'center' });

        footY += 16;

        doc.setFillColor(...accent);
        doc.rect(m + 10, footY, pw - m * 2 - 20, 8, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...white);
        const enquiryText = `Should you have any enquiries concerning this quote, contact us on ${bPhone || bEmail || 'our office line'}`;
        doc.text(enquiryText, pw / 2, footY + 5, { align: 'center' });

        footY += 12;

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...mid);
        if (bPhone) doc.text(`Tel : ${bPhone}`, m, footY);
        if (bEmail) doc.text(`E-mail : ${bEmail}`, pw - m, footY, { align: 'right' });

        doc.save(`${data.quote_number || 'quotation'}_${Date.now()}.pdf`);
        showToast('PDF downloaded', 'success');
    } catch (err) {
        console.error('PDF generation failed:', err);
        showToast('Failed to generate PDF: ' + err.message, 'error');
    }
};

window.downloadDocumentPDF = async function (docId) {
    try {
        showToast('Generating PDF...', 'info');
        if (typeof window.ensurePdfLibraries === 'function') {
            await window.ensurePdfLibraries();
        }
        const data = await dbDocuments.fetchOne(docId);
        if (!data) { showToast('Document not found', 'error'); return; }

        const title = data.type === 'invoice' ? 'Invoice' : 'Receipt';
        const docPrefix = data.type === 'invoice' ? 'INV' : 'REC';

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const pw = doc.internal.pageSize.width;
        const ph = doc.internal.pageSize.height;
        const now = new Date();
        const m = 14;

        // Custom Invoice Settings & Branding (Server-Authoritative via Supabase entitlements)
        const hasCustomInvoice = typeof window.hasFeature === 'function' && window.hasFeature('custom_invoicing');
        const hasCustomBranding = typeof window.hasFeature === 'function' && window.hasFeature('custom_branding');

        const rawSettings = data.mobile_payment_details || state.branchProfile?.invoice_settings || state.profile?.invoice_settings || {};
        const invSettings = hasCustomInvoice ? rawSettings : {};
        
        // Parse Brand Color Hex to RGB
        const hexToRgb = (hex, defaultRgb = [79, 70, 229]) => {
            if (!hex) return defaultRgb;
            const cleaned = hex.replace('#', '');
            if (cleaned.length === 6) {
                return [
                    parseInt(cleaned.substring(0, 2), 16),
                    parseInt(cleaned.substring(2, 4), 16),
                    parseInt(cleaned.substring(4, 6), 16)
                ];
            }
            return defaultRgb;
        };

        const customColor = (hasCustomInvoice && invSettings.brand_color) || (hasCustomBranding && state.profile?.brand_color) || null;
        const accent = hexToRgb(customColor, [79, 70, 229]);
        const dark = [17, 24, 39];
        const mid = [55, 65, 81];
        const muted = [107, 114, 128];
        const light = [248, 250, 252];
        const border = [226, 232, 240];
        const white = [255, 255, 255];

        const entName = state.enterpriseName || state.profile?.business_name || 'BMS Enterprise';
        const branch = state.branchProfile || (state.branches && state.branches.find(b => b.id === state.branchId)) || {};
        const bAddress = branch.address || branch.location || state.profile?.street_address || '';
        const bPhone = branch.phone || state.profile?.phone || state.profile?.mobile_number || '';
        const bEmail = branch.email || state.profile?.email || '';

        const hLine = (y, x1, x2) => {
            doc.setDrawColor(...border);
            doc.setLineWidth(0.3);
            doc.line(x1 || m, y, x2 || pw - m, y);
        };

        // Top Accent Color Bar
        doc.setFillColor(...accent);
        doc.rect(0, 0, pw, 5, 'F');

        let headerY = 16;
        let startTextX = m;

        // Render Compressed Logo if available and entitled
        const logoData = (hasCustomInvoice && invSettings.logo_data) || (hasCustomBranding && state.profile?.logo_url) || null;
        if (logoData && typeof logoData === 'string' && (logoData.startsWith('data:image') || logoData.startsWith('http'))) {
            try {
                doc.addImage(logoData, 'JPEG', m, 12, 22, 22);
                startTextX = m + 26;
            } catch (e) {
                console.warn('[PDF] Failed embedding logo image:', e);
            }
        }

        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...dark);
        doc.text(entName, startTextX, headerY + 2);

        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...accent);
        doc.text(title.toUpperCase(), pw - m, headerY + 2, { align: 'right' });

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...muted);
        doc.text(bAddress || 'Business Management System', startTextX, headerY + 9);
        if (invSettings.tax_pin || state.profile?.tax_id) {
            doc.text(`TIN / VAT: ${invSettings.tax_pin || state.profile?.tax_id}`, startTextX, headerY + 14);
        }

        // Status Tag
        const docStatus = (data.status || (data.type === 'invoice' ? 'sent' : 'paid')).toUpperCase();
        const statusColor = docStatus === 'PAID' ? [16, 185, 129] : docStatus === 'PARTIALLY_PAID' ? [245, 158, 11] : docStatus === 'OVERDUE' ? [239, 68, 68] : [59, 130, 246];
        doc.setFillColor(...statusColor);
        doc.roundedRect(pw - m - 45, headerY + 7, 45, 6.5, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...white);
        doc.text(docStatus.replace('_', ' '), pw - m - 22.5, headerY + 11.5, { align: 'center' });

        hLine(38);

        const infoBoxX = pw / 2 + 15;
        const infoBoxW = pw - m - infoBoxX;
        let iy = 44;

        doc.setFillColor(...light);
        doc.rect(infoBoxX, iy - 4, infoBoxW, 7, 'F');
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...mid);
        doc.text('DATE :', infoBoxX + 2, iy);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...dark);
        doc.text(new Date(data.created_at || now).toLocaleDateString(), pw - m - 2, iy, { align: 'right' });

        iy += 9;
        doc.setFillColor(...white);
        doc.rect(infoBoxX, iy - 4, infoBoxW, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...mid);
        doc.text(`${docPrefix} NO :`, infoBoxX + 2, iy);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...accent);
        doc.text(data.document_number || 'N/A', pw - m - 2, iy, { align: 'right' });

        if (data.due_date) {
            iy += 9;
            doc.setFillColor(...light);
            doc.rect(infoBoxX, iy - 4, infoBoxW, 7, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...mid);
            doc.text('DUE DATE :', infoBoxX + 2, iy);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...dark);
            doc.text(new Date(data.due_date).toLocaleDateString(), pw - m - 2, iy, { align: 'right' });
        }

        if (data.reference_number) {
            iy += 9;
            doc.setFillColor(...white);
            doc.rect(infoBoxX, iy - 4, infoBoxW, 7, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...mid);
            doc.text('REF NO :', infoBoxX + 2, iy);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(...dark);
            doc.text(data.reference_number, pw - m - 2, iy, { align: 'right' });
        }

        let cy = 44;

        doc.setFillColor(...accent);
        doc.rect(m, cy - 4, 32, 6.5, 'F');
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...white);
        doc.text(data.type === 'invoice' ? 'BILL TO :' : 'RECEIVED FROM :', m + 2, cy);

        cy += 8;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...dark);

        doc.text(data.customer_name || 'Walk-in Customer', m, cy);
        let cyL = cy;
        if (data.customer_email) {
            cyL += 5;
            doc.text(`Email: ${data.customer_email}`, m, cyL);
        }
        if (data.customer_address) {
            cyL += 5;
            const addrLines = doc.splitTextToSize(`Address: ${data.customer_address}`, (pw / 2) - m - 10);
            doc.text(addrLines, m, cyL);
            cyL += (addrLines.length - 1) * 5;
        }

        cy = Math.max(cyL, iy) + 8;
        hLine(cy);

        cy += 4;
        const items = data.document_items || [];
        const columns = ['#', 'DESCRIPTION', 'QTY', 'UNIT PRICE', 'TOTAL'];
        const rows = items.map((item, i) => [
            i + 1,
            item.item_name || 'N/A',
            item.quantity,
            fmt.currency(item.unit_price),
            fmt.currency(item.quantity * item.unit_price)
        ]);

        if (rows.length === 0 && data.description) {
            rows.push([1, data.description, 1, fmt.currency(data.amount), fmt.currency(data.amount)]);
        }

        doc.autoTable({
            startY: cy,
            head: [columns],
            body: rows,
            theme: 'grid',
            headStyles: {
                fillColor: accent,
                textColor: white,
                fontStyle: 'bold',
                fontSize: 8.5,
                halign: 'center'
            },
            styles: {
                fontSize: 8.5,
                cellPadding: 3,
                textColor: mid,
                lineColor: border,
                lineWidth: 0.3
            },
            columnStyles: {
                0: { cellWidth: 12, halign: 'center' },
                1: { cellWidth: 'auto' },
                2: { cellWidth: 20, halign: 'center' },
                3: { cellWidth: 35, halign: 'right' },
                4: { cellWidth: 35, halign: 'right' }
            },
            margin: { left: m, right: m }
        });

        let fy = doc.lastAutoTable.finalY + 8;
        const totalsX = pw - m - 90;

        const subTotalAmount = items.reduce((sum, it) => sum + (it.quantity * it.unit_price), 0) || data.amount;
        doc.setFillColor(...light);
        doc.setDrawColor(...border);
        doc.rect(totalsX, fy, 90, 8, 'FD');
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...mid);
        doc.text('SUB TOTAL', totalsX + 3, fy + 5.5);
        doc.setTextColor(...dark);
        doc.text(fmt.currency(subTotalAmount), pw - m - 3, fy + 5.5, { align: 'right' });

        fy += 8;
        doc.setFillColor(...accent);
        doc.rect(totalsX, fy, 90, 10, 'F');
        doc.setFontSize(9.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...white);
        doc.text('TOTAL AMOUNT', totalsX + 3, fy + 6.5);
        doc.text(fmt.currency(data.amount), pw - m - 3, fy + 6.5, { align: 'right' });

        if (data.type === 'invoice' && (data.paid_amount > 0 || data.balance_due !== undefined)) {
            fy += 10;
            doc.setFillColor(...white);
            doc.rect(totalsX, fy, 90, 8, 'FD');
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...mid);
            doc.text('PAID AMOUNT', totalsX + 3, fy + 5.5);
            doc.setTextColor(16, 185, 129);
            doc.text(fmt.currency(data.paid_amount || 0), pw - m - 3, fy + 5.5, { align: 'right' });

            fy += 8;
            doc.setFillColor(254, 242, 242);
            doc.setDrawColor(254, 202, 202);
            doc.rect(totalsX, fy, 90, 9, 'FD');
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(220, 38, 38);
            doc.text('BALANCE DUE', totalsX + 3, fy + 6);
            doc.text(fmt.currency(data.balance_due || 0), pw - m - 3, fy + 6, { align: 'right' });
        }

        // Mobile Money & Bank Payment Instructions Block
        let payBoxY = doc.lastAutoTable.finalY + 8;
        const payBoxW = (pw / 2) - m;
        
        const momoProvider = invSettings.mobile_money_provider || 'M-Pesa';
        const momoTill = invSettings.mobile_money_till || '';
        const momoPaybill = invSettings.mobile_money_paybill || '';
        const bankName = invSettings.bank_name || '';
        const bankAcc = invSettings.bank_account_no || '';
        const instructions = invSettings.mobile_money_instructions || '';

        if (momoTill || momoPaybill || bankAcc) {
            doc.setFillColor(...light);
            doc.setDrawColor(...border);
            doc.roundedRect(m, payBoxY, payBoxW, 36, 2, 2, 'FD');

            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...accent);
            doc.text('PAYMENT METHODS & INSTRUCTIONS', m + 3, payBoxY + 6);

            let lineY = payBoxY + 12;
            doc.setFontSize(8);
            doc.setTextColor(...mid);

            if (momoTill) {
                doc.setFont('helvetica', 'bold');
                doc.text(`Mobile Money (${momoProvider}):`, m + 3, lineY);
                doc.setFont('helvetica', 'normal');
                doc.text(`Till / Lipa: ${momoTill}`, m + 42, lineY);
                lineY += 5;
            }
            if (momoPaybill) {
                doc.setFont('helvetica', 'bold');
                doc.text(`Paybill:`, m + 3, lineY);
                doc.setFont('helvetica', 'normal');
                doc.text(`${momoPaybill} (Acc: ${data.document_number})`, m + 18, lineY);
                lineY += 5;
            }
            if (bankAcc) {
                doc.setFont('helvetica', 'bold');
                doc.text(`Bank (${bankName}):`, m + 3, lineY);
                doc.setFont('helvetica', 'normal');
                doc.text(`Acc: ${bankAcc}`, m + 32, lineY);
                lineY += 5;
            }
            if (instructions) {
                doc.setFontSize(7.5);
                doc.setTextColor(...muted);
                const splitInst = doc.splitTextToSize(instructions, payBoxW - 6);
                doc.text(splitInst, m + 3, lineY);
            }
        }

        // Custom Notes & Footer
        let footY = ph - 42;
        const customNote = invSettings.notes || data.description || 'Thank you for your business!';
        
        doc.setFillColor(...light);
        doc.rect(m, footY, pw - m * 2, 10, 'F');
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...accent);
        doc.text(customNote.toUpperCase(), pw / 2, footY + 6.5, { align: 'center' });

        footY += 14;
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...muted);
        const enquiryText = `For any enquiries concerning this ${title.toLowerCase()}, contact us on ${bPhone || bEmail || 'our customer line'}.`;
        doc.text(enquiryText, pw / 2, footY, { align: 'center' });

        doc.save(`${data.document_number || 'document'}_${Date.now()}.pdf`);
        showToast('PDF downloaded successfully!', 'success');
    } catch (err) {
        console.error('PDF generation failed:', err);
        showToast('Failed to generate PDF: ' + err.message, 'error');
    }
};

// ─── F6: Physical Stocktaking Sheet Generator (A4 Vector PDF & Blind Count) ────

window.downloadStockSheetPDF = async function (options = {}) {
    if (typeof window.hasFeature === 'function' && !window.hasFeature('stock_take_audit')) {
        if (typeof window.openPlanUpgradeModal === 'function') {
            window.openPlanUpgradeModal('stock_take_audit');
        } else {
            showToast('Stock Sheet generation is an Enterprise & Exclusive feature.', 'warning');
        }
        return;
    }

    try {
        showToast('Generating Physical Stock Sheet PDF...', 'info');
        if (typeof window.ensurePdfLibraries === 'function') {
            await window.ensurePdfLibraries();
        }

        const isBlind = options.isBlindCount ?? true;
        const targetSelect = document.getElementById('stocktakeTargetSelect')?.value;
        const chosenTarget = options.branchId || targetSelect || state.branchId || 'central';
        const entName = state.enterpriseName || state.profile?.business_name || 'BMS Enterprise';

        let items = [];
        let branchName = 'Main Store';

        if (chosenTarget === 'central' || (!state.branchId && chosenTarget !== 'central' && !state.branches?.find(b => b.id === chosenTarget))) {
            branchName = 'Main Store (Central Inventory)';
            const ownerId = state.ownerId || state.currentUser;
            const data = (window.dbCentralInventory && typeof window.dbCentralInventory.fetchAll === 'function')
                ? await window.dbCentralInventory.fetchAll(ownerId)
                : [];

            items = (data || []).map(i => ({
                id: i.id,
                name: i.name,
                sku: i.sku,
                category: i.category,
                quantity: i.main_store_stock || 0,
                unit: 'pcs'
            }));
        } else {
            const foundBranch = (state.branches || []).find(b => b.id === chosenTarget);
            branchName = foundBranch?.name || state.branchProfile?.name || 'Branch Stock';
            
            const invRes = (window.dbInventory && typeof window.dbInventory.fetchAll === 'function')
                ? await window.dbInventory.fetchAll(chosenTarget)
                : { items: [] };

            const data = Array.isArray(invRes) ? invRes : (invRes.items || []);

            items = (data || []).map(i => ({
                id: i.id,
                name: i.name,
                sku: i.sku,
                category: i.category,
                quantity: i.quantity || 0,
                unit: 'pcs'
            }));
        }

        if (items.length === 0) {
            showToast(`No stock items found for ${branchName}.`, 'warning');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pw = doc.internal.pageSize.width;
        const ph = doc.internal.pageSize.height;
        const m = 12;

        const accent = [222, 222, 217]; // #DEDED9 warm stone
        const dark = [17, 24, 39];
        const mid = [51, 65, 85];
        const muted = [100, 116, 139];
        const border = [203, 213, 225];

        // Header Top Bar
        doc.setFillColor(...accent);
        doc.rect(0, 0, pw, 5, 'F');

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...dark);
        doc.text(entName.toUpperCase(), m, 15);

        doc.setFontSize(10.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...mid);
        doc.text(isBlind ? 'PHYSICAL STOCKTAKING SHEET (BLIND COUNT)' : 'PHYSICAL STOCK AUDIT & VARIANCE SHEET', pw - m, 15, { align: 'right' });

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...muted);
        doc.text(`Location: ${branchName}  |  Date: ${new Date().toLocaleDateString()}  |  Total Items: ${items.length}`, m, 21);

        doc.setDrawColor(...border);
        doc.setLineWidth(0.3);
        doc.line(m, 24, pw - m, 24);

        const columns = isBlind 
            ? ['#', 'ITEM NAME', 'SKU / BARCODE', 'CATEGORY', 'UNIT', 'PHYSICAL COUNT [ _____ ]', 'AUDITOR SIGN']
            : ['#', 'ITEM NAME', 'SKU / BARCODE', 'CATEGORY', 'SYSTEM QTY', 'PHYSICAL COUNT', 'SHORTAGE(-) / SURPLUS(+)', 'SIGN'];

        const rows = items.map((item, idx) => {
            if (isBlind) {
                return [
                    idx + 1,
                    item.name,
                    item.sku || '—',
                    item.category || 'General',
                    item.unit || 'pcs',
                    '[           ]',
                    '_________'
                ];
            } else {
                return [
                    idx + 1,
                    item.name,
                    item.sku || '—',
                    item.category || 'General',
                    item.quantity,
                    '[           ]',
                    '[ _____ ]',
                    '_________'
                ];
            }
        });

        doc.autoTable({
            startY: 28,
            head: [columns],
            body: rows,
            theme: 'grid',
            headStyles: {
                fillColor: [222, 222, 217], // #DEDED9
                textColor: [30, 41, 59],     // Crisp dark slate for optimal readability
                fontStyle: 'bold',
                fontSize: 8,
                halign: 'center'
            },
            styles: {
                fontSize: 8,
                cellPadding: 2.5,
                textColor: mid,
                lineColor: border,
                lineWidth: 0.2
            },
            columnStyles: isBlind ? {
                0: { cellWidth: 8, halign: 'center' },
                1: { cellWidth: 'auto', fontStyle: 'bold' },
                2: { cellWidth: 28 },
                3: { cellWidth: 26 },
                4: { cellWidth: 14, halign: 'center' },
                5: { cellWidth: 44, halign: 'center' },
                6: { cellWidth: 28, halign: 'center' }
            } : {
                0: { cellWidth: 8, halign: 'center' },
                1: { cellWidth: 'auto', fontStyle: 'bold' },
                2: { cellWidth: 24 },
                3: { cellWidth: 22 },
                4: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
                5: { cellWidth: 26, halign: 'center' },
                6: { cellWidth: 32, halign: 'center' },
                7: { cellWidth: 18, halign: 'center' }
            },
            margin: { left: m, right: m, bottom: 25 },
            didDrawPage: function(data) {
                // Footer sign-off block on each page
                const fY = ph - 15;
                doc.setFontSize(7.5);
                doc.setTextColor(...muted);
                doc.text(`Auditor Name: __________________________   Signature: __________________________   Manager Sign-off: __________________________`, m, fY);
                doc.text(`Page ${doc.internal.getNumberOfPages()}`, pw - m, fY, { align: 'right' });
            }
        });

        const filename = `StockSheet_${isBlind ? 'Blind_' : ''}${branchName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
        showToast('Stock Sheet PDF generated!', 'success');
    } catch (err) {
        showToast('Failed to generate stock sheet: ' + err.message, 'error');
        console.error(err);
    }
};

window.openStocktakingModal = function () {
    const isOwner = state.role === 'owner';
    const branches = state.branches || [];

    let branchSelectHtml = '';
    if (isOwner && branches.length > 0) {
        branchSelectHtml = `
        <div class="p-4 bg-gray-50 dark:bg-gray-800/80 rounded-2xl border border-gray-100 dark:border-gray-700/60 space-y-2">
            <label class="block text-xs font-extrabold text-gray-700 dark:text-gray-300">Select Location / Warehouse</label>
            <div class="relative">
                <select id="stocktakeTargetSelect" class="form-input w-full pl-3 pr-8 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer">
                    <option value="central">Main Store (Central Inventory)</option>
                    ${branches.map(b => `<option value="${b.id}">${b.name}</option>`).join('')}
                </select>
            </div>
        </div>
        `;
    }

    const modalHtml = `
    <div id="stocktakeModalOverlay" class="fixed inset-0 z-[50000] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div class="bg-white dark:bg-gray-900 w-full sm:max-w-xl h-full sm:h-auto sm:max-h-[90vh] sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden border-t sm:border border-gray-200 dark:border-gray-800 slide-in">
            <!-- Header: .modal-top-nav -->
            <div class="modal-top-nav flex-none flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-20">
                <div class="flex items-center gap-3">
                    <button type="button" onclick="document.getElementById('stocktakeModalOverlay').remove()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                        <i data-lucide="chevron-left" class="w-4 h-4"></i><span>Back</span>
                    </button>
                    <div class="flex items-center gap-2.5">
                        <div class="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <i data-lucide="clipboard-list" class="w-4 h-4"></i>
                        </div>
                        <div>
                            <h3 class="text-sm sm:text-base font-bold text-gray-900 dark:text-white leading-tight">Physical Stocktaking & Sheets</h3>
                            <p class="text-[11px] text-gray-500 dark:text-gray-400">Printable A4 sheets or live digital audit</p>
                        </div>
                    </div>
                </div>
                <button type="button" onclick="document.getElementById('stocktakeModalOverlay').remove()" class="hidden sm:flex p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>

            <!-- Scrollable Body -->
            <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                ${branchSelectHtml}

                <div class="p-4 sm:p-5 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl sm:rounded-3xl border border-indigo-100 dark:border-indigo-900/60 space-y-3">
                    <div class="flex items-start gap-3">
                        <div class="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <i data-lucide="printer" class="w-4 h-4"></i>
                        </div>
                        <div class="flex-1">
                            <h4 class="text-xs sm:text-sm font-bold text-indigo-950 dark:text-indigo-200">1. Blind Count Sheet (Recommended)</h4>
                            <p class="text-[11px] text-indigo-700 dark:text-indigo-300 mt-1 leading-relaxed">Hides expected system quantities so staff perform an honest, un-biased physical count.</p>
                        </div>
                    </div>
                    <button type="button" onclick="const loc = document.getElementById('stocktakeTargetSelect')?.value; document.getElementById('stocktakeModalOverlay').remove(); window.downloadStockSheetPDF({ isBlindCount: true, branchId: loc });" class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-full shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer">
                        <i data-lucide="download" class="w-4 h-4"></i> Download Blind Count PDF
                    </button>
                </div>

                <div class="p-4 sm:p-5 bg-gray-50 dark:bg-gray-800/80 rounded-2xl sm:rounded-3xl border border-gray-200/80 dark:border-gray-700/60 space-y-3">
                    <div class="flex items-start gap-3">
                        <div class="w-8 h-8 rounded-xl bg-gray-200/80 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center shrink-0">
                            <i data-lucide="file-check" class="w-4 h-4"></i>
                        </div>
                        <div class="flex-1">
                            <h4 class="text-xs sm:text-sm font-bold text-gray-900 dark:text-white">2. Standard Audit Sheet</h4>
                            <p class="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">Displays system quantities alongside blank count and shortage/surplus columns for managerial review.</p>
                        </div>
                    </div>
                    <button type="button" onclick="const loc = document.getElementById('stocktakeTargetSelect')?.value; document.getElementById('stocktakeModalOverlay').remove(); window.downloadStockSheetPDF({ isBlindCount: false, branchId: loc });" class="w-full py-2.5 px-4 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 text-gray-800 dark:text-gray-100 font-bold text-xs rounded-full shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer">
                        <i data-lucide="download" class="w-4 h-4"></i> Download Standard Sheet PDF
                    </button>
                </div>

                <div class="p-4 sm:p-5 bg-purple-50/70 dark:bg-purple-950/30 rounded-2xl sm:rounded-3xl border border-purple-100 dark:border-purple-900/60 space-y-3">
                    <div class="flex items-start gap-3">
                        <div class="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                            <i data-lucide="sliders" class="w-4 h-4"></i>
                        </div>
                        <div class="flex-1">
                            <h4 class="text-xs sm:text-sm font-bold text-purple-950 dark:text-purple-200">3. Live Digital Stocktake & Reconciliation</h4>
                            <p class="text-[11px] text-purple-700 dark:text-purple-300 mt-1 leading-relaxed">Enter counted numbers directly on screen with live shortage/surplus computation and instant report submission.</p>
                        </div>
                    </div>
                    <button type="button" onclick="const loc = document.getElementById('stocktakeTargetSelect')?.value; document.getElementById('stocktakeModalOverlay').remove(); window.renderStockTakeView(loc);" class="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs rounded-full shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer">
                        <i data-lucide="arrow-right" class="w-4 h-4"></i> Open Live Stocktake
                    </button>
                </div>
            </div>
        </div>
    </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    if (window.lucide) lucide.createIcons();
};

window.renderStockTakeView = async function (targetLocation) {
    const container = document.getElementById('mainContent');
    if (!container) return;
    container.innerHTML = renderPremiumLoader(window.t('loading', 'Loading inventory for stock take...'));

    const isCentral = targetLocation === 'central' || (!state.branchId && (!targetLocation || targetLocation === 'central'));
    let items = [];
    let locationName = 'Main Store (Central Inventory)';

    try {
        if (isCentral) {
            const ownerId = state.ownerId || state.currentUser;
            const data = (window.dbCentralInventory && typeof window.dbCentralInventory.fetchAll === 'function')
                ? await window.dbCentralInventory.fetchAll(ownerId)
                : [];

            items = (data || []).map(i => ({
                id: i.id,
                name: i.name,
                sku: i.sku,
                category: i.category,
                quantity: i.main_store_stock || 0
            }));
        } else {
            const branchId = (targetLocation && targetLocation !== 'central') ? targetLocation : state.branchId;
            const foundBranch = (state.branches || []).find(b => b.id === branchId);
            locationName = foundBranch?.name || state.branchProfile?.name || 'Branch Stock';

            const invRes = (window.dbInventory && typeof window.dbInventory.fetchAll === 'function')
                ? await window.dbInventory.fetchAll(branchId)
                : { items: [] };

            const data = Array.isArray(invRes) ? invRes : (invRes.items || []);
            items = data || [];
        }
    } catch (err) {

        container.innerHTML = `<div class="py-20 text-center text-red-500 font-bold">Failed loading stock: ${err.message}</div>`;
        return;
    }

    const backFn = state.role === 'owner' 
        ? (typeof window.renderOwnerInventoryModule === 'function' ? 'window.renderOwnerInventoryModule()' : 'window.navigate?.(\'inventory\') || window.location.reload()')
        : (typeof window.renderInventoryModule === 'function' ? 'window.renderInventoryModule()' : 'window.navigate?.(\'inventory\') || window.location.reload()');

    container.innerHTML = `
    <div class="flex flex-col h-[calc(100vh-4.5rem)] sm:h-full bg-gray-50/50 dark:bg-gray-900/50 rounded-2xl sm:rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm slide-in" id="stockTakeView">
        <!-- Header: .modal-top-nav -->
        <div class="modal-top-nav flex-none flex items-center justify-between px-3.5 sm:px-6 py-3 sm:py-3.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-20">
            <div class="flex items-center gap-2.5 sm:gap-3">
                <button type="button" onclick="${backFn}" class="inline-flex items-center gap-1 px-2.5 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                    <i data-lucide="chevron-left" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i><span>Back</span>
                </button>
                <div class="flex items-center gap-2">
                    <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                        <i data-lucide="sliders" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i>
                    </div>
                    <div>
                        <h2 class="text-xs sm:text-base font-bold text-gray-900 dark:text-white leading-tight">Physical Stock Count & Audit</h2>
                        <p class="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">Location: <span class="font-bold text-indigo-600 dark:text-indigo-400">${locationName}</span> &bull; ${items.length} Items</p>
                    </div>
                </div>
            </div>

            <div class="flex items-center gap-1.5 sm:gap-2">
                <button type="button" onclick="window.downloadStockSheetPDF({ isBlindCount: true, branchId: '${targetLocation || ''}' })" class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 rounded-full transition-all cursor-pointer shadow-xs">
                    <i data-lucide="printer" class="w-3.5 h-3.5 text-indigo-600"></i> Blind PDF
                </button>
                <button type="button" onclick="window.downloadStockSheetPDF({ isBlindCount: false, branchId: '${targetLocation || ''}' })" class="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 rounded-full transition-all cursor-pointer shadow-xs">
                    <i data-lucide="file-check" class="w-3.5 h-3.5 text-gray-600"></i> Standard PDF
                </button>
            </div>
        </div>

        <!-- Scrollable Content Area -->
        <div class="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
            <!-- Search & Summary Bar -->
            <div class="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border border-gray-100 dark:border-gray-800 p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
                <div class="flex items-center gap-2">
                    <span class="px-2.5 py-0.5 bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-bold text-[10px] sm:text-xs rounded-full border border-purple-200/50 dark:border-purple-800/50">
                        ${items.length} Stock SKUs
                    </span>
                    <span class="text-[10px] sm:text-xs text-gray-400">Fill counted units below</span>
                </div>
                <div class="relative min-w-[200px] sm:min-w-[240px]">
                    <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"></i>
                    <input type="text" placeholder="Search by name, SKU or category..."
                        oninput="window.filterStockTakeList(this.value)"
                        class="form-input w-full pl-8 pr-3 py-1.5 sm:py-2 bg-gray-50 dark:bg-gray-900/80 border border-gray-200 dark:border-gray-700 rounded-xl text-[11px] sm:text-xs focus:ring-2 focus:ring-purple-500 outline-none transition-all" style="padding-left: 2.1rem !important;">
                </div>
            </div>

            <!-- Inventory List Table / Cards with Thick 4px Separation -->
            <div class="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden divide-y-4 divide-gray-100 dark:divide-gray-800/80" id="stockTakeList">
                ${items.map(item => `
                <div data-search="${item.name.toLowerCase()} ${(item.category || '').toLowerCase()} ${(item.sku || '').toLowerCase()}" class="stock-take-row p-3.5 sm:p-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                    <!-- Product Header Info -->
                    <div class="flex items-start justify-between gap-2">
                        <div class="min-w-0 flex-1">
                            <p class="text-xs sm:text-sm font-bold text-gray-900 dark:text-white truncate">${item.name}</p>
                            <div class="flex items-center gap-2 mt-0.5">
                                <span class="text-[10px] sm:text-[11px] text-gray-400 font-medium">${item.category || 'General'}</span>
                                ${item.sku ? `<span class="text-[9px] sm:text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700/60 text-gray-500 rounded font-mono">${item.sku}</span>` : ''}
                            </div>
                        </div>
                    </div>

                    <!-- Thin Separator Line Below Product Name -->
                    <div class="border-b border-gray-100 dark:border-gray-800/80 my-2.5"></div>

                    <!-- Form & Count Below Product Name in 3-Column Grid -->
                    <div class="grid grid-cols-3 items-center gap-2 sm:gap-4">
                        <!-- System Qty -->
                        <div class="text-center">
                            <p class="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">System</p>
                            <span class="inline-flex items-center justify-center min-w-[38px] px-2 py-0.5 bg-gray-100 dark:bg-gray-700/70 text-gray-800 dark:text-gray-200 font-black text-[11px] sm:text-xs rounded-lg">${item.quantity}</span>
                        </div>

                        <!-- Physical Count Input Box -->
                        <div class="text-center">
                            <p class="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Physical</p>
                            <input type="number" min="0"
                                id="stk_${item.id}"
                                data-system="${item.quantity}"
                                data-name="${item.name.replace(/"/g, '&quot;')}"
                                placeholder="Count..."
                                oninput="window.updateStockTakeVariance('${item.id}', ${item.quantity})"
                                class="w-full max-w-[95px] sm:max-w-[110px] mx-auto px-2 py-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold text-center focus:ring-2 focus:ring-purple-500 outline-none dark:text-white transition-all shadow-xs">
                        </div>

                        <!-- Shortage(-) / Surplus(+) Result -->
                        <div id="stk_var_${item.id}" class="text-center">
                            <p class="text-[9px] sm:text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Shortage(-) / Surplus(+)</p>
                            <span class="font-black text-[11px] sm:text-xs text-gray-300 dark:text-gray-600">—</span>
                        </div>
                    </div>
                </div>`).join('')}
            </div>
        </div>

        <!-- Footer: .modal-bottom-nav -->
        <div class="modal-bottom-nav flex-none px-3.5 sm:px-6 py-3 sm:py-3.5 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between gap-2.5 sm:gap-3 z-20">
            <button type="button" onclick="${backFn}" class="px-4 sm:px-5 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-full transition-all shadow-xs cursor-pointer border border-gray-200 dark:border-gray-700">
                Cancel
            </button>
            <button type="button" onclick="window.submitStockTake('${targetLocation || ''}')"
                class="px-5 sm:px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-full transition-all flex items-center gap-1.5 sm:gap-2 shadow-md hover:shadow-lg cursor-pointer">
                <i data-lucide="send" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i>
                <span>Submit Stock Audit Report</span>
            </button>
        </div>
    </div>`;
    if (window.lucide) lucide.createIcons();
};

window.filterStockTakeList = function(query) {
    const q = (query || '').toLowerCase().trim();
    const rows = document.querySelectorAll('#stockTakeList .stock-take-row');
    rows.forEach(r => {
        const text = r.dataset.search || '';
        r.style.display = (!q || text.includes(q)) ? 'flex' : 'none';
    });
};

window.updateStockTakeVariance = function (itemId, systemQty) {
    const input = document.getElementById(`stk_${itemId}`);
    const varEl = document.getElementById(`stk_var_${itemId}`);
    if (!input || !varEl) return;
    const physical = parseInt(input.value || '');
    if (isNaN(physical)) {
        varEl.innerHTML = `<span class="font-black text-xs text-gray-300 dark:text-gray-600">—</span>`;
        return;
    }
    const variance = physical - systemQty;
    const col = variance === 0 ? 'text-emerald-600 dark:text-emerald-400'
        : variance > 0 ? 'text-blue-600 dark:text-blue-400'
        : 'text-red-600 dark:text-red-400';
    varEl.innerHTML = `<span class="font-black text-xs ${col}">${variance >= 0 ? '+' : ''}${variance}</span>`;
};

window.submitStockTake = async function (targetLocation) {
    const allInputs = document.querySelectorAll('[id^="stk_"][type="number"]');
    const counted = [];
    let countedAny = false;

    allInputs.forEach(input => {
        const itemId = input.id.replace('stk_', '');
        const systemQty = parseInt(input.dataset.system || '0');
        const physicalStr = input.value;
        if (physicalStr === '' || physicalStr === null) return;
        countedAny = true;
        const physicalQty = parseInt(physicalStr);
        const variance = physicalQty - systemQty;
        counted.push({ id: itemId, name: input.dataset.name || itemId, system_qty: systemQty, physical_qty: physicalQty, variance });
    });

    if (!countedAny) { showToast('Please enter at least one physical count number', 'warning'); return; }

    const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const withVariance = counted.filter(i => i.variance !== 0);

    const isCentral = targetLocation === 'central' || (!state.branchId && (!targetLocation || targetLocation === 'central'));
    const targetBranchId = (!isCentral && targetLocation) ? targetLocation : state.branchId;

    try {
        const payload = {
            branch_id: targetBranchId || null,
            owner_id: state.ownerId || state.ownerIdForBranch || state.currentUser,
            subject: `Stock Audit Report — ${today}`,
            message: `Items Counted: ${counted.length}\nWith Shortage/Surplus: ${withVariance.length}\n\n${withVariance.map(i => `${i.name}: system=${i.system_qty} physical=${i.physical_qty} (${i.variance >= 0 ? '+' : ''}${i.variance})`).join('\n')}`,
            type: 'stock_take',
            status: 'pending',
            metadata: { location: isCentral ? 'central' : targetBranchId, items: counted, total_counted: counted.length, items_with_variance: withVariance.length, date: new Date().toISOString() }
        };

        if (window.dbRequests && typeof window.dbRequests.add === 'function') {
            await window.dbRequests.add(payload);
        }

        showToast('Stock audit report submitted successfully!', 'success');

        if (state.role === 'owner') {
            if (typeof window.renderOwnerInventoryModule === 'function') window.renderOwnerInventoryModule();
            else window.location.reload();
        } else {
            if (typeof window.renderInventoryModule === 'function') window.renderInventoryModule();
            else window.location.reload();
        }
    } catch (err) {
        showToast('Failed to submit report: ' + err.message, 'error');
    }
};

window.initPoModal = function () {
    if (!window.addPoItemRow) {
        window.addPoItemRow = function () {
            const c = document.getElementById('poItemsContainer');
            if (!c) return;
            const div = document.createElement('div');
            div.className = 'flex gap-2 items-center';
            div.innerHTML = `
                <input type="text" class="po-item-name form-input flex-1 text-sm" placeholder="Item Name / Part">
                <input type="number" step="0.01" class="po-item-qty form-input w-20 text-sm" placeholder="Qty" oninput="window.calcPoTotal()">
                <input type="number" step="0.01" class="po-item-price form-input w-24 text-sm" placeholder="Price" oninput="window.calcPoTotal()">
                <button type="button" onclick="this.parentElement.remove(); window.calcPoTotal()" class="text-red-500 hover:text-red-700 p-1"><i data-lucide="x" class="w-4 h-4"></i></button>
            `;
            c.appendChild(div);
            lucide.createIcons();
        };
    }

    if (!window.calcPoTotal) {
        window.calcPoTotal = function () {
            let total = 0;
            const rows = document.getElementById('poItemsContainer').children;
            for (const row of rows) {
                const qty = parseFloat(row.querySelector('.po-item-qty').value) || 0;
                const price = parseFloat(row.querySelector('.po-item-price').value) || 0;
                total += (qty * price);
            }
            const display = document.getElementById('poTotalAmountDisplay');
            const val = document.getElementById('poTotalAmountVal');
            if (display) display.value = fmt.currency(total);
            if (val) val.value = total;
        };
    }

    setTimeout(window.addPoItemRow, 100);

    const supplierSel = document.getElementById('poSupplierId');
    if (supplierSel) {
        const updateSuppliers = (suppliers) => {
            const options = suppliers.map(s => ({ value: s.id, label: s.name, icon: 'factory' }));
            window.updatePremiumSelectOptions('poSupplierId', options);
        };

        if (!window._currentSuppliersList) {
            dbSuppliers.fetchAll(state.ownerId).then(suppliers => {
                window._currentSuppliersList = suppliers;
                updateSuppliers(suppliers);
            }).catch(err => {
                console.error(err);
                window.updatePremiumSelectOptions('poSupplierId', [{ value: '', label: 'Failed to load suppliers', icon: 'alert-circle' }]);
            });
        } else {
            updateSuppliers(window._currentSuppliersList);
        }
    }
};

window.initQuoteModal = function () {
    if (!window.addQuoteItemRow) {
        window.addQuoteItemRow = function () {
            const c = document.getElementById('quoteItemsContainer');
            if (!c) return;
            const div = document.createElement('div');
            div.className = 'flex gap-2 items-center';
            div.innerHTML = `
                    <input type="text" class="quote-item-name form-input flex-1 text-sm" placeholder="Item/Service">
                    <input type="number" step="0.01" class="quote-item-qty form-input w-20 text-sm" placeholder="Qty" oninput="window.calcQuoteTotal()">
                    <input type="number" step="0.01" class="quote-item-price form-input w-24 text-sm" placeholder="Price" oninput="window.calcQuoteTotal()">
                    <button type="button" onclick="this.parentElement.remove(); window.calcQuoteTotal()" class="text-red-500 hover:text-red-700 p-1"><i data-lucide="x" class="w-4 h-4"></i></button>
                `;
            c.appendChild(div);
            lucide.createIcons();
        };
    }

    if (!window.calcQuoteTotal) {
        window.calcQuoteTotal = function () {
            let total = 0;
            const rows = document.getElementById('quoteItemsContainer').children;
            for (const row of rows) {
                const qty = parseFloat(row.querySelector('.quote-item-qty').value) || 0;
                const price = parseFloat(row.querySelector('.quote-item-price').value) || 0;
                total += (qty * price);
            }
            const display = document.getElementById('quoteTotalAmountDisplay');
            const val = document.getElementById('quoteTotalAmountVal');
            if (display) display.value = fmt.currency(total);
            if (val) val.value = total;
        };
    }

    setTimeout(window.addQuoteItemRow, 100);

    const customerSel = document.getElementById('quoteCustomerId');
    if (customerSel) {
        const updateCustomers = (customers) => {
            const options = [
                { value: '', label: 'Walk-in Customer', icon: 'user' },
                ...customers.map(c => ({ value: c.id, label: c.name, icon: 'user' }))
            ];
            window.updatePremiumSelectOptions('quoteCustomerId', options, '');
        };

        if (!window._currentCustomersList) {
            dbCustomers.fetchAllList(state.branchId).then(customers => {
                window._currentCustomersList = customers;
                updateCustomers(customers);
            }).catch(err => {
                console.error(err);
            });
        } else {
            updateCustomers(window._currentCustomersList);
        }
    }
};

window.populateSupplierSelect = async function (selectId, selectedValue = null) {
    const select = document.getElementById(selectId);
    if (!select) return;

    try {
        let suppliers = window._currentSuppliersList;
        if (!suppliers) {
            suppliers = await dbSuppliers.fetchAll(state.ownerId);
            window._currentSuppliersList = suppliers;
        }

        const options = suppliers.map(s => ({ value: s.name, label: s.name, icon: 'factory' }));
        if (options.length === 0) {
            window.updatePremiumSelectOptions(selectId, [{ value: '', label: 'No suppliers available', icon: 'alert-circle' }]);
        } else {
            window.updatePremiumSelectOptions(selectId, options, selectedValue);
        }
    } catch (err) {
        console.error('Failed to populate supplier select:', err);
        window.updatePremiumSelectOptions(selectId, [{ value: '', label: 'Error loading suppliers', icon: 'alert-circle' }]);
    }
};

/**
 * Account Deletion Modal with 30-Day Recovery Grace Period
 */
window.openAccountDeletionModal = function() {
    const modalId = 'account-deletion-modal';
    const old = document.getElementById(modalId);
    if (old) old.remove();

    const entName = state.profile?.business_name || state.enterpriseName || 'My Business';
    const planName = (state.profile?.plan || 'free_trial').toUpperCase();

    const reasonOptions = [
        { value: 'Closing business', label: 'Closing or transitioning business', icon: 'store' },
        { value: 'Switching software', label: 'Switching to another system', icon: 'refresh-cw' },
        { value: 'Temporary pause', label: 'Temporary pause / Seasonal business', icon: 'pause-circle' },
        { value: 'Cost consideration', label: 'Pricing or cost considerations', icon: 'credit-card' },
        { value: 'Other', label: 'Other reason', icon: 'help-circle' }
    ];

    const reasonDropdownHtml = typeof window.renderPremiumSelect === 'function' ? window.renderPremiumSelect({
        id: 'del_reason_select',
        options: reasonOptions,
        selectedValue: 'Closing business',
        placeholder: 'Select reason for leaving...',
        classes: 'w-full text-xs font-semibold rounded-2xl bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600',
        searchable: false
    }) : `
        <select id="del_reason_select" class="form-input w-full text-xs font-semibold rounded-xl">
            <option value="Closing business">Closing or transitioning business</option>
            <option value="Switching software">Switching to another system</option>
            <option value="Temporary pause">Temporary pause / Seasonal business</option>
            <option value="Cost consideration">Pricing or cost considerations</option>
            <option value="Other">Other reason</option>
        </select>
    `;

    const html = `
    <div id="${modalId}" class="fixed inset-0 z-[99999] w-screen h-screen min-h-[100dvh] bg-white dark:bg-gray-900 md:bg-black/60 md:dark:bg-black/60 md:backdrop-blur-sm flex flex-col md:items-center md:justify-center md:p-4 animate-in fade-in duration-150" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; width: 100vw; height: 100dvh; margin: 0; padding: 0;">
        <div class="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-xl bg-white dark:bg-gray-900 md:dark:bg-gray-800 md:rounded-3xl border-0 md:border md:border-red-200 md:dark:border-red-900/40 shadow-none md:shadow-2xl flex flex-col overflow-hidden m-0">
            
            <!-- Mobile Page Header (Edge to Edge) -->
            <div class="w-full px-4 py-3.5 sm:px-6 sm:py-4 bg-white dark:bg-gray-900 md:dark:bg-gray-800 border-b border-gray-200/80 dark:border-gray-700/80 flex items-center justify-between gap-3 shrink-0">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                    <button type="button" onclick="document.getElementById('${modalId}').remove()" class="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors md:hidden flex-shrink-0">
                        <i data-lucide="arrow-left" class="w-4 h-4"></i>
                    </button>
                    <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-100 dark:bg-red-950/50 text-red-600 flex items-center justify-center flex-shrink-0">
                        <i data-lucide="alert-triangle" class="w-5 h-5"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <h3 class="text-sm sm:text-base font-black text-gray-900 dark:text-white leading-tight">Delete Business Account</h3>
                        <div class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex flex-wrap items-center gap-1.5 leading-snug">
                            <span>Business: <strong class="text-gray-800 dark:text-gray-200">${entName}</strong></span>
                            <span class="text-gray-300 dark:text-gray-600">&bull;</span>
                            <span class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60">${planName} Plan</span>
                        </div>
                    </div>
                </div>
                <button type="button" onclick="document.getElementById('${modalId}').remove()" class="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <!-- Scrollable Page Content (Edge to Edge, Clean App View Style) -->
            <div class="flex-1 w-full overflow-y-auto px-4 py-4 sm:px-6 sm:py-6 space-y-4 scroller-custom bg-gray-50/50 dark:bg-gray-900/50">
                <div class="max-w-xl mx-auto w-full space-y-4">
                    
                    <div class="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/40 text-amber-900 dark:text-amber-300 text-xs space-y-2 leading-relaxed shadow-sm">
                        <p class="font-bold flex items-center gap-1.5 text-sm">
                            <i data-lucide="shield-alert" class="w-4 h-4 text-amber-600 flex-shrink-0"></i>
                            30-Day Recovery Grace Period Included
                        </p>
                        <p>
                            Your account will enter a <strong>30-day pending deletion window</strong>. Recurring subscription billing will stop immediately. If you change your mind, you can <strong>log in at any time within 30 days and reactivate your account</strong> with one click.
                        </p>
                        <p class="text-[11px] text-amber-800 dark:text-amber-400">
                            After 30 days without reactivation, all branches, inventory, and sales will be permanently purged.
                        </p>
                    </div>

                    <!-- Full Business Data Report Download Section (PDF) -->
                    <div class="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                        <div class="space-y-0.5 min-w-0 flex-1">
                            <p class="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                                <i data-lucide="file-text" class="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0"></i>
                                Download Business Summary Report (PDF)
                            </p>
                            <p class="text-[11px] text-indigo-700/80 dark:text-indigo-300/80 leading-tight">
                                Export clean, human-readable summary of branches, inventory, sales, customers, staff, and expenses before proceeding.
                            </p>
                        </div>
                        <button type="button" onclick="window.downloadFullBusinessDataArchive()" id="downloadArchiveBtn" class="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all active:scale-95 flex items-center justify-center gap-1.5 flex-shrink-0 cursor-pointer">
                            <i data-lucide="file-text" class="w-3.5 h-3.5"></i> Export PDF Report
                        </button>
                    </div>

                    <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700/80 shadow-sm space-y-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">Reason for Leaving (Optional)</label>
                            ${reasonDropdownHtml}
                        </div>

                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                Type <span class="font-mono text-red-600 font-black">DELETE</span> to confirm:
                            </label>
                            <input type="text" id="del_confirm_input" placeholder="Type DELETE" class="form-input w-full font-mono font-bold text-sm uppercase rounded-xl border-red-200 focus:border-red-500 focus:ring-red-500">
                        </div>
                    </div>

                </div>
            </div>

            <!-- Sticky Bottom Action Bar (Center Aligned) -->
            <div class="w-full px-4 py-3 sm:px-6 sm:py-4 bg-white dark:bg-gray-900 md:dark:bg-gray-800 border-t border-gray-200/80 dark:border-gray-700/80 flex items-center justify-center gap-3.5 shrink-0">
                <button type="button" onclick="document.getElementById('${modalId}').remove()" class="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/80 hover:border-gray-400 dark:hover:border-gray-500 shadow-sm transition-all active:scale-95 cursor-pointer">
                    Keep Account
                </button>
                <button type="button" id="confirmDeleteAccountBtn" onclick="window.submitAccountDeletion()" class="px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black text-white bg-red-600 hover:bg-red-700 shadow-md shadow-red-600/20 transition-all active:scale-95 flex items-center gap-2 cursor-pointer">
                    <i data-lucide="trash-2" class="w-4 h-4"></i> Schedule Deletion
                </button>
            </div>

        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    if (window.lucide) window.lucide.createIcons();
};

async function getSupabaseModalClient() {
    if (window.supabase && typeof window.supabase.from === 'function') return window.supabase;
    if (window.supabaseClient && typeof window.supabaseClient.from === 'function') return window.supabaseClient;
    try {
        const mod = await import('./supabase.js');
        return mod.supabase;
    } catch (e) {
        console.error('Failed to import supabase client in modal:', e);
        throw new Error('Database client not available');
    }
}

/**
 * Export Complete Multi-Tenant Business Report as a Clean, Human-Readable PDF Document
 */
window.downloadFullBusinessDataArchive = async function() {
    const btn = document.getElementById('downloadArchiveBtn');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-3.5 h-3.5 animate-spin"></i> Generating PDF...';
        if (window.lucide) window.lucide.createIcons({ scope: btn });
    }

    try {
        showToast('Compiling comprehensive business report across all branches...', 'info');
        
        // Ensure jsPDF and AutoTable libraries
        let jspdfLib = window.jspdf;
        if (!jspdfLib || !jspdfLib.jsPDF || !jspdfLib.jsPDF.API?.autoTable) {
            if (typeof window.ensurePdfLibraries === 'function') {
                jspdfLib = await window.ensurePdfLibraries();
            } else {
                await new Promise((resolve, reject) => {
                    const s1 = document.createElement('script');
                    s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
                    s1.onload = () => {
                        const s2 = document.createElement('script');
                        s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js';
                        s2.onload = resolve;
                        s2.onerror = reject;
                        document.head.appendChild(s2);
                    };
                    s1.onerror = reject;
                    document.head.appendChild(s1);
                });
                jspdfLib = window.jspdf;
            }
        }

        const dbClient = await getSupabaseModalClient();
        const ownerId = state.ownerId || state.currentUserUuid;

        const [
            profileRes,
            branchesRes,
            inventoryRes,
            salesRes,
            customersRes,
            suppliersRes,
            staffRes,
            expensesRes
        ] = await Promise.allSettled([
            dbClient.from('profiles').select('*').eq('id', ownerId).single(),
            dbClient.from('branches').select('*').eq('owner_id', ownerId),
            dbClient.from('branch_inventory').select('*').eq('owner_id', ownerId),
            dbClient.from('sales').select('*').eq('owner_id', ownerId).order('created_at', { ascending: false }).limit(2000),
            dbClient.from('customers').select('*').eq('owner_id', ownerId),
            dbClient.from('suppliers').select('*').eq('enterprise_id', ownerId),
            dbClient.from('staff').select('*').eq('owner_id', ownerId),
            dbClient.from('expenses').select('*').eq('owner_id', ownerId).order('date', { ascending: false }).limit(1000)
        ]);

        const profile = (profileRes.status === 'fulfilled' && profileRes.value?.data) ? profileRes.value.data : (state.profile || {});
        const branches = (branchesRes.status === 'fulfilled' && Array.isArray(branchesRes.value?.data)) ? branchesRes.value.data : (state.branches || []);
        const inventory = (inventoryRes.status === 'fulfilled' && Array.isArray(inventoryRes.value?.data)) ? inventoryRes.value.data : [];
        const sales = (salesRes.status === 'fulfilled' && Array.isArray(salesRes.value?.data)) ? salesRes.value.data : [];
        const customers = (customersRes.status === 'fulfilled' && Array.isArray(customersRes.value?.data)) ? customersRes.value.data : [];
        const suppliers = (suppliersRes.status === 'fulfilled' && Array.isArray(suppliersRes.value?.data)) ? suppliersRes.value.data : [];
        const staff = (staffRes.status === 'fulfilled' && Array.isArray(staffRes.value?.data)) ? staffRes.value.data : [];
        const expenses = (expensesRes.status === 'fulfilled' && Array.isArray(expensesRes.value?.data)) ? expensesRes.value.data : [];

        // Map branch IDs to readable names
        const branchMap = {};
        branches.forEach(b => {
            if (b.id) branchMap[b.id] = b.name || b.branch_name || 'Main Branch';
        });

        const currency = profile.currency || state.profile?.currency || 'TZS';
        const formatMoney = (val) => `${Number(val || 0).toLocaleString()} ${currency}`;

        // Totals
        const totalStockQty = inventory.reduce((sum, i) => sum + Number(i.stock_quantity || i.quantity || 0), 0);
        const totalStockValue = inventory.reduce((sum, i) => sum + (Number(i.stock_quantity || i.quantity || 0) * Number(i.selling_price || i.price || 0)), 0);
        const totalSalesRevenue = sales.reduce((sum, s) => sum + Number(s.total || s.total_amount || s.grand_total || 0), 0);
        const totalExpenseAmount = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

        const { jsPDF } = jspdfLib;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 14;
        let yPos = 16;

        const primaryColor = [30, 41, 59]; // Slate 800
        const accentColor = [79, 70, 229]; // Indigo 600
        const lightBg = [248, 250, 252]; // Slate 50
        const textMuted = [100, 116, 139]; // Slate 500

        const checkAddPage = (requiredSpace = 25) => {
            if (yPos + requiredSpace > pageHeight - 20) {
                doc.addPage();
                yPos = 16;
            }
        };

        // Header Top Bar
        doc.setFillColor(...accentColor);
        doc.rect(0, 0, pageWidth, 5, 'F');

        // Business Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(17);
        doc.setTextColor(...primaryColor);
        const businessName = profile.business_name || state.enterpriseName || 'Business Profile';
        doc.text(businessName.toUpperCase(), margin, yPos);
        yPos += 6;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(...accentColor);
        doc.text('COMPREHENSIVE BUSINESS DATA & ACTIVITY REPORT', margin, yPos);
        yPos += 6.5;

        // Meta Details Subtitle
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...textMuted);
        const genDate = new Date().toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
        const ownerEmail = profile.email || state.currentUser || 'Owner';
        const ownerPhone = profile.phone || 'N/A';
        doc.text(`Generated: ${genDate}  |  Owner: ${ownerEmail}  |  Phone: ${ownerPhone}  |  Currency: ${currency}`, margin, yPos);
        yPos += 7;

        // Divider
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 6;

        // SECTION 1: EXECUTIVE SUMMARY
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...primaryColor);
        doc.text('1. Executive Business Summary', margin, yPos);
        yPos += 3.5;

        const summaryData = [
            ['Total Branch Locations', `${branches.length} Branches`, 'Total Recorded Sales', `${sales.length} Transactions`],
            ['Total Active Staff', `${staff.length} Members`, 'Total Sales Revenue', formatMoney(totalSalesRevenue)],
            ['Total Catalog Items', `${inventory.length} Products`, 'Total Recorded Expenses', formatMoney(totalExpenseAmount)],
            ['Total Stock Quantity', `${totalStockQty.toLocaleString()} Units`, 'Total Inventory Valuation', formatMoney(totalStockValue)]
        ];

        doc.autoTable({
            startY: yPos,
            margin: { left: margin, right: margin },
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2.2, textColor: [30, 41, 59] },
            columnStyles: {
                0: { fontStyle: 'bold', fillColor: lightBg, width: 45 },
                1: { width: 45 },
                2: { fontStyle: 'bold', fillColor: lightBg, width: 45 },
                3: { width: 45 }
            },
            body: summaryData
        });
        yPos = doc.lastAutoTable.finalY + 7;

        // SECTION 2: BRANCHES
        checkAddPage(30);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...primaryColor);
        doc.text('2. Branch Locations & Outlets', margin, yPos);
        yPos += 3.5;

        const branchRows = branches.length > 0 ? branches.map(b => [
            b.name || b.branch_name || 'Main Branch',
            b.address || b.location || 'N/A',
            b.phone || profile.phone || 'N/A',
            b.is_active !== false ? 'Active' : 'Inactive'
        ]) : [['Main Branch', 'Primary Location', profile.phone || 'N/A', 'Active']];

        doc.autoTable({
            startY: yPos,
            margin: { left: margin, right: margin },
            head: [['Branch Name', 'Location / Address', 'Contact Phone', 'Status']],
            headStyles: { fillColor: accentColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
            styles: { fontSize: 7.5, cellPadding: 2 },
            alternateRowStyles: { fillColor: lightBg },
            body: branchRows
        });
        yPos = doc.lastAutoTable.finalY + 7;

        // SECTION 3: INVENTORY
        checkAddPage(35);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...primaryColor);
        doc.text('3. Product Catalog & Inventory Valuation', margin, yPos);
        yPos += 3.5;

        const invRows = inventory.length > 0 ? inventory.slice(0, 100).map(i => {
            const qty = Number(i.stock_quantity || i.quantity || 0);
            const price = Number(i.selling_price || i.price || 0);
            const branchName = branchMap[i.branch_id] || 'All Branches';
            return [
                i.item_name || i.name || 'Unnamed Product',
                i.category || 'General',
                branchName,
                qty.toLocaleString(),
                formatMoney(price),
                formatMoney(qty * price)
            ];
        }) : [['No inventory records found', '-', '-', '0', '0', '0']];

        doc.autoTable({
            startY: yPos,
            margin: { left: margin, right: margin },
            head: [['Product Name', 'Category', 'Branch', 'In Stock', 'Unit Price', 'Total Value']],
            headStyles: { fillColor: accentColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
            styles: { fontSize: 7.5, cellPadding: 2 },
            alternateRowStyles: { fillColor: lightBg },
            body: invRows
        });
        yPos = doc.lastAutoTable.finalY + 7;

        // SECTION 4: SALES
        checkAddPage(35);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...primaryColor);
        doc.text('4. Sales Records & Revenue Overview (Recent Activity)', margin, yPos);
        yPos += 3.5;

        const salesRows = sales.length > 0 ? sales.slice(0, 60).map((s, idx) => {
            const dateStr = s.created_at ? new Date(s.created_at).toLocaleDateString() : 'N/A';
            const branchName = branchMap[s.branch_id] || 'Main Branch';
            const customerName = s.customer_name || s.customer?.name || 'Walk-in Customer';
            const paymentMethod = (s.payment_method || 'Cash').toUpperCase();
            const total = Number(s.total || s.total_amount || s.grand_total || 0);
            const receiptNo = s.receipt_number || s.invoice_number || `TXN-${sales.length - idx}`;
            return [
                receiptNo,
                dateStr,
                branchName,
                customerName,
                paymentMethod,
                formatMoney(total)
            ];
        }) : [['No sales records found', '-', '-', '-', '-', '0']];

        doc.autoTable({
            startY: yPos,
            margin: { left: margin, right: margin },
            head: [['Receipt / ID', 'Date', 'Branch', 'Customer', 'Payment Method', 'Total Amount']],
            headStyles: { fillColor: accentColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
            styles: { fontSize: 7.5, cellPadding: 2 },
            alternateRowStyles: { fillColor: lightBg },
            body: salesRows
        });
        yPos = doc.lastAutoTable.finalY + 7;

        // SECTION 5: CUSTOMERS
        checkAddPage(30);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...primaryColor);
        doc.text('5. Customer Directory', margin, yPos);
        yPos += 3.5;

        const custRows = customers.length > 0 ? customers.slice(0, 50).map(c => [
            c.name || c.full_name || 'Customer',
            c.phone || 'N/A',
            c.email || 'N/A',
            formatMoney(c.outstanding_balance || c.debt || 0)
        ]) : [['No customer records registered', '-', '-', '0']];

        doc.autoTable({
            startY: yPos,
            margin: { left: margin, right: margin },
            head: [['Customer Name', 'Phone Number', 'Email Address', 'Outstanding Balance']],
            headStyles: { fillColor: accentColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
            styles: { fontSize: 7.5, cellPadding: 2 },
            alternateRowStyles: { fillColor: lightBg },
            body: custRows
        });
        yPos = doc.lastAutoTable.finalY + 7;

        // SECTION 6: STAFF & SUPPLIERS
        checkAddPage(30);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...primaryColor);
        doc.text('6. Staff Members & Personnel', margin, yPos);
        yPos += 3.5;

        const staffRows = staff.length > 0 ? staff.map(st => [
            st.name || st.full_name || st.username || 'Staff Member',
            (st.role || 'Staff').toUpperCase(),
            branchMap[st.branch_id] || 'All Branches',
            st.phone || 'N/A',
            st.is_active !== false ? 'Active' : 'Inactive'
        ]) : [[profile.owner_name || 'Business Owner', 'OWNER / ADMIN', 'All Branches', profile.phone || 'N/A', 'Active']];

        doc.autoTable({
            startY: yPos,
            margin: { left: margin, right: margin },
            head: [['Staff Name', 'Role / Position', 'Assigned Branch', 'Phone', 'Status']],
            headStyles: { fillColor: accentColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
            styles: { fontSize: 7.5, cellPadding: 2 },
            alternateRowStyles: { fillColor: lightBg },
            body: staffRows
        });
        yPos = doc.lastAutoTable.finalY + 7;

        // SECTION 7: EXPENSES
        checkAddPage(30);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(...primaryColor);
        doc.text('7. Recorded Business Expenses', margin, yPos);
        yPos += 3.5;

        const expenseRows = expenses.length > 0 ? expenses.slice(0, 50).map(e => [
            e.date || (e.created_at ? new Date(e.created_at).toLocaleDateString() : 'N/A'),
            e.category || 'General Expense',
            branchMap[e.branch_id] || 'Main Branch',
            e.description || e.notes || 'N/A',
            formatMoney(e.amount || 0)
        ]) : [['No recorded expenses found', '-', '-', '-', '0']];

        doc.autoTable({
            startY: yPos,
            margin: { left: margin, right: margin },
            head: [['Date', 'Category', 'Branch', 'Description / Note', 'Amount']],
            headStyles: { fillColor: accentColor, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
            styles: { fontSize: 7.5, cellPadding: 2 },
            alternateRowStyles: { fillColor: lightBg },
            body: expenseRows
        });

        // Page Numbering Footer on All Pages
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(...textMuted);
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.3);
            doc.line(margin, pageHeight - 9, pageWidth - margin, pageHeight - 9);
            doc.text('BMSTz Enterprise Cloud  |  Confidential Business Summary Report', margin, pageHeight - 5.5);
            doc.text(`Page ${i} of ${totalPages}`, pageWidth - margin, pageHeight - 5.5, { align: 'right' });
        }

        const entNameClean = (profile.business_name || state.enterpriseName || 'Business').replace(/[^a-zA-Z0-9_-]/g, '_');
        const dateClean = new Date().toISOString().split('T')[0];
        doc.save(`${entNameClean}_Complete_Business_Report_${dateClean}.pdf`);

        showToast('Complete business summary report exported as PDF successfully!', 'success');
    } catch (err) {
        console.error('Failed to export full business report PDF:', err);
        showToast('Failed to export report: ' + err.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = origHtml || '<i data-lucide="file-text" class="w-3.5 h-3.5"></i> Export PDF Report';
            if (window.lucide) window.lucide.createIcons({ scope: btn });
        }
    }
};

window.submitAccountDeletion = async function() {
    const input = document.getElementById('del_confirm_input');
    if (!input || input.value.trim().toUpperCase() !== 'DELETE') {
        showToast('Please type DELETE to confirm account deletion', 'warning');
        if (input) input.focus();
        return;
    }

    const reason = document.getElementById('del_reason_select')?.value || 'User requested deletion';
    const btn = document.getElementById('confirmDeleteAccountBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Scheduling...';
        if (window.lucide) window.lucide.createIcons();
    }

    try {
        const dbClient = await getSupabaseModalClient();
        let rpcRes = null;
        try {
            const { data, error } = await dbClient.rpc('request_account_deletion', { p_reason: reason });
            if (!error && data) rpcRes = data;
        } catch (e) {
            console.warn('[Account Deletion] RPC fallback to direct update:', e);
        }

        if (!rpcRes) {
            const scheduled = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
            await dbClient.from('profiles').update({
                status: 'deletion_requested',
                deletion_requested_at: new Date().toISOString(),
                deletion_scheduled_for: scheduled,
                deletion_reason: reason
            }).eq('id', state.ownerId || state.currentUserUuid);
        }

        showToast('Account scheduled for deletion. You have 30 days to reactivate anytime.', 'info');
        
        const modal = document.getElementById('account-deletion-modal');
        if (modal) modal.remove();

        setTimeout(() => {
            if (typeof window.logout === 'function') {
                window.logout();
            } else {
                window.location.reload();
            }
        }, 1500);
    } catch (err) {
        console.error('Failed to schedule account deletion:', err);
        showToast('Failed to schedule account deletion: ' + err.message, 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i> Schedule Deletion';
            if (window.lucide) window.lucide.createIcons();
        }
    }
};

/**
 * Account Reactivation Modal (Shown when logging in during the 30-day grace period)
 */
window.openAccountReactivationModal = function(deletionInfo = {}) {
    const modalId = 'account-reactivation-modal';
    const old = document.getElementById(modalId);
    if (old) old.remove();

    const scheduledDate = deletionInfo.scheduledFor ? new Date(deletionInfo.scheduledFor) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const daysLeft = Math.max(1, Math.ceil((scheduledDate - new Date()) / (1000 * 60 * 60 * 24)));
    const formattedDate = scheduledDate.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

    const html = `
    <div id="${modalId}" class="fixed inset-0 z-[99999] w-screen h-screen min-h-[100dvh] bg-white dark:bg-gray-900 md:bg-black/75 md:dark:bg-black/75 md:backdrop-blur-md flex flex-col md:items-center md:justify-center md:p-4 animate-in fade-in duration-150" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; width: 100vw; height: 100dvh; margin: 0; padding: 0;">
        <div class="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-lg bg-white dark:bg-gray-900 md:dark:bg-gray-800 md:rounded-3xl border-0 md:border md:border-amber-300 md:dark:border-amber-800/60 shadow-none md:shadow-2xl flex flex-col overflow-hidden text-center m-0">
            
            <!-- Compact Header Flush to Top -->
            <div class="w-full px-4 py-3.5 sm:px-6 sm:py-4 border-b border-gray-200/80 dark:border-gray-700/80 flex items-center justify-between gap-3 bg-white dark:bg-gray-900 md:dark:bg-gray-800 shrink-0">
                <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/50 rounded-full text-xs font-black uppercase tracking-wider">
                    <i data-lucide="clock" class="w-3.5 h-3.5"></i> ${daysLeft} Days Left
                </span>
                <button type="button" onclick="window.logout ? window.logout() : window.location.reload()" class="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <!-- Scrollable Body Content -->
            <div class="flex-1 w-full overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 space-y-6 flex flex-col items-center justify-center scroller-custom bg-gray-50/50 dark:bg-gray-900/50">
                <div class="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
                    <i data-lucide="clock" class="w-8 h-8"></i>
                </div>
                
                <div class="space-y-2">
                    <h3 class="text-xl font-black text-gray-900 dark:text-white">Account Scheduled for Deletion</h3>
                    <p class="text-xs sm:text-sm text-gray-600 dark:text-gray-300 max-w-sm mx-auto leading-relaxed">
                        This account is scheduled for permanent purge on <strong class="text-gray-900 dark:text-white">${formattedDate}</strong>.
                    </p>
                </div>

                <div class="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 text-left text-xs text-gray-600 dark:text-gray-400 space-y-2 w-full max-w-sm shadow-sm">
                    <p class="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                        <i data-lucide="check-circle" class="w-4 h-4 text-emerald-500"></i>
                        All your data is safely preserved
                    </p>
                    <p>Reactivating will immediately cancel the scheduled deletion and restore full access to your business branches, staff, inventory, and sales.</p>
                </div>
            </div>

            <!-- Compact Footer Flush to Bottom (Center Aligned) -->
            <div class="w-full px-4 py-3 sm:px-6 sm:py-4 border-t border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-gray-900 md:dark:bg-gray-800 flex items-center justify-center gap-3.5 shrink-0">
                <button type="button" onclick="window.confirmReactivateAccount()" id="reactivateAccountBtn" class="w-full sm:w-auto px-6 py-3 rounded-xl font-black text-xs sm:text-sm text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer">
                    <i data-lucide="rotate-ccw" class="w-4 h-4"></i> Reactivate Account
                </button>
                <button type="button" onclick="window.logout ? window.logout() : window.location.reload()" class="w-full sm:w-auto px-5 py-3 rounded-xl font-bold text-xs sm:text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/80 hover:border-gray-400 dark:hover:border-gray-500 shadow-sm transition-all active:scale-95 cursor-pointer">
                    Sign Out
                </button>
            </div>

        </div>
    </div>
    `;

    document.body.insertAdjacentHTML('beforeend', html);
    if (window.lucide) window.lucide.createIcons();
};

window.confirmReactivateAccount = async function() {
    const btn = document.getElementById('reactivateAccountBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Reactivating...';
        if (window.lucide) window.lucide.createIcons();
    }

    try {
        const dbClient = await getSupabaseModalClient();
        let rpcRes = null;
        try {
            const { data, error } = await dbClient.rpc('cancel_account_deletion');
            if (!error && data) rpcRes = data;
        } catch (e) {
            console.warn('[Account Reactivation] RPC fallback to direct update:', e);
        }

        if (!rpcRes) {
            await dbClient.from('profiles').update({
                status: 'active',
                deletion_requested_at: null,
                deletion_scheduled_for: null,
                deletion_reason: null
            }).eq('id', state.ownerId || state.currentUserUuid);
        }

        if (state.profile) {
            state.profile.status = 'active';
            state.profile.deletion_scheduled_for = null;
        }

        showToast('Welcome back! Your account has been reactivated successfully.', 'success');
        const modal = document.getElementById('account-reactivation-modal');
        if (modal) modal.remove();

        // Refresh dashboard state
        if (typeof window.setupDashboard === 'function') {
            window.setupDashboard();
        }
    } catch (err) {
        console.error('Failed to reactivate account:', err);
        showToast('Failed to reactivate account: ' + err.message, 'error');
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="rotate-ccw" class="w-4 h-4"></i> Reactivate Account';
            if (window.lucide) window.lucide.createIcons();
        }
    }
};

/* ─── Branch Details Interactive Hub & Table Engine ─── */
if (typeof window !== 'undefined') {
    window._branchDetailsActiveTab = 'all';
    window._branchDetailsSearchQuery = '';

    window.setBranchDetailsTab = function(tab) {
        window._branchDetailsActiveTab = tab;
        const buttons = document.querySelectorAll('.branch-details-tab-btn');
        buttons.forEach(btn => {
            const isMatch = btn.getAttribute('data-tab') === tab;
            if (isMatch) {
                btn.className = 'branch-details-tab-btn px-3 py-1.5 rounded-full text-xs font-bold transition-all bg-indigo-600 text-white shadow-xs shrink-0 cursor-pointer';
            } else {
                btn.className = 'branch-details-tab-btn px-3 py-1.5 rounded-full text-xs font-bold transition-all bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 shrink-0 cursor-pointer';
            }
        });
        window.renderBranchDetailsTable();
    };

    window.onBranchDetailsSearch = function(query) {
        window._branchDetailsSearchQuery = query;
        window.renderBranchDetailsTable();
    };

    window.renderBranchDetailsTable = function() {
        const container = document.getElementById('branchDetailsTableContainer');
        if (!container || !window._branchDetailsData) return;
        const data = window._branchDetailsData;
        const tab = window._branchDetailsActiveTab || 'all';
        const query = (window._branchDetailsSearchQuery || '').trim().toLowerCase();

        const items = data._inventory || [];
        const sales = data._sales || [];
        const expenses = data._expenses || [];

        if (tab === 'daily') {
            const todayStr = new Date().toISOString().split('T')[0];
            const todaySalesList = sales.filter(s => (s.created_at || '').startsWith(todayStr) || (s.date || '').startsWith(todayStr));
            const todayExpensesList = expenses.filter(e => (e.created_at || '').startsWith(todayStr) || (e.date || '').startsWith(todayStr));

            container.innerHTML = `
                <div class="space-y-3">
                    <div class="flex items-center justify-between">
                        <h4 class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">Today's Transactions &amp; Ledger (${todaySalesList.length} sales, ${todayExpensesList.length} expenses)</h4>
                    </div>
                    ${todaySalesList.length === 0 && todayExpensesList.length === 0 ? `
                        <div class="py-8 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-400 text-xs font-medium">
                            <i data-lucide="inbox" class="w-8 h-8 mx-auto mb-1.5 text-gray-300"></i>
                            No operational sales or expenses recorded for this branch today.
                        </div>
                    ` : `
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <!-- Today's Sales Column -->
                            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-gray-700 p-3 space-y-2">
                                <div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                                    <span class="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5"><i data-lucide="shopping-bag" class="w-3.5 h-3.5"></i> Sales (${todaySalesList.length})</span>
                                    <span class="text-xs font-black text-emerald-600">${window.fmt.currency(todaySalesList.reduce((s, x) => s + (Number(x.amount) || 0), 0))}</span>
                                </div>
                                <div class="space-y-1.5 max-h-56 overflow-y-auto scroller-custom">
                                    ${todaySalesList.map(s => `
                                        <div class="p-2 rounded-xl bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between text-xs">
                                            <div class="min-w-0 pr-2">
                                                <p class="font-bold text-gray-800 dark:text-gray-200 truncate">${s.items || s.item_name || 'Sale Transaction'}</p>
                                                <p class="text-[10px] text-gray-400 truncate">${s.customer || 'Walk-in'} • ${s.payment_method || 'Cash'}</p>
                                            </div>
                                            <span class="font-bold text-emerald-600 shrink-0">${window.fmt.currency(s.amount)}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                            <!-- Today's Expenses Column -->
                            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-150 dark:border-gray-700 p-3 space-y-2">
                                <div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2">
                                    <span class="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5"><i data-lucide="receipt" class="w-3.5 h-3.5"></i> Expenses (${todayExpensesList.length})</span>
                                    <span class="text-xs font-black text-rose-600">${window.fmt.currency(todayExpensesList.reduce((s, x) => s + (Number(x.amount) || 0), 0))}</span>
                                </div>
                                <div class="space-y-1.5 max-h-56 overflow-y-auto scroller-custom">
                                    ${todayExpensesList.map(e => `
                                        <div class="p-2 rounded-xl bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between text-xs">
                                            <div class="min-w-0 pr-2">
                                                <p class="font-bold text-gray-800 dark:text-gray-200 truncate">${e.description || e.category || 'Expense'}</p>
                                                <p class="text-[10px] text-gray-400 truncate">${e.category || 'General'}</p>
                                            </div>
                                            <span class="font-bold text-rose-600 shrink-0">${window.fmt.currency(e.amount)}</span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                    `}
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        const isItemService = (i) => i.is_service || i.item_type === 'service' || (i.category && String(i.category).toLowerCase().includes('service')) || (i.unit && String(i.unit).toLowerCase() === 'service');
        let filteredItems = items;
        if (tab === 'low') {
            filteredItems = items.filter(i => !isItemService(i) && (Number(i.quantity) || 0) <= (Number(i.min_threshold) || 5));
        } else if (tab === 'services') {
            filteredItems = items.filter(i => isItemService(i));
        } else {
            filteredItems = items.filter(i => !isItemService(i));
        }

        if (query) {
            filteredItems = filteredItems.filter(i =>
                (i.name || '').toLowerCase().includes(query) ||
                (i.sku || '').toLowerCase().includes(query) ||
                (i.category || '').toLowerCase().includes(query)
            );
        }

        if (filteredItems.length === 0) {
            container.innerHTML = `
                <div class="py-8 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-400 text-xs font-medium">
                    <i data-lucide="package-open" class="w-8 h-8 mx-auto mb-1.5 text-gray-300"></i>
                    ${query ? `No items matching "${query}"` : 'No inventory items assigned in this category.'}
                </div>
            `;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        container.innerHTML = `
            <!-- Unified Responsive Stock Cards Grid (Mobile, Tablet, Desktop) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5 sm:gap-3">
                ${filteredItems.map(item => {
                    const isSvc = item.is_service || item.item_type === 'service' || (item.category && String(item.category).toLowerCase().includes('service')) || (item.unit && String(item.unit).toLowerCase() === 'service');
                    const qty = Number(item.quantity) || 0;
                    const minThresh = Number(item.min_threshold) || 5;
                    const isLow = !isSvc && qty <= minThresh;
                    const isOut = !isSvc && qty <= 0;

                    const buyPrice = Number(item.buying_price || item.cost_price) || 0;
                    const sellPrice = Number(item.retail_price || item.selling_price || item.price) || 0;
                    const wholesalePrice = Number(item.wholesale_price) || 0;
                    const totalVal = qty * buyPrice;

                    const badgeClass = isSvc
                        ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                        : isOut
                        ? 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200 dark:border-red-800'
                        : isLow
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';

                    const statusText = isSvc ? 'Service' : isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock';

                    return `
                    <div class="bg-white dark:bg-gray-800 p-3 sm:p-3.5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-2xs space-y-2.5 flex flex-col justify-between hover:border-gray-300 dark:hover:border-gray-600 transition-all">
                        <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0 flex-1">
                                <h4 class="text-xs sm:text-sm font-black text-gray-900 dark:text-white leading-tight break-words">${item.name}</h4>
                                <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <span class="text-[9px] sm:text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight">${item.category || 'General'}</span>
                                    ${item.sku ? `<span class="text-[9px] text-gray-400 font-mono bg-gray-100 dark:bg-gray-700/60 px-1.5 py-0.2 rounded">SKU: ${item.sku}</span>` : ''}
                                </div>
                            </div>
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border ${badgeClass} shrink-0">
                                ${statusText}
                            </span>
                        </div>

                        <div class="pt-2 border-t border-gray-100 dark:border-gray-700/60 flex items-start justify-between text-xs gap-2">
                            <div class="min-w-0">
                                <span class="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500 block leading-tight">In Stock</span>
                                <span class="font-extrabold ${isLow ? 'text-rose-600 dark:text-rose-400' : 'text-gray-900 dark:text-white'} text-xs sm:text-[13px]">${isSvc ? '—' : `${qty} units`}</span>
                            </div>
                            <div class="text-center min-w-0">
                                <span class="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500 block leading-tight">Retail / Wholesale</span>
                                <div class="flex items-center justify-center gap-1 flex-wrap mt-0.5">
                                    <span class="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs sm:text-[13px]" title="Retail Price">${window.fmt.currency(sellPrice)}</span>
                                    ${wholesalePrice && wholesalePrice > 0 ? `
                                        <span class="text-[10.5px] font-bold text-indigo-600 dark:text-indigo-400" title="Wholesale Price">/ ${window.fmt.currency(wholesalePrice)}</span>
                                    ` : ''}
                                </div>
                            </div>
                            <div class="text-right min-w-0">
                                <span class="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500 block leading-tight">Cost Value</span>
                                <span class="font-extrabold text-gray-900 dark:text-white text-xs sm:text-[13px]">${isSvc ? '—' : window.fmt.currency(totalVal)}</span>
                            </div>
                        </div>

                        <!-- Quick Restock Widget (+ / - and quantity input) & Stock Movement Actions -->
                        ${!isSvc ? `
                        <div class="pt-2 border-t border-dashed border-gray-200 dark:border-gray-700 flex flex-col gap-2 bg-gray-50/70 dark:bg-gray-900/40 -mx-3 -mb-3 sm:-mx-3.5 sm:-mb-3.5 p-2 sm:p-2.5 rounded-b-2xl">
                            <div class="flex items-center justify-between gap-2">
                                <span class="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-tight flex items-center gap-1 shrink-0">
                                    <i data-lucide="package-plus" class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"></i> Restock:
                                </span>
                                <div class="flex items-center gap-1.5">
                                    <div class="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-0.5 shadow-2xs">
                                        <button type="button" onclick="window.adjustBranchItemQuickRestock('${item.id}', -1)" title="Decrease Quantity" class="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 flex items-center justify-center font-black active:scale-95 transition-all cursor-pointer">
                                            <i data-lucide="minus" class="w-3 h-3"></i>
                                        </button>
                                        <input type="number" id="quickRestockInput_${item.id}" value="${(window._branchStagedRestocks && window._branchStagedRestocks[item.id]) !== undefined ? window._branchStagedRestocks[item.id] : 1}" min="1" step="1" oninput="window.onBranchItemQuickRestockInput('${item.id}', this.value)" class="w-11 h-6 text-center text-xs font-black bg-transparent text-gray-900 dark:text-white focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none">
                                        <button type="button" onclick="window.adjustBranchItemQuickRestock('${item.id}', 1)" title="Increase Quantity" class="w-6 h-6 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 flex items-center justify-center font-black active:scale-95 transition-all cursor-pointer">
                                            <i data-lucide="plus" class="w-3 h-3"></i>
                                        </button>
                                    </div>
                                    <button type="button" onclick="window.applyBranchItemQuickRestock('${item.id}')" class="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-extrabold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-xs">
                                        <i data-lucide="check" class="w-3 h-3"></i>
                                        <span>Add</span>
                                    </button>
                                </div>
                            </div>
                            <div class="flex items-center gap-1.5 pt-0.5 border-t border-gray-100 dark:border-gray-800">
                                <button type="button" onclick="window.openBranchItemReturnModal('${item.id}')" class="flex-1 py-1 px-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold rounded-lg text-[10px] sm:text-[10.5px] flex items-center justify-center gap-1 border border-amber-200/60 dark:border-amber-800/60 transition-all cursor-pointer shadow-2xs" title="Return stock back to Main Store">
                                    <i data-lucide="corner-up-left" class="w-3 h-3"></i>
                                    <span>Return to Main</span>
                                </button>
                                <button type="button" onclick="window.openBranchItemTransferModal('${item.id}')" class="flex-1 py-1 px-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-bold rounded-lg text-[10px] sm:text-[10.5px] flex items-center justify-center gap-1 border border-purple-200/60 dark:border-purple-800/60 transition-all cursor-pointer shadow-2xs" title="Transfer stock to another branch">
                                    <i data-lucide="arrow-right-left" class="w-3 h-3"></i>
                                    <span>Transfer</span>
                                </button>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    `;
                }).join('')}
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
    };

    window.onBranchItemQuickRestockInput = function(itemId, val) {
        window._branchStagedRestocks = window._branchStagedRestocks || {};
        const parsed = parseInt(val);
        if (!isNaN(parsed) && parsed > 0) {
            window._branchStagedRestocks[itemId] = parsed;
        } else {
            delete window._branchStagedRestocks[itemId];
        }
        window.updateBranchRestockAllVisibility();
    };

    window.adjustBranchItemQuickRestock = function(itemId, delta) {
        const input = document.getElementById('quickRestockInput_' + itemId);
        if (!input) return;
        const current = parseInt(input.value) || 1;
        const next = Math.max(1, current + delta);
        input.value = next;
        window._branchStagedRestocks = window._branchStagedRestocks || {};
        window._branchStagedRestocks[itemId] = next;
        window.updateBranchRestockAllVisibility();
    };

    window.updateBranchRestockAllVisibility = function() {
        const staged = window._branchStagedRestocks || {};
        const count = Object.values(staged).filter(q => Number(q) > 0).length;
        const btn = document.getElementById('branchDetailsRestockAllBtn');
        const countEl = document.getElementById('branchDetailsRestockCount');
        if (!btn) return;
        if (count > 1) {
            btn.classList.remove('hidden');
            if (countEl) countEl.textContent = count;
        } else {
            btn.classList.add('hidden');
        }
    };

    window.applyBranchItemQuickRestock = async function(itemId) {
        const input = document.getElementById('quickRestockInput_' + itemId);
        const qtyToAdd = parseInt(input?.value) || 1;
        if (qtyToAdd <= 0) {
            if (typeof window.showToast === 'function') {
                window.showToast('Please enter a valid restock quantity.', 'warning');
            }
            return;
        }

        const data = window._branchDetailsData;
        if (!data || !Array.isArray(data._inventory)) return;

        const item = data._inventory.find(i => i.id === itemId);
        if (!item) return;

        const oldQty = Number(item.quantity) || 0;
        const newQty = oldQty + qtyToAdd;

        try {
            if (typeof window.showLoader === 'function') {
                window.showLoader(`Restocking ${item.name} (+${qtyToAdd} units)...`);
            }

            if (window.dbInventory && typeof window.dbInventory.updateQty === 'function') {
                await window.dbInventory.updateQty(itemId, newQty);
            } else if (window.supabaseClient) {
                await window.supabaseClient.from('inventory').update({ quantity: newQty }).eq('id', itemId);
            }

            // Update in-memory item
            item.quantity = newQty;

            // Remove from staged map and update button visibility
            if (window._branchStagedRestocks) {
                delete window._branchStagedRestocks[itemId];
                window.updateBranchRestockAllVisibility();
            }

            // Record stock movement note if ledger engine exists
            if (window.dbStockMovements && typeof window.dbStockMovements.add === 'function') {
                window.dbStockMovements.add({
                    branch_id: data.id,
                    item_id: itemId,
                    item_name: item.name,
                    movement_type: 'restock',
                    quantity: qtyToAdd,
                    previous_quantity: oldQty,
                    new_quantity: newQty,
                    reference_no: 'BRANCH-RESTOCK-' + Date.now().toString().slice(-6),
                    notes: `Quick restocked ${qtyToAdd} units via Branch Details modal`,
                    owner_id: window.state?.ownerId
                }).catch(e => console.warn('[quickRestock] ledger tracking note:', e));
            }

            // Recompute branch statistics
            const isItemService = (i) => i.is_service || i.item_type === 'service' || (i.category && String(i.category).toLowerCase().includes('service')) || (i.unit && String(i.unit).toLowerCase() === 'service');
            const physicalProducts = data._inventory.filter(i => !isItemService(i));
            const lowStockItems = physicalProducts.filter(i => (Number(i.quantity) || 0) <= (Number(i.min_threshold) || 5));
            const totalAssignedStockUnits = physicalProducts.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
            const totalStockValuationCost = physicalProducts.reduce((sum, i) => sum + ((Number(i.quantity) || 0) * (Number(i.buying_price || i.cost_price) || 0)), 0);

            // Update DOM stat cards if present
            const statAssignedEl = document.getElementById('branchDetailsStatAssigned');
            if (statAssignedEl) {
                statAssignedEl.innerHTML = `${physicalProducts.length} Items <span class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">(${totalAssignedStockUnits} Units)</span>`;
            }
            const statValuationEl = document.getElementById('branchDetailsStatValuation');
            if (statValuationEl) {
                statValuationEl.textContent = window.fmt.number(totalStockValuationCost);
                statValuationEl.title = window.fmt.currency(totalStockValuationCost);
            }
            const statLowEl = document.getElementById('branchDetailsStatLowStock');
            if (statLowEl) {
                statLowEl.textContent = `${lowStockItems.length} Items Low`;
            }

            // Update Tab badge numbers
            const tabAllEl = document.getElementById('branchDetailsTabBtnAll');
            if (tabAllEl) {
                tabAllEl.textContent = `All Stock (${physicalProducts.length})`;
            }
            const tabLowEl = document.getElementById('branchDetailsTabBtnLow');
            if (tabLowEl) {
                tabLowEl.textContent = `Low Stock (${lowStockItems.length})`;
            }

            // Re-render the cards table
            window.renderBranchDetailsTable();

            if (typeof window.showToast === 'function') {
                window.showToast(`Restocked ${item.name}! Added +${qtyToAdd} units (Total: ${newQty}).`, 'success');
            }
        } catch (err) {
            console.error('[applyBranchItemQuickRestock] Error:', err);
            if (typeof window.showToast === 'function') {
                window.showToast('Failed to restock item: ' + err.message, 'error');
            }
        } finally {
            if (typeof window.hideLoader === 'function') {
                window.hideLoader();
            }
        }
    };

    window.applyBranchDetailsRestockAll = async function() {
        const staged = window._branchStagedRestocks || {};
        const entries = Object.entries(staged).filter(([_, qty]) => Number(qty) > 0);
        if (entries.length === 0) {
            if (typeof window.showToast === 'function') {
                window.showToast('No items staged for restock.', 'warning');
            }
            return;
        }

        const data = window._branchDetailsData;
        if (!data || !Array.isArray(data._inventory)) return;

        try {
            if (typeof window.showLoader === 'function') {
                window.showLoader(`Batch restocking ${entries.length} items...`);
            }
            let totalUnitsAdded = 0;

            for (const [itemId, qtyToAdd] of entries) {
                const item = data._inventory.find(i => i.id === itemId);
                if (!item) continue;
                const oldQty = Number(item.quantity) || 0;
                const addCount = Number(qtyToAdd) || 1;
                const newQty = oldQty + addCount;
                totalUnitsAdded += addCount;

                if (window.dbInventory && typeof window.dbInventory.updateQty === 'function') {
                    await window.dbInventory.updateQty(itemId, newQty);
                } else if (window.supabaseClient) {
                    await window.supabaseClient.from('inventory').update({ quantity: newQty }).eq('id', itemId);
                }

                item.quantity = newQty;

                if (window.dbStockMovements && typeof window.dbStockMovements.add === 'function') {
                    window.dbStockMovements.add({
                        branch_id: data.id,
                        item_id: itemId,
                        item_name: item.name,
                        movement_type: 'restock',
                        quantity: addCount,
                        previous_quantity: oldQty,
                        new_quantity: newQty,
                        reference_no: 'BATCH-RESTOCK-' + Date.now().toString().slice(-6),
                        notes: `Batch restocked ${addCount} units via Branch Details Restock All`,
                        owner_id: window.state?.ownerId
                    }).catch(e => console.warn('[restockAll] ledger error:', e));
                }
            }

            // Clear staged map
            window._branchStagedRestocks = {};
            window.updateBranchRestockAllVisibility();

            // Recompute branch statistics
            const isItemService = (i) => i.is_service || i.item_type === 'service' || (i.category && String(i.category).toLowerCase().includes('service')) || (i.unit && String(i.unit).toLowerCase() === 'service');
            const physicalProducts = data._inventory.filter(i => !isItemService(i));
            const lowStockItems = physicalProducts.filter(i => (Number(i.quantity) || 0) <= (Number(i.min_threshold) || 5));
            const totalAssignedStockUnits = physicalProducts.reduce((sum, i) => sum + (Number(i.quantity) || 0), 0);
            const totalStockValuationCost = physicalProducts.reduce((sum, i) => sum + ((Number(i.quantity) || 0) * (Number(i.buying_price || i.cost_price) || 0)), 0);

            // Update DOM stat cards
            const statAssignedEl = document.getElementById('branchDetailsStatAssigned');
            if (statAssignedEl) {
                statAssignedEl.innerHTML = `${physicalProducts.length} Items <span class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">(${totalAssignedStockUnits} Units)</span>`;
            }
            const statValuationEl = document.getElementById('branchDetailsStatValuation');
            if (statValuationEl) {
                statValuationEl.textContent = window.fmt.number(totalStockValuationCost);
                statValuationEl.title = window.fmt.currency(totalStockValuationCost);
            }
            const statLowEl = document.getElementById('branchDetailsStatLowStock');
            if (statLowEl) {
                statLowEl.textContent = `${lowStockItems.length} Items Low`;
            }

            // Update tab badge numbers
            const tabAllEl = document.getElementById('branchDetailsTabBtnAll');
            if (tabAllEl) {
                tabAllEl.textContent = `All Stock (${physicalProducts.length})`;
            }
            const tabLowEl = document.getElementById('branchDetailsTabBtnLow');
            if (tabLowEl) {
                tabLowEl.textContent = `Low Stock (${lowStockItems.length})`;
            }

            // Re-render table cards
            window.renderBranchDetailsTable();

            if (typeof window.showToast === 'function') {
                window.showToast(`Batch restocked ${entries.length} items (+${totalUnitsAdded} units total)!`, 'success');
            }
        } catch (err) {
            console.error('[applyBranchDetailsRestockAll] Error:', err);
            if (typeof window.showToast === 'function') {
                window.showToast('Failed to restock items: ' + err.message, 'error');
            }
        } finally {
            if (typeof window.hideLoader === 'function') {
                window.hideLoader();
            }
        }
    };

    window.openBranchItemReturnModal = async function(itemId) {
        const data = window._branchDetailsData;
        if (!data || !Array.isArray(data._inventory)) return;
        const item = data._inventory.find(i => i.id === itemId);
        if (!item) return;

        const centralItemId = item.central_item_id || item.id;
        if (typeof window.openDispatchModal !== 'function') {
            try {
                if (typeof window.showLoader === 'function') window.showLoader('Loading stock operations...');
                await import('./owner/central_inventory.js');
            } catch (loadErr) {
                console.error('[openBranchItemReturnModal] Failed to load central_inventory module:', loadErr);
                if (typeof window.showToast === 'function') window.showToast('Failed to load stock operations module', 'error');
                return;
            } finally {
                if (typeof window.hideLoader === 'function') window.hideLoader();
            }
        }
        if (typeof window.openDispatchModal === 'function') {
            window.openDispatchModal(centralItemId, item.name, 0, 'return', data.id);
        }
    };

    window.openBranchItemTransferModal = async function(itemId) {
        const data = window._branchDetailsData;
        if (!data || !Array.isArray(data._inventory)) return;
        const item = data._inventory.find(i => i.id === itemId);
        if (!item) return;

        const centralItemId = item.central_item_id || item.id;
        if (typeof window.openDispatchModal !== 'function') {
            try {
                if (typeof window.showLoader === 'function') window.showLoader('Loading stock operations...');
                await import('./owner/central_inventory.js');
            } catch (loadErr) {
                console.error('[openBranchItemTransferModal] Failed to load central_inventory module:', loadErr);
                if (typeof window.showToast === 'function') window.showToast('Failed to load stock operations module', 'error');
                return;
            } finally {
                if (typeof window.hideLoader === 'function') window.hideLoader();
            }
        }
        if (typeof window.openDispatchModal === 'function') {
            window.openDispatchModal(centralItemId, item.name, 0, 'transfer', data.id);
        }
    };
}
