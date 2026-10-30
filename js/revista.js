// Leitor da revista Viva Vivasso: folhear como numa revista de verdade.
// Usa a biblioteca StPageFlip (licenca MIT), guardada em js/vendor/page-flip.browser.js.
(function () {
  var el = document.getElementById('flipbook');
  if (!el) return;
  var n = +el.dataset.paginas, w = +el.dataset.w, h = +el.dataset.h, ed = el.dataset.edicao;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pos = document.getElementById('flip-pos');
  var prev = document.getElementById('flip-prev');
  var next = document.getElementById('flip-next');
  var tela = document.getElementById('flip-tela');
  function pad(i) { return (i < 10 ? '0' : '') + i; }

  function paginas() {
    var lista = [];
    for (var i = 1; i <= n; i++) {
      var p = document.createElement('div');
      p.className = 'flip-pagina';
      p.setAttribute('data-density', (i === 1 || i === n) ? 'hard' : 'soft');
      var img = document.createElement('img');
      img.src = '/assets/revista/' + ed + '/p' + pad(i) + '.webp';
      img.alt = 'Página ' + i + ' de ' + n;
      img.draggable = false;
      img.decoding = 'async';
      p.appendChild(img);
      el.appendChild(p);
      lista.push(p);
    }
    return lista;
  }

  function alturaPalco() {
    var larg = el.parentElement.clientWidth;
    var dupla = larg >= 700;
    var r = dupla ? h / (2 * w) : h / w;
    el.style.height = Math.round(Math.min(larg, dupla ? 1100 : 560) * r) + 'px';
    el.style.maxWidth = dupla ? '1100px' : '560px';
  }

  // sem a biblioteca, mostra as paginas empilhadas
  if (!window.St || !window.St.PageFlip) {
    paginas().forEach(function (p) { p.className = 'flip-pagina flip-solta'; });
    if (pos) pos.textContent = '';
    [prev, next, tela].forEach(function (b) { if (b) b.hidden = true; });
    return;
  }

  alturaPalco();
  var lista = paginas();
  var livro = new window.St.PageFlip(el, {
    width: w, height: h, size: 'stretch',
    minWidth: 240, maxWidth: 620, minHeight: 300, maxHeight: 900,
    maxShadowOpacity: 0.35, showCover: true, mobileScrollSupport: true,
    flippingTime: reduce ? 1 : 900, usePortrait: true, startZIndex: 0,
    autoSize: true, drawShadow: true, useMouseEvents: true, swipeDistance: 20,
    clickEventForward: true, showPageCorners: true
  });
  livro.loadFromHTML(lista);

  function atualiza(i) {
    if (!pos) return;
    var total = livro.getPageCount();
    var vendo = Math.min(i + 1, total);
    pos.textContent = (livro.getOrientation && livro.getOrientation() === 'landscape' && i > 0 && i < total - 1)
      ? 'Páginas ' + (i + 1) + ' e ' + Math.min(i + 2, total) + ' de ' + total
      : 'Página ' + vendo + ' de ' + total;
  }
  livro.on('flip', function (e) { atualiza(e.data); });
  livro.on('changeOrientation', function () { alturaPalco(); atualiza(livro.getCurrentPageIndex()); });
  atualiza(0);

  if (prev) prev.addEventListener('click', function () { livro.flipPrev(); });
  if (next) next.addEventListener('click', function () { livro.flipNext(); });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') livro.flipPrev();
    if (e.key === 'ArrowRight') livro.flipNext();
  });
  window.addEventListener('resize', function () { alturaPalco(); });
  if (tela) {
    if (!document.fullscreenEnabled) tela.hidden = true;
    tela.addEventListener('click', function () {
      try {
        var area = el.closest('.wrap');
        if (document.fullscreenElement) document.exitFullscreen(); else area.requestFullscreen();
      } catch (e) {}
    });
  }
})();
