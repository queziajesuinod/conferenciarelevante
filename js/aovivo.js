/* ============================================================
   JUVENTUDE RELEVANTE — Ao vivo
   No horário do culto mostra a transmissão (o /live do canal).
   Fora dele, contagem regressiva + última ministração no player,
   com um botão para abrir a transmissão caso tenha começado antes.
   ============================================================ */
(function () {
  'use strict';

  const C = window.JRCulto;
  const V = window.JRVideos;
  if (!C) return;

  const CHANNEL = (V && V.CHANNEL) || 'UCQgiTCH_nbNmvej0ZA6YE5Q';
  const LIVE_EMBED = `https://www.youtube.com/embed/live_stream?channel=${CHANNEL}&autoplay=1&rel=0`;

  const $frame = document.getElementById('liveFrame');
  const $label = document.getElementById('liveLabel');
  const $badge = document.getElementById('liveBadge');
  const $sub = document.getElementById('liveSub');
  const $cd = document.getElementById('liveCountdown');
  const $toggle = document.getElementById('liveToggle');

  let mode = null; // 'live' | 'replay'
  let latest = null;

  function setPlayer(next) {
    if (mode === next) return;
    mode = next;
    if (next === 'live') {
      $frame.innerHTML = `<iframe src="${LIVE_EMBED}" title="Culto ao vivo · Juventude Relevante" allowfullscreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"></iframe>`;
      $label.innerHTML = '<span class="ll-live"><i></i>Transmissão ao vivo</span>';
      $toggle.hidden = !latest;
      $toggle.textContent = 'Ver a última ministração';
    } else if (latest) {
      const t = V.parseTitle(latest);
      $frame.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${V.esc(latest.videoId)}?rel=0&modestbranding=1" title="${V.esc(t.title)}" allowfullscreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"></iframe>`;
      $label.innerHTML = `<span>Enquanto isso · última ministração: <a href="${V.esc(V.detailUrl(latest))}"><b>${V.esc(t.title)}</b> — ${V.esc(latest.speaker || '')}</a></span>`;
      $toggle.hidden = false;
      $toggle.textContent = 'Já começou? Ver a transmissão';
    } else {
      // sem a lista de vídeos: o próprio /live mostra a próxima transmissão agendada
      mode = 'live';
      setPlayer('live');
    }
  }

  const pad = (n) => String(n).padStart(2, '0');
  function tick() {
    const s = C.state();
    $badge.classList.toggle('is-live', s.live);
    $badge.querySelector('span').textContent = s.live ? 'Ao vivo agora' : s.today ? 'Hoje às 18h' : 'Próximo: sábado, 18h';
    $sub.textContent = s.live
      ? 'O culto está acontecendo agora. Aproveite, adore junto e compartilhe com alguém!'
      : 'Todo sábado às 18h, direto da IECG. Assista de onde estiver.';
    $cd.hidden = s.live;
    if (!s.live) {
      let sec = Math.max(0, Math.floor(s.ms / 1000));
      const d = Math.floor(sec / 86400); sec -= d * 86400;
      const h = Math.floor(sec / 3600); sec -= h * 3600;
      const m = Math.floor(sec / 60); sec -= m * 60;
      $cd.querySelector('[data-u="d"]').textContent = d;
      $cd.querySelector('[data-u="h"]').textContent = pad(h);
      $cd.querySelector('[data-u="m"]').textContent = pad(m);
      $cd.querySelector('[data-u="s"]').textContent = pad(sec);
    }
    // troca automática só quando o horário vira (respeita a escolha manual no meio)
    const auto = s.live ? 'live' : 'replay';
    if (tick.last !== auto) { tick.last = auto; setPlayer(auto); }
  }

  $toggle.addEventListener('click', () => setPlayer(mode === 'live' ? 'replay' : 'live'));

  const start = () => { tick(); setInterval(tick, 1000); };
  if (V) V.fetchAll().then((items) => { latest = items[0] || null; }).catch(() => {}).finally(start);
  else start();
})();
