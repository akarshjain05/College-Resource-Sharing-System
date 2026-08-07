/**
 * A simple message router for dispatching chat messages received via WebSocket
 * directly to the active ChatThread component, bypassing standard toast notifications.
 */
class ChatMessageRouter {
  constructor() {
    this.handlers = new Map();
  }

  /**
   * Register a handler for messages of a specific borrow request.
   */
  registerHandler(borrowRequestId, callback) {
    if (!this.handlers.has(borrowRequestId)) {
      this.handlers.set(borrowRequestId, new Set());
    }
    this.handlers.get(borrowRequestId).add(callback);

    // Return unregister function
    return () => {
      const callbacks = this.handlers.get(borrowRequestId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.handlers.delete(borrowRequestId);
        }
      }
    };
  }

  /**
   * Route a message to all handlers for a specific borrow request.
   * Returns true if there were handlers (meaning the thread is open).
   */
  routeMessage(borrowRequestId, message) {
    const callbacks = this.handlers.get(borrowRequestId);
    if (callbacks && callbacks.size > 0) {
      callbacks.forEach(callback => callback(message));
      return true; // Was handled by an active chat thread
    }
    return false; // Not handled
  }
}

export const chatMessageRouter = new ChatMessageRouter();
