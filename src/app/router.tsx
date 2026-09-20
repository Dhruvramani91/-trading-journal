import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { JournalPage } from '@/features/journal/JournalPage';
import { TradeFormPage } from '@/features/journal/TradeFormPage';
import { TradeDetailsPage } from '@/features/journal/TradeDetailsPage';
import { StatisticsPage } from '@/features/statistics/StatisticsPage';
import { CalendarPage } from '@/features/calendar/CalendarPage';
import { MistakesPage } from '@/features/mistakes/MistakesPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'journal', element: <JournalPage /> },
      { path: 'journal/new', element: <TradeFormPage /> },
      { path: 'journal/:id', element: <TradeDetailsPage /> },
      { path: 'journal/:id/edit', element: <TradeFormPage /> },
      { path: 'statistics', element: <StatisticsPage /> },
      { path: 'calendar', element: <CalendarPage /> },
      { path: 'mistakes', element: <MistakesPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
