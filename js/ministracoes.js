/* ============================================================
   JUVENTUDE RELEVANTE — Lista completa de ministrações
   Busca, filtro por série/categoria, pregador, ordem e paginação.
   Estado refletido na URL (?q=&f=&spk=&ord=) para compartilhar.
   ============================================================ */
(function () {
  'use strict';

  const V = window.JRVideos;
  const grid = document.getElementById('libGrid');
  if (!V || !grid) return;

  const STEP = 12;
  const $q = document.getElementById('libQuery');
  const $spk = document.getElementById('libSpeaker');
  const $sort = document.getElementById('libSort');
  const $chips = document.getElementById('libChips');
  const $count = document.getElementById('libCount');
  const $more = document.getElementById('libMore');
  const $moreBtn = document.getElementById('libMoreBtn');

  const params = new URLSearchParams(location.search);
  const state = {
    q: params.get('q') || '',
    f: params.get('f') || '',
    spk: params.get('spk') || '',
    ord: params.get('ord') === 'old' ? 'old' : 'new',
    shown: STEP,
  };

  const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  let all = [];

  /* ---- números do topo (contagem animada) ---- */
  function countUp(el, to, suffix = '') {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { el.textContent = to + suffix; return; }
    const t0 = performance.now(), dur = 1200;
    const tick = (t) => {
      const k = Math.min(1, (t - t0) / dur);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3))) + suffix;
      if (k < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  function buildFilters() {
    // séries (a partir do título) + categorias, ordenadas pela mais recente
    const tags = new Map();
    all.forEach((v) => {
      const seen = new Set();
      [v._series, v.category].forEach((t) => {
        if (!t || seen.has(norm(t))) return;
        const k = norm(t);
        seen.add(k);
        if (!tags.has(k)) tags.set(k, { label: t, n: 0 });
        tags.get(k).n++;
      });
    });
    const list = [...tags.entries()].filter(([, t]) => t.n >= 2 || all.length < 10);
    $chips.innerHTML =
      `<button type="button" class="chip" data-f="">Todas <span>${all.length}</span></button>` +
      list.map(([k, t]) => `<button type="button" class="chip" data-f="${V.esc(k)}">${V.esc(t.label)} <span>${t.n}</span></button>`).join('');

    // pregadores agrupados ("Pr. Aldo" = "Pr. Aldo Giovanni"), exibindo o nome mais completo
    const spks = new Map();
    all.forEach((v) => {
      const k = v._spk;
      if (!k) return;
      const cur = spks.get(k);
      if (!cur) spks.set(k, { label: v.speaker, n: 1 });
      else { cur.n++; if (v.speaker.length > cur.label.length) cur.label = v.speaker; }
    });
    [...spks.entries()].sort((a, b) => b[1].n - a[1].n).forEach(([k, s]) => {
      const o = document.createElement('option');
      o.value = k; o.textContent = `${s.label} (${s.n})`;
      $spk.appendChild(o);
    });

    // série = mesmo prefixo de título em 2+ mensagens
    const perSeries = {};
    all.forEach((v) => { if (v._series) perSeries[norm(v._series)] = (perSeries[norm(v._series)] || 0) + 1; });
    const series = Object.values(perSeries).filter((n) => n >= 2).length;
    const hours = Math.round(all.reduce((s, v) => s + (v.durationSeconds || 0), 0) / 3600);
    countUp(document.querySelector('[data-stat="total"]'), all.length);
    countUp(document.querySelector('[data-stat="series"]'), series);
    countUp(document.querySelector('[data-stat="hours"]'), hours, '+');
  }

  function filtered() {
    const q = norm(state.q).trim();
    const words = q ? q.split(/\s+/) : [];
    let out = all.filter((v) => {
      if (state.f && norm(v._series) !== state.f && norm(v.category) !== state.f) return false;
      if (state.spk && v._spk !== state.spk) return false;
      return words.every((w) => v._hay.includes(w));
    });
    if (state.ord === 'old') out = out.slice().reverse();
    return out;
  }

  function syncUrl() {
    const p = new URLSearchParams();
    if (state.q) p.set('q', state.q);
    if (state.f) p.set('f', state.f);
    if (state.spk) p.set('spk', state.spk);
    if (state.ord === 'old') p.set('ord', 'old');
    const qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
  }

  function render(append = false) {
    const list = filtered();
    const prev = append ? grid.querySelectorAll('.vcard').length : 0;
    const slice = list.slice(prev, state.shown);

    $chips.querySelectorAll('.chip').forEach((c) => c.classList.toggle('active', c.dataset.f === state.f));

    if (!list.length) {
      grid.innerHTML =
        `<div class="videos-state">
          Nenhuma ministração encontrada${state.q ? ` para “${V.esc(state.q)}”` : ''}.<br><br>
          <button type="button" class="btn btn-ghost" data-clear>Limpar filtros</button>
        </div>`;
      $count.textContent = '0 ministrações';
      $more.hidden = true;
      return;
    }

    const html = slice.map((v) => V.cardHTML(v)).join('');
    if (append) grid.insertAdjacentHTML('beforeend', html);
    else grid.innerHTML = html;

    const n = Math.min(state.shown, list.length);
    $count.innerHTML = `Mostrando <b>${n}</b> de <b>${list.length}</b> ministraç${list.length === 1 ? 'ão' : 'ões'}`;
    $more.hidden = n >= list.length;
    if (!$more.hidden) $moreBtn.firstChild.textContent = `Carregar mais (${list.length - n}) `;

    V.animateIn(grid);
    V.enablePreviews(grid);
  }

  const reset = () => { state.shown = STEP; syncUrl(); render(); };

  /* ---- eventos ---- */
  let deb;
  $q.addEventListener('input', () => {
    clearTimeout(deb);
    deb = setTimeout(() => { state.q = $q.value; reset(); }, 180);
  });
  $spk.addEventListener('change', () => { state.spk = $spk.value; reset(); });
  $sort.addEventListener('change', () => { state.ord = $sort.value; reset(); });
  $chips.addEventListener('click', (e) => {
    const c = e.target.closest('.chip');
    if (!c) return;
    state.f = state.f === c.dataset.f ? '' : c.dataset.f;
    reset();
  });
  grid.addEventListener('click', (e) => {
    if (!e.target.closest('[data-clear]')) return;
    state.q = state.f = state.spk = '';
    $q.value = ''; $spk.value = '';
    reset();
  });
  $moreBtn.addEventListener('click', () => { state.shown += STEP; render(true); });
  // atalho "/" foca a busca
  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== $q && !/input|select|textarea/i.test(document.activeElement.tagName)) {
      e.preventDefault(); $q.focus();
    }
  });

  /* ---- carga ---- */
  V.fetchAll()
    .then((items) => {
      all = items.map((v) => {
        const t = V.parseTitle(v);
        return Object.assign({}, v, {
          _series: t.series,
          _spk: V.speakerKey(v.speaker),
          _hay: norm([v.title, t.series, t.title, v.category, v.speaker, (v.seo && (v.seo.keywords || []).join(' ')) || ''].join(' ')),
        });
      });
      grid.classList.remove('videos-skeleton');
      if (!all.length) {
        grid.innerHTML = '<div class="videos-state">Em breve novas ministrações por aqui.</div>';
        $count.textContent = '';
        return;
      }
      buildFilters();
      // faixa de séries (cada uma tem sua página)
      const $series = document.getElementById('libSeries');
      const groups = V.groupSeries(items);
      if ($series && groups.length) {
        $series.querySelector('.sr-grid').innerHTML = groups.map((g) => {
          const name = g.name.replace(/^s[ée]rie\s+/i, '');
          return `<a class="sr-card spot" href="${V.seriesUrl(g.name)}">
            <span class="sr-card-img"><img src="${V.esc(V.thumbOf(g.items[0]))}" alt="" loading="lazy" /></span>
            <span class="sr-card-body"><small>${g.items.length} mensagens</small><b>${V.esc(name)}</b></span>
          </a>`;
        }).join('');
        $series.hidden = false;
      }
      $q.value = state.q;
      $spk.value = state.spk;
      $sort.value = state.ord;
      if (state.spk && $spk.value !== state.spk) state.spk = '';
      render();
    })
    .catch(() => {
      grid.classList.remove('videos-skeleton');
      grid.innerHTML =
        `<div class="videos-state">Não foi possível carregar as ministrações agora.<br><br>
          <a class="btn btn-ghost" href="https://www.youtube.com/channel/${V.CHANNEL}" target="_blank" rel="noopener">Ver no YouTube</a></div>`;
      $count.textContent = '';
    });
})();
