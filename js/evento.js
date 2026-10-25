/* ============================================================
   JUVENTUDE RELEVANTE — Página de um evento (/evento?id=…)
   Reaproveita o conteúdo de detalhes do modal (js/eventos.js).
   ============================================================ */
(function () {
  'use strict';

  const E = window.JREvents;
  const page = document.getElementById('evPage');
  if (!E || !page) return;

  const id = new URLSearchParams(location.search).get('id');
  const esc = E.esc;
  const setMeta = (elId, attr, val) => { const el = document.getElementById(elId); if (el && val) el.setAttribute(attr, val); };

  const fail = (msg) => {
    page.innerHTML = `<div class="container"><div class="post-loading">${esc(msg)}<br><br>
      <a class="btn btn-primary" href="/#eventos">Ver próximos eventos</a></div></div>`;
  };
  if (!id) { fail('Evento não encontrado.'); return; }

  E.fetchEvents()
    .then((all) => {
      const e = all.find((x) => x.id === id || x.slug === id);
      if (!e) { fail('Não encontramos esse evento. Ele pode ter sido encerrado.'); return; }
      const now = new Date();
      const a = E.analyse(e, now);
      const desc = E.sanitize(e.description).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      const lead = desc.slice(0, 160);

      document.title = `${a.t.title}${a.t.sub ? ' · ' + a.t.sub : ''} · ${a.range} · IECG`;
      setMeta('metaDesc', 'content', `${a.range}${a.place ? ' · ' + a.place : ''}. ${lead}`);
      setMeta('ogTitle', 'content', `${a.t.title}${a.t.sub ? ' · ' + a.t.sub : ''}`);
      setMeta('ogDesc', 'content', `${a.range}${a.place ? ' · ' + a.place : ''}`);
      setMeta('canonical', 'href', `https://juventuderelevante.com.br${E.PAGE(e)}`);

      const others = all
        .filter((x) => x.id !== e.id && x.isActive !== false && new Date(x.endDate || x.startDate) >= now)
        .sort((x, y) => new Date(x.startDate) - new Date(y.startDate))
        .slice(0, 3);

      page.innerHTML = `
        <section class="evp-hero">
          ${e.imageUrl ? `<div class="mn-hero-bg" aria-hidden="true"><img src="${esc(e.imageUrl)}" alt="" /></div>` : ''}
          <div class="container">
            <nav class="mn-crumbs hero-in" aria-label="Você está em">
              <a href="/">Início</a><span>/</span><a href="/#eventos">Eventos</a><span>/</span><span>${esc(a.t.title)}</span>
            </nav>
            <div class="evp-grid">
              <div class="evp-media hero-in" style="--d:1">
                ${e.imageUrl ? `<img src="${esc(e.imageUrl)}" alt="${esc(a.t.title)}" />` : ''}
              </div>
              <div class="evp-body ev-${a.status} hero-in" style="--d:2">${E.detailHTML(e, a, { page: true })}</div>
            </div>
          </div>
        </section>
        ${others.length ? `
        <section class="container evp-more">
          <h2 class="mn-h2">Outros eventos</h2>
          <div class="evp-others">
            ${others.map((x) => {
              const xa = E.analyse(x, now);
              return `<a class="mn-pn" href="${E.PAGE(x)}">
                ${x.imageUrl ? `<img src="${esc(x.imageUrl)}" alt="" loading="lazy" />` : ''}
                <span><small>${esc(xa.range)}</small><b>${esc(xa.t.title)}${xa.t.sub ? ' · ' + esc(xa.t.sub) : ''}</b></span>
              </a>`;
            }).join('')}
          </div>
        </section>` : ''}`;

      // dados estruturados (Event) para o Google
      try {
        const ld = {
          '@context': 'https://schema.org', '@type': 'Event',
          name: `${a.t.title}${a.t.sub ? ' · ' + a.t.sub : ''}`,
          startDate: e.startDate, endDate: e.endDate,
          eventAttendanceMode: e.isOnline ? 'https://schema.org/OnlineEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode',
          eventStatus: 'https://schema.org/EventScheduled',
          location: e.isOnline ? { '@type': 'VirtualLocation', url: E.SIGNUP(e) }
            : { '@type': 'Place', name: e.location, address: { '@type': 'PostalAddress', addressLocality: e.city, addressCountry: 'BR' } },
          description: lead,
          organizer: { '@type': 'Organization', name: 'Igreja Evangélica Comunidade Global', url: 'https://juventuderelevante.com.br/' },
          offers: a.minPrice != null ? { '@type': 'Offer', price: a.minPrice, priceCurrency: 'BRL', url: E.SIGNUP(e), availability: a.status === 'full' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock' } : undefined,
        };
        const s = document.createElement('script'); s.type = 'application/ld+json';
        s.textContent = JSON.stringify(ld); document.head.appendChild(s);
      } catch (_) {}
    })
    .catch(() => fail('Não foi possível carregar o evento agora.'));
})();
