import React from 'react';
import {
    LayoutDashboard,
    Sliders,
    Users,
    LifeBuoy,
    Radio,
    MessageSquareQuote,
    ShieldAlert,
    TrendingUp,
    Activity,
    Flag,
    Database,
    CreditCard,
    ScrollText,
    Boxes,
    Send,
    FileSpreadsheet,
    ShoppingCart,
    Store,
    Layers,
    Receipt,
    Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useApp } from '../../context/AppContext.jsx';

export function Sidebar() {
    const { role } = useAuth();
    const { activeView, switchView, sidebarOpen, setSidebarOpen } = useApp();

    const getNavItems = () => {
        if (role === 'sysadmin') {
            return [
                { id: 'sysadmin-dashboard', label: 'Dashboard', icon: LayoutDashboard },
                { id: 'sysadmin-controls', label: 'Site Controls', icon: Sliders },
                { id: 'sysadmin-users', label: 'User Maintenance', icon: Users },
                { id: 'sysadmin-tickets', label: 'Support Tickets', icon: LifeBuoy },
                { id: 'sysadmin-communications', label: 'Communications Hub', icon: Radio },
                { id: 'sysadmin-surveys', label: 'Feedback and Survey', icon: MessageSquareQuote },
                { id: 'sysadmin-security', label: 'Security & Lockout', icon: ShieldAlert },
                { id: 'sysadmin-revenue', label: 'Revenue Analytics', icon: TrendingUp },
                { id: 'sysadmin-health', label: 'Tenant Health', icon: Activity },
                { id: 'sysadmin-flags', label: 'Feature Flags', icon: Flag },
                { id: 'sysadmin-vault', label: 'Compliance Vault', icon: Database },
                { id: 'sysadmin-pricing', label: 'Pricing & Plans', icon: CreditCard },
                { id: 'sysadmin-audit', label: 'Audit Logs', icon: ScrollText }
            ];
        }

        if (role === 'branch') {
            return [
                { id: 'pos', label: 'Point of Sale (POS)', icon: ShoppingCart },
                { id: 'inventory', label: 'Branch Inventory', icon: Boxes },
                { id: 'stock_requests', label: 'Stock Requests', icon: Send },
                { id: 'invoices', label: 'Invoices & Receipts', icon: Receipt },
                { id: 'daily_sales', label: 'Daily Sales Report', icon: TrendingUp }
            ];
        }

        // Business Owner
        return [
            { id: 'overview', label: 'Overview', icon: LayoutDashboard },
            { id: 'branches', label: 'Branch Directory', icon: Store },
            { id: 'central_inventory', label: 'Inventory & Services', icon: Boxes },
            { id: 'stock_movements', label: 'Stock Movements', icon: Layers },
            { id: 'central_dispatch', label: 'Central Dispatch Hub', icon: Send },
            { id: 'financial_reports', label: 'Financial Reports', icon: FileSpreadsheet },
            { id: 'settings', label: 'Business Settings', icon: Settings }
        ];
    };

    const navItems = getNavItems();

    return (
        <>
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    onClick={() => setSidebarOpen(false)}
                    className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 md:hidden"
                />
            )}

            <aside
                className={`fixed md:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex flex-col transition-transform duration-300 ease-in-out ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                }`}
            >
                {/* Logo & Brand Header */}
                <div className="h-16 px-5 border-b border-gray-100 dark:border-gray-800 flex items-center gap-3">
                    <img src="/bmtzofficiallogo.png" alt="BMSTZ Logo" className="w-8 h-8 rounded-xl object-contain shadow-xs" />
                    <div>
                        <h2 className="text-sm font-black text-gray-900 dark:text-white tracking-tight">BMSTZ Official</h2>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Enterprise SaaS</p>
                    </div>
                </div>

                {/* Navigation Links */}
                <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = activeView === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => switchView(item.id)}
                                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left cursor-pointer ${
                                    isActive
                                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/60 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`} />
                                <span className="truncate">{item.label}</span>
                            </button>
                        );
                    })}
                </nav>

                {/* Footer User Card */}
                <div className="p-3 border-t border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-3 p-2 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                            {role === 'sysadmin' ? 'A' : (role === 'branch' ? 'B' : 'O')}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                {role === 'sysadmin' ? 'SysAdmin' : (role === 'branch' ? 'Manager' : 'Owner')}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">Manage Account</p>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
}
