import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuthStore } from '@/store/authStore';
import { useSidebarStore } from '@/store/sidebarStore';
import { useThemeStore } from '@/store/themeStore';

function LocationProbe() {
  const { pathname } = useLocation();
  return <output aria-label="Current route">{pathname}</output>;
}

describe('workspace navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthStore.setState({
      user: { id: 'user-1', email: 'trader@example.com', name: 'Trader' },
      loading: false,
      error: null,
      initialized: true,
    });
    useSidebarStore.setState({ collapsed: false, width: 248 });
    useThemeStore.setState({ theme: 'light' });
    document.documentElement.classList.remove('dark');
  });

  it('resizes to the compact floating rail and navigates to existing app routes', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Sidebar />
        <Routes><Route path="*" element={<LocationProbe />} /></Routes>
      </MemoryRouter>,
    );

    const resizeHandle = screen.getByRole('separator', { name: 'Resize sidebar' });
    fireEvent.pointerDown(resizeHandle, { clientX: 248, pointerId: 1 });
    fireEvent.pointerMove(resizeHandle, { clientX: 100, pointerId: 1 });
    fireEvent.pointerUp(resizeHandle, { clientX: 100, pointerId: 1 });
    expect(useSidebarStore.getState().width).toBe(72);
    expect(screen.queryByRole('button', { name: 'Collapse sidebar' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Accounts' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Accounts' }));
    expect(screen.getByLabelText('Current route')).toHaveTextContent('/accounts');
  });

  it('opens a mobile drawer with existing routes and closes after navigation', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <MobileNav />
        <Routes><Route path="*" element={<LocationProbe />} /></Routes>
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open navigation menu' }));
    expect(screen.getByRole('navigation', { name: 'Main navigation' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('navigation', { name: 'Main navigation' }).querySelector('a[href="/accounts"]')!);

    expect(screen.getByLabelText('Current route')).toHaveTextContent('/accounts');
    expect(screen.queryByRole('navigation', { name: 'Main navigation' })).not.toBeInTheDocument();
  });

  it('toggles the global theme and updates the accessible control label', () => {
    render(<ThemeToggle />);

    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }));
    expect(document.documentElement).not.toHaveClass('dark');
  });
});
