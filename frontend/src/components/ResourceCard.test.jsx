import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect } from 'vitest';
import ResourceCard from './ResourceCard';

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', full_name: 'Test User' }
  })
}));

const mockResource = {
  id: 'res-1',
  title: 'Test Sony Camera',
  description: 'A great camera',
  condition: 'good',
  status: 'available',
  quantity_available: 1,
  daily_price: 15.5,
  deposit_amount: 100,
  average_rating: 4.5,
  total_borrows: 10,
  owner: {
    id: 'owner-id',
    full_name: 'Owner Name',
    department: 'Computer Science'
  },
  images: [
    { image_url: '/test-img.jpg', is_primary: true }
  ]
};

describe('ResourceCard', () => {
  it('renders resource details correctly', () => {
    render(
      <MemoryRouter>
        <ResourceCard resource={mockResource} />
      </MemoryRouter>
    );

    expect(screen.getByText('Test Sony Camera')).toBeInTheDocument();
    expect(screen.getByText('Owner Name')).toBeInTheDocument();
    
    // Check if the price/deposit is shown
    expect(screen.getByText(/₹\s*15\.5/)).toBeInTheDocument();
    expect(screen.getByText(/₹\s*100/)).toBeInTheDocument();
  });
});
