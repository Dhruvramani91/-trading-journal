import { Link } from 'react-router-dom';
import {
  TrendingUp,
  BookOpen,
  BarChart3,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Check,
  LineChart,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export function LandingPage() {
  const { user } = useAuthStore();

  return (
    <div className="min-h-screen bg-bg-0 text-fg font-sans antialiased">

      {/* ── NAV ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-bg-1 border-b border-line">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-14 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="PrecisionJournal"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-bg-2 border border-line object-contain"
            />
            <span className="text-sm font-bold tracking-tight text-fg">PrecisionJournal</span>
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-sm text-fg-muted">
            <a href="#features" className="hover:text-fg transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-fg transition-colors">How it works</a>
            <a href="#pricing" className="hover:text-fg transition-colors">Pricing</a>
          </nav>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-fg text-fg-inverse text-xs font-semibold hover:opacity-90 transition-opacity"
              >
                Open Journal <ArrowRight className="h-3 w-3" />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm text-fg-muted hover:text-fg transition-colors font-medium"
                >
                  Sign in
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 h-8 px-4 rounded-lg bg-fg text-fg-inverse text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  Get started free
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO ────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pt-20 pb-16 md:pt-28 md:pb-20">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-fg-dim mb-4">
            Trading Journal
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-[56px] font-extrabold tracking-tight text-fg leading-[1.1]">
            Journal your trades.<br />
            <span className="text-fg-dim">Improve your edge.</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg text-fg-muted leading-relaxed max-w-lg">
            PrecisionJournal is a clean, simple trading journal that gamifies discipline.
            Record every trade, review your performance, and eliminate what's costing you R.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 h-10 px-6 rounded-xl bg-fg text-fg-inverse text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
            >
              Start journaling free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 h-10 px-6 rounded-xl bg-bg-2 text-fg text-sm font-semibold border border-line-strong hover:border-fg-dim hover:bg-bg-3 transition-colors"
            >
              View live demo
            </Link>
          </div>

          <p className="mt-4 text-xs text-fg-dim">
            No credit card required · Local-first · Free forever
          </p>
        </div>
      </section>

      {/* ── PRODUCT PREVIEW ─────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 sm:px-8 pb-20">
        <div className="rounded-2xl border border-line bg-bg-1 overflow-hidden shadow-sm">
          {/* Fake browser chrome */}
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-line bg-bg-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#f56c6c]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#f9a825]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#66bb6a]" />
            <span className="ml-3 flex-1 h-6 rounded-md bg-bg-4 border border-line text-[10px] flex items-center justify-center text-fg-dim">
              precisionjournal.app/dashboard
            </span>
          </div>

          {/* Dashboard mockup */}
          <div className="p-5 sm:p-7">
            {/* Page title */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-bold text-fg">Dashboard</h2>
                <p className="text-xs text-fg-dim">Overview of your trading performance</p>
              </div>
              <div className="h-8 px-4 rounded-lg bg-fg text-fg-inverse text-xs font-semibold flex items-center gap-1.5">
                <span>+</span> New trade
              </div>
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Total R', value: '+14.5R', color: 'var(--win)' },
                { label: 'Win Rate', value: '68.4%', color: 'var(--fg)' },
                { label: 'Avg R:R', value: '2.85', color: 'var(--fg)' },
                { label: 'Avg Duration', value: '42m', color: 'var(--fg)' },
              ].map((m) => (
                <div key={m.label} className="p-4 rounded-xl bg-bg-2 border border-line">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-fg-dim mb-1">{m.label}</p>
                  <p className="text-xl font-bold tabular-nums" style={{ color: m.color }}>{m.value}</p>
                </div>
              ))}
            </div>

            {/* Equity curve placeholder */}
            <div className="rounded-xl bg-bg-2 border border-line p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-fg">Equity curve</p>
                <div className="flex gap-1">
                  <span className="h-6 px-3 rounded-md bg-fg text-fg-inverse text-[10px] font-semibold flex items-center">Cumulative R</span>
                  <span className="h-6 px-3 rounded-md bg-bg-4 text-fg-muted text-[10px] font-medium flex items-center">Daily R</span>
                </div>
              </div>
              {/* SVG chart */}
              <svg viewBox="0 0 600 120" className="w-full" preserveAspectRatio="none">
                <line x1="0" y1="80" x2="600" y2="80" stroke="var(--line)" strokeWidth="1" />
                <line x1="0" y1="50" x2="600" y2="50" stroke="var(--line)" strokeWidth="1" />
                <line x1="0" y1="20" x2="600" y2="20" stroke="var(--line)" strokeWidth="1" />
                <polyline
                  points="0,90 60,85 120,78 180,70 240,65 300,58 360,45 420,38 480,28 540,20 600,14"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="2"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <polyline
                  points="0,90 60,85 120,78 180,70 240,65 300,58 360,45 420,38 480,28 540,20 600,14"
                  fill="rgb(var(--accent) / 0.07)"
                  stroke="none"
                />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ────────────────────────────────── */}
      <section id="how-it-works" className="border-t border-line bg-bg-1 py-20 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-lg mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-fg-dim mb-3">How it works</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-fg">
              Record. Review.<br />Improve.
            </h2>
            <p className="mt-3 text-sm text-fg-muted leading-relaxed">
              PrecisionJournal makes it effortless to build the habit of structured trade journaling — so your performance compounds over time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: BookOpen,
                title: 'Record every trade',
                desc: 'Log your setups, entries, results and screenshots in seconds. Every field is designed around real trading workflows — not generic forms.',
              },
              {
                step: '02',
                icon: BarChart3,
                title: 'Review your performance',
                desc: 'Your equity curve, win rate, R:R, and best/worst setups update in real time. No spreadsheets. No manual calculations.',
              },
              {
                step: '03',
                icon: AlertTriangle,
                title: 'Eliminate mistakes',
                desc: 'See exactly which mistakes (FOMO, early entry, oversize) are costing you R — and by how much. Fix the right things first.',
              },
            ].map(({ step, icon: Icon, title, desc }) => (
              <div key={step} className="p-6 rounded-2xl bg-bg-2 border border-line">
                <div className="flex items-start gap-3 mb-4">
                  <span className="text-[10px] font-bold text-fg-dim tracking-wider mt-0.5">{step}</span>
                  <div className="h-9 w-9 rounded-xl bg-bg-4 flex items-center justify-center">
                    <Icon className="h-4.5 w-4.5 text-fg" />
                  </div>
                </div>
                <h3 className="text-sm font-bold text-fg mb-1.5">{title}</h3>
                <p className="text-xs text-fg-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────── */}
      <section id="features" className="py-20 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-lg mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-fg-dim mb-3">Features</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-fg">
              Everything a serious<br />trader needs.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                icon: LineChart,
                title: 'Equity Curve',
                desc: 'Cumulative R and daily R charts. Visualise your account growth over any time range.',
              },
              {
                icon: Calendar,
                title: 'Monthly Heatmap',
                desc: 'Color-coded calendar grid. Spot losing weeks and winning streaks at a glance.',
              },
              {
                icon: BarChart3,
                title: 'Deep Statistics',
                desc: 'Win rate, expectancy, profit factor, max drawdown, streaks, and more — per setup or date range.',
              },
              {
                icon: AlertTriangle,
                title: 'Mistakes Tracker',
                desc: 'Categorise and rank your execution errors by R-cost. Know exactly what to stop doing.',
              },
              {
                icon: BookOpen,
                title: 'Multi-Timeframe Logging',
                desc: 'ICT-ready template: Daily Candle, H4 Profile, CISD entry, alignment, quarter open, drivers.',
              },
              {
                icon: TrendingUp,
                title: 'Screenshot Vault',
                desc: 'Attach HTF, ITF, and LTF chart screenshots directly to each trade record.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-bg-2 p-6 rounded-2xl border border-line">
                <div className="h-8 w-8 rounded-lg bg-bg-4 flex items-center justify-center mb-4">
                  <Icon className="h-4 w-4 text-fg" />
                </div>
                <h3 className="text-sm font-bold text-fg mb-1">{title}</h3>
                <p className="text-xs text-fg-muted leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ─────────────────────────────────────── */}
      <section id="pricing" className="border-t border-line bg-bg-1 py-20 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-lg mx-auto mb-12">
            <p className="text-xs font-semibold uppercase tracking-widest text-fg-dim mb-3">Pricing</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-fg">
              Simple pricing.<br />No surprises.
            </h2>
          </div>

          <div className="max-w-sm mx-auto">
            <div className="rounded-2xl bg-bg-2 border-2 border-fg p-8 text-center shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-widest text-fg-dim mb-2">Free</p>
              <p className="text-5xl font-extrabold text-fg mb-1">$0</p>
              <p className="text-xs text-fg-dim mb-7">Forever. No credit card needed.</p>
              <ul className="text-sm text-left space-y-3 mb-8">
                {[
                  'Unlimited trade entries',
                  'Full analytics & statistics',
                  'Monthly performance heatmap',
                  'Mistakes & filters tracker',
                  'HTF / ITF / LTF screenshot uploads',
                  'ICT strategy template',
                  'Local-first (no cloud required)',
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check className="h-4 w-4 text-win mt-0.5 shrink-0" />
                    <span className="text-fg">{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/login"
                className="block w-full h-11 rounded-xl bg-fg text-fg-inverse text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                Get started free <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────── */}
      <section className="py-20 px-5 sm:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-fg mb-4">
            Start journaling your trades today.
          </h2>
          <p className="text-sm text-fg-muted mb-8 leading-relaxed">
            Join disciplined traders who use PrecisionJournal to track every session, identify patterns, and build consistency.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-2 h-11 px-8 rounded-xl bg-fg text-fg-inverse text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              Create free account <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center h-11 px-8 rounded-xl border border-line-strong text-sm font-semibold text-fg hover:border-fg-dim hover:bg-bg-3 transition-colors"
            >
              Explore demo
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer className="border-t border-line py-8 px-5 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-fg-dim">
          <div className="flex items-center gap-2">
            <img
              src="/logo.png"
              alt="PrecisionJournal"
              className="flex h-5 w-5 items-center justify-center rounded-md bg-bg-2 border border-line object-contain"
            />
            <span className="font-semibold text-fg-muted">PrecisionJournal</span>
          </div>
          <p className="text-xs text-fg-dim">
            © {new Date().getFullYear()} PrecisionJournal. Journal your trades.
          </p>
          <div className="flex items-center gap-5">
            <Link to="/login" className="hover:text-fg transition-colors">Sign in</Link>
            <Link to="/login" className="hover:text-fg transition-colors">Get started</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}