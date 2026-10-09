(function () {
  'use strict';
  var doc = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Entrance
  requestAnimationFrame(function () { requestAnimationFrame(function () { doc.classList.add('loaded'); }); });

  // Hero background video ---------------------------------------------------------------
  // Robust autoplay: muted attr in HTML + muted/defaultMuted in JS before every play(),
  // play() on several media events with retries, bfcache (pageshow) + visibility handling.
  // Nothing pauses it programmatically except the user's Pause toggle (or opening a media item).
  var hv = document.getElementById('hero-video');
  var mt = document.querySelector('.motion-toggle');
  var snd = document.querySelector('.sound-toggle');
  var userPaused = false, wantSound = false, retryT = null, retries = 0;
  function tryPlay() {
    if (!hv || userPaused || document.hidden) return;
    if (!wantSound) { hv.muted = true; hv.defaultMuted = true; hv.setAttribute('muted', ''); }
    hv.playsInline = true;
    if (!hv.paused && hv.readyState > 2) { retries = 0; return; }
    var p = hv.play();
    if (p && p.then) p.then(function () { retries = 0; }).catch(function () {
      // e.g. not enough data yet, or a transient block: back off and retry a few times
      if (wantSound) { wantSound = false; hv.muted = true; syncSound(); }
      clearTimeout(retryT);
      if (retries++ < 8) retryT = setTimeout(tryPlay, Math.min(250 * retries, 2000));
    });
  }
  function syncToggle() { if (mt) { mt.textContent = userPaused ? 'Play background video' : 'Pause background video'; mt.setAttribute('aria-pressed', userPaused); } }
  function syncSound() {
    if (!snd || !hv) return;
    var on = !hv.muted;
    snd.setAttribute('aria-pressed', on);
    snd.querySelector('span').textContent = on ? 'Sound off' : 'Sound on';
    snd.setAttribute('aria-label', on ? 'Mute background video' : 'Unmute background video');
    syncHint();
  }
  // TEMPORARY: bouncing "click" hint next to Sound on (remove this block + hint markup/CSS)
  var hint = document.getElementById('click-hint'), hintDismissed = false;
  function syncHint() {
    if (!hint || !hv) return;
    hint.hidden = hintDismissed || !hv.muted || hv.paused;
  }
  if (hint) hint.addEventListener('click', function () { hintDismissed = true; if (snd) snd.click(); syncHint(); });
  if (hint) {
    // Hide permanently (for this page view) on the first meaningful scroll away from the top
    var hintScroll = function () {
      if (window.scrollY > 80) { hintDismissed = true; syncHint(); window.removeEventListener('scroll', hintScroll); }
    };
    window.addEventListener('scroll', hintScroll, { passive: true });
    hintScroll();
  }
  // END TEMPORARY

  if (hv) {
    if (reduce) { userPaused = true; hv.removeAttribute('autoplay'); hv.pause(); }
    ['loadedmetadata', 'loadeddata', 'canplay', 'canplaythrough', 'stalled', 'suspend'].forEach(function (ev) {
      hv.addEventListener(ev, function () { if (hv.paused) tryPlay(); });
    });
    ['play', 'playing', 'pause'].forEach(function (ev) { hv.addEventListener(ev, syncHint); });
    hv.addEventListener('volumechange', syncSound);
    tryPlay();
    window.addEventListener('load', tryPlay);
    window.addEventListener('pageshow', function () { retries = 0; tryPlay(); });            // bfcache restore
    document.addEventListener('visibilitychange', function () { if (!document.hidden) { retries = 0; tryPlay(); } });
    window.addEventListener('focus', function () { if (hv.paused) tryPlay(); });
    // Strict autoplay environments (iOS Low Power Mode etc.): start on first interaction
    ['touchstart', 'pointerdown', 'keydown', 'wheel', 'scroll'].forEach(function (ev) {
      window.addEventListener(ev, function once() { if (hv.paused) { retries = 0; tryPlay(); } window.removeEventListener(ev, once); }, { passive: true });
    });
    // Watchdog for the first few seconds after load
    var wd = 0, wdT = setInterval(function () { if (++wd > 10 || userPaused) return clearInterval(wdT); if (hv.paused) tryPlay(); }, 600);

    if (mt) mt.addEventListener('click', function () {
      userPaused = !userPaused;
      if (userPaused) hv.pause(); else { retries = 0; tryPlay(); }
      syncToggle(); syncHint();
    });
    if (snd) snd.addEventListener('click', function () {
      hintDismissed = true;                       // TEMPORARY hint
      wantSound = hv.muted;
      hv.muted = !wantSound; hv.defaultMuted = !wantSound;
      if (wantSound) { if (userPaused) { userPaused = false; syncToggle(); } retries = 0; tryPlay(); var p = hv.play(); if (p && p.catch) p.catch(function () {}); }
      syncSound();
    });
    syncToggle(); syncSound();

    // Leaving the hero with sound on: mute (keep playing), never pause
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        if (!en[0].isIntersecting && !hv.muted) { wantSound = false; hv.muted = true; syncSound(); }
      }, { threshold: 0.05 }).observe(document.querySelector('.hero'));
    }
    window.heroVideo = { el: hv, play: function () { retries = 0; tryPlay(); }, isUserPaused: function () { return userPaused; } };
  }

  // Nav: scrolled state, mobile menu, active link
  var nav = document.getElementById('top-nav');
  var toggle = nav.querySelector('.nav-toggle');
  function setOpen(open) {
    nav.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', open);
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.style.overflow = open ? 'hidden' : '';
  }
  toggle.addEventListener('click', function () { setOpen(!nav.classList.contains('open')); });
  nav.querySelectorAll('.nav-links a').forEach(function (a) { a.addEventListener('click', function () { setOpen(false); }); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && nav.classList.contains('open')) setOpen(false); });

  var links = {};
  nav.querySelectorAll('.nav-links a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
  if ('IntersectionObserver' in window) {
    var secObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && links[en.target.id]) {
          Object.keys(links).forEach(function (k) { links[k].classList.remove('active'); });
          if (!links[en.target.id].classList.contains('nav-cta')) links[en.target.id].classList.add('active');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    Object.keys(links).forEach(function (id) { var s = document.getElementById(id); if (s) secObs.observe(s); });
  }

  // Scroll reveals (staggered within a parent)
  var reveals = [].slice.call(document.querySelectorAll('.reveal'));
  if (!reduce && 'IntersectionObserver' in window) {
    var rObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var sibs = [].slice.call(en.target.parentNode.children).filter(function (c) { return c.classList.contains('reveal'); });
          en.target.style.setProperty('--rd', (Math.max(0, sibs.indexOf(en.target)) % 5) * 0.09 + 's');
          en.target.classList.add('in');
          rObs.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { rObs.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  // Parallax + nav state (single rAF loop on scroll)
  var px = reduce ? [] : [].slice.call(document.querySelectorAll('[data-parallax]'));
  var ticking = false;
  function onScroll() {
    var y = window.scrollY, vh = window.innerHeight;
    nav.classList.toggle('scrolled', y > 40);
    px.forEach(function (el) {
      var r = el.parentElement.getBoundingClientRect();
      if (r.bottom < -200 || r.top > vh + 200) return;
      var speed = parseFloat(el.getAttribute('data-parallax')) || 0;
      var offset = (r.top + r.height / 2 - vh / 2) * -speed;
      el.style.transform = 'translate3d(0,' + offset.toFixed(1) + 'px,0)';
    });
    ticking = false;
  }
  window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  // Feature video play overlay
  var vf = document.querySelector('.video-frame');
  if (vf) {
    var v = vf.querySelector('video'), pb = vf.querySelector('.video-play');
    v.removeAttribute('controls');
    pb.addEventListener('click', function () { v.setAttribute('controls', ''); v.preload = 'auto'; v.play(); });
    v.addEventListener('play', function () { vf.classList.add('playing'); if (hv) hv.pause(); });
    v.addEventListener('pause', function () { vf.classList.remove('playing'); });
  }

  // Scroll-linked portrait: travels from the hero slot into the About slot (desktop, motion OK)
  var morph = document.getElementById('morph');
  var heroSlot = document.getElementById('hero-slot');
  var aboutSlot = document.getElementById('about-slot');
  var mq = window.matchMedia('(min-width: 1101px)');
  var geo = null;
  function docRect(el) { var r = el.getBoundingClientRect(); return { x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height }; }
  function measure() {
    if (!morph || reduce || !mq.matches) { doc.classList.remove('morph-on'); geo = null; return; }
    // measure slots without transforms from entrance/reveal animations
    var hp = heroSlot.parentElement, ap = aboutSlot.closest('.about-portrait');
    var ht = hp.style.transform, at = ap.style.transform;
    hp.style.transition = ap.style.transition = 'none'; hp.style.transform = 'none'; ap.style.transform = 'none';
    var a = docRect(heroSlot), b = docRect(aboutSlot);
    hp.style.transform = ht; ap.style.transform = at; hp.style.transition = ap.style.transition = '';
    var vh = window.innerHeight;
    var end = Math.max(1, b.y + b.h / 2 - vh / 2 - 20);   // scroll position where the About slot sits centered
    geo = { a: a, b: b, end: end,
      ra: a.w / 2, rb: Math.min(b.w / 2, parseFloat(getComputedStyle(aboutSlot).borderTopLeftRadius) || 240) };
    doc.classList.add('morph-on');
    placeMorph();
  }
  function lerp(x, y, t) { return x + (y - x) * t; }
  function ease(t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function placeMorph() {
    if (!geo) return;
    var t = Math.min(1, Math.max(0, window.scrollY / geo.end)), e = ease(t);
    doc.classList.toggle('morph-left', t > 0.02);
    var a = geo.a, b = geo.b;
    var x = lerp(a.x, b.x, e), y = lerp(a.y, b.y, e), w = lerp(a.w, b.w, e), h = lerp(a.h, b.h, e);
    var r = lerp(geo.ra, geo.rb, e);
    morph.style.width = w + 'px'; morph.style.height = h + 'px';
    morph.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
    morph.style.borderRadius = r.toFixed(1) + 'px ' + r.toFixed(1) + 'px 6px 6px';
    morph.style.boxShadow = '0 ' + lerp(40, 20, e) + 'px ' + lerp(100, 60, e) + 'px rgba(0,0,0,' + lerp(.55, .35, e) + ')';
  }
  if (morph) {
    window.addEventListener('scroll', function () { if (geo) requestAnimationFrame(placeMorph); }, { passive: true });
    var rT; window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(measure, 120); });
    if (mq.addEventListener) mq.addEventListener('change', measure);
    window.addEventListener('load', measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    measure();
  }

  // Instagram embed: load the official embed.js only when the section gets close
  var ig = document.getElementById('ig-wrap');
  if (ig) {
    var loadIg = function () {
      if (window.instgrm) { window.instgrm.Embeds.process(); return; }
      var sc = document.createElement('script'); sc.async = true; sc.src = 'https://www.instagram.com/embed.js';
      document.body.appendChild(sc);
    };
    if ('IntersectionObserver' in window) {
      var igo = new IntersectionObserver(function (en) { if (en[0].isIntersecting) { loadIg(); igo.disconnect(); } }, { rootMargin: '600px 0px' });
      igo.observe(ig);
    } else loadIg();
  }

  // Monogram dropdown (email + socials)
  var bBtn = document.getElementById('brand-btn'), bMenu = document.getElementById('brand-menu');
  if (bBtn && bMenu) {
    var openMenu = function (open) {
      bBtn.setAttribute('aria-expanded', open);
      if (open) {
        if (nav.classList.contains('open')) setOpen(false);
        bMenu.hidden = false; requestAnimationFrame(function () { bMenu.classList.add('show'); });
      } else {
        bMenu.classList.remove('show'); setTimeout(function () { if (bBtn.getAttribute('aria-expanded') === 'false') bMenu.hidden = true; }, reduce ? 0 : 300);
      }
    };
    bBtn.addEventListener('click', function (e) { e.stopPropagation(); openMenu(bBtn.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('click', function (e) { if (bBtn.getAttribute('aria-expanded') === 'true' && !bMenu.contains(e.target)) openMenu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && bBtn.getAttribute('aria-expanded') === 'true') { openMenu(false); bBtn.focus(); } });
    bMenu.querySelectorAll('a').forEach(function (a) { a.addEventListener('click', function () { openMenu(false); }); });
    toggle.addEventListener('click', function () { openMenu(false); });
  }

  // Media modal player (self-hosted videos with sound, photo carousels)
  var player = document.getElementById('player');
  if (player) {
    var stage = player.querySelector('.player-stage'), pTitle = player.querySelector('#player-title'),
        pCap = player.querySelector('.player-cap'), pIg = player.querySelector('.player-ig'),
        pPrev = player.querySelector('.player-prev'), pNext = player.querySelector('.player-next'),
        pClose = player.querySelector('.player-close'), pImgs = [], pIdx = 0, pLast = null, heroWasPlaying = false;
    var showImg = function (i) {
      pIdx = (i + pImgs.length) % pImgs.length;
      stage.innerHTML = '';
      var im = new Image(); im.src = pImgs[pIdx]; im.alt = pTitle.textContent + ' (photo ' + (pIdx + 1) + ' of ' + pImgs.length + ')';
      stage.appendChild(im);
    };
    var openPlayer = function (btn) {
      pLast = btn;
      var type = btn.dataset.type;
      pTitle.textContent = btn.dataset.title; pCap.textContent = btn.dataset.caption;
      if (btn.dataset.ig) { pIg.href = btn.dataset.ig; pIg.hidden = false; } else pIg.hidden = true;
      stage.innerHTML = '';
      if (type === 'video') {
        pPrev.hidden = pNext.hidden = true;
        var v = document.createElement('video');
        v.src = btn.dataset.src; v.poster = btn.dataset.poster; v.controls = true; v.playsInline = true; v.preload = 'auto';
        v.setAttribute('playsinline', ''); v.setAttribute('controlslist', 'nodownload');
        stage.appendChild(v);
        var pr = v.play(); if (pr && pr.catch) pr.catch(function () {});
      } else {
        pImgs = btn.dataset.src.split('|');
        pPrev.hidden = pNext.hidden = pImgs.length < 2;
        showImg(0);
      }
      if (hv) { heroWasPlaying = !hv.paused; hv.pause(); }
      player.hidden = false; document.body.style.overflow = 'hidden';
      requestAnimationFrame(function () { player.classList.add('show'); });
      pClose.focus();
    };
    var closePlayer = function () {
      var v = stage.querySelector('video'); if (v) { v.pause(); v.removeAttribute('src'); v.load(); }
      player.classList.remove('show'); document.body.style.overflow = '';
      setTimeout(function () { player.hidden = true; stage.innerHTML = ''; }, reduce ? 0 : 300);
      if (pLast) pLast.focus();
      if (heroWasPlaying && window.heroVideo) window.heroVideo.play();
    };
    document.querySelectorAll('.m-open').forEach(function (b) { b.addEventListener('click', function () { openPlayer(b); }); });
    pClose.addEventListener('click', closePlayer);
    pPrev.addEventListener('click', function () { showImg(pIdx - 1); });
    pNext.addEventListener('click', function () { showImg(pIdx + 1); });
    player.addEventListener('click', function (e) { if (e.target === player || e.target.classList.contains('player-inner')) closePlayer(); });
    document.addEventListener('keydown', function (e) {
      if (player.hidden) return;
      if (e.key === 'Escape') closePlayer();
      else if (e.key === 'ArrowRight' && !pNext.hidden) showImg(pIdx + 1);
      else if (e.key === 'ArrowLeft' && !pPrev.hidden) showImg(pIdx - 1);
      else if (e.key === 'Tab') {
        var f = [].slice.call(player.querySelectorAll('button:not([hidden]), a[href]:not([hidden]), video')),
            first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
    var ptx = null;
    player.addEventListener('touchstart', function (e) { ptx = e.touches[0].clientX; }, { passive: true });
    player.addEventListener('touchend', function (e) {
      if (ptx === null || pNext.hidden) return; var dx = e.changedTouches[0].clientX - ptx;
      if (Math.abs(dx) > 50) showImg(pIdx + (dx < 0 ? 1 : -1)); ptx = null;
    });
  }

  // "Inquire about lessons" preselects the subject
  document.querySelectorAll('[data-subject]').forEach(function (a) {
    a.addEventListener('click', function () {
      var r = document.querySelector('input[name="subject"][value="' + a.getAttribute('data-subject') + '"]');
      if (r) r.checked = true;
    });
  });

  // Contact form: Formspree if data-endpoint is set, otherwise mailto fallback
  var form = document.getElementById('contact-form');
  if (form) {
    var status = form.querySelector('.form-status');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var ok = true;
      form.querySelectorAll('[required]').forEach(function (el) {
        var bad = !el.value.trim() || (el.type === 'email' && !/^\S+@\S+\.\S+$/.test(el.value));
        el.closest('.field').classList.toggle('invalid', bad);
        if (bad && ok) { el.focus(); ok = false; }
      });
      if (!ok) { status.textContent = 'Please fill in your name, a valid email, and a message.'; return; }
      if (form._gotcha && form._gotcha.value) return;
      var data = new FormData(form);
      var endpoint = form.getAttribute('data-endpoint');
      if (endpoint) {
        status.textContent = 'Sending…';
        fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
          .then(function (r) { if (!r.ok) throw new Error(); form.reset(); status.textContent = 'Thank you! Your message has been sent.'; })
          .catch(function () { status.textContent = 'Sorry, something went wrong. Please email frankie@benitez.studio directly.'; });
      } else {
        var subject = data.get('subject') + ' inquiry from ' + data.get('name');
        var body = data.get('message') + '\n\n— ' + data.get('name') + '\n' + data.get('email');
        window.location.href = 'mailto:' + form.getAttribute('data-mailto') + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
        status.textContent = 'Opening your email app…';
      }
    });
  }

  var yr = document.getElementById('year'); if (yr) yr.textContent = new Date().getFullYear();
})();
