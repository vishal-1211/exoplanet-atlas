// Plain-WebGL planet viewer (no libraries). One fragment shader draws a lit, rotating
// sphere, a starfield and the host star. Everything shown is an ARTIST'S IMPRESSION
// generated from the planet's size, temperature and star: we have no photographs.
import { look, starRGB } from './model.js';

const KIND = { gas: 0, ocean: 1, desert: 2, scorched: 3, lava: 4, ice: 5, airless: 6, rock: 7 };
const ATMOS = {
  gas: [0.75, 0.8, 0.95], ocean: [0.35, 0.6, 1.0], desert: [1.0, 0.65, 0.35], scorched: [0.9, 0.4, 0.2],
  lava: [1.0, 0.4, 0.12], ice: [0.7, 0.85, 1.0], airless: [0, 0, 0], rock: [0.6, 0.55, 0.5],
};

const VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }`;

const fragSrc = (OCT) => `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes; uniform mat3 uRot; uniform float uTime, uSeed, uRadius, uKind, uGlow, uBands, uAtmos, uCloud, uStarSize;
uniform vec3 uC1, uC2, uC3, uLight, uLightCol, uStarCol, uAtmCol; uniform vec2 uStarPos;

float hash1(float n){ return fract(sin(n)*43758.5453123); }
float h2(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
float noise(vec3 x){
  vec3 p = floor(x); vec3 f = fract(x); f = f*f*(3.0-2.0*f);
  float n = p.x + p.y*57.0 + 113.0*p.z;
  return mix(mix(mix(hash1(n), hash1(n+1.0), f.x), mix(hash1(n+57.0), hash1(n+58.0), f.x), f.y),
             mix(mix(hash1(n+113.0), hash1(n+114.0), f.x), mix(hash1(n+170.0), hash1(n+171.0), f.x), f.y), f.z);
}
float fbm(vec3 p){
  float a = 0.5, s = 0.0;
  for (int i = 0; i < ${OCT}; i++){ s += a*noise(p); p = p*2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
  return s * ${(0.96875 / (1 - Math.pow(0.5, OCT))).toFixed(5)};
}
vec3 starfield(vec2 uv){
  vec3 col = vec3(0.0);
  for (int k = 0; k < 3; k++){
    float sc = 14.0 + float(k)*23.0;
    vec2 g = uv*sc + float(k)*7.3;
    vec2 id = floor(g); vec2 f = fract(g) - 0.5;
    float h = h2(id);
    if (h > 0.93){
      vec2 o = vec2(h2(id+1.7), h2(id+5.3)) - 0.5;
      float d = length(f - o*0.6);
      float b = smoothstep(0.07 + 0.05*h2(id+9.1), 0.0, d) * (0.3 + 0.7*h2(id+3.3));
      col += mix(vec3(0.7,0.8,1.0), vec3(1.0,0.85,0.7), h2(id+2.2)) * b;
    }
  }
  return col;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*uRes) / (0.5*min(uRes.x, uRes.y));
  vec3 L = normalize(uLight);
  // ---- background: deep space, stars, the host star ----
  vec3 col = vec3(0.012, 0.016, 0.03) + starfield(uv) * 0.9;
  float sd = length(uv - uStarPos);
  float core = smoothstep(uStarSize, uStarSize*0.92, sd);
  float halo = exp(-max(sd - uStarSize, 0.0) / (uStarSize*0.7 + 0.05)) * 0.26;
  col += uStarCol * (core*1.35 + halo);

  float r = length(uv);
  float R = uRadius;
  if (r < R){
    vec3 n = vec3(uv, sqrt(R*R - r*r)) / R;
    vec3 sp = uRot * n;                       // point in the planet's own frame
    vec3 alb = vec3(0.5), emis = vec3(0.0);
    float water = 0.0, ldiff = 1.0;
    float k = uKind;
    if (k < 0.5){                             // gas / ice giant: banded atmosphere
      float lat = sp.y;
      float warp = fbm(vec3(sp.x*1.6 + uSeed, lat*2.5, sp.z*1.6));
      float turb = fbm(vec3(sp.x*5.0, lat*(10.0*uBands + 3.0), sp.z*5.0) + uSeed);
      float bc = lat*(4.0 + 7.0*uBands + fract(uSeed*7.0)*3.0) + warp*(2.0*uBands + 0.6) + turb*0.7*uBands;
      float t = 0.5 + 0.5*sin(bc*3.14159);
      alb = mix(uC1, uC2, t);
      alb = mix(alb, uC3, smoothstep(0.45, 1.0, 0.55*turb + 0.45*t) * (0.35 + 0.5*uBands));
      vec3 s = normalize(vec3(sin(uSeed*6.3), -0.28 - 0.2*fract(uSeed*3.1), cos(uSeed*6.3)));
      float spot = smoothstep(0.34, 0.08, distance(sp, s));
      alb = mix(alb, mix(uC3, uC1, 0.35), spot * 0.8 * uBands);
      ldiff = 0.85;
    } else if (k < 1.5){                      // temperate: oceans, land, ice caps, clouds
      float e = fbm(sp*2.3 + uSeed);
      float land = smoothstep(0.50, 0.53, e);
      vec3 sea = mix(uC1*0.45, uC1*1.15, smoothstep(0.2, 0.5, e));
      vec3 ground = mix(uC2, vec3(0.58, 0.47, 0.32), smoothstep(0.56, 0.78, e));
      alb = mix(sea, ground, land);
      water = 1.0 - land;
      float pole = smoothstep(0.80, 0.92, abs(sp.y) + (e - 0.5)*0.25);
      alb = mix(alb, uC3, pole); water *= 1.0 - pole;
      float cl = smoothstep(0.52, 0.78, fbm(sp*3.4 + vec3(uTime*0.012, 0.0, 0.0) + uSeed*3.0)) * uCloud;
      alb = mix(alb, vec3(1.0), cl*0.9); water *= 1.0 - cl;
    } else if (k < 2.5){                      // desert
      float d = fbm(sp*3.0 + uSeed) + 0.3*fbm(sp*13.0);
      alb = mix(uC1, uC2, smoothstep(0.3, 0.75, d));
      alb = mix(alb, uC3, smoothstep(0.55, 0.9, fbm(sp*6.0 + 4.0 + uSeed)) * 0.55);
    } else if (k < 3.5){                      // scorched rock with glowing veins
      alb = mix(uC1, uC2, fbm(sp*4.0 + uSeed)) * (0.8 + 0.4*fbm(sp*14.0));
      float ridge = 1.0 - abs(2.0*fbm(sp*5.0 + uSeed) - 1.0);
      emis = uC3 * smoothstep(0.90, 0.985, ridge) * uGlow * 1.4;
    } else if (k < 4.5){                      // lava world
      alb = mix(uC1, uC2, fbm(sp*3.0 + uSeed)) * (0.7 + 0.5*fbm(sp*12.0));
      float ridge = 1.0 - abs(2.0*fbm(sp*4.0 + uSeed) - 1.0);
      float cracks = smoothstep(0.86, 0.985, ridge);
      emis = uC3 * (0.05 + 1.9*cracks);
    } else if (k < 5.5){                      // ice world
      alb = mix(uC1, uC3, fbm(sp*4.0 + uSeed));
      float ridge = 1.0 - abs(2.0*fbm(sp*7.0 + uSeed) - 1.0);
      alb = mix(alb, uC2, smoothstep(0.90, 0.985, ridge) * 0.75);
    } else if (k < 6.5){                      // airless, cratered rock
      float g = fbm(sp*3.0 + uSeed);
      alb = mix(uC2, uC1, g) * (0.75 + 0.5*fbm(sp*18.0));
      alb *= 1.0 - 0.35*smoothstep(0.52, 0.60, fbm(sp*1.7 + 7.0 + uSeed));
      alb += 0.10 * smoothstep(0.03, 0.0, abs(fbm(sp*9.0 + uSeed) - 0.55));
    } else {                                  // generic rock
      alb = mix(uC1, uC2, fbm(sp*3.0 + uSeed)) * (0.8 + 0.4*fbm(sp*12.0));
    }
    float ndl = dot(n, L);
    float lit = smoothstep(-0.05 - 0.25*(1.0-ldiff), 0.35 + 0.35*(1.0-ldiff), ndl);
    vec3 c = alb * uLightCol * (0.035 + 1.15*lit);
    float spec = pow(max(dot(reflect(-L, n), vec3(0.0,0.0,1.0)), 0.0), 40.0) * water * lit;
    c += uLightCol * spec * 0.55;
    c += emis;
    // thermal glow on hot giants, strongest on the dark side
    if (k < 0.5) c += uC3 * uGlow * 0.18 * (1.0 - lit) * (0.5 + fbm(sp*3.0 + uSeed));
    float fres = pow(1.0 - n.z, 2.6);
    c += uAtmCol * uAtmos * fres * (0.12 + 0.9*lit);
    c *= 1.0 - 0.28*(1.0 - n.z);              // gentle limb darkening
    col = c;
  } else {
    float d = r - R;
    if (d < 0.18 && uAtmos > 0.0){
      vec3 ne = normalize(vec3(uv, 0.0));
      float lit = smoothstep(-0.25, 0.55, dot(ne, L));
      col += uAtmCol * uAtmos * exp(-d*38.0) * (0.06 + 0.9*lit) * 0.9;
    }
  }
  col = 1.0 - exp(-col * 1.25);               // soft tone-map
  gl_FragColor = vec4(pow(col, vec3(1.0/2.2)), 1.0);
}`;

const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967296; };
const toLinear = (hex) => {
  const v = parseInt(hex.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255].map((c) => Math.pow(c / 255, 2.2));
};

export class PlanetView {
  constructor(canvas) {
    this.canvas = canvas;
    this.angle = 0; this.pitch = 0.25; this.spin = 0.22; this.zoom = 1;
    this.t0 = performance.now(); this.last = this.t0; this.raf = 0; this.running = false;
    this.dragging = false; this.params = null; this.error = null;
    this.reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.reduceMotion) this.spin = 0;
    // Phones and small screens get a lighter shader and fewer pixels, so their graphics chip is not overloaded.
    const small = Math.min(screen.width, screen.height) <= 900 || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    this.tier = small ? 0 : 1;
    this.quality = 1; this.slow = 0; this.ema = 16; this.nextDraw = 0;
    this.onLost = null; this.onRestore = null;
    this.init();
    this.bind();
  }

  init() {
    const gl = this.canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'default' })
      || this.canvas.getContext('experimental-webgl');
    if (!gl) { this.error = 'WebGL is not available in this browser.'; return; }
    this.gl = gl; this.error = null;
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { this.error = gl.getShaderInfoLog(s); console.error(this.error); }
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, fragSrc(this.tier ? 5 : 3)));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { this.error = gl.getProgramInfoLog(prog); console.error(this.error); return; }
    this.prog = prog;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    this.u = {};
    for (const n of ['uRes', 'uRot', 'uTime', 'uSeed', 'uRadius', 'uKind', 'uGlow', 'uBands', 'uAtmos', 'uCloud', 'uStarSize',
      'uC1', 'uC2', 'uC3', 'uLight', 'uLightCol', 'uStarCol', 'uAtmCol', 'uStarPos']) this.u[n] = gl.getUniformLocation(prog, n);
  }

  bind() {
    const c = this.canvas;
    let lx = 0, ly = 0;
    c.style.touchAction = 'none';
    c.addEventListener('pointerdown', (e) => { this.dragging = true; lx = e.clientX; ly = e.clientY; c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      this.angle += dx * 0.008; this.pitch = Math.max(-1.1, Math.min(1.1, this.pitch + dy * 0.006));
      if (!this.running) this.draw();
    });
    const up = () => { this.dragging = false; };
    c.addEventListener('pointerup', up); c.addEventListener('pointercancel', up);
    c.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.zoom = Math.max(0.6, Math.min(1.6, this.zoom * (e.deltaY > 0 ? 0.95 : 1.05)));
      if (!this.running) this.draw();
    }, { passive: false });
    c.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; this.pause(); if (this.onLost) this.onLost(); });
    c.addEventListener('webglcontextrestored', () => {
      this.lost = false; this.tier = 0; this.quality = Math.min(this.quality, 0.7);   // come back lighter than before
      this.init(); if (this.error) return;
      this.set(this.planet); if (this.onRestore) this.onRestore(); if (this.wantRun) this.start();
    });
    if ('ResizeObserver' in window) { this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(c); }
    this.holdUntil = 0; this.visible = true;
    if ('IntersectionObserver' in window) { this.io = new IntersectionObserver((en) => { this.visible = en[en.length - 1].isIntersecting; if (this.visible && !this.running && this.wantRun) this.draw(); }); this.io.observe(c); }
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); else if (this.wantRun) this.start(); });
  }

  resize() {
    const cw = this.canvas.clientWidth || 1, ch = this.canvas.clientHeight || 1;
    const budget = this.tier ? 1.3e6 : 3.2e5;                      // most pixels we ask the GPU to shade per frame
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(budget / (cw * ch))) * this.quality;
    const w = Math.max(2, Math.round(cw * dpr));
    const h = Math.max(2, Math.round(ch * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    if (this.gl) this.gl.viewport(0, 0, w, h);
    if (!this.running) this.draw();
  }

  set(p) {
    this.planet = p;
    if (!p || !this.gl) return;
    const l = look(p);
    const seed = hash(p.name) * 40.0;
    const atm = ATMOS[l.kind];
    // Star size as seen from the planet: relative, compressed scale so small stars stay visible.
    let size = 0.12;
    if (p.srad && p.sma) size = Math.max(0.035, Math.min(0.27, 0.95 * Math.sqrt((p.srad * 0.00465047) / p.sma)));
    const sc = starRGB(p.teff).map((c) => Math.pow(c / 255, 2.2));
    const lightCol = sc.map((c) => 0.35 + 0.65 * c);
    this.params = {
      kind: KIND[l.kind], colors: l.colors.map(toLinear), glow: l.glow, bands: l.bands, seed,
      atmos: l.kind === 'airless' ? 0 : (l.kind === 'gas' ? 0.7 : l.kind === 'lava' || l.kind === 'scorched' ? 0.35 : 0.6),
      atm, cloud: l.kind === 'ocean' ? 0.8 : 0, starSize: size, starCol: sc, lightCol,
    };
    this.pitch = 0.18 + hash(p.name + 'tilt') * 0.3;
    this.angle = hash(p.name + 'spin') * 6.28;
    this.zoom = 1;
    this.resize();
    if (!this.running) this.draw();
  }

  rotMatrix() {
    // inverse of (Rx(pitch) * Ry(angle)), as a column-major mat3
    const a = this.angle, p = this.pitch;
    const ca = Math.cos(a), sa = Math.sin(a), cp = Math.cos(p), sp = Math.sin(p);
    // M = Ry(-a) * Rx(-p)
    const ry = [ca, 0, sa, 0, 1, 0, -sa, 0, ca];     // Ry(-a) column-major
    const rx = [1, 0, 0, 0, cp, sp, 0, -sp, cp];      // Rx(-p) column-major
    const m = new Array(9).fill(0);
    for (let c = 0; c < 3; c++) for (let r = 0; r < 3; r++) {
      for (let k = 0; k < 3; k++) m[c * 3 + r] += ry[k * 3 + r] * rx[c * 3 + k];
    }
    return new Float32Array(m);
  }

  draw() {
    const gl = this.gl, P = this.params;
    if (!gl || !P || !this.prog || gl.isContextLost()) return;
    const u = this.u, w = this.canvas.width, h = this.canvas.height;
    const aspect = w / h;
    gl.uniform2f(u.uRes, w, h);
    gl.uniformMatrix3fv(u.uRot, false, this.rotMatrix());
    gl.uniform1f(u.uTime, (performance.now() - this.t0) / 1000);
    gl.uniform1f(u.uSeed, P.seed);
    gl.uniform1f(u.uRadius, (aspect < 1 ? 0.62 * aspect / 0.9 : 0.6) * this.zoom);
    gl.uniform1f(u.uKind, P.kind);
    gl.uniform1f(u.uGlow, P.glow); gl.uniform1f(u.uBands, P.bands);
    gl.uniform1f(u.uAtmos, P.atmos); gl.uniform1f(u.uCloud, P.cloud);
    gl.uniform1f(u.uStarSize, P.starSize);
    gl.uniform3fv(u.uC1, P.colors[0]); gl.uniform3fv(u.uC2, P.colors[1]); gl.uniform3fv(u.uC3, P.colors[2]);
    gl.uniform3f(u.uLight, -0.75, 0.38, 0.55);
    gl.uniform3fv(u.uLightCol, P.lightCol);
    gl.uniform3fv(u.uStarCol, P.starCol);
    gl.uniform3fv(u.uAtmCol, P.atm);
    gl.uniform2f(u.uStarPos, -Math.min(0.92, 0.9 * Math.max(aspect, 0.7)) , 0.62);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  frame = (now) => {
    if (!this.running) return;
    const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    if (now < this.holdUntil || !this.visible) { this.raf = requestAnimationFrame(this.frame); return; }
    if (!this.tier && now < this.nextDraw) { this.raf = requestAnimationFrame(this.frame); return; }   // phones: about 30 frames a second
    if (!this.dragging) this.angle += this.spin * dt;
    this.draw();
    this.nextDraw = now + 30;
    // If frames take too long, quietly draw fewer pixels.
    this.ema = this.ema * 0.9 + Math.min(200, dt * 1000) * 0.1;
    if (this.ema > 60 && this.quality > 0.5 && ++this.slow > 20) { this.quality *= 0.8; this.slow = 0; this.ema = 30; this.resize(); }
    this.raf = requestAnimationFrame(this.frame);
  };
  start() { this.wantRun = true; if (this.running || !this.gl) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.frame); }
  hold(ms) { this.holdUntil = performance.now() + ms; }
  pause() { this.running = false; cancelAnimationFrame(this.raf); }
  stop() { this.wantRun = false; this.pause(); }
}
