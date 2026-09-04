import { useEffect } from 'react';
import { initPushNotifications, isPushSupported, requestPushPermissionAndSubscribe } from '../../js/pushNotifications.js';

export function usePushNotifications() {
    useEffect(() => {
        initPushNotifications();
    }, []);

    return {
        isSupported: isPushSupported(),
        enablePush: requestPushPermissionAndSubscribe
    };
}
