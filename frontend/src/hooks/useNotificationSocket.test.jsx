import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useNotificationSocket } from './useNotificationSocket';
import * as client from '../api/client';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../api/client', () => ({
  getAccessToken: vi.fn(),
}));

vi.mock('../api/endpoints', () => ({
  notificationApi: { markRead: vi.fn() }
}));

vi.mock('react-hot-toast', () => ({
  default: vi.fn(),
}));

describe('useNotificationSocket', () => {
  let MockWebSocket;
  let socketInstances = [];

  beforeEach(() => {
    vi.useFakeTimers();
    socketInstances = [];
    MockWebSocket = class {
      constructor(url) {
        this.url = url;
        this.close = vi.fn();
        this.send = vi.fn();
        socketInstances.push(this);
        // Simulate immediate connection
        setTimeout(() => {
          if (this.onopen) this.onopen();
        }, 0);
      }
    };
    global.WebSocket = MockWebSocket;
    vi.spyOn(client, 'getAccessToken').mockReturnValue('mock-token');
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.restoreAllMocks();
    delete global.WebSocket;
  });

  it('connects and reconnects with exponential backoff on close', async () => {
    const wrapper = ({ children }) => <MemoryRouter>{children}</MemoryRouter>;
    
    renderHook(() => useNotificationSocket(vi.fn(), { id: 'user1' }), { wrapper });
    
    await vi.runAllTimersAsync();
    
    expect(socketInstances.length).toBe(1);
    const initialSocket = socketInstances[0];
    
    // Simulate close
    initialSocket.onclose();
    
    // The hook waits 1000ms initially
    expect(socketInstances.length).toBe(1);
    await vi.advanceTimersByTimeAsync(1000);
    expect(socketInstances.length).toBe(2);
    
    // Second disconnect -> 2000ms
    socketInstances[1].onclose();
    await vi.advanceTimersByTimeAsync(1999);
    expect(socketInstances.length).toBe(2);
    await vi.advanceTimersByTimeAsync(1);
    expect(socketInstances.length).toBe(3);
    
    // Third disconnect -> 4000ms
    socketInstances[2].onclose();
    await vi.advanceTimersByTimeAsync(4000);
    expect(socketInstances.length).toBe(4);
  });
});
