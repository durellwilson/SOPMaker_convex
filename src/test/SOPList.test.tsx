import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SOPList } from '../SOPList';
import { Id } from '../../convex/_generated/dataModel';

// Mock the Convex hooks
vi.mock('convex/react', () => ({
  useQuery: vi.fn().mockReturnValue([
    { _id: 'sop1' as Id<'sops'>, title: 'Test SOP 1', description: 'Description 1' },
    { _id: 'sop2' as Id<'sops'>, title: 'Test SOP 2', description: 'Description 2' },
  ]),
  useMutation: vi.fn().mockImplementation(() => vi.fn().mockResolvedValue('sop3')),
}));

// Mock the toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('SOPList', () => {
  const mockOnSelect = vi.fn();
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('renders the SOP list', () => {
    render(<SOPList selectedSopId={null} onSelect={mockOnSelect} />);
    
    expect(screen.getByText('Test SOP 1')).toBeInTheDocument();
    expect(screen.getByText('Test SOP 2')).toBeInTheDocument();
    expect(screen.getByText('Create New SOP')).toBeInTheDocument();
  });
  
  it('selects a SOP when clicked', () => {
    render(<SOPList selectedSopId={null} onSelect={mockOnSelect} />);
    
    fireEvent.click(screen.getByText('Test SOP 1'));
    expect(mockOnSelect).toHaveBeenCalledWith('sop1');
  });
  
  it('shows create form when create button is clicked', () => {
    render(<SOPList selectedSopId={null} onSelect={mockOnSelect} />);
    
    fireEvent.click(screen.getByText('Create New SOP'));
    expect(screen.getByPlaceholderText('SOP Title')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('SOP Description')).toBeInTheDocument();
    expect(screen.getByText('Create')).toBeInTheDocument();
  });
});