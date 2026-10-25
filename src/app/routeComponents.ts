import { lazy } from 'react';

const LandingPage = lazy(() => import('@/features/auth/LandingPage').then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('@/features/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const FirstRunOnboardingPage = lazy(() => import('@/features/auth/FirstRunOnboardingPage').then((m) => ({ default: m.FirstRunOnboardingPage })));
const AuthCallbackPage = lazy(() => import('@/features/auth/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })));
const EmailConfirmedPage = lazy(() => import('@/features/auth/EmailConfirmedPage').then((m) => ({ default: m.EmailConfirmedPage })));
const PasswordResetPage = lazy(() => import('@/features/auth/PasswordResetPage'));
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const JournalPage = lazy(() => import('@/features/journal/JournalPage').then((m) => ({ default: m.JournalPage })));
const TradeFormPage = lazy(() => import('@/features/journal/TradeFormPage').then((m) => ({ default: m.TradeFormPage })));
const AMTemplatePreviewPage = lazy(() => import('@/features/journal/AMTemplatePreviewPage').then((m) => ({ default: m.AMTemplatePreviewPage })));
const JournalTemplatesEditorPage = lazy(() => import('@/features/journal/JournalTemplatesEditorPage').then((m) => ({ default: m.JournalTemplatesEditorPage })));
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const TutorialsPage = lazy(() => import('@/features/settings/TutorialsPage').then((m) => ({ default: m.TutorialsPage })));
const TradeDetailsPage = lazy(() => import('@/features/journal/TradeDetailsPage').then((m) => ({ default: m.TradeDetailsPage })));
const StatisticsPage = lazy(() => import('@/features/statistics/StatisticsPage').then((m) => ({ default: m.StatisticsPage })));
const CalendarPage = lazy(() => import('@/features/calendar/CalendarPage').then((m) => ({ default: m.CalendarPage })));
const MistakesPage = lazy(() => import('@/features/mistakes/MistakesPage').then((m) => ({ default: m.MistakesPage })));
const ProfilePage = lazy(() => import('@/features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const AccountSummaryPage = lazy(() => import('@/features/accounts/AccountSummaryPage').then((m) => ({ default: m.AccountSummaryPage })));
const AccountsPage = lazy(() => import('@/features/accounts/AccountsPage').then((m) => ({ default: m.AccountsPage })));
const UIComponentsDemoPage = lazy(() => import('@/features/uiComponentsDemo/UIComponentsDemoPage').then((m) => ({ default: m.UIComponentsDemoPage })));
const CheckoutPage = lazy(() => import('@/features/billing/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const ManageSubscriptionPage = lazy(() => import('@/features/billing/ManageSubscriptionPage').then((m) => ({ default: m.ManageSubscriptionPage })));
const BacktestStoragePage = lazy(() => import('@/features/backtests/BacktestStoragePage').then((m) => ({ default: m.BacktestStoragePage })));
const FigmaTemplatesPage = lazy(() => import('@/features/journal/FigmaTemplatesPage').then((m) => ({ default: m.FigmaTemplatesPage })));

export {
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
};
