/* ============================================================
   JUVENTUDE RELEVANTE — Home (e base comum das páginas internas)
   ============================================================ */
(function () {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const V = window.JRVideos;

  document.documentElement.classList.add('js');

  /* ---- Scroll suave (Lenis) ---- */
  let lenis = null;
  if (!reduced && typeof Lenis !== 'undefined') {
    try {
      lenis = new Lenis({ duration: 1.1, smoothWheel: true });
      window.JRLenis = lenis;
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

  /* ---- Navbar + barra de progresso + parallax do hero ---- */
  const nav = document.getElementById('nav');
  const progress = document.querySelector('.scroll-progress');
  const heroPhoto = document.querySelector('.hero-photo img');
  const heroInner = document.querySelector('.hero .container');
  let ticking = false;
  const onScroll = () => {
    const y = window.scrollY;
    if (nav) nav.classList.toggle('scrolled', y > 40);
    if (progress) {
      const max = document.documentElement.scrollHeight - innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    }
    if (!reduced && y < innerHeight * 1.2) {
      if (heroPhoto) heroPhoto.style.transform = `translate3d(0,${y * 0.25}px,0) scale(1.08)`;
      if (heroInner) {
        heroInner.style.transform = `translate3d(0,${y * 0.12}px,0)`;
        heroInner.style.opacity = String(Math.max(0, 1 - y / (innerHeight * 0.85)));
      }
    }
    ticking = false;
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---- Menu mobile ---- */
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (toggle && links) {
    toggle.addEventListener('click', () => {
      const open = links.classList.toggle('open');
      toggle.classList.toggle('open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
    links.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => {
      links.classList.remove('open'); toggle.classList.remove('open');
    }));
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

  /* ---- Brilho que segue o cursor nos cards ---- */
  if (canHover && !reduced) {
    document.addEventListener('pointermove', (e) => {
      const card = e.target.closest && e.target.closest('.spot, .vcard');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - r.left}px`);
      card.style.setProperty('--my', `${e.clientY - r.top}px`);
    }, { passive: true });
  }

  /* ---- Culto: "ao vivo agora" e contagem para o próximo sábado 18h ---- */
  // Campo Grande/MS = UTC-4 o ano todo (sem horário de verão desde 2019)
  const CULTO = { day: 6, hour: 18, durMin: 150, offset: -4 };
  const LIVE_URL = 'https://www.youtube.com/@JuventudeRelevante/streams';
  function cultoState(now = Date.now()) {
    const local = new Date(now + CULTO.offset * 3600e3); // relógio de CG lido via getUTC*
    const start = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), CULTO.hour));
    start.setUTCDate(start.getUTCDate() + ((CULTO.day - local.getUTCDay() + 7) % 7));
    const end = new Date(start.getTime() + CULTO.durMin * 60e3);
    if (local >= end) start.setUTCDate(start.getUTCDate() + 7);
    const live = local >= start && local < end;
    return { live, ms: start - local, today: !live && start - local < 864e5 && start.getUTCDate() === local.getUTCDate() };
  }
  const fmtLeft = (ms) => {
    const m = Math.max(1, Math.round(ms / 60e3)), h = Math.floor(m / 60), d = Math.floor(h / 24);
    if (d >= 1) return `em ${d} dia${d > 1 ? 's' : ''}`;
    if (h >= 1) return `em ${h}h${String(m % 60).padStart(2, '0')}`;
    return `em ${m} min`;
  };

  let liveBar = null;
  function renderCulto() {
    const s = cultoState();
    document.querySelectorAll('[data-next-culto]').forEach((el) => {
      el.innerHTML = s.live
        ? `<a href="/aovivo"><i></i>Acontecendo agora · assistir ao vivo</a>`
        : `<span><i></i>Próximo culto ${s.today ? 'hoje' : 'sábado'}, ${fmtLeft(s.ms)}</span>`;
      el.classList.toggle('is-live', s.live);
    });
    // na própria página /aovivo o player já está na tela: sem a pílula
    if (document.body.classList.contains('page-live')) return;
    let dismissed = false;
    try { dismissed = sessionStorage.getItem('jr_live_x') === (s.live ? 'live' : 'today'); } catch (_) {}
    const show = (s.live || s.today) && !dismissed;
    if (!show) { if (liveBar) liveBar.hidden = true; return; }
    if (!liveBar) {
      liveBar = document.createElement('div');
      liveBar.className = 'live-pill';
      liveBar.setAttribute('role', 'status');
      document.body.appendChild(liveBar);
      liveBar.addEventListener('click', (e) => {
        if (!e.target.closest('[data-x]')) return;
        liveBar.hidden = true;
        try { sessionStorage.setItem('jr_live_x', liveBar.dataset.mode); } catch (_) {}
      });
    }
    liveBar.hidden = false;
    liveBar.dataset.mode = s.live ? 'live' : 'today';
    liveBar.classList.toggle('is-live', s.live);
    liveBar.innerHTML = s.live
      ? `<a href="/aovivo"><span class="lp-dot"></span><b>Ao vivo agora</b><span class="lp-txt">Culto da Juventude · assistir</span></a><button type="button" data-x aria-label="Fechar">×</button>`
      : `<a href="/aovivo"><span class="lp-dot"></span><b>Hoje tem culto</b><span class="lp-txt">18h · começa ${fmtLeft(s.ms)}</span></a><button type="button" data-x aria-label="Fechar">×</button>`;
  }
  /* ---- Momentos: faixa de fotos em movimento + visualizador ---- */
  const gallery = document.getElementById('gallery');
  if (gallery) {
    // fotos da Conferência Relevante 2026 (selecionadas do Drive da IECG)
    const CAPS = [
      'DOKSA no palco',
      'Dança DOKSA',
      'DOKSA no meio do povo',
      'Celebração',
      'Auditório lotado',
      'Adoração',
      'Atentos à Palavra',
      'Pr. Aldo Giovanni',
      'Palavra',
      'ALEGRIA',
      'Amigos',
      'Abraço',
      'Alegria no culto',
      'Geração Relevante',
      'Louvor',
      'Adoração',
      'Celebração',
      'Juntos',
      'Emoção',
      'Entrega',
      'Primeira vez aqui',
      'Equipe',
      'Ministração de louvor',
      'Palavra',
      'Palavra',
      'Oração',
      'Conferência Relevante 2026',
      'Adoração',
    ];
    const photos = CAPS.map((cap, i) => {
      const n = String(i + 1).padStart(2, '0');
      return { full: `assets/galeria/conf26/c-${n}.jpg`, thumb: `assets/galeria/conf26/thumbs/c-${n}.jpg`, cap };
    });
    const half = Math.ceil(photos.length / 2);
    const rows = [photos.slice(0, half), photos.slice(half)];
    // cada faixa é duplicada para o loop infinito; a cópia fica fora da leitura de tela
    gallery.innerHTML = rows.map((row, r) => {
      const item = (p, dup) => `<button type="button" class="m-item" data-i="${photos.indexOf(p)}"${dup ? ' aria-hidden="true" tabindex="-1"' : ` aria-label="Ampliar: ${p.cap}"`}>
          <img src="${p.thumb}" alt="${dup ? '' : p.cap}" loading="lazy" decoding="async" /></button>`;
      return `<div class="m-row${r ? ' m-rev' : ''}"><div class="m-track">${row.map((p) => item(p)).join('')}${row.map((p) => item(p, true)).join('')}</div></div>`;
    }).join('');

    const lb = document.getElementById('lightbox');
    if (lb) {
      const lbImg = document.getElementById('lbImg');
      const lbCap = document.getElementById('lbCap');
      let idx = 0;
      const show = (i) => {
        idx = (i + photos.length) % photos.length;
        lb.classList.remove('show-img');
        lbImg.src = photos[idx].full;
        lbImg.alt = photos[idx].cap;
        lbCap.textContent = `${photos[idx].cap} · ${idx + 1}/${photos.length}`;
        lbImg.onload = () => lb.classList.add('show-img');
      };
      const open = (i) => {
        show(i);
        lb.classList.add('open');
        lb.setAttribute('aria-hidden', 'false');
        document.documentElement.classList.add('modal-open');
        if (lenis) lenis.stop();
        document.getElementById('lbClose').focus();
      };
      const close = () => {
        lb.classList.remove('open', 'show-img');
        lb.setAttribute('aria-hidden', 'true');
        document.documentElement.classList.remove('modal-open');
        if (lenis) lenis.start();
      };
      gallery.addEventListener('click', (e) => { const b = e.target.closest('.m-item'); if (b) open(+b.dataset.i); });
      document.getElementById('lbClose').addEventListener('click', close);
      document.getElementById('lbPrev').addEventListener('click', (e) => { e.stopPropagation(); show(idx - 1); });
      document.getElementById('lbNext').addEventListener('click', (e) => { e.stopPropagation(); show(idx + 1); });
      lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
      document.addEventListener('keydown', (e) => {
        if (!lb.classList.contains('open')) return;
        if (e.key === 'Escape') close();
        else if (e.key === 'ArrowLeft') show(idx - 1);
        else if (e.key === 'ArrowRight') show(idx + 1);
      });
      // deslizar no celular
      let x0 = null;
      lb.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
      lb.addEventListener('touchend', (e) => {
        if (x0 == null) return;
        const dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1));
        x0 = null;
      });
    }
  }

  /* ---- Botão flutuante de WhatsApp ---- */
  if (!document.querySelector('.wa-float')) {
    const msg = encodeURIComponent('Olá! Vim pelo site da Juventude Relevante e gostaria de mais informações.');
    const wa = document.createElement('a');
    wa.className = 'wa-float';
    wa.href = `https://wa.me/556784661644?text=${msg}`;
    wa.target = '_blank';
    wa.rel = 'noopener';
    wa.setAttribute('aria-label', 'Fale com a gente no WhatsApp');
    wa.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path fill="currentColor" d="M16.04 3C9.4 3 4 8.36 4 14.97c0 2.11.56 4.17 1.62 5.99L4 29l8.25-1.6a12.1 12.1 0 0 0 3.79.6C22.68 28 28 22.64 28 16.03 28 9.42 22.68 3 16.04 3zm0 22.9c-1.24 0-2.45-.2-3.6-.6l-.26-.09-4.9.95.98-4.73-.17-.27a9.9 9.9 0 0 1-1.55-5.2c0-5.47 4.5-9.92 10.02-9.92 5.52 0 10 4.45 10 9.92 0 5.48-4.48 9.94-10.52 9.94zm5.47-7.43c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.57-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.48.71.31 1.27.49 1.7.63.72.23 1.37.2 1.88.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35z"/></svg><span>Fale com a gente</span>';
    wa.addEventListener('click', () => { if (typeof window.gtag === 'function') window.gtag('event', 'whatsapp_click', { link_url: wa.href }); });
    document.body.appendChild(wa);
  }

  window.JRCulto = { state: cultoState, fmtLeft, LIVE_URL };
  renderCulto();
  setInterval(renderCulto, 30e3);

  /* ---- Ministrações: 6 mais recentes na home ---- */
  const grid = document.getElementById('videosGrid');
  if (grid && V) {
    const LIMIT = 6;
    const countEls = document.querySelectorAll('[data-videos-count]');

    const renderState = (msg) => {
      grid.classList.remove('videos-skeleton');
      grid.innerHTML =
        `<div class="videos-state">${msg}<br><br>
          <a class="btn btn-ghost" href="https://www.youtube.com/channel/${V.CHANNEL}" target="_blank" rel="noopener">Ver no YouTube</a>
        </div>`;
    };

    V.fetchAll()
      .then((items) => {
        if (!items.length) { renderState('Em breve novas ministrações por aqui.'); return; }
        grid.classList.remove('videos-skeleton');
        grid.innerHTML = items.slice(0, LIMIT)
          .map((v, i) => V.cardHTML(v, i === 0 ? { feature: true, badge: 'Mais recente' } : {}))
          .join('');
        const rest = Math.max(0, items.length - LIMIT);
        countEls.forEach((el) => {
          el.textContent = el.dataset.videosCount === 'rest' ? `+${rest}` : String(items.length);
        });
        document.querySelectorAll('[data-videos-more]').forEach((el) => { el.hidden = rest === 0; });
        V.animateIn(grid);
        V.enablePreviews(grid);
      })
      .catch(() => renderState('Não foi possível carregar as ministrações agora.'));
  }
})();
