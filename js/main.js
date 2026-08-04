/* ============================================================
   CONFERÊNCIA RELEVANTE 2026 — Interações
   ============================================================ */
(function () {
  'use strict';

  /* ---- Navbar: fundo ao rolar ---- */
  const nav = document.getElementById('nav');
  const onScroll = () => {
    if (window.scrollY > 40) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---- Menu mobile ---- */
  const toggle = document.getElementById('navToggle');
  const links = document.getElementById('navLinks');
  if (toggle) {
    toggle.addEventListener('click', () => {
      links.classList.toggle('open');
    });
    links.querySelectorAll('a').forEach((a) =>
      a.addEventListener('click', () => links.classList.remove('open'))
    );
  }

  /* ---- Scroll reveal via IntersectionObserver ---- */
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealEls = document.querySelectorAll('.reveal');

  if (reduced || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('in'));
  } else {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.14, rootMargin: '0px 0px -8% 0px' }
    );
    revealEls.forEach((el) => io.observe(el));
  }

  /* ---- FAQ accordion ---- */
  document.querySelectorAll('.faq-item').forEach((item) => {
    const btn = item.querySelector('.faq-q');
    const ans = item.querySelector('.faq-a');
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // fecha os demais
      document.querySelectorAll('.faq-item.open').forEach((other) => {
        if (other !== item) {
          other.classList.remove('open');
          other.querySelector('.faq-a').style.maxHeight = null;
        }
      });
      item.classList.toggle('open', !isOpen);
      ans.style.maxHeight = isOpen ? null : ans.scrollHeight + 'px';
    });
  });

  /* ---- Parallax sutil no radar do hero ---- */
  if (!reduced) {
    const radar = document.querySelector('.hero-radar');
    const rays = document.querySelector('.hero-rays');
    let ticking = false;
    window.addEventListener(
      'scroll',
      () => {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(() => {
          const y = window.scrollY;
          if (radar) radar.style.transform = `translate(-50%, calc(-50% + ${y * 0.12}px))`;
          if (rays) rays.style.transform = `translateY(${y * 0.05}px)`;
          ticking = false;
        });
      },
      { passive: true }
    );

    /* Leve tilt do card ALEGRIA com o mouse (desktop) ---- */
    const card = document.querySelector('.hero-alegria');
    if (card && window.matchMedia('(pointer:fine)').matches) {
      const strength = 8;
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = `perspective(900px) rotateY(${px * strength}deg) rotateX(${-py * strength}deg)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    }
  }

  /* ---- Contagem regressiva ---- */
  const cd = document.getElementById('countdown');
  if (cd) {
    const target = new Date(cd.getAttribute('data-target')).getTime();
    const els = {
      days: cd.querySelector('[data-cd="days"]'),
      hours: cd.querySelector('[data-cd="hours"]'),
      mins: cd.querySelector('[data-cd="mins"]'),
      secs: cd.querySelector('[data-cd="secs"]'),
    };
    const pad = (n) => String(n).padStart(2, '0');
    const tick = () => {
      let diff = Math.max(0, target - Date.now());
      const d = Math.floor(diff / 86400000); diff -= d * 86400000;
      const h = Math.floor(diff / 3600000);  diff -= h * 3600000;
      const m = Math.floor(diff / 60000);     diff -= m * 60000;
      const s = Math.floor(diff / 1000);
      els.days.textContent = d;
      els.hours.textContent = pad(h);
      els.mins.textContent = pad(m);
      els.secs.textContent = pad(s);
    };
    tick();
    setInterval(tick, 1000);
  }

  /* ---- Formulário → WhatsApp ---- */
  const waForm = document.getElementById('waForm');
  if (waForm) {
    const WA_NUMBER = '556784661644'; // +55 67 8466-1644
    waForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nome = waForm.nome.value.trim();
      const tel = waForm.telefone.value.trim();
      const msg = waForm.mensagem.value.trim();

      let valid = true;
      [['nome', nome], ['telefone', tel]].forEach(([field, val]) => {
        const wrap = waForm.querySelector('[name="' + field + '"]').closest('.wa-field');
        if (!val) { wrap.classList.add('error'); valid = false; }
        else { wrap.classList.remove('error'); }
      });
      if (!valid) return;

      const linhas = [
        'Olá! Vim pela Conferência Relevante 2026.',
        '',
        '*Nome:* ' + nome,
        '*Telefone:* ' + tel,
      ];
      if (msg) linhas.push('*Mensagem:* ' + msg);
      const texto = encodeURIComponent(linhas.join('\n'));

      window.open('https://wa.me/' + WA_NUMBER + '?text=' + texto, '_blank', 'noopener');
    });

    // limpa o estado de erro ao digitar
    waForm.querySelectorAll('input, textarea').forEach((el) => {
      el.addEventListener('input', () => el.closest('.wa-field').classList.remove('error'));
    });
  }
})();
