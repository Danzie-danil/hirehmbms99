import React from 'react';
import { Menu, Sun, Moon, Bell, LogOut, Globe } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApp } from '../../context/AppContext.jsx';

export function Header() {
    const { profile, role, logout } = useAuth();
    const { toggleSidebar, theme, toggleTheme, toggleNotifications } = useApp();

    const roleBadge = role === 'sysadmin' ? 'SYSTEM ADMIN' : (role === 'branch' ? 'BRANCH MANAGER' : 'BUSINESS OWNER');

    return (
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-4 sm:px-6 relative z-30">
            <div className="flex items-center gap-3">
                <button
                    onClick={toggleSidebar}
                    className="md:hidden p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider uppercase bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/40">
                    {roleBadge}
                </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
                {/* Theme Toggle */}
                <button
                    onClick={toggleTheme}
                    className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                >
                    {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
                </button>

                {/* Notifications Bell */}
                <button
                    onClick={toggleNotifications}
                    className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
                    title="Notifications"
                >
                    <Bell className="w-4 h-4" />
                </button>

                {/* User Pill & Sign Out */}
                <button
                    onClick={logout}
                    className="p-2 rounded-xl text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Sign Out"
                >
                    <LogOut className="w-4 h-4" />
                </button>
            </div>
        </header>
    );
}
