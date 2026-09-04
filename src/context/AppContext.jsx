import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext.jsx';

const AppContext = createContext(null);

export function AppProvider({ children }) {
    const { role } = useAuth();
    const [activeView, setActiveView] = useState(() => {
        const key = role === 'sysadmin' ? 'lastSysadminView' : (role === 'branch' ? 'lastBranchView' : 'lastOwnerView');
        return localStorage.getItem(key) || (role === 'sysadmin' ? 'sysadmin-communications' : 'overview');
    });
    const [viewHistory, setViewHistory] = useState([activeView]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem('bms_theme') || 'light');
    const [toasts, setToasts] = useState([]);

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        localStorage.setItem('bms_theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
    };

    const switchView = (viewId) => {
        setActiveView(viewId);
        setViewHistory(prev => [...prev, viewId]);
        const storageKey = role === 'sysadmin' ? 'lastSysadminView' : (role === 'branch' ? 'lastBranchView' : 'lastOwnerView');
        localStorage.setItem(storageKey, viewId);
        setSidebarOpen(false);
    };

    const showToast = (message, type = 'info', duration = 4000) => {
        const id = 'toast_' + Date.now() + Math.random().toString(36).substring(2, 6);
        const newToast = { id, message, type };
        setToasts(prev => [...prev, newToast]);

        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, duration);
    };

    return (
        <AppContext.Provider value={{
            activeView,
            switchView,
            viewHistory,
            sidebarOpen,
            setSidebarOpen,
            toggleSidebar: () => setSidebarOpen(prev => !prev),
            notificationsOpen,
            setNotificationsOpen,
            toggleNotifications: () => setNotificationsOpen(prev => !prev),
            theme,
            toggleTheme,
            toasts,
            showToast
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    return useContext(AppContext);
}
