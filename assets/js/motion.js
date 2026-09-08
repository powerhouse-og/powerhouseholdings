/* =============================================================================
   Powerhouse Holdings — motion engine
   No dependencies, no build step. Everything here degrades to a plain,
   fully-legible document if JavaScript never runs or the visitor asks for
   reduced motion.

   Pieces:
     1. smooth scroll     — inertial wheel/keyboard scrolling (pointer:fine only)
     2. split             — display type broken into masked lines
     3. reveal            — resting states released on entry
     4. scroll-linked     — parallax, seams, deck stacking, hero handoff, progress
     5. counters          — figures that count up once
     6. chrome            — masthead, drawer, page-transition curtain
   ========================================================================== */
(() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const html = document.documentElement;
  const body = document.body;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  /* 0 → 1 over [a,b] */
  const range = (v, a, b) => clamp((v - a) / (b - a || 1), 0, 1);

  /* ==========================================================================
     1. SMOOTH SCROLL
     Wheel input is intercepted and the real scroll position is eased toward a
     target. Real scrolling (not a transformed container) is what keeps
     position:sticky, anchors and the browser's own find-on-page honest.
     ====================================================================== */
  const scroller = (() => {
    const on = finePointer && !reduced;
    let target = window.scrollY;
    let current = target;
    let raf = 0;
    let idle = true;

    const maxY = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

    function frame() {
      current = lerp(current, target, 0.098);
      if (Math.abs(target - current) < 0.35) { current = target; idle = true; }
      window.scrollTo(0, current);
      raf = idle ? 0 : requestAnimationFrame(frame);
    }
    function wake() {
      idle = false;
      if (!raf) raf = requestAnimationFrame(frame);
    }
    function to(y, instant) {
      target = clamp(y, 0, maxY());
      if (!on || instant) { current = target; window.scrollTo(0, target); return; }
      wake();
    }
    /* the page moved without us (browser restore, focus jump, touch) */
    function sync() { if (idle) { target = current = window.scrollY; } }

    if (on) {
      window.addEventListener('wheel', (e) => {
        if (e.ctrlKey) return;                       /* pinch-zoom */
        if (e.target.closest?.('[data-native-scroll]')) return;
        e.preventDefault();
        const mult = e.deltaMode === 1 ? 18 : e.deltaMode === 2 ? window.innerHeight : 1;
        target = clamp(target + e.deltaY * mult, 0, maxY());
        wake();
      }, { passive: false });

      window.addEventListener('keydown', (e) => {
        const t = e.target;
        if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t?.isContentEditable) return;
        const page = window.innerHeight * 0.86;
        const map = {
          PageDown: page, PageUp: -page, ' ': e.shiftKey ? -page : page,
          ArrowDown: 110, ArrowUp: -110, End: maxY(), Home: -maxY()
        };
        if (!(e.key in map)) return;
        e.preventDefault();
        if (e.key === 'End') to(maxY());
        else if (e.key === 'Home') to(0);
        else { target = clamp(target + map[e.key], 0, maxY()); wake(); }
      });

      window.addEventListener('scroll', sync, { passive: true });
      window.addEventListener('resize', () => { target = clamp(target, 0, maxY()); }, { passive: true });
      /* touch devices keep native momentum: nothing is intercepted there */
      window.addEventListener('touchstart', () => { target = current = window.scrollY; }, { passive: true });
    }
    return { to, get target() { return target; } };
  })();

  /* in-page anchors ride the same easing */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href');
    if (id.length < 2) return;
    const el = document.querySelector(id);
    if (!el) return;
    e.preventDefault();
    const top = el.getBoundingClientRect().top + window.scrollY - 76;
    scroller.to(top);
    history.replaceState(null, '', id);
  });

  /* ==========================================================================
     2. SPLIT — display type into masked lines
     Words are wrapped, measured, then regrouped into real visual lines so the
     mask follows the actual wrap at any viewport width.
     ====================================================================== */
  const splits = [];

  function wrapWords(node, out) {
    node.childNodes.forEach((child) => {
      if (child.nodeType === 3) {
        const words = child.textContent.split(/(\s+)/);
        words.forEach((w) => {
          if (!w) return;
          if (/^\s+$/.test(w)) { out.push(document.createTextNode(' ')); return; }
          const outer = document.createElement('span');
          outer.className = 'sp-w';
          const inner = document.createElement('span');
          inner.className = 'sp-i';
          inner.textContent = w;
          outer.appendChild(inner);
          out.push(outer);
        });
      } else if (child.nodeType === 1) {
        if (child.tagName === 'BR') { out.push(document.createElement('br')); return; }
        const kids = [];
        wrapWords(child, kids);
        kids.forEach((k) => {
          if (k.nodeType === 1 && k.classList?.contains('sp-w')) {
            const styled = child.cloneNode(false);
            const inner = k.firstChild;
            k.replaceChild(styled, inner);
            styled.appendChild(inner);
          }
          out.push(k);
        });
      }
    });
  }

  function split(el) {
    const source = el.dataset.spSource || el.innerHTML;
    el.dataset.spSource = source;
    el.innerHTML = source;

    const parts = [];
    wrapWords(el, parts);
    el.innerHTML = '';
    parts.forEach((p) => el.appendChild(p));

    /* group by measured top → real lines */
    const words = [...el.querySelectorAll('.sp-w')];
    if (!words.length) return;
    const lines = [];
    let top = null;
    words.forEach((w) => {
      const t = Math.round(w.offsetTop);
      if (top === null || Math.abs(t - top) > 4) { lines.push([]); top = t; }
      lines[lines.length - 1].push(w);
    });

    el.innerHTML = '';
    lines.forEach((line, li) => {
      const holder = document.createElement('span');
      holder.className = 'sp-l';
      line.forEach((w, wi) => {
        w.firstChild.style.setProperty('--sp-d', `${li * 90 + wi * 18}ms`);
        holder.appendChild(w);
        if (wi < line.length - 1) holder.appendChild(document.createTextNode(' '));
      });
      el.appendChild(holder);
    });
  }

  if (!reduced) {
    document.querySelectorAll('[data-split]').forEach((el) => { split(el); splits.push(el); });
  }

  /* ==========================================================================
     3. REVEAL
     ====================================================================== */
  const revealables = '[data-reveal],[data-draw],[data-mask],[data-split],[data-count]';

  if (reduced) {
    document.querySelectorAll(revealables).forEach((el) => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.classList.add('is-in');
        if (el.hasAttribute('data-count')) countUp(el);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.08 });

    document.querySelectorAll(revealables).forEach((el, i) => {
      /* stagger siblings that opt in through a group */
      const group = el.closest('[data-stagger]');
      if (group && !el.style.getPropertyValue('--rv-d')) {
        const peers = [...group.querySelectorAll('[data-reveal]')];
        el.style.setProperty('--rv-d', `${peers.indexOf(el) * (+group.dataset.stagger || 80)}ms`);
      }
      io.observe(el);
    });
  }

  /* ==========================================================================
     4. SCROLL-LINKED
     One read/write pass per frame over pre-measured elements.
     ====================================================================== */
  const parallax = [...document.querySelectorAll('[data-parallax]')];
  const seams = [...document.querySelectorAll('.field .seam')];
  const decks = [...document.querySelectorAll('.deck')];
  const stages = [...document.querySelectorAll('.stage')];
  const progress = document.querySelector('.progress');
  const masthead = document.querySelector('.masthead');

  let measures = new Map();
  function measure() {
    measures = new Map();
    [...parallax, ...seams, ...stages].forEach((el) => {
      const r = el.getBoundingClientRect();
      measures.set(el, { top: r.top + window.scrollY, h: r.height });
    });
  }

  let lastY = window.scrollY;
  function tick() {
    const y = window.scrollY;
    const vh = window.innerHeight;
    const max = Math.max(1, document.documentElement.scrollHeight - vh);

    if (progress) progress.style.setProperty('--p', (y / max).toFixed(4));

    if (masthead) {
      masthead.dataset.pinned = y > 24 ? 'true' : 'false';
      const hide = y > lastY + 4 && y > vh * 0.6 && body.dataset.menu !== 'open';
      const show = y < lastY - 4 || y < 120;
      if (hide) masthead.dataset.hidden = 'true';
      else if (show) masthead.dataset.hidden = 'false';
    }

    if (!reduced) {
      parallax.forEach((el) => {
        const m = measures.get(el); if (!m) return;
        const p = range(y, m.top - vh, m.top + m.h) - 0.5;      /* -0.5 → 0.5 */
        el.style.setProperty('--par', `${(p * (+el.dataset.parallax || 60) * -2).toFixed(2)}px`);
      });

      seams.forEach((el) => {
        const m = measures.get(el); if (!m) return;
        el.style.setProperty('--seam', range(y, m.top - vh * 0.9, m.top - vh * 0.1).toFixed(3));
      });

      /* hero recedes behind the section that follows it */
      stages.forEach((stage) => {
        const m = measures.get(stage); if (!m) return;
        const veil = stage.querySelector('.stage-veil');
        const hero = stage.querySelector('.hero');
        const p = range(y, m.top, m.top + vh * 0.92);
        if (veil) veil.style.setProperty('--veil', (p * 0.86).toFixed(3));
        if (hero) {
          hero.style.transform = `scale(${(1 - p * 0.055).toFixed(4)})`;
          hero.style.filter = p > 0.02 ? `blur(${(p * 5).toFixed(2)}px)` : '';
        }
      });

      /* stacked cards settle back as the next one covers them */
      decks.forEach((deck) => {
        const cards = [...deck.children].filter((c) => c.classList.contains('deck-card'));
        cards.forEach((card, i) => {
          const next = cards[i + 1];
          if (!next) { card.style.setProperty('--dk-s', 1); card.style.setProperty('--dk-y', '0px'); return; }
          const r = next.getBoundingClientRect();
          const p = range(vh - r.top, 0, vh * 0.75);
          card.style.setProperty('--dk-s', (1 - p * 0.055).toFixed(4));
          card.style.setProperty('--dk-y', `${(-p * 18).toFixed(1)}px`);
        });
      });
    }

    lastY = y;
    requestAnimationFrame(tick);
  }

  /* ==========================================================================
     5. COUNTERS
     ====================================================================== */
  function countUp(el) {
    const to = parseFloat(el.dataset.count);
    if (Number.isNaN(to)) return;
    if (reduced) { el.textContent = el.dataset.countFormat === 'decimal' ? to.toFixed(1) : Math.round(to).toLocaleString(); return; }
    const dur = 1500;
    const dec = el.dataset.countFormat === 'decimal';
    const t0 = performance.now();
    const step = (now) => {
      const p = clamp((now - t0) / dur, 0, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = to * eased;
      el.textContent = dec ? v.toFixed(1) : Math.round(v).toLocaleString();
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ==========================================================================
     6. CHROME — drawer, curtain, resize
     ====================================================================== */
  const toggle = document.querySelector('.nav-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const open = body.dataset.menu === 'open';
      body.dataset.menu = open ? 'closed' : 'open';
      toggle.setAttribute('aria-expanded', String(!open));
    });
    document.querySelectorAll('.drawer a').forEach((a) =>
      a.addEventListener('click', () => { body.dataset.menu = 'closed'; }));
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && body.dataset.menu === 'open') {
        body.dataset.menu = 'closed'; toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* page-transition curtain: out on leave, up on arrive.
     rAF gives the curtain one painted frame to animate from; the timeout and
     load listener are safety nets — rAF never fires in a hidden tab, and the
     curtain must not outlive the load under any circumstances. */
  const arrive = () => { body.dataset.loaded = 'true'; };
  requestAnimationFrame(arrive);
  setTimeout(arrive, 400);
  window.addEventListener('load', arrive);
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) { body.dataset.leaving = 'false'; arrive(); }
  });
  if (!reduced) {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href]');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.hash) return;
      if (a.getAttribute('href').startsWith('#') || url.protocol === 'mailto:') return;
      e.preventDefault();
      body.dataset.leaving = 'true';
      setTimeout(() => { location.href = url.href; }, 480);
    });
  }

  let rw = window.innerWidth;
  const onResize = () => {
    measure();
    if (!reduced && Math.abs(window.innerWidth - rw) > 60) {
      rw = window.innerWidth;
      splits.forEach((el) => {
        const wasIn = el.classList.contains('is-in');
        split(el);
        if (wasIn) el.classList.add('is-in');
      });
    }
  };
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(onResize, 160); }, { passive: true });
  window.addEventListener('load', measure);
  document.fonts?.ready.then(() => {
    onResize();
    /* re-split once the serif is actually in play so the lines are true */
  });

  measure();
  requestAnimationFrame(tick);
})();
