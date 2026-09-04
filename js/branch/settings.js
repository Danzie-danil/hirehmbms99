
export function renderBranchSettings() {
    const main = document.getElementById('mainContent');
    const branch = state.branchProfile || {};

    main.innerHTML = `
    <div class="max-w-4xl mx-auto opacity-0 translate-y-4 animate-fade-in-up">

        <div class="flex flex-nowrap items-center justify-between gap-1.5 sm:gap-3 mb-5 overflow-x-auto scrollbar-hide py-0.5">
            <div class="inline-flex items-center gap-1.5 sm:gap-3 bg-white border border-gray-200 shadow-sm rounded-xl sm:rounded-2xl p-1 sm:p-1.5 pr-2 sm:pr-4 cursor-default hover:shadow-md transition-shadow flex-shrink-0">
                <div class="bg-indigo-50 text-indigo-700 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold uppercase tracking-wider whitespace-nowrap">${window.t('branch_settings', 'Branch Settings')}</div>
                <div class="hidden md:flex items-center gap-1.5 sm:gap-2 text-gray-400">
                    <i data-lucide="settings" class="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0"></i>
                    <span class="text-[10px] sm:text-xs font-medium whitespace-nowrap">Profile & System</span>
                </div>
            </div>

            <div class="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <button type="button" onclick="clearAllCache()" title="Erase Cache" class="flex items-center gap-1 px-2.5 sm:px-4 py-1.5 sm:py-2.5 bg-amber-50 text-amber-600 border border-amber-200 text-[11px] sm:text-sm font-bold rounded-lg sm:rounded-xl hover:bg-amber-600 hover:text-white transition-all active:scale-95 whitespace-nowrap shadow-sm">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> <span>Erase Cache</span>
                </button>
                <button type="button" onclick="confirmUpdateApp()" title="Update" class="flex items-center gap-1 px-2.5 sm:px-4 py-1.5 sm:py-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 text-[11px] sm:text-sm font-bold rounded-lg sm:rounded-xl hover:bg-emerald-600 hover:text-white transition-all active:scale-95 whitespace-nowrap shadow-sm">
                    <i data-lucide="refresh-cw" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> <span>Update</span>
                </button>
            </div>
        </div>

        <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

            <!-- Section: Enterprise & Identity (Read-only) -->
            <div class="p-8 border-b border-gray-50 bg-gray-50/30">
                <div class="flex items-center justify-between mb-6 text-indigo-700">
                    <div class="flex items-center gap-2">
                        <i data-lucide="building" class="w-5 h-5"></i>
                        <h3 class="text-lg font-bold">Identity & Affiliation</h3>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div class="col-span-1 md:col-span-2">
                        <label for="parentEnterprise" class="block text-sm font-medium text-gray-700 mb-1">Parent Enterprise Name</label>
                        <input type="text" id="parentEnterprise" value="${state.enterpriseName || 'BMS Enterprise'}" class="form-input w-full bg-gray-100 text-gray-500 cursor-not-allowed font-medium" disabled>
                        <p class="text-xs text-gray-400 mt-1">This is managed by the main account administrator.</p>
                    </div>

                    <div class="col-span-1">
                        <label for="branchNameDisplay" class="block text-sm font-medium text-gray-700 mb-1">Branch Name</label>
                        <input type="text" id="branchNameDisplay" value="${branch.name || ''}" class="form-input w-full bg-gray-50 text-gray-600 cursor-not-allowed" disabled>
                    </div>

                    <div class="col-span-1">
                        <label for="branchCodeDisplay" class="block text-sm font-medium text-gray-700 mb-1">Branch Code (ID)</label>
                        <input type="text" id="branchCodeDisplay" value="${branch.branch_code || ''}" class="form-input w-full bg-gray-50 font-mono text-gray-600 cursor-not-allowed" disabled>
                    </div>
                </div>
            </div>

            <!-- Section: Avatar & Identity -->
            <div class="p-8 border-b border-gray-50 group transition-colors hover:bg-gray-50/30">
                <div class="flex items-center justify-between mb-6 text-indigo-700">
                    <div class="flex items-center gap-2">
                        <i data-lucide="image" class="w-5 h-5"></i>
                        <h3 class="text-lg font-bold">Branch Avatar</h3>
                    </div>
                </div>

                <div class="flex items-center gap-6">
                    <div class="relative group">
                        <div id="branch_avatar_preview" class="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 text-xl font-bold overflow-hidden border-2 border-white shadow-md ring-2 ring-indigo-50">
                            ${branch.avatar_url ? `<img src="${branch.avatar_url}" class="w-full h-full object-cover">` : (branch.name ? branch.name.charAt(0).toUpperCase() : 'B')}
                        </div>
                        <!-- We only allow uploading if they click a button or the image -->
                        <label for="set_branch_avatar_file" class="absolute bottom-0 right-0 p-1.5 bg-indigo-600 text-white rounded-full shadow-lg cursor-pointer hover:bg-indigo-700 transition-all border-2 border-white scale-90 group-hover:scale-100">
                            <i data-lucide="camera" class="w-3.5 h-3.5"></i>
                            <input type="file" id="set_branch_avatar_file" accept="image/*" class="hidden" onchange="handleBranchAvatarUpload(this)">
                        </label>
                    </div>
                    <div class="flex-1" id="branch_avatar_controls">
                        <h4 class="text-sm font-bold text-gray-900 mb-1">Upload Branch Image</h4>
                        <p class="text-xs text-gray-500 mb-3">Square images work best. Max size 2MB.</p>
                        <input type="hidden" id="branch_set_avatar_url" value="${branch.avatar_url || ''}" onchange="autoSaveBranchSettings()">
                        <div class="flex items-center gap-2">
                            ${branch.avatar_url ? `
                                <button type="button" onclick="document.getElementById('set_branch_avatar_file').click()" class="text-xs font-bold text-indigo-600 hover:text-indigo-700 px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100 transition-colors">
                                    Replace
                                </button>
                                <button type="button" onclick="removeBranchAvatar()" class="text-xs font-bold text-red-600 hover:text-red-700 px-3 py-1.5 bg-red-50 rounded-lg border border-red-100 transition-colors">
                                    Remove
                                </button>
                            ` : `
                                <button type="button" onclick="document.getElementById('set_branch_avatar_file').click()" class="text-xs font-bold text-indigo-600 hover:text-indigo-700 px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100 transition-colors">
                                    Choose Image from Files
                                </button>
                            `}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Section: Contact Details -->
            <div class="p-8 border-b border-gray-50 group transition-colors hover:bg-gray-50/30">
                <div class="flex items-center justify-between mb-6 text-indigo-700">
                    <div class="flex items-center gap-2">
                        <i data-lucide="phone" class="w-5 h-5"></i>
                        <h3 class="text-lg font-bold">Contact Details</h3>
                    </div>
                </div>

                <div id="contactDetailsSection" class="grid grid-cols-1 md:grid-cols-2 gap-6 transition-all">
                    <div class="col-span-1">
                        <label for="branch_set_phone" class="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                        <input type="tel" id="branch_set_phone" value="${branch.phone || ''}" class="form-input w-full" placeholder="+1 (555) 123-4567" onchange="autoSaveBranchSettings()">
                    </div>

                    <div class="col-span-1">
                        <label for="branch_set_email" class="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input type="email" id="branch_set_email" value="${branch.email || ''}" class="form-input w-full" placeholder="branch@example.com" onchange="autoSaveBranchSettings()">
                    </div>

                    <div class="col-span-1 md:col-span-2 mt-4">
                        <label for="branch_set_address" class="block text-sm font-medium text-gray-700 mb-1">Physical Address</label>
                        <textarea id="branch_set_address" class="form-input w-full" rows="2" placeholder="123 Main St, City, Country" onchange="autoSaveBranchSettings()">${branch.address || ''}</textarea>
                    </div>
                </div>
            </div>

            <!-- Section: Legal / Tax Info -->
            <div class="p-8 border-b border-gray-50 group transition-colors hover:bg-gray-50/30">
                <div class="flex items-center justify-between mb-6 text-indigo-700">
                    <div class="flex items-center gap-2">
                        <i data-lucide="briefcase" class="w-5 h-5"></i>
                        <h3 class="text-lg font-bold">Legal & Tax Identification</h3>
                    </div>
                </div>

                <div id="legalInfoSection" class="grid grid-cols-1 md:grid-cols-2 gap-6 transition-all">
                    <div class="col-span-1">
                        <label for="branch_set_reg_no" class="block text-sm font-medium text-gray-700 mb-1">Business Registration No.</label>
                        <input type="text" id="branch_set_reg_no" value="${branch.branch_reg_no || ''}" class="form-input w-full" placeholder="e.g. REG-55214" onchange="autoSaveBranchSettings()">
                    </div>

                    <div class="col-span-1">
                        <label for="branch_set_tin" class="block text-sm font-medium text-gray-700 mb-1">Tax Identification Number (TIN)</label>
                        <input type="text" id="branch_set_tin" value="${branch.branch_tin || ''}" class="form-input w-full" placeholder="e.g. TIN-998877" onchange="autoSaveBranchSettings()">
                    </div>
                </div>
            </div>

            <!-- Section: Operational Settings -->
            <div class="p-8 group transition-colors hover:bg-gray-50/30">
                <div class="flex items-center justify-between mb-6 text-indigo-700">
                    <div class="flex items-center gap-2">
                        <i data-lucide="clock" class="w-5 h-5"></i>
                        <h3 class="text-lg font-bold">Operational Settings</h3>
                    </div>
                </div>

                <div id="opsSettingsSection" class="grid grid-cols-1 md:grid-cols-3 gap-6 transition-all">
                    <div class="col-span-1">
                        <label for="branch_set_tax" class="block text-sm font-medium text-gray-700 mb-1">Default Tax Rate (%)</label>
                        <input type="number" id="branch_set_tax" value="${branch.tax_rate || 0}" step="0.01" class="form-input w-full" placeholder="0.00" onchange="autoSaveBranchSettings()">
                    </div>
                    <div class="col-span-1">
                        <label for="branch_set_open" class="block text-sm font-medium text-gray-700 mb-1">Opening Time</label>
                        ${window.renderPremiumTimeSelect({ id: 'branch_set_open', selectedValue: branch.opening_time || '08:00', classes: 'w-full text-sm', startHour: 4, endHour: 23 })}
                    </div>
                    <div class="col-span-1">
                        <label for="branch_set_close" class="block text-sm font-medium text-gray-700 mb-1">Closing Time</label>
                        ${window.renderPremiumTimeSelect({ id: 'branch_set_close', selectedValue: branch.closing_time || '18:00', classes: 'w-full text-sm', startHour: 4, endHour: 23 })}
                    </div>
                    <div class="col-span-1 md:col-span-3 flex items-center gap-3 mt-2">
                        <label class="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="branch_set_notifs" ${branch.low_stock_notifications ? 'checked' : ''} class="sr-only peer" onchange="autoSaveBranchSettings()">
                            <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                        </label>
                        <span class="text-sm font-medium text-gray-700">Receive Low Stock Email Notifications</span>
                    </div>
                </div>
            </div>

            <!-- Section: Appearance & Language Preferences -->
            <div class="p-8 border-t border-gray-100">
                ${window.renderAppearanceLanguageSettings ? window.renderAppearanceLanguageSettings() : ''}
            </div>

            <!-- Section: Device Permissions & Push Notifications -->
            <div class="p-8 border-t border-gray-100">
                ${window.renderPushNotificationSettingsCard ? window.renderPushNotificationSettingsCard() : ''}
            </div>

        </div>
    </div>`;

    setTimeout(() => {
        const wrap = main.querySelector('.opacity-0');
        if (wrap) {
            wrap.classList.remove('opacity-0', 'translate-y-4');
        }
    }, 10);

    lucide.createIcons();

    ['branch_set_open', 'branch_set_close'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', () => window.autoSaveBranchSettings());
    });

    const content = document.getElementById('mainContent');
    if (content) {
        content.addEventListener('input', (e) => {
            if (e.target.matches('input, textarea, select')) {
                window.activeBranchInput = e.target;
                if (e.target.onchange) { e.target.onchange(); }
            }
        });
        content.addEventListener('change', (e) => {
            if (e.target.matches('input, textarea, select')) {
                window.activeBranchInput = e.target;

                if (!e.target.onchange) window.autoSaveBranchSettings();
            }
        });

        if (typeof window.attachClickToEditIndicators === 'function') {
            window.attachClickToEditIndicators(content);
        }
    }
};

let autoSaveTimeout = null;
let activeIndicatorTimeout = null;
window.activeBranchInput = null;

export function autoSaveBranchSettings() {
    let inputIndicator = window.activeBranchInput;

    if (inputIndicator && typeof showInlineSaveIndicator === 'function') {
        showInlineSaveIndicator(inputIndicator, 'saving');
    }

    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(async () => {
        const payload = {
            phone: document.getElementById('branch_set_phone').value.trim(),
            email: document.getElementById('branch_set_email').value.trim(),
            address: document.getElementById('branch_set_address').value.trim(),
            branch_reg_no: document.getElementById('branch_set_reg_no').value.trim(),
            branch_tin: document.getElementById('branch_set_tin').value.trim(),
            tax_rate: parseFloat(document.getElementById('branch_set_tax').value) || 0,
            opening_time: document.getElementById('branch_set_open').value,
            closing_time: document.getElementById('branch_set_close').value,
            low_stock_notifications: document.getElementById('branch_set_notifs').checked,
            avatar_url: document.getElementById('branch_set_avatar_url')?.value || null
        };

        try {
            const updatedBranch = await dbBranches.updateProfile(state.branchId, payload);

            state.branchProfile = {
                ...state.branchProfile,
                ...updatedBranch
            };

            document.getElementById('currentUser').textContent = state.currentUser;
            if (updatedBranch.branch_code) {
                document.getElementById('currentBranch').textContent = `Branch ID: ${updatedBranch.branch_code}`;
            }

            window.updateSidebarAvatar?.();

            if (inputIndicator && typeof showInlineSaveIndicator === 'function') {
                showInlineSaveIndicator(inputIndicator, 'saved');
            } else if (!inputIndicator && document.getElementById('branch_set_avatar_url')?.value !== state.branchProfile?.avatar_url) {

                showToast('Branch avatar updated', 'success');
            }

        } catch (error) {
            console.error('Auto-save Branch Settings Error:', error);
            if (inputIndicator && typeof showInlineSaveIndicator === 'function') {
                showInlineSaveIndicator(inputIndicator, 'error');
            }
            showToast('Failed to auto-save settings: ' + error.message, 'error');
        }
    }, 1000);
};

export function handleBranchAvatarUpload(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];

        if (file.size > 20 * 1024 * 1024) {
            showToast('Image is too large (max 20MB)', 'error');
            input.value = '';
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            showToast('Compressing large image...', 'info');
        }

        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                const size = 200;
                canvas.width = size;
                canvas.height = size;

                let sourceX, sourceY, sourceWidth, sourceHeight;
                if (img.width > img.height) {
                    sourceHeight = img.height;
                    sourceWidth = img.height;
                    sourceX = (img.width - img.height) / 2;
                    sourceY = 0;
                } else {
                    sourceWidth = img.width;
                    sourceHeight = img.width;
                    sourceX = 0;
                    sourceY = (img.height - img.width) / 2;
                }

                ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, size, size);

                const finalBase64 = canvas.toDataURL('image/jpeg', 0.85);

                const preview = document.getElementById('branch_avatar_preview');
                if (preview) {
                    preview.innerHTML = `<img src="${finalBase64}" class="w-full h-full object-cover">`;
                }

                const hiddenInput = document.getElementById('branch_set_avatar_url');
                if (hiddenInput) {
                    hiddenInput.value = finalBase64;

                    window.autoSaveBranchSettings();
                }

                updateBranchAvatarControls(true);
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
};

export function removeBranchAvatar() {
    const hiddenInput = document.getElementById('branch_set_avatar_url');
    if (hiddenInput) {
        hiddenInput.value = '';
    }

    const preview = document.getElementById('branch_avatar_preview');
    if (preview) {
        const branch = state.branchProfile || {};
        preview.innerHTML = branch.name ? branch.name.charAt(0).toUpperCase() : 'B';
    }

    updateBranchAvatarControls(false);
    window.autoSaveBranchSettings();
};

export function updateBranchAvatarControls(hasImage) {
    const container = document.getElementById('branch_avatar_controls');
    if (!container) return;

    const buttonGroup = container.querySelector('.flex.items-center.gap-2');
    if (!buttonGroup) return;

    if (hasImage) {
        buttonGroup.innerHTML = `
            <button type="button" onclick="document.getElementById('set_branch_avatar_file').click()" class="text-xs font-bold text-indigo-600 hover:text-indigo-700 px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100 transition-colors">
                Replace
            </button>
            <button type="button" onclick="removeBranchAvatar()" class="text-xs font-bold text-red-600 hover:text-red-700 px-3 py-1.5 bg-red-50 rounded-lg border border-red-100 transition-colors">
                Remove
            </button>
        `;
    } else {
        buttonGroup.innerHTML = `
            <button type="button" onclick="document.getElementById('set_branch_avatar_file').click()" class="text-xs font-bold text-indigo-600 hover:text-indigo-700 px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100 transition-colors">
                Choose Image from Files
            </button>
        `;
    }
};
