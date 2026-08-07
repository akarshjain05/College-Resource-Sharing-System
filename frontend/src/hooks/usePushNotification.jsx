import { useEffect, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import api from "../api/client";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const VAPID_KEY = "BA6CZ5D9U-OB9PAlrc7RjIkdDQHjWrype-_sAZUhBZK32lau5GA8LW_uKsKew3YMFLZlFCb5wBxqtzGcwaIzymY";

function getFirebaseMessaging() {
    try {
        if (
            typeof window !== "undefined" &&
            "serviceWorker" in navigator &&
            "PushManager" in window &&
            "Notification" in window
        ) {
            const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
            return getMessaging(app);
        }
    } catch (error) {
        // Silently fail on Firebase init issues
    }
    return null;
}

export function usePushNotification(user) {
    const [permission, setPermission] = useState(
        typeof window !== "undefined" && "Notification" in window ? Notification.permission : "default"
    );

    const registerPush = async () => {
        if (!user?.id) return;
        const messaging = getFirebaseMessaging();
        if (!messaging) return;

        try {
            // 1. Register the service worker
            const swUrl = `/firebase-messaging-sw.js?apiKey=${import.meta.env.VITE_FIREBASE_API_KEY}&authDomain=${import.meta.env.VITE_FIREBASE_AUTH_DOMAIN}&projectId=${import.meta.env.VITE_FIREBASE_PROJECT_ID}&storageBucket=${import.meta.env.VITE_FIREBASE_STORAGE_BUCKET}&messagingSenderId=${import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID}&appId=${import.meta.env.VITE_FIREBASE_APP_ID}&measurementId=${import.meta.env.VITE_FIREBASE_MEASUREMENT_ID}`;
            const registration = await navigator.serviceWorker.register(swUrl);

            // 2. Fetch the FCM token
            const token = await getToken(messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: registration,
            });

            if (token) {
                // 3. Save the token via our own backend (no external microservice needed)
                try {
                    await api.post("/users/me/fcm-token", { fcm_token: token });
                } catch (netErr) {
                    // Silently fail if token save fails
                }
            } else {
                // No token received
            }
        } catch (error) {
            // Silently fail push notification setup
        }
    };

    const requestAndRegister = async () => {
        if (typeof window === "undefined" || !("Notification" in window)) return "default";

        try {
            const result = await Notification.requestPermission();
            setPermission(result);
            if (result === "granted") {
                await registerPush();
            }
            return result;
        } catch (err) {
            return Notification.permission;
        }
    };

    useEffect(() => {
        if (!user?.id) return;
        if (typeof window === "undefined" || !("Notification" in window)) return;

        let unsubscribeOnMessage = null;

        const init = async () => {
            const hasPermission = Notification.permission === "granted";
            setPermission(Notification.permission);

            if (hasPermission) {
                await registerPush();

                const messaging = getFirebaseMessaging();
                if (messaging) {
                    unsubscribeOnMessage = onMessage(messaging, (payload) => {
                        const title = payload.notification?.title || payload.data?.title || "New Notification";
                        const body = payload.notification?.body || payload.data?.body || "";

                        new Notification(title, {
                            body,
                            icon: "/icons.svg",
                            data: payload.data,
                        });
                    });
                }
            }
        };

        init();

        return () => {
            if (unsubscribeOnMessage) unsubscribeOnMessage();
        };
    }, [user, permission]);

    return {
        permission,
        requestAndRegister
    };
}

