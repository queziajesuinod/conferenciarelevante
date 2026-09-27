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
  // Anti-fraude: em vez de abrir o ingresso direto, envia para o e-mail cadastrado.
  function enviarPorEmail(orderCode, btnEl, msgEl) {
    btnEl.disabled = true;
    var original = btnEl.textContent;
    btnEl.textContent = 'Enviando...';
    msgEl.textContent = '';
    msgEl.className = 'ingresso-email-msg';
    fetch(API_BASE + '/api/public/events/registrations/' + encodeURIComponent(orderCode) + '/send-ticket-email', {
      method: 'POST',
    })
      .then(function (r) {
        return r.json().then(function (d) {
          if (!r.ok) throw new Error(d && d.message ? d.message : 'Falha ao enviar');
          return d;
        });
      })
      .then(function (d) {
        msgEl.textContent = 'Enviado para ' + (d.email || 'seu e-mail') + '. Confira a caixa de entrada e o spam.';
        msgEl.className = 'ingresso-email-msg is-ok';
        btnEl.textContent = 'E-mail enviado ✓';
      })
      .catch(function (err) {
        msgEl.textContent = err.message || 'Não foi possível enviar. Tente de novo.';
        msgEl.className = 'ingresso-email-msg is-erro';
        btnEl.disabled = false;
        btnEl.textContent = original;
      });
  }

  function render(resultados) {
    resultsEl.innerHTML = '';
    resultados.forEach(function (reg) {
      var card = document.createElement('article');
      card.className = 'ingresso-card';

      var attendeesHtml = (reg.attendees || []).map(function (att) {
        var setor = att.batch && att.batch.sector ? att.batch.sector : (att.batch ? att.batch.name : '');
        return (
          '<li class="ingresso-inscrito-item">' +
            '<span class="ingresso-nome">' + esc(att.name) + '</span>' +
            (setor ? '<span class="ingresso-setor">' + esc(setor) + '</span>' : '') +
          '</li>'
        );
      }).join('');

      card.innerHTML =
        '<div class="ingresso-card__head">' +
          '<div>' +
            '<p class="ingresso-evento">' + esc(reg.event ? reg.event.title : 'Evento') + '</p>' +
            '<p class="ingresso-codigo">Pedido ' + esc(reg.orderCode) +
              (reg.buyerName ? ' · ' + esc(reg.buyerName) : '') + '</p>' +
          '</div>' +
          '<span class="ingresso-badge ' +
            (reg.paymentStatus === 'confirmed' || reg.paymentStatus === 'partial' ? 'is-ok' : 'is-wait') + '">' +
            esc(statusLabel(reg.paymentStatus)) + '</span>' +
        '</div>' +
        '<ul class="ingresso-inscritos-lista">' + attendeesHtml + '</ul>' +
        '<button type="button" class="btn btn-primary ingresso-enviar">Receber ingresso por e-mail</button>' +
        '<p class="ingresso-email-msg"></p>' +
        '<p class="ingresso-aviso">Por segurança, o ingresso (link e QR Code) é enviado apenas para o e-mail cadastrado na compra.</p>';

      var btnEl = card.querySelector('.ingresso-enviar');
      var msgEl = card.querySelector('.ingresso-email-msg');
      btnEl.addEventListener('click', function () {
        enviarPorEmail(reg.orderCode, btnEl, msgEl);
      });

      resultsEl.appendChild(card);
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
