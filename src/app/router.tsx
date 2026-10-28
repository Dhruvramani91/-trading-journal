import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { RootErrorBoundary } from './RootErrorBoundary';
import {
  LandingPage,
  LoginPage,
  FirstRunOnboardingPage,
  AuthCallbackPage,
  EmailConfirmedPage,
  PasswordResetPage,
  DashboardPage,
  JournalPage,
  TradeFormPage,
  AMTemplatePreviewPage,
  JournalTemplatesEditorPage,
  SettingsPage,
  TutorialsPage,
  TradeDetailsPage,
  StatisticsPage,
  CalendarPage,
  MistakesPage,
  ProfilePage,
  AccountSummaryPage,
  AccountsPage,
  UIComponentsDemoPage,
  CheckoutPage,
  ManageSubscriptionPage,
  BacktestStoragePage,
  FigmaTemplatesPage,
  PrivacyPolicyPage,
  TermsOfServicePage,
} from './routeComponents';
import { RequireAuth, RequireOnboarding, RequireSubscription } from './RequireAuth';

export const router = createBrowserRouter([
  {
    errorElement: <RootErrorBoundary />,
    children: [
      // Public Routes
      { path: '/', element: <LandingPage /> },
      { path: '/privacy', element: <PrivacyPolicyPage /> },
      { path: '/terms', element: <TermsOfServicePage /> },
      { path: '/login', element: <LoginPage /> },
      { path: '/auth/confirmed', element: <EmailConfirmedPage /> },
      { path: '/auth/reset-password', element: <PasswordResetPage /> },
      { path: '/auth/callback', element: <AuthCallbackPage /> },
      { path: '/ui-components-demo', element: <UIComponentsDemoPage /> },

      // App Workspace Routes (auth required)
      {
        element: <RequireAuth />,
        errorElement: <RootErrorBoundary />,
        children: [
          {
            element: <RequireSubscription />,
            errorElement: <RootErrorBoundary />,
            children: [
              { path: 'onboarding', element: <FirstRunOnboardingPage /> },
              {
                element: <RequireOnboarding />,
                errorElement: <RootErrorBoundary />,
                children: [
                  {
                    element: <AppShell />,
                    errorElement: <RootErrorBoundary />,
                    children: [
                      { path: 'dashboard', element: <DashboardPage /> },
                      { path: 'journal', element: <JournalPage /> },
                      { path: 'journal/template-preview/am', element: <AMTemplatePreviewPage /> },
                      { path: 'settings', element: <SettingsPage /> },
                      { path: 'tutorials', element: <TutorialsPage /> },
                      { path: 'settings/templates', element: <JournalTemplatesEditorPage /> },
                      { path: 'figma-templates', element: <FigmaTemplatesPage /> },
                      { path: 'journal/new', element: <TradeFormPage /> },
                      { path: 'journal/:id', element: <TradeDetailsPage /> },
                      { path: 'journal/:id/edit', element: <TradeFormPage /> },
                      { path: 'statistics', element: <StatisticsPage /> },
                      { path: 'calendar', element: <CalendarPage /> },
                      { path: 'mistakes', element: <MistakesPage /> },
                      { path: 'backtests', element: <BacktestStoragePage /> },
                      { path: 'backtests/:sessionId/trade/:tradeId', element: <BacktestStoragePage /> },
                      { path: 'backtests/:sessionId/:section?', element: <BacktestStoragePage /> },
                      { path: 'profile', element: <ProfilePage /> },
                      { path: 'manage-subscription', element: <ManageSubscriptionPage /> },
                      { path: 'accounts', element: <AccountsPage /> },
                      { path: 'accounts/:id', element: <AccountSummaryPage /> },
                    ],
                  },
                ],
              },
            ],
          },
          { path: 'checkout', element: <CheckoutPage /> },
        ],
      },

      // Fallback
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
