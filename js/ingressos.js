/**
 * Meus Ingressos — busca pública por código do pedido OU e-mail do comprador,
 * lista os inscritos com QR Code e link para baixar o ingresso (PDF).
 * API: portal.iecg.com.br  ·  Ticket completo/PDF: app.iecg.com.br/ticket/<código>
 */
(function () {
  'use strict';

  var isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
  var API_BASE = isLocal ? 'http://localhost:3005' : 'https://portal.iecg.com.br';
  var TICKET_BASE = isLocal ? 'http://localhost:3000' : 'https://app.iecg.com.br';

  var form = document.getElementById('ingressosForm');
  var input = document.getElementById('ing-busca');
  var btn = document.getElementById('ing-btn');
  var statusEl = document.getElementById('ing-status');
  var resultsEl = document.getElementById('ing-resultados');

  if (!form) return;

  function esc(v) {
    return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function money(v) {
    var n = Number(v);
    if (!isFinite(n)) return '';
    return 'R$ ' + n.toFixed(2).replace('.', ',');
  }

  function setStatus(msg, tipo) {
    if (!msg) {
      statusEl.hidden = true;
      statusEl.textContent = '';
      statusEl.className = 'ingressos-status';
      return;
    }
    statusEl.hidden = false;
    statusEl.textContent = msg;
    statusEl.className = 'ingressos-status' + (tipo ? ' is-' + tipo : '');
  }

  function statusLabel(s) {
    if (s === 'confirmed') return 'Pagamento confirmado';
    if (s === 'partial') return 'Pagamento parcial';
    if (s === 'pending') return 'Pagamento pendente';
    if (s === 'authorized') return 'Pagamento autorizado';
    return s || '';
  }

  // Gera o QR (mesmo conteúdo lido no check-in) e coloca no <img> alvo.
  function gerarQr(imgEl, orderCode, eventId, attendeeId) {
    var payload = JSON.stringify({ orderCode: orderCode, event_id: eventId, attendeeId: attendeeId });
    if (!window.QRCode || !window.QRCode.toDataURL) {
      imgEl.replaceWith(document.createTextNode(''));
      return;
    }
    window.QRCode.toDataURL(payload, { width: 240, margin: 2 })
      .then(function (url) { imgEl.src = url; })
      .catch(function () { imgEl.alt = 'Não foi possível gerar o QR'; });
  }

  function render(resultados) {
    resultsEl.innerHTML = '';
    resultados.forEach(function (reg) {
      var confirmado = reg.paymentStatus === 'confirmed' || reg.paymentStatus === 'partial';
      var card = document.createElement('article');
      card.className = 'ingresso-card';

      var ticketUrl = TICKET_BASE + '/ticket/' + encodeURIComponent(reg.orderCode);

      var attendeesHtml = (reg.attendees || []).map(function (att) {
        var setor = att.batch && att.batch.sector ? att.batch.sector : (att.batch ? att.batch.name : '');
        return (
          '<div class="ingresso-inscrito">' +
            (confirmado
              ? '<img class="ingresso-qr" data-att="' + esc(att.id) + '" alt="QR Code de ' + esc(att.name) + '" />'
              : '<div class="ingresso-qr ingresso-qr--off">Disponível após a confirmação do pagamento</div>') +
            '<p class="ingresso-nome">' + esc(att.name) + '</p>' +
            (setor ? '<p class="ingresso-setor">' + esc(setor) + '</p>' : '') +
          '</div>'
        );
      }).join('');

      card.innerHTML =
        '<div class="ingresso-card__head">' +
          '<div>' +
            '<p class="ingresso-evento">' + esc(reg.event ? reg.event.title : 'Evento') + '</p>' +
            '<p class="ingresso-codigo">Pedido ' + esc(reg.orderCode) +
              (reg.buyerName ? ' · ' + esc(reg.buyerName) : '') + '</p>' +
          '</div>' +
          '<span class="ingresso-badge ' + (confirmado ? 'is-ok' : 'is-wait') + '">' +
            esc(statusLabel(reg.paymentStatus)) + '</span>' +
        '</div>' +
        '<div class="ingresso-inscritos">' + attendeesHtml + '</div>' +
        '<a class="btn btn-primary ingresso-baixar" href="' + esc(ticketUrl) + '" target="_blank" rel="noopener">' +
          (confirmado ? 'Abrir ingresso e baixar PDF' : 'Ver detalhes / pagar') +
        '</a>';

      resultsEl.appendChild(card);

      if (confirmado && reg.event) {
        card.querySelectorAll('.ingresso-qr[data-att]').forEach(function (img) {
          gerarQr(img, reg.orderCode, reg.event.id, img.getAttribute('data-att'));
        });
      }
    });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var termo = (input.value || '').trim();
    if (termo.length < 3) {
      setStatus('Digite o código do pedido ou o e-mail do comprador.', 'erro');
      return;
    }

    resultsEl.innerHTML = '';
    setStatus('Buscando...', 'loading');
    btn.disabled = true;

    fetch(API_BASE + '/api/public/events/registrations/lookup?q=' + encodeURIComponent(termo))
      .then(function (r) {
        return r.json().then(function (data) {
          if (!r.ok) throw new Error(data && data.message ? data.message : 'Falha na busca');
          return data;
        });
      })
      .then(function (data) {
        var lista = (data && data.resultados) || [];
        if (!lista.length) {
          setStatus('Nenhum ingresso encontrado para esse código ou e-mail.', 'vazio');
          return;
        }
        setStatus('');
        render(lista);
      })
      .catch(function (err) {
        setStatus(err.message || 'Não foi possível buscar seus ingressos. Tente novamente.', 'erro');
      })
      .finally(function () {
        btn.disabled = false;
      });
  });
})();
