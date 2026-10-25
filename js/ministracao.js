/* ============================================================
   JUVENTUDE RELEVANTE — Detalhe da ministração (blog do vídeo)
   ============================================================ */
(function () {
  'use strict';

  const V = window.JRVideos;
  const post = document.getElementById('post');

  const params = new URLSearchParams(location.search);
  const vid = params.get('v');

  const esc = V.esc;
  const fmtDur = (s) => {
    if (!s || isNaN(s)) return '';
    s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
    const p = (n) => String(n).padStart(2, '0');
    return h ? `${h}h${p(m)}` : `${m}min`;
  };
  const setMeta = (id, attr, val) => { const el = document.getElementById(id); if (el && val) el.setAttribute(attr, val); };
  const initials = (name) => (name || 'JR').replace(/^(pra?|ap|bp)\.?\s+/i, '').split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  const ICON = {
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
    arrowR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    arrowL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M6 13l6 6 6-6"/></svg>',
    yt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3V9z" fill="currentColor" stroke="none"/></svg>',
    wa: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 21l2.2-5.3A8.5 8.5 0 1 1 21 11.5z"/></svg>',
    fb: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>',
    link: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5"/></svg>',
  };

  const fail = (msg) => {
    post.innerHTML =
      `<div class="container"><div class="post-loading">${esc(msg)}<br><br>
        <a class="btn btn-primary" href="/ministracoes">Ver ministrações</a></div></div>`;
  };

  if (!vid) { fail('Ministração não encontrada.'); return; }

  // busca todas as páginas da API (antes só os 20 primeiros eram encontrados)
  V.fetchAll()
    .then((items) => {
      const i = items.findIndex((x) => x.videoId === vid || x.id === vid);
      if (i < 0) { fail('Não encontramos essa ministração.'); return; }
      render(items[i], items[i + 1], items[i - 1], items);
    })
    .catch(() => fail('Não foi possível carregar a ministração agora.'));

  function render(v, older, newer, items) {
    const t = V.parseTitle(v);
    const title = t.title;
    const seo = v.seo || {};
    const metaTitle = seo.metaTitle || v.title || title;
    const metaDesc = seo.metaDescription || (v.description || '').slice(0, 160);

    // SEO dinâmico
    document.title = `${title} · ${v.speaker || 'Juventude Relevante'} · Juventude Relevante`;
    setMeta('metaDesc', 'content', metaDesc);
    setMeta('ogTitle', 'content', metaTitle);
    setMeta('ogDesc', 'content', metaDesc);
    const canonUrl = `https://juventuderelevante.com.br/ministracao?v=${encodeURIComponent(v.videoId)}`;
    setMeta('canonical', 'href', canonUrl);
    const ogu = document.createElement('meta'); ogu.setAttribute('property', 'og:url'); ogu.content = canonUrl; document.head.appendChild(ogu);
    if (v.thumbnailUrl) {
      const og = document.createElement('meta'); og.setAttribute('property', 'og:image'); og.content = v.thumbnailUrl;
      document.head.appendChild(og);
    }

    const keywords = Array.isArray(seo.keywords) ? seo.keywords : [];
    const bullets = Array.isArray(v.bulletPoints) ? v.bulletPoints : [];
    // perguntas da célula: usa as do portal se existirem; senão monta a partir dos pontos principais
    const apiQ = [v.cellQuestions, v.discussionQuestions, v.questions].find((q) => Array.isArray(q) && q.length);
    const questions = apiQ || (bullets.length ? [
      'Qual dos pontos principais desta mensagem mais falou com você? Por quê?',
      ...bullets.slice(0, 2).map((b) => `“${b.replace(/[.!]+$/, '')}.” Como isso se aplica à sua vida nesta semana?`),
      'Que atitude prática você vai tomar a partir desta palavra?',
      'Como podemos orar uns pelos outros sobre isso?',
    ] : []);
    const summary = v.summary || (v.description ? `<p>${esc(v.description)}</p>` : '');
    const words = summary.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
    const readMin = Math.max(1, Math.round(words / 200));
    const ytUrl = v.youtubeUrl || `https://youtu.be/${v.videoId}`;
    const shareUrl = canonUrl;
    const cellText = `📖 *${title}* — ${v.speaker || 'Juventude Relevante'}\n\nPerguntas para a célula:\n` +
      questions.map((q, i) => `${i + 1}. ${q}`).join('\n') + `\n\nAssista e leia o resumo: ${shareUrl}`;
    const showSeries = t.series && t.series.toLowerCase() !== (v.category || '').toLowerCase();
    const seriesHref = showSeries ? V.seriesUrl(t.series) : '';

    const navCard = (x, dir) => {
      if (!x) return '<span></span>';
      const xt = V.parseTitle(x);
      return `<a class="mn-pn mn-pn-${dir}" href="${esc(V.detailUrl(x))}">
        <img src="${esc(V.thumbOf(x))}" alt="" loading="lazy" />
        <span>
          <small>${dir === 'prev' ? ICON.arrowL + ' Mensagem anterior' : 'Próxima mensagem ' + ICON.arrowR}</small>
          <b>${esc(xt.title)}</b>
        </span>
      </a>`;
    };

    post.innerHTML = `
      <section class="mn-hero">
        <div class="mn-hero-bg" aria-hidden="true"><img src="${esc(V.hdThumbOf(v))}" alt="" onerror="this.onerror=null;this.src='${esc(V.thumbOf(v))}'" /></div>
        <div class="container">
          <nav class="mn-crumbs hero-in" aria-label="Você está em">
            <a href="/">Início</a><span>/</span><a href="/ministracoes">Ministrações</a>${showSeries ? `<span>/</span><a href="${esc(seriesHref)}">${esc(t.series)}</a>` : ''}
          </nav>
          <div class="mn-tags hero-in" style="--d:1">
            ${v.category ? `<span class="post-cat">${esc(v.category)}</span>` : ''}
            ${showSeries ? `<a class="mn-series" href="${esc(seriesHref)}">${/^s[ée]rie\b/i.test(t.series) ? '' : 'Série · '}${esc(t.series)}</a>` : ''}
          </div>
          <h1 class="mn-title hero-in" style="--d:2">${esc(title)}</h1>
          ${metaDesc ? `<p class="mn-lead hero-in" style="--d:3">${esc(metaDesc)}</p>` : ''}
          <div class="mn-meta hero-in" style="--d:4">
            <span class="mn-spk"><i>${esc(initials(v.speaker))}</i>${esc(v.speaker || 'Juventude Relevante')}</span>
            ${v.publishedAt ? `<span>${ICON.cal}${V.fmtDate(v.publishedAt, 'long')}</span>` : ''}
            ${v.durationSeconds ? `<span>${ICON.clock}${fmtDur(v.durationSeconds)} de vídeo</span>` : ''}
            ${summary ? `<span>${ICON.book}${readMin} min de leitura</span>` : ''}
          </div>
        </div>
      </section>

      <div class="container">
        <div class="mn-player hero-in" style="--d:5">
          <iframe src="https://www.youtube-nocookie.com/embed/${esc(v.videoId)}?rel=0&modestbranding=1"
            title="${esc(title)}" allowfullscreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"></iframe>
        </div>

        <div class="mn-jump">
          ${summary ? `<a class="btn btn-primary" href="#resumo" data-jump>${ICON.book} Ler o resumo ${ICON.down}</a>` : ''}
          ${bullets.length ? `<a class="btn btn-ghost" href="#pontos" data-jump>${bullets.length} pontos principais</a>` : ''}
          <a class="btn btn-ghost" href="${esc(ytUrl)}" target="_blank" rel="noopener">${ICON.yt} Abrir no YouTube</a>
        </div>

        <div class="mn-layout">
          <article class="mn-main">
            ${summary ? `
            <section class="mn-block reveal" id="resumo">
              <span class="eyebrow">Resumo da mensagem</span>
              <div class="mn-summary">${summary}</div>
            </section>` : ''}
            ${bullets.length ? `
            <section class="mn-block reveal" id="pontos">
              <span class="eyebrow">Pontos principais</span>
              <ol class="mn-points">${bullets.map((b, i) => `<li class="spot"><span class="n">${String(i + 1).padStart(2, '0')}</span><p>${esc(b)}</p></li>`).join('')}</ol>
            </section>` : ''}
            ${questions.length ? `
            <section class="mn-block reveal" id="celula">
              <div class="mn-cell">
                <span class="eyebrow">Para conversar na célula</span>
                <h3>Leve essa palavra para o seu grupo</h3>
                <ol class="mn-questions">${questions.map((q) => `<li>${esc(q)}</li>`).join('')}</ol>
                <div class="mn-cell-actions">
                  <a class="btn btn-primary" href="https://api.whatsapp.com/send?text=${encodeURIComponent(cellText)}" target="_blank" rel="noopener">${ICON.wa} Enviar para o grupo</a>
                  <button type="button" class="btn btn-ghost" data-copy-q>${ICON.link} <span>Copiar perguntas</span></button>
                </div>
              </div>
            </section>` : ''}
          </article>

          <aside class="mn-side">
            <div class="mn-card reveal">
              <h3>Compartilhe essa palavra</h3>
              <p>Envie para sua célula ou para alguém que precisa ouvir.</p>
              <div class="mn-share">
                <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' — ' + shareUrl)}" target="_blank" rel="noopener" class="wa">${ICON.wa}<span>WhatsApp</span></a>
                <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}" target="_blank" rel="noopener">${ICON.fb}<span>Facebook</span></a>
                <button type="button" data-copy="${esc(shareUrl)}">${ICON.link}<span>Copiar link</span></button>
              </div>
            </div>
            ${keywords.length ? `
            <div class="mn-card reveal" data-delay="1">
              <h3>Temas</h3>
              <div class="post-keywords">${keywords.map((k) => `<a href="/ministracoes?q=${encodeURIComponent(k)}">${esc(k)}</a>`).join('')}</div>
            </div>` : ''}
            <div class="mn-card mn-card-cta reveal" data-delay="2">
              <h3>Faça parte de uma célula</h3>
              <p>Viva essa palavra em comunidade, perto de você.</p>
              <a class="btn btn-primary" href="https://start.iecg.com.br/" target="_blank" rel="noopener">Quero me conectar ${ICON.arrowR}</a>
            </div>
          </aside>
        </div>

        <nav class="mn-prevnext reveal" aria-label="Outras ministrações">
          ${navCard(older, 'prev')}
          ${navCard(newer, 'next')}
        </nav>
      </div>
    `;

    // rolagem suave para "Ler o resumo"
    post.querySelectorAll('[data-jump]').forEach((a) => a.addEventListener('click', (e) => {
      const el = document.querySelector(a.getAttribute('href'));
      if (!el) return;
      e.preventDefault();
      if (window.JRLenis) window.JRLenis.scrollTo(el, { offset: -90 });
      else el.scrollIntoView({ behavior: 'smooth' });
    }));

    // copiar link
    const copy = post.querySelector('[data-copy]');
    if (copy) copy.addEventListener('click', () => {
      const done = () => {
        const s = copy.querySelector('span'); s.textContent = 'Link copiado!'; copy.classList.add('ok');
        setTimeout(() => { s.textContent = 'Copiar link'; copy.classList.remove('ok'); }, 2200);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(copy.dataset.copy).then(done, () => {});
    });

    // copiar perguntas da célula
    const copyQ = post.querySelector('[data-copy-q]');
    if (copyQ) copyQ.addEventListener('click', () => {
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(cellText).then(() => {
        const s = copyQ.querySelector('span'); s.textContent = 'Copiado!';
        setTimeout(() => { s.textContent = 'Copiar perguntas'; }, 2200);
      }, () => {});
    });

    renderRelated(v, items);
    revealIn(post);

    // JSON-LD VideoObject (SEO)
    try {
      const ld = {
        '@context': 'https://schema.org', '@type': 'VideoObject',
        name: metaTitle, description: metaDesc,
        thumbnailUrl: v.thumbnailUrl ? [v.thumbnailUrl] : undefined,
        uploadDate: v.publishedAt, contentUrl: ytUrl,
        embedUrl: `https://www.youtube.com/embed/${v.videoId}`,
        publisher: { '@type': 'Organization', name: 'Juventude Relevante · IECG' },
      };
      const s = document.createElement('script'); s.type = 'application/ld+json';
      s.textContent = JSON.stringify(ld); document.head.appendChild(s);
    } catch (_) {}
  }

  // home.js observa .reveal só no carregamento; aqui o conteúdo chega depois
  function revealIn(root) {
    const els = root.querySelectorAll('.reveal:not(.in)');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('in')); return; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    els.forEach((e) => io.observe(e));
  }

  /* ---- Mais ministrações: mesma série primeiro, depois as mais próximas ---- */
  function renderRelated(v, items) {
    const series = V.parseTitle(v).series.toLowerCase();
    const others = items.filter((x) => x.videoId !== v.videoId);
    const same = series ? others.filter((x) => V.parseTitle(x).series.toLowerCase() === series) : [];
    const pick = same.concat(others.filter((x) => !same.includes(x))).slice(0, 3);
    if (!pick.length) return;
    const sec = document.createElement('section');
    sec.className = 'container post-related';
    sec.innerHTML = `
      <div class="post-related-head">
        <h2 class="mn-h2">${same.length ? 'Da mesma série' : 'Continue assistindo'}</h2>
        <a class="btn btn-ghost" href="/ministracoes">Ver todas ${ICON.arrowR}</a>
      </div>
      <div class="videos-grid">${pick.map((x) => V.cardHTML(x)).join('')}</div>`;
    post.appendChild(sec);
    V.animateIn(sec);
    V.enablePreviews(sec);
  }
})();
