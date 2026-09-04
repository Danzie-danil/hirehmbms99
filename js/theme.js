
import { state } from './state.js';
import { dbProfile, dbBranches } from './db.js';

export function initTheme(theme) {
    const savedTheme = theme || localStorage.getItem('bms-theme') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    if (theme) localStorage.setItem('bms-theme', theme);
};

export async function setTheme(theme) {
    const isDark = theme === 'dark';
    if (isDark) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('bms-theme', isDark ? 'dark' : 'light');

    if (window.lucide) {
        window.lucide.createIcons();
    }

    if (typeof showToast === 'function') {
        showToast(`${isDark ? 'Dark' : 'Light'} theme enabled`, 'info');
    }

    await apiSaveTheme(isDark ? 'dark' : 'light');
    if (typeof window.refreshActiveSettingsView === 'function') {
        window.refreshActiveSettingsView();
    }
}

export async function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    const theme = isDark ? 'dark' : 'light';
    localStorage.setItem('bms-theme', theme);

    if (window.lucide) {
        window.lucide.createIcons();
    }

    showToast(`${isDark ? 'Dark' : 'Light'} theme enabled`, 'info');

    await apiSaveTheme(theme);
    if (typeof window.refreshActiveSettingsView === 'function') {
        window.refreshActiveSettingsView();
    }
};

export async function apiSaveTheme(theme) {
    if (!state) return;

    try {
        if (state.role === 'owner' && state.ownerId) {
            await dbProfile.updateTheme(state.ownerId, theme);
        } else if (state.role === 'branch' && state.branchId) {
            await dbBranches.updateTheme(state.branchId, theme);
        }
    } catch (err) {

    }
};

initTheme();
