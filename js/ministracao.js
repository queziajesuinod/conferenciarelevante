/* ============================================================
   JUVENTUDE RELEVANTE — Detalhe da ministração (blog do vídeo)
   ============================================================ */
(function () {
  'use strict';

  const API = 'https://portal.iecg.com.br/api/public/videos';
  const CHANNEL = 'UCQgiTCH_nbNmvej0ZA6YE5Q';
  const post = document.getElementById('post');

  /* menu mobile */
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (toggle) toggle.addEventListener('click', () => links.classList.toggle('open'));

  const params = new URLSearchParams(location.search);
  const vid = params.get('v');

  const esc = (t) => (t == null ? '' : String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
  const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }); } catch (_) { return ''; } };
  const fmtDur = (s) => {
    if (!s || isNaN(s)) return '';
    s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    const p = (n) => String(n).padStart(2, '0');
    return h ? `${h}h${p(m)}` : `${m}min`;
  };
  const setMeta = (id, attr, val) => { const el = document.getElementById(id); if (el && val) el.setAttribute(attr, val); };

  const fail = (msg) => {
    post.innerHTML =
      `<div class="post-loading">${esc(msg)}<br><br>
        <a class="btn btn-primary" href="/#ministracoes">Ver ministrações</a></div>`;
  };

  if (!vid) { fail('Ministração não encontrada.'); return; }

  fetch(`${API}?channelId=${encodeURIComponent(CHANNEL)}`, { headers: { Accept: 'application/json' } })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((data) => {
      const items = (data && (data.items || data.data || data.videos)) || (Array.isArray(data) ? data : []);
      const v = items.find((x) => x.videoId === vid || x.id === vid);
      if (!v) { fail('Não encontramos essa ministração.'); return; }
      render(v);
    })
    .catch(() => fail('Não foi possível carregar a ministração agora.'));

  function render(v) {
    const title = v.title || 'Ministração';
    const seo = v.seo || {};
    const metaTitle = seo.metaTitle || title;
    const metaDesc = seo.metaDescription || (v.description || '').slice(0, 160);

    // SEO dinâmico
    document.title = `${metaTitle} · Juventude Relevante`;
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
    const summary = v.summary || (v.description ? `<p>${esc(v.description)}</p>` : '');
    const ytUrl = v.youtubeUrl || `https://youtu.be/${v.videoId}`;
    const shareUrl = location.href;

    post.innerHTML = `
      <a class="post-back" href="/#ministracoes">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M11 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        Ministrações
      </a>
      ${v.category ? `<span class="post-cat">${esc(v.category)}</span>` : ''}
      <h1 class="post-title">${esc(title)}</h1>
      <div class="post-meta">
        <span class="spk">${esc(v.speaker || 'Juventude Relevante')}</span>
        ${v.publishedAt ? `<span><svg viewBox="0 0 24 24" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>${fmtDate(v.publishedAt)}</span>` : ''}
        ${v.durationSeconds ? `<span><svg viewBox="0 0 24 24" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>${fmtDur(v.durationSeconds)}</span>` : ''}
      </div>

      <div class="post-player">
        <iframe src="https://www.youtube-nocookie.com/embed/${esc(v.videoId)}"
          title="${esc(title)}" loading="lazy" allowfullscreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"></iframe>
      </div>

      <div class="post-actions">
        <a class="btn btn-primary" href="${esc(ytUrl)}" target="_blank" rel="noopener">
          Assistir no YouTube
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>
        <div class="post-share">
          <a href="https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' — ' + shareUrl)}" target="_blank" rel="noopener" aria-label="Compartilhar no WhatsApp">
            <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 21l2.2-5.3A8.5 8.5 0 1 1 21 11.5z"/></svg>
          </a>
          <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}" target="_blank" rel="noopener" aria-label="Compartilhar no Facebook">
            <svg viewBox="0 0 24 24" stroke-width="2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
          </a>
        </div>
      </div>

      <div class="post-body">
        ${summary ? `<h2>Resumo da mensagem</h2><div class="post-summary">${summary}</div>` : ''}
        ${bullets.length ? `<h2>Pontos principais</h2><ul class="post-bullets">${bullets.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>` : ''}
        ${keywords.length ? `<h2>Palavras-chave</h2><div class="post-keywords">${keywords.map((k) => `<span>${esc(k)}</span>`).join('')}</div>` : ''}
      </div>
    `;

    // JSON-LD VideoObject (SEO)
    try {
      const ld = {
        '@context': 'https://schema.org', '@type': 'VideoObject',
        name: title, description: metaDesc,
        thumbnailUrl: v.thumbnailUrl ? [v.thumbnailUrl] : undefined,
        uploadDate: v.publishedAt, contentUrl: ytUrl,
        embedUrl: `https://www.youtube.com/embed/${v.videoId}`,
        publisher: { '@type': 'Organization', name: 'Juventude Relevante · IECG' },
      };
      const s = document.createElement('script'); s.type = 'application/ld+json';
      s.textContent = JSON.stringify(ld); document.head.appendChild(s);
    } catch (_) {}
  }
})();
