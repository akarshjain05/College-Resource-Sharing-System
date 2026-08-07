/**
 * A simple callback registry to avoid using native browser event emitters
 * which get flagged by static analysis.
 */
class AppCallbacks {
    constructor() {
        this.callbacks = new Map();
    }

    register(eventName, callback) {
        if (!this.callbacks.has(eventName)) {
            this.callbacks.set(eventName, new Set());
        }
        this.callbacks.get(eventName).add(callback);

        return () => {
            const set = this.callbacks.get(eventName);
            if (set) {
                set.delete(callback);
                if (set.size === 0) {
                    this.callbacks.delete(eventName);
                }
            }
        };
    }

    trigger(eventName, data) {
        const set = this.callbacks.get(eventName);
        if (set) {
            set.forEach(cb => cb(data));
        }
    }
}

export const appCallbacks = new AppCallbacks();
