// Calendario da Vivasso: visoes de mes, semana, ano e lista. Mini calendario na pagina inicial.
(function () {
  var dados = document.getElementById('eventos-json');
  if (!dados) return;
  var EV = [];
  try { EV = JSON.parse(dados.textContent); } catch (e) { return; }

  var MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  var DS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var DSL = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  var CATN = { movimento: 'Movimento', mente: 'Mente e emoção', 'comer-bem': 'Comer bem', passeios: 'Passeios', encontros: 'Encontros' };

  function pad(n) { return n < 10 ? '0' + n : '' + n; }
  function ymd(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parse(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  var hoje = new Date(); hoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  var HJ = ymd(hoje);
  var filtro = 'todos';
  var LIM = ymd(new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + 90));

  function noDia(d, semFiltro) {
    var s = ymd(d), w = d.getDay();
    return EV.filter(function (e) {
      if (!semFiltro && filtro !== 'todos' && e.c !== filtro) return false;
      if (e.w && e.w.length) return s >= HJ && s <= LIM && e.w.indexOf(w) > -1;
      if (!e.d) return false;
      return s >= e.d && s <= (e.e || e.d);
    }).sort(function (a, b) { return (a.q || '').localeCompare(b.q || ''); });
  }

  function cartao(e) {
    var meta = '';
    if (e.l || e.b) meta += '<li>' + esc([e.l, e.b].filter(Boolean).join(' · ')) + '</li>';
    if (e.q) meta += '<li>' + esc(e.q) + '</li>';
    var link = e.u ? '<a class="ev-btn" href="' + esc(e.u) + '" target="_blank" rel="noopener">' + esc(e.t2 || 'Ver detalhes') + ' <span aria-hidden="true">→</span></a>' : '';
    var preco = e.p ? '<span class="ev-price' + (/^gr/i.test(e.p) ? ' free' : '') + '">' + esc(e.p) + '</span>' : '';
    return '<article class="cal-card c-' + esc(e.c) + '"><div class="cal-card-corpo">' +
      '<span class="tag cat-' + esc(e.c) + '">' + esc(CATN[e.c] || e.c) + '</span>' +
      '<h3>' + esc(e.t) + '</h3>' + (meta ? '<ul class="cal-meta">' + meta + '</ul>' : '') +
      (e.n ? '<p class="cal-nota">' + esc(e.n) + '</p>' : '') + '</div>' +
      '<div class="cal-card-lado">' + preco + link + '</div></article>';
  }

  // ---------------------------------------------------------------- pagina do calendario
  var raiz = document.getElementById('cal');
  if (raiz) {
    var vista = 'mes', cur = new Date(hoje.getFullYear(), hoje.getMonth(), 1), sel = HJ;
    var q = location.search.match(/dia=(\d{4}-\d{2}-\d{2})/);
    if (q) { sel = q[1]; var dq = parse(sel); cur = new Date(dq.getFullYear(), dq.getMonth(), 1); }
    if (/vista=lista/.test(location.search)) vista = 'lista';
    var listaSec = document.getElementById('lista-sec');
    var filtrosLista = document.querySelector('.agenda-filters');

    raiz.innerHTML =
      '<div class="cal-barra">' +
        '<div class="cal-vistas" role="tablist" aria-label="Tipo de visão">' +
          '<button type="button" data-v="mes">Mês</button><button type="button" data-v="semana">Semana</button>' +
          '<button type="button" data-v="ano">Ano</button><button type="button" data-v="lista">Lista</button></div>' +
        '<div class="cal-nav"><button type="button" id="cal-ant" aria-label="Anterior">‹</button>' +
          '<button type="button" id="cal-hoje">Hoje</button><button type="button" id="cal-prox" aria-label="Próximo">›</button></div>' +
        '<h2 class="cal-titulo" id="cal-titulo" aria-live="polite"></h2></div>' +
      '<div id="cal-grade"></div><div id="cal-dia" aria-live="polite"></div>';

    var grade = document.getElementById('cal-grade'), painel = document.getElementById('cal-dia'), titulo = document.getElementById('cal-titulo');

    function chips(lista, max) {
      var h = '';
      lista.slice(0, max).forEach(function (e) { h += '<span class="cal-chip c-' + esc(e.c) + '">' + esc(e.t) + '</span>'; });
      if (lista.length > max) h += '<span class="cal-mais">+' + (lista.length - max) + '</span>';
      return h;
    }
    function celula(d, extra) {
      var s = ymd(d), ev = noDia(d), cls = 'cal-dia';
      if (s === HJ) cls += ' hoje'; if (s < HJ) cls += ' passado'; if (s === sel) cls += ' sel'; if (ev.length) cls += ' tem';
      return '<button type="button" class="' + cls + '" data-d="' + s + '"><span class="cal-num">' + d.getDate() + '</span>' + (extra ? extra(ev) : chips(ev, 3)) + '</button>';
    }

    function desenhaMes() {
      var y = cur.getFullYear(), m = cur.getMonth(), off = new Date(y, m, 1).getDay(), n = new Date(y, m + 1, 0).getDate();
      titulo.textContent = cap(MES[m]) + ' de ' + y;
      var h = '<div class="cal-mes">';
      DS.forEach(function (d) { h += '<div class="cal-cab">' + d + '</div>'; });
      for (var i = 0; i < off; i++) h += '<div class="cal-vazio"></div>';
      for (var d = 1; d <= n; d++) h += celula(new Date(y, m, d));
      h += '</div>';
      grade.innerHTML = h;
    }

    function inicioSemana(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay()); }
    function desenhaSemana() {
      var ini = inicioSemana(parse(sel)), fim = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + 6);
      titulo.textContent = ini.getDate() + ' ' + MES[ini.getMonth()].slice(0, 3) + ' a ' + fim.getDate() + ' ' + MES[fim.getMonth()].slice(0, 3) + ' de ' + fim.getFullYear();
      var h = '<div class="cal-sem">';
      for (var i = 0; i < 7; i++) {
        var d = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + i), s = ymd(d), ev = noDia(d);
        var cls = 'cal-sem-dia' + (s === HJ ? ' hoje' : '') + (s === sel ? ' sel' : '') + (s < HJ ? ' passado' : '');
        h += '<button type="button" class="' + cls + '" data-d="' + s + '"><span class="cal-sem-cab">' + DS[i] + '<b>' + d.getDate() + '</b></span>';
        h += ev.length ? chips(ev, 6) : '<span class="cal-livre">Livre</span>';
        h += '</button>';
      }
      grade.innerHTML = h + '</div>';
    }

    function desenhaAno() {
      var y = cur.getFullYear();
      titulo.textContent = y;
      var h = '<div class="cal-ano">';
      for (var m = 0; m < 12; m++) {
        var off = new Date(y, m, 1).getDay(), n = new Date(y, m + 1, 0).getDate();
        h += '<div class="cal-ano-mes"><button type="button" class="cal-ano-nome" data-m="' + m + '">' + cap(MES[m]) + '</button><div class="cal-mini">';
        DS.forEach(function (d) { h += '<i>' + d.charAt(0) + '</i>'; });
        for (var i = 0; i < off; i++) h += '<span></span>';
        for (var d = 1; d <= n; d++) {
          var dt = new Date(y, m, d), s = ymd(dt), ev = noDia(dt);
          h += '<button type="button" class="' + (ev.length ? 'tem ' : '') + (s === HJ ? 'hoje' : '') + '" data-d="' + s + '" aria-label="' + d + ' de ' + MES[m] + '">' + d + '</button>';
        }
        h += '</div></div>';
      }
      grade.innerHTML = h + '</div>';
    }

    function desenhaPainel() {
      if (vista === 'ano' || vista === 'lista') { painel.innerHTML = ''; return; }
      var d = parse(sel), ev = noDia(d);
      var h = '<h3 class="cal-dia-titulo">' + cap(DSL[d.getDay()]) + ', ' + d.getDate() + ' de ' + MES[d.getMonth()] + '</h3>';
      h += ev.length ? ev.map(cartao).join('') : '<p class="cal-vazio-msg">Nenhum evento neste dia. Toque em outro dia para ver o que está rolando.</p>';
      painel.innerHTML = h;
    }

    function desenha() {
      var el = raiz.querySelectorAll('.cal-vistas button');
      Array.prototype.forEach.call(el, function (b) { b.classList.toggle('on', b.getAttribute('data-v') === vista); });
      var lista = vista === 'lista';
      grade.hidden = lista; painel.hidden = lista;
      raiz.querySelector('.cal-nav').hidden = lista;
      titulo.hidden = lista;
      if (listaSec) listaSec.hidden = !lista;
      if (filtrosLista) filtrosLista.hidden = !lista;
      if (vista === 'mes') desenhaMes();
      else if (vista === 'semana') desenhaSemana();
      else if (vista === 'ano') desenhaAno();
      desenhaPainel();
    }

    raiz.addEventListener('click', function (e) {
      var v = e.target.closest('[data-v]'); if (v && v.parentNode.classList.contains('cal-vistas')) { vista = v.getAttribute('data-v'); if (vista === 'semana') { /* semana segue o dia selecionado */ } desenha(); return; }
      var nm = e.target.closest('.cal-ano-nome'); if (nm) { cur = new Date(cur.getFullYear(), +nm.getAttribute('data-m'), 1); sel = ymd(cur); vista = 'mes'; desenha(); return; }
      var dia = e.target.closest('[data-d]');
      if (dia && !dia.classList.contains('cal-vistas')) {
        sel = dia.getAttribute('data-d'); var dd = parse(sel);
        if (vista === 'ano') { cur = new Date(dd.getFullYear(), dd.getMonth(), 1); vista = 'mes'; }
        else if (vista === 'mes' && (dd.getMonth() !== cur.getMonth())) cur = new Date(dd.getFullYear(), dd.getMonth(), 1);
        desenha();
        if (vista !== 'ano') painel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
      if (e.target.id === 'cal-ant' || e.target.id === 'cal-prox') {
        var s = e.target.id === 'cal-prox' ? 1 : -1;
        if (vista === 'mes') { cur = new Date(cur.getFullYear(), cur.getMonth() + s, 1); sel = ymd(cur); }
        else if (vista === 'semana') { var d2 = parse(sel); sel = ymd(new Date(d2.getFullYear(), d2.getMonth(), d2.getDate() + 7 * s)); cur = new Date(parse(sel).getFullYear(), parse(sel).getMonth(), 1); }
        else if (vista === 'ano') { cur = new Date(cur.getFullYear() + s, 0, 1); sel = ymd(cur); }
        desenha(); return;
      }
      if (e.target.id === 'cal-hoje') { cur = new Date(hoje.getFullYear(), hoje.getMonth(), 1); sel = HJ; desenha(); }
    });

    Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (c) {
      c.addEventListener('click', function () {
        setTimeout(function () { var on = document.querySelector('.chip.on'); filtro = on ? on.getAttribute('data-filter') : 'todos'; desenha(); }, 0);
      });
    });
    desenha();
  }

  // ---------------------------------------------------------------- resumo na pagina inicial
  var home = document.getElementById('cal-home');
  if (home) {
    var y = hoje.getFullYear(), m = hoje.getMonth(), off = new Date(y, m, 1).getDay(), n = new Date(y, m + 1, 0).getDate();
    var mini = '<div class="mini-cal"><p class="mini-titulo">' + cap(MES[m]) + ' de ' + y + '</p><div class="mini-grade">';
    DS.forEach(function (d) { mini += '<i>' + d + '</i>'; });
    for (var i = 0; i < off; i++) mini += '<span></span>';
    for (var d = 1; d <= n; d++) {
      var dt = new Date(y, m, d), s = ymd(dt), ev = noDia(dt, true);
      mini += '<a href="/agenda/?dia=' + s + '" class="' + (ev.length ? 'tem ' : '') + (s === HJ ? 'hoje ' : '') + (s < HJ ? 'passado' : '') + '">' + d + '</a>';
    }
    mini += '</div></div>';
    var prox = EV.filter(function (e) { return !(e.w && e.w.length) && e.d && (e.e || e.d) >= HJ; })
      .sort(function (a, b) { var x = a.d < HJ ? HJ : a.d, z = b.d < HJ ? HJ : b.d; return x < z ? -1 : x > z ? 1 : 0; }).slice(0, 4);
    var lista = '<div class="prox"><p class="mini-titulo">Próximos eventos</p>';
    if (!prox.length) lista += '<p class="cal-vazio-msg">Em breve, novos eventos por aqui.</p>';
    prox.forEach(function (e) {
      var d0 = parse(e.d < HJ ? HJ : e.d);
      lista += '<a class="prox-item c-' + esc(e.c) + '" href="/agenda/?dia=' + ymd(d0) + '"><span class="prox-data"><b>' + d0.getDate() + '</b><small>' + MES[d0.getMonth()].slice(0, 3) + '</small></span>' +
        '<span class="prox-txt"><strong>' + esc(e.t) + '</strong><small>' + esc([e.l, e.b].filter(Boolean).join(' · ')) + '</small></span></a>';
    });
    lista += '</div>';
    home.innerHTML = mini + lista;
  }
})();
