
const listeners = new Set();

export const subscribe = (callback) => {
    listeners.add(callback);
    return () => listeners.delete(callback);
};

const notifySubscribers = (property, value, previousValue) => {
    listeners.forEach(callback => {
        try {
            callback(property, value, previousValue);
        } catch (err) {
            console.error('[State Observer Error]', err);
        }
    });
};

const _internalState = {
    currentUser: null,
    currentUserUuid: null,
    role: null,
    branchId: null,
    ownerId: null,
    profile: null,
    branches: [],
    activities: [],
    enterpriseName: 'BMS Enterprise',
    branchProfile: null,
    entitlements: null,
    disabledModules: new Set(),
    _modalHistory: [],
    lang: localStorage.getItem('app_lang') || 'en'
};

export const state = new Proxy(_internalState, {
    set(target, property, value) {
        if (target[property] !== value) {
            const previousValue = target[property];
            target[property] = value;
            notifySubscribers(property, value, previousValue);
        }
        return true;
    }
});
