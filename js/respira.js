// Respira: jogo de respiracao da Vivasso.
// A jangada anda conforme o ar que voce solta. O progresso fica so neste aparelho (localStorage).
// Dica de teste: abra a pagina com ?rapido=1 para viagens de 20 segundos.
(() => {
  const root = document.getElementById('respira');
  if (!root) return;
  const $ = id => document.getElementById(id);
  const stage = $('rs-stage'), cv = $('rs-cv'), ctx = cv.getContext('2d');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmt = n => n.toFixed(1).replace('.', ',');
  const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rapido = /[?&]rapido=1/.test(location.search);
  const css = getComputedStyle(root);
  const tok = n => css.getPropertyValue(n).trim();
  const U = { accent: tok('--rs-accent'), warn: tok('--rs-warn'), foam: tok('--rs-foam'), wood: tok('--rs-wood'), wood2: tok('--rs-wood-2'), sail: tok('--rs-sail') };

  /* ---------- progresso e niveis ---------- */
  const PKEY = 'vivasso_respira';
  const NIV = [
    { n: 1, nome: 'Aprendiz de jangadeiro', de: 0 },
    { n: 2, nome: 'Jangadeiro', de: 10 },
    { n: 3, nome: 'Mestre do vento', de: 30 },
    { n: 4, nome: 'Capitão da orla', de: 60 },
    { n: 5, nome: 'Lenda do mar', de: 100 }
  ];
  const TECH_NIV = { long: 1, reso: 1, box: 2, s478: 3 };
  const MINS_NIV = { 2: 1, 5: 1, 10: 2 };
  const LIBERA = {
    2: 'a respiração quadrada e a viagem de 10 minutos',
    3: 'a respiração 4-7-8 e o selo Jangadeiro'
  };
  const isoDia = d => d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);

  function lerProg() {
    const p = { viagens: 0, ciclos: 0, minutos: 0, melhor: 0, dias: [] };
    try {
      const r = JSON.parse(localStorage.getItem(PKEY) || 'null');
      if (r && typeof r === 'object') {
        p.viagens = r.viagens || 0; p.ciclos = r.ciclos || 0; p.minutos = r.minutos || 0;
        p.melhor = r.melhor || 0; p.dias = Array.isArray(r.dias) ? r.dias : [];
      }
    } catch (e) {}
    return p;
  }
  function salvaProg(p) { try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch (e) {} }
  function nivelDe(ciclos) { let n = NIV[0]; NIV.forEach(x => { if (ciclos >= x.de) n = x; }); return n; }
  function sequencia(dias) {
    const set = {}; dias.forEach(d => { set[d] = 1; });
    const d = new Date(); let c = 0;
    if (!set[isoDia(d)]) d.setDate(d.getDate() - 1);
    while (set[isoDia(d)]) { c += 1; d.setDate(d.getDate() - 1); }
    return c;
  }
  const nivelAtual = () => nivelDe(lerProg().ciclos).n;
  let subiu = null;

  function registra(chegou) {
    if (!sess) return;
    const p = lerProg(), antes = nivelDe(p.ciclos).n;
    p.ciclos += sess.cycles;
    if (chegou) { p.viagens += 1; p.minutos += sel.mins; }
    p.melhor = Math.max(p.melhor, best);
    const h = isoDia(new Date());
    if (p.dias.indexOf(h) === -1) p.dias.push(h);
    p.dias = p.dias.slice(-60);
    salvaProg(p);
    const depois = nivelDe(p.ciclos);
    subiu = depois.n > antes ? depois : null;
    if (window.VSelos) {
      if (chegou) VSelos.evento('viagem');
      if (depois.n >= 3) VSelos.evento('nivel3');
    }
    desenhaProg();
  }

  function desenhaProg() {
    const box = $('rs-progress');
    if (!box) return;
    const p = lerProg(), nv = nivelDe(p.ciclos);
    const prox = NIV.find(x => x.n === nv.n + 1);
    const pct = prox ? Math.round((p.ciclos - nv.de) / (prox.de - nv.de) * 100) : 100;
    const seq = sequencia(p.dias);
    box.innerHTML = '';
    const h = document.createElement('h2'); h.textContent = 'Seu progresso';
    const nvEl = document.createElement('p'); nvEl.className = 'rs-nivel';
    nvEl.textContent = 'Nível ' + nv.n + ': ' + nv.nome;
    const barra = document.createElement('div'); barra.className = 'rs-barra';
    const bi = document.createElement('i'); bi.style.width = pct + '%'; barra.appendChild(bi);
    const falta = document.createElement('p'); falta.className = 'rs-falta';
    if (prox) {
      falta.textContent = 'Faltam ' + (prox.de - p.ciclos) + ' ciclos calmos para o nível ' + prox.n + (LIBERA[prox.n] ? '. Libera ' + LIBERA[prox.n] + '.' : '.');
    } else falta.textContent = 'Você chegou ao nível mais alto. Continue navegando.';
    const dl = document.createElement('dl'); dl.className = 'rs-numeros';
    [['Viagens', p.viagens], ['Ciclos calmos', p.ciclos], ['Minutos', p.minutos], ['Dias seguidos', seq], ['Melhor sopro', p.melhor ? fmt(p.melhor) + ' s' : '-']].forEach(it => {
      const d = document.createElement('div'); const dt = document.createElement('dt'); const dd = document.createElement('dd');
      dt.textContent = it[0]; dd.textContent = it[1]; d.appendChild(dt); d.appendChild(dd); dl.appendChild(d);
    });
    box.appendChild(h); box.appendChild(nvEl); box.appendChild(barra); box.appendChild(falta); box.appendChild(dl);
  }

  /* ---------- ceus: uma paleta por horario, seguindo o relogio real ---------- */
  const toRgb = h => { h = h.replace('#', ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
  const mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);
  const rgb = (c, a) => 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (a === undefined ? 1 : a) + ')';
  const RAW = [
    { top: '#2b2a5e', mid: '#b86a9a', hor: '#ffc8a0', sun: '#fff0c8', cloud: '#f3c9c4', island: '#40305f', sunH: 0.02, stars: 0.25, seas: ['#9a8fc0', '#6a8fb8', '#3d76a0', '#1d4a6c'] },
    { top: '#3f7fb8', mid: '#86bfe0', hor: '#ffe9c8', sun: '#fffbe6', cloud: '#ffffff', island: '#2f6b6a', sunH: 0.45, stars: 0, seas: ['#9ad0e0', '#5cb0cc', '#2f88ae', '#156186'] },
    { top: '#1d1236', mid: '#8a2f6d', hor: '#ff9a5c', sun: '#ffd08a', cloud: '#e59aa8', island: '#34204f', sunH: 0.02, stars: 0.5, seas: ['#5a5f95', '#356a96', '#1f5379', '#102f4d'] },
    { top: '#0a0a22', mid: '#18204a', hor: '#3a3a7a', sun: '#e8ecff', cloud: '#5d6aa8', island: '#151236', sunH: 0.5, stars: 1, seas: ['#2e3f82', '#22346e', '#162552', '#0b1637'] }
  ];
  const PAL = RAW.map(p => ({ top: toRgb(p.top), mid: toRgb(p.mid), hor: toRgb(p.hor), sun: toRgb(p.sun), cloud: toRgb(p.cloud), island: toRgb(p.island), sunH: p.sunH, stars: p.stars, seas: p.seas.map(toRgb) }));
  let skyOverride = null;
  function realSky() {
    const d = new Date(), h = d.getHours() + d.getMinutes() / 60;
    if (h >= 5 && h < 8) return 0;
    if (h >= 8 && h < 17) return 1;
    if (h >= 17 && h < 19.5) return 2;
    return 3;
  }
  const curSky = () => skyOverride === null ? realSky() : skyOverride;
  const P = JSON.parse(JSON.stringify(PAL[curSky()]));
  let TP = PAL[curSky()], skyCheck = 20;
  function easePal(dt) {
    const k = 1 - Math.exp(-dt * 1.1);
    ['top', 'mid', 'hor', 'sun', 'cloud', 'island'].forEach(key => { P[key] = mix(P[key], TP[key], k); });
    P.seas = P.seas.map((c, i) => mix(c, TP.seas[i], k));
    P.sunH += (TP.sunH - P.sunH) * k;
    P.stars += (TP.stars - P.stars) * k;
  }
  function greet() {
    const h = new Date().getHours();
    return h >= 5 && h < 12 ? 'Bom dia' : h >= 12 && h < 18 ? 'Boa tarde' : 'Boa noite';
  }

  /* ---------- sentimentos e respiracoes (orientacao geral de relaxamento, nao tratamento) ---------- */
  const TECH = {
    long: { name: 'Expiração longa', sub: 'Inspire 4 · solte 6', pat: [['in', 4], ['out', 6]],
      desc: 'Soltar o ar mais devagar do que puxou costuma ajudar o corpo a desacelerar.',
      how: ['Inspire pelo nariz, contando até 4.', 'Solte o ar pela boca, bem devagar, contando até 6.', 'Sem forçar. Se 6 for muito, solte em 5.'] },
    box: { name: 'Respiração quadrada', sub: 'Quatro tempos de 4', pat: [['in', 4], ['hold', 4], ['out', 4], ['hold2', 4]],
      desc: 'Quatro tempos iguais dão um ritmo firme para a mente seguir.',
      how: ['Inspire pelo nariz por 4.', 'Segure por 4, sem tensionar os ombros.', 'Solte devagar por 4 e fique sem ar por 4.'] },
    s478: { name: 'Respiração 4-7-8', sub: 'Inspire 4 · segure 7 · solte 8', pat: [['in', 4], ['hold', 7], ['out', 8]],
      desc: 'Uma pausa longa e uma expiração ainda mais longa. Combina com o fim do dia.',
      how: ['Inspire pelo nariz por 4.', 'Segure por 7. Se for demais, segure por menos.', 'Solte pela boca por 8, como um vento suave.'] },
    reso: { name: 'Respiração suave 5-5', sub: 'Inspire 5 · solte 5', pat: [['in', 5], ['out', 5]],
      desc: 'Um vaivém lento e parelho, fácil de manter.',
      how: ['Inspire pelo nariz por 5.', 'Solte pelo nariz ou pela boca por 5.', 'Deixe o ar entrar e sair sem pausas.'] }
  };
  const FEELS = {
    anx: { label: 'Ansiedade', sub: 'preocupação, coração acelerado', lead: 'Obrigado por contar. Vamos desacelerar com calma.', tech: () => 'long' },
    mind: { label: 'Cabeça a mil', sub: 'pensamentos que não param', lead: 'Vamos dar um ritmo para a mente seguir.', tech: () => curSky() === 3 ? 's478' : 'box' },
    tired: { label: 'Cansaço', sub: 'sem energia', lead: 'Sem pressa. Um ritmo parelho e suave.', tech: () => 'reso' },
    scatter: { label: 'Dispersão', sub: 'difícil manter o foco', lead: 'Vamos prender a atenção num ritmo simples.', tech: () => 'box' },
    heavy: { label: 'Peso', sub: 'desânimo ou tristeza', lead: 'Sinto que está pesado. Vamos devagar, no seu tempo.', tech: () => 'long' },
    calm: { label: 'Tranquilo', sub: 'só quero uma pausa', lead: 'Que bom. Vamos só aproveitar a pausa.', tech: () => 'reso' }
  };
  const LABEL = { in: 'Inspire', hold: 'Segure', out: 'Solte o ar', hold2: 'Fique sem ar' };
  const AFTER = {
    better: 'Que bom. Leve essa calma com você.',
    same: 'Às vezes leva um pouco mais. Respire normalmente e, se quiser, faça outra rodada.',
    still: 'Tudo bem. Uma rodada mais curta, ou só respirar devagar, pode ajudar. Se a angústia continuar ou pesar muito, vale conversar com alguém de confiança ou com um profissional. O CVV atende 24 horas pelo 188.'
  };

  /* ---------- estado ---------- */
  let W = 0, H = 0, dpr = 1, horizon = 0, stars = [], clouds = [], motes = [];
  let mode = (window.matchMedia && matchMedia('(pointer: coarse)').matches) ? 'mic' : 'touch', running = false, calibrating = false, calT = 0, floorAcc = 0, floorN = 0, floor = 0.002;
  let stream = null, actx = null, analyser = null, buf = null, wl = null;
  let held = false;
  let level = 0, agit = 0, speed = 0, dist = 0, t = 0;
  let exhaling = false, exhaleT = 0, quietT = 0, best = 0, calmT = 0, exhaleTotal = 0;
  let msgHold = 0, lastMsg = '';
  let sess = null, stepI = 0, stepT = 0, outBand = 0, prepT = 0, arriveT = 0, smoothP = 0;
  const sel = { feel: 'anx', mins: 5, tech: 'long' };

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = stage.clientWidth; H = stage.clientHeight;
    if (!W || !H) return;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    horizon = H * 0.44;
    stars = Array.from({ length: 30 }, () => ({ x: Math.random() * W, y: Math.random() * horizon * 0.7 + 60, r: Math.random() * 1.1 + 0.3, p: Math.random() * 6 }));
    clouds = Array.from({ length: 4 }, () => ({ x: Math.random() * W, y: horizon * (0.3 + Math.random() * 0.45), s: 0.7 + Math.random() * 0.8, v: 4 + Math.random() * 6 }));
    motes = Array.from({ length: 16 }, () => ({ x: Math.random() * W, y: horizon + Math.random() * (H * 0.3), p: Math.random() * 6 }));
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  function say(text, hold) {
    if (hold) msgHold = hold;
    if (text !== lastMsg) { lastMsg = text; $('rs-msg').textContent = text; }
  }

  /* ---------- audio: tudo e gerado aqui, nada e baixado ---------- */
  const A = { ctx: null, out: null, rev: null, padF: null, surfG: null, on: true, vol: 0.5, live: false, chordI: 0, nextChord: 0, timer: null };
  const CHORDS = [[146.83, 185, 220, 277.18], [123.47, 146.83, 185, 220], [98, 123.47, 146.83, 185], [110, 138.59, 164.81, 220]];
  const PENTA = [587.33, 659.25, 739.99, 880, 987.77, 1174.66];

  function impulse(c, sec, decay) {
    const n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
    return b;
  }
  function noiseBuf(c) {
    const n = c.sampleRate * 4, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    let l = 0;
    for (let i = 0; i < n; i++) { l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02; d[i] = l * 3.5; }
    const f = Math.floor(c.sampleRate * 0.08);
    for (let i = 0; i < f; i++) { const g = i / f; d[i] *= g; d[n - 1 - i] *= g; }
    return b;
  }
  function applyVol() {
    if (A.ctx && A.out) A.out.gain.setTargetAtTime(A.live && A.on ? A.vol : 0, A.ctx.currentTime, 0.4);
  }
  function playChord(notes, t0) {
    const c = A.ctx;
    notes.forEach(n => {
      [[n, 'triangle', 0.08], [n * 2, 'sine', 0.018]].forEach(([f, type, amp]) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = type; o.frequency.value = f; o.detune.value = (Math.random() - 0.5) * 8;
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(amp, t0 + 3);
        g.gain.setValueAtTime(amp, t0 + 6);
        g.gain.linearRampToValueAtTime(0, t0 + 10);
        o.connect(g); g.connect(A.padF);
        o.start(t0); o.stop(t0 + 10.2);
      });
    });
  }
  function schedChords() {
    if (!A.ctx) return;
    while (A.nextChord < A.ctx.currentTime + 2) {
      playChord(CHORDS[A.chordI % CHORDS.length], A.nextChord);
      A.chordI++; A.nextChord += 8;
    }
  }
  function initAudio() {
    try {
      if (A.ctx) { if (A.ctx.state === 'suspended') A.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const c = new AC(); A.ctx = c;
      A.out = c.createGain(); A.out.gain.value = 0;
      const comp = c.createDynamicsCompressor();
      A.out.connect(comp); comp.connect(c.destination);
      const conv = c.createConvolver(); conv.buffer = impulse(c, 3.2, 2.2);
      const wet = c.createGain(); wet.gain.value = 0.5;
      conv.connect(wet); wet.connect(A.out); A.rev = conv;

      const nb = noiseBuf(c);
      const rum = c.createBufferSource(); rum.buffer = nb; rum.loop = true;
      const rumF = c.createBiquadFilter(); rumF.type = 'lowpass'; rumF.frequency.value = 480;
      const rumG = c.createGain(); rumG.gain.value = 0.2;
      const lfo = c.createOscillator(); lfo.frequency.value = 0.09;
      const lfoG = c.createGain(); lfoG.gain.value = 0.11;
      lfo.connect(lfoG); lfoG.connect(rumG.gain);
      rum.connect(rumF); rumF.connect(rumG); rumG.connect(A.out);
      rum.start(); lfo.start();

      const surf = c.createBufferSource(); surf.buffer = nb; surf.loop = true; surf.playbackRate.value = 1.35;
      const surfF = c.createBiquadFilter(); surfF.type = 'bandpass'; surfF.frequency.value = 1500; surfF.Q.value = 0.6;
      A.surfG = c.createGain(); A.surfG.gain.value = 0.02;
      const lfo2 = c.createOscillator(); lfo2.frequency.value = 0.13;
      const lfo2G = c.createGain(); lfo2G.gain.value = 0.02;
      lfo2.connect(lfo2G); lfo2G.connect(A.surfG.gain);
      surf.connect(surfF); surfF.connect(A.surfG); A.surfG.connect(A.out); A.surfG.connect(conv);
      surf.start(); lfo2.start();

      A.padF = c.createBiquadFilter(); A.padF.type = 'lowpass'; A.padF.frequency.value = 700;
      const padG = c.createGain(); padG.gain.value = 0.9;
      A.padF.connect(padG); padG.connect(A.out); padG.connect(conv);
      A.nextChord = c.currentTime + 0.2;
      schedChords();
      A.timer = setInterval(schedChords, 800);
    } catch (e) { A.ctx = null; }
  }
  function setAudioLive(v) { A.live = v; applyVol(); }
  function tone(freq, t0, dur, amp, type) {
    const c = A.ctx; if (!c || !A.live) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(amp, t0 + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(A.out); g.connect(A.rev);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  function chime(i) { if (A.ctx) tone(PENTA[clamp(i, 0, PENTA.length - 1)], A.ctx.currentTime, 2.4, 0.16); }
  function arpeggio() { if (!A.ctx) return; [0, 2, 3, 5].forEach((n, k) => tone(PENTA[n], A.ctx.currentTime + k * 0.22, 2.8, 0.15)); }
  function cue(type) {
    if (!A.ctx) return;
    const f = type === 'in' ? 349.23 : type === 'out' ? 261.63 : 440;
    tone(f, A.ctx.currentTime, 0.9, 0.06);
  }
  function cueBuzz(type) { buzz(type === 'in' ? [40] : type === 'out' ? [70] : [25]); }

  /* ---------- tela ligada e tela cheia (os dois sao opcionais) ---------- */
  async function keepAwake(on) {
    try {
      if (on) {
        if (navigator.wakeLock && !wl) { wl = await navigator.wakeLock.request('screen'); wl.addEventListener('release', () => { wl = null; }); }
      } else if (wl) { await wl.release(); wl = null; }
    } catch (e) { wl = null; }
  }
  if (document.fullscreenEnabled) $('rs-fs').hidden = false;
  $('rs-fs').addEventListener('click', () => {
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else root.requestFullscreen().catch(() => {});
    } catch (e) {}
  });

  /* ---------- telas do cartao ---------- */
  const card = $('rs-card'), overlay = $('rs-overlay');
  const opt = (act, val, label, sub, travado) =>
    '<button class="rs-opt' + (travado ? ' locked' : '') + '" type="button"' + (travado ? ' disabled' : '') + ' data-act="' + act + '" data-val="' + val + '"><b>' + label + '</b><span>' + (travado || sub) + '</span></button>';
  const trava = (necessario) => necessario > nivelAtual() ? 'Libera no nível ' + necessario : '';

  const SCREENS = {
    welcome: () => {
      const nv = nivelDe(lerProg().ciclos);
      return '<h2>' + greet() + '</h2>' +
        '<p>Este é um refúgio de poucos minutos. Eu pergunto como você está, escolho uma respiração para o seu momento e você navega até uma ilha.</p>' +
        '<p class="rs-small">Você está no nível ' + nv.n + ': ' + nv.nome + '.</p>' +
        '<details class="rs-tip"><summary>Antes de começar: silencie o celular</summary>' +
        '<p>Ative o <b>Não Perturbe</b> para ninguém te interromper. O caminho pode variar um pouco conforme o aparelho.</p>' +
        '<ul><li><b>iPhone:</b> abra a Central de Controle, toque em Foco e escolha Não Perturbe.</li>' +
        '<li><b>Android:</b> deslize a barra de notificações para baixo e toque em Não Perturbe.</li></ul></details>' +
        '<div class="rs-acts"><button class="rs-primary" type="button" data-act="go-q1">Continuar</button></div>' +
        '<button class="rs-link" type="button" data-act="sky">Ver outro horário do dia</button>';
    },
    q1: () =>
      '<p class="rs-step">1 de 2</p><h2>Como você está agora?</h2><div class="rs-opts">' +
      Object.keys(FEELS).map(k => opt('feel', k, FEELS[k].label, FEELS[k].sub)).join('') + '</div>' +
      '<button class="rs-link" type="button" data-act="show" data-val="welcome">Voltar</button>',
    q2: () =>
      '<p class="rs-step">2 de 2</p><h2>Quanto tempo você tem?</h2><div class="rs-opts">' +
      opt('mins', 2, '2 minutos', 'uma pausa rápida', trava(MINS_NIV[2])) +
      opt('mins', 5, '5 minutos', 'um respiro de verdade', trava(MINS_NIV[5])) +
      opt('mins', 10, '10 minutos', 'sem pressa', trava(MINS_NIV[10])) + '</div>' +
      '<button class="rs-link" type="button" data-act="show" data-val="q1">Voltar</button>',
    rec: () => {
      const T = TECH[sel.tech], F = FEELS[sel.feel];
      return '<p class="rs-step">Para o seu momento</p><h2>' + T.name + '</h2>' +
        '<p>' + F.lead + ' ' + T.desc + '</p>' +
        '<ol>' + T.how.map(s => '<li>' + s + '</li>').join('') + '</ol>' +
        '<p class="rs-small">' + sel.mins + ' min. Pare se sentir tontura e volte a respirar normalmente. Isto é apoio para relaxar e não substitui cuidado profissional.</p>' +
        '<div class="rs-acts"><button class="rs-primary" type="button" data-act="start">Começar</button><button class="rs-ghost" type="button" data-act="show" data-val="pick">Outra respiração</button></div>' +
        '<button class="rs-link" type="button" data-act="show" data-val="q2">Voltar</button>';
    },
    pick: () =>
      '<p class="rs-step">Escolha</p><h2>Qual respiração?</h2><div class="rs-opts">' +
      Object.keys(TECH).map(k => opt('tech', k, TECH[k].name, TECH[k].sub, trava(TECH_NIV[k]))).join('') + '</div>' +
      '<button class="rs-link" type="button" data-act="show" data-val="rec">Voltar</button>',
    end: () => {
      const n = sess ? sess.cycles : 0;
      const nv = subiu ? '<p class="rs-nivelup">Você subiu para o nível ' + subiu.n + ': ' + subiu.nome + '.' + (LIBERA[subiu.n] ? ' Liberou ' + LIBERA[subiu.n] + '.' : '') + '</p>' : '';
      return '<p class="rs-step">Você chegou</p><h2>Como você está agora?</h2>' +
        '<p>' + (n > 0 ? n + (n === 1 ? ' ciclo calmo' : ' ciclos calmos') + ' em ' + sel.mins + ' min.' : 'Você foi no seu ritmo, e isso conta.') + '</p>' + nv +
        '<div class="rs-opts">' + opt('after', 'better', 'Mais leve', 'senti diferença') + opt('after', 'same', 'Igual', 'quase igual') + opt('after', 'still', 'Ainda agitado', 'preciso de mais') + '</div>';
    },
    after: () =>
      '<h2>Obrigado por ficar.</h2><p>' + AFTER[afterKey] + '</p>' +
      '<div class="rs-acts"><button class="rs-primary" type="button" data-act="show" data-val="q1">Nova viagem</button><button class="rs-ghost" type="button" data-act="show" data-val="welcome">Fechar</button></div>'
  };
  let afterKey = 'better';
  function show(name) {
    if (!name) { overlay.hidden = true; return; }
    overlay.hidden = false;
    card.innerHTML = SCREENS[name]();
    card.scrollTop = 0;
  }
  function techFor(feel) {
    let k = FEELS[feel].tech();
    if (TECH_NIV[k] > nivelAtual()) k = 'long';
    return k;
  }
  card.addEventListener('click', e => {
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const a = b.dataset.act, v = b.dataset.val;
    if (a === 'go-q1') { initAudio(); setAudioLive(true); show('q1'); }
    else if (a === 'feel') { sel.feel = v; show('q2'); }
    else if (a === 'mins') { sel.mins = +v; sel.tech = techFor(sel.feel); show('rec'); }
    else if (a === 'tech') { sel.tech = v; show('rec'); }
    else if (a === 'show') show(v);
    else if (a === 'after') { afterKey = v; show('after'); }
    else if (a === 'sky') { skyOverride = (curSky() + 1) % 4; TP = PAL[skyOverride]; }
    else if (a === 'start') startSession();
  });

  function setUi() {
    const busy = running || calibrating;
    $('rs-mMic').setAttribute('aria-pressed', String(mode === 'mic'));
    $('rs-mTouch').setAttribute('aria-pressed', String(mode === 'touch'));
    $('rs-mBelly').setAttribute('aria-pressed', String(mode === 'belly'));
    $('rs-seg').classList.toggle('off', busy);
    $('rs-sensRow').hidden = mode === 'touch';
    $('rs-hold').hidden = !(mode === 'touch' && running);
    $('rs-stop').hidden = !busy;
    $('rs-hud').hidden = !busy;
    $('rs-vib').hidden = !V.ok;
    $('rs-help').textContent = mode === 'mic'
      ? 'Modo Sopro: segure o celular a uns 20 cm do rosto e solte o ar pela boca, como quem apaga uma vela devagar. Use fones de ouvido, para o som do jogo não ser confundido com a sua respiração. O som do microfone é analisado ali mesmo e não é gravado nem enviado. Se o microfone não funcionar, o jogo passa para o modo Toque.'
      : mode === 'belly'
        ? 'Modo Barriga (em teste): deite-se, apoie o celular com a tela para cima sobre a barriga e respire pela barriga. O celular sente o sobe e desce e o jogo avisa pelo som e pela vibração, então dá para jogar de olhos fechados. Fique o mais parado que puder. Se não responder bem, ajuste a sensibilidade ou use o modo Toque.'
        : 'Modo Toque: segure o botão enquanto solta o ar e solte para inspirar. No computador, use a barra de espaço. O som guia cada etapa, então dá para jogar de olhos fechados.';
  }

  /* ---------- microfone e controle da viagem ---------- */
  async function startMic() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('sem microfone');
    stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    const AC = window.AudioContext || window.webkitAudioContext;
    actx = new AC();
    if (actx.resume) await actx.resume();
    const src = actx.createMediaStreamSource(stream);
    analyser = actx.createAnalyser();
    analyser.fftSize = 1024;
    src.connect(analyser);
    buf = new Float32Array(analyser.fftSize);
  }

  function stopRun() {
    running = false; calibrating = false; exhaling = false; held = false;
    holdOffUi();
    if (stream) { stream.getTracks().forEach(tr => tr.stop()); stream = null; }
    if (actx) { actx.close().catch(() => {}); actx = null; }
    analyser = null;
    bellyOff();
    keepAwake(false);
    setUi();
  }

  function resetStats() {
    dist = 0; best = 0; calmT = 0; exhaleTotal = 0; exhaling = false; exhaleT = 0; quietT = 0; level = 0; speed = 0;
  }

  function begin() {
    running = true; calibrating = false;
    stepI = 0; stepT = 0; outBand = 0; prepT = 3.2; smoothP = 0; arriveT = 0;
    setUi();
    say('Prepare-se… ' + sess.tech.name, 3.2);
  }

  async function startSession() {
    resetStats(); subiu = null;
    initAudio(); setAudioLive(true);
    const T = TECH[sel.tech];
    sess = { tech: T, total: rapido ? 20 : sel.mins * 60, t: 0, cycles: 0, closing: false, closeT: 0, done: false };
    $('rs-phaseLbl').textContent = T.name;
    $('rs-phaseSub').textContent = T.sub;
    show(null);
    keepAwake(true);
    if (mode === 'mic') {
      calibrating = true; setUi();
      say('Pedindo acesso ao microfone…');
      try {
        await startMic();
      } catch (e) {
        mode = 'touch';
        begin();
        say('Não consegui usar o microfone neste navegador. Troquei para o modo Toque.', 4);
        return;
      }
      calT = 0; floorAcc = 0; floorN = 0;
      say('Fique em silêncio por um instante…');
    } else if (mode === 'belly') {
      calibrating = true; setUi();
      say('Pedindo acesso ao sensor de movimento…');
      const r = await startBelly();
      if (r !== 'ok') { calibrating = false; bellyFallback(r); return; }
      say('Deite-se e apoie o celular na barriga, com a tela para cima. Fique parado…');
    } else {
      begin();
    }
  }

  function endSession() {
    registra(true);
    stopRun();
    show('end');
  }

  $('rs-stop').addEventListener('click', () => {
    if (sess && !sess.done && sess.cycles > 0) registra(false);
    stopRun();
    show('welcome');
  });

  function setMode(m) {
    if (m === mode || running || calibrating) return;
    mode = m;
    setUi();
  }
  $('rs-mMic').addEventListener('click', () => setMode('mic'));
  $('rs-mTouch').addEventListener('click', () => setMode('touch'));
  $('rs-mBelly').addEventListener('click', () => setMode('belly'));
  $('rs-vib').addEventListener('click', () => {
    V.on = !V.on;
    $('rs-vib').setAttribute('aria-pressed', String(V.on));
    $('rs-vib').textContent = V.on ? 'Vibração: ligada' : 'Vibração: desligada';
    if (V.on) buzz(30);
  });

  $('rs-snd').addEventListener('click', () => {
    A.on = !A.on;
    $('rs-snd').setAttribute('aria-pressed', String(A.on));
    $('rs-snd').textContent = A.on ? 'Som: ligado' : 'Som: desligado';
    initAudio(); applyVol();
  });
  $('rs-vol').addEventListener('input', () => { A.vol = parseFloat($('rs-vol').value); applyVol(); });

  const hold = $('rs-hold');
  const holdOn = () => { held = true; hold.classList.add('on'); };
  const holdOffUi = () => { hold.classList.remove('on'); };
  const holdOff = () => { held = false; holdOffUi(); };
  hold.addEventListener('pointerdown', e => {
    e.preventDefault();
    try { hold.setPointerCapture(e.pointerId); } catch (err) {}
    holdOn();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(n => hold.addEventListener(n, holdOff));
  window.addEventListener('keydown', e => {
    if (e.code === 'Space' && mode === 'touch' && running) { e.preventDefault(); holdOn(); }
  });
  window.addEventListener('keyup', e => { if (e.code === 'Space') holdOff(); });

  /* ---------- vibracao (so funciona em alguns aparelhos, como Android) ---------- */
  const V = { ok: typeof navigator.vibrate === 'function', on: true, last: 0 };
  function buzz(p) { if (V.ok && V.on) { try { navigator.vibrate(p); } catch (e) {} } }

  /* ---------- barriga: o celular apoiado na barriga sente o sobe e desce ----------
     Ao respirar pela barriga, o celular se inclina um pouco. Medimos essa mudanca de
     inclinacao pelo sensor de gravidade e aprendemos, na calibracao, para que lado
     ela vai quando voce inspira. Soltar o ar e a barriga descendo. */
  const BL = {
    on: false, got: 0, last: 0, init: false,
    gFast: [0, 0, 0], gSlow: [0, 0, 0], base: [0, 0, 0], baseSum: [0, 0, 0], baseN: 0,
    d: [0, 0, 1], amp: 0.2, stage: 0, stageT: 0, peak: 0, peakVec: [0, 0, 0],
    s: 0, sPrev: 0, sd: 0, fail: null
  };
  function bellyHandler(e) {
    const a = e.accelerationIncludingGravity;
    if (!a || a.x == null || a.y == null || a.z == null) return;
    const now = performance.now() / 1000;
    const dt = BL.last ? clamp(now - BL.last, 0.004, 0.25) : 0.02;
    BL.last = now; BL.got++;
    const v = [a.x, a.y, a.z];
    if (!BL.init) { BL.gFast = v.slice(); BL.gSlow = v.slice(); BL.init = true; }
    const kf = 1 - Math.exp(-dt / 0.25);
    const ks = 1 - Math.exp(-dt / (calibrating ? 1e9 : 8));
    for (let i = 0; i < 3; i++) {
      BL.gFast[i] += (v[i] - BL.gFast[i]) * kf;
      BL.gSlow[i] += (v[i] - BL.gSlow[i]) * ks;
    }
  }
  async function startBelly() {
    try {
      if (typeof DeviceMotionEvent === 'undefined') return 'sem-sensor';
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        const r = await DeviceMotionEvent.requestPermission();
        if (r !== 'granted') return 'negado';
      }
    } catch (e) { return 'negado'; }
    BL.got = 0; BL.last = 0; BL.init = false; BL.stage = 0; BL.stageT = 0; BL.fail = null;
    BL.baseSum = [0, 0, 0]; BL.baseN = 0; BL.peak = 0; BL.s = 0; BL.sPrev = 0; BL.sd = 0;
    if (!BL.on) { window.addEventListener('devicemotion', bellyHandler); BL.on = true; }
    return 'ok';
  }
  function bellyOff() {
    if (BL.on) { window.removeEventListener('devicemotion', bellyHandler); BL.on = false; }
  }
  const BELLY_MSG = {
    'sem-sensor': 'Este aparelho não tem sensor de movimento. Troquei para o modo Toque.',
    'negado': 'Sem permissão para o sensor de movimento. Troquei para o modo Toque.',
    'sem-movimento': 'Não senti a sua barriga se mexer. Apoie o celular firme e tente de novo, ou use o modo Toque.'
  };
  function bellyCal(dt) {
    BL.stageT += dt;
    if (BL.stage === 0) {
      if (BL.got === 0) { if (BL.stageT > 2.5) BL.fail = 'sem-sensor'; return; }
      if (BL.baseN === 0) { say('Deite-se e apoie o celular na barriga, com a tela para cima. Fique parado…'); BL.stageT = 0; }
      for (let i = 0; i < 3; i++) BL.baseSum[i] += BL.gFast[i];
      BL.baseN++;
      if (BL.stageT >= 2.8) {
        BL.base = BL.baseSum.map(x => x / BL.baseN);
        BL.stage = 1; BL.stageT = 0; BL.peak = 0;
        say('Agora inspire fundo, enchendo a barriga…');
        buzz(40);
      }
    } else if (BL.stage === 1) {
      const dv = [BL.gFast[0] - BL.base[0], BL.gFast[1] - BL.base[1], BL.gFast[2] - BL.base[2]];
      const mag = Math.hypot(dv[0], dv[1], dv[2]);
      if (mag > BL.peak) { BL.peak = mag; BL.peakVec = dv.slice(); }
      if (BL.stageT >= 4.6) {
        if (BL.peak < 0.04) { BL.fail = 'sem-movimento'; return; }
        BL.d = BL.peakVec.map(x => x / BL.peak);
        BL.amp = BL.peak;
        BL.gSlow = BL.gFast.slice();
        BL.s = 0; BL.sPrev = 0; BL.sd = 0;
        say('Pronto. Solte o ar e relaxe.', 2);
        begin();
      }
    }
  }
  function bellyLevel(dt) {
    const dv = [BL.gFast[0] - BL.gSlow[0], BL.gFast[1] - BL.gSlow[1], BL.gFast[2] - BL.gSlow[2]];
    const sRaw = (dv[0] * BL.d[0] + dv[1] * BL.d[1] + dv[2] * BL.d[2]) / BL.amp;
    BL.s += (sRaw - BL.s) * (1 - Math.exp(-dt / 0.2));
    const sdot = (BL.s - BL.sPrev) / Math.max(dt, 0.001);
    BL.sPrev = BL.s;
    BL.sd += (sdot - BL.sd) * (1 - Math.exp(-dt / 0.5));
    const sens = parseFloat($('rs-sens').value) || 1.2;
    return clamp(-BL.sd * 2.0 * (sens / 1.2), 0, 1);
  }
  function bellyFallback(motivo) {
    bellyOff();
    mode = 'touch';
    if (!running) begin();
    say(BELLY_MSG[motivo] || 'Troquei para o modo Toque.', 5);
  }

  /* ---------- sopro ---------- */
  function updateLevel(dt) {
    let raw = 0, rate = 8;
    if (mode === 'mic' && analyser) {
      analyser.getFloatTimeDomainData(buf);
      let s = 0;
      for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
      const rms = Math.sqrt(s / buf.length);
      if (calibrating) {
        floorAcc += rms; floorN++; calT += dt;
        if (calT >= 1.4) { floor = floorAcc / Math.max(floorN, 1); begin(); }
      } else {
        const sens = parseFloat($('rs-sens').value) || 1;
        raw = clamp((rms - floor * 1.4 - 0.0015) / (0.03 / sens), 0, 1);
      }
    } else if (mode === 'belly') {
      if (calibrating) {
        bellyCal(dt);
        if (BL.fail) { const m = BL.fail; BL.fail = null; calibrating = false; bellyFallback(m); }
      } else if (running) raw = bellyLevel(dt);
      rate = 4;
    } else if (mode === 'touch') {
      raw = running && held ? 0.44 : 0;
      rate = 2.6;
    }
    level += (raw - level) * Math.min(1, dt * rate);
  }

  function finishExhale() {
    const d = Math.max(exhaleT - quietT, 0);
    exhaling = false; quietT = 0;
    if (d >= 1) best = Math.max(best, d);
  }

  /* ---------- logica da viagem ---------- */
  function arrive() {
    if (!sess || sess.done) return;
    sess.done = true; arriveT = 3.5;
    arpeggio(); buzz([80, 60, 80, 60, 140]);
    say('Você chegou à ilha.', 4);
  }

  function updateSession(dt) {
    if (!sess) return;
    if (sess.done) {
      arriveT -= dt;
      if (arriveT <= 0) endSession();
      return;
    }
    if (prepT > 0) { prepT -= dt; return; }
    const pat = sess.tech.pat;
    sess.t += dt;
    if (sess.t >= sess.total) { sess.closing = true; sess.closeT += dt; }
    const st = pat[stepI];
    stepT += dt;
    if (st[0] === 'out' && level > 0.12 && level < 0.7) outBand += dt;
    if (stepT >= st[1]) {
      if (st[0] === 'out') {
        if (outBand / st[1] >= 0.7) {
          sess.cycles++; chime(sess.cycles);
          say('Boa! ' + sess.cycles + (sess.cycles === 1 ? ' ciclo calmo.' : ' ciclos calmos.'), 2);
        } else say('Quase. Solte o ar mais devagar, sem pausas.', 2.4);
      }
      stepI = (stepI + 1) % pat.length;
      stepT = 0; outBand = 0;
      cue(pat[stepI][0]); cueBuzz(pat[stepI][0]);
      if (sess.closing && stepI === 0) arrive();
    }
    if (sess.closing && sess.closeT > 12) arrive();
  }

  function progressNow() {
    if (!sess || !running) return 0.12;
    if (sess.done) return 1;
    return clamp(sess.t / sess.total, 0, 1);
  }
  const mmss = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  function update(dt) {
    t += dt * (reduced ? 0.35 : 1);
    skyCheck -= dt;
    if (skyCheck <= 0) { skyCheck = 20; TP = PAL[curSky()]; }
    updateLevel(dt);
    easePal(dt);

    if (running) {
      if (!exhaling) {
        if (level > 0.14) { exhaling = true; exhaleT = 0; quietT = 0; }
      } else {
        exhaleT += dt; exhaleTotal += dt;
        if (level > 0.12 && level < 0.7) calmT += dt;
        const ending = (mode === 'touch' && !held) || level < 0.08;
        quietT = ending ? quietT + dt : 0;
        if (quietT > (mode === 'touch' ? 0.05 : 0.4)) finishExhale();
      }
      updateSession(dt);
      const agora = performance.now() / 1000;
      if (exhaling && level > 0.12 && level < 0.7 && agora > V.last + 0.9) { V.last = agora; buzz(14); }
    } else if (exhaling) {
      exhaling = false;
    }

    let target = 0.25;
    if (running && exhaling) {
      target = level > 0.7 ? 0.6 : 0.4 + level * 3.2 * (0.55 + 0.45 * Math.min(exhaleT / 4, 1));
    }
    speed += (target - speed) * Math.min(1, dt * 1.6);
    if (running) dist += speed * dt;
    agit += ((level > 0.7 ? 1 : 0) - agit) * Math.min(1, dt * 2);
    smoothP += (progressNow() - smoothP) * Math.min(1, dt * 1.5);

    clouds.forEach(c => { c.x += c.v * dt * (1 + speed); if (c.x > W + 90) c.x = -90; });
    motes.forEach(m => {
      m.x += Math.sin(t * 0.5 + m.p) * 8 * dt; m.y += Math.cos(t * 0.4 + m.p) * 6 * dt - 3 * dt;
      if (m.y < horizon * 0.8) { m.y = horizon + Math.random() * (H * 0.3); m.x = Math.random() * W; }
    });

    if (A.ctx && A.live) {
      const now = A.ctx.currentTime;
      A.padF.frequency.setTargetAtTime(500 + level * 2400, now, 0.4);
      A.surfG.gain.setTargetAtTime(0.02 + speed * 0.05 + agit * 0.08, now, 0.3);
    }

    if (msgHold > 0) msgHold -= dt;
    else if (running && sess && !sess.done) {
      if (prepT > 0) say('Prepare-se…');
      else {
        const st = sess.tech.pat[stepI];
        if (st[0] === 'out' && level > 0.7) say('Mais suave. Menos força.');
        else say(LABEL[st[0]] + '… ' + Math.max(1, Math.ceil(st[1] - stepT)));
      }
    }

    if (sess && (running || calibrating)) {
      $('rs-sTime').textContent = mmss(sess.total - sess.t);
      $('rs-sCyc').textContent = sess.cycles;
      $('rs-sCalm').textContent = exhaleTotal > 2 ? Math.round(calmT / exhaleTotal * 100) + '%' : '-';
      $('rs-sBest').textContent = best ? fmt(best) + ' s' : '-';
      $('rs-progBar').style.width = (smoothP * 100).toFixed(1) + '%';
    }
  }

  /* ---------- desenho ---------- */
  const layers = [
    { off: 0.012, amp: 3, f: 0.012, spd: 0.25, w: 0.5, c: 0 },
    { off: 0.075, amp: 5, f: 0.016, spd: 0.5, w: 0.8, c: 1 },
    { off: 0.16, amp: 7, f: 0.011, spd: 0.9, w: 1.1, c: 2 },
    { off: 0.27, amp: 9, f: 0.009, spd: 1.4, w: 1.4, c: 3 }
  ];
  function waveY(L, x) {
    const amp = L.amp * (1 + agit * 2.6) + level * 2;
    const ph = dist * L.spd * 1.2 + t * L.w;
    return horizon + H * L.off + Math.sin(x * L.f + ph) * amp + Math.sin(x * L.f * 2.1 + ph * 1.3) * amp * 0.35;
  }
  function rr(x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
  }
  const sunX = () => W * 0.62;
  const sunY = () => horizon - 6 - P.sunH * horizon * 0.9;

  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, horizon);
    g.addColorStop(0, rgb(P.top)); g.addColorStop(0.55, rgb(P.mid)); g.addColorStop(1, rgb(P.hor));
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, horizon + 2);
    ctx.fillStyle = rgb(P.sun);
    stars.forEach(s => {
      ctx.globalAlpha = P.stars * (0.35 + 0.35 * Math.sin(t * 1.5 + s.p));
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
    });
    ctx.globalAlpha = 1;
    const sx = sunX(), sy = sunY(), r = Math.min(W, 520) * 0.075 * (1 + level * 0.12);
    const glow = ctx.createRadialGradient(sx, sy, r * 0.4, sx, sy, r * 4.2);
    glow.addColorStop(0, rgb(P.sun, 0.55 - 0.2 * P.stars)); glow.addColorStop(1, rgb(P.sun, 0));
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, horizon + 4);
    ctx.fillStyle = rgb(P.sun); ctx.beginPath(); ctx.arc(sx, sy, r, 0, 6.283); ctx.fill();
  }

  function drawClouds() {
    ctx.fillStyle = rgb(P.cloud, 0.36);
    clouds.forEach(c => {
      [[0, 0, 46, 10], [30, -6, 30, 9], [-28, -3, 26, 8]].forEach(e => {
        ctx.beginPath(); ctx.ellipse(c.x + e[0] * c.s, c.y + e[1] * c.s, e[2] * c.s, e[3] * c.s, 0, 0, 6.283); ctx.fill();
      });
    });
  }

  function drawIsland() {
    const k = clamp(Math.min(W, 560) / 560, 0.7, 1.1);
    const s = (0.35 + smoothP * 1.0) * k;
    const cx = W * 0.84, base = horizon + 3;
    const w = 90 * s, h = 34 * s;
    ctx.fillStyle = rgb(P.island);
    ctx.beginPath();
    ctx.moveTo(cx - w, base);
    ctx.quadraticCurveTo(cx - w * 0.3, base - h * 1.7, cx, base - h);
    ctx.quadraticCurveTo(cx + w * 0.4, base - h * 1.2, cx + w, base);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = rgb(P.island); ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1.5, 3 * s);
    const tx = cx + w * 0.12, ty = base - h * 1.05, tt = ty - 46 * s;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + 8 * s, ty - 24 * s, tx + 4 * s, tt); ctx.stroke();
    ctx.lineWidth = Math.max(1, 2 * s);
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI + (i / 5) * Math.PI;
      ctx.beginPath(); ctx.moveTo(tx + 4 * s, tt);
      ctx.quadraticCurveTo(tx + 4 * s + Math.cos(a) * 16 * s, tt + Math.sin(a) * 16 * s - 6 * s, tx + 4 * s + Math.cos(a) * 28 * s, tt + Math.sin(a) * 10 * s + 14 * s);
      ctx.stroke();
    }
  }

  function drawWave(L) {
    ctx.fillStyle = rgb(P.seas[L.c]);
    ctx.beginPath(); ctx.moveTo(0, H);
    for (let x = 0; x <= W + 6; x += 6) ctx.lineTo(x, waveY(L, x));
    ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
  }

  function drawGlitter() {
    const sx = sunX();
    ctx.fillStyle = rgb(P.sun);
    for (let j = 0; j < 12; j++) {
      const y = horizon + 8 + j * H * 0.022;
      const w = 26 + j * 9;
      const x = sx + Math.sin(t * 2 + j * 1.7) * 6;
      ctx.globalAlpha = Math.max(0.06, 0.5 - j * 0.04);
      ctx.fillRect(x - w / 2, y, w, 2);
    }
    ctx.globalAlpha = 1;
  }

  function drawMotes() {
    if (P.stars < 0.35) return;
    ctx.fillStyle = rgb(P.sun);
    motes.forEach(m => {
      ctx.globalAlpha = (P.stars - 0.3) * 0.9 * (0.4 + 0.6 * Math.sin(t * 1.3 + m.p));
      ctx.beginPath(); ctx.arc(m.x, m.y, 2.2, 0, 6.283); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  function drawRaft(x, y, ang, s) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
    ctx.fillStyle = U.wood2; rr(-64, -2, 128, 11, 5); ctx.fill();
    ctx.fillStyle = U.wood; rr(-60, -10, 120, 11, 5); ctx.fill();
    ctx.fillStyle = U.wood2; rr(-56, -17, 112, 9, 4); ctx.fill();
    ctx.strokeStyle = U.wood2; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-4, -16); ctx.lineTo(-4, -108); ctx.stroke();
    const belly = 8 + level * 20;
    ctx.fillStyle = U.sail;
    ctx.beginPath();
    ctx.moveTo(-2, -104);
    ctx.quadraticCurveTo(30 + belly, -64, 56, -26);
    ctx.lineTo(-2, -26); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = U.accent; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-2, -26); ctx.lineTo(56, -26); ctx.stroke();
    const fl = Math.sin(t * 6) * 3 * (0.4 + level);
    ctx.fillStyle = U.accent;
    ctx.beginPath(); ctx.moveTo(-4, -108); ctx.lineTo(-22, -104 + fl); ctx.lineTo(-4, -98); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function drawOrb() {
    if (!(running || calibrating)) return;
    const cx = W / 2, cy = H - 70, r0 = 22, k = 42;
    ctx.fillStyle = 'rgba(255,230,199,0.14)';
    ctx.beginPath();
    ctx.moveTo(cx + r0 + 0.7 * k, cy); ctx.arc(cx, cy, r0 + 0.7 * k, 0, 6.283);
    ctx.moveTo(cx + r0 + 0.12 * k, cy); ctx.arc(cx, cy, r0 + 0.12 * k, 0, 6.283);
    ctx.fill('evenodd');
    ctx.strokeStyle = 'rgba(255,230,199,0.45)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(cx, cy, r0 + 0.7 * k, 0, 6.283); ctx.stroke();
    ctx.fillStyle = level > 0.7 ? U.warn : U.accent;
    ctx.globalAlpha = 0.9;
    ctx.beginPath(); ctx.arc(cx, cy, r0 + level * k, 0, 6.283); ctx.fill();
    ctx.globalAlpha = 1;
    if (running && sess && !sess.done && prepT <= 0) {
      const st = sess.tech.pat[stepI], f = clamp(stepT / st[1], 0, 1);
      const g = st[0] === 'in' ? f : st[0] === 'out' ? 1 - f : st[0] === 'hold' ? 1 : 0;
      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = U.foam; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, r0 + (0.12 + g * 0.58) * k, 0, 6.283); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  function draw() {
    if (!W || !H) return;
    ctx.clearRect(0, 0, W, H);
    drawSky();
    drawClouds();
    drawIsland();
    drawWave(layers[0]); drawWave(layers[1]);
    drawGlitter();
    drawWave(layers[2]);
    const rx = W * 0.36, L = layers[2];
    const y0 = waveY(L, rx), y1 = waveY(L, rx - 10), y2 = waveY(L, rx + 10);
    const ang = Math.atan2(y2 - y1, 20) * 0.8;
    const sc = clamp(Math.min(W, 640) / 640, 0.65, 1.15);
    drawRaft(rx, y0 + 4 * sc, ang, sc);
    drawWave(layers[3]);
    drawMotes();
    drawOrb();
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }
  if (/[?&]debug=1/.test(location.search)) {
    window.__rs = { estado: () => ({ level, mode, running, calibrating, ciclos: sess ? sess.cycles : 0, etapa: BL.stage, d: BL.d, amp: BL.amp, s: BL.s, msg: lastMsg }) };
  }
  setUi();
  desenhaProg();
  show('welcome');
  requestAnimationFrame(frame);
})();
