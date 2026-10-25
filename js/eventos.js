/* ============================================================
   JUVENTUDE RELEVANTE — Próximos eventos (API pública do portal)
   Cards com data, preço e status + modal de detalhes.
   A quantidade de vagas não é exibida (só "Últimas vagas"/"Esgotado").
   ============================================================ */
(function () {
  'use strict';

  const root = document.getElementById('eventsList');

  const API = (root && root.dataset.api) || 'https://portal.iecg.com.br/api/public/events';
  const PAGE = (e) => `/evento?id=${encodeURIComponent(e.id)}`;
  const SIGNUP = (e) => `https://app.iecg.com.br/eventos/${encodeURIComponent(e.id)}`;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const esc = (t) => (t == null ? '' : String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
  const TZ = 'America/Campo_Grande';
  const fmt = (d, o) => d.toLocaleString('pt-BR', Object.assign({ timeZone: TZ }, o));
  const money = (n) => Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: Number(n) % 1 ? 2 : 0 });
  const TYPES = { ENCONTRO: 'Encontro', DEVOCIONAL: 'Devocional', CONFERENCIA: 'Conferência', CULTO: 'Culto', RETIRO: 'Retiro', CURSO: 'Curso', ACAMPAMENTO: 'Acampamento' };
  const typeLabel = (t) => TYPES[t] || (t ? t.charAt(0) + t.slice(1).toLowerCase() : 'Evento');

  // "ENCONTRO COM DEUS - MULHERES - NOVEMBRO  2026" → título + subtítulo
  const splitTitle = (raw) => {
    const parts = (raw || 'Evento').replace(/\s+/g, ' ').split(/\s+-\s+/).filter(Boolean);
    const noise = /^(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)\w*\.?\s*\d{4}$/i;
    const clean = parts.filter((p) => !noise.test(p));
    return { title: clean[0] || raw, sub: clean.slice(1).join(' · ') };
  };

  // descrição vem do editor do portal: mantém só a marcação de texto
  const sanitize = (html) => {
    const doc = new DOMParser().parseFromString(html || '', 'text/html');
    doc.querySelectorAll('script,style,iframe,object,embed,form,img,link,meta').forEach((n) => n.remove());
    doc.body.querySelectorAll('*').forEach((n) => {
      [...n.attributes].forEach((a) => { if (!(n.tagName === 'A' && a.name === 'href' && /^https?:/i.test(a.value))) n.removeAttribute(a.name); });
      if (n.tagName === 'A') { n.setAttribute('target', '_blank'); n.setAttribute('rel', 'noopener'); }
    });
    // remove quebras sobrando no começo/fim dos parágrafos e parágrafos vazios
    doc.body.querySelectorAll('p,li,div').forEach((n) => {
      const trim = (side) => {
        let c = side === 'first' ? n.firstChild : n.lastChild;
        while (c && (c.nodeName === 'BR' || (c.nodeType === 3 && !c.textContent.replace(/ /g, '').trim()))) {
          const next = side === 'first' ? c.nextSibling : c.previousSibling; c.remove(); c = next;
        }
      };
      trim('first'); trim('last');
      if (!n.textContent.replace(/ /g, '').trim()) n.remove();
    });
    return doc.body.innerHTML.replace(/(&nbsp;|\s)+(<\/)/g, '$2');
  };

  function analyse(e, now) {
    const start = new Date(e.startDate), end = new Date(e.endDate || e.startDate);
    const batches = (e.batches || []).filter((b) => b.isActive !== false);
    const open = batches.filter((b) => new Date(b.startDate) <= now && new Date(b.endDate) >= now &&
      (b.maxQuantity == null || b.currentQuantity < b.maxQuantity));
    const upcoming = batches.filter((b) => new Date(b.startDate) > now).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
    const prices = (open.length ? open : batches).map((b) => Number(b.price)).filter((n) => !isNaN(n));
    const minPrice = prices.length ? Math.min(...prices) : null;
    const max = e.maxRegistrations, cur = e.currentRegistrations || 0;
    const left = max ? Math.max(0, max - cur) : null;
    const soldOut = left === 0 || (batches.length > 0 && !open.length && !upcoming.length && end >= now);

    let status = 'open', statusLabel = e.isOnline ? 'Vendas abertas' : 'Inscrições abertas';
    if (soldOut) { status = 'full'; statusLabel = e.waitlistEnabled ? 'Lista de espera' : 'Esgotado'; }
    else if (!open.length && upcoming.length) { status = 'soon'; statusLabel = `Inscrições a partir de ${fmt(new Date(upcoming[0].startDate), { day: '2-digit', month: 'short' })}`; }
    // a quantidade de vagas não é divulgada, só o aviso de que estão acabando
    else if (left != null && left <= 10) { status = 'last'; statusLabel = 'Últimas vagas'; }

    const sameDay = fmt(start, { dateStyle: 'short' }) === fmt(end, { dateStyle: 'short' });
    const sameMonth = fmt(start, { month: 'numeric', year: 'numeric' }) === fmt(end, { month: 'numeric', year: 'numeric' });
    const range = sameDay
      ? fmt(start, { weekday: 'long', day: '2-digit', month: 'long' })
      : sameMonth
        ? `${fmt(start, { day: '2-digit' })} a ${fmt(end, { day: '2-digit', month: 'long' })}`
        : `${fmt(start, { day: '2-digit', month: 'short' })} a ${fmt(end, { day: '2-digit', month: 'short' })}`;

    const days = Math.ceil((start - now) / 864e5);
    let when = start <= now ? (end >= now ? 'Acontecendo agora' : '') : days <= 1 ? 'É amanhã!' : `Faltam ${days} dias`;
    // online/pré-venda já em andamento: o que importa é até quando vai
    const untilMode = e.isOnline && start <= now;
    if (untilMode) when = '';
    const badgeDate = untilMode ? end : start;
    const rangeOut = untilMode ? `Até ${fmt(end, { day: '2-digit', month: 'long' })}` : null;
    const place = e.isOnline ? 'Online' : [e.location, e.city].filter(Boolean).join(' · ');
    const map = !e.isOnline && (e.latitude && e.longitude
      ? `https://www.google.com/maps/search/?api=1&query=${e.latitude},${e.longitude}`
      : e.location ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([e.location, e.city].filter(Boolean).join(' '))}` : '');

    return { start, end, open, batches, minPrice, max, cur, left, status, statusLabel, range: rangeOut || range, when, place, map,
      badgeDate, untilMode, time: e.isOnline ? '' : fmt(start, { hour: '2-digit', minute: '2-digit' }), t: splitTitle(e.title) };
  }

  const priceHTML = (e, a) => {
    if (!e.requiresPayment || a.minPrice === 0) return '<b>Gratuito</b>';
    if (a.minPrice == null) return '';
    const parc = e.maxPaymentCount > 1 ? `<small>em até ${e.maxPaymentCount}x</small>` : '';
    return `<small>${a.batches.length > 1 && new Set(a.batches.map((b) => b.price)).size > 1 ? 'a partir de' : 'investimento'}</small><b>${money(a.minPrice)}</b>${parc}`;
  };

  const ICON = {
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 12-9 12s-9-5-9-12a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18M12 14v5M9.5 16.5h5"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/></svg>',
    ext: '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/></svg>',
  };

  /* ---- Adicionar ao calendário (Google + arquivo .ics para iPhone/Outlook) ---- */
  const stamp = (d) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const plain = (html) => (html || '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|div)>/gi, '\n').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\n{3,}/g, '\n\n').trim();
  const calText = (e, a) => [a.t.title, a.t.sub].filter(Boolean).join(' · ');
  const calDetails = (e) => `${plain(e.description).slice(0, 900)}\n\nInscrições: ${SIGNUP(e)}`;
  const googleCal = (e, a) => 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
    `&text=${encodeURIComponent(calText(e, a))}&dates=${stamp(a.start)}/${stamp(a.end)}` +
    `&details=${encodeURIComponent(calDetails(e))}&location=${encodeURIComponent(a.place || '')}`;
  function downloadIcs(e, a) {
    const icsEsc = (t) => String(t).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Juventude Relevante//Eventos//PT-BR', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      `UID:${e.id}@juventuderelevante.com.br`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(a.start)}`, `DTEND:${stamp(a.end)}`,
      `SUMMARY:${icsEsc(calText(e, a))}`, `DESCRIPTION:${icsEsc(calDetails(e))}`, `LOCATION:${icsEsc(a.place || '')}`,
      `URL:https://juventuderelevante.com.br${PAGE(e)}`,
      'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(a.t.title)} é amanhã`, 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: `${e.slug || 'evento'}.ics` });
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function shareEvent(e, a, btn) {
    const url = `${location.origin}${PAGE(e)}`;
    try {
      if (navigator.share) { await navigator.share({ title: calText(e, a), text: `${a.t.title} · ${a.range}`, url }); return; }
      await navigator.clipboard.writeText(url);
      const s = btn.querySelector('span'); const old = s.textContent; s.textContent = 'Link copiado!';
      setTimeout(() => { s.textContent = old; }, 2000);
    } catch (_) {}
  }

  // registro para os botões (calendário/compartilhar) funcionarem em qualquer lugar da página
  const REG = new Map();
  document.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-ics],[data-share-ev]');
    if (!b) return;
    const m = REG.get(b.dataset.ics || b.dataset.shareEv);
    if (!m) return;
    if (b.dataset.ics) downloadIcs(m.e, m.a); else shareEvent(m.e, m.a, b);
  });

  /* ---- Conteúdo de detalhes (modal e página do evento) ---- */
  function detailHTML(e, a, opts = {}) {
    REG.set(e.id, { e, a });
    const desc = sanitize(e.description);
    const batches = a.batches.slice().sort((x, y) => (x.order || 0) - (y.order || 0));
    const now = new Date();
    const H = opts.page ? 'h1' : 'h3';
    const cal = a.end >= now && !a.untilMode;
    return `
        <div class="ev-tags">
          <span class="ev-type">${esc(typeLabel(e.eventType))}</span>
          <span class="ev-status ev-${a.status}"><i></i>${esc(a.statusLabel)}</span>
        </div>
        <${H} id="${opts.page ? 'evTitle' : 'evModalTitle'}" class="ev-dtitle">${esc(a.t.title)}</${H}>
        ${a.t.sub ? `<p class="ev-sub">${esc(a.t.sub)}</p>` : ''}
        <ul class="ev-info ev-info-lg">
          <li>${ICON.cal}<span><b>${esc(a.range)}</b>${a.when ? ` · ${esc(a.when)}` : ''}</span></li>
          ${a.time && a.time !== '00:00' ? `<li>${ICON.clock}<span>Início às ${a.time}</span></li>` : ''}
          ${a.place ? `<li>${ICON.pin}<span>${esc(a.place)}${a.map ? ` · <a href="${a.map}" target="_blank" rel="noopener">ver no mapa</a>` : ''}</span></li>` : ''}
        </ul>
        <div class="ev-tools">
          ${cal ? `<a class="ev-tool" href="${googleCal(e, a)}" target="_blank" rel="noopener">${ICON.plus}<span>Google Agenda</span></a>
          <button type="button" class="ev-tool" data-ics="${esc(e.id)}">${ICON.plus}<span>iPhone / Outlook</span></button>` : ''}
          <button type="button" class="ev-tool" data-share-ev="${esc(e.id)}">${ICON.share}<span>Compartilhar</span></button>
          ${opts.page ? '' : `<a class="ev-tool" href="${PAGE(e)}">${ICON.ext}<span>Página do evento</span></a>`}
        </div>
        ${desc.replace(/<[^>]+>/g, '').trim() ? `<div class="ev-desc">${desc}</div>` : ''}
        ${batches.length && e.requiresPayment ? `
          <h4>Lotes</h4>
          <ul class="ev-batches">
            ${batches.map((b) => {
              const on = new Date(b.startDate) <= now && new Date(b.endDate) >= now;
              const full = b.maxQuantity != null && b.currentQuantity >= b.maxQuantity;
              const past = new Date(b.endDate) < now;
              const tag = full ? 'Esgotado' : past ? 'Encerrado' : on ? 'Disponível' : `A partir de ${fmt(new Date(b.startDate), { day: '2-digit', month: 'short' })}`;
              return `<li class="${on && !full ? 'on' : 'off'}"><span>${esc(b.name)}</span><em>${esc(tag)}</em><b>${money(b.price)}</b></li>`;
            }).join('')}
          </ul>
          ${e.minDepositAmount && e.registrationPaymentMode === 'BALANCE_DUE' ? `<p class="ev-note">Garanta sua vaga com um sinal a partir de ${money(e.minDepositAmount)} e pague o restante em até ${e.maxPaymentCount || 1}x.</p>` : ''}` : ''}
        <div class="ev-modal-foot">
          <div class="ev-price">${priceHTML(e, a)}</div>
          ${a.status === 'full' && !e.waitlistEnabled ? '<span class="ev-soldout">Inscrições esgotadas</span>' : `<a class="btn btn-primary" href="${SIGNUP(e)}" target="_blank" rel="noopener">${a.status === 'full' ? 'Entrar na lista de espera' : 'Fazer inscrição'} ${ICON.arrow}</a>`}
        </div>`;
  }

  const fetchEvents = () => fetch(API, { headers: { Accept: 'application/json' } })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((data) => (Array.isArray(data) ? data : data.items || data.data || data.events || []));

  window.JREvents = { API, analyse, detailHTML, fetchEvents, splitTitle, typeLabel, esc, fmt, PAGE, SIGNUP, sanitize };

  if (!root) return;

  function cardHTML(e, a, i) {
    return `
      <article class="ev-card ev-${a.status}${i === 0 ? ' ev-feature' : ''}" style="--i:${i}">
        <button type="button" class="ev-media" data-ev="${esc(e.id)}" aria-label="Ver detalhes de ${esc(a.t.title)}">
          ${e.imageUrl
            ? `${i === 0 ? `<img class="ev-bg" src="${esc(e.imageUrl)}" alt="" aria-hidden="true" />` : ''}<img class="ev-img" src="${esc(e.imageUrl)}" alt="" loading="lazy" decoding="async" />`
            : '<span class="ev-noimg"></span>'}
          <span class="ev-date">${a.untilMode ? '<small>até</small>' : ''}<b>${fmt(a.badgeDate, { day: '2-digit' })}</b><span>${fmt(a.badgeDate, { month: 'short' }).replace('.', '')}</span></span>
          ${a.when ? `<span class="ev-when">${esc(a.when)}</span>` : ''}
        </button>
        <div class="ev-body">
          <div class="ev-tags">
            <span class="ev-type">${esc(typeLabel(e.eventType))}</span>
            <span class="ev-status"><i></i>${esc(a.statusLabel)}</span>
          </div>
          <h3>${esc(a.t.title)}</h3>
          ${a.t.sub ? `<p class="ev-sub">${esc(a.t.sub)}</p>` : ''}
          <ul class="ev-info">
            <li>${ICON.cal}<span>${esc(a.range)}${a.time && a.time !== '00:00' ? ` · ${a.time}` : ''}</span></li>
            ${a.place ? `<li>${ICON.pin}<span>${esc(a.place)}</span></li>` : ''}
          </ul>
          <div class="ev-foot">
            <div class="ev-price">${priceHTML(e, a)}</div>
            <div class="ev-actions">
              <button type="button" class="btn btn-ghost" data-ev="${esc(e.id)}">Detalhes</button>
              ${a.status === 'full' && !e.waitlistEnabled ? '' : `<a class="btn btn-primary" href="${SIGNUP(e)}" target="_blank" rel="noopener">${a.status === 'full' ? 'Entrar na fila' : a.status === 'soon' ? 'Ver evento' : e.isOnline ? 'Garantir o meu' : 'Inscrever-se'} ${ICON.arrow}</a>`}
            </div>
          </div>
        </div>
      </article>`;
  }

  /* ---- Modal de detalhes ---- */
  const modal = document.getElementById('evModal');
  let lastFocus = null;
  function openModal(e, a) {
    if (!modal) return;
    modal.querySelector('.ev-modal-inner').innerHTML = `
      <button type="button" class="ev-close" data-close aria-label="Fechar">${ICON.close}</button>
      ${e.imageUrl ? `<img class="ev-modal-img" src="${esc(e.imageUrl)}" alt="" />` : ''}
      <div class="ev-modal-body">${detailHTML(e, a)}</div>`;
    lastFocus = document.activeElement;
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('open'));
    document.documentElement.classList.add('modal-open');
    if (window.JRLenis) window.JRLenis.stop();
    modal.querySelector('.ev-close').focus();
  }
  function closeModal() {
    if (!modal || modal.hidden) return;
    modal.classList.remove('open');
    document.documentElement.classList.remove('modal-open');
    if (window.JRLenis) window.JRLenis.start();
    setTimeout(() => { modal.hidden = true; }, reduced ? 0 : 300);
    if (lastFocus) lastFocus.focus();
  }
  if (modal) {
    modal.addEventListener('click', (ev) => { if (ev.target === modal || ev.target.closest('[data-close]')) closeModal(); });
    document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape') closeModal(); });
  }

  /* ---- Carga (adiada até a seção chegar perto: as imagens vêm embutidas na resposta) ---- */
  let loaded = false;
  const section = root.closest('section') || root;
  const load = () => {
    if (loaded) return;
    loaded = true;
    fetchEvents()
      .then((all) => {
        const now = new Date();
        const list = all
          .filter((e) => e.isActive !== false && new Date(e.endDate || e.startDate) >= now)
          // presenciais primeiro (o mais próximo vira destaque); online/pré-venda depois
          .sort((x, y) => (!!x.isOnline - !!y.isOnline) || new Date(x.startDate) - new Date(y.startDate));
        if (!list.length) { section.hidden = true; hideNav(); return; }
        const meta = new Map(list.map((e) => [e.id, { e, a: analyse(e, now) }]));
        root.classList.remove('events-skeleton');
        root.classList.toggle('ev-single', list.length === 1);
        root.innerHTML = list.map((e, i) => cardHTML(e, meta.get(e.id).a, i)).join('');
        const count = document.querySelector('[data-events-count]');
        if (count) count.textContent = `${list.length} evento${list.length === 1 ? '' : 's'}`;
        root.addEventListener('click', (ev) => {
          const b = ev.target.closest('[data-ev]');
          if (!b) return;
          const m = meta.get(b.dataset.ev);
          if (m) openModal(m.e, m.a);
        });
        requestAnimationFrame(() => root.classList.add('ev-in'));
      })
      .catch(() => { section.hidden = true; hideNav(); });
  };
  const hideNav = () => document.querySelectorAll('a[href="#eventos"]').forEach((a) => { a.hidden = true; });

  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((en) => { if (en.some((x) => x.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: '900px 0px' });
    io.observe(section);
  } else load();
})();
