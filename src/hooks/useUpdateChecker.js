import { useEffect, useState } from 'react';
import currentRelease from '../../release_notes.json';
import { checkCodebaseUpdate, executeAppUpdate, isNewerVersion } from '../../js/updateChecker.js';

export function useUpdateChecker() {
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [targetVersion, setTargetVersion] = useState(currentRelease.version);
    const [releaseNotes, setReleaseNotes] = useState(currentRelease.notes || []);

    useEffect(() => {
        const check = async () => {
            try {
                const res = await fetch(`/release_notes.json?_t=${Date.now()}`, { cache: 'no-store' });
                if (!res.ok) return;
                const remote = await res.json();
                const installed = localStorage.getItem('bms_installed_version') || currentRelease.version;
                if (remote?.version && isNewerVersion(remote.version, installed)) {
                    setUpdateAvailable(true);
                    setTargetVersion(remote.version);
                    setReleaseNotes(remote.notes || []);
                }
            } catch {}
        };

        check();
        const interval = setInterval(check, 45000);
        return () => clearInterval(interval);
    }, []);

    const applyUpdate = () => {
        executeAppUpdate(targetVersion);
    };

    return {
        updateAvailable,
        targetVersion,
        releaseNotes,
        applyUpdate
    };
}
