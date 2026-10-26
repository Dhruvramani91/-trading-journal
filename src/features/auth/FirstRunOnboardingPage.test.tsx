import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { FirstRunOnboardingPage } from './FirstRunOnboardingPage';
import { useAuthStore } from '@/store/authStore';
import * as onboardingRepo from '@/data/onboardingRepository';
import * as templateRepo from '@/data/journalTemplateRepository';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/data/onboardingRepository', () => ({
  needsFirstRunOnboarding: vi.fn(),
  completeFirstRunOnboarding: vi.fn(),
}));

vi.mock('@/data/journalTemplateRepository', () => ({
  listJournalTemplates: vi.fn(),
  getDefaultTemplateId: vi.fn(),
  saveDefaultTemplateId: vi.fn(),
  saveCustomTemplate: vi.fn(),
}));

const mockTemplates = [
  {
    id: 'default-ict-2026',
    name: 'ICT / Smart Money Concepts',
    description: 'Framework built for liquidity sweeps, order blocks, and session killzones.',
    photoCount: 3,
    fields: [
      { key: 'session', label: 'Session', type: 'select', inStats: true },
      { key: 'fvg', label: 'Fair Value Gap', type: 'boolean', inStats: true },
    ],
  },
  {
    id: 'scalping-momentum',
    name: 'Scalping & Momentum',
    description: 'Fast-paced execution tracking level 2 depth and slippage.',
    photoCount: 2,
    fields: [
      { key: 'tapeSpeed', label: 'Tape Speed', type: 'select', inStats: true },
    ],
  },
];

describe('FirstRunOnboardingPage', () => {
  const updateProfileMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();

    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'trader@example.com',
        name: 'Jordan Belfort',
        traderLevel: 'beginner',
        avatar: undefined,
      },
      loading: false,
      error: null,
      updateProfile: updateProfileMock,
    });

    vi.mocked(onboardingRepo.needsFirstRunOnboarding).mockResolvedValue(true);
    vi.mocked(onboardingRepo.completeFirstRunOnboarding).mockResolvedValue(undefined);
    vi.mocked(templateRepo.listJournalTemplates).mockResolvedValue(mockTemplates as any);
    vi.mocked(templateRepo.getDefaultTemplateId).mockResolvedValue('default-ict-2026');
    vi.mocked(templateRepo.saveDefaultTemplateId).mockResolvedValue(undefined);
    vi.mocked(templateRepo.saveCustomTemplate).mockResolvedValue({
      id: 'custom:uuid-1',
      name: "Jordan Belfort's Strategy",
      description: 'Personal strategy',
      photoCount: 3,
      fields: [],
    } as any);
    updateProfileMock.mockResolvedValue(undefined);
  });

  function renderPage() {
    return render(
      <MemoryRouter initialEntries={['/onboarding']}>
        <Routes>
          <Route path="/onboarding" element={<FirstRunOnboardingPage />} />
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
          <Route path="/journal/new" element={<div>New Trade Page</div>} />
          <Route path="/settings/templates" element={<div>Template Settings Page</div>} />
        </Routes>
      </MemoryRouter>
    );
  }

  it('redirects to dashboard if first-run onboarding is not required', async () => {
    vi.mocked(onboardingRepo.needsFirstRunOnboarding).mockResolvedValue(false);

    renderPage();

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });

  it('renders Step 1 (Profile) with prefilled name and experience levels', async () => {
    renderPage();

    expect(await screen.findByText('Set up your trader profile.')).toBeInTheDocument();
    expect(screen.getByLabelText(/Your name/i)).toHaveValue('Jordan Belfort');
    expect(screen.getByText('Beginner')).toBeInTheDocument();
    expect(screen.getByText('Intermediate')).toBeInTheDocument();
    expect(screen.getByText('Advanced')).toBeInTheDocument();
  });

  it('validates that name is not empty when advancing from Profile step', async () => {
    renderPage();

    const nameInput = await screen.findByLabelText(/Your name/i);
    fireEvent.change(nameInput, { target: { value: '   ' } });

    fireEvent.click(screen.getByRole('button', { name: /Continue to strategy/i }));

    expect(await screen.findByText('Please enter your name to continue.')).toBeInTheDocument();
    expect(updateProfileMock).not.toHaveBeenCalled();
  });

  it('saves profile and transitions to Step 2 (Strategy setup)', async () => {
    renderPage();

    const nameInput = await screen.findByLabelText(/Your name/i);
    fireEvent.change(nameInput, { target: { value: 'Alex Morgan' } });

    // Select Intermediate level
    fireEvent.click(screen.getByLabelText(/Intermediate/i));

    fireEvent.click(screen.getByRole('button', { name: /Continue to strategy/i }));

    await waitFor(() => {
      expect(updateProfileMock).toHaveBeenCalledWith('Alex Morgan', null, 'intermediate');
    });

    expect(await screen.findByText('Choose your starting template.')).toBeInTheDocument();
  });

  it('allows navigating back from Step 2 (Strategy) to Step 1 (Profile)', async () => {
    renderPage();

    await screen.findByText('Set up your trader profile.');
    fireEvent.click(screen.getByRole('button', { name: /Continue to strategy/i }));

    await screen.findByText('Choose your starting template.');

    fireEvent.click(screen.getByRole('button', { name: /Back to profile/i }));

    expect(await screen.findByText('Set up your trader profile.')).toBeInTheDocument();
  });

  it('allows selecting a template and completing onboarding', async () => {
    renderPage();

    await screen.findByText('Set up your trader profile.');
    fireEvent.click(screen.getByRole('button', { name: /Continue to strategy/i }));

    await screen.findByText('Choose your starting template.');

    // Select the second template
    fireEvent.click(screen.getByLabelText(/Scalping & Momentum/i));

    fireEvent.click(screen.getByRole('button', { name: /Use Scalping & Momentum/i }));

    await waitFor(() => {
      expect(templateRepo.saveDefaultTemplateId).toHaveBeenCalledWith('scalping-momentum');
      expect(onboardingRepo.completeFirstRunOnboarding).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/journal/new', { replace: true });
    });
  });

  it('allows creating a custom template which becomes default and completes onboarding', async () => {
    renderPage();

    await screen.findByText('Set up your trader profile.');
    fireEvent.click(screen.getByRole('button', { name: /Continue to strategy/i }));

    await screen.findByText('Choose your starting template.');

    fireEvent.click(screen.getByRole('button', { name: /Create my own template/i }));

    await waitFor(() => {
      expect(templateRepo.saveCustomTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Jordan Belfort's Strategy",
        })
      );
      expect(templateRepo.saveDefaultTemplateId).toHaveBeenCalledWith('custom:uuid-1');
      expect(onboardingRepo.completeFirstRunOnboarding).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/settings/templates', { replace: true });
    });
  });

  it('allows skipping strategy setup safely and opening the app', async () => {
    renderPage();

    await screen.findByText('Set up your trader profile.');
    fireEvent.click(screen.getByRole('button', { name: /Continue to strategy/i }));

    await screen.findByText('Choose your starting template.');

    const skipButtons = screen.getAllByRole('button', { name: /Skip for now/i });
    fireEvent.click(skipButtons[0]!);

    await waitFor(() => {
      expect(onboardingRepo.completeFirstRunOnboarding).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });
});
