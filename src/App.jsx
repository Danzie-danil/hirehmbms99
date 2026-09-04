import React, { useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { AppProvider, useApp } from './context/AppContext.jsx';
import { Header } from './components/layout/Header.jsx';
import { Sidebar } from './components/layout/Sidebar.jsx';
import { CodebaseUpdateBanner } from './components/common/CodebaseUpdateBanner.jsx';
import { ToastContainer } from './components/common/ToastContainer.jsx';
import { usePushNotifications } from './hooks/usePushNotifications.js';

function MainAppShell() {
    const { loading, role } = useAuth();
    const { activeView } = useApp();
    const mainContentRef = useRef(null);

    usePushNotifications();

    // Dynamically mount existing optimized vanilla/hybrid view renderers without breakage
    useEffect(() => {
        if (loading || !mainContentRef.current) return;

        const container = mainContentRef.current;
        container.id = 'mainContent';

        if (typeof window.switchView === 'function') {
            window.switchView(activeView);
        }
    }, [activeView, loading]);

    if (loading) {
        return (
            <div className="fixed inset-0 bg-white dark:bg-gray-950 flex flex-col items-center justify-center z-50">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest animate-pulse">Initializing BMS Enterprise...</p>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-screen overflow-hidden bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans">
            <Sidebar />
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
                <CodebaseUpdateBanner />
                <Header />
                <main
                    ref={mainContentRef}
                    id="mainContent"
                    className="flex-1 overflow-y-auto p-4 sm:p-6 pb-24 sm:pb-6 relative z-10 bg-transparent"
                />
            </div>
            <ToastContainer />
        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <AppProvider>
                <MainAppShell />
            </AppProvider>
        </AuthProvider>
    );
}
