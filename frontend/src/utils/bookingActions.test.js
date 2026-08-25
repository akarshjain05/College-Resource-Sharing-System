import { describe, it, expect } from 'vitest';
import { getAvailableActions } from './bookingActions';

describe('bookingActions', () => {
  it('gives borrower actions for requested status', () => {
    const booking = { status: 'requested' };
    const actions = getAvailableActions(booking, false);
    expect(actions).toEqual(['nudge', 'cancel']);
  });
  
  it('gives borrower pay action if approved but unpaid', () => {
    const booking = { status: 'approved', total_amount: 100 };
    const actions = getAvailableActions(booking, false);
    expect(actions).toContain('pay');
  });

  it('gives lender actions for requested status', () => {
    const booking = { status: 'requested' };
    const actions = getAvailableActions(booking, true);
    expect(actions).toEqual(['approve', 'reject']);
  });
});
