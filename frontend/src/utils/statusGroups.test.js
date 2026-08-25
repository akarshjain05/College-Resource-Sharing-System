import { describe, it, expect } from 'vitest';
import { STATUS_GROUPS } from './statusGroups';

describe('statusGroups', () => {
  it('defines valid status groups', () => {
    expect(STATUS_GROUPS.upcoming).toContain('requested');
    expect(STATUS_GROUPS.upcoming).toContain('approved');
    expect(STATUS_GROUPS.ongoing).toContain('active');
    expect(STATUS_GROUPS.ongoing).toContain('late');
    expect(STATUS_GROUPS.completed).toContain('returned');
    expect(STATUS_GROUPS.completed).toContain('damaged');
  });
});
