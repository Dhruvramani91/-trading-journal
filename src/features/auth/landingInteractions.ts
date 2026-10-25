// @ts-nocheck
// Imperative interactions for the static landing-page demo, kept outside eval so the site CSP can remain strict.
export function initializeLandingPageInteractions() {
  const appRoot = document.getElementById('app');
  if (appRoot?.dataset.landingInteractionsInitialized === 'true') return;
  if (appRoot) appRoot.dataset.landingInteractionsInitialized = 'true';

try{var t=localStorage.getItem("pj:theme")||localStorage.getItem("theme");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t);}catch(e){}

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
          '<clipPath id="equityReveal" clipPathUnits="userSpaceOnUse">'+
            '<rect class="equity-reveal-rect" x="'+L+'" y="'+T+'" width="'+iw.toFixed(1)+'" height="'+ih.toFixed(1)+'" style="--chart-reveal-width:'+iw.toFixed(1)+'px"/>'+
          '</clipPath>'+
        '</defs>';
        series+='<path class="area" d="'+areaPath+'" clip-path="url(#equityReveal)"/>';
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
}
