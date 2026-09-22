import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { LandingPage } from '@/features/auth/LandingPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { AuthCallbackPage } from '@/features/auth/AuthCallbackPage';
import { EmailConfirmedPage } from '@/features/auth/EmailConfirmedPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { JournalPage } from '@/features/journal/JournalPage';
import { TradeFormPage } from '@/features/journal/TradeFormPage';
import { TradeDetailsPage } from '@/features/journal/TradeDetailsPage';
import { StatisticsPage } from '@/features/statistics/StatisticsPage';
import { CalendarPage } from '@/features/calendar/CalendarPage';
import { MistakesPage } from '@/features/mistakes/MistakesPage';

export const router = createBrowserRouter([
  // Public Routes
  { path: '/', element: <LandingPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/auth/confirmed', element: <EmailConfirmedPage /> },
  { path: '/auth/callback', element: <AuthCallbackPage /> },

  // App Workspace Routes
  {
    element: <AppShell />,
    children: [
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'journal', element: <JournalPage /> },
      { path: 'journal/new', element: <TradeFormPage /> },
      { path: 'journal/:id', element: <TradeDetailsPage /> },
      { path: 'journal/:id/edit', element: <TradeFormPage /> },
      { path: 'statistics', element: <StatisticsPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'mistakes', element: <MistakesPage /> },
    ],
  },

  // Fallback
  { path: '*', element: <Navigate to="/" replace /> },
]);