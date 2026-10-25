import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { BrandLogo, BRAND_NAME } from '@/components/layout/Brand';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';

const NAV_LINKS = [
  { label: 'About', href: '#about' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
  { label: 'Contact', href: '#contact' },
] as const;

export function LandingNavbar({ isAuthenticated }: { isAuthenticated: boolean }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() => window.innerWidth);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setCollapsed((wasCollapsed) => {
        if (!wasCollapsed && y >= 40) return true;
        if (wasCollapsed && y <= 8) return false;
        return wasCollapsed;
      });
    };
    const onResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  const isDesktop = viewportWidth >= 1024;
  const width = isDesktop
    ? collapsed
      ? Math.min(Math.max(viewportWidth * 0.6, 640), 1160)
      : Math.min(viewportWidth, 1500)
    : Math.max(280, viewportWidth - (viewportWidth <= 380 ? 16 : 32));
  const transition = prefersReducedMotion
    ? { duration: 0.12, ease: 'linear' as const }
    : {
        default: {
          duration: collapsed ? 0.45 : 0.55,
          ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
        },
        backgroundColor: { duration: 0.32, delay: collapsed ? 0.08 : 0 },
        boxShadow: { duration: 0.32, delay: collapsed ? 0.08 : 0 },
      };

  function closeMenu() {
    setMobileMenuOpen(false);
  }

  function closeMenuOnNavigate() {
    closeMenu();
  }

  const glassBackground = 'rgb(var(--bg-1) / 0.96)';
  const borderColor = 'rgb(var(--line) / 0.85)';

  return (
    <>
      <div className="landing-nav-fixed-wrap">
        <motion.header
          layout
          id="home"
          aria-label="Site header"
          className="landing-nav"
          animate={{
            width,
            height: collapsed ? 62 : 72,
            marginTop: collapsed ? (isDesktop ? 16 : 10) : 0,
            borderRadius: collapsed ? 9999 : 0,
            paddingLeft: collapsed && isDesktop ? 20 : viewportWidth <= 380 ? 6 : viewportWidth <= 640 ? 16 : 24,
            paddingRight: collapsed && isDesktop ? 8 : viewportWidth <= 380 ? 6 : viewportWidth <= 640 ? 16 : 24,
            backgroundColor: collapsed ? glassBackground : 'rgba(0, 0, 0, 0)',
            borderColor: collapsed ? borderColor : 'rgba(0, 0, 0, 0)',
            boxShadow: 'none',
            backdropFilter: collapsed ? 'blur(12px)' : 'blur(0px)',
          }}
          transition={transition}
        >
          <div className="landing-nav-content">
          <a href="#home" className="landing-nav-brand" aria-label={`${BRAND_NAME} home`} onClick={closeMenu}>
            <BrandLogo size="sm" className="landing-nav-logo" />
            <span>{BRAND_NAME}</span>
          </a>

          <motion.nav
            aria-label="Primary"
            className="landing-nav-links hidden lg:flex"
            animate={{
              columnGap: collapsed
                ? viewportWidth < 1200
                  ? 14
                  : viewportWidth < 1280
                    ? 20
                    : 24
                : 32,
            }}
            transition={transition}
          >
            {NAV_LINKS.map((link) => (
              <a key={link.href} href={link.href} className="landing-nav-link" onClick={closeMenuOnNavigate}>
                {link.label}
              </a>
            ))}
          </motion.nav>

          <div className="landing-nav-actions">
            <AnimatedThemeToggler className="landing-nav-icon hidden sm:grid h-9 w-9 border-0 bg-transparent shadow-none hover:bg-bg-3" />
            <Link
              className="landing-nav-join"
              to={isAuthenticated ? '/dashboard' : '/login?mode=signup'}
              onClick={closeMenu}
            >
              {isAuthenticated ? 'Open Journal' : 'Join'}
            </Link>
            <button
              type="button"
              className="landing-nav-icon landing-nav-menu-button lg:hidden"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="landing-mobile-menu"
            >
              {mobileMenuOpen ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
            </button>
          </div>
          </div>

          <AnimatePresence initial={false}>
          {mobileMenuOpen && !isDesktop ? (
            <motion.nav
              id="landing-mobile-menu"
              aria-label="Mobile primary"
              className="landing-mobile-menu lg:hidden"
              initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.99 }}
              transition={{ duration: prefersReducedMotion ? 0.1 : 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              {NAV_LINKS.map((link) => (
                <a key={link.href} href={link.href} className="landing-mobile-link" onClick={closeMenuOnNavigate}>
                  {link.label}
                </a>
              ))}
              <AnimatedThemeToggler showLabel className="landing-mobile-theme h-auto w-full justify-start rounded-none border-0 bg-transparent px-3 py-2 text-left text-sm shadow-none hover:bg-bg-3" />
            </motion.nav>
          ) : null}
          </AnimatePresence>
        </motion.header>
      </div>
      <div className="landing-nav-spacer" aria-hidden="true" />
    </>
  );
}
