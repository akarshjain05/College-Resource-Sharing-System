/**
 * A simple event bus for dispatching chat messages received via WebSocket
 * directly to the active ChatThread component, bypassing standard toast notifications.
 */
class ChatEventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to messages for a specific borrow request.
   */
  subscribe(borrowRequestId, callback) {
    if (!this.listeners.has(borrowRequestId)) {
      this.listeners.set(borrowRequestId, new Set());
    }
    this.listeners.get(borrowRequestId).add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(borrowRequestId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(borrowRequestId);
        }
      }
    };
  }

  /**
   * Emit a message to all listeners for a specific borrow request.
   * Returns true if there were listeners (meaning the thread is open).
   */
  emit(borrowRequestId, message) {
    const callbacks = this.listeners.get(borrowRequestId);
    if (callbacks && callbacks.size > 0) {
      callbacks.forEach(callback => callback(message));
      return true; // Was handled by an active chat thread
    }
    return false; // Not handled
  }
}

export const chatEventBus = new ChatEventBus();
