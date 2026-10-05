import { Link } from 'react-router-dom';
import { Fragment, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionStyle, type MotionValue } from 'framer-motion';
import { useAuthStore } from '@/store/authStore';
import { ContainerScroll } from '@/components/ui/container-scroll-animation';
import { TextScrollAnimation } from '@/components/ui/text-scroll-animation';
import { WordPullUp } from '@/components/ui/word-pull-up';
import { TextRevealByWord } from '@/components/ui/text-reveal';
import { BrandLogo } from '@/components/layout/Brand';
import { LandingNavbar } from './LandingNavbar';

const MotionRouterLink = motion.create(Link);

/**
 * ThePrecisionLab marketing landing page.
 *
 * This page is intentionally self-contained: its light/dark theme system
 * (the `data-theme` attribute + CSS custom properties below), its fonts,
 * and its interactive "live demo" dashboard (seeded sample trades, add-trade
 * dialog, equity curve chart, setup/day pattern bars) are all ported as-is
 * from the standalone HTML mockup, so the visual design and behaviour match
 * exactly. The dynamic dashboard content (#pane, #bars, #chart) is rendered
 * imperatively into its container divs by the ported script, the same way
 * it worked in the original HTML file.
 *
 * Recommended additions to your root index.html (not included here, since
 * they're app-wide, not per-page):
 *   <link rel="preconnect" href="https://fonts.googleapis.com">
 *   <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="">
 *   <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap" rel="stylesheet">
 *   <meta name="color-scheme" content="light dark">
 * and, to avoid a flash of the wrong theme on first paint, the small inline
 * script that reads localStorage("theme") and sets documentElement's
 * data-theme attribute before React hydrates (it's ported into this
 * component's effect below too, so theming still works either way — adding
 * it to index.html just removes the first-paint flash).
 */
function ScrollFeatureCard({
  children,
  className,
  direction,
}: {
  children: ReactNode;
  className: string;
  direction: 'up' | 'left' | 'right';
}) {
  const cardRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ['start 88%', 'start 45%'],
  });
  const x = useTransform(scrollYProgress, [0, 0.72], [direction === 'left' ? -100 : direction === 'right' ? 100 : 0, 0]);
  const y = useTransform(scrollYProgress, [0, 0.72], [direction === 'up' ? 72 : 0, 0]);
  const rotateY = useTransform(scrollYProgress, [0, 0.72], [direction === 'left' ? -5 : direction === 'right' ? 5 : 0, 0]);
  const rotateX = useTransform(scrollYProgress, [0, 0.72], [direction === 'up' ? 4 : 0, 0]);
  const opacity = useTransform(scrollYProgress, [0, 0.42], [0.18, 1]);

  return (
    <motion.article
      ref={cardRef}
      className={className}
      style={{
        x: prefersReducedMotion ? 0 : x,
        y: prefersReducedMotion ? 0 : y,
        rotateX: prefersReducedMotion ? 0 : rotateX,
        rotateY: prefersReducedMotion ? 0 : rotateY,
        opacity: prefersReducedMotion ? 1 : opacity,
        transformOrigin: 'center center',
      }}
    >
      {children}
    </motion.article>
  );
}

const landingFaqs = [
  {
    question: 'What does the discipline score measure?',
    answer: <>It shows how closely you followed the GXT or Lathyrus model on each trade. It rewards process, so a losing trade you handled well still counts.</>,
  },
  {
    question: 'Do I need to know the models already?',
    answer: <>No. If you're still learning the GXT or Lathyrus style, ThePrecisionLab helps you track your learning and your trades as you go.</>,
  },
  {
    question: 'How much does ThePrecisionLab cost?',
    answer: <>ThePrecisionLab is <strong>free to use while it's in testing</strong>. Pricing will be announced soon.</>,
  },
  {
    question: 'Can I journal trades from different markets?',
    answer: <>Yes. Log futures or forex with the same routine, and compare results by setup or day of the week.</>,
  },
  {
    question: 'Can I edit or delete a trade after logging it?',
    answer: <>Yes. Update a trade when you need to correct its details, or delete it if it was logged by mistake. Your journal stays under your control.</>,
  },
];

const contactCardVariants = {
  hidden: { opacity: 0, y: 34, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.7,
      ease: [0.22, 1, 0.36, 1] as const,
      staggerChildren: 0.12,
    },
  },
};

const contactItemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

function CometPricingCard({
  children,
  className,
  style,
  scrollRotateY,
  reducedMotion,
}: {
  children: ReactNode;
  className: string;
  style: MotionStyle;
  scrollRotateY: MotionValue<number>;
  reducedMotion: boolean;
}) {
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 160, damping: 22, mass: 0.35 });
  const smoothY = useSpring(pointerY, { stiffness: 160, damping: 22, mass: 0.35 });
  const hoverRotateX = useTransform(smoothY, [-0.5, 0.5], [5, -5]);
  const hoverRotateY = useTransform(smoothX, [-0.5, 0.5], [-5, 5]);
  const combinedRotateY = useTransform(
    [scrollRotateY, hoverRotateY],
    ([scroll, hover]) => Number(scroll) + Number(hover),
  );
  const glowX = useTransform(smoothX, [-0.5, 0.5], [0, 100]);
  const glowY = useTransform(smoothY, [-0.5, 0.5], [0, 100]);
  const glow = useMotionTemplate`radial-gradient(280px circle at ${glowX}% ${glowY}%, rgba(165, 102, 255, 0.18), transparent 72%)`;

  return (
    <motion.article
      className={className}
      style={{
        ...style,
        rotateX: reducedMotion ? 0 : hoverRotateX,
        rotateY: reducedMotion ? scrollRotateY : combinedRotateY,
        transformPerspective: 1000,
        transformStyle: 'preserve-3d',
      }}
      onPointerMove={(event) => {
        if (reducedMotion || event.pointerType !== 'mouse') return;
        const bounds = event.currentTarget.getBoundingClientRect();
        pointerX.set((event.clientX - bounds.left) / bounds.width - 0.5);
        pointerY.set((event.clientY - bounds.top) / bounds.height - 0.5);
      }}
      onPointerLeave={() => {
        pointerX.set(0);
        pointerY.set(0);
      }}
    >
      <motion.div className="pricing-comet-glow" aria-hidden="true" style={{ background: glow }} />
      {children}
    </motion.article>
  );
}

function MagneticFooterLink({
  to,
  reducedMotion,
  children,
}: {
  to: string;
  reducedMotion: boolean;
  children: ReactNode;
}) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 220, damping: 16 });
  const y = useSpring(rawY, { stiffness: 220, damping: 16 });
  const rotateX = useSpring(rawRotateX, { stiffness: 220, damping: 16 });
  const rotateY = useSpring(rawRotateY, { stiffness: 220, damping: 16 });
  return (
    <MotionRouterLink
      to={to}
      className="site-footer-cta"
      onPointerMove={(event) => {
        if (reducedMotion || event.pointerType !== 'mouse') return;
        const rect = event.currentTarget.getBoundingClientRect();
        const dx = event.clientX - rect.left - rect.width / 2;
        const dy = event.clientY - rect.top - rect.height / 2;
        rawX.set(dx * 0.16);
        rawY.set(dy * 0.16);
        rawRotateX.set(-dy * 0.12);
        rawRotateY.set(dx * 0.12);
      }}
      onPointerLeave={() => {
        rawX.set(0);
        rawY.set(0);
        rawRotateX.set(0);
        rawRotateY.set(0);
      }}
      whileHover={reducedMotion ? undefined : { scale: 1.045 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      style={{ x, y, rotateX, rotateY, transformPerspective: 700, transformStyle: 'preserve-3d' }}
    >
      {children}
    </MotionRouterLink>
  );
}

function MagneticFooterAnchor({
  href,
  className,
  reducedMotion,
  children,
}: {
  href: string;
  className: string;
  reducedMotion: boolean;
  children: ReactNode;
}) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rawRotateX = useMotionValue(0);
  const rawRotateY = useMotionValue(0);
  const x = useSpring(rawX, { stiffness: 220, damping: 16 });
  const y = useSpring(rawY, { stiffness: 220, damping: 16 });
  const rotateX = useSpring(rawRotateX, { stiffness: 220, damping: 16 });
  const rotateY = useSpring(rawRotateY, { stiffness: 220, damping: 16 });
  const moveWithPointer = (event: ReactPointerEvent<HTMLElement>) => {
    if (reducedMotion || event.pointerType !== 'mouse') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - rect.left - rect.width / 2;
    const dy = event.clientY - rect.top - rect.height / 2;
    rawX.set(dx * 0.16);
    rawY.set(dy * 0.16);
    rawRotateX.set(-dy * 0.12);
    rawRotateY.set(dx * 0.12);
  };
  const reset = () => {
    rawX.set(0);
    rawY.set(0);
    rawRotateX.set(0);
    rawRotateY.set(0);
  };

  return (
    <motion.a
      href={href}
      className={className}
      onPointerMove={moveWithPointer}
      onPointerLeave={reset}
      whileHover={reducedMotion ? undefined : { scale: 1.045 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      style={{ x, y, rotateX, rotateY, transformPerspective: 700, transformStyle: 'preserve-3d' }}
    >
      {children}
    </motion.a>
  );
}

export function LandingPage() {
  const [activeFaq, setActiveFaq] = useState(0);
  const faqPointerX = useMotionValue(0);
  const faqPointerY = useMotionValue(0);
  const faqSmoothX = useSpring(faqPointerX, { stiffness: 160, damping: 22, mass: 0.35 });
  const faqSmoothY = useSpring(faqPointerY, { stiffness: 160, damping: 22, mass: 0.35 });
  const faqRotateX = useTransform(faqSmoothY, [-0.5, 0.5], [5, -5]);
  const faqRotateY = useTransform(faqSmoothX, [-0.5, 0.5], [-5, 5]);
  const faqGlowX = useTransform(faqSmoothX, [-0.5, 0.5], [0, 100]);
  const faqGlowY = useTransform(faqSmoothY, [-0.5, 0.5], [0, 100]);
  const faqGlow = useMotionTemplate`radial-gradient(320px circle at ${faqGlowX}% ${faqGlowY}%, rgba(165, 102, 255, 0.16), transparent 72%)`;
  const { user } = useAuthStore();
  const prefersReducedMotion = useReducedMotion();
  const initialized = useRef(false);
  const stepsRef = useRef<HTMLDivElement>(null);
  const plansRef = useRef<HTMLDivElement>(null);
  const modelImagesRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const { scrollYProgress: stepsScrollProgress } = useScroll({
    target: stepsRef,
    offset: ['start 78%', 'end 55%'],
  });
  const stepsLineProgress = useTransform(stepsScrollProgress, [0, 0.78], [0, 1]);
  const { scrollYProgress: plansScrollProgress } = useScroll({
    target: plansRef,
    offset: ['start 85%', 'start 45%'],
  });
  const firstPlanX = useTransform(plansScrollProgress, [0, 0.72], [-110, 0]);
  const secondPlanX = useTransform(plansScrollProgress, [0, 0.72], [110, 0]);
  const firstPlanRotate = useTransform(plansScrollProgress, [0, 0.72], [-5, 0]);
  const secondPlanRotate = useTransform(plansScrollProgress, [0, 0.72], [5, 0]);
  const plansOpacity = useTransform(plansScrollProgress, [0, 0.45], [0.25, 1]);
  const { scrollYProgress: modelImagesProgress } = useScroll({
    target: modelImagesRef,
    offset: ['start 85%', 'start 45%'],
  });
  const modelLeftX = useTransform(modelImagesProgress, [0, 0.72], [-120, 0]);
  const modelRightX = useTransform(modelImagesProgress, [0, 0.72], [120, 0]);
  const modelLeftRotate = useTransform(modelImagesProgress, [0, 0.72], [-8, 0]);
  const modelRightRotate = useTransform(modelImagesProgress, [0, 0.72], [8, 0]);
  const modelScale = useTransform(modelImagesProgress, [0, 0.72], [0.82, 1]);
  const modelOpacity = useTransform(modelImagesProgress, [0, 0.4], [0.15, 1]);
  const { scrollYProgress: footerScrollProgress } = useScroll({
    target: footerRef,
    offset: ['start 80%', 'end 100%'],
  });
  const footerGiantY = useTransform(footerScrollProgress, [0, 1], ['10vh', '0vh']);
  const footerGiantScale = useTransform(footerScrollProgress, [0, 1], [0.8, 1]);
  const footerGiantOpacity = useTransform(footerScrollProgress, [0, 0.8], [0, 1]);
  const footerHeadingY = useTransform(footerScrollProgress, [0.12, 0.68], [50, 0]);
  const footerHeadingOpacity = useTransform(footerScrollProgress, [0.12, 0.48], [0, 1]);
  const footerLinksY = useTransform(footerScrollProgress, [0.28, 0.82], [50, 0]);
  const footerLinksOpacity = useTransform(footerScrollProgress, [0.28, 0.62], [0, 1]);
  const supportingCopyLines = [
    'A clean, simple trading journal that gamifies',
    'discipline and keeps you focused on what matters.',
  ];
  const heroTitleComponent = (
    <section className="hero pad">
      <h1 aria-label="Journal your trades">
        <span aria-hidden="true">
          {[
            { text: 'Journal', start: 0 },
            { text: 'your', start: 8 },
            { text: 'trades', start: 13, className: 'g' },
          ].map(({ text, start, className }, wordIndex) => (
            <Fragment key={text}>
              <span className={className}>
                {Array.from(text).map((letter, index) => (
                  <motion.span
                    key={`${text}-${index}`}
                    // Keep a readable fallback visible even if an entrance animation
                    // is interrupted (for example, during a fast reload or tab restore).
                    initial={prefersReducedMotion ? false : { opacity: 1, y: 8, filter: 'blur(3px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{
                      duration: prefersReducedMotion ? 0 : 0.28,
                      delay: prefersReducedMotion ? 0 : (start + index) * 0.025,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{ display: 'inline-block' }}
                  >
                    {letter}
                  </motion.span>
                ))}
              </span>
              {wordIndex < 2 ? ' ' : null}
            </Fragment>
          ))}
        </span>
      </h1>
      <p className="sub" aria-label={supportingCopyLines.join(' ')}>
        {supportingCopyLines.map((line, lineIndex) => (
          <span key={line} style={{ display: 'block' }}>
            {line.split(' ').map((word, wordIndex) => {
              const wordPosition = supportingCopyLines
                .slice(0, lineIndex)
                .join(' ')
                .split(' ').length + wordIndex;

              return (
                <motion.span
                  key={`${word}-${wordIndex}`}
                  aria-hidden="true"
                  initial={prefersReducedMotion ? false : { opacity: 0.12, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, filter: 'blur(0px)' }}
                  transition={{
                    duration: prefersReducedMotion ? 0 : 0.45,
                    delay: prefersReducedMotion ? 0 : wordPosition * 0.065,
                    ease: [0.22, 1, 0.36, 1],
                  }}
                >
                  {word}{wordIndex < line.split(' ').length - 1 ? ' ' : ''}
                </motion.span>
              );
            })}
          </span>
        ))}
      </p>
      <a className="btn" href="#pricing">Free while we test <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg></a>
    </section>
  );

  useEffect(() => {
    // Guard against React 18 StrictMode's dev-only double-invoke, since the
    // ported script below attaches DOM event listeners imperatively.
    if (initialized.current) return;
    initialized.current = true;

    // eslint-disable-next-line no-new-func
    const run = new Function(`
try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t);}catch(e){}

/* heatmap: 5 weeks, deterministic sample data */
(function(){
  var el=document.getElementById('heat'); if(!el) return;
  var lv=[3,4,2,4,3,0,0, 4,4,3,2,4,0,0, 1,3,4,4,3,0,0, 4,3,4,4,4,0,0, 3,4,4,2,0,0,0];
  var h='';
  for(var i=0;i<35;i++){
    var c = i>=32 ? 'fut' : (lv[i]?('l'+lv[i]):'');
    h+='<span class="'+c+'"></span>';
  }
  el.innerHTML=h;
})();

/* patterns chart */
(function(){
  var bars=document.getElementById('bars'); if(!bars) return;
  var data={
    setup:[['SMT Break',2],['Open DOL',1.5],['Strength Switch',-1]],
    day:[['Mon',2],['Tue',2],['Wed',-1],['Thu',1],['Fri',-1]]
  };
  function fmt(v){ return (v<0?'-':'+')+Math.abs(v)+'R'; }
  function draw(key){
    var rows=data[key], max=2.5, h='';
    rows.forEach(function(r){
      var w=Math.abs(r[1])/max*50, pos=r[1]>=0, left=pos?50:50-w;
      h+='<div class="bar"><span>'+r[0]+'</span><div class="trk"><div class="fill '+(pos?'pos':'neg')+'" style="left:'+left+'%;width:'+w+'%"></div></div><span class="v '+(pos?'pos':'neg')+'">'+fmt(r[1])+'</span></div>';
    });
    bars.innerHTML=h;
  }
  draw('setup');
  document.querySelectorAll('.c-e .seg button').forEach(function(b){
    b.addEventListener('click',function(){
      document.querySelectorAll('.c-e .seg button').forEach(function(x){ x.setAttribute('aria-pressed','false'); });
      b.setAttribute('aria-pressed','true'); draw(b.getAttribute('data-set'));
    });
  });
})();

/* interactive dashboard demo (sample data, lives in this page only) */
(function(){
  var root=document.getElementById('app'); if(!root) return;
  var pane=document.getElementById('pane');
  var dlg=document.getElementById('tradeDlg'), form=document.getElementById('tradeForm');

  /* reuse the header logo (light + dark variants) in the sidebar */
  (function(){
    var src=document.querySelector('header .logo'), dst=document.getElementById('appLogo');
    if(!src||!dst) return;
    src.querySelectorAll('img.lg').forEach(function(im){ dst.appendChild(im.cloneNode(true)); });
  })();

  var SEED=[
    {date:'2026-09-01',symbol:'NQ',setup:'SMT Break',dir:'Long',r:2,rr:2.5,dur:45},
    {date:'2026-09-02',symbol:'NQ',setup:'Open DOL',dir:'Short',r:-1,rr:2,dur:30},
    {date:'2026-09-04',symbol:'EURUSD',setup:'Strength Switch',dir:'Long',r:0,rr:2,dur:60},
    {date:'2026-09-08',symbol:'NQ',setup:'SMT Break',dir:'Long',r:3,rr:3,dur:70},
    {date:'2026-09-09',symbol:'ES',setup:'Open DOL',dir:'Long',r:2,rr:3,dur:55},
    {date:'2026-09-10',symbol:'NQ',setup:'SMT Break',dir:'Short',r:1.5,rr:2.5,dur:50},
    {date:'2026-09-15',symbol:'GBPUSD',setup:'Strength Switch',dir:'Short',r:-1,rr:2,dur:65},
    {date:'2026-09-16',symbol:'NQ',setup:'SMT Break',dir:'Long',r:2.5,rr:3,dur:65}
  ];
  var trades=[], nextId=1, mode='cum';

  function seed(){ trades=SEED.map(function(t,i){ var o={id:i+1}; for(var k in t) o[k]=t[k]; return o; }); nextId=trades.length+1; }
  function esc(s){ return String(s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function pd(s){ var p=s.split('-'); return new Date(+p[0],+p[1]-1,+p[2]); }
  function fShort(s){ return pd(s).toLocaleDateString('en-US',{month:'short',day:'numeric'}); }
  function fLong(s){ return pd(s).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'}); }
  function num(v){ var x=Math.round(v*100)/100; return (x>0?'+':'')+String(x)+'R'; }
  function r2(v){ return (v>0?'+':v<0?'-':'')+Math.abs(v).toFixed(2)+'R'; }
  function cls(v){ return v>0?'pos':(v<0?'neg':''); }
  function sorted(){ return trades.slice().sort(function(a,b){ return a.date<b.date?-1:(a.date>b.date?1:a.id-b.id); }); }
  function today(){ var d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }

  function calc(list){
    var n=list.length,total=0,wins=0,rr=0,dur=0;
    list.forEach(function(t){ total+=t.r; rr+=t.rr; dur+=t.dur; if(t.r>0) wins++; });
    return {n:n,total:total,winRate:n?wins/n*100:0,avgRR:n?rr/n:0,avgDur:n?dur/n:0};
  }
  function bySetup(list){
    var m={}; list.forEach(function(t){
      var o=m[t.setup]||(m[t.setup]={name:t.setup,total:0,n:0,wins:0});
      o.total+=t.r; o.n++; if(t.r>0) o.wins++;
    });
    return Object.keys(m).map(function(k){ return m[k]; });
  }

  function dashboardView(){
    var list=sorted(), s=calc(list);
    var sets=bySetup(list).sort(function(a,b){ return b.total-a.total; });
    var best=sets[0], worst=sets.length>1?sets[sets.length-1]:null;
    function setCard(label,o,icon){
      return '<div class="ap-card ap-set"><h3>'+icon+label+'</h3>'+(o?
        '<strong>'+esc(o.name)+'</strong><span class="'+cls(o.total)+'">'+r2(o.total)+'</span><small>'+o.n+' trade'+(o.n===1?'':'s')+' \u00b7 '+Math.round(o.wins/o.n*100)+'% win</small>'
        :'<strong>Not enough data</strong><small>Log more setups to compare</small>')+'</div>';
    }
    var up='<svg class="up" viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8M15 7h6v6"/></svg>';
    var down='<svg class="down" viewBox="0 0 24 24"><path d="M3 7l6 6 4-4 8 8M15 17h6v-6"/></svg>';
    return '<h2 class="ap-h">Welcome Back, <span class="ap-name">Trader</span></h2>'+
      '<p class="ap-sub">Here\u2019s your trading performance overview.</p>'+
      '<span class="ap-meta">'+s.n+' trade'+(s.n===1?'':'s')+(list.length?' \u00b7 '+fLong(list[list.length-1].date):'')+'</span>'+
      '<div class="ap-stats">'+
        '<div class="ap-card ap-stat"><span>Total R</span><b class="'+cls(s.total)+'">'+r2(s.total)+'</b></div>'+
        '<div class="ap-card ap-stat"><span>Win rate</span><b>'+s.winRate.toFixed(2)+'%</b></div>'+
        '<div class="ap-card ap-stat"><span>Avg R:R</span><b>'+s.avgRR.toFixed(2)+'</b></div>'+
        '<div class="ap-card ap-stat"><span>Avg duration</span><b>'+Math.round(s.avgDur)+'m</b></div>'+
      '</div>'+
      '<div class="ap-card"><div class="ap-ch"><h3>Equity curve</h3>'+
        '<div class="seg" role="group" aria-label="Chart type">'+
          '<button type="button" data-act="mode" data-mode="cum" aria-pressed="'+(mode==='cum')+'">Cumulative R</button>'+
          '<button type="button" data-act="mode" data-mode="daily" aria-pressed="'+(mode==='daily')+'">Daily R</button>'+
        '</div></div>'+
        '<div id="chart" class="ap-chart" tabindex="0" role="img" aria-label="Equity curve. Use the left and right arrow keys to inspect each trade."></div></div>'+
      '<div class="ap-two">'+setCard('Best setup',best,up)+setCard('Worst setup',worst,down)+'</div>';
  }

  /* ---------- chart ---------- */
  function niceStep(x){ var c=[0.5,1,2,3,5,10,20,50,100,200,500]; for(var i=0;i<c.length;i++){ if(c[i]>=x) return c[i]; } return 1000; }
  function spline(p){
    var n=p.length; if(n<2) return '';
    var dx=[],m=[],t=[],i;
    for(i=0;i<n-1;i++){ dx[i]=p[i+1][0]-p[i][0]; m[i]=(p[i+1][1]-p[i][1])/dx[i]; }
    t[0]=m[0]; t[n-1]=m[n-2];
    for(i=1;i<n-1;i++){ t[i]=(m[i-1]*m[i]<=0)?0:(m[i-1]+m[i])/2; }
    for(i=0;i<n-1;i++){
      if(m[i]===0){ t[i]=0; t[i+1]=0; }
      else{ var a=t[i]/m[i], b=t[i+1]/m[i], s=a*a+b*b; if(s>9){ var k=3/Math.sqrt(s); t[i]=k*a*m[i]; t[i+1]=k*b*m[i]; } }
    }
    var d='M'+p[0][0].toFixed(1)+','+p[0][1].toFixed(1);
    for(i=0;i<n-1;i++){
      d+=' C'+(p[i][0]+dx[i]/3).toFixed(1)+','+(p[i][1]+t[i]*dx[i]/3).toFixed(1)+' '+(p[i+1][0]-dx[i]/3).toFixed(1)+','+(p[i+1][1]-t[i+1]*dx[i]/3).toFixed(1)+' '+p[i+1][0].toFixed(1)+','+p[i+1][1].toFixed(1);
    }
    return d;
  }
  function drawChart(){
    var host=document.getElementById('chart'); if(!host) return;
    var list=sorted(), n=list.length;
    if(!n){ host.innerHTML='<p class="ap-empty">No trades yet. Add one to start your curve.</p>'; return; }
    var W=Math.max(host.clientWidth,260), H=250, L=44, R=14, T=14, B=28, iw=W-L-R, ih=H-T-B;
    var vals=[], c=0;
    list.forEach(function(t){ c+=t.r; vals.push(mode==='cum'?c:t.r); });
    var lo=Math.min(0,Math.min.apply(null,vals)), hi=Math.max(0,Math.max.apply(null,vals)); if(hi===lo) hi=lo+1;
    var step=niceStep((hi-lo)/4); lo=Math.floor(lo/step+1e-9)*step; hi=Math.ceil(hi/step-1e-9)*step;
    function X(i){ return L+(i+0.5)*iw/n; }
    function Y(v){ return T+(hi-v)/(hi-lo)*ih; }
    var g='', k=Math.round((hi-lo)/step), i;
    for(i=0;i<=k;i++){ var v=lo+i*step, y=Y(v);
      g+='<line class="gl'+(Math.abs(v)<1e-9?' zero':'')+'" x1="'+L+'" x2="'+(W-R)+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)+'"/><text class="ax" x="'+(L-8)+'" y="'+(y+3.5).toFixed(1)+'" text-anchor="end">'+(Math.round(v*10)/10)+'R</text>';
    }
    var skip=Math.max(1,Math.ceil(n/Math.max(2,Math.floor(iw/58))));
    for(i=0;i<n;i++){ if(i%skip===0) g+='<text class="ax" x="'+X(i).toFixed(1)+'" y="'+(H-8)+'" text-anchor="middle">'+fShort(list[i].date)+'</text>'; }
    var series='';
    if(mode==='cum'){
      var pts=vals.map(function(v,i){ return [X(i),Y(v)]; });
      var linePath=n>1?spline(pts):'';
      if(n>1){
        var baseY=H-B;
        var areaPath=linePath+' L'+pts[n-1][0].toFixed(1)+','+baseY.toFixed(1)+' L'+pts[0][0].toFixed(1)+','+baseY.toFixed(1)+' Z';
        series+='<defs>'+
          '<linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1">'+
            '<stop offset="0%" stop-color="var(--purple)" stop-opacity=".20"/>'+
            '<stop offset="48%" stop-color="var(--purple)" stop-opacity=".08"/>'+
            '<stop offset="100%" stop-color="var(--purple)" stop-opacity="0"/>'+
          '</linearGradient>'+
          '<filter id="equityGlow" x="-20%" y="-20%" width="140%" height="160%">'+
            '<feGaussianBlur stdDeviation="6"/>'+
          '</filter>'+
          '<clipPath id="equityReveal" clipPathUnits="userSpaceOnUse">'+
            '<rect class="equity-reveal-rect" x="'+L+'" y="'+T+'" width="'+iw.toFixed(1)+'" height="'+ih.toFixed(1)+'" style="--chart-reveal-width:'+iw.toFixed(1)+'px"/>'+
          '</clipPath>'+
        '</defs>';
        series+='<path class="area-glow" d="'+areaPath+'" clip-path="url(#equityReveal)" filter="url(#equityGlow)"/>';
        series+='<path class="area" d="'+areaPath+'" clip-path="url(#equityReveal)"/>';
        series+='<path class="ln-glow" pathLength="1" d="'+linePath+'"/>';
        series+='<path class="ln" pathLength="1" d="'+linePath+'"/>';
      }
      pts.forEach(function(p){ series+='<circle class="dot" cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="4"/>'; });
    }else{
      var bw=Math.min(30,iw/n*0.6), y0=Y(0);
      vals.forEach(function(v,i){ var yy=Y(v), h=Math.max(2,Math.abs(yy-y0));
        series+='<rect class="bar '+(v>=0?'pos':'neg')+'" x="'+(X(i)-bw/2).toFixed(1)+'" y="'+(v>=0?y0-h:y0).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+h.toFixed(1)+'" rx="4"/>'; });
    }

    host.innerHTML='<svg width="'+W+'" height="'+H+'" aria-hidden="true">'+g+'<line class="guide" y1="'+T+'" y2="'+(H-B)+'" style="display:none"/>'+series+'</svg><div class="ap-tip" hidden></div>';
    var svg=host.firstChild, guide=svg.querySelector('.guide'), tip=host.querySelector('.ap-tip');
    var marks=svg.querySelectorAll(mode==='cum'?'.dot':'rect.bar'), cur=n-1;
    function show(j){
      cur=j; var x=X(j), t=list[j];
      guide.setAttribute('x1',x); guide.setAttribute('x2',x); guide.style.display='';
      marks.forEach(function(m,q){ m.classList.toggle('on',q===j); });
      tip.innerHTML='<b>'+fShort(t.date)+' \u00b7 '+(mode==='cum'?'Total '+num(vals[j]):num(t.r))+'</b><small>'+esc(t.symbol)+' \u00b7 '+esc(t.setup)+' \u00b7 '+num(t.r)+'</small>';
      tip.hidden=false;
      tip.style.left=Math.max(70,Math.min(W-70,x))+'px';
      tip.style.top=Math.max(48,Y(vals[j])-12)+'px';
    }
    function hide(){ guide.style.display='none'; tip.hidden=true; marks.forEach(function(m){ m.classList.remove('on'); }); }
    svg.addEventListener('pointermove',function(e){
      var r=svg.getBoundingClientRect(), j=Math.floor((e.clientX-r.left-L)/(iw/n));
      show(Math.max(0,Math.min(n-1,j)));
    });
    svg.addEventListener('pointerleave',hide);
    host.onkeydown=function(e){
      if(e.key==='ArrowRight'){ e.preventDefault(); show(Math.min(n-1,cur+1)); }
      else if(e.key==='ArrowLeft'){ e.preventDefault(); show(Math.max(0,cur-1)); }
      else if(e.key==='Escape'){ hide(); }
    };
    host.onblur=hide;
  }

  /* ---------- render + events ---------- */
  function render(focusSel){
    pane.innerHTML=dashboardView();
    drawChart();
    if(focusSel){ var f=pane.querySelector(focusSel); if(f) f.focus(); }
  }
  function openDialog(){
    form.reset(); form.elements.date.value=today();
    if(dlg.showModal) dlg.showModal(); else dlg.setAttribute('open','');
    form.elements.r.focus();
  }
  function closeDialog(){ if(dlg.close) dlg.close(); else dlg.removeAttribute('open'); }

  root.addEventListener('click',function(e){
    var el=e.target.closest('[data-act]'); if(!el||!root.contains(el)) return;
    var d=el.dataset;
    if(d.act==='mode'){ mode=d.mode; render('[data-mode="'+d.mode+'"]'); }
    else if(d.act==='new'){ openDialog(); }
    else if(d.act==='cancel'){ closeDialog(); }
    else if(d.act==='reset'){ seed(); mode='cum'; render(); }
  });
  dlg.addEventListener('click',function(e){ if(e.target===dlg) closeDialog(); });
  form.addEventListener('submit',function(e){
    e.preventDefault();
    var f=new FormData(form), r=parseFloat(f.get('r')); if(isNaN(r)) return;
    trades.push({id:nextId++,date:f.get('date'),symbol:(String(f.get('symbol')||'').trim().toUpperCase().slice(0,12))||'NQ',
      setup:f.get('setup'),dir:f.get('dir'),r:r,rr:parseFloat(f.get('rr'))||0,dur:parseInt(f.get('dur'),10)||0});
    closeDialog(); render();
  });
  if(window.ResizeObserver){
    var last=0; new ResizeObserver(function(){ var w=pane.clientWidth; if(w!==last){ last=w; drawChart(); } }).observe(pane);
  }
  seed(); render();
})();


/* experimental cursor spotlight */
(function(){
  var targets=document.querySelectorAll('.cell,.plan,.contact-inner,.ap-card,.tile,.window,.shot');
  targets.forEach(function(el){
    el.addEventListener('pointermove',function(e){
      var r=el.getBoundingClientRect();
      el.style.setProperty('--mx',((e.clientX-r.left)/r.width*100)+'%');
      el.style.setProperty('--my',((e.clientY-r.top)/r.height*100)+'%');
    });
    el.addEventListener('pointerleave',function(){
      el.style.removeProperty('--mx');
      el.style.removeProperty('--my');
    });
  });
})();

/* existing-element spotlight: follows the pointer without adding markup */
(function(){
  var items=document.querySelectorAll('.cell,.tile,.ap-card,.plan,.contact-inner,.cta');
  items.forEach(function(el){
    el.classList.add('pj-spotlight');
    el.addEventListener('pointermove',function(e){
      var r=el.getBoundingClientRect();
      var x=((e.clientX-r.left)/r.width*100).toFixed(1)+'%';
      var y=((e.clientY-r.top)/r.height*100).toFixed(1)+'%';
      el.style.setProperty('--spot-x',x);
      el.style.setProperty('--spot-y',y);
    });
    el.addEventListener('pointerleave',function(){
      el.style.setProperty('--spot-x','50%');
      el.style.setProperty('--spot-y','50%');
    });
  });
})();

/* scroll reveal: observes only elements that already exist on the page */
(function(){
  var reveal=document.querySelectorAll('main > section.stage,main > section.model,main > section.sec,main > section.cta,footer');
  var stagger=document.querySelectorAll('.steps > .step,.plans > .plan,.faq details');

  reveal.forEach(function(el,i){
    el.classList.add('pj-scroll-reveal');
    el.style.setProperty('--reveal-delay',Math.min(i*45,180)+'ms');
  });

  stagger.forEach(function(el,i){
    el.classList.add('pj-stagger');
    el.style.setProperty('--reveal-delay',Math.min(i*55,220)+'ms');
  });

  if(!('IntersectionObserver' in window)){
    reveal.forEach(function(el){el.classList.add('pj-visible');});
    stagger.forEach(function(el){el.classList.add('pj-visible');});
    return;
  }

  var io=new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if(!entry.isIntersecting) return;
      entry.target.classList.add('pj-visible');
      io.unobserve(entry.target);
    });
  },{threshold:.12,rootMargin:'0px 0px -7% 0px'});

  reveal.forEach(function(el){io.observe(el);});
  stagger.forEach(function(el){io.observe(el);});
})();
    `);
    run();
  }, []);

  return (
    <>
      <style>{`

:root{
  --page:#e8edf4; --shell:#fcfdfe; --ink:#0d0d0f; --ink-inv:#ffffff;
  --text:#4a5468; --soft:#667085; --gray-word:#9b9ba1;
  --line:#e4e9f0; --panel:#f3f5f8; --card:#ffffff; --dot:#d3dae5;
  --purple:#8b3cf6; --purple-soft:#f0e6ff;
  --gain:#12a870; --loss:#e4504f;
  --shadow:0 30px 80px rgba(30,45,80,.10);
  --shot-shadow:0 0 0 1px rgba(20,30,60,.06),0 0 44px rgba(30,45,90,.16),0 34px 90px rgba(30,45,90,.26);
  box-sizing:border-box;
  padding-top:env(safe-area-inset-top,0px);
  padding-bottom:env(safe-area-inset-bottom,0px);
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --page:#090a0d; --shell:#101216; --ink:#f4f6fa; --ink-inv:#0d0d0f;
    --text:#a9b2c3; --soft:#8b95a8; --gray-word:#8993a3;
    --line:#232833; --panel:#171a20; --card:#14171c; --dot:#262b35;
    --purple:#a566ff; --purple-soft:#2a1c45;
    --gain:#35d39b; --loss:#ff7b7b;
    --shadow:0 30px 80px rgba(0,0,0,.5);
    --shot-shadow:0 0 0 1px rgba(255,255,255,.08),0 0 70px rgba(139,60,246,.20),0 34px 90px rgba(0,0,0,.70);
  }
}
:root[data-theme="dark"]{
  --page:#090a0d; --shell:#101216; --ink:#f4f6fa; --ink-inv:#0d0d0f;
  --text:#a9b2c3; --soft:#8b95a8; --gray-word:#8993a3;
  --line:#232833; --panel:#171a20; --card:#14171c; --dot:#262b35;
  --purple:#a566ff; --purple-soft:#2a1c45;
  --gain:#35d39b; --loss:#ff7b7b;
  --shadow:0 30px 80px rgba(0,0,0,.5);
  --shot-shadow:0 0 0 1px rgba(255,255,255,.08),0 0 70px rgba(139,60,246,.20),0 34px 90px rgba(0,0,0,.70);
}
html{scroll-padding-top:calc(88px + env(safe-area-inset-top,0px))}
*,*::before,*::after{box-sizing:border-box}
body{
  margin:0; background:var(--page); color:var(--ink);
  font-family:"Geist",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  font-size:16px; line-height:1.55; -webkit-font-smoothing:antialiased;
}
a{color:inherit;text-decoration:none}
button{font:inherit;color:inherit;cursor:pointer}
:focus-visible{outline:2px solid var(--purple);outline-offset:3px;border-radius:8px}

.shell{
  width:100%; min-height:100vh; margin:0;
  background:var(--shell); border-radius:0;
  box-shadow:none; overflow:hidden;
}
.pad{padding-left:clamp(20px,6vw,120px);padding-right:clamp(20px,6vw,120px)}

/* nav */
.nav{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding-top:36px;padding-bottom:0}
.logo{display:flex;align-items:center;gap:12px;font-weight:500;font-size:15px;letter-spacing:-.01em}
.logo .d-lt{fill:var(--dot)} .logo .d-dk{fill:var(--ink)}
.logo .lg{height:30px;width:auto;display:block}
.logo .lg-dark{display:none}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]) .logo .lg-light{display:none}
  :root:not([data-theme="light"]) .logo .lg-dark{display:block}
}
:root[data-theme="dark"] .logo .lg-light{display:none}
:root[data-theme="dark"] .logo .lg-dark{display:block}
:root[data-theme="light"] .logo .lg-light{display:block}
:root[data-theme="light"] .logo .lg-dark{display:none}
.pill{display:flex;gap:4px;padding:5px;background:var(--panel);border-radius:999px}
.pill a{padding:9px 24px;border-radius:999px;font-size:14px;color:var(--soft);transition:background .2s,color .2s}
.pill a[aria-current="page"]{background:var(--card);color:var(--ink);box-shadow:0 1px 3px rgba(20,30,50,.08)}
.pill a:hover{color:var(--ink)}
.acct{justify-self:end;display:flex;gap:2px;padding:5px;background:var(--panel);border-radius:999px;align-items:center}
.theme{width:36px;height:36px;border-radius:50%;border:0;background:transparent;color:var(--soft);display:grid;place-items:center;transition:color .2s,background .2s}
.theme:hover{color:var(--ink);background:var(--card)}
.theme .i-sun{display:none}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]) .theme .i-moon{display:none}
  :root:not([data-theme="light"]) .theme .i-sun{display:block}
}
:root[data-theme="dark"] .theme .i-moon{display:none}
:root[data-theme="dark"] .theme .i-sun{display:block}
:root[data-theme="light"] .theme .i-moon{display:block}
:root[data-theme="light"] .theme .i-sun{display:none}
.acct a{padding:9px 20px;border-radius:999px;font-size:14px;color:var(--soft)}
.acct a.solid{background:var(--ink);color:var(--ink-inv)}

/* buttons */
.btn{display:inline-flex;align-items:center;gap:12px;padding:15px 30px;border-radius:999px;border:0;background:var(--ink);color:var(--ink-inv);font-size:15px;font-weight:500;box-shadow:0 12px 28px rgba(10,10,20,.18);transition:transform .2s}
.btn:hover{transform:translateY(-1px)}
.btn.ghost{background:transparent;color:var(--ink);box-shadow:inset 0 0 0 1px var(--line)}

/* hero */
.hero{display:flex;min-height:calc(78svh - 72px);flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:24px 24px 12px}
.hero h1{font-family:"DM Serif Display",Georgia,serif;font-size:6vw;font-weight:400;font-style:italic;letter-spacing:-.025em;line-height:1.08}
.eyebrow{font-size:11px;letter-spacing:.2em;color:var(--soft);font-weight:500;text-transform:uppercase;margin:0 0 22px}
h1{margin:0;font-weight:500;font-size:clamp(3rem,9vw,5.6rem);line-height:1;letter-spacing:-.055em}
h1 .g{color:var(--gray-word)}
.sub{max-width:54ch;margin:28px auto 34px;color:var(--text);font-size:clamp(1rem,1.6vw,1.12rem)}
.proof{margin:14px 0 0;font-size:12px;color:var(--soft)}

/* stage + window */
.stage{
  position:relative; padding:0 clamp(12px,5vw,80px) 56px;
  background-image:radial-gradient(var(--dot) 1.1px,transparent 1.2px);
  background-size:12px 12px;
}
.stage::before{content:"";position:absolute;inset:0;background:linear-gradient(var(--shell),transparent 22%,transparent 78%,var(--shell));pointer-events:none}
.preview-heading{max-width:1080px;margin:0 auto;text-align:center}
.preview-heading p{margin:0 0 12px;color:var(--soft);font-size:14px;font-weight:600;letter-spacing:.18em;text-transform:uppercase}
.preview-heading h2{font-family:"DM Serif Display",Georgia,serif;font-size:clamp(2.4rem,5vw,4.5rem);font-weight:400;font-style:italic;letter-spacing:-.025em;line-height:1.08;color:var(--ink)}
.shot{position:relative;width:100%;height:100%;max-width:1080px;margin:0 auto;overflow:hidden;border-radius:clamp(14px,2.2vw,22px);box-shadow:var(--shot-shadow)}
.shot>.app{height:100%;min-height:0}
:root[data-theme="dark"] .container-scroll-content{background-color:var(--shell)}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .container-scroll-content{background-color:var(--shell)}}
.shot img{display:block;width:100%;height:auto;border-radius:inherit}
.window{position:relative;max-width:1080px;margin:0 auto;background:var(--card);border:1px solid var(--line);border-radius:22px;overflow:hidden;box-shadow:var(--shadow)}
.w-head{display:flex;justify-content:space-between;align-items:center;padding:14px 22px;font-size:13px;border-bottom:1px solid var(--line)}
.w-head .l{display:flex;align-items:center;gap:10px;font-weight:500}
.w-head .r{display:flex;align-items:center;gap:8px;color:var(--soft);font-size:12px}
.live{width:7px;height:7px;border-radius:50%;background:var(--gain)}
.w-body{background:var(--panel);padding:clamp(12px,2.4vw,28px);display:grid;grid-template-columns:1.05fr 1fr;gap:16px}
.tile{background:var(--card);border-radius:16px;padding:20px;border:1px solid var(--line)}
.tile h3{margin:0 0 14px;font-size:14px;font-weight:600;letter-spacing:-.01em;display:flex;justify-content:space-between;align-items:center}
.tile h3 small{font-weight:400;color:var(--soft);font-size:12px}
.col{display:grid;gap:16px;align-content:start}

.fields{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.f{background:var(--panel);border-radius:10px;padding:9px 12px}
.f span{display:block;font-size:11px;color:var(--soft)}
.f b{font-size:14px;font-weight:500}
.f.pnl b{color:var(--gain)}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0 0}
.chip{font-size:12px;padding:5px 11px;border-radius:999px;background:var(--panel);color:var(--text)}
.chip.on{background:var(--purple-soft);color:var(--purple);font-weight:500}
.note{margin:14px 0;padding:12px;border-radius:10px;background:var(--panel);font-size:13px;color:var(--text)}
.ticks{list-style:none;margin:0 0 16px;padding:0;display:grid;gap:8px;font-size:13px}
.ticks li{display:flex;align-items:center;gap:10px}
.ticks i{flex:none;width:18px;height:18px;border-radius:6px;background:var(--ink);display:grid;place-items:center}
.ticks svg{width:11px;height:11px;stroke:var(--ink-inv);fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}
.save{width:100%;justify-content:center;padding:12px;box-shadow:none;font-size:14px}

.heat{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
.heat span{aspect-ratio:1;border-radius:6px;background:var(--line)}
.heat .l1{background:color-mix(in srgb,var(--purple) 22%,var(--line))}
.heat .l2{background:color-mix(in srgb,var(--purple) 45%,var(--line))}
.heat .l3{background:color-mix(in srgb,var(--purple) 72%,var(--line))}
.heat .l4{background:var(--purple)}
.heat .fut{background:transparent;box-shadow:inset 0 0 0 1px var(--line)}
.days{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;font-size:10px;color:var(--soft);text-align:center;margin-bottom:6px}
.streak{display:flex;align-items:baseline;gap:8px;margin-top:14px;font-size:13px;color:var(--text)}
.streak b{font-size:26px;letter-spacing:-.04em;color:var(--ink);font-weight:500}
.meter{position:relative;height:10px;border-radius:99px;background:linear-gradient(90deg,#f26b6b,#fbd63a 50%,#3fcf8e)}
.meter i{position:absolute;top:-4px;width:6px;height:18px;border-radius:4px;background:var(--card);border:2px solid var(--ink);transform:translateX(-50%)}
.score-row{display:flex;align-items:baseline;justify-content:space-between;margin-bottom:12px}
.score-row b{font-size:28px;letter-spacing:-.04em;font-weight:500}
.score-row span{font-size:12px;color:var(--soft)}
.scale{display:flex;justify-content:space-between;font-size:10px;color:var(--soft);margin-top:8px}
.note-under{max-width:none;text-align:center;margin:26px 0 0;position:relative;font-size:13px;color:var(--soft)}

/* sections */
.sec{padding-top:104px;padding-bottom:104px}
.head{text-align:center;max-width:640px;margin:0 auto 56px}
h2{margin:0;font-weight:500;font-size:clamp(2rem,4.6vw,3.2rem);line-height:1.05;letter-spacing:-.045em}
h2 .g{color:var(--gray-word)}
.steps-heading{white-space:nowrap;font-size:clamp(1.65rem,4.2vw,3.2rem)}
@media(max-width:640px){.steps-heading{white-space:normal}}
.head p{margin:18px auto 0;color:var(--text);max-width:46ch}

/* bento */
.bento{display:grid;grid-template-columns:repeat(6,1fr);gap:16px}
.cell{border-radius:26px;padding:28px;background:var(--panel);display:flex;flex-direction:column;gap:18px;min-width:0}
.cell h3{margin:0;font-size:20px;font-weight:500;letter-spacing:-.03em;line-height:1.2}
.cell p{margin:6px 0 0;font-size:14.5px;color:var(--text);max-width:40ch}
.cell.white{background:var(--card);box-shadow:inset 0 0 0 1px var(--line)}
.cell.dark{background:var(--ink);color:var(--ink-inv)}
.cell.dark p{color:color-mix(in srgb,var(--ink-inv) 68%,var(--ink))}
.c-a{grid-column:span 6}
.c-c{grid-column:span 3}.c-d{grid-column:span 3}.c-e{grid-column:span 6}

.mini{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:8px}
.mini .f{background:transparent;box-shadow:inset 0 0 0 1px var(--line);padding:16px 22px;border-radius:14px}
.mini .f span{font-size:14px}
.mini .f b{font-size:clamp(17px,2vw,22px);font-weight:500;letter-spacing:-.02em}
.mini .rr{font-style:normal}
.mini .rr.pos{color:var(--gain)}.mini .rr.neg{color:var(--loss)}
.mini .rr.dot{color:var(--soft);margin:0 10px}
.streak-dots{display:flex;gap:clamp(8px,1.2vw,13px);margin-top:auto;padding-top:14px}
.streak-dots span{flex:none;width:clamp(30px,4.6vw,54px);aspect-ratio:1;border-radius:12px;background:var(--line)}
.streak-dots span.hit{background:var(--purple)}
.streak-dots span.today{background:transparent;box-shadow:inset 0 0 0 2px var(--purple)}
.prompts{margin:auto 0 0;padding:0;list-style:none;display:grid;gap:8px;font-size:13.5px}
.prompts li{background:var(--panel);border-radius:12px;padding:11px 14px;box-shadow:inset 0 0 0 1px var(--line)}

.rules{display:grid;gap:10px;margin:auto 0 0}
.rule{display:flex;align-items:center;gap:12px;font-size:14px;cursor:pointer;padding:10px 12px;border-radius:12px;background:color-mix(in srgb,var(--ink-inv) 9%,var(--ink))}
.rule input{position:absolute;opacity:0;pointer-events:none}
.rule .bx{flex:none;width:20px;height:20px;border-radius:7px;box-shadow:inset 0 0 0 1.5px color-mix(in srgb,var(--ink-inv) 45%,var(--ink));display:grid;place-items:center;transition:background .15s}
.rule .bx svg{width:12px;height:12px;stroke:var(--ink);fill:none;stroke-width:2.6;stroke-linecap:round;stroke-linejoin:round;opacity:0}
.rule input:checked + .bx{background:#8fe8bf;box-shadow:none}
.rule input:checked + .bx svg{opacity:1}
.rule input:focus-visible + .bx{outline:2px solid #8fe8bf;outline-offset:3px}
.ring-wrap{display:flex;align-items:center;gap:18px}
.ring{position:relative;width:112px;height:112px;flex:none}
.ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.ring .trk{stroke:color-mix(in srgb,var(--ink-inv) 16%,var(--ink))}
.ring .val{stroke:#8fe8bf;transition:stroke-dashoffset .4s ease}
.ring b{position:absolute;inset:0;display:grid;place-items:center;font-size:30px;font-weight:500;letter-spacing:-.04em}
.ring-label{font-size:14px}
.ring-label small{display:block;color:color-mix(in srgb,var(--ink-inv) 60%,var(--ink));font-size:12px;margin-top:2px}

.seg{display:inline-flex;gap:4px;padding:4px;background:var(--panel);border-radius:999px;align-self:flex-start}
.seg button{border:0;background:transparent;padding:7px 16px;border-radius:999px;font-size:13px;color:var(--soft)}
.seg button[aria-pressed="true"]{background:var(--ink);color:var(--ink-inv)}
.bars{display:grid;gap:10px}
.bar{display:grid;grid-template-columns:130px 1fr 70px;align-items:center;gap:14px;font-size:13.5px}
.bar .trk{position:relative;height:12px;border-radius:99px;background:var(--panel)}
.bar .trk::after{content:"";position:absolute;left:50%;top:-3px;bottom:-3px;width:1px;background:var(--line)}
.bar .fill{position:absolute;top:0;bottom:0;border-radius:99px;transition:width .35s ease,left .35s ease}
.bar .fill.pos{background:var(--gain)}.bar .fill.neg{background:var(--loss)}
.bar .v{text-align:right;font-variant-numeric:tabular-nums}
.bar .v.pos{color:var(--gain)}.bar .v.neg{color:var(--loss)}
.chart-note{font-size:12px;color:var(--soft);margin:0}

/* logos + model section */
.av{display:block;border-radius:50%;object-fit:cover;background:var(--ink)}
.model{position:relative;overflow:hidden;text-align:center;padding-top:104px;padding-bottom:96px}
.model::before{content:"";position:absolute;left:50%;top:40px;width:min(760px,120%);height:360px;transform:translateX(-50%);background:radial-gradient(closest-side,color-mix(in srgb,var(--purple) 26%,transparent),transparent);pointer-events:none}
.duo{position:relative;display:flex;justify-content:center;margin-bottom:34px}
.duo .av{width:clamp(96px,15vw,128px);height:clamp(96px,15vw,128px)}
.duo .g1{box-shadow:0 0 0 2px color-mix(in srgb,var(--soft) 55%,transparent)}
.duo .g2{margin-left:-16px;box-shadow:0 0 0 3px color-mix(in srgb,var(--purple) 55%,#fff),0 0 44px color-mix(in srgb,var(--purple) 55%,transparent)}
.model h2{position:relative;font-size:clamp(2rem,5vw,3.4rem)}
.model-heading-scroll .model-heading-name{font-family:"DM Serif Display",Georgia,serif;font-size:1.04em;font-weight:400;font-style:italic;letter-spacing:-.025em;color:var(--gray-word)}
.model .lead{position:relative;margin:24px auto 0;max-width:46ch;color:var(--text);font-size:clamp(1rem,1.7vw,1.15rem)}
.disclaim{position:relative;font-size:12.5px;color:var(--soft);margin:40px auto 0;max-width:60ch}

/* interactive dashboard */
.app{display:grid;grid-template-columns:224px minmax(0,1fr);height:clamp(520px,82vh,660px);background:var(--shell);border-radius:inherit;overflow:hidden;text-align:left;font-size:14px;color:var(--ink);position:relative}
.side{display:flex;flex-direction:column;gap:2px;padding:16px 10px;border-right:1px solid var(--line);background:var(--card);overflow-y:auto}
.ap-brand{display:flex;align-items:center;gap:10px;padding:2px 10px 10px}
.ap-brand .logo{gap:0}
.ap-brand .lg{height:30px;width:auto}
.ap-brand b{display:block;font-size:14px;font-weight:600;letter-spacing:-.02em;line-height:1.2}
.ap-brand small{display:block;font-size:11.5px;color:var(--soft)}
.grp{margin:14px 12px 6px;font-size:12px;color:var(--soft)}
.nav-i{display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;border:0;border-radius:12px;background:transparent;color:var(--soft);font-size:14px;text-align:left;transition:background .15s,color .15s}
.nav-i svg{width:16px;height:16px;flex:none;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.nav-i:hover{color:var(--ink)}
.nav-i[aria-current="page"]{background:var(--ink);color:var(--ink-inv)}
.ap-user{margin-top:auto;padding:12px;border-radius:14px;background:var(--panel);display:flex;gap:10px;align-items:center}
.ap-user i{flex:none;width:30px;height:30px;border-radius:50%;background:color-mix(in srgb,#3b82f6 22%,var(--card));color:#3b82f6;display:grid;place-items:center;font-style:normal;font-size:12px;font-weight:600}
.ap-user b{display:block;font-size:12.5px;font-weight:600}
.ap-user small{display:block;font-size:11px;color:var(--soft);line-height:1.35}
.ap-main{display:flex;flex-direction:column;min-width:0;min-height:0}
.ap-tb{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:14px 26px;border-bottom:1px solid var(--line);background:var(--card)}
.ap-tb h3{margin:0;font-size:15px;font-weight:600;letter-spacing:-.02em}
.ap-tb p{margin:0;font-size:12px;color:var(--soft)}
.ap-act{display:flex;align-items:center;gap:4px;flex-wrap:wrap}
.ap-act button{border:0;background:transparent;color:var(--soft);font-size:13.5px;padding:8px 12px;border-radius:10px}
.ap-act button:hover{color:var(--ink)}
.app .ap-btn{border:0;background:var(--ink);color:var(--ink-inv);border-radius:999px;padding:9px 18px;font-size:13.5px;font-weight:500}
.app .ap-btn:hover{opacity:.9}
.app .ap-ghost{border:0;background:transparent;color:var(--soft);padding:9px 14px;border-radius:999px;font-size:13.5px}
.pane{flex:1;min-height:0;overflow:auto;padding:26px clamp(16px,3vw,40px) 34px}
.app h2.ap-h{margin:0;font-size:clamp(1.6rem,3vw,2.2rem);font-weight:600;letter-spacing:-.045em;line-height:1.1}
.ap-name{color:#3b82f6}
.ap-sub{margin:6px 0 2px;color:var(--text)}
.ap-meta{color:var(--soft);font-size:12.5px}
.ap-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin:22px 0 16px}
.ap-card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px 20px;min-width:0}
.ap-stat span{display:block;font-size:12px;color:var(--soft);margin-bottom:6px}
.ap-stat b{font-size:26px;font-weight:600;letter-spacing:-.04em}
.pos{color:var(--gain)}.neg{color:var(--loss)}
.ap-ch{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:10px}
.ap-ch h3,.ap-card h3{margin:0;font-size:14.5px;font-weight:600;letter-spacing:-.02em}
.ap-chart{position:relative;outline-offset:2px}
.ap-chart svg{display:block;max-width:100%;overflow:visible}
.ap-chart .gl{stroke:var(--line);stroke-dasharray:3 4}
.ap-chart .gl.zero{stroke:var(--dot);stroke-dasharray:none}
.ap-chart .ax{fill:var(--soft);font-size:10.5px}
/* Equity curve — progressive draw + soft fading glow beneath the line */
.ap-chart .ln{
  fill:none;
  stroke:var(--purple);
  stroke-width:2.2;
  stroke-linecap:round;
  stroke-dasharray:1;
  stroke-dashoffset:1;
  animation:pjDrawEquity 2s cubic-bezier(.65,0,.35,1) forwards;
}
.ap-chart .ln-glow{
  fill:none;
  stroke:var(--purple);
  stroke-width:8;
  stroke-linecap:round;
  stroke-dasharray:1;
  stroke-dashoffset:1;
  opacity:.16;
  filter:url(#equityGlow);
  animation:pjDrawEquity 2s cubic-bezier(.65,0,.35,1) forwards;
}
.ap-chart .area{
  fill:url(#equityFill);
  opacity:0;
  animation:pjEquityArea .9s ease .15s forwards;
}
.ap-chart .area-glow{
  fill:var(--purple);
  opacity:.10;
}
.ap-chart .equity-reveal-rect{
  width:0;
  animation:pjRevealEquity 2s cubic-bezier(.65,0,.35,1) forwards;
}
@keyframes pjDrawEquity{
  from{stroke-dashoffset:1}
  to{stroke-dashoffset:0}
}
@keyframes pjRevealEquity{
  from{width:0}
  to{width:var(--chart-reveal-width)}
}
@keyframes pjEquityArea{
  from{opacity:0}
  to{opacity:1}
}
.ap-chart .dot{fill:var(--purple);stroke:var(--card);stroke-width:2;transition:r .12s}
.ap-chart .dot.on{stroke:var(--purple);fill:var(--card);stroke-width:2.5}
.ap-chart .guide{stroke:var(--purple);stroke-opacity:.35;stroke-width:1}
.ap-chart rect.pos{fill:var(--gain)}.ap-chart rect.neg{fill:var(--loss)}
.ap-chart rect.on{opacity:.75}
.ap-tip{position:absolute;pointer-events:none;transform:translate(-50%,-100%);background:var(--ink);color:var(--ink-inv);border-radius:10px;padding:8px 11px;font-size:12px;line-height:1.35;white-space:nowrap;z-index:2}
.ap-tip[hidden]{display:none}
.ap-tip b{display:block;font-weight:600}
.ap-tip small{opacity:.7;font-size:11px}
.ap-set h3{display:flex;align-items:center;gap:8px;margin-bottom:10px}
.ap-set h3 svg{width:15px;height:15px;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.ap-set h3 svg.up{stroke:var(--gain)}.ap-set h3 svg.down{stroke:var(--loss)}
.ap-set strong{display:block;font-size:18px;font-weight:600;letter-spacing:-.03em}
.ap-set span{font-size:20px;font-weight:600;letter-spacing:-.03em}
.ap-set small{display:block;color:var(--soft);font-size:12px;margin-top:2px}
.ap-empty{margin:0;padding:28px 8px;text-align:center;color:var(--soft)}
.journal-preview .side{gap:5px}
.journal-preview .nav-i{cursor:pointer}
.journal-preview .nav-i[data-active="true"]{background:color-mix(in srgb,#3b82f6 13%,var(--card));color:#3b82f6}
.journal-preview .ap-tb{padding:14px 20px}
.journal-preview .ap-tb h3{font-size:16px}
.journal-preview .ap-tb p{margin-top:3px}
.journal-preview .preview-toolbar{display:flex;align-items:center;gap:8px}
.journal-preview .preview-toolbar button{border:1px solid var(--line);border-radius:10px;padding:8px 12px;background:var(--card);color:var(--soft);font-size:12px;cursor:pointer}
.journal-preview .preview-toolbar button[aria-disabled="true"]{opacity:.62;cursor:not-allowed}
.journal-preview .journal-pane{min-width:0;overflow:hidden;padding:18px 20px 24px;background:var(--shell)}
.journal-preview .journal-summary{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}
.journal-preview .journal-summary h2{margin:0;font-size:20px;letter-spacing:-.035em}
.journal-preview .journal-summary p{margin:4px 0 0;color:var(--soft);font-size:12px}
.journal-preview .journal-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:14px}
.journal-preview .journal-kpi{padding:12px 14px;border:1px solid var(--line);border-radius:13px;background:var(--card)}
.journal-preview .journal-kpi small{display:block;color:var(--soft);font-size:10px}
.journal-preview .journal-kpi strong{display:block;margin-top:5px;font-size:16px;font-weight:600}
.journal-preview .journal-table-wrap{overflow:auto;border:1px solid var(--line);border-radius:14px;background:var(--card)}
.journal-preview .journal-table{width:100%;min-width:760px;border-collapse:collapse;text-align:left;font-size:11px}
.journal-preview .journal-table th{padding:11px 12px;background:var(--panel);color:var(--soft);font-size:9px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;white-space:nowrap}
.journal-preview .journal-table td{padding:12px;border-top:1px solid var(--line);white-space:nowrap;color:var(--text)}
.journal-preview .journal-table tbody tr{cursor:pointer;transition:background .15s}
.journal-preview .journal-table tbody tr:hover{background:color-mix(in srgb,#3b82f6 7%,var(--card))}
.journal-preview .journal-table .trade-number{font-family:ui-monospace,monospace;font-weight:600;color:var(--ink)}
.journal-preview .journal-symbol{display:inline-flex;align-items:center;gap:6px;font-weight:600;color:var(--ink)}
.journal-preview .symbol-mark{display:grid;width:22px;height:22px;place-items:center;border:1px solid var(--line);border-radius:50%;background:var(--panel);font-size:8px;color:var(--soft)}
.journal-preview .journal-pill{display:inline-flex;align-items:center;border-radius:999px;padding:3px 7px;background:var(--panel);font-size:9px;font-weight:600}
.journal-preview .journal-pill.long,.journal-preview .journal-pill.win{color:var(--gain);background:color-mix(in srgb,var(--gain) 12%,var(--card))}
.journal-preview .journal-pill.short,.journal-preview .journal-pill.loss{color:var(--loss);background:color-mix(in srgb,var(--loss) 12%,var(--card))}
@media(max-width:860px){.journal-preview .side{display:none}.journal-preview .journal-pane{padding:14px}.journal-preview .journal-kpis{grid-template-columns:repeat(3,minmax(100px,1fr))}}
#tradeDlg{border:0;border-radius:24px;padding:0;background:var(--card);color:var(--ink);width:min(520px,92vw);box-shadow:0 40px 100px rgba(0,0,0,.45)}
#tradeDlg::backdrop{background:rgba(5,8,15,.6)}
#tradeDlg form{padding:26px}
#tradeDlg h3{margin:0 0 18px;font-size:18px;font-weight:600;letter-spacing:-.03em}
.ap-fields{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.fld{display:grid;gap:6px;font-size:12.5px;color:var(--soft)}
.fld input,.fld select{font:inherit;font-size:14px;color:var(--ink);background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:10px 12px;min-width:0;width:100%}
.ap-dact{display:flex;justify-content:flex-end;gap:8px;margin-top:22px}
@media (max-width:860px){
  .app{grid-template-columns:1fr;grid-template-rows:minmax(0,1fr);height:min(680px,86vh)}
  .side{display:none}
  .ap-tb{padding:12px 16px;flex-direction:column;align-items:stretch;gap:10px}
  .ap-act{justify-content:space-between;flex-wrap:nowrap}
  .ap-act [data-act="home"]{display:none}
  .ap-fields{grid-template-columns:1fr}
}

/* steps */
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:0;max-width:1000px;margin:0 auto;position:relative}
.step{padding:0 28px}
.step .n{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:var(--ink);color:var(--ink-inv);font-weight:500;margin-bottom:22px;position:relative;z-index:1}
.step h3{margin:0 0 8px;font-size:20px;font-weight:500;letter-spacing:-.03em}
.step p{margin:0;color:var(--text);font-size:15px;max-width:30ch}
.steps::before{content:"";position:absolute;top:22px;left:50px;right:calc(33.3% - 22px);border-top:2px solid var(--line);opacity:.9}
.steps-progress{position:absolute;z-index:0;top:21px;left:50px;right:calc(33.3% - 22px);height:3px;transform-origin:left center;background:linear-gradient(90deg,var(--purple),color-mix(in srgb,var(--purple) 58%,var(--gain)));box-shadow:0 0 14px color-mix(in srgb,var(--purple) 40%,transparent);pointer-events:none}

/* pricing */
.dots{background-image:radial-gradient(var(--dot) 1.1px,transparent 1.2px);background-size:12px 12px}
.plans{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;max-width:820px;margin:0 auto;perspective:1000px}
.plan{border-radius:28px;padding:32px;background:var(--card);box-shadow:inset 0 0 0 1px var(--line);display:flex;flex-direction:column;gap:20px;position:relative;overflow:hidden;transform-style:preserve-3d}
.pricing-comet-glow{position:absolute;inset:0;z-index:0;pointer-events:none}
.plan>*:not(.pricing-comet-glow){position:relative;z-index:1}
.plan.feat{background:var(--ink);color:var(--ink-inv);box-shadow:none}
.plan h3{margin:0;font-size:16px;font-weight:500;display:flex;justify-content:space-between;align-items:center}
.price.sm{font-size:clamp(30px,4vw,38px);line-height:1.1;letter-spacing:-.05em}
.soonp{margin:0;font-size:14.5px;color:color-mix(in srgb,var(--ink-inv) 70%,var(--ink))}
.tag{font-size:12px;padding:4px 10px;border-radius:999px;background:#8fe8bf;color:#0d0d0f;font-weight:500}
.price{font-size:52px;letter-spacing:-.06em;line-height:1;font-weight:500}
.price small{font-size:15px;letter-spacing:0;color:var(--soft);font-weight:400;margin-left:6px}
.plan.feat .price small,.plan.feat li{color:color-mix(in srgb,var(--ink-inv) 70%,var(--ink))}
.plan ul{list-style:none;margin:0;padding:0;display:grid;gap:10px;font-size:14.5px;color:var(--text)}
.plan li{display:flex;gap:10px;align-items:flex-start}
.plan li svg{flex:none;width:16px;height:16px;margin-top:3px;stroke:currentColor;fill:none;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.plan .btn{justify-content:center;margin-top:auto}
.plan.feat .btn{background:var(--ink-inv);color:var(--ink);box-shadow:none}
.fine{text-align:center;color:var(--soft);font-size:12.5px;margin:22px 0 0}

/* faq */
.faq{max-width:720px;margin:0 auto}
.faq details{border-bottom:1px solid var(--line);padding:22px 0}
.faq summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:20px;font-size:18px;letter-spacing:-.02em;font-weight:500}
.faq summary::-webkit-details-marker{display:none}
.faq summary::after{content:"+";font-size:22px;color:var(--soft);transition:transform .2s}
.faq details[open] summary::after{transform:rotate(45deg)}
.faq p{margin:12px 0 0;color:var(--text);max-width:60ch}

/* FAQ reference layout, recolored to fit ThePrecisionLab theme */
.faq-section{color:var(--ink);padding-top:84px;padding-bottom:96px;background-color:var(--shell);background-image:linear-gradient(to bottom,var(--shell),transparent 190px),radial-gradient(color-mix(in srgb,var(--dot) 58%,transparent) 1px,transparent 1.2px),radial-gradient(ellipse at 50% 0%,color-mix(in srgb,var(--purple) 9%,transparent),transparent 58%);background-size:100% 190px,12px 12px,100% 100%;background-position:top,center,center;background-repeat:no-repeat,repeat,no-repeat}
.faq-section .faq-title{text-align:center;margin:0 0 60px;color:var(--ink);font-size:clamp(2rem,4vw,2.65rem);letter-spacing:-.045em}
.faq-section .faq-title .faq-dot{color:var(--purple)}
.faq-layout{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:minmax(300px,.82fr) minmax(0,1.18fr);gap:54px;align-items:stretch}
.faq-questions{border-top:1px solid var(--line)}
.faq-question{width:100%;min-height:98px;padding:20px 8px 20px 0;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--soft);display:flex;align-items:center;gap:16px;text-align:left;font-size:18px;font-weight:500;line-height:1.35;cursor:pointer;transition:color .2s ease}
.faq-question:hover,.faq-question[aria-selected="true"]{color:var(--ink)}
.faq-question-icon{flex:none;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:var(--panel);color:var(--soft);font-size:16px;font-weight:600;transition:background .2s ease,color .2s ease}
.faq-question[aria-selected="true"] .faq-question-icon{background:#000;color:#fff}
.faq-question-arrow{margin-left:auto;flex:none;color:var(--purple);font-size:23px;line-height:1}
.faq-answer-card{min-height:490px;padding:48px;border:1px solid var(--line);border-radius:28px;background:color-mix(in srgb,var(--panel) 88%,var(--page));box-shadow:0 22px 54px color-mix(in srgb,var(--ink) 14%,transparent),0 5px 16px rgba(0,0,0,.08),inset 0 1px 0 color-mix(in srgb,var(--ink-inv) 8%,transparent);display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;transform-style:preserve-3d;will-change:transform}
.faq-answer-card::before{content:"";position:absolute;width:240px;height:240px;right:-110px;top:-130px;border-radius:50%;background:var(--purple);opacity:.07;filter:blur(24px);pointer-events:none}
.faq-comet-glow{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.9}
.faq-answer-copy{position:relative;z-index:1;margin:auto 0;color:var(--text);font-size:clamp(1.25rem,2.1vw,1.55rem);line-height:1.5;letter-spacing:-.025em}
.faq-answer-copy strong{color:var(--ink);font-weight:500}
.faq-answer-footer{position:relative;z-index:1;display:flex;align-items:center;justify-content:space-between;margin-top:48px}
.faq-brand-mark{width:40px;height:40px;display:grid;place-items:center;filter:drop-shadow(0 2px 5px rgba(20,24,35,.12))}
.faq-brand-mark .brand-logo-dark{display:none}
html[data-theme='dark'] .faq-brand-mark .brand-logo-light{display:none}
html[data-theme='dark'] .faq-brand-mark .brand-logo-dark{display:block}
html[data-theme='light'] .faq-brand-mark .brand-logo-light{display:block}
html[data-theme='light'] .faq-brand-mark .brand-logo-dark{display:none}
@media(prefers-color-scheme:dark){html:not([data-theme='light']) .faq-brand-mark .brand-logo-light{display:none}html:not([data-theme='light']) .faq-brand-mark .brand-logo-dark{display:block}}
.faq-controls{display:flex;gap:10px}
.faq-controls button{width:42px;height:42px;border:1px solid var(--line);border-radius:50%;background:var(--card);color:var(--ink);display:grid;place-items:center;font-size:20px;cursor:pointer;box-shadow:0 2px 5px rgba(20,24,35,.08);transition:transform .2s ease,background .2s ease,border-color .2s ease}
.faq-controls button:hover{transform:translateY(-2px);background:var(--purple-soft);border-color:color-mix(in srgb,var(--purple) 35%,var(--line))}
@media(max-width:760px){.faq-section{padding-top:64px;padding-bottom:68px}.faq-section .faq-title{margin-bottom:36px}.faq-layout{grid-template-columns:1fr;gap:24px}.faq-question{min-height:78px;font-size:16px}.faq-answer-card{min-height:330px;padding:30px;border-radius:26px}.faq-answer-copy{font-size:1.25rem}}

/* contact */
.contact{
  padding-top:72px;
  padding-bottom:42px;
  text-align:center;
}
.contact-inner{
  max-width:840px;
  margin:0 auto;
  padding:clamp(42px,6vw,64px) 32px;
  border:1px solid var(--line);
  border-radius:28px;
  background:radial-gradient(ellipse at 80% 100%,color-mix(in srgb,var(--purple) 8%,transparent),transparent 42%),var(--panel);
  box-shadow:0 14px 38px color-mix(in srgb,var(--ink) 8%,transparent),inset 0 1px 0 color-mix(in srgb,var(--ink-inv) 6%,transparent);
  transition:transform .4s cubic-bezier(.22,1,.36,1),box-shadow .4s ease,border-color .3s ease;
}
.contact-inner:hover{
  transform:translateY(-5px);
  border-color:color-mix(in srgb,var(--purple) 32%,var(--line));
  box-shadow:0 24px 56px color-mix(in srgb,var(--ink) 13%,transparent),0 0 32px color-mix(in srgb,var(--purple) 8%,transparent);
}
.contact-eyebrow{
  margin:0 0 10px;
  font-size:10px;
  letter-spacing:.2em;
  color:var(--soft);
  font-weight:600;
}
.contact h2{font-size:clamp(1.85rem,4.4vw,2.8rem)}
.contact-link{
  margin-top:16px;
  font-size:14px;
  color:var(--soft);
  font-weight:500;
}
.contact-link:hover{color:var(--purple)}

@media (max-width:860px){
  .contact{padding-top:52px;padding-bottom:30px}
  .contact-inner{padding:28px 18px}
}


/* Experimental staggered micro-interactions */
.bento .cell,
.steps .step,
.plans .plan,
.faq details{
  transition:
    transform .35s cubic-bezier(.22,1,.36,1),
    box-shadow .35s ease,
    border-color .25s ease;
}

.bento .cell:hover,
.steps .step:hover,
.plans .plan:hover{
  transform:translateY(-5px);
  box-shadow:0 18px 42px rgba(20,30,60,.10);
}

.faq details:hover{
  padding-left:8px;
  padding-right:8px;
}

.btn{
  position:relative;
  overflow:hidden;
}

.btn::after{
  content:"";
  position:absolute;
  inset:0;
  width:45%;
  transform:translateX(-150%) skewX(-18deg);
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent);
  transition:transform .65s ease;
  pointer-events:none;
}

.btn:hover::after{
  transform:translateX(320%) skewX(-18deg);
}

.theme:active,
.btn:active,
.seg button:active,
.ap-act button:active{
  transform:scale(.97);
}

@media (prefers-reduced-motion:reduce){
  main > section{
    animation:none!important;
  }

  .bento .cell:hover,
  .steps .step:hover,
  .plans .plan:hover{
    transform:none!important;
  }

  .faq details:hover{
    padding-left:0;
    padding-right:0;
  }

  .btn::after{
    display:none;
  }
}


/* Experimental cursor spotlight CSS */
.cell,
.plan,
.contact-inner,
.ap-card,
.tile,
.window,
.shot{
  position:relative;
  overflow:hidden;
}

.cell::before,
.plan::before,
.contact-inner::before,
.ap-card::before,
.tile::before,
.window::before,
.shot::before{
  content:"";
  position:absolute;
  inset:0;
  pointer-events:none;
  opacity:0;
  background:radial-gradient(
    260px circle at var(--mx,50%) var(--my,50%),
    color-mix(in srgb,var(--purple) 13%,transparent),
    transparent 65%
  );
  transition:opacity .25s ease;
  z-index:0;
}

.cell:hover::before,
.plan:hover::before,
.contact-inner:hover::before,
.ap-card:hover::before,
.tile:hover::before,
.window:hover::before,
.shot:hover::before{
  opacity:1;
}

.cell > *,
.plan > *,
.contact-inner > *,
.ap-card > *,
.tile > *,
.window > *,
.shot > *{
  position:relative;
  z-index:1;
}

@media (prefers-reduced-motion:reduce){
  .cell::before,
  .plan::before,
  .contact-inner::before,
  .ap-card::before,
  .tile::before,
  .window::before,
  .shot::before{
    display:none;
  }
}

/* cta + footer */
.cta{margin:0 clamp(12px,3vw,40px);border-radius:32px;background:var(--ink);color:var(--ink-inv);text-align:center;padding:clamp(56px,9vw,104px) 24px}
.cta h2{color:var(--ink-inv)}
.cta h2 .g{color:color-mix(in srgb,var(--ink-inv) 45%,var(--ink))}
.cta p{color:color-mix(in srgb,var(--ink-inv) 68%,var(--ink));margin:18px auto 30px;max-width:40ch}
.cta h2{margin-bottom:30px}
.cta .btn{background:var(--ink-inv);color:var(--ink);box-shadow:none}
footer{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;padding-top:48px;padding-bottom:48px;font-size:13.5px;color:var(--soft)}
footer nav{display:flex;gap:26px}
footer a:hover{color:var(--ink)}
.site-footer{position:relative;display:flex;min-height:620px;flex-direction:column;align-items:stretch;flex-wrap:nowrap;justify-content:space-between;overflow:hidden;margin-top:28px;padding:0 clamp(20px,5vw,72px) 28px;background:var(--shell);border-top:1px solid var(--line);isolation:isolate;box-sizing:border-box}
.site-footer::before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background:radial-gradient(ellipse at 50% 52%,color-mix(in srgb,var(--purple) 13%,transparent),transparent 48%),linear-gradient(180deg,var(--shell),color-mix(in srgb,var(--page) 58%,var(--shell)))}
.site-footer-marquee{position:relative;z-index:2;flex:0 0 auto;width:100%;box-sizing:border-box;overflow:hidden;margin:66px calc(clamp(20px,5vw,72px) * -1) 0;padding:14px 0;border-top:1px solid color-mix(in srgb,var(--line) 75%,transparent);border-bottom:1px solid color-mix(in srgb,var(--line) 75%,transparent);background:color-mix(in srgb,var(--panel) 62%,transparent);backdrop-filter:blur(12px);transform:rotate(-8deg) scale(1.08)}
.site-footer-marquee-track{display:flex;width:max-content;animation:pjFooterMarquee 20s linear infinite;color:var(--soft);font-size:11px;font-weight:600;letter-spacing:.24em;white-space:nowrap}
.site-footer-marquee-track span{padding-right:2.5rem}
.site-footer-marquee-track i{padding:0 1.2rem;color:var(--purple);font-style:normal}
@keyframes pjFooterMarquee{to{transform:translateX(-25%)}}
.site-footer-giant{position:absolute;z-index:0;right:-.12em;bottom:48px;left:52%;width:max-content;transform:none;color:transparent;background:linear-gradient(180deg,color-mix(in srgb,var(--ink) 8%,transparent),color-mix(in srgb,var(--ink) 2%,transparent));-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;-webkit-text-stroke:1px color-mix(in srgb,var(--ink) 10%,transparent);-webkit-mask-image:linear-gradient(to bottom,#000 0%,rgba(0,0,0,.64) 68%,transparent 100%);mask-image:linear-gradient(to bottom,#000 0%,rgba(0,0,0,.64) 68%,transparent 100%);font-size:clamp(9rem,23vw,21rem);font-weight:900;letter-spacing:-.09em;line-height:.78;white-space:nowrap;pointer-events:none;user-select:none}
.site-footer-main{position:relative;z-index:1;display:flex;flex:1;width:100%;box-sizing:border-box;flex-direction:column;align-items:center;justify-content:center;padding:104px 18px 70px;text-align:center}
.site-footer-scroll-links{display:flex;width:100%;flex-direction:column;align-items:center}
.site-footer-brand{display:flex;align-items:center;gap:9px;color:var(--ink);font-size:14px;font-weight:600;letter-spacing:-.02em}
.site-footer-kicker{margin:34px 0 12px;color:var(--soft);font-size:10px;font-weight:600;letter-spacing:.22em}
.site-footer-main h2{max-width:1100px;color:var(--ink);font-size:clamp(4rem,9vw,8.5rem);font-weight:800;letter-spacing:-.075em;line-height:.96;text-shadow:0 8px 30px color-mix(in srgb,var(--ink) 10%,transparent)}
.site-footer-main h2 span{color:var(--gray-word)}
.site-footer-copy{margin:18px 0 26px;color:var(--text);font-size:15px;line-height:1.6}
.site-footer-cta{position:relative;display:inline-flex;align-items:center;gap:12px;padding:17px 30px;border:1px solid color-mix(in srgb,var(--ink) 14%,transparent);border-radius:999px;background:linear-gradient(145deg,color-mix(in srgb,var(--ink) 7%,var(--panel)),color-mix(in srgb,var(--ink) 3%,var(--panel)));color:var(--ink);font-size:15px;font-weight:700;box-shadow:0 10px 30px color-mix(in srgb,var(--ink) 13%,transparent),inset 0 1px 1px color-mix(in srgb,var(--ink-inv) 24%,transparent),inset 0 -1px 2px color-mix(in srgb,var(--ink) 9%,transparent);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);transition:border-color .35s ease,box-shadow .35s ease}
.site-footer-cta::before,.site-footer-legal a::before{content:"";position:absolute;inset:0;border-radius:inherit;background:linear-gradient(110deg,transparent 20%,color-mix(in srgb,var(--ink-inv) 24%,transparent) 48%,transparent 75%);opacity:.7;pointer-events:none}
.site-footer-cta:hover{border-color:color-mix(in srgb,var(--purple) 36%,var(--line));box-shadow:0 18px 38px color-mix(in srgb,var(--purple) 18%,transparent),inset 0 1px 1px color-mix(in srgb,var(--ink-inv) 30%,transparent)}
.site-footer-legal{display:flex;flex-wrap:wrap;justify-content:center;gap:12px;margin-top:24px}
.site-footer-legal a{position:relative;display:inline-flex;align-items:center;padding:11px 19px;border:1px solid color-mix(in srgb,var(--ink) 10%,transparent);border-radius:999px;background:linear-gradient(145deg,color-mix(in srgb,var(--ink) 5%,var(--panel)),color-mix(in srgb,var(--ink) 2%,var(--panel)));color:var(--soft);font-size:13px;font-weight:500;box-shadow:inset 0 1px 1px color-mix(in srgb,var(--ink-inv) 18%,transparent),0 8px 24px color-mix(in srgb,var(--ink) 7%,transparent);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);transition:transform .3s ease,color .3s ease,border-color .3s ease,box-shadow .3s ease}
.site-footer-legal a:hover{transform:translateY(-3px);color:var(--ink);border-color:color-mix(in srgb,var(--ink) 22%,transparent);box-shadow:0 12px 28px color-mix(in srgb,var(--ink) 12%,transparent)}
.site-footer-bottom{position:relative;z-index:2;display:flex;width:100%;box-sizing:border-box;align-items:center;justify-content:space-between;gap:22px;padding-top:22px;border-top:1px solid var(--line);color:var(--soft);font-size:12px}
.site-footer-top{justify-self:end;display:flex;align-items:center;gap:8px;border:0;background:transparent;color:var(--soft);font:inherit;cursor:pointer}
.site-footer-top:hover{color:var(--ink)}
@media(max-width:700px){.site-footer{min-height:620px;padding-bottom:22px}.site-footer-marquee{margin-top:40px}.site-footer-main{padding:84px 8px 60px}.site-footer-main h2{font-size:clamp(3.7rem,13vw,5.6rem)}.site-footer-giant{font-size:clamp(8rem,31vw,14rem);bottom:56px;left:50%}.site-footer-bottom{align-items:flex-start;flex-direction:column;gap:16px}.site-footer-top{align-self:flex-end}.site-footer-copyright{font-size:10px}}
@media(prefers-reduced-motion:reduce){.site-footer-marquee-track{animation:none}.site-footer-cta,.site-footer-legal a{transition:none}}
.site-footer-copyright{display:flex;align-items:center;gap:7px;white-space:nowrap}
.site-footer-copyright .brand-logo-light,.site-footer-copyright .brand-logo-dark{width:18px;height:18px}
@media(prefers-reduced-motion:reduce){.site-footer-marquee-track{animation:none}}

@media (max-width:860px){
  .nav{grid-template-columns:1fr auto}
  .nav .pill,.acct .plain{display:none}
  .w-body{grid-template-columns:1fr}
  .bento{grid-template-columns:1fr}
  .c-a,.c-b,.c-c,.c-d,.c-e{grid-column:1/-1;grid-row:auto}
  .steps{grid-template-columns:1fr;gap:36px}
  .steps::before{display:none}
  .step{padding:0}
  .plans{grid-template-columns:1fr}
  .mini{grid-template-columns:1fr}
  .bar{grid-template-columns:96px 1fr 62px;gap:10px}
  .hero{min-height:calc(82svh - 72px);padding:20px 20px 10px}
}
@media (prefers-reduced-motion:reduce){
  *{transition:none!important;scroll-behavior:auto!important}
}

/* =========================================================
   THEPRECISIONLAB — REFERENCE-INSPIRED MOTION POLISH
   Existing elements only. No new landing-page content.
   ========================================================= */

/* Smooth interactive transitions */
.pill a,
.logo,
.theme,
.acct a,
.btn,
.cell,
.tile,
.chip,
.rule,
.streak-dots span,
.heat span,
.step .n,
.plan,
.faq details,
.faq summary,
.nav-i,
.ap-act button,
.ap-btn,
.ap-ghost,
.ap-card,
.duo .av,
footer a,
.contact-link {
  transition:
    transform .28s cubic-bezier(.22,1,.36,1),
    background-color .25s ease,
    color .25s ease,
    border-color .25s ease,
    box-shadow .28s ease,
    opacity .25s ease;
}

/* Header/nav — soft active lift + animated underline */
.pill a{position:relative}
.pill a::after{
  content:"";
  position:absolute;
  left:18px;
  right:18px;
  bottom:5px;
  height:1px;
  border-radius:99px;
  background:currentColor;
  transform:scaleX(0);
  transform-origin:center;
  transition:transform .28s cubic-bezier(.22,1,.36,1);
  opacity:.7;
}
.pill a:hover::after,
.pill a[aria-current="page"]::after{transform:scaleX(1)}
.pill a:hover{transform:translateY(-1px)}

.logo{will-change:transform}
.logo:hover{transform:translateY(-1px);opacity:.9}

.theme:active{transform:scale(.88) rotate(-8deg)}
.theme:hover{transform:translateY(-1px)}

.acct a:hover{transform:translateY(-1px)}
.acct a.solid:hover{box-shadow:0 10px 26px rgba(10,10,20,.18)}

/* Buttons — lift, glow and icon nudge */
.btn{will-change:transform,box-shadow}
.btn:hover{
  transform:translateY(-3px);
  box-shadow:0 18px 38px rgba(10,10,20,.20);
}
.btn:active{transform:translateY(-1px) scale(.985)}
.btn svg{transition:transform .25s cubic-bezier(.22,1,.36,1)}
.btn:hover svg{transform:translateX(4px)}

.btn.ghost:hover{
  background:var(--panel);
  box-shadow:0 10px 28px rgba(20,30,60,.08);
}

/* Hero — subtle entrance */
.hero .eyebrow,
.hero h1,
.hero .sub,
.hero .proof,
.hero .btn{
  animation:pjFadeUp .75s cubic-bezier(.22,1,.36,1) both;
}
.hero h1{animation-delay:.08s}
.hero h1{animation:none}
.hero .sub{animation-delay:.16s}
.hero .btn{animation-delay:.24s}
.hero .proof{animation-delay:.30s}

/* Dashboard / main visual — soft float and depth */
.shot,
.window{
  transition:
    transform .55s cubic-bezier(.22,1,.36,1),
    box-shadow .45s ease;
}
.shot:hover,
.window:hover{
  transform:translateY(-5px);
  box-shadow:
    0 0 0 1px color-mix(in srgb,var(--purple) 12%,transparent),
    0 24px 70px color-mix(in srgb,var(--purple) 10%,transparent),
    0 34px 90px rgba(30,45,90,.18);
}

/* Existing live indicator */
.live{
  position:relative;
  box-shadow:0 0 0 0 color-mix(in srgb,var(--gain) 45%,transparent);
  animation:pjPulse 2s ease-out infinite;
}

/* Dashboard tiles */
.tile:hover{
  transform:translateY(-3px);
  border-color:color-mix(in srgb,var(--purple) 20%,var(--line));
  box-shadow:0 16px 38px rgba(20,30,60,.08);
}

/* Existing chips */
.chip:not(.on):hover{
  transform:translateY(-1px);
  background:var(--purple-soft);
  color:var(--purple);
}

/* Checklist rows */
.rule:hover{
  transform:translateX(3px);
  background:color-mix(in srgb,var(--ink-inv) 12%,var(--ink));
}
.rule .bx{transition:background .2s ease,box-shadow .2s ease,transform .2s ease}
.rule:hover .bx{transform:scale(1.05)}

/* Streak / heatmap tactile hover */
.streak-dots span.hit:hover{transform:translateY(-3px) scale(1.06)}
.heat span:not(.fut):hover{
  transform:scale(1.14);
  box-shadow:0 5px 14px color-mix(in srgb,var(--purple) 18%,transparent);
}

/* Feature bento cards */
.cell{
  will-change:transform,box-shadow;
}
.cell:hover{
  transform:translateY(-5px);
  box-shadow:0 22px 50px rgba(20,30,60,.10);
}
.cell.dark:hover{
  box-shadow:0 22px 50px rgba(0,0,0,.32);
}
.cell .mini .f{
  transition:transform .25s ease,box-shadow .25s ease,background-color .25s ease;
}
.cell .mini .f:hover{
  transform:translateY(-2px);
  box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--purple) 28%,var(--line));
}

/* Steps */
.step .n{
  transition:transform .3s cubic-bezier(.22,1,.36,1),box-shadow .3s ease;
}
.step:hover .n{
  transform:scale(1.10);
  box-shadow:0 10px 24px rgba(20,30,60,.16);
}

/* Model portraits */
.duo .av{
  transition:transform .35s cubic-bezier(.22,1,.36,1),box-shadow .35s ease;
}
.duo .av:hover{transform:translateY(-5px) scale(1.045)}
.duo .g2:hover{box-shadow:0 0 0 3px color-mix(in srgb,var(--purple) 60%,#fff),0 0 58px color-mix(in srgb,var(--purple) 65%,transparent)}

/* Interactive dashboard navigation */
.nav-i:hover{
  transform:translateX(4px);
  background:var(--panel);
}
.nav-i[aria-current="page"]:hover{
  transform:translateX(2px);
  box-shadow:0 8px 20px rgba(0,0,0,.12);
}

/* Dashboard stat cards */
.ap-stat:hover,
.ap-set:hover{
  transform:translateY(-3px);
  border-color:color-mix(in srgb,var(--purple) 18%,var(--line));
  box-shadow:0 16px 36px rgba(20,30,60,.08);
}

/* Dashboard action buttons */
.ap-act button:hover,
.ap-ghost:hover{transform:translateY(-1px)}
.ap-btn:hover{
  transform:translateY(-2px);
  box-shadow:0 10px 24px rgba(10,10,20,.16);
}

/* Existing chart points */
.ap-chart .dot{transition:r .18s ease,fill .18s ease,stroke-width .18s ease}
.ap-chart .dot:hover{r:6}
.ap-chart rect.bar{transform-box:fill-box;transform-origin:center bottom}
.ap-chart rect.bar:hover{opacity:.82}

/* Existing pattern bars — animate their fill */
.bar .fill{
  transform-origin:left center;
  animation:pjBarGrow .65s cubic-bezier(.22,1,.36,1) both;
}

/* Pricing cards */
.plan{will-change:transform,box-shadow}
.plan:hover{
  transform:translateY(-6px);
  box-shadow:0 24px 55px rgba(20,30,60,.12);
}
.plan.feat:hover{box-shadow:0 24px 55px rgba(0,0,0,.30)}
.plan .btn:hover{transform:translateY(-2px)}

/* FAQ — existing accordion only */
.faq details{
  transition:background-color .25s ease,border-color .25s ease,transform .25s ease;
}
.faq details:hover{transform:translateX(3px)}
.faq summary::after{
  transition:transform .3s cubic-bezier(.22,1,.36,1),color .2s ease;
}
.faq summary:hover{color:var(--ink)}
.faq p{animation:pjFaqIn .3s ease both}

/* Final CTA */
.cta{
  transition:box-shadow .4s ease,transform .4s cubic-bezier(.22,1,.36,1);
}
.cta:hover{
  transform:translateY(-3px);
  box-shadow:0 26px 65px rgba(0,0,0,.18);
}
.cta .btn:hover{
  transform:translateY(-3px) scale(1.01);
  box-shadow:0 14px 32px rgba(0,0,0,.20);
}

/* Contact/footer */
footer a:hover{transform:translateY(-1px)}
.contact-link{
  display:inline-flex;
  align-items:center;
  gap:8px;
}
.contact-link:hover{
  color:var(--ink);
  transform:translateY(-1px);
}


/* Keyframes */
@keyframes pjFadeUp{
  from{opacity:0;transform:translateY(18px)}
  to{opacity:1;transform:translateY(0)}
}
@keyframes pjPulse{
  0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--gain) 45%,transparent)}
  70%{box-shadow:0 0 0 8px transparent}
  100%{box-shadow:0 0 0 0 transparent}
}
@keyframes pjBarGrow{
  from{transform:scaleX(0)}
  to{transform:scaleX(1)}
}
@keyframes pjFaqIn{
  from{opacity:0;transform:translateY(-5px)}
  to{opacity:1;transform:translateY(0)}
}

/* =========================================================
   THEPRECISIONLAB — SCROLL REVEAL / SPOTLIGHT / SHINE
   Existing elements only. No new page content.
   ========================================================= */

/* Scroll reveal: elements start slightly lower and fade into place
   only when they enter the viewport. */
.pj-scroll-reveal{
  opacity:0;
  transform:translateY(28px) scale(.985);
  transition:
    opacity .75s cubic-bezier(.22,1,.36,1),
    transform .75s cubic-bezier(.22,1,.36,1);
  transition-delay:var(--reveal-delay,0ms);
}
.pj-scroll-reveal.pj-visible{
  opacity:1;
  transform:none;
}

/* Small stagger for existing cards/items inside sections. */
.pj-stagger{
  opacity:0;
  transform:translateY(18px);
  transition:
    opacity .65s cubic-bezier(.22,1,.36,1),
    transform .65s cubic-bezier(.22,1,.36,1);
  transition-delay:var(--reveal-delay,0ms);
}
.pj-stagger.pj-visible{
  opacity:1;
  transform:none;
}

/* Cursor-following soft spotlight. JS supplies --spot-x / --spot-y. */
.pj-spotlight{
  position:relative;
  overflow:hidden;
}
.pj-spotlight::before{
  content:"";
  position:absolute;
  inset:0;
  pointer-events:none;
  z-index:0;
  background:radial-gradient(260px circle at var(--spot-x,50%) var(--spot-y,50%),color-mix(in srgb,var(--purple) 13%,transparent),transparent 68%);
  opacity:0;
  transition:opacity .35s ease;
}
.pj-spotlight:hover::before{opacity:1}
.pj-spotlight > *{position:relative;z-index:1}

/* Soft moving shine across existing buttons. */
.btn,.ap-btn{
  position:relative;
  overflow:hidden;
  isolation:isolate;
}
.btn::after,.ap-btn::after{
  content:"";
  position:absolute;
  top:-40%;
  left:-80%;
  width:45%;
  height:180%;
  pointer-events:none;
  background:linear-gradient(100deg,transparent,rgba(255,255,255,.24),transparent);
  transform:skewX(-18deg);
  opacity:0;
}
.btn:hover::after,.ap-btn:hover::after{
  opacity:1;
  animation:pjButtonShine .75s cubic-bezier(.22,1,.36,1) forwards;
}

/* Extra depth on the existing contact panel. */
.contact-inner::after{
  content:"";
  position:absolute;
  inset:0;
  border-radius:inherit;
  pointer-events:none;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.06);
  opacity:.6;
}
.contact-inner{position:relative}

/* Stronger chart glow: the line draws from its first point to its last
   while the blurred stroke and fading area follow the same reveal. */
.ap-chart .ln-glow{
  stroke-width:10;
  opacity:.20;
  filter:url(#equityGlow);
}
.ap-chart .area{
  opacity:0;
  animation:pjEquityArea 1.2s ease .2s forwards;
}
.ap-chart .area-glow{
  opacity:.13;
  filter:url(#equityGlow);
}

@keyframes pjButtonShine{
  from{left:-80%}
  to{left:145%}
}

@media (prefers-reduced-motion:reduce){
  .hero .eyebrow,
  .hero h1,
  .hero .sub,
  .hero .proof,
  .hero .btn,
  main > section,
  .bar .fill{
    animation:none!important;
  }
  .live{animation:none!important}
  .ap-chart .ln,
  .ap-chart .ln-glow,
  .ap-chart .area,
  .ap-chart .equity-reveal-rect{
    animation:none!important;
  }
  .ap-chart .ln,
  .ap-chart .ln-glow{
    stroke-dashoffset:0!important;
  }
  .ap-chart .area{
    opacity:1!important;
  }
  .ap-chart .equity-reveal-rect{
    width:var(--chart-reveal-width)!important;
  }
  .shot:hover,.window:hover,.cell:hover,.plan:hover,.cta:hover{
    transform:none!important;
  }
  .pj-scroll-reveal,
  .pj-stagger{
    opacity:1!important;
    transform:none!important;
    transition:none!important;
  }
  .btn::after,.ap-btn::after,.pj-spotlight::before{
    animation:none!important;
    opacity:0!important;
  }
}

/* Responsive layout refinements for narrow phones, tablets, and short screens. */
@media (max-width: 1023px) {
  .pad { padding-left: clamp(18px, 4.5vw, 48px); padding-right: clamp(18px, 4.5vw, 48px); }
  .sec { padding-top: clamp(68px, 9vw, 92px); padding-bottom: clamp(68px, 9vw, 92px); }
  .hero { min-height: max(500px, 72svh); padding-top: 36px; padding-bottom: 40px; }
  .hero h1 { max-width: 100%; font-size: clamp(3rem, 9vw, 5.8rem); line-height: 1.02; text-wrap: balance; }
  .stage { padding-right: clamp(14px, 4vw, 48px); padding-left: clamp(14px, 4vw, 48px); }
  .steps-heading { white-space: normal; text-wrap: balance; }
  .faq-layout { gap: clamp(22px, 4vw, 40px); }
  .faq-answer-card { min-width: 0; }
  .contact-inner { width: 100%; }
  .site-footer { min-height: 560px; }
  .site-footer-main h2 { text-wrap: balance; }
}

@media (max-width: 640px) {
  .shell { width: 100%; margin: 0; padding-right: 12px; padding-left: 12px; border-radius: 0; }
  .pad { padding-left: 18px; padding-right: 18px; }
  .sec { padding-top: 68px; padding-bottom: 68px; }
  .hero { min-height: min(720px, 76svh); min-height: max(480px, min(720px, 76svh)); padding: 30px 18px 38px; }
  .hero h1 { font-size: clamp(2.75rem, 12vw, 4.5rem); }
  .eyebrow { margin-bottom: 16px; font-size: 10px; letter-spacing: .16em; }
  .sub { margin: 20px auto 26px; font-size: 1rem; }
  .preview-heading h2 { font-size: clamp(2.1rem, 9vw, 3.4rem); }
  .w-head { padding: 12px 14px; }
  .tile { min-width: 0; padding: 16px; }
  .fields { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .fields > :last-child { grid-column: 1 / -1; }
  .cell { min-width: 0; padding: 20px; border-radius: 20px; }
  .cell h3 { font-size: 19px; }
  .streak-dots { gap: clamp(6px, 2.1vw, 11px); }
  .streak-dots span { width: clamp(26px, 8vw, 42px); border-radius: 9px; }
  .bar { grid-template-columns: minmax(66px, 82px) minmax(0, 1fr) 42px; gap: 7px; font-size: 11px; }
  .plans { gap: 14px; }
  .plan { min-width: 0; padding: 24px; border-radius: 22px; }
  .plan h3 { gap: 10px; }
  .price { font-size: clamp(42px, 13vw, 52px); }
  .faq-section { padding-top: 58px; padding-bottom: 62px; }
  .faq-section .faq-title { margin-bottom: 28px; }
  .faq-question { gap: 12px; padding-right: 2px; font-size: 15px; }
  .faq-question-icon { width: 36px; height: 36px; }
  .faq-answer-card { min-height: 300px; padding: 24px; border-radius: 22px; }
  .faq-answer-footer { margin-top: 32px; }
  .contact { padding-top: 42px; padding-bottom: 28px; }
  .contact-inner { padding: 24px 18px; }
  .contact h2 { font-size: clamp(1.8rem, 8vw, 2.5rem); text-wrap: balance; }
  .contact-link { display: inline-flex; align-items: center; justify-content: center; gap: 8px; max-width: 100%; overflow-wrap: anywhere; }
  .site-footer { min-height: 0; padding-right: 18px; padding-bottom: max(18px, env(safe-area-inset-bottom)); padding-left: 18px; }
  .site-footer-marquee { margin-top: 34px; }
  .site-footer-main { padding: 82px 0 52px; }
  .site-footer-main h2 { max-width: 100%; font-size: clamp(1.9rem, 9.5vw, 3.5rem); letter-spacing: -.07em; line-height: 1.02; }
  .site-footer-copy { max-width: 36ch; font-size: 14px; }
  .site-footer-cta { min-height: 48px; padding: 14px 24px; }
  .site-footer-legal { gap: 8px; }
  .site-footer-legal a { min-height: 44px; padding: 10px 14px; font-size: 12px; }
  .site-footer-giant { right: auto; bottom: 96px; left: 50%; font-size: clamp(7rem, 29vw, 11rem); }
  .site-footer-bottom { align-items: center; flex-direction: column; gap: 8px; padding-top: 16px; text-align: center; }
  .site-footer-copyright { max-width: 100%; flex-wrap: wrap; justify-content: center; white-space: normal; text-align: center; }
  .site-footer-top { min-height: 40px; align-self: center; }
  .steps-progress { display: none; }
  #about.sec.pad { padding-right: clamp(22px, 7vw, 32px); padding-left: clamp(22px, 7vw, 32px); }
  #about .steps { width: min(100%, 400px); margin-right: auto; margin-left: auto; gap: 30px; }
  #about .step { display: flex; flex-direction: column; align-items: center; padding: 0 12px; text-align: center; }
  #about .step .n { margin-bottom: 16px; }
  #about .step p { max-width: 32ch; text-align: center; }
}

@media (max-width: 380px) {
  .pad { padding-right: 14px; padding-left: 14px; }
  .hero { padding-right: 14px; padding-left: 14px; }
  .hero h1 { font-size: clamp(2.55rem, 12vw, 3.3rem); }
  .btn { min-height: 46px; padding: 13px 22px; }
  .cell { padding: 17px; }
  .bar { grid-template-columns: 62px minmax(0, 1fr) 36px; gap: 6px; font-size: 10px; }
  .plan { padding: 19px; }
  .faq-answer-card { padding: 20px; }
  .site-footer { padding-right: 14px; padding-left: 14px; }
  .site-footer-main { padding: 68px 4px 42px; }
  .site-footer-main h2 { font-size: clamp(1.8rem, 9.5vw, 2.3rem); }
  .site-footer-copy { padding-right: 4px; padding-left: 4px; }
  .site-footer-cta { padding-right: 20px; padding-left: 20px; }
  .site-footer-legal { gap: 6px; }
  .site-footer-legal a { padding-right: 11px; padding-left: 11px; font-size: 11px; }
  .contact { padding-top: 34px; padding-bottom: 22px; }
  .contact-inner { padding: 20px 14px; border-radius: 22px; }
  .contact h2 { font-size: clamp(1.45rem, 7vw, 1.75rem); line-height: 1.12; }
  .contact-eyebrow { margin-bottom: 8px; }
  .contact-link { margin-top: 12px; font-size: 13px; }
}

@media (max-width: 860px) {
  .steps-progress { display: none; }
}

@media (max-height: 520px) and (orientation: landscape) {
  .hero { min-height: max(360px, calc(100svh - 72px)); }
}

/* Keep the step cards transparent over the dotted surface in light mode. */
:root:not([data-theme="dark"]) .steps .step,
:root:not([data-theme="dark"]) .steps .step:hover {
  background: transparent;
  box-shadow: none;
}

      `}</style>

      <div className="shell">

        <LandingNavbar isAuthenticated={Boolean(user)} />

        <main>
          {heroTitleComponent}
          {/* NEW HERO PICTURE: the journal entry + discipline calendar (replaces the old dashboard screenshot) */}
          <section className="stage" aria-label="Product preview">
            <ContainerScroll
              titleComponent={(
                <div className="preview-heading">
                  <p>TRADING PERFORMANCE, AT A GLANCE</p>
                  <h2>Your trading, in focus</h2>
                </div>
              )}
            >
              <div className="shot">
              <div className="app journal-preview">
  <aside className="side" data-lenis-prevent aria-label="Journal preview navigation">
    <div className="ap-brand"><BrandLogo size="sm" className="landing-nav-logo" /><span><b>ThePrecisionLab</b><small>My Journal</small></span></div>
    <button type="button" className="nav-i" data-active="true" aria-disabled="true"><span aria-hidden="true">▤</span>Journal</button>
    <button type="button" className="nav-i" aria-disabled="true"><span aria-hidden="true">▦</span>Accounts</button>
    <button type="button" className="nav-i" aria-disabled="true"><span aria-hidden="true">▥</span>Statistics</button>
    <button type="button" className="nav-i" aria-disabled="true"><span aria-hidden="true">▦</span>Calendar</button>
    <div className="ap-user"><i>T</i><span><b>Trader</b><small>Journal preview</small></span></div>
  </aside>
  <div className="ap-main">
    <div className="ap-tb">
      <div><h3>Journal</h3><p>Every trade, structured and searchable.</p></div>
      <div className="preview-toolbar">
        <button type="button" aria-disabled="true">Filters</button>
        <button type="button" aria-disabled="true">+ New trade</button>
      </div>
    </div>
    <div className="journal-pane">
      <div className="journal-summary">
        <div><h2>Your trades</h2><p>Review your recent trading activity.</p></div>
        <button type="button" aria-disabled="true" className="ap-btn">+ Add trade</button>
      </div>
      <div className="journal-kpis" aria-label="Journal summary preview">
        <div className="journal-kpi"><small>Trades logged</small><strong>24</strong></div>
        <div className="journal-kpi"><small>Win rate</small><strong>62.5%</strong></div>
        <div className="journal-kpi"><small>Total P&amp;L</small><strong className="pos">+$1,240</strong></div>
      </div>
      <div className="journal-table-wrap" data-lenis-prevent>
        <table className="journal-table">
          <thead><tr><th>Trade #</th><th>Date</th><th>Instrument</th><th>Direction</th><th>Result</th><th>Entry</th><th>Exit</th><th>Profit / loss</th><th>Realized R</th></tr></thead>
          <tbody>
            <tr tabIndex={0}><td className="trade-number">#24</td><td>Oct 4, 2026</td><td><span className="journal-symbol"><span className="symbol-mark">NQ</span>NQ</span></td><td><span className="journal-pill long">Long</span></td><td><span className="journal-pill win">Win</span></td><td>18,542.25</td><td>18,566.75</td><td className="pos">+$245.00</td><td className="pos">+2.00R</td></tr>
            <tr tabIndex={0}><td className="trade-number">#23</td><td>Oct 3, 2026</td><td><span className="journal-symbol"><span className="symbol-mark">ES</span>ES</span></td><td><span className="journal-pill short">Short</span></td><td><span className="journal-pill loss">Loss</span></td><td>5,742.50</td><td>5,751.00</td><td className="neg">−$170.00</td><td className="neg">−1.00R</td></tr>
            <tr tabIndex={0}><td className="trade-number">#22</td><td>Oct 2, 2026</td><td><span className="journal-symbol"><span className="symbol-mark">SI</span>SI</span></td><td><span className="journal-pill long">Long</span></td><td><span className="journal-pill win">Win</span></td><td>47.285</td><td>47.610</td><td className="pos">+$325.00</td><td className="pos">+1.50R</td></tr>
            <tr tabIndex={0}><td className="trade-number">#21</td><td>Oct 1, 2026</td><td><span className="journal-symbol"><span className="symbol-mark">NQ</span>NQ</span></td><td><span className="journal-pill long">Long</span></td><td><span className="journal-pill win">Win</span></td><td>18,410.00</td><td>18,429.50</td><td className="pos">+$195.00</td><td className="pos">+1.00R</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</div>
              </div>
            </ContainerScroll>
            <p className="note-under">Made for traders who want to build better habits.</p>
          </section>

          {/* MODEL SECTION: GXT and Lathyrus */}
          <section className="model pad" id="models">
            <div className="duo" ref={modelImagesRef}>
              <motion.img className="av g1" style={{ x: prefersReducedMotion ? 0 : modelLeftX, rotateY: prefersReducedMotion ? 0 : modelLeftRotate, scale: prefersReducedMotion ? 1 : modelScale, opacity: prefersReducedMotion ? 1 : modelOpacity, transformOrigin: 'center center' }} src="data:image/png;base64,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" alt="GXT logo" width="128" height="128" />
              <motion.img className="av g2" style={{ x: prefersReducedMotion ? 0 : modelRightX, rotateY: prefersReducedMotion ? 0 : modelRightRotate, scale: prefersReducedMotion ? 1 : modelScale, opacity: prefersReducedMotion ? 1 : modelOpacity, transformOrigin: 'center center' }} src="data:image/png;base64,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" alt="Lathyrus logo" width="128" height="128" />
            </div>
            <TextScrollAnimation
              className="model-heading-scroll"
              segments={[
                { text: 'Built for the ' },
                { text: 'GxT', className: 'model-heading-name' },
                { text: ' and ' },
                { text: 'Lathyrus', className: 'model-heading-name' },
                { text: ' models' },
              ]}
            />
            <p className="lead">If you're learning how GXT or Lathyrus trade, ThePrecisionLab gives you one place to follow the model, log every trade against it and watch yourself get better.</p>
            <p className="disclaim">ThePrecisionLab is an independent tool. It isn't affiliated with or endorsed by GXT or Lathyrus.</p>
          </section>

          {/* FEATURES */}
          <section className="sec pad" id="features">
            <div className="head">
              <WordPullUp
                className="feature-word-pull-up"
                segments={[
                  { text: 'Built around the habit, ' },
                  { text: 'not just the numbers', className: 'g' },
                ]}
              />
              <p>Most journals record what happened. ThePrecisionLab also shows whether you followed your own rules.</p>
            </div>
            <div className="bento">
              <ScrollFeatureCard className="cell white c-a" direction="up">
                <div><h3>Log a trade in under a minute</h3><p>Enter the trade, tag the setup, note how you felt. ThePrecisionLab works out R multiple for you.</p></div>
                <div className="mini" aria-hidden="true">
                  <div className="f"><span>Symbol</span><b>NQ</b></div>
                  <div className="f"><span>Setup</span><b>SMT-BREAK</b></div>
                  <div className="f"><span>Risk Reward</span><b><em className="rr pos">+2R</em></b></div>
                </div>
              </ScrollFeatureCard>

              <ScrollFeatureCard className="cell white c-c" direction="left">
                <div><h3>Streaks that mean something</h3><p>A day counts when you followed your plan, not when you happened to win.</p></div>
                <div className="streak-dots" aria-hidden="true"><span className="hit"></span><span className="hit"></span><span className="hit"></span><span className="hit"></span><span className="hit"></span><span className="hit"></span><span className="today"></span></div>
              </ScrollFeatureCard>

              <ScrollFeatureCard className="cell white c-d" direction="right">
                <div><h3>Reviews that ask the right questions</h3><p>A short weekly prompt helps you spot what to change.</p></div>
                <ul className="prompts">
                  <li>Which trade did I take that wasn't in my plan?</li>
                  <li>When did I feel rushed, and what happened next?</li>
                </ul>
              </ScrollFeatureCard>

              <ScrollFeatureCard className="cell white c-e" direction="up">
                <div><h3>See what actually pays you</h3><p>Compare your results by setup or by day of the week, and find the patterns you'd miss by eye.</p></div>
                <div className="seg" role="group" aria-label="Group results by">
                  <button type="button" data-set="setup" aria-pressed="true">Setup</button>
                  <button type="button" data-set="day" aria-pressed="false">Day</button>
                </div>
                <div className="bars" id="bars"></div>
                <p className="chart-note">Results in R, sample data.</p>
              </ScrollFeatureCard>
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section className="sec pad dots" id="about">
            <div className="head">
              <TextRevealByWord
                className="steps-heading"
                ghostOpacity={0.14}
                segments={[
                  { text: 'Three steps, ' },
                  { text: 'every trading day', className: 'g' },
                ]}
              />
              <p>A routine short enough to keep, and specific enough to improve your trading.</p>
            </div>
            <div className="steps" ref={stepsRef}>
              <motion.div className="steps-progress" style={{ scaleX: stepsLineProgress }} aria-hidden="true" />
              <div className="step"><div className="n">1</div><h3>Log the trade</h3><p>Record entry, exit, size and the reason you took it while it's fresh.</p></div>
              <div className="step"><div className="n">2</div><h3>Rate your discipline</h3><p>Tick the rules you followed. Your score and streak update right away.</p></div>
              <div className="step"><div className="n">3</div><h3>Review the week</h3><p>Look at your patterns, answer the weekly prompts, and pick one thing to fix.</p></div>
            </div>
          </section>

          {/* PRICING: free during testing, price to be announced */}
          <section className="sec pad" id="pricing">
            <div className="head">
              <TextRevealByWord
                className="pricing-text-reveal"
                segments={[
                  { text: 'Free to use, ' },
                  { text: 'while we test', className: 'g' },
                ]}
              />
              <p>ThePrecisionLab is still in testing. Use everything for free while we shape it with your feedback.</p>
            </div>
            <div className="plans" ref={plansRef}>
              <CometPricingCard className="plan" style={{ x: prefersReducedMotion ? 0 : firstPlanX, rotateY: prefersReducedMotion ? 0 : firstPlanRotate, opacity: prefersReducedMotion ? 1 : plansOpacity, transformOrigin: 'center center' }} scrollRotateY={firstPlanRotate} reducedMotion={!!prefersReducedMotion}>
                <h3>Right now <span className="tag">In testing</span></h3>
                <div className="price">Free<small>during testing</small></div>
                <ul>
                  <li><svg viewBox="0 0 16 16"><path d="M3 8.5l3.2 3L13 4.5"/></svg>Unlimited journal entries</li>
                  <li><svg viewBox="0 0 16 16"><path d="M3 8.5l3.2 3L13 4.5"/></svg>Discipline score and streaks</li>
                  <li><svg viewBox="0 0 16 16"><path d="M3 8.5l3.2 3L13 4.5"/></svg>Performance analytics</li>
                  <li><svg viewBox="0 0 16 16"><path d="M3 8.5l3.2 3L13 4.5"/></svg>Weekly review prompts</li>
                </ul>
                <Link className="btn ghost" to="/login">Start for free</Link>
              </CometPricingCard>
              <CometPricingCard className="plan feat" style={{ x: prefersReducedMotion ? 0 : secondPlanX, rotateY: prefersReducedMotion ? 0 : secondPlanRotate, opacity: prefersReducedMotion ? 1 : plansOpacity, transformOrigin: 'center center' }} scrollRotateY={secondPlanRotate} reducedMotion={!!prefersReducedMotion}>
                <h3>Later</h3>
                <div className="price sm">Pricing revealing soon</div>
                <p className="soonp">We're still testing ThePrecisionLab with traders like you. Pricing will be announced here soon.</p>
                <p className="soonp">Nothing to pay while ThePrecisionLab is in testing.</p>
              </CometPricingCard>
            </div>
            <p className="fine">Pricing to be announced.</p>
          </section>

          {/* FAQ */}
          <section className="sec pad faq-section" id="faq">
            <motion.h2
              className="faq-title"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 18 }}
              whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.7 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            >
              FAQ
            </motion.h2>
            <div className="faq-layout">
              <motion.div
                className="faq-questions"
                role="tablist"
                aria-label="Frequently asked questions"
                aria-orientation="vertical"
                initial={prefersReducedMotion ? false : { opacity: 0, x: -24 }}
                whileInView={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              >
                {landingFaqs.map((item, index) => (
                  <motion.button
                    key={item.question}
                    type="button"
                    className="faq-question"
                    id={`faq-tab-${index}`}
                    role="tab"
                    aria-selected={activeFaq === index}
                    aria-controls="faq-answer"
                    onClick={() => setActiveFaq(index)}
                    initial={prefersReducedMotion ? false : { opacity: 0, y: 14 }}
                    whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{
                      duration: prefersReducedMotion ? 0 : 0.45,
                      delay: prefersReducedMotion ? 0 : index * 0.07,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                  >
                    <span className="faq-question-icon" aria-hidden="true">Q</span>
                    <span>{item.question}</span>
                    {activeFaq === index && <span className="faq-question-arrow" aria-hidden="true">→</span>}
                  </motion.button>
                ))}
              </motion.div>
              <motion.div
                className="faq-answer-card"
                id="faq-answer"
                role="tabpanel"
                aria-labelledby={`faq-tab-${activeFaq}`}
                onPointerMove={(event) => {
                  if (prefersReducedMotion) return;
                  const bounds = event.currentTarget.getBoundingClientRect();
                  faqPointerX.set((event.clientX - bounds.left) / bounds.width - 0.5);
                  faqPointerY.set((event.clientY - bounds.top) / bounds.height - 0.5);
                }}
                onPointerLeave={() => {
                  faqPointerX.set(0);
                  faqPointerY.set(0);
                }}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 30 }}
                whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.25 }}
                transition={{ duration: 0.75, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  rotateX: prefersReducedMotion ? 0 : faqRotateX,
                  rotateY: prefersReducedMotion ? 0 : faqRotateY,
                  transformPerspective: 1000,
                }}
              >
                <motion.div className="faq-comet-glow" aria-hidden="true" style={{ background: faqGlow }} />
                <motion.p
                  className="faq-answer-copy"
                  key={activeFaq}
                  aria-live="polite"
                  initial={prefersReducedMotion ? false : { opacity: 0, clipPath: 'inset(0 100% 0 0)' }}
                  animate={{ opacity: 1, clipPath: 'inset(0 0% 0 0)' }}
                  transition={{ duration: prefersReducedMotion ? 0 : 0.7, ease: [0.22, 1, 0.36, 1] }}
                >
                  {landingFaqs[activeFaq]!.answer}
                </motion.p>
                <div className="faq-answer-footer">
                  <span className="faq-brand-mark" aria-label="ThePrecisionLab"><BrandLogo size="lg" /></span>
                  <div className="faq-controls">
                    <button type="button" aria-label="Previous question" onClick={() => setActiveFaq((activeFaq + landingFaqs.length - 1) % landingFaqs.length)}>‹</button>
                    <button type="button" aria-label="Next question" onClick={() => setActiveFaq((activeFaq + 1) % landingFaqs.length)}>›</button>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          
        </main>

        {/* CONTACT */}
        <section className="contact sec" id="contact">
          <motion.div
            className="contact-inner"
            variants={contactCardVariants}
            initial={prefersReducedMotion ? false : 'hidden'}
            whileInView="visible"
            viewport={{ once: true, amount: 0.35 }}
          >
            <motion.p className="contact-eyebrow" variants={contactItemVariants}>CONTACT</motion.p>
            <motion.h2 variants={contactItemVariants}>Have a question? <span className="g">Get in touch.</span></motion.h2>
            <motion.a
              className="contact-link"
              href="mailto:Dhruvcrypto87@gmail.com"
              aria-label="Email Dhruv at Dhruvcrypto87@gmail.com"
              variants={contactItemVariants}
            >
              Dhruvcrypto87@gmail.com
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4"/>
              </svg>
            </motion.a>
          </motion.div>
        </section>

        <motion.footer ref={footerRef} className="site-footer">
          <div className="site-footer-marquee" aria-hidden="true">
            <div className="site-footer-marquee-track">
              <span>LOG WITH INTENTION <i>✳</i> REVIEW WITH CLARITY <i>✳</i> BUILD BETTER HABITS <i>✳</i> </span>
              <span>LOG WITH INTENTION <i>✳</i> REVIEW WITH CLARITY <i>✳</i> BUILD BETTER HABITS <i>✳</i> </span>
              <span>LOG WITH INTENTION <i>✳</i> REVIEW WITH CLARITY <i>✳</i> BUILD BETTER HABITS <i>✳</i> </span>
              <span>LOG WITH INTENTION <i>✳</i> REVIEW WITH CLARITY <i>✳</i> BUILD BETTER HABITS <i>✳</i> </span>
            </div>
          </div>
          <motion.div
            className="site-footer-giant"
            aria-hidden="true"
            style={{
              y: prefersReducedMotion ? 0 : footerGiantY,
              scale: prefersReducedMotion ? 1 : footerGiantScale,
              opacity: prefersReducedMotion ? 1 : footerGiantOpacity,
            }}
          >
            PRECI
          </motion.div>
          <div className="site-footer-main">
            <motion.h2
              style={{
                y: prefersReducedMotion ? 0 : footerHeadingY,
                opacity: prefersReducedMotion ? 1 : footerHeadingOpacity,
              }}
            >
              Ready to <span>begin?</span>
            </motion.h2>
            <motion.div
              className="site-footer-scroll-links"
              style={{
                y: prefersReducedMotion ? 0 : footerLinksY,
                opacity: prefersReducedMotion ? 1 : footerLinksOpacity,
              }}
            >
              <MagneticFooterLink to={user ? '/dashboard' : '/login?mode=signup'} reducedMotion={!!prefersReducedMotion}>
                Go to Journal
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
              </MagneticFooterLink>
              <div className="site-footer-legal" aria-label="Helpful links">
                <MagneticFooterAnchor href="#contact" className="site-footer-legal-link" reducedMotion={!!prefersReducedMotion}>Privacy Policy</MagneticFooterAnchor>
                <MagneticFooterAnchor href="#contact" className="site-footer-legal-link" reducedMotion={!!prefersReducedMotion}>Terms of Service</MagneticFooterAnchor>
                <MagneticFooterAnchor href="#contact" className="site-footer-legal-link" reducedMotion={!!prefersReducedMotion}>Support</MagneticFooterAnchor>
              </div>
            </motion.div>
          </div>
          <div className="site-footer-bottom">
            <span className="site-footer-copyright">© 2026 <BrandLogo size="sm" /> ThePrecisionLab. All rights reserved.</span>
            <MagneticFooterAnchor href="#home" className="site-footer-top" reducedMotion={!!prefersReducedMotion}>
              ↑ <span>Back to top</span>
            </MagneticFooterAnchor>
          </div>
        </motion.footer>
      </div>
    </>
  );
}
