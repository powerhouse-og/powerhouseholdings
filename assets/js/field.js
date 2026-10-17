/* =============================================================================
   Powerhouse Holdings — hero: the charged grid
   The hero's column grid made live. Vertical hairlines bow around the cursor
   like strings around a presence, and the brand's charged seam slides across
   the grid to meet it, a slow pulse riding down the line.

   Deliberately rectilinear — Powerhouse Digital's hero is an organic contour
   field; the parent's is architecture. Canvas2D, no dependencies.

   Degrades completely: reduced motion or any failure leaves the static CSS
   field (grid + seam) exactly as it was.
   ========================================================================== */
(function () {
  'use strict';

  function init() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const hero = document.querySelector('.hero');
    if (!hero) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'hero-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    hero.prepend(canvas);
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) { canvas.remove(); return; }

    hero.classList.add('has-field');

    /* ---- palette ---- */
    const INK = '#0A0A0C';
    const BONE = (a) => `rgba(237,236,233,${a})`;
    const VIOLET = (a) => `rgba(111,91,232,${a})`;
    const LIFT = (a) => `rgba(147,132,242,${a})`;

    /* ---- state ---- */
    let dpr = 1, W = 0, H = 0;
    let SPACING = 30, SEGS = 36;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0, init: false, lastReal: 0 };
    let seamX = 0;                      /* the charged seam's current x */
    let visible = true, raf = 0, last = 0, frames = 0, slow = 0, quality = 1;
    const start = performance.now();

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2) * quality;
      W = Math.max(1, Math.round(canvas.clientWidth * dpr));
      H = Math.max(1, Math.round(canvas.clientHeight * dpr));
      canvas.width = W; canvas.height = H;
      SPACING = Math.round(34 * dpr);                 /* ~34 CSS px between strings */
      SEGS = Math.max(24, Math.round(36 * quality));
      if (!mouse.init) {
        mouse.x = mouse.tx = W * 0.62; mouse.y = mouse.ty = H * 0.46;
        seamX = W / 3;                  /* where the static seam lives */
        mouse.init = true;
      }
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    window.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.tx = (e.clientX - r.left) * dpr;
      mouse.ty = (e.clientY - r.top) * dpr;
      mouse.lastReal = performance.now();
    }, { passive: true });

    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) kick(); }).observe(canvas);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });

    /* displacement of a point (x, y) given the presence at (mx, my):
       lines bow away horizontally, strongest beside the cursor, fading with
       vertical distance — strings parting around a hand. */
    function bend(x, y, mx, my, R) {
      const dx = x - mx, dy = y - my;
      const fall = Math.exp(-(dx * dx) / (2 * R * R) - (dy * dy) / (2 * (R * 1.6) * (R * 1.6)));
      const dir = dx === 0 ? 0 : dx / Math.abs(dx);
      return dir * fall * R * 0.34;
    }

    function drawLine(x0, t, mx, my, R, intro, stroke, width, pulseT) {
      /* intro: lines grow downward, staggered by x */
      const grow = Math.min(1, Math.max(0, intro * 2.2 - (x0 / W) * 1.0));
      if (grow <= 0) return;
      const yMax = H * grow;

      ctx.beginPath();
      for (let i = 0; i <= SEGS; i++) {
        const y = (H / SEGS) * i;
        if (y > yMax) break;
        const sway = Math.sin(t * 0.00035 + x0 * 0.011 + y * 0.0016) * dpr * 1.1;
        const x = x0 + bend(x0, y, mx, my, R) + sway;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.stroke();

      /* a pulse riding down the charged line */
      if (pulseT !== undefined) {
        const py = ((pulseT % 4200) / 4200) * (H + 220) - 110;
        if (py > -110 && py < yMax + 110) {
          const sway = Math.sin(t * 0.00035 + x0 * 0.011 + py * 0.0016) * dpr * 1.1;
          const px = x0 + bend(x0, py, mx, my, R) + sway;
          const g = ctx.createLinearGradient(0, py - 90 * dpr, 0, py + 90 * dpr);
          g.addColorStop(0, LIFT(0));
          g.addColorStop(0.5, LIFT(0.9));
          g.addColorStop(1, LIFT(0));
          ctx.beginPath();
          ctx.moveTo(px, Math.max(0, py - 90 * dpr));
          ctx.lineTo(px, Math.min(yMax, py + 90 * dpr));
          ctx.strokeStyle = g;
          ctx.lineWidth = 1.6 * dpr;
          ctx.stroke();
        }
      }
    }

    function frame(now) {
      raf = 0;
      if (!visible || document.hidden) return;
      const dt = now - (last || now); last = now;

      /* adaptive: a struggling machine gets fewer segments, not jank */
      if (frames++ > 30 && quality > 0.6) {
        slow = dt > 24 ? slow + 1 : Math.max(0, slow - 1);
        if (slow > 40) { quality = 0.6; slow = 0; resize(); }
      }

      /* idle or touch: the presence wanders on its own */
      if (now - mouse.lastReal > 4000) {
        const a = now * 0.00011;
        mouse.tx = W * (0.5 + 0.3 * Math.sin(a) + 0.07 * Math.sin(a * 2.3));
        mouse.ty = H * (0.48 + 0.22 * Math.cos(a * 0.7));
      }
      mouse.x += (mouse.tx - mouse.x) * 0.06;
      mouse.y += (mouse.ty - mouse.y) * 0.06;
      seamX += (mouse.x - seamX) * 0.028;          /* the seam follows, unhurried */

      const t = now;
      const intro = Math.min(1, (now - start) / 2200);
      const R = Math.min(W, H) * 0.22;

      ctx.fillStyle = INK;
      ctx.fillRect(0, 0, W, H);

      /* a quiet halo around the presence */
      const halo = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, R * 2.4);
      halo.addColorStop(0, VIOLET(0.075 * intro));
      halo.addColorStop(1, VIOLET(0));
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, W, H);

      /* the grid */
      const n = Math.floor(W / SPACING);
      for (let i = 0; i <= n; i++) {
        const x0 = i * SPACING + (W - n * SPACING) / 2;
        const near = Math.exp(-Math.pow(x0 - mouse.x, 2) / (2 * R * R));
        const a = 0.07 + near * 0.2;
        drawLine(x0, t, mouse.x, mouse.y, R, intro, i % 5 === 0 ? BONE(Math.min(0.34, a * 1.6)) : BONE(a), dpr * (i % 5 === 0 ? 1 : 0.8));
      }

      /* the charged seam — one line of light, sliding to meet the cursor */
      const sg = ctx.createLinearGradient(0, 0, 0, H);
      sg.addColorStop(0, VIOLET(0));
      sg.addColorStop(0.25, VIOLET(0.75 * intro));
      sg.addColorStop(0.5, LIFT(0.95 * intro));
      sg.addColorStop(0.75, VIOLET(0.75 * intro));
      sg.addColorStop(1, VIOLET(0));
      ctx.save();
      ctx.shadowColor = VIOLET(0.6);
      ctx.shadowBlur = 14 * dpr;
      drawLine(seamX, t, mouse.x, mouse.y, R, intro, sg, 1.4 * dpr, t);
      ctx.restore();

      /* settle toward the hero's base so the copy owns the lower third */
      const fade = ctx.createLinearGradient(0, H * 0.5, 0, H);
      fade.addColorStop(0, 'rgba(10,10,12,0)');
      fade.addColorStop(1, 'rgba(10,10,12,0.78)');
      ctx.fillStyle = fade;
      ctx.fillRect(0, 0, W, H);

      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
    kick();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
