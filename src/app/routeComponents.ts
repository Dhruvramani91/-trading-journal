import { lazyWithRetry } from '@/lib/lazyWithRetry';

const LandingPage = lazyWithRetry(() => import('@/features/auth/LandingPage').then((m) => ({ default: m.LandingPage })));
const LoginPage = lazyWithRetry(() => import('@/features/auth/LoginPage').then((m) => ({ default: m.LoginPage })));
const FirstRunOnboardingPage = lazyWithRetry(() => import('@/features/auth/FirstRunOnboardingPage').then((m) => ({ default: m.FirstRunOnboardingPage })));
const AuthCallbackPage = lazyWithRetry(() => import('@/features/auth/AuthCallbackPage').then((m) => ({ default: m.AuthCallbackPage })));
const EmailConfirmedPage = lazyWithRetry(() => import('@/features/auth/EmailConfirmedPage').then((m) => ({ default: m.EmailConfirmedPage })));
const PasswordResetPage = lazyWithRetry(() => import('@/features/auth/PasswordResetPage'));
const DashboardPage = lazyWithRetry(() => import('@/features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const JournalPage = lazyWithRetry(() => import('@/features/journal/JournalPage').then((m) => ({ default: m.JournalPage })));
const TradeFormPage = lazyWithRetry(() => import('@/features/journal/TradeFormPage').then((m) => ({ default: m.TradeFormPage })));
const AMTemplatePreviewPage = lazyWithRetry(() => import('@/features/journal/AMTemplatePreviewPage').then((m) => ({ default: m.AMTemplatePreviewPage })));
const JournalTemplatesEditorPage = lazyWithRetry(() => import('@/features/journal/JournalTemplatesEditorPage').then((m) => ({ default: m.JournalTemplatesEditorPage })));
const SettingsPage = lazyWithRetry(() => import('@/features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const TutorialsPage = lazyWithRetry(() => import('@/features/settings/TutorialsPage').then((m) => ({ default: m.TutorialsPage })));
const TradeDetailsPage = lazyWithRetry(() => import('@/features/journal/TradeDetailsPage').then((m) => ({ default: m.TradeDetailsPage })));
const StatisticsPage = lazyWithRetry(() => import('@/features/statistics/StatisticsPage').then((m) => ({ default: m.StatisticsPage })));
const CalendarPage = lazyWithRetry(() => import('@/features/calendar/CalendarPage').then((m) => ({ default: m.CalendarPage })));
const MistakesPage = lazyWithRetry(() => import('@/features/mistakes/MistakesPage').then((m) => ({ default: m.MistakesPage })));
const ProfilePage = lazyWithRetry(() => import('@/features/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const AccountSummaryPage = lazyWithRetry(() => import('@/features/accounts/AccountSummaryPage').then((m) => ({ default: m.AccountSummaryPage })));
const AccountsPage = lazyWithRetry(() => import('@/features/accounts/AccountsPage').then((m) => ({ default: m.AccountsPage })));
const UIComponentsDemoPage = lazyWithRetry(() => import('@/features/uiComponentsDemo/UIComponentsDemoPage').then((m) => ({ default: m.UIComponentsDemoPage })));
const CheckoutPage = lazyWithRetry(() => import('@/features/billing/CheckoutPage').then((m) => ({ default: m.CheckoutPage })));
const ManageSubscriptionPage = lazyWithRetry(() => import('@/features/billing/ManageSubscriptionPage').then((m) => ({ default: m.ManageSubscriptionPage })));
const BacktestStoragePage = lazyWithRetry(() => import('@/features/backtests/BacktestStoragePage').then((m) => ({ default: m.BacktestStoragePage })));
const FigmaTemplatesPage = lazyWithRetry(() => import('@/features/journal/FigmaTemplatesPage').then((m) => ({ default: m.FigmaTemplatesPage })));
const PrivacyPolicyPage = lazyWithRetry(() => import('@/features/legal/PrivacyPolicyPage').then((m) => ({ default: m.PrivacyPolicyPage })));
const TermsOfServicePage = lazyWithRetry(() => import('@/features/legal/TermsOfServicePage').then((m) => ({ default: m.TermsOfServicePage })));

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
  PrivacyPolicyPage,
  TermsOfServicePage,
};
