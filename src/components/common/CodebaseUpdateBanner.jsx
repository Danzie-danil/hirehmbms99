import React from 'react';
import { Sparkles, RotateCw } from 'lucide-react';
import { useUpdateChecker } from '../../hooks/useUpdateChecker.js';

export function CodebaseUpdateBanner() {
    const { updateAvailable, targetVersion, releaseNotes, applyUpdate } = useUpdateChecker();

    if (!updateAvailable) return null;

    const noteSummary = releaseNotes && releaseNotes.length > 0
        ? `: ${releaseNotes[0]}`
        : ': A new application update is ready with latest fixes and performance improvements.';

    return (
        <div id="bms-codebase-update-banner" className="w-full sticky top-0 bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-600 text-white px-3 sm:px-4 py-2.5 text-xs font-bold shadow-lg select-none overflow-hidden flex items-center justify-between gap-2 sm:gap-3 border-b border-white/20 z-[99999] transition-all duration-300">
            <div className="flex items-center gap-2 min-w-0 flex-1">
                <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/20 flex-shrink-0 animate-pulse">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                </div>
                <div className="truncate">
                    <span className="font-extrabold uppercase tracking-wide text-[11px]">
                        Updates Available (v{targetVersion}){noteSummary}
                    </span>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
                <button
                    onClick={applyUpdate}
                    type="button"
                    className="px-3.5 py-1.5 rounded-lg bg-white text-indigo-700 hover:bg-white/90 text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 shadow-md cursor-pointer"
                >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Update Now</span>
                </button>
            </div>
        </div>
    );
}
