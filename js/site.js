(function () {
  var nav = document.getElementById('nav');
  var hero = document.getElementById('hero');
  var blobs = document.querySelectorAll('.blob');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  // nav muda ao rolar
  var inner = document.body.classList.contains('inner');
  function onScroll() { nav.classList.toggle('scrolled', inner || window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // HERO: janela circular que revela a cidade e bolhas que seguem o mouse
  if (hero && !reduce) {


    var RADIUS = 190;
    var t = { x: 0.5, y: 0.5, r: 0 };   // alvo (x e y de 0 a 1)
    var c = { x: 0.5, y: 0.5, r: 0 };   // atual, suavizado
    var inside = false;
    var start = performance.now();

    hero.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      var r = hero.getBoundingClientRect();
      t.x = (e.clientX - r.left) / r.width;
      t.y = (e.clientY - r.top) / r.height;
      inside = true;
    });
    hero.addEventListener('pointerleave', function () { inside = false; });

    function frame(now) {
      var r = hero.getBoundingClientRect();
      if (r.bottom > 0 && r.top < window.innerHeight) {
        if (!finePointer && !inside) {
          // celular: a janela passeia sozinha pela tela
          var s = (now - start) / 1000;
          t.x = 0.5 + 0.32 * Math.sin(s * 0.7);
          t.y = 0.5 + 0.25 * Math.sin(s * 0.9 + 1);
          t.r = 0;
        } else {
          t.r = inside ? RADIUS : 0;
        }
        c.x += (t.x - c.x) * 0.14;
        c.y += (t.y - c.y) * 0.14;
        c.r += (t.r - c.r) * 0.12;
        // bolhas: movimento mais forte e suave
        blobs.forEach(function (b) {
          var d = parseFloat(b.dataset.depth || 30);
          b.style.transform = 'translate(' + ((c.x - 0.5) * d * 3.2) + 'px,' + ((c.y - 0.5) * d * 3.2) + 'px)';
        });
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // aparece ao rolar
  var targets = document.querySelectorAll('.section-title, .tile, .card, .proj, .post-card, .about-big, .about-small, .contact-inner > *');
  targets.forEach(function (t) { t.classList.add('reveal'); });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          var i = Array.prototype.indexOf.call(en.target.parentNode.children, en.target);
          en.target.style.transitionDelay = Math.min(i * 70, 350) + 'ms';
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12 });
    targets.forEach(function (t) { io.observe(t); });
  } else {
    targets.forEach(function (t) { t.classList.add('in'); });
  }

  // cookies: guarda a escolha no navegador
  var banner = document.getElementById('cookie');
  function lerEscolha() { try { return localStorage.getItem('vv_cookies'); } catch (e) { return null; } }
  function salvaEscolha(v) { try { localStorage.setItem('vv_cookies', v); } catch (e) {} }
  if (banner) {
    if (!lerEscolha()) banner.hidden = false;
    banner.querySelectorAll('[data-cookie]').forEach(function (b) {
      b.addEventListener('click', function () { salvaEscolha(b.dataset.cookie); banner.hidden = true; });
    });
    document.querySelectorAll('[data-cookie-open]').forEach(function (b) {
      b.addEventListener('click', function () { banner.hidden = false; });
    });
  }

  // blog: filtro por assunto (aceita ?categoria=slug)
  var chips = document.getElementById('chips');
  var grid = document.getElementById('post-grid');
  if (chips && grid) {
    var vazio = document.getElementById('vazio');
    var cards = grid.querySelectorAll('.post-card');
    var filtra = function (cat) {
      var n = 0;
      cards.forEach(function (c) {
        var ok = cat === 'todos' || c.dataset.cat === cat;
        c.style.display = ok ? '' : 'none';
        if (ok) n++;
      });
      chips.querySelectorAll('.chip').forEach(function (b) { b.classList.toggle('on', b.dataset.filter === cat); });
      if (vazio) vazio.hidden = n > 0;
    };
    chips.addEventListener('click', function (e) {
      var b = e.target.closest('.chip');
      if (b) filtra(b.dataset.filter);
    });
    var inicial = new URLSearchParams(location.search).get('categoria');
    if (inicial) filtra(inicial);
  }
})();

// agenda: filtros
(function () {
  var list = document.getElementById('ev-list');
  if (!list) return;
  var evs = Array.prototype.slice.call(list.querySelectorAll('.ev'));
  var chips = document.querySelectorAll('#chips .chip');
  var bairro = document.getElementById('f-bairro');
  var quando = document.getElementById('f-quando');
  var gratis = document.getElementById('f-gratis');
  var vazio = document.getElementById('ev-vazio');
  var cat = 'todos';
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function aplica() {
    var hoje = new Date();
    var h = iso(hoje);
    var fim7 = new Date(hoje); fim7.setDate(fim7.getDate() + 7);
    var f30 = new Date(hoje); f30.setDate(f30.getDate() + 30);
    var fimMes = iso(f30);
    var n = 0;
    evs.forEach(function (e) {
      var d = e.dataset.date;
      var rec = !d;
      var dias = (e.dataset.days || '').split(',');
      var fim = e.dataset.end || d;
      var ok = (rec || fim >= h) &&
        (cat === 'todos' || e.dataset.cat === cat) &&
        (!bairro.value || e.dataset.bairro === bairro.value) &&
        (!gratis.checked || e.dataset.free === '1') &&
        (quando.value !== 'hoje' || (rec ? dias.indexOf(String(hoje.getDay())) !== -1 : d === h)) &&
        (quando.value !== 'semana' || rec || d <= iso(fim7)) &&
        (quando.value !== 'mes' || rec || d <= fimMes);
      e.hidden = !ok;
      if (ok) n++;
    });
    document.querySelectorAll('.ev-group').forEach(function (g) { g.hidden = !g.querySelector('.ev:not([hidden])'); });
    vazio.hidden = n > 0;
  }
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      chips.forEach(function (x) { x.classList.remove('on'); });
      c.classList.add('on');
      cat = c.dataset.filter;
      aplica();
    });
  });
  [bairro, quando, gratis].forEach(function (el) { el.addEventListener('change', aplica); });
  aplica();
})();

// cupons: filtros e copiar codigo
(function () {
  var list = document.getElementById('cp-list');
  if (!list) return;
  var itens = Array.prototype.slice.call(list.querySelectorAll('.cp'));
  var chips = document.querySelectorAll('#chips .chip');
  var bairro = document.getElementById('f-bairro');
  var vazio = document.getElementById('cp-vazio');
  var cat = 'todos';
  function iso(d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function aplica() {
    var h = iso(new Date());
    var n = 0;
    itens.forEach(function (c) {
      var ok = (!c.dataset.until || c.dataset.until >= h) &&
        (cat === 'todos' || c.dataset.cat === cat) &&
        (!bairro.value || c.dataset.bairro === bairro.value);
      c.hidden = !ok;
      if (ok) n++;
    });
    vazio.hidden = n > 0;
  }
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      chips.forEach(function (x) { x.classList.remove('on'); });
      c.classList.add('on');
      cat = c.dataset.filter;
      aplica();
    });
  });
  bairro.addEventListener('change', aplica);
  list.querySelectorAll('.cp-code').forEach(function (b) {
    b.addEventListener('click', function () {
      var label = b.querySelector('small');
      if (window.VSelos) VSelos.evento('cupom');
      function ok() { label.textContent = 'Copiado'; setTimeout(function () { label.textContent = 'Copiar código'; }, 1800); }
      try {
        navigator.clipboard.writeText(b.dataset.code).then(ok, function () { label.textContent = 'Selecione e copie'; });
      } catch (e) { label.textContent = 'Selecione e copie'; }
    });
  });
  aplica();
})();
