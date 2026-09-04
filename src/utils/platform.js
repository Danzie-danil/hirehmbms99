export const platform = {
    isWeb: () => {
        return !platform.isAndroid() && !platform.isDesktop();
    },
    isAndroid: () => {
        if (typeof window === 'undefined') return false;
        return !!window.Capacitor && (
            typeof window.Capacitor.getPlatform === 'function' 
                ? window.Capacitor.getPlatform() === 'android' 
                : !!window.Capacitor.isNativePlatform?.()
        );
    },
    isDesktop: () => {
        if (typeof window === 'undefined') return false;
        return !!(window.__TAURI_INTERNALS__ || window.__TAURI__);
    },
    isNative: () => {
        return platform.isAndroid() || platform.isDesktop();
    },
    getPlatformName: () => {
        if (platform.isDesktop()) return 'desktop';
        if (platform.isAndroid()) return 'android';
        return 'web';
    }
};

if (typeof window !== 'undefined') {
    window.platform = platform;
}

