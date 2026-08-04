import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { chatEventBus } from "../utils/chatEventBus";
import { resolveNotificationLink } from "../utils/routeResolver";
import { notificationApi } from "../api/endpoints";

// The realtime notification WebSocket is served by the main backend itself
// (see backend/app/routers/websocket.py), not a separate microservice --
// reuse the same base URL/origin the rest of the app already talks to.
//
// In production the Vite build receives VITE_API_BASE_URL="/api/v1" (a
// relative path) from docker-compose.prod.yml. Calling .replace(/^http/, "ws")
// on a relative string is a no-op and produces an invalid WebSocket URL.
// We therefore derive the WS base from window.location when the env var does
// not start with "http".
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";

function getWebSocketBaseUrl() {
  if (API_BASE_URL.startsWith("http")) {
    // Absolute URL (local dev): just swap the scheme.
    return API_BASE_URL.replace(/^http/, "ws");
  }
  // Relative URL (production behind Caddy): build wss:// or ws:// from window.location.
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}${API_BASE_URL}`;
}

export function useNotificationSocket(onNotification, user) {
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem("crss_access_token");
    if (!token) return;

    let cancelled = false;

    const connect = () => {
      const wsUrl = `${getWebSocketBaseUrl()}/ws/notifications`;
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        // Send token as first message after handshake
        socket.send(JSON.stringify({ token }));
      };

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          // Check if there is an active chat component handling this message
          if (payload.type === "chat_message") {
            const isHandled = chatEventBus.emit("message", payload);
            // If the user is currently viewing this chat thread, don't show a toast
            if (isHandled) return;
          }

          toast((t) => (
            <div
              onClick={() => {
                if (payload.id) {
                  try {
                    notificationApi.markRead(payload.id);
                    window.dispatchEvent(new Event("refreshUnreadCount"));
                  } catch (e) {
                    // ignore
                  }
                }
                const resolved = resolveNotificationLink(payload.link);
                if (resolved && resolved !== "/borrow-requests") {
                  navigate(resolved);
                } else if (payload.type === "chat_message" && payload.borrow_request_id) {
                  navigate(`/borrow-requests?id=${payload.borrow_request_id}&openChat=true`);
                } else if (resolved) {
                  navigate(resolved);
                }
                toast.dismiss(t.id);
              }}
              style={{ cursor: (resolveNotificationLink(payload.link) || payload.type === "chat_message") ? "pointer" : "default" }}
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