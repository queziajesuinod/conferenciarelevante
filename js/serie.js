/* ============================================================
   JUVENTUDE RELEVANTE — Página de uma série (/serie?s=…)
   Episódios em ordem (do primeiro ao último) + outras séries.
   ============================================================ */
(function () {
  'use strict';

  const V = window.JRVideos;
  const page = document.getElementById('seriePage');
  if (!V || !page) return;

  const key = V.seriesKey(new URLSearchParams(location.search).get('s') || '');
  const esc = V.esc;
  const setMeta = (id, attr, val) => { const el = document.getElementById(id); if (el && val) el.setAttribute(attr, val); };
  const ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';

  const fail = (msg) => {
    page.innerHTML = `<div class="container"><div class="post-loading">${esc(msg)}<br><br>
      <a class="btn btn-primary" href="/ministracoes">Ver ministrações</a></div></div>`;
  };

  V.fetchAll()
    .then((items) => {
      const groups = V.groupSeries(items);
      // aceita também série com 1 mensagem (o link da página do vídeo pode apontar pra ela)
      const g = V.groupSeries(items, 1).find((x) => x.key === key);
      if (!g) { fail('Série não encontrada.'); return; }
      const eps = g.items.slice().reverse(); // do primeiro ao último
      const first = eps[0], last = eps[eps.length - 1];
      const secs = eps.reduce((s, v) => s + (v.durationSeconds || 0), 0);
      const hours = secs >= 3600 ? `${Math.floor(secs / 3600)}h${String(Math.round((secs % 3600) / 60)).padStart(2, '0')}` : `${Math.round(secs / 60)}min`;
      const speakers = [...new Map(eps.map((v) => [V.speakerKey(v.speaker), v.speaker])).values()].filter(Boolean);
      const name = g.name.replace(/^s[ée]rie\s+/i, '');

      document.title = `Série ${name} · ${eps.length} mensagens · Juventude Relevante`;
      const desc = `Série "${name}" da Juventude Relevante: ${eps.length} mensagens com ${speakers.join(', ')}. Assista em ordem e leia os resumos.`;
      setMeta('metaDesc', 'content', desc);
      setMeta('ogTitle', 'content', `Série ${name} · Juventude Relevante`);
      setMeta('ogDesc', 'content', desc);
      setMeta('canonical', 'href', `https://juventuderelevante.com.br${V.seriesUrl(g.name)}`);

      page.innerHTML = `
        <section class="mn-hero sr-hero">
          <div class="mn-hero-bg" aria-hidden="true"><img src="${esc(V.hdThumbOf(last))}" alt="" onerror="this.onerror=null;this.src='${esc(V.thumbOf(last))}'" /></div>
          <div class="container sr-head">
            <div>
              <nav class="mn-crumbs hero-in" aria-label="Você está em">
                <a href="/">Início</a><span>/</span><a href="/ministracoes">Ministrações</a><span>/</span><span>Séries</span>
              </nav>
              <span class="eyebrow hero-in" style="--d:1">Série</span>
              <h1 class="mn-title hero-in" style="--d:2">${esc(name)}</h1>
              <div class="mn-meta hero-in" style="--d:3">
                <span><b>${eps.length}</b>&nbsp;mensagens</span>
                <span>${hours} de Palavra</span>
                <span>${esc(speakers.join(' · '))}</span>
                <span>${V.fmtDate(first.publishedAt, 'short')} – ${V.fmtDate(last.publishedAt, 'short')}</span>
              </div>
              <div class="mn-jump hero-in" style="--d:4">
                <a class="btn btn-primary" href="${esc(V.detailUrl(first))}">${PLAY.replace('<svg', '<svg fill="currentColor"')} Começar do episódio 1</a>
                <a class="btn btn-ghost" href="${esc(V.detailUrl(last))}">Último episódio</a>
              </div>
            </div>
            <a class="sr-cover hero-in" style="--d:3" href="${esc(V.detailUrl(first))}" aria-label="Assistir ao episódio 1">
              <img src="${esc(V.hdThumbOf(first))}" alt="" onerror="this.onerror=null;this.src='${esc(V.thumbOf(first))}'" />
              <span class="play" aria-hidden="true"><span>${PLAY}</span></span>
            </a>
          </div>
        </section>

        <section class="container sr-list-wrap">
          <h2 class="mn-h2">Episódios</h2>
          <ol class="sr-list">
            ${eps.map((v, i) => {
              const t = V.parseTitle(v);
              return `<li class="reveal" style="transition-delay:${Math.min(i, 6) * 60}ms">
                <a class="sr-ep spot" href="${esc(V.detailUrl(v))}">
                  <span class="sr-n">${String(i + 1).padStart(2, '0')}</span>
                  <span class="sr-thumb"><img src="${esc(V.thumbOf(v))}" alt="" loading="lazy" />${v.durationSeconds ? `<em>${V.fmtDur(v.durationSeconds)}</em>` : ''}</span>
                  <span class="sr-txt">
                    <b>${esc(t.title)}</b>
                    <small>${esc(v.speaker || '')} · ${V.fmtDate(v.publishedAt)}</small>
                    ${v.seo && v.seo.metaDescription ? `<span class="sr-desc">${esc(v.seo.metaDescription)}</span>` : ''}
                  </span>
                  <span class="vcta">Ver resumo ${ARROW}</span>
                </a>
              </li>`;
            }).join('')}
          </ol>
        </section>

        ${groups.length > 1 ? `
        <section class="container sr-others">
          <h2 class="mn-h2">Outras séries</h2>
          <div class="sr-grid">
            ${groups.filter((x) => x.key !== g.key).map((x) => seriesCard(x)).join('')}
          </div>
        </section>` : ''}`;

      revealIn(page);
    })
    .catch(() => fail('Não foi possível carregar a série agora.'));

  function seriesCard(x) {
    const latest = x.items[0];
    return `<a class="sr-card spot" href="${V.seriesUrl(x.name)}">
      <span class="sr-card-img"><img src="${esc(V.thumbOf(latest))}" alt="" loading="lazy" /></span>
      <span class="sr-card-body"><small>${x.items.length} mensagens</small><b>${esc(x.name.replace(/^s[ée]rie\s+/i, ''))}</b></span>
    </a>`;
  }
  window.JRSeriesCard = seriesCard;

  function revealIn(root) {
    const els = root.querySelectorAll('.reveal:not(.in)');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.1 });
    els.forEach((e) => io.observe(e));
  }
})();
