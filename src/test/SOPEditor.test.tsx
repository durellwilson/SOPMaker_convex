import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SOPEditor } from '../SOPEditor';
import { Id } from '../../convex/_generated/dataModel';

// Mock the Convex hooks
vi.mock('convex/react', () => ({
  useQuery: vi.fn().mockImplementation((query) => {
    // Mock different returns based on the query function
    if (query.toString().includes('getSOP')) {
      return { _id: 'sop1' as Id<'sops'>, title: 'Test SOP', content: 'Initial content' };
    }
    return null;
  }),
  useMutation: vi.fn().mockImplementation(() => vi.fn().mockResolvedValue(undefined)),
}));

// Mock the toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('SOPEditor', () => {
  const mockSopId = 'sop1' as Id<'sops'>;
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  it('renders the editor with SOP content when a SOP is selected', () => {
    render(<SOPEditor sopId={mockSopId} />);
    
    expect(screen.getByText('Test SOP')).toBeInTheDocument();
    expect(screen.getByText('Initial content')).toBeInTheDocument();
  });
  
  it('shows empty state when no SOP is selected', () => {
    render(<SOPEditor sopId={null} />);
    
    expect(screen.getByText('Select a SOP to edit')).toBeInTheDocument();
  });
  
  it('updates content when edited', () => {
    render(<SOPEditor sopId={mockSopId} />);
    
    const editor = screen.getByRole('textbox');
    fireEvent.change(editor, { target: { value: 'Updated content' } });
    
    expect(editor).toHaveValue('Updated content');
  });
});