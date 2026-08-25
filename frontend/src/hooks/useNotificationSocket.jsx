import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { chatMessageRouter } from "../utils/chatMessageRouter";
import { resolveNotificationLink } from "../utils/routeResolver";
import { notificationApi } from "../api/endpoints";
import { appCallbacks } from "../utils/appCallbacks";

// The realtime notification WebSocket is served by the main backend itself
// (see backend/app/routers/websocket.py), not a separate microservice --
// reuse the same base URL/origin the rest of the app already talks to.
//
// In production the Vite build receives VITE_API_BASE_URL="/api/v1" (a
// relative path) from docker-compose.prod.yml.  Calling .replace(/^http/, "ws")
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

// Reconnect backoff: starts at 1 s, doubles on each failure, caps at 30 s.
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

/**
 * Opens a WebSocket to receive real-time notifications from the backend
 * and shows a toast for each one as it arrives.  Reconnects automatically
 * with exponential backoff so a brief network hiccup doesn't spam retries.
 */
import { getAccessToken } from "../api/client";

export function useNotificationSocket(onNotification, user) {
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const reconnectDelayRef = useRef(RECONNECT_BASE_MS);

  useEffect(() => {
    if (!user) return;

    const token = getAccessToken();
    if (!token) return;

    let cancelled = false;

    const connect = () => {
      if (cancelled) return;

      // Always read the token fresh — it may have been refreshed since last connect.
      const token = getAccessToken();
      if (!token) return;

      const wsBase = getWebSocketBaseUrl();
      const socket = new WebSocket(
        `${wsBase}/ws/notifications?token=${encodeURIComponent(token)}`
      );
      socketRef.current = socket;

      socket.onopen = () => {
        // Connected — reset backoff so the next disconnect starts fresh.
        reconnectDelayRef.current = RECONNECT_BASE_MS;
        // Send token as first message after handshake for backward/forward compatibility
        socket.send(JSON.stringify({ token }));
      };

      socket.onmessage = (event) => {
        try {
          const rawPayload = JSON.parse(event.data);
          const payload = rawPayload.payload || rawPayload;

          // Route chat messages directly to open threads.
          if (payload.type === "chat_message") {
            const isHandled = chatMessageRouter.routeMessage(payload.borrow_request_id, payload.message);
            // If the thread is open (handled), skip the toast.
            if (isHandled) return;
          }

          toast((t) => (
            <div
              onClick={() => {
                if (payload.id) {
                  try {
                    notificationApi.markRead(payload.id);
                    appCallbacks.trigger("refreshUnreadCount");
                  } catch (e) {
                    // ignore
                  }
                }
                const resolved = resolveNotificationLink(payload.link, payload);
                if (resolved && resolved !== "/my-bookings") {
                  navigate(resolved);
                } else if (payload.type === "chat_message" && payload.borrow_request_id) {
                  navigate(`/my-bookings?id=${payload.borrow_request_id}&openChat=true`);
                } else if (resolved) {
                  navigate(resolved);
                }
                toast.dismiss(t.id);
              }}
              style={{
                cursor:
                  resolveNotificationLink(payload.link, payload) || payload.type === "chat_message"
                    ? "pointer"
                    : "default",
              }}
            >
              <div style={{ fontWeight: "bold" }}>
                {payload.title ||
                  (payload.type === "chat_message" ? "New message received" : "New Notification")}
              </div>
              {payload.message && (
                <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>
                  {typeof payload.message === "object" ? (payload.message.body || "New message") : payload.message}
                </div>
              )}
            </div>
          ), { icon: "🔔" });

          onNotification?.(payload);
        } catch {
          // ignore malformed payloads
        }
      };

      socket.onclose = () => {
        if (cancelled) return;

        // Code 4401 = auth failure (bad/expired token).  Don't retry immediately —
        // the token may have rotated; wait the normal backoff then re-read it.
        const delay = reconnectDelayRef.current;
        reconnectDelayRef.current = Math.min(delay * 2, RECONNECT_MAX_MS);
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };

      socket.onerror = () => {
        // onerror is always followed by onclose, so we let onclose handle the retry.
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