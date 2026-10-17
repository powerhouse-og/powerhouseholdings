/* =============================================================================
   Powerhouse Holdings — hero energy field
   A WebGL2 contour field that bends toward the cursor: the charged seam,
   alive. Ported from Powerhouse Digital's field and calmed for the parent
   brand — violet instead of volt, longer time constants, quieter pulses.

   Degrades completely: no WebGL2, reduced motion, or any failure leaves the
   CSS field (grid + seam) exactly as it was.
   ========================================================================== */
(function () {
  'use strict';

  const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

  const FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform float uIntro;
uniform float uScroll;
out vec4 outColor;

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}
float gnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(dot(hash2(i), f), dot(hash2(i + vec2(1, 0)), f - vec2(1, 0)), u.x),
             mix(dot(hash2(i + vec2(0, 1)), f - vec2(0, 1)), dot(hash2(i + vec2(1, 1)), f - vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 4; i++) { v += a * gnoise(p); p = m * p; a *= 0.5; }
  return v;
}
float iso(float k, float w) {
  float fw = fwidth(k);
  float g = abs(fract(k) - 0.5) * 2.0;
  return 1.0 - smoothstep(0.0, fw * w, 1.0 - g);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 p0 = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec2 m = (uMouse - 0.5 * uRes) / uRes.y;
  float t = uTime * 0.028;                       /* slower than Digital — unhurried */

  vec2 p = p0;
  vec2 d = p - m;
  float md = length(d);
  p -= d * exp(-md * md * 7.0) * 0.30;           /* gentler cursor lens */
  p.y -= uScroll * 0.6;

  vec2 q = vec2(fbm(p * 1.05 + vec2(0.0, t)), fbm(p * 1.05 + vec2(5.2, -t)));
  float n = fbm(p * 0.85 + q * 1.7 + vec2(t * 0.6, t * 0.2));

  float k = n * 16.0;
  float line = iso(k, 2.2);
  float major = iso(k / 6.0, 3.0);
  float pulse = pow(0.5 + 0.5 * sin(k * 0.4 - uTime * 0.9), 26.0);

  vec3 ink    = vec3(0.039, 0.039, 0.047);       /* Obsidian */
  vec3 bone   = vec3(0.929, 0.925, 0.914);       /* Bone */
  vec3 violet = vec3(0.435, 0.357, 0.910);       /* Ultraviolet */
  vec3 lift   = vec3(0.576, 0.518, 0.949);       /* Ultraviolet lift */

  float glow = exp(-md * md * 5.5);
  vec3 col = ink;
  col += bone * line * 0.045;
  col += bone * major * 0.07;
  col += violet * line * (glow * 0.6 + pulse * 0.16);
  col += lift * major * pulse * 0.22;
  col += violet * glow * 0.022;

  float vig = smoothstep(1.35, 0.25, length((uv - vec2(0.55, 0.62)) * vec2(asp * 0.7, 1.0)));
  col = mix(ink, col, vig);
  col = mix(col, ink, smoothstep(0.55, 0.0, uv.y) * 0.65);  /* settle toward the hero's base */

  /* power-on: a single soft front, once */
  float r = length(p0 - vec2(-0.2, 0.15));
  float front = uIntro * 2.0;
  float reveal = smoothstep(front, front - 0.5, r);
  float ring = exp(-pow((r - front + 0.08) * 10.0, 2.0)) * (1.0 - smoothstep(0.7, 1.0, uIntro));
  col = mix(ink, col, reveal);
  col += violet * ring * (line * 0.5 + 0.03);

  float gr = fract(sin(dot(gl_FragCoord.xy + fract(uTime) * 100.0, vec2(12.9898, 78.233))) * 43758.5453);
  col += (gr - 0.5) * 0.016;

  outColor = vec4(col, 1.0);
}`;

  function init() {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const hero = document.querySelector('.hero');
    if (!hero) return;

    const canvas = document.createElement('canvas');
    canvas.className = 'hero-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    hero.prepend(canvas);

    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' });
    if (!gl) { canvas.remove(); return; }

    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = sh(gl.VERTEX_SHADER, VERT), fs = sh(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) { canvas.remove(); return; }
    const prog = gl.createProgram();
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return; }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const U = {};
    ['uRes', 'uTime', 'uMouse', 'uIntro', 'uScroll'].forEach(n => (U[n] = gl.getUniformLocation(prog, n)));

    hero.classList.add('has-field');

    let dpr = 1, w = 0, h = 0, quality = 1;
    const mouse = { x: 0, y: 0, tx: 0, ty: 0, init: false, lastReal: 0 };

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5) * quality;
      w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      canvas.width = w; canvas.height = h;
      gl.viewport(0, 0, w, h);
      if (!mouse.init) { mouse.x = mouse.tx = w * 0.64; mouse.y = mouse.ty = h * 0.58; mouse.init = true; }
    }
    resize();
    window.addEventListener('resize', resize, { passive: true });

    window.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.tx = (e.clientX - r.left) * dpr;
      mouse.ty = (r.height - (e.clientY - r.top)) * dpr;
      mouse.lastReal = performance.now();
    }, { passive: true });

    let visible = true;
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) kick(); }).observe(canvas);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) kick(); });

    const start = performance.now();
    let raf = 0, last = 0, frames = 0, slow = 0, intro = 0;

    function frame(now) {
      raf = 0;
      if (!visible || document.hidden) return;
      const dt = now - (last || now); last = now;

      /* adaptive quality: a struggling machine gets a lighter field, not jank */
      if (frames++ > 30 && quality > 0.6) {
        slow = dt > 24 ? slow + 1 : Math.max(0, slow - 1);
        if (slow > 40) { quality = 0.6; slow = 0; resize(); }
      }

      /* no pointer (touch, or idle): the field breathes on its own */
      if (now - mouse.lastReal > 4000) {
        const a = now * 0.00012;
        mouse.tx = w * (0.5 + 0.26 * Math.sin(a) + 0.08 * Math.sin(a * 2.7));
        mouse.ty = h * (0.55 + 0.2 * Math.cos(a * 0.8));
      }

      intro = Math.min(1, (now - start) / 1900);
      mouse.x += (mouse.tx - mouse.x) * 0.055;
      mouse.y += (mouse.ty - mouse.y) * 0.055;

      gl.uniform2f(U.uRes, w, h);
      gl.uniform1f(U.uTime, (now - start) / 1000);
      gl.uniform2f(U.uMouse, mouse.x, mouse.y);
      gl.uniform1f(U.uIntro, intro);
      gl.uniform1f(U.uScroll, Math.min(1.4, window.scrollY / Math.max(1, window.innerHeight)));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    }
    function kick() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
    kick();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
