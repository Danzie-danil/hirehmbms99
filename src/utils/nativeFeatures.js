import { platform } from './platform.js';

let _notificationsInitialized = false;

/**
 * Universal Native OS Features Wrapper (Local Notifications, Device Capabilities)
 * Targets Android (Capacitor LocalNotifications) and Desktop (Tauri Notification Plugin)
 */
export const nativeFeatures = {
    /**
     * Initializes OS notification channels and click handlers
     */
    initNotifications: async () => {
        if (_notificationsInitialized) return;
        _notificationsInitialized = true;

        if (platform.isAndroid()) {
            try {
                const { LocalNotifications } = await import('@capacitor/local-notifications');
                
                // Create custom notification channel on Android 8.0+
                await LocalNotifications.createChannel({
                    id: 'bms_alerts',
                    name: 'BMS Alerts & Operational Updates',
                    description: 'Real-time sales, inventory, and system notifications',
                    importance: 5, // High Importance
                    visibility: 1, // Public on lock screen
                    vibration: true,
                    sound: 'default'
                }).catch(() => {});

                // Listen for user taps on the notification
                LocalNotifications.addListener('localNotificationActionPerformed', (notificationAction) => {
                    try {
                        const extra = notificationAction.notification?.extra;
                        if (extra && extra.target_url) {
                            if (window.switchView && extra.target_url.includes('view=')) {
                                const viewMatch = extra.target_url.match(/view=([^&]+)/);
                                if (viewMatch && viewMatch[1]) {
                                    window.switchView(viewMatch[1]);
                                    return;
                                }
                            }
                            if (typeof window.location !== 'undefined') {
                                window.location.href = extra.target_url;
                            }
                        }
                    } catch (navErr) {
                        console.warn('[NativeFeatures] Notification click handling error:', navErr);
                    }
                });

                console.log('[NativeFeatures] Android local notifications channel initialized');
            } catch (err) {
                console.warn('[NativeFeatures] Failed to initialize Android notifications:', err);
            }
        } else if (platform.isDesktop()) {
            try {
                const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification');
                const granted = await isPermissionGranted();
                if (!granted) {
                    await requestPermission();
                }
                console.log('[NativeFeatures] Desktop notification plugin ready');
            } catch (err) {
                console.warn('[NativeFeatures] Failed to initialize Desktop notifications:', err);
            }
        }
    },

    /**
     * Request OS notification permission across Android, Desktop, and Web
     */
    requestNotificationPermission: async () => {
        if (platform.isAndroid()) {
            try {
                const { LocalNotifications } = await import('@capacitor/local-notifications');
                const res = await LocalNotifications.requestPermissions();
                return res.display === 'granted';
            } catch (err) {
                console.warn('[NativeFeatures] Android permission request error:', err);
                return false;
            }
        }

        if (platform.isDesktop()) {
            try {
                const { requestPermission } = await import('@tauri-apps/plugin-notification');
                const permission = await requestPermission();
                return permission === 'granted';
            } catch (err) {
                console.warn('[NativeFeatures] Desktop permission request error:', err);
                return false;
            }
        }

        if (typeof Notification !== 'undefined') {
            try {
                const res = await Notification.requestPermission();
                return res === 'granted';
            } catch (err) {
                return false;
            }
        }

        return false;
    },

    /**
     * Check if notification permission is granted
     */
    isNotificationPermissionGranted: async () => {
        if (platform.isAndroid()) {
            try {
                const { LocalNotifications } = await import('@capacitor/local-notifications');
                const status = await LocalNotifications.checkPermissions();
                return status.display === 'granted';
            } catch (err) {
                return false;
            }
        }

        if (platform.isDesktop()) {
            try {
                const { isPermissionGranted } = await import('@tauri-apps/plugin-notification');
                return await isPermissionGranted();
            } catch (err) {
                return false;
            }
        }

        if (typeof Notification !== 'undefined') {
            return Notification.permission === 'granted';
        }

        return false;
    },

    /**
     * Send a True Native OS Notification
     */
    sendNativeNotification: async (title, options = {}) => {
        const body = options.body || '';
        const targetUrl = options.target_url || options.url || '/app/';

        if (platform.isAndroid()) {
            try {
                const { LocalNotifications } = await import('@capacitor/local-notifications');
                await nativeFeatures.initNotifications();

                const notifId = Math.floor(Math.random() * 900000) + 100000;
                await LocalNotifications.schedule({
                    notifications: [
                        {
                            id: notifId,
                            title: title || 'BMS Alert',
                            body: body,
                            channelId: 'bms_alerts',
                            sound: 'default',
                            smallIcon: 'ic_stat_icon_config_sample',
                            extra: {
                                target_url: targetUrl
                            }
                        }
                    ]
                });
                return { success: true, platform: 'android' };
            } catch (androidErr) {
                console.warn('[NativeFeatures] Android notification error:', androidErr);
                return { success: false, platform: 'android', error: androidErr.message };
            }
        }

        if (platform.isDesktop()) {
            try {
                const { sendNotification, isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification');
                let granted = await isPermissionGranted();
                if (!granted) {
                    const perm = await requestPermission();
                    granted = perm === 'granted';
                }

                if (granted) {
                    sendNotification({
                        title: title || 'BMSTz',
                        body: body,
                        icon: options.icon || 'icons/icon.png'
                    });
                    return { success: true, platform: 'desktop' };
                }
                return { success: false, platform: 'desktop', error: 'permission_denied' };
            } catch (desktopErr) {
                console.warn('[NativeFeatures] Desktop notification error:', desktopErr);
                return { success: false, platform: 'desktop', error: desktopErr.message };
            }
        }

        return { success: false, platform: 'web', fallback: true };
    }
};

if (typeof window !== 'undefined') {
    window.nativeFeatures = nativeFeatures;
}
