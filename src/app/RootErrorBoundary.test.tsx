import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RootErrorBoundary } from './RootErrorBoundary';

const mockUseRouteError = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useRouteError: () => mockUseRouteError(),
  };
});

describe('RootErrorBoundary', () => {
  it('renders a friendly reload message for dynamic import errors', () => {
    mockUseRouteError.mockReturnValue(
      new TypeError('Failed to fetch dynamically imported module: https://example.com/assets/DashboardPage.js'),
    );

    render(
      <MemoryRouter>
        <RootErrorBoundary />
      </MemoryRouter>,
    );

    expect(screen.getByText('New version available')).toBeInTheDocument();
    expect(screen.getByText(/A new version of ThePrecisionLab was deployed/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reload page/i })).toBeInTheDocument();
  });

  it('renders generic error details and Dashboard link for regular errors', () => {
    mockUseRouteError.mockReturnValue(new Error('Database query timed out'));

    render(
      <MemoryRouter>
        <RootErrorBoundary />
      </MemoryRouter>,
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Database query timed out')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Go to Dashboard/i })).toBeInTheDocument();
  });
});

