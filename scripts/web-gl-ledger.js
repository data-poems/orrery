// Injected before page scripts by web-tour-probe.mjs and web-layer-probe.mjs.
// Counts every WebGL object the page creates and deletes, buffer bytes, shader
// links and React commits per renderer, so a run can tell churn from retention.
// It also marks the opening cinematic as seen so runs start interactive.
(() => {
  try { localStorage.setItem('orrery.cinematic-seen.v1', '1'); } catch {}
  const L = { created: {}, deleted: {}, live: {}, bufferBytes: 0, bufferUploadBytes: 0,
    texBytes: 0, links: 0, compiles: 0, draws: 0, frames: 0, sizeHist: {} };
  window.__glLedger = L;
  // Count React commits per renderer (react-dom and the three.js reconciler).
  L.commits = {}; L.renderers = 0;
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    supportsFiber: true, isDisabled: false, renderers: new Map(), checkDCE() {},
    inject(r) { const id = ++L.renderers; this.renderers.set(id, r); return id; },
    onCommitFiberRoot(id) { L.commits[id] = (L.commits[id] || 0) + 1; },
    onCommitFiberUnmount() {}, onPostCommitFiberRoot() {}, setStrictMode() {},
  };
  const bump = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };
  const bufSize = new WeakMap();
  const texSize = new WeakMap();
  const kinds = [
    ['createBuffer', 'deleteBuffer', 'buffer'],
    ['createTexture', 'deleteTexture', 'texture'],
    ['createProgram', 'deleteProgram', 'program'],
    ['createShader', 'deleteShader', 'shader'],
    ['createFramebuffer', 'deleteFramebuffer', 'framebuffer'],
    ['createRenderbuffer', 'deleteRenderbuffer', 'renderbuffer'],
    ['createVertexArray', 'deleteVertexArray', 'vao'],
  ];
  function patch(proto) {
    if (!proto || proto.__ledgerPatched) return;
    proto.__ledgerPatched = true;
    for (const [c, d, k] of kinds) {
      const oc = proto[c], od = proto[d];
      if (!oc || !od) continue;
      proto[c] = function (...a) {
        const r = oc.apply(this, a);
        if (r) { bump(L.created, k); bump(L.live, k); r.__glk = k; }
        return r;
      };
      proto[d] = function (obj) {
        if (obj && obj.__glk && !obj.__gldel) {
          obj.__gldel = true; bump(L.deleted, k); bump(L.live, k, -1);
          if (k === 'buffer') L.bufferBytes -= (bufSize.get(obj) || 0);
          if (k === 'texture') L.texBytes -= (texSize.get(obj) || 0);
        }
        return od.call(this, obj);
      };
    }
    const oBind = proto.bindBuffer;
    proto.bindBuffer = function (target, buf) { (this.__bb || (this.__bb = {}))[target] = buf; return oBind.call(this, target, buf); };
    const oData = proto.bufferData;
    proto.bufferData = function (target, src, ...rest) {
      const buf = this.__bb && this.__bb[target];
      const bytes = typeof src === 'number' ? src : (src && src.byteLength) || 0;
      if (buf) { L.bufferBytes += bytes - (bufSize.get(buf) || 0); bufSize.set(buf, bytes); }
      L.bufferUploadBytes += bytes; L.sizeHist[bytes] = (L.sizeHist[bytes] || 0) + 1;
      return oData.call(this, target, src, ...rest);
    };
    const oSub = proto.bufferSubData;
    proto.bufferSubData = function (target, off, src, ...rest) {
      L.bufferUploadBytes += (src && src.byteLength) || 0;
      return oSub.call(this, target, off, src, ...rest);
    };
    const oActive = proto.activeTexture;
    proto.activeTexture = function (u) { this.__unit = u; return oActive.call(this, u); };
    const oBindTex = proto.bindTexture;
    proto.bindTexture = function (t, tex) { (this.__bt || (this.__bt = {}))[(this.__unit || 0) + ':' + t] = tex; return oBindTex.call(this, t, tex); };
    const texFor = (ctx, t) => ctx.__bt && ctx.__bt[(ctx.__unit || 0) + ':' + t];
    const addTex = (ctx, t, bytes) => {
      const tex = texFor(ctx, t); if (!tex) return;
      const prev = texSize.get(tex) || 0; if (bytes > prev) { L.texBytes += bytes - prev; texSize.set(tex, bytes); }
    };
    const oImg = proto.texImage2D;
    proto.texImage2D = function (...a) {
      try {
        if (a[1] === 0) {
          let w, h;
          if (a.length >= 8) { w = a[3]; h = a[4]; } else { const s = a[5]; w = s && (s.width || s.videoWidth); h = s && (s.height || s.videoHeight); }
          if (w && h) addTex(this, a[0], w * h * 4);
        }
      } catch {}
      return oImg.apply(this, a);
    };
    const oStore = proto.texStorage2D;
    if (oStore) proto.texStorage2D = function (t, levels, fmt, w, h) {
      addTex(this, t, Math.round(w * h * 4 * (levels > 1 ? 4 / 3 : 1)));
      return oStore.call(this, t, levels, fmt, w, h);
    };
    const oLink = proto.linkProgram;
    proto.linkProgram = function (p) { L.links++; return oLink.call(this, p); };
    const oComp = proto.compileShader;
    proto.compileShader = function (s) { L.compiles++; return oComp.call(this, s); };
    const oDE = proto.drawElements, oDA = proto.drawArrays;
    proto.drawElements = function (...a) { L.draws++; return oDE.apply(this, a); };
    proto.drawArrays = function (...a) { L.draws++; return oDA.apply(this, a); };
    for (const name of ['drawElementsInstanced', 'drawArraysInstanced']) {
      const o = proto[name]; if (o) proto[name] = function (...a) { L.draws++; return o.apply(this, a); };
    }
  }
  patch(window.WebGLRenderingContext && WebGLRenderingContext.prototype);
  patch(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype);
  const tick = () => { L.frames++; requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
})();
