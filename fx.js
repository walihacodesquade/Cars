(function () {
  'use strict';
  var D = document, H = D.documentElement;
  var $ = function (s, r) { return (r || D).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)); };
  var fine = window.matchMedia('(hover:hover) and (pointer:fine)').matches;
  var seen = false;
  try { seen = sessionStorage.getItem('fxSeen') === '1'; } catch (e) {}
  var safe = function (fn) { try { fn(); } catch (e) { if (window.console) console.warn('fx:', e); } };

  function mk(tag, cls, parent, id) {
    var e = D.createElement(tag);
    if (cls) e.className = cls;
    if (id) e.id = id;
    (parent || D.body).appendChild(e);
    return e;
  }

  var wipe;
  safe(function () {
    wipe = mk('div', '', D.body, 'fx-wipe');
    for (var i = 0; i < 8; i++) {
      var b = D.createElement('i');
      b.style.setProperty('--i', i);
      wipe.appendChild(b);
    }
    D.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (a.target && a.target !== '_self') return;
      if (a.hasAttribute('download')) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || /^(mailto:|tel:|javascript:)/i.test(href)) return;
      if (a.protocol !== location.protocol || a.host !== location.host) return;
      if (a.pathname === location.pathname && a.search === location.search) return;
      e.preventDefault();
      H.classList.add('fx-leave');
      setTimeout(function () { location.href = a.href; }, 650);
    });
    window.addEventListener('pageshow', function (e) {
      if (e.persisted) { H.classList.remove('fx-leave'); }
    });
  });

  var prog;
  safe(function () { prog = mk('div', '', D.body, 'fx-progress'); });

  var cur, ring, mx = -100, my = -100, rx = -100, ry = -100;
  safe(function () {
    if (!fine) return;
    cur = mk('div', 'fx-cur');
    ring = mk('div', 'fx-ring');
    window.addEventListener('pointermove', function (e) {
      mx = e.clientX;
      my = e.clientY;
      cur.style.opacity = 1;
      ring.style.opacity = 1;
      var t = e.target.closest ? e.target.closest('a,button,.car-card,.icon,input,select,textarea,.btn,.social') : null;
      ring.classList.toggle('hov', !!t);
    }, { passive: true });
    window.addEventListener('pointerdown', function () { ring.classList.add('down'); });
    window.addEventListener('pointerup', function () { ring.classList.remove('down'); });
    D.addEventListener('mouseleave', function () { cur.style.opacity = 0; ring.style.opacity = 0; });
  });

  var cv, ctx, W = 0, H2 = 0, dpr = 1, embers = [], sparks = [], streaks = [], scrollVel = 0, lastY = window.pageYOffset, nextStreak = 40;
  function ember(init) {
    return {
      x: Math.random() * W,
      y: init ? Math.random() * H2 : H2 + 10,
      r: Math.random() * 2 + 0.6,
      vy: -(Math.random() * 0.55 + 0.2),
      vx: (Math.random() - 0.5) * 0.3,
      ph: Math.random() * 6.28,
      a: Math.random() * 0.45 + 0.2
    };
  }

  function burst(x, y, n, power) {
    for (var i = 0; i < n; i++) {
      var an = Math.random() * 6.283, sp = (Math.random() * 0.8 + 0.2) * power;
      sparks.push({
        x: x,
        y: y,
        vx: Math.cos(an) * sp,
        vy: Math.sin(an) * sp,
        life: 1,
        dec: Math.random() * 0.02 + 0.015,
        r: Math.random() * 2 + 1
      });
    }
  }

  safe(function () {
    cv = mk('canvas', 'fx-canvas');
    ctx = cv.getContext('2d');
    var rs = function () {
      dpr = 1;
      W = window.innerWidth;
      H2 = window.innerHeight;
      cv.width = W * dpr;
      cv.height = H2 * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = W < 700 ? 15 : 30;
      while (embers.length < n) embers.push(ember(true));
      embers.length = n;
    };
    rs();
    window.addEventListener('resize', rs);
    var lastTrail = 0;
    window.addEventListener('pointermove', function (e) {
      if (!fine) return;
      var t = performance.now();
      if (t - lastTrail > 55) {
        lastTrail = t;
        burst(e.clientX, e.clientY, 1, 1.1);
      }
    }, { passive: true });
    window.addEventListener('pointerdown', function (e) { burst(e.clientX, e.clientY, 14, 4.2); });
  });

  function frame() {
    requestAnimationFrame(frame);
    if (D.hidden) return;
    var y = window.pageYOffset;
    scrollVel += ((y - lastY) - scrollVel) * 0.15;
    lastY = y;

    if (prog) {
      var mxh = Math.max(1, D.documentElement.scrollHeight - window.innerHeight);
      prog.style.transform = 'scaleX(' + Math.min(1, y / mxh) + ')';
    }

    if (cur) {
      rx += (mx - rx) * 0.16;
      ry += (my - ry) * 0.16;
      cur.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
    }

    if (!ctx) return;
    ctx.clearRect(0, 0, W, H2);
    ctx.globalCompositeOperation = 'lighter';
    var boost = Math.max(-6, Math.min(6, scrollVel)) * -0.06;

    embers.forEach(function (p, i) {
      p.ph += 0.02;
      p.x += p.vx + Math.sin(p.ph) * 0.35;
      p.y += p.vy + boost * 2;
      if (p.y < -12 || p.y > H2 + 40) embers[i] = ember(false);
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;
      var tw = p.a * (0.6 + Math.sin(p.ph * 2) * 0.4);
      ctx.fillStyle = 'rgba(255,60,20,' + tw * 0.18 + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 4, 0, 6.283);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,150,70,' + tw + ')';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, 6.283);
      ctx.fill();
    });

    for (var i = sparks.length - 1; i >= 0; i--) {
      var s = sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vx *= 0.96;
      s.vy = s.vy * 0.96 + 0.04;
      s.life -= s.dec;
      if (s.life <= 0) {
        sparks.splice(i, 1);
        continue;
      }
      ctx.fillStyle = 'rgba(255,' + (80 + s.life * 120 | 0) + ',40,' + s.life + ')';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * s.life + 0.3, 0, 6.283);
      ctx.fill();
    }

    nextStreak--;
    if (nextStreak <= 0 && W > 0) {
      streaks.push({
        x: -300,
        y: Math.random() * H2,
        len: 200 + Math.random() * 300,
        sp: 22 + Math.random() * 20,
        a: 0.35 + Math.random() * 0.3
      });
      nextStreak = 140 + Math.random() * 260 - Math.min(100, Math.abs(scrollVel) * 8);
    }

    for (var j = streaks.length - 1; j >= 0; j--) {
      var st = streaks[j];
      st.x += st.sp;
      if (st.x - st.len > W) {
        streaks.splice(j, 1);
        continue;
      }
      var g = ctx.createLinearGradient(st.x - st.len, 0, st.x, 0);
      g.addColorStop(0, 'rgba(255,0,0,0)');
      g.addColorStop(0.8, 'rgba(255,40,40,' + st.a + ')');
      g.addColorStop(1, 'rgba(255,255,255,' + st.a + ')');
      ctx.fillStyle = g;
      ctx.fillRect(st.x - st.len, st.y, st.len, 1.5);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  function splitWords(el) {
    var k = 0;
    (function walk(n) {
      Array.prototype.slice.call(n.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var f = D.createDocumentFragment();
          c.nodeValue.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) {
              f.appendChild(D.createTextNode(p));
              return;
            }
            var w = D.createElement('fx-w');
            w.className = 'fx-w';
            var i = D.createElement('fx-wi');
            i.className = 'fx-wi';
            i.style.setProperty('--i', k++);
            i.textContent = p;
            w.appendChild(i);
            f.appendChild(w);
          });
          c.parentNode.replaceChild(f, c);
        } else if (c.nodeType === 1 && c.tagName !== 'BR') {
          walk(c);
        }
      });
    })(el);
  }

  function scramble(el, delay) {
    if (el.children.length) return;
    var txt = el.textContent, chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&', n = txt.length, f = 0, total = 22;
    setTimeout(function () {
      (function step() {
        var out = '', done = Math.floor(f / total * n);
        for (var i = 0; i < n; i++) {
          var c = txt.charAt(i);
          out += (i < done || /\s/.test(c)) ? c : chars.charAt(Math.random() * chars.length | 0);
        }
        el.textContent = out;
        if (f++ < total) setTimeout(step, 30);
        else el.textContent = txt;
      })();
    }, delay || 0);
  }

  function countUp(el, delay) {
    var tn = null;
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3 && /\d/.test(n.nodeValue)) {
        tn = n;
        break;
      }
    }
    if (!tn) return;
    var m = tn.nodeValue.match(/^(\s*)(\d+(?:\.\d+)?)([\s\S]*)$/);
    if (!m) return;
    var pre = m[1], num = m[2], post = m[3], dec = (num.split('.')[1] || '').length, end = parseFloat(num);
    var pad = (num.length > 1 && num.charAt(0) === '0' && !dec) ? num.length : 0;
    var fmt = function (v) { return pre + (pad ? ('000' + Math.round(v)).slice(-pad) : v.toFixed(dec)) + post; };
    tn.nodeValue = fmt(0);
    setTimeout(function () {
      var t0 = performance.now(), dur = 1500;
      (function tick(t) {
        var p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
        tn.nodeValue = fmt(end * e);
        if (p < 1) requestAnimationFrame(tick);
        else tn.nodeValue = fmt(end);
      })(t0);
    }, delay || 0);
  }

  var reg = new WeakSet(), io, pending = [], hostMap = new Map();
  function skip(el) {
    return !el || reg.has(el) || (el.closest && el.closest('.hero,nav,#fx-loader,footer .fx-none'));
  }

  function add(el, type, i, extra) {
    if (skip(el)) return;
    reg.add(el);
    var d = (i || 0) * 0.1;
    el._fx = { type: type, d: d, extra: extra };
    if (type === 'words') {
      splitWords(el);
    } else if (type === 'img') {
      el.classList.add('fx-pre-img');
    } else {
      el.classList.add('fx-pre');
      if (type === 'left') el.classList.add('fx-l');
      if (type === 'right') el.classList.add('fx-r');
      if (type === 'zoom') el.classList.add('fx-z');
    }
    pending.push(el);
  }

  function run(el) {
    var f = el._fx;
    if (!f) return;
    el.style.setProperty('--d', f.d + 's');
    if (f.type === 'words') {
      el.style.setProperty('transition-delay', '0s');
      el.classList.add('fx-win');
    } else if (f.type === 'img') {
      el.classList.remove('fx-pre-img');
      el.classList.add('fx-in-img');
    } else {
      el.classList.remove('fx-pre');
      el.classList.add('fx-in');
    }
    if (f.extra === 'scramble') scramble(el, f.d * 1000);
    if (f.extra === 'count') countUp(el, 150 + f.d * 1000);
  }

  function kind(c) {
    return c.tagName === 'H2' || (c.tagName === 'H3' && c.closest('.info-side')) ? 'words' : 'up';
  }

  function registerAll() {
    ['.performance-grid', '.why-grid', '.values-grid', '.stats-grid', '.featured-stats', '.footer-top', '.input-row', '.socials', '.performance'].forEach(function (s) {
      $$(s).forEach(function (g) {
        if (g.closest('.hero')) return;
        if (s === '.performance' && g.tagName === 'SECTION') return;
        reg.add(g);
        Array.prototype.slice.call(g.children).forEach(function (c, i) { add(c, 'up', i); });
      });
    });

    ['.story-content', '.featured-content', '.experience-content', '.cta-content', '.visual-content', '.visual-overlay', '.final-content', '.contact-intro', '.performance-title', '.why-title', '.section-title', '.section-heading', '.performance-content', '.location-text', '.location > div:first-child', '.why', '.big-text'].forEach(function (s) {
      $$(s).forEach(function (b) {
        Array.prototype.slice.call(b.children).forEach(function (c, i) {
          if (c.classList.contains('why-grid') || c.classList.contains('featured-stats') || c.classList.contains('performance')) return;
          var sm = c.tagName === 'SMALL' || c.classList.contains('section-label');
          add(c, sm ? 'up' : kind(c), i, sm ? 'scramble' : null);
        });
      });
    });

    $$('.info-side').forEach(function (b) {
      Array.prototype.slice.call(b.children).forEach(function (c, i) {
        add(c, c.tagName === 'H3' ? 'words' : 'left', i);
      });
    });

    $$('.form-box').forEach(function (e) { add(e, 'right', 0); });
    $$('.location-box').forEach(function (e) { add(e, 'zoom', 2); });
    $$('.marquee').forEach(function (e) { add(e, 'zoom', 0); });
    $$('.footer-bottom').forEach(function (e) { add(e, 'up', 0); });
    $$('.story-image img,.featured-image img,.visual img,.final img').forEach(function (e) { add(e, 'img', 0); });
    $$('h2').forEach(function (h) { add(h, 'words', 0); });
    $$('small').forEach(function (s) { add(s, 'up', 0, 'scramble'); });
    $$('.performance-box h3,.stat h2,.stat h3,.featured-stats h3,.performance div h3').forEach(function (h) {
      if (h.closest('.hero')) return;
      h._cnt = true;
    });
  }

  function observe() {
    io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          io.unobserve(e.target);
          run(hostMap.get(e.target) || e.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -3% 0px' });

    pending.forEach(function (el) {
      if (el._fx && el._fx.type === 'img') {
        el._fx.host = el.parentNode;
        hostMap.set(el.parentNode, el);
        io.observe(el.parentNode);
      } else {
        io.observe(el);
      }
    });

    var cio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          cio.unobserve(e.target);
          countUp(e.target, 200);
        }
      });
    }, { threshold: 0.4 });

    $$('.performance-box h3,.stat h2,.stat h3,.featured-stats h3,.performance div h3').forEach(function (h) {
      if (!h.closest('.hero')) cio.observe(h);
    });
  }

  function heroSetup() {
    $$('.hero').forEach(function (h) {
      var g = mk('div', 'fx-hero-glow', h);
      h.insertBefore(g, h.firstChild);
      var v = $('video', h);
      if (v && parseInt(getComputedStyle(v).zIndex, 10) < 0) g.style.zIndex = -1;
      h.addEventListener('pointermove', function (e) {
        var r = h.getBoundingClientRect();
        g.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        g.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });
  }

  function parallax() {
    var vids = $$('.hero video,.performance-video'), txts = $$('.hero-text,.hero-content,.hero > div:not(.hero-red):not(.fx-hero-glow)');
    vids.forEach(function (v) { v.style.scale = '1.12'; });
    var tick = function () {
      var y = window.pageYOffset;
      vids.forEach(function (v) {
        var p = v.parentNode, r = p.getBoundingClientRect();
        if (r.bottom < -50 || r.top > window.innerHeight + 50) return;
        var off = (r.top + r.height / 2 - window.innerHeight / 2) * -0.1, lim = r.height * 0.06;
        v.style.translate = '0 ' + Math.max(-lim, Math.min(lim, off)) + 'px';
      });
      txts.forEach(function (t) {
        var hr = t.closest('.hero');
        if (!hr) return;
        var hh = hr.offsetHeight;
        if (y > hh) return;
        t.style.translate = '0 ' + (y * 0.2) + 'px';
        if (t.classList.contains('hero-text')) t.style.opacity = Math.max(0, 1 - y / (hh * 0.9));
      });
    };
    window.addEventListener('scroll', function () { requestAnimationFrame(tick); }, { passive: true });
    tick();
  }

  function interactions() {
    $$('.why-card,.value-card,.why-box,.performance-box,.stat,.info-card,.featured-box,.form-box,.location-box').forEach(function (c) {
      if (getComputedStyle(c).position === 'static') c.style.position = 'relative';
      var s = D.createElement('i');
      s.className = 'fx-spot';
      c.appendChild(s);
      c.addEventListener('pointermove', function (e) {
        var r = c.getBoundingClientRect();
        s.style.setProperty('--mx', (e.clientX - r.left) + 'px');
        s.style.setProperty('--my', (e.clientY - r.top) + 'px');
      });
    });

    var mags = '.btn,.cta-button,.details,.details-btn,.send-btn,.icon,.social,.final a,.socials a';
    $$(mags).forEach(function (el) {
      el.classList.add('fx-mag');
      if (fine) {
        el.addEventListener('pointermove', function (e) {
          var r = el.getBoundingClientRect();
          el.style.translate = ((e.clientX - r.left - r.width / 2) * 0.28) + 'px ' + ((e.clientY - r.top - r.height / 2) * 0.35) + 'px';
        });
        el.addEventListener('pointerleave', function () { el.style.translate = '0 0'; });
      }
      el.addEventListener('pointerdown', function (e) {
        var cs = getComputedStyle(el);
        if (cs.position === 'static') el.style.position = 'relative';
        el.style.overflow = 'hidden';
        var r = el.getBoundingClientRect(), s = D.createElement('i');
        s.className = 'fx-rip';
        s.style.left = (e.clientX - r.left) + 'px';
        s.style.top = (e.clientY - r.top) + 'px';
        el.appendChild(s);
        setTimeout(function () { if (s.parentNode) s.parentNode.removeChild(s); }, 800);
      });
    });
  }

  function intro(done) {
    var L = mk('div', '', D.body, 'fx-loader');
    var logo = mk('div', 'fx-l-logo', L);
    'NISHAL'.split('').forEach(function (ch, i) {
      var b = D.createElement('b');
      b.textContent = ch;
      b.style.setProperty('--i', i);
      if (ch === 'S' || ch === 'H') b.className = 'r';
      logo.appendChild(b);
    });
    mk('div', 'fx-l-streak', L);
    var bar = mk('div', 'fx-l-bar', L), fill = D.createElement('i');
    bar.appendChild(fill);
    mk('div', 'fx-l-tag', L).textContent = 'DRIVE BEYOND LIMITS';
    var num = mk('div', 'fx-l-num', L);
    num.textContent = '000';
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { L.classList.add('go'); });
    });
    var t0 = performance.now(), MIN = 700, loaded = D.readyState === 'complete', finished = false;
    window.addEventListener('load', function () { loaded = true; });
    (function tick(t) {
      var el = t - t0, cap = loaded ? 1 : 0.92, p = Math.min(cap, el / MIN);
      p = 1 - Math.pow(1 - p, 2);
      fill.style.setProperty('--p', p);
      num.textContent = ('00' + Math.round(p * 100)).slice(-3);
      if (!finished && ((p >= 1 && loaded) || el > 1200)) {
        finished = true;
        fill.style.setProperty('--p', 1);
        num.textContent = '100';
        setTimeout(function () {
          L.classList.add('out');
          done();
          setTimeout(function () { L.parentNode && L.parentNode.removeChild(L); }, 1000);
        }, 150);
        return;
      }
      if (!finished) requestAnimationFrame(tick);
    })(t0);
  }

  function enter(done) {
    H.classList.add('fx-enter');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        H.classList.add('fx-enter-go');
        done();
        setTimeout(function () { H.classList.remove('fx-enter', 'fx-enter-go'); }, 1100);
      });
    });
  }

  function start() {
    H.classList.remove('fx-loading');
    safe(observe);
    $$('.hero small,.hero-small').forEach(function (s) { scramble(s, 300); });
    $$('.hero .car-info h3').forEach(function (h) { countUp(h, 800); });
  }

  function boot() {
    H.classList.add('fx-js');
    safe(registerAll);
    safe(heroSetup);
    safe(parallax);
    safe(interactions);
    requestAnimationFrame(frame);
    var go = function () { try { sessionStorage.setItem('fxSeen', '1'); } catch (e) {} };
    if (seen) enter(start);
    else intro(function () { go(); start(); });
  }

  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot);
  else boot();
  setTimeout(function () { H.classList.remove('fx-loading'); }, 2000);
})();