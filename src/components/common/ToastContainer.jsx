import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';

export function ToastContainer() {
    const { toasts } = useApp();

    if (!toasts || toasts.length === 0) return null;

    return (
        <div className="fixed bottom-5 right-5 z-[999999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
            {toasts.map((toast) => {
                const isSuccess = toast.type === 'success';
                const isError = toast.type === 'error';
                const isWarning = toast.type === 'warning';

                return (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto p-3.5 rounded-2xl shadow-xl border flex items-start gap-3 transform transition-all duration-300 animate-slide-in ${
                            isSuccess
                                ? 'bg-emerald-950/90 text-emerald-100 border-emerald-800'
                                : isError
                                ? 'bg-rose-950/90 text-rose-100 border-rose-800'
                                : isWarning
                                ? 'bg-amber-950/90 text-amber-100 border-amber-800'
                                : 'bg-slate-900/90 text-slate-100 border-slate-700'
                        }`}
                    >
                        {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
                        {isError && <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
                        {isWarning && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
                        {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />}
                        <p className="text-xs font-medium leading-relaxed flex-1">{toast.message}</p>
                    </div>
                );
            })}
        </div>
    );
}
