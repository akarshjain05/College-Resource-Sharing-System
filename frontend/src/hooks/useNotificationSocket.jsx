import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { chatEventBus } from "../utils/chatEventBus";

const NOTIFICATION_WS_URL = (import.meta.env.VITE_NOTIFICATION_API_URL || "http://localhost:10000")
  .replace(/^http/, "ws");

/**
 * Opens a WebSocket to receive real-time notifications from the microservice
 * and shows a toast for each one as it arrives. Reconnects automatically if connection drops.
 */
export function useNotificationSocket(onNotification, user) {
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id) return undefined;

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      const socket = new WebSocket(`${NOTIFICATION_WS_URL}/ws/${user.id}`);
      socketRef.current = socket;

      socket.onmessage = (event) => {
        try {
          const rawPayload = JSON.parse(event.data);
          const payload = rawPayload.payload || rawPayload;
          
          // Route chat messages directly to open threads
          if (payload.type === "chat_message") {
            const isHandled = chatEventBus.emit(payload.borrow_request_id, payload.message);
            // If the thread is open (handled), we might not want to show a toast,
            // or we could show a quieter one. Let's just return if handled so it doesn't toast
            if (isHandled) return;
          }
          
          toast((t) => (
            <div 
              onClick={() => {
                if (payload.link) navigate(payload.link);
                else if (payload.type === "chat_message") navigate(`/borrow-requests`);
                toast.dismiss(t.id);
              }}
              style={{ cursor: (payload.link || payload.type === "chat_message") ? "pointer" : "default" }}
            >
              <div style={{ fontWeight: "bold" }}>
                {payload.title || (payload.type === "chat_message" ? "New message received" : "New Notification")}
              </div>
              {payload.message && (
                <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>
                  {payload.message}
                </div>
              )}
            </div>
          ), { icon: "🔔" });
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
  }, [user?.id]);
}