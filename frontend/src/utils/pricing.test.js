import { describe, it, expect } from 'vitest';
import { computeTotalAmountRupees } from './pricing';

describe('pricing logic', () => {
  it('computes total amount based on daily price and deposit for 1 day', () => {
    const borrowRequest = {
      start_date: '2023-01-01',
      end_date: '2023-01-01',
    };
    const resource = {
      daily_price: 10,
      deposit_amount: 50,
    };
    const total = computeTotalAmountRupees(borrowRequest, resource);
    expect(total).toBe(10 * 1 + 50); // 1 day inclusive
  });
  
  it('computes total amount for 3 days', () => {
    const borrowRequest = {
      start_date: '2023-01-01',
      end_date: '2023-01-03',
    };
    const resource = {
      daily_price: 10,
      deposit_amount: 50,
    };
    const total = computeTotalAmountRupees(borrowRequest, resource);
    expect(total).toBe(10 * 3 + 50); // 3 days inclusive
  });

  it('handles zero values correctly', () => {
    const borrowRequest = {
      start_date: '2023-01-01',
      end_date: '2023-01-03',
    };
    const resource = {
      daily_price: 0,
      deposit_amount: 0,
    };
    const total = computeTotalAmountRupees(borrowRequest, resource);
    expect(total).toBe(0);
  });
});
