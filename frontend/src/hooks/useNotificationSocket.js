import { useEffect, useRef } from "react";
import toast from "react-hot-toast";

const WS_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1")
  .replace(/^http/, "ws")
  .replace(/\/api\/v1$/, "");

/**
 * Opens a WebSocket to receive real-time notifications and shows a toast
 * for each one as it arrives. Reconnects automatically if the connection drops.
 */
export function useNotificationSocket(onNotification) {
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    const token = sessionStorage.getItem("crss_access_token");
    if (!token) return undefined;

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      const socket = new WebSocket(`${WS_BASE_URL}/ws/notifications?token=${token}`);
      socketRef.current = socket;

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          toast(payload.title, { icon: "🔔" });
          onNotification?.(payload);
        } catch (err) {
          // ignore malformed payloads
        }
      };

      socket.onclose = () => {
        if (!cancelled) {
          reconnectTimeoutRef.current = setTimeout(connect, 3000);
        }
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connect();

    return () => {
      cancelled = true;
      clearTimeout(reconnectTimeoutRef.current);
      socketRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
