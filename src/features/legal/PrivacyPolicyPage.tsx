import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Eye, Server, RefreshCw, Mail } from 'lucide-react';
import { BrandLogo } from '@/components/layout/Brand';

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#090a0c] text-[#f1f3f5] selection:bg-sky-500/20 selection:text-sky-300">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#090a0c]/80 border-b border-[#1f242c]">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-[#8c94a0] hover:text-[#f1f3f5] transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-sky-400" />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <BrandLogo size="sm" />
            <span className="font-semibold text-sm tracking-tight text-white">ThePrecisionLab</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-14 sm:py-20">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-sky-400 bg-sky-500/10 border border-sky-500/20 mb-4">
            <Shield className="w-3.5 h-3.5" />
            Legal & Security
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-[#8c94a0] text-sm sm:text-base">
            Last updated: October 2026. Effective immediately.
          </p>
        </div>

        <div className="space-y-10 text-sm sm:text-base text-[#a6b0be] leading-relaxed">
          {/* Section 1 */}
          <section className="bg-[#121417] p-6 sm:p-8 rounded-2xl border border-[#1f242c]">
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <Eye className="w-5 h-5 text-sky-400" />
              1. Information We Collect
            </h2>
            <p className="mb-3">
              We collect information you provide directly to us when using ThePrecisionLab:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-[#8c94a0] pl-2">
              <li><strong className="text-[#f1f3f5]">Account Information:</strong> Your email address and authenticated user credentials.</li>
              <li><strong className="text-[#f1f3f5]">Trading Journal Data:</strong> Trade entries, symbols, position sizes, entry/exit prices, strategies, psychological notes, rules, and trade screenshots.</li>
              <li><strong className="text-[#f1f3f5]">Billing Details:</strong> Subscription tier and transaction references processed securely via Razorpay or Dodo Payments. We do not store raw card numbers or CVVs.</li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="bg-[#121417] p-6 sm:p-8 rounded-2xl border border-[#1f242c]">
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <Lock className="w-5 h-5 text-sky-400" />
              2. How We Protect Your Journal Data
            </h2>
            <p className="mb-3">
              Your trading records, edge strategies, and personal performance statistics are strictly private to your account.
            </p>
            <p className="text-[#8c94a0]">
              All database communications are enforced via industry-standard TLS encryption, and stored using strict Row-Level Security (RLS) policies within Supabase. Only your authenticated user account possesses authorization keys to view, edit, or delete your journals and trade logs.
            </p>
          </section>

          {/* Section 3 */}
          <section className="bg-[#121417] p-6 sm:p-8 rounded-2xl border border-[#1f242c]">
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <Server className="w-5 h-5 text-sky-400" />
              3. Third-Party Services
            </h2>
            <p className="mb-3">
              To operate ThePrecisionLab effectively, we integrate with trusted third-party providers:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-[#8c94a0] pl-2">
              <li><strong className="text-[#f1f3f5]">Supabase:</strong> For secure database storage, user authentication, and encrypted backups.</li>
              <li><strong className="text-[#f1f3f5]">Payment Gateways (Razorpay & Dodo Payments):</strong> For handling checkout and recurring subscriptions securely complying with PCI-DSS standards.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="bg-[#121417] p-6 sm:p-8 rounded-2xl border border-[#1f242c]">
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-sky-400" />
              4. Data Retention & Deletion
            </h2>
            <p className="text-[#8c94a0]">
              You maintain full ownership of your trading data. You can export or request full deletion of your account and all associated trades at any time by contacting our direct support channel.
            </p>
          </section>

          {/* Section 5 */}
          <section className="bg-[#121417] p-6 sm:p-8 rounded-2xl border border-sky-500/20 bg-gradient-to-b from-[#121417] to-sky-950/10">
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <Mail className="w-5 h-5 text-sky-400" />
              5. Mail Support & Inquiries
            </h2>
            <p className="mb-4 text-[#8c94a0]">
              We offer direct, priority mail support for all privacy, data security, and account queries.
            </p>
            <a
              href="mailto:Dhruvcrypto87@gmail.com"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-300 font-medium hover:bg-sky-500/20 hover:text-white transition-all text-sm"
            >
              <Mail className="w-4 h-4 text-sky-400" />
              Dhruvcrypto87@gmail.com
            </a>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1f242c] py-8 text-center text-xs text-[#8c94a0]">
        <div className="max-w-5xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© 2026 ThePrecisionLab. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            <a href="mailto:Dhruvcrypto87@gmail.com" className="hover:text-white transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
