// Selos da Vivasso: tudo fica guardado so neste aparelho (localStorage).
(function () {
  var KEY = 'vivasso_selos';
  var AREAS = ['agenda', 'cupons', 'jogos', 'revista'];
  var DEFS = [
    { id: 'cupom', nome: 'Cupom no bolso', como: 'Copie o código de um cupom.', cor: '#c98a0e', marca: '%' },
    { id: 'leitor', nome: 'Leitor da semana', como: 'Folheie uma edição da revista.', cor: '#c9709b', marca: 'V' },
    { id: 'explorador', nome: 'Explorador', como: 'Visite Agenda, Cupons, Jogos e Revista.', cor: '#3f9a8f', marca: '4' },
    { id: 'primeira-viagem', nome: 'Primeira viagem', como: 'Chegue à ilha no jogo Respira.', cor: '#2c7a70', marca: 'R' },
    { id: 'jangadeiro', nome: 'Mestre do vento', como: 'Chegue ao nível 3 no jogo Respira.', cor: '#b04d82', marca: 'N3' },
    { id: 'dias-3', nome: '3 dias seguidos', como: 'Volte ao site 3 dias seguidos.', cor: '#1079aa', marca: '3' },
    { id: 'dias-7', nome: '7 dias seguidos', como: 'Volte ao site 7 dias seguidos.', cor: '#8e74c8', marca: '7' },
    { id: 'dias-30', nome: '30 dias seguidos', como: 'Volte ao site 30 dias seguidos.', cor: '#16131f', marca: '30' }
  ];

  function hoje() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function ler() {
    var s = { dias: [], melhor: 0, pausas: 0, areas: {}, ganhos: {}, flags: {} };
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (raw && typeof raw === 'object') {
        s.dias = raw.dias || []; s.melhor = raw.melhor || 0; s.pausas = raw.pausas || 0;
        s.areas = raw.areas || {}; s.ganhos = raw.ganhos || {}; s.flags = raw.flags || {};
      }
    } catch (e) {}
    return s;
  }
  function salvar(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} }

  function sequenciaAtual(dias) {
    var set = {}; dias.forEach(function (d) { set[d] = 1; });
    var c = 0, d = new Date();
    if (!set[hoje()]) return 0;
    while (true) {
      var k = d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
      if (!set[k]) break;
      c += 1; d.setDate(d.getDate() - 1);
    }
    return c;
  }

  function toast(def) {
    var el = document.getElementById('selo-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'selo-toast'; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite');
      document.body.appendChild(el);
    }
    el.innerHTML = '';
    var t = document.createElement('div');
    var a = document.createElement('b'); a.textContent = 'Novo selo: ' + def.nome;
    var l = document.createElement('a'); l.href = '/selos/'; l.textContent = 'Ver meus selos';
    t.appendChild(a); t.appendChild(l);
    var x = document.createElement('button'); x.type = 'button'; x.setAttribute('aria-label', 'Fechar'); x.textContent = 'x';
    x.addEventListener('click', function () { el.hidden = true; });
    el.appendChild(t); el.appendChild(x);
    el.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(function () { el.hidden = true; }, 7000);
  }

  function confere(s) {
    var seq = sequenciaAtual(s.dias);
    if (seq > s.melhor) s.melhor = seq;
    var cond = {
      'cupom': !!s.flags.cupom,
      'leitor': !!s.flags.leitor,
      'explorador': AREAS.every(function (a) { return s.areas[a]; }),
      'primeira-viagem': !!s.flags.viagem,
      'jangadeiro': !!s.flags.nivel3,
      'dias-3': s.melhor >= 3,
      'dias-7': s.melhor >= 7,
      'dias-30': s.melhor >= 30
    };
    var novos = [];
    DEFS.forEach(function (d) {
      if (cond[d.id] && !s.ganhos[d.id]) { s.ganhos[d.id] = hoje(); novos.push(d); }
    });
    return novos;
  }

  function registra(fn) {
    var s = ler();
    fn(s);
    var novos = confere(s);
    salvar(s);
    if (novos.length) toast(novos[novos.length - 1]);
    return s;
  }

  var api = {
    defs: function () { return DEFS; },
    estado: function () { var s = ler(); s.sequencia = sequenciaAtual(s.dias); return s; },
    evento: function (nome) {
      registra(function (s) {
        if (nome === 'pausa') s.pausas += 1;
        if (nome === 'quiz') s.flags.quiz = true;
        if (nome === 'cupom') s.flags.cupom = true;
        if (nome === 'viagem') { s.pausas += 1; s.flags.viagem = true; }
        if (nome === 'nivel3') s.flags.nivel3 = true;
      });
    }
  };
  window.VSelos = api;

  // visita de hoje e area visitada
  registra(function (s) {
    var h = hoje();
    if (s.dias.indexOf(h) === -1) { s.dias.push(h); s.dias = s.dias.slice(-60); }
    var p = location.pathname;
    if (p.indexOf('/agenda/') === 0) s.areas.agenda = 1;
    if (p.indexOf('/cupons/') === 0) s.areas.cupons = 1;
    if (p.indexOf('/jogos/') === 0) s.areas.jogos = 1;
    if (p.indexOf('/revista/') === 0) s.areas.revista = 1;
    if (/^\/revista\/edicao-\d+\/?$/.test(p)) s.flags.leitor = true;
  });

  // pagina Meus selos
  var grid = document.getElementById('selos-grid');
  if (grid) {
    var s = api.estado();
    var n = Object.keys(s.ganhos).length;
    document.getElementById('selos-resumo').textContent =
      n + ' de ' + DEFS.length + ' selos. Sequência atual: ' + s.sequencia + (s.sequencia === 1 ? ' dia' : ' dias') + '.';
    DEFS.forEach(function (d) {
      var ganho = !!s.ganhos[d.id];
      var card = document.createElement('div');
      card.className = 'selo' + (ganho ? ' on' : '');
      var m = document.createElement('div'); m.className = 'selo-marca';
      m.textContent = d.marca; if (ganho) m.style.background = d.cor;
      var h = document.createElement('h3'); h.textContent = d.nome;
      var p = document.createElement('p'); p.textContent = ganho ? 'Conquistado' : d.como;
      card.appendChild(m); card.appendChild(h); card.appendChild(p);
      grid.appendChild(card);
    });
  }
})();
