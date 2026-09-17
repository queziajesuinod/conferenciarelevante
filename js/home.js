/* ============================================================
   JUVENTUDE RELEVANTE — Home
   ============================================================ */
(function () {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---- Scroll suave (Lenis) ---- */
  if (!reduced && typeof Lenis !== 'undefined') {
    try {
      const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
      // âncoras usam o scroll do Lenis
      document.querySelectorAll('a[href^="#"]').forEach((a) => {
        a.addEventListener('click', (e) => {
          const id = a.getAttribute('href');
          if (id && id.length > 1) {
            const el = document.querySelector(id);
            if (el) { e.preventDefault(); lenis.scrollTo(el, { offset: -80 }); }
          }
        });
      });
    } catch (_) {}
  }

  /* ---- Preview do vídeo ao passar o mouse ---- */
  function enablePreviews() {
    if (reduced || !canHover) return;
    document.querySelectorAll('.vcard').forEach((card) => {
      const vid = card.dataset.vid;
      const thumb = card.querySelector('.vthumb');
      if (!vid || !thumb) return;
      let timer = null;
      card.addEventListener('mouseenter', () => {
        timer = setTimeout(() => {
          if (thumb.querySelector('.preview')) return;
          const wrap = document.createElement('div');
          wrap.className = 'preview';
          wrap.innerHTML =
            `<iframe src="https://www.youtube-nocookie.com/embed/${vid}?autoplay=1&mute=1&controls=0&loop=1&playlist=${vid}&modestbranding=1&playsinline=1&rel=0"
              title="Prévia" allow="autoplay; encrypted-media" frameborder="0"></iframe>`;
          thumb.appendChild(wrap);
          card.classList.add('previewing');
        }, 380);
      });
      card.addEventListener('mouseleave', () => {
        clearTimeout(timer);
        const p = thumb.querySelector('.preview');
        if (p) p.remove();
        card.classList.remove('previewing');
      });
    });
  }

  /* ---- Navbar ---- */
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- Menu mobile ---- */
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (toggle) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => links.classList.remove('open')));
  }

  /* ---- Scroll reveal ---- */
  const observeReveals = () => {
    const els = document.querySelectorAll('.reveal:not(.in)');
    if (reduced || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
    els.forEach((e) => io.observe(e));
  };
  observeReveals();

  /* ---- Ministrações: buscar vídeos da API ---- */
  const grid = document.getElementById('videosGrid');
  if (grid) {
    const api = grid.dataset.api;
    const channel = grid.dataset.channel;
    const LIMIT = 6;

    const fmtDate = (iso) => {
      try {
        return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch (_) { return ''; }
    };
    const fmtDur = (s) => {
      if (!s || isNaN(s)) return '';
      s = Math.round(s);
      const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
      const p = (n) => String(n).padStart(2, '0');
      return h ? `${h}:${p(m)}:${p(sec)}` : `${m}:${p(sec)}`;
    };
    const esc = (t) => (t == null ? '' : String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));

    const thumbOf = (v) => v.thumbnailUrl || (v.videoId ? `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg` : '');
    const urlOf = (v) => v.youtubeUrl || (v.videoId ? `https://youtu.be/${v.videoId}` : '#');

    const detailUrl = (v) => (v.videoId ? `/ministracao?v=${encodeURIComponent(v.videoId)}` : urlOf(v));
    const cardHTML = (v) => {
      const dur = fmtDur(v.durationSeconds);
      return (
        `<a class="vcard reveal" href="${esc(detailUrl(v))}" data-vid="${esc(v.videoId || '')}">
          <div class="vthumb">
            <img src="${esc(thumbOf(v))}" alt="${esc(v.title || 'Ministração')}" loading="lazy"
                 onerror="this.src='https://i.ytimg.com/vi/${esc(v.videoId || '')}/hqdefault.jpg'" />
            <span class="play" aria-hidden="true"><span><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span></span>
            ${dur ? `<span class="dur">${dur}</span>` : ''}
          </div>
          <div class="vbody">
            ${v.category ? `<span class="vcat">${esc(v.category)}</span>` : ''}
            <h4>${esc(v.title || 'Ministração')}</h4>
            <div class="vmeta">
              <span class="spk">${esc(v.speaker || 'Juventude Relevante')}</span>
              <span>${fmtDate(v.publishedAt)}</span>
            </div>
          </div>
        </a>`
      );
    };

    const renderState = (msg) => {
      grid.classList.remove('videos-skeleton');
      grid.style.display = 'block';
      grid.innerHTML =
        `<div class="videos-state">${msg}<br><br>
          <a class="btn btn-ghost" href="https://www.youtube.com/channel/${channel}" target="_blank" rel="noopener">Ver no YouTube</a>
        </div>`;
    };

    const url = `${api}?channelId=${encodeURIComponent(channel)}`;
    fetch(url, { headers: { Accept: 'application/json' } })
      .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then((data) => {
        const items = (data && (data.items || data.data || data.videos)) || (Array.isArray(data) ? data : []);
        if (!items.length) { renderState('Em breve novas ministrações por aqui.'); return; }
        items.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
        grid.classList.remove('videos-skeleton');
        grid.innerHTML = items.slice(0, LIMIT).map(cardHTML).join('');
        observeReveals();
        enablePreviews();
      })
      .catch(() => {
        renderState('Não foi possível carregar as ministrações agora.');
      });
  }
})();
