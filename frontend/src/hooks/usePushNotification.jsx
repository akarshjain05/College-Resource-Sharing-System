import { useEffect, useState } from "react";
import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import api from "../api/client";

const firebaseConfig = {
    apiKey: "AIzaSyCXKGuwKX3zHQ9VslvrTNESCPAFON12lYA",
    authDomain: "notification-service-ed93d.firebaseapp.com",
    projectId: "notification-service-ed93d",
    storageBucket: "notification-service-ed93d.firebasestorage.app",
    messagingSenderId: "351765879932",
    appId: "1:351765879932:web:d474b0c86e13f855ccfdf9",
    measurementId: "G-2MPEQH3TTK"
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
        console.error("Failed to initialize Firebase Messaging:", error);
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
            const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
            console.log("Service Worker registered successfully:", registration);

            // 2. Fetch the FCM token
            const token = await getToken(messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: registration,
            });

            if (token) {
                console.log("FCM Token retrieved successfully:", token);

                // 3. Save the token via our own backend (no external microservice needed)
                try {
                    await api.post("/users/me/fcm-token", { fcm_token: token });
                    console.log("FCM Token saved to backend successfully.");
                } catch (netErr) {
                    console.warn("Could not save FCM token to backend:", netErr?.message);
                }
            } else {
                console.warn("No FCM registration token received.");
            }
        } catch (error) {
            console.warn("Error setting up Web Push Notifications:", error?.message || error);
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
            console.error("Failed to request permission:", err);
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
                        console.log("Foreground push notification received:", payload);
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

