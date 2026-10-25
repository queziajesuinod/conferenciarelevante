/* ============================================================
   JUVENTUDE RELEVANTE — Vídeos (helpers compartilhados)
   Usado pela home, pela lista de ministrações e pelo detalhe.
   ============================================================ */
(function () {
  'use strict';

  const API = 'https://portal.iecg.com.br/api/public/videos';
  const CHANNEL = 'UCQgiTCH_nbNmvej0ZA6YE5Q';
  const PAGE = 100;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;

  const esc = (t) => (t == null ? '' : String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));

  const fmtDate = (iso, month = 'short') => {
    try {
      return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month, year: 'numeric' });
    } catch (_) { return ''; }
  };
  const fmtDur = (s) => {
    if (!s || isNaN(s)) return '';
    s = Math.round(s);
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const p = (n) => String(n).padStart(2, '0');
    return h ? `${h}:${p(m)}:${p(sec)}` : `${m}:${p(sec)}`;
  };

  // Título do YouTube vem como "| Série Sozo | Levanta e Anda | Pra. Rebeca |"
  // → separa em série + título, descartando o nome do pregador (já exibido à parte).
  //   Os títulos variam muito ("|", "│", " l "), então também remove ruído
  //   como "Culto Juventude Relevante", "18H", "Ao vivo 19h30".
  const NOISE = /^((culto\s+)?juventude\s+relevante|\d{1,2}\s*h(\d{2})?|ao\s+vivo.*)$/i;
  const SPEAKER = /^(pr|pra|pastor|pastora|ap|bp)\.?\s/i;
  const nice = (s) => (s === s.toUpperCase() ? s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()) : s);
  const parseTitle = (v) => {
    const raw = (v.title || 'Ministração').trim();
    const parts = raw.split(/\s*[|│]\s*|\s+l\s+/).map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const clean = parts.filter((p) => !SPEAKER.test(p) && !NOISE.test(p)).map(nice);
    if (!clean.length) return { title: raw, series: '' };
    if (clean.length === 1) return { title: clean[0], series: '' };
    return { series: clean[0], title: clean.slice(1).join(' · ') };
  };

  // "Pr. Aldo" e "Pr. Aldo Giovanni" são a mesma pessoa → agrupa pelas 2 primeiras palavras
  const speakerKey = (s) => (s || '').toLowerCase().split(/\s+/).slice(0, 2).join(' ');

  // chave estável da série (usada em /serie?s= e no filtro de /ministracoes?f=)
  const seriesKey = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  const seriesUrl = (s) => `/serie?s=${encodeURIComponent(seriesKey(s))}`;

  // agrupa por série (só as que têm 2+ mensagens), mais recente primeiro
  function groupSeries(items, min = 2) {
    const map = new Map();
    items.forEach((v) => {
      const s = parseTitle(v).series;
      if (!s) return;
      const k = seriesKey(s);
      if (!map.has(k)) map.set(k, { key: k, name: s, items: [] });
      map.get(k).items.push(v);
    });
    return [...map.values()].filter((g) => g.items.length >= min)
      .sort((a, b) => new Date(b.items[0].publishedAt) - new Date(a.items[0].publishedAt));
  }

  const thumbOf = (v) => v.thumbnailUrl || (v.videoId ? `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg` : '');
  const hdThumbOf = (v) => (v.videoId ? `https://i.ytimg.com/vi/${v.videoId}/maxresdefault.jpg` : thumbOf(v));
  const urlOf = (v) => v.youtubeUrl || (v.videoId ? `https://youtu.be/${v.videoId}` : '#');
  const detailUrl = (v) => (v.videoId ? `/ministracao?v=${encodeURIComponent(v.videoId)}` : urlOf(v));

  /* ---- Busca todos os vídeos (a API pagina em 20 por padrão) ---- */
  let cache = null;
  function fetchAll() {
    if (cache) return cache;
    const base = `${API}?channelId=${encodeURIComponent(CHANNEL)}&limit=${PAGE}`;
    const get = (offset) =>
      fetch(`${base}&offset=${offset}`, { headers: { Accept: 'application/json' } })
        .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });

    cache = get(0).then(async (data) => {
      let items = (data && (data.items || data.data || data.videos)) || (Array.isArray(data) ? data : []);
      const total = data && data.total;
      // segue paginando se o servidor limitar a página (com teto de segurança)
      for (let off = items.length, i = 0; total && off < total && i < 10; i++) {
        const more = await get(off);
        const page = more.items || [];
        if (!page.length) break;
        items = items.concat(page);
        off += page.length;
      }
      items.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
      return items;
    });
    cache.catch(() => { cache = null; });
    return cache;
  }

  /* ---- Card de vídeo ---- */
  function cardHTML(v, opts = {}) {
    const dur = fmtDur(v.durationSeconds);
    const t = parseTitle(v);
    const thumb = opts.feature ? hdThumbOf(v) : thumbOf(v);
    return (
      `<a class="vcard${opts.feature ? ' vcard-feature' : ''}" href="${esc(detailUrl(v))}" data-vid="${esc(v.videoId || '')}"${opts.style ? ` style="${opts.style}"` : ''}>
        <div class="vthumb">
          <img src="${esc(thumb)}" alt="${esc(t.title)}" loading="lazy"
               onerror="this.onerror=null;this.src='${esc(thumbOf(v))}'" />
          <span class="play" aria-hidden="true"><span><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg></span></span>
          ${opts.badge ? `<span class="vbadge">${esc(opts.badge)}</span>` : ''}
          ${dur ? `<span class="dur">${dur}</span>` : ''}
        </div>
        <div class="vbody">
          <div class="vtags">
            ${v.category ? `<span class="vcat">${esc(v.category)}</span>` : ''}
            ${t.series && t.series.toLowerCase() !== (v.category || '').toLowerCase() ? `<span class="vseries">${esc(t.series)}</span>` : ''}
          </div>
          <h4>${esc(t.title)}</h4>
          <div class="vmeta">
            <span class="spk">${esc(v.speaker || 'Juventude Relevante')}</span>
            <span>${fmtDate(v.publishedAt)}</span>
          </div>
          <span class="vcta">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            ${v.summary ? 'Ver resumo' : 'Assistir'}
            <svg class="vcta-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </span>
        </div>
      </a>`
    );
  }

  /* ---- Preview do vídeo ao passar o mouse ---- */
  function enablePreviews(root = document) {
    if (reduced || !canHover) return;
    root.querySelectorAll('.vcard:not([data-pv])').forEach((card) => {
      card.dataset.pv = '1';
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
        }, 450);
      });
      card.addEventListener('mouseleave', () => {
        clearTimeout(timer);
        const p = thumb.querySelector('.preview');
        if (p) p.remove();
        card.classList.remove('previewing');
      });
    });
  }

  /* ---- Entrada escalonada dos cards ---- */
  function animateIn(root) {
    const cards = root.querySelectorAll('.vcard:not(.vin)');
    if (reduced || !('IntersectionObserver' in window)) { cards.forEach((c) => c.classList.add('vin')); return; }
    const io = new IntersectionObserver((entries) => {
      let n = 0;
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.style.transitionDelay = `${Math.min(n++, 6) * 70}ms`;
        en.target.classList.add('vin');
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    cards.forEach((c) => io.observe(c));
  }

  window.JRVideos = {
    API, CHANNEL, esc, fmtDate, fmtDur, parseTitle, speakerKey, seriesKey, seriesUrl, groupSeries,
    thumbOf, hdThumbOf, urlOf, detailUrl, fetchAll, cardHTML, enablePreviews, animateIn,
  };
})();
