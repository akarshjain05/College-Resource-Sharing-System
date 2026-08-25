import { describe, it, expect, vi, beforeEach } from 'vitest';
import api, { clearAccessToken, getAccessToken } from './client';
import axios from 'axios';
import { appCallbacks } from '../utils/appCallbacks';

// Mock axios.post which is called during refresh
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal();
  const mockCreate = vi.fn(() => {
    const instance = actual.default.create();
    return instance;
  });
  return {
    default: {
      ...actual.default,
      create: mockCreate,
      post: vi.fn(),
    }
  };
});

describe('Axios interceptor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearAccessToken();
  });

  it('queues concurrent 401 requests and processes them after token refresh', async () => {
    // We will simulate the api.get calls failing with 401
    // and then mock the refresh call to take some time and succeed.
    
    // To do this, we can mock the api's adapter or request.
    // An easier way is just calling the interceptor's error handler directly if possible,
    // but the interceptor isn't exported.
    
    // Let's use axios-mock-adapter if it exists, or just mock the adapter on api.
    const mockAdapter = vi.fn();
    api.defaults.adapter = mockAdapter;
    
    let reqCount = 0;
    mockAdapter.mockImplementation((config) => {
      // First 2 requests return 401
      if (reqCount < 2 && config.url === '/some/protected') {
        reqCount++;
        return Promise.reject({
          config,
          response: { status: 401 }
        });
      }
      // After refresh, the retries will come here
      return Promise.resolve({ data: 'success', status: 200, config });
    });

    // Mock the refresh endpoint
    let refreshResolved;
    const refreshPromise = new Promise(resolve => {
      refreshResolved = resolve;
    });
    
    axios.post.mockReturnValue(refreshPromise);

    // Fire 2 concurrent requests
    const p1 = api.get('/some/protected');
    const p2 = api.get('/some/protected');

    // Yield to event loop to allow interceptors to run and refresh to start
    await new Promise(r => setTimeout(r, 10));

    expect(axios.post).toHaveBeenCalledTimes(1); // Refresh called exactly once
    
    // Resolve the refresh
    refreshResolved({ data: { access_token: 'new_token' } });

    const res1 = await p1;
    const res2 = await p2;

    expect(res1.data).toBe('success');
    expect(res2.data).toBe('success');
    expect(getAccessToken()).toBe('new_token');
    
    // Check that retried requests had the new token
    expect(res1.config.headers.Authorization).toBe('Bearer new_token');
    expect(res2.config.headers.Authorization).toBe('Bearer new_token');
  });
});
