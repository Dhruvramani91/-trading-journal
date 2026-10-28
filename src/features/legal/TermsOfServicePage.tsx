import { Link } from 'react-router-dom';
import { ArrowLeft, FileText, AlertTriangle, CreditCard, ShieldCheck, HelpCircle, Mail } from 'lucide-react';
import { BrandLogo } from '@/components/layout/Brand';

export function TermsOfServicePage() {
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
            <FileText className="w-3.5 h-3.5" />
            Legal Agreement
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4">
            Terms of Service
          </h1>
          <p className="text-[#8c94a0] text-sm sm:text-base">
            Last updated: October 2026. Please read carefully before using the platform.
          </p>
        </div>

        <div className="space-y-10 text-sm sm:text-base text-[#a6b0be] leading-relaxed">
          {/* Section 1 */}
          <section className="bg-[#121417] p-6 sm:p-8 rounded-2xl border border-[#1f242c]">
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-sky-400" />
              1. Acceptance of Terms
            </h2>
            <p className="text-[#8c94a0]">
              By accessing or creating an account on <strong className="text-white">ThePrecisionLab</strong>, you agree to be bound by these Terms of Service. If you do not agree to all terms, please refrain from using the platform.
            </p>
          </section>

          {/* Section 2 */}
          <section className="bg-[#121417] p-6 sm:p-8 rounded-2xl border border-amber-500/20 bg-gradient-to-b from-[#121417] to-amber-950/10">
            <h2 className="text-xl font-semibold text-amber-200 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              2. Trading & Financial Risk Disclaimer (Not Financial Advice)
            </h2>
            <p className="mb-3 text-[#f1f3f5] font-medium">
              ThePrecisionLab is an analytical journaling tool and trade execution log. It does NOT provide financial, trading, or investment advice.
            </p>
            <p className="text-[#8c94a0]">
              Trading financial markets (equities, futures, forex, crypto, options) carries high risk and may result in the loss of your capital. Past performance logged inside your journal is not indicative of future market results. You are solely responsible for all trading decisions and risk management.
            </p>
          </section>

          {/* Section 3 */}
          <section className="bg-[#121417] p-6 sm:p-8 rounded-2xl border border-[#1f242c]">
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-sky-400" />
              3. Subscriptions, Free Trials & Billing
            </h2>
            <p className="mb-3">
              ThePrecisionLab provides Monthly and Quarterly subscription plans:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-[#8c94a0] pl-2">
              <li><strong className="text-[#f1f3f5]">Free Trial:</strong> New accounts may be eligible for a 7-day free trial period. You may cancel at any point before the trial concludes to avoid recurring billing.</li>
              <li><strong className="text-[#f1f3f5]">Automatic Renewal:</strong> Paid memberships renew automatically each billing cycle (monthly or quarterly) unless cancelled prior to the renewal date.</li>
              <li><strong className="text-[#f1f3f5]">Cancellations & Refunds:</strong> You can manage and cancel your active subscription anytime through the billing settings. Refunds are handled in accordance with our standard service guidelines upon contacting mail support.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="bg-[#121417] p-6 sm:p-8 rounded-2xl border border-[#1f242c]">
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-sky-400" />
              4. User Accounts & Security
            </h2>
            <p className="text-[#8c94a0]">
              You are responsible for keeping your login credentials confidential. You agree not to attempt unauthorized access to other user data, reverse engineer platform components, or interfere with service availability.
            </p>
          </section>

          {/* Section 5 */}
          <section className="bg-[#121417] p-6 sm:p-8 rounded-2xl border border-sky-500/20 bg-gradient-to-b from-[#121417] to-sky-950/10">
            <h2 className="text-xl font-semibold text-white mb-3 flex items-center gap-2">
              <Mail className="w-5 h-5 text-sky-400" />
              5. Mail Support Only
            </h2>
            <p className="mb-4 text-[#8c94a0]">
              All official customer support, account cancellations, and billing questions are handled exclusively via direct mail support:
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
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <a href="mailto:Dhruvcrypto87@gmail.com" className="hover:text-white transition-colors">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
