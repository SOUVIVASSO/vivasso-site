#!/usr/bin/env python3
"""Gera o site estático da Vivasso.

Lê os textos em content/ e escreve as páginas em HTML:
  content/posts/*.md   -> /blog/<slug>/index.html e /blog/index.html
  content/pages/*.md   -> /<slug>/index.html (privacidade, cookies, termos)
  templates/home.html  -> /index.html

Uso: python build.py
Sem dependências externas.
"""
import html
import re
import time
from datetime import date
from pathlib import Path

ROOT = Path(__file__).parent
SITE_URL = "https://vivasso.com.br"
VERSAO = str(int(time.time()))
EMAIL = "contato@vivasso.com.br"
INSTAGRAM = "https://instagram.com/souvivasso"

CATEGORIAS = [
    ("movimento", "Movimento"),
    ("mente", "Mente e emoção"),
    ("comer-bem", "Comer bem"),
    ("passeios", "Passeios"),
    ("encontros", "Encontros"),
    ("cupons", "Cupons"),
]
CAT_NOME = dict(CATEGORIAS)
MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho",
         "agosto", "setembro", "outubro", "novembro", "dezembro"]


# ---------- utilidades ----------

def esc(s):
    return html.escape(s or "", quote=True)


def data_extenso(iso):
    y, m, d = (int(x) for x in iso.split("-"))
    return f"{d} de {MESES[m - 1]} de {y}"


def front_matter(texto):
    m = re.match(r"^---\n(.*?)\n---\n?(.*)$", texto, re.S)
    if not m:
        return {}, texto
    meta = {}
    for linha in m.group(1).splitlines():
        if ":" in linha:
            k, v = linha.split(":", 1)
            meta[k.strip()] = v.strip()
    return meta, m.group(2)


def inline(t):
    t = esc(t)
    t = re.sub(r"!\[([^\]]*)\]\(([^)]+)\)", r'<img src="\2" alt="\1" loading="lazy">', t)
    t = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", t)
    t = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", t)
    return t


def markdown(texto):
    """Conversor mínimo: títulos, listas, citações, imagens e parágrafos."""
    saida, lista = [], []

    def fecha_lista():
        if lista:
            saida.append("<ul>" + "".join(f"<li>{inline(i)}</li>" for i in lista) + "</ul>")
            lista.clear()

    for bloco in re.split(r"\n\s*\n", texto.strip()):
        linhas = [l for l in bloco.splitlines() if l.strip()]
        if not linhas:
            continue
        if all(l.lstrip().startswith("- ") for l in linhas):
            lista.extend(l.lstrip()[2:] for l in linhas)
            fecha_lista()
        elif linhas[0].startswith("### "):
            saida.append(f"<h3>{inline(linhas[0][4:])}</h3>")
        elif linhas[0].startswith("## ") or linhas[0].startswith("# "):
            saida.append(f"<h2>{inline(linhas[0].lstrip('# '))}</h2>")
        elif linhas[0].startswith("> "):
            saida.append("<blockquote>" + inline(" ".join(l[2:] for l in linhas)) + "</blockquote>")
        else:
            saida.append(f"<p>{inline(' '.join(linhas))}</p>")
    return "\n".join(saida)


# ---------- layout comum ----------

def header(home):
    prefixo = "" if home else "/"
    return f"""<header class="nav" id="nav">
  <a class="logo" href="/" aria-label="Vivasso, página inicial">
    <img class="logo-on-dark" src="/assets/marca-branco.png" alt="Vivasso">
    <img class="logo-on-light" src="/assets/marca-preto.png" alt="">
  </a>
  <nav class="nav-links" aria-label="Principal">
    <a href="/agenda/">Agenda</a>
    <a href="/cupons/">Cupons</a>
    <a href="/jogos/">Jogos</a>
    <a href="/selos/">Selos</a>
    <a href="/blog/">Revista</a>
    <a href="{prefixo}#projetos">Projetos</a>
    <a href="{prefixo}#sobre">Sobre</a>
    <a class="pill pill-sm" href="{prefixo}#contato">Fale com a gente</a>
  </nav>
</header>"""


def footer(home):
    curva = "" if home else """<svg class="curve curve-top" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true">
      <path d="M0,0 L1440,0 L1440,40 C1180,110 820,60 520,90 C300,110 120,70 0,40 Z" fill="var(--paper)"/>
    </svg>"""
    return f"""<footer class="site-footer">
  {curva}
  <div class="wrap footer-grid">
    <div class="footer-brand">
      <img class="logo-footer" src="/assets/logo-branco.png" alt="Vivasso, viva sua marca viva">
      <p>Agência de marketing de wellness. Bem-estar para o corpo, a mente e a cidade.</p>
    </div>
    <nav aria-label="Navegue">
      <h4>Navegue</h4>
      <a href="/agenda/">Agenda</a>
      <a href="/cupons/">Cupons</a>
      <a href="/jogos/">Jogos</a>
      <a href="/selos/">Meus selos</a>
      <a href="/blog/">Revista</a>
      <a href="/#projetos">Projetos</a>
      <a href="/#sobre">Sobre</a>
      <a href="/#contato">Contato</a>
    </nav>
    <nav aria-label="Informações legais">
      <h4>Legal</h4>
      <a href="/privacidade/">Política de Privacidade</a>
      <a href="/termos/">Termos de Uso</a>
      <a href="/cookies/">Política de Cookies</a>
      <button type="button" class="linklike" data-cookie-open>Gerenciar cookies</button>
    </nav>
    <nav aria-label="Contato">
      <h4>Fale com a gente</h4>
      <a href="mailto:{EMAIL}">{EMAIL}</a>
      <a href="{INSTAGRAM}" target="_blank" rel="noopener">@souvivasso</a>
    </nav>
  </div>
  <div class="wrap footer-bottom">
    <small>© {date.today().year} Vivasso. Todos os direitos reservados.</small>
    <small>Marcas e imagens de terceiros pertencem aos seus respectivos titulares.</small>
  </div>
</footer>"""


COOKIE_BANNER = """<div class="cookie" id="cookie" role="dialog" aria-live="polite" aria-label="Aviso de cookies" hidden>
  <p><strong>Cookies, rapidinho.</strong> Usamos cookies essenciais para o site funcionar e, se você deixar, cookies de estatísticas para melhorar o conteúdo. Saiba mais na <a href="/cookies/">Política de Cookies</a>.</p>
  <div class="cookie-actions">
    <button type="button" class="pill pill-sm pill-dark" data-cookie="all">Aceitar tudo</button>
    <button type="button" class="pill pill-sm pill-outline" data-cookie="essential">Só os essenciais</button>
  </div>
</div>"""


def pagina(titulo, descricao, corpo, caminho, home=False, extra_head="", body_class=""):
    url = SITE_URL + caminho
    titulo_completo = "Vivasso | viva sua marca viva" if home else f"{titulo} | Vivasso"
    return f"""<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(titulo_completo)}</title>
<meta name="description" content="{esc(descricao)}">
<link rel="canonical" href="{url}">
<link rel="icon" type="image/png" href="/assets/favicon.png">
<meta property="og:type" content="website">
<meta property="og:title" content="{esc(titulo_completo)}">
<meta property="og:description" content="{esc(descricao)}">
<meta property="og:url" content="{url}">
<meta property="og:locale" content="pt_BR">
<meta property="og:image" content="{SITE_URL}/assets/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Anton&family=Poppins:wght@400;500;600;700&family=Source+Serif+4:ital,wght@1,400;1,600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/css/site.css?v={VERSAO}">
{extra_head}
</head>
<body class="{body_class}">
{header(home)}
<main id="top">
{corpo}
</main>
{footer(home)}
{COOKIE_BANNER}
<script src="/js/selos.js?v={VERSAO}"></script>
<script src="/js/site.js?v={VERSAO}"></script>
</body>
</html>
"""


# ---------- conteúdo ----------

def carrega_posts():
    posts = []
    for arq in sorted((ROOT / "content" / "posts").glob("*.md")):
        meta, corpo = front_matter(arq.read_text(encoding="utf-8"))
        meta["slug"] = arq.stem
        meta["html"] = markdown(corpo)
        meta.setdefault("category", "movimento")
        meta.setdefault("date", date.today().isoformat())
        posts.append(meta)
    posts.sort(key=lambda p: p["date"], reverse=True)
    return posts


def imagem_cat(slug):
    """Usa assets/categorias/<slug>.jpg se existir; senão, o degradê da categoria."""
    for ext in ("jpg", "jpeg", "png", "webp", "svg"):
        if (ROOT / "assets" / "categorias" / f"{slug}.{ext}").exists():
            return f"/assets/categorias/{slug}.{ext}"
    return None


def estilo_img(url):
    return f' style="background-image:url({esc(url)})"' if url else ""


def cartao_home(cat, posts_cat, indice):
    nome = CAT_NOME[cat]
    classes = f"card g{indice + 1} cat-{cat}"
    if posts_cat:
        p = posts_cat[0]
        capa = p.get("cover") or imagem_cat(cat)
        rotulo = f"{nome} · {p['series']}" if p.get("series") else nome
        return f"""        <a class="{classes}" href="/blog/{p['slug']}/"{estilo_img(capa)}>
          <span class="tag">{esc(rotulo)}</span>
          <h3>{esc(p['title'])}</h3>
          <i class="arrow">→</i>
        </a>"""
    return f"""        <a class="{classes} empty" href="/blog/?categoria={cat}"{estilo_img(imagem_cat(cat))}>
          <span class="tag">{esc(nome)}</span>
          <h3>Em breve por aqui</h3>
          <i class="arrow">→</i>
        </a>"""


def carrega_destaque():
    """Destaque do topo da capa. Se o arquivo nao existir, usa a materia mais nova."""
    arq = ROOT / "content" / "destaque.md"
    if not arq.exists():
        return None
    meta, _ = front_matter(arq.read_text(encoding="utf-8"))
    return meta if meta.get("title") and meta.get("link") else None


def monta_home(posts):
    por_cat = {slug: [p for p in posts if p["category"] == slug] for slug, _ in CATEGORIAS}

    tiles = []
    for slug, nome in CATEGORIAS:
        if slug == "cupons":
            n = len(carrega_cupons())
            contagem = "em breve" if n == 0 else f"{n} {'oferta' if n == 1 else 'ofertas'}"
        else:
            n = len(por_cat[slug])
            contagem = "em breve" if n == 0 else f"{n} {'texto' if n == 1 else 'textos'}"
        tiles.append(f"""        <a class="tile cat-{slug}" href="{'/cupons/' if slug == 'cupons' else '/blog/?categoria=' + slug}"{estilo_img(imagem_cat(slug))}>
          <b>{esc(nome)}</b><small>{contagem}</small>
        </a>""")

    cards = [cartao_home(slug, por_cat[slug], i) for i, (slug, _) in enumerate(CATEGORIAS)]
    if not posts:
        cards = ["""        <a class="card card-solo" href="/blog/">
          <span class="tag">Viva Vivasso</span>
          <h3>A próxima edição está a caminho</h3>
          <p>Toda semana, uma revista nova sobre bem-estar e o que vale a pena viver na cidade.</p>
          <i class="arrow">→</i>
        </a>"""]

    hero_card = ""
    destaque = carrega_destaque()
    if destaque:
        externo = destaque["link"].startswith("http")
        alvo = ' target="_blank" rel="noopener"' if externo else ""
        hero_card = f"""<a class="hero-card" href="{esc(destaque['link'])}"{alvo}>
      <span class="tag">{esc(destaque.get('label', 'Destaque'))}</span>
      <strong>{esc(destaque['title'])}</strong>
      <small>{esc(destaque.get('subtitle', ''))}</small>
      <i class="arrow">→</i>
    </a>"""
    elif posts:
        p = posts[0]
        rotulo = p.get("series") or CAT_NOME.get(p["category"], "Novo")
        hero_card = f"""<a class="hero-card" href="/blog/{p['slug']}/">
      <span class="tag">{esc(rotulo)}</span>
      <strong>{esc(p['title'].split(':')[0])}</strong>
      <small>{data_extenso(p['date'])}</small>
      <i class="arrow">→</i>
    </a>"""

    corpo = (ROOT / "templates" / "home.html").read_text(encoding="utf-8")
    corpo = (corpo.replace("{{HERO_CARD}}", hero_card)
                  .replace("{{EXPLORE}}", "\n".join(tiles))
                  .replace("{{NOVIDADES}}", "\n".join(cards)))
    return pagina(
        "Vivasso",
        "Vivasso é uma agência de marketing de wellness. Revista semanal, dicas, passeios e cupons para viver bem a cidade.",
        corpo, "/", home=True)


# ---------- agenda ----------

ICONE_LOCAL = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>'
ICONE_HORA = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'


def carrega_agenda():
    itens = []
    for arq in sorted((ROOT / "content" / "agenda").glob("*.md")):
        meta, _ = front_matter(arq.read_text(encoding="utf-8"))
        meta.setdefault("category", "movimento")
        itens.append(meta)
    itens.sort(key=lambda e: (bool(e.get("days")), e.get("date", ""), e.get("time", "")))
    return itens


def cartao_agenda(e):
    recorrente = bool(e.get("days"))
    cat = e["category"]
    if recorrente:
        bloco = f'<div class="ev-date cat-{cat}"><b>{esc(e.get("weekday", ""))}</b><small>toda semana</small></div>'
        quando = e.get("when", "")
    else:
        y, m, d = (int(x) for x in e["date"].split("-"))
        bloco = f'<div class="ev-date cat-{cat}"><b>{d}</b><small>{MESES[m - 1][:3]}</small></div>'
        quando = e.get("time", "")
    preco = e.get("price", "")
    gratis = "1" if preco.lower().startswith("gr") else "0"
    meta = []
    if e.get("local") or e.get("bairro"):
        meta.append(f'<li>{ICONE_LOCAL}<span>{esc(" · ".join(x for x in (e.get("local", ""), e.get("bairro", "")) if x))}</span></li>')
    if quando:
        meta.append(f'<li>{ICONE_HORA}<span>{esc(quando)}</span></li>')
    meta_html = f'<ul class="ev-meta">{"".join(meta)}</ul>' if meta else ""
    exemplo = '<span class="tag tag-demo">Exemplo</span>' if e.get("demo") else ""
    nota = f'<p class="ev-note">{esc(e["note"])}</p>' if e.get("note") else ""
    link = e.get("link", "")
    botao = (f'<a class="ev-btn" href="{esc(link)}" target="_blank" rel="noopener">{esc(e.get("link_text", "Ver detalhes"))} <span aria-hidden="true">→</span></a>'
             if link else "")
    pill = f'<span class="ev-price{" free" if gratis == "1" else ""}">{esc(preco)}</span>' if preco else ""
    return f"""        <article class="ev" data-cat="{cat}" data-bairro="{esc(e.get('bairro', ''))}" data-date="{e.get('date', '')}" data-end="{e.get('end', '')}" data-days="{esc(e.get('days', ''))}" data-free="{gratis}">
          {bloco}
          <div class="ev-body">
            <div class="ev-tags"><span class="tag cat-{cat}">{esc(CAT_NOME.get(cat, cat))}</span>{exemplo}</div>
            <h3>{esc(e['title'])}</h3>
            {meta_html}
            {nota}
          </div>
          <div class="ev-side">
            {pill}
            {botao}
          </div>
        </article>"""


def grupos_agenda(itens):
    """Agrupa por mes e deixa os eventos semanais num bloco proprio."""
    grupos, ordem = {}, []
    for e in itens:
        if e.get("days"):
            chave = "Toda semana"
        else:
            y, m, _ = (int(x) for x in e["date"].split("-"))
            chave = f"{MESES[m - 1].capitalize()} de {y}"
        if chave not in grupos:
            grupos[chave] = []
            ordem.append(chave)
        grupos[chave].append(e)
    saida = []
    for chave in ordem:
        cards = "\n".join(cartao_agenda(e) for e in grupos[chave])
        saida.append(f"""      <section class="ev-group">
        <h2 class="ev-group-title">{esc(chave)}</h2>
        <div class="ev-group-list">
{cards}
        </div>
      </section>""")
    return "\n".join(saida)


def monta_agenda(itens):
    usadas = {e["category"] for e in itens}
    cats = [(s, n) for s, n in CATEGORIAS if s != "cupons" and s in usadas]
    chips = '<button type="button" class="chip on" data-filter="todos">Todos</button>' + "".join(
        f'<button type="button" class="chip" data-filter="{s}">{esc(n)}</button>' for s, n in cats)
    bairros = sorted({e.get("bairro", "") for e in itens if e.get("bairro")})
    if bairros:
        opcoes = '<option value="">Todos os bairros</option>' + "".join(f"<option>{esc(b)}</option>" for b in bairros)
        filtro_bairro = f'<select id="f-bairro" aria-label="Bairro">{opcoes}</select>'
    else:
        filtro_bairro = '<select id="f-bairro" aria-label="Bairro" hidden><option value=""></option></select>'
    aviso = ""
    if any(e.get("demo") for e in itens):
        aviso = '<p class="demo-note">Os eventos marcados como Exemplo são só para testar o visual.</p>'
    corpo = f"""  <section class="blog-head">
    <div class="wrap">
      <p class="eyebrow">Agenda wellness</p>
      <h1>O que fazer <span class="hl-serif">na cidade</span></h1>
      <p>Corridas, aulas, feiras e experiências que fazem bem. Filtre por assunto e por dia.</p>
      <div class="chips" id="chips">{chips}</div>
      <div class="agenda-filters">
        {filtro_bairro}
        <select id="f-quando" aria-label="Quando">
          <option value="">Qualquer dia</option>
          <option value="hoje">Hoje</option>
          <option value="semana">Próximos 7 dias</option>
          <option value="mes">Próximos 30 dias</option>
        </select>
        <label class="chk"><input type="checkbox" id="f-gratis"> Só grátis</label>
      </div>
      {aviso}
    </div>
  </section>
  <section class="blog-list">
    <div class="wrap">
      <div id="ev-list">
{grupos_agenda(itens)}
      </div>
      <p class="vazio" id="ev-vazio" hidden>Nada por aqui com esses filtros. Tente outro dia ou outro assunto.</p>
      <p class="agenda-aviso">Datas, horários e preços podem mudar. Confira sempre no link de cada evento antes de se programar. Informações conferidas em 30 de outubro de 2026.</p>
    </div>
  </section>"""
    return pagina("Agenda", "Corridas, aulas, feiras e experiências de bem-estar em Fortaleza. Filtre por assunto e por dia.",
                  corpo, "/agenda/", body_class="inner")


# ---------- cupons ----------

def carrega_cupons():
    itens = []
    for arq in sorted((ROOT / "content" / "cupons").glob("*.md")):
        meta, _ = front_matter(arq.read_text(encoding="utf-8"))
        meta.setdefault("category", "comer-bem")
        itens.append(meta)
    itens.sort(key=lambda c: c.get("until", "9999-99-99"))
    return itens


def cartao_cupom(c):
    if c.get("until"):
        y, m, d = (int(x) for x in c["until"].split("-"))
        validade = f"Válido até {d} de {MESES[m - 1]}"
    else:
        validade = "Sem prazo informado. Confirme antes de ir."
    exemplo = '<span class="tag tag-demo">Exemplo</span>' if c.get("demo") else ""
    parceiro = f'<p class="cp-partner">Oferta de: {esc(c["partner"])}</p>' if c.get("partner") else ""
    regras = f'<p class="cp-rules">{esc(c["rules"])}</p>' if c.get("rules") else ""
    onde = f'<p class="cp-where">{esc(c["bairro"])}</p>' if c.get("bairro") else ""
    link = c.get("link", "")
    ver = f'<a class="link" href="{esc(link)}" target="_blank" rel="noopener">{esc(c.get("link_text", "Ver o lugar"))}</a>' if link else ""
    codigo = c.get("code", "")
    botao = (f'<button type="button" class="cp-code" data-code="{esc(codigo)}"><span>{esc(codigo)}</span><small>Copiar código</small></button>'
             if codigo else "")
    return f"""      <article class="cp" data-cat="{c['category']}" data-bairro="{esc(c.get('bairro', ''))}" data-until="{c.get('until', '')}">
        <div class="cp-main">
          <div class="ev-tags"><span class="tag cat-{c['category']}">{esc(CAT_NOME.get(c['category'], c['category']))}</span>{exemplo}</div>
          <h3>{esc(c['title'])}</h3>
          <p class="cp-offer">{esc(c.get('offer', ''))}</p>
          {onde}{parceiro}
          {regras}
          {ver}
        </div>
        <div class="cp-side">
          <small>{validade}</small>
          {botao}
        </div>
      </article>"""


def monta_cupons(itens):
    usadas = {c["category"] for c in itens}
    cats = [(s, n) for s, n in CATEGORIAS if s != "cupons" and s in usadas]
    chips = '<button type="button" class="chip on" data-filter="todos">Todos</button>' + "".join(
        f'<button type="button" class="chip" data-filter="{s}">{esc(n)}</button>' for s, n in cats)
    bairros = sorted({c.get("bairro", "") for c in itens if c.get("bairro")})
    opcoes = '<option value="">Todos os bairros</option>' + "".join(f"<option>{esc(b)}</option>" for b in bairros)
    cards = "\n".join(cartao_cupom(c) for c in itens)
    aviso = ""
    if any(c.get("demo") for c in itens):
        aviso = '<p class="demo-note">Os cupons marcados como Exemplo são só para testar o visual. Serão trocados pelos reais, de parceiros da Vivasso.</p>'
    corpo = f"""  <section class="blog-head">
    <div class="wrap">
      <p class="eyebrow">Cupons</p>
      <h1>Descontos que <span class="hl-serif">fazem bem</span></h1>
      <p>Ofertas de lugares e eventos de bem-estar. Quando tem código, é só copiar e usar.</p>
      <div class="chips" id="chips">{chips}</div>
      <div class="agenda-filters">
        <select id="f-bairro" aria-label="Bairro">{opcoes}</select>
      </div>
      {aviso}
    </div>
  </section>
  <section class="blog-list">
    <div class="wrap">
      <div class="ev-list" id="cp-list">
{cards}
      </div>
      <p class="vazio" id="cp-vazio" hidden>Nenhum cupom com esses filtros agora. Volte em breve.</p>
      <p class="agenda-aviso">Ofertas públicas conferidas nos sites oficiais em 30 de outubro de 2026. Elas ainda não são parcerias da Vivasso. Confirme as regras com quem oferece antes de usar.</p>
    </div>
  </section>"""
    return pagina("Cupons", "Cupons de desconto de lugares e profissionais de bem-estar parceiros da Vivasso.",
                  corpo, "/cupons/", body_class="inner")


# ---------- jogos ----------

JOGOS_CORPO = """  <section class="blog-head">
    <div class="wrap">
      <p class="eyebrow">Jogos</p>
      <h1>Respire, navegue e <span class="hl-serif">volte</span></h1>
      <p>Jogos curtos para desacelerar. Sem placar para vencer: o seu progresso fica salvo neste aparelho e rende selos.</p>
    </div>
  </section>
  <section class="blog-list">
    <div class="wrap">

      <article class="jogo-destaque">
        <img class="jogo-arte" src="/assets/jogos/respira.svg" alt="Uma jangada de vela triangular num mar ao entardecer, indo em direção a uma ilha com coqueiro" width="800" height="500">
        <div class="jogo-texto">
          <span class="tag">Jogo</span>
          <h2>Respira, a viagem</h2>
          <p class="jogo-lead">Uma jangada atravessa o mar de Fortaleza até uma ilha. Ela anda com a sua respiração.</p>
          <p>Inspire, segure e solte o ar no ritmo certo. Quanto mais calma a respiração, mais longe a jangada vai. O céu e o mar mudam de cor conforme a hora do dia onde você está.</p>
          <ul class="jogo-lista">
            <li>Viagens de 2, 5 ou 10 minutos</li>
            <li>Quatro respirações, liberadas por nível</li>
            <li>Cinco níveis e selos para quem volta</li>
            <li>Dá para jogar de olhos fechados, guiado por sons e vibração</li>
          </ul>
          <p><a class="pill" href="/jogos/respira/">Jogar agora <span aria-hidden="true">→</span></a></p>
          <p class="jogo-nota">De 2 a 10 minutos. Funciona melhor no celular. Fones de ouvido ajudam. <a class="link" href="/jogos/respira/#manual">Manual dos sons</a></p>
        </div>
      </article>

      <h2 class="jogo-titulo">Como funciona</h2>
      <div class="jogo-passos">
        <div class="jogo-passo"><b>1</b><h3>Conte como você está</h3><p>Duas perguntas rápidas: como você se sente e quanto tempo tem. O jogo escolhe uma respiração para o seu momento.</p></div>
        <div class="jogo-passo"><b>2</b><h3>Respire no ritmo</h3><p>Um círculo mostra a hora de inspirar, segurar e soltar. Quando você solta o ar com calma, a jangada ganha velocidade.</p></div>
        <div class="jogo-passo"><b>3</b><h3>Chegue à ilha</h3><p>Ao final, o jogo pergunta como você está e guarda o seu progresso. Cada viagem rende ciclos calmos para subir de nível.</p></div>
      </div>

      <h2 class="jogo-titulo">Três jeitos de jogar</h2>
      <div class="jogo-modos">
        <div class="jogo-modo"><h3>Toque</h3><p>Segure o botão enquanto solta o ar e solte para inspirar. No computador, use a barra de espaço.</p></div>
        <div class="jogo-modo"><h3>Sopro</h3><p>O celular escuta o seu sopro, como quem apaga uma vela devagar. Use fones de ouvido. O som não é gravado.</p></div>
        <div class="jogo-modo"><h3>Barriga <span class="jogo-beta">em teste</span></h3><p>Deite-se e apoie o celular sobre a barriga. Ele sente o sobe e desce da respiração e vibra para guiar você.</p></div>
      </div>

      <h2 class="jogo-titulo">Níveis</h2>
      <ol class="jogo-niveis">
        <li><b>Nível 1</b> Aprendiz de jangadeiro <span>Para começar</span></li>
        <li><b>Nível 2</b> Jangadeiro <span>10 ciclos calmos. Libera a respiração quadrada e a viagem de 10 minutos</span></li>
        <li><b>Nível 3</b> Mestre do vento <span>30 ciclos calmos. Libera a respiração 4-7-8 e um selo</span></li>
        <li><b>Nível 4</b> Capitão da orla <span>60 ciclos calmos</span></li>
        <li><b>Nível 5</b> Lenda do mar <span>100 ciclos calmos</span></li>
      </ol>

      <p class="agenda-aviso">Os jogos da Vivasso são de relaxamento e não substituem o cuidado de um profissional de saúde. Se você está passando por um momento difícil, procure ajuda. O CVV atende 24 horas pelo telefone 188.</p>
    </div>
  </section>"""


def monta_jogos():
    return pagina("Jogos", "Jogos curtos de bem-estar da Vivasso. Respira: uma jangada no mar de Fortaleza que anda com a sua respiração.",
                  JOGOS_CORPO, "/jogos/", body_class="inner")


def monta_pausa_antiga():
    """A pagina Pausa virou Jogos. Quem abrir o endereco antigo e levado para o novo."""
    corpo = """  <section class="blog-head">
    <div class="wrap">
      <h1>Esta página <span class="hl-serif">mudou</span></h1>
      <p>As pausas agora são jogos. Se você não for levado automaticamente, use o botão abaixo.</p>
      <p><a class="pill" href="/jogos/">Ir para os jogos</a></p>
    </div>
  </section>"""
    extra = '<meta http-equiv="refresh" content="0; url=/jogos/"><meta name="robots" content="noindex">'
    return pagina("Pausa", "Esta página mudou para Jogos.", corpo, "/pausa/", extra_head=extra, body_class="inner")


# ---------- selos ----------

SELOS_CORPO = """  <section class="blog-head">
    <div class="wrap">
      <p class="eyebrow">Meus selos</p>
      <h1>Volte, ganhe <span class="hl-serif">selos</span></h1>
      <p>Cada viagem, cada visita e cada descoberta rende um selo. Eles ficam guardados só neste aparelho.</p>
      <p class="pausa-count" id="selos-resumo"></p>
    </div>
  </section>
  <section class="blog-list">
    <div class="wrap">
      <div class="selos-grid" id="selos-grid"></div>
      <p class="selos-nota">Se você limpar os dados do navegador, os selos deste aparelho somem. Nenhum dado seu é enviado para a Vivasso.</p>
    </div>
  </section>"""


def monta_selos():
    return pagina("Meus selos", "Selos da Vivasso para quem volta: jogos, visitas e descobertas.",
                  SELOS_CORPO, "/selos/", body_class="inner")


def monta_404():
    corpo = """  <section class="blog-head">
    <div class="wrap">
      <p class="eyebrow">Página não encontrada</p>
      <h1>Esse caminho <span class="hl-serif">não existe</span></h1>
      <p>A página que você procura mudou de lugar ou nunca existiu. Volte para o início e escolha por onde seguir.</p>
      <p><a class="pill" href="/">Ir para o início</a></p>
    </div>
  </section>"""
    return pagina("Página não encontrada", "Página não encontrada.", corpo, "/404.html", body_class="inner")


# ---------- jogo respira ----------

RESPIRA_CORPO = """  <section class="blog-head">
    <div class="wrap">
      <p class="eyebrow">Jogo</p>
      <h1>Respira, a <span class="hl-serif">viagem</span></h1>
      <p><a class="link" href="/jogos/">← Todos os jogos</a></p>
      <p>Uma jangada, o mar de Fortaleza e a sua respiração. Respire no ritmo certo e chegue à ilha. Seu progresso fica salvo neste aparelho.</p>
    </div>
  </section>
  <section class="blog-list">
    <div class="wrap">
      <div class="respira" id="respira">
        <div class="rs-stage" id="rs-stage">
          <canvas id="rs-cv" role="img" aria-label="Uma jangada de vela triangular navegando num mar que muda de cor conforme a hora do dia, em direção a uma ilha"></canvas>
          <div class="rs-hud" id="rs-hud" hidden>
            <div class="rs-phase"><span id="rs-phaseLbl"></span><span id="rs-phaseSub"></span></div>
            <div class="rs-prog" aria-hidden="true"><i id="rs-progBar"></i></div>
            <dl class="rs-stats">
              <div><dt>Tempo</dt><dd id="rs-sTime">0:00</dd></div>
              <div><dt>Ciclos</dt><dd id="rs-sCyc">0</dd></div>
              <div><dt>Calma</dt><dd id="rs-sCalm">-</dd></div>
              <div><dt>Melhor</dt><dd id="rs-sBest">-</dd></div>
            </dl>
            <p class="rs-msg" id="rs-msg" aria-live="polite"></p>
          </div>
          <div class="rs-overlay" id="rs-overlay"><section class="rs-card" id="rs-card" aria-live="polite"></section></div>
        </div>
        <div class="rs-controls">
          <div class="rs-row">
            <div class="rs-seg" id="rs-seg" role="group" aria-label="Modo de jogo">
              <button id="rs-mMic" type="button" aria-pressed="true">Sopro</button>
              <button id="rs-mTouch" type="button" aria-pressed="false">Toque</button>
              <button id="rs-mBelly" type="button" aria-pressed="false">Barriga</button>
            </div>
            <button id="rs-snd" class="rs-pill" type="button" aria-pressed="true">Som: ligado</button>
            <button id="rs-vib" class="rs-pill" type="button" aria-pressed="true" hidden>Vibração: ligada</button>
            <button id="rs-fs" class="rs-pill" type="button" hidden>Tela cheia</button>
            <button id="rs-stop" class="rs-ghost" type="button" hidden>Encerrar</button>
          </div>
          <button id="rs-hold" class="rs-hold" type="button" hidden>Segure para soltar o ar</button>
          <div class="rs-sliders">
            <label class="rs-sl" id="rs-sensRow" for="rs-sens"><span>Sensibilidade</span><input id="rs-sens" type="range" min="0.5" max="3" step="0.1" value="1.2"></label>
            <label class="rs-sl" for="rs-vol"><span>Volume</span><input id="rs-vol" type="range" min="0" max="1" step="0.05" value="0.5"></label>
          </div>
          <p class="rs-help" id="rs-help"></p>
          <p class="rs-help">Para jogar de olhos fechados, use fones e um volume confortável. Os sons guiam cada etapa. <a href="#manual">Veja o manual dos sons</a>.</p>
        </div>
      </div>
      <div class="rs-progress" id="rs-progress"></div>
      <details class="rs-manual" id="manual">
        <summary>Manual dos sons</summary>
        <p class="rs-manual-intro">Cada som tem um significado. Toque em Ouvir para conhecer. No iPhone, desligue o modo silencioso.</p>
        <ul class="rs-sons">
          <li><div><b>Três notas suaves subindo</b><p>Tudo pronto. A viagem vai começar.</p></div><button type="button" class="rs-ouvir" data-som="comecar">Ouvir</button></li>
          <li><div><b>Um som que sobe devagar</b><p>Hora de inspirar. Ele dura o tempo da inspiração.</p></div><button type="button" class="rs-ouvir" data-som="inspirar">Ouvir</button></li>
          <li><div><b>Um som firme e baixinho, sem mudar</b><p>Segure o ar.</p></div><button type="button" class="rs-ouvir" data-som="segurar">Ouvir</button></li>
          <li><div><b>Um som que desce devagar</b><p>Solte o ar. Ele dura o tempo de soltar.</p></div><button type="button" class="rs-ouvir" data-som="soltar">Ouvir</button></li>
          <li><div><b>Um sininho curto no começo de cada etapa</b><p>A etapa mudou. Agudo é para inspirar. Grave é para soltar.</p></div><button type="button" class="rs-ouvir" data-som="ding">Ouvir</button></li>
          <li><div><b>Duas notas claras, como um sininho</b><p>Ciclo calmo concluído. Você respirou no ritmo.</p></div><button type="button" class="rs-ouvir" data-som="ciclo">Ouvir</button></li>
          <li><div><b>Dois toquinhos graves, descendo</b><p>O ar saiu rápido ou forte demais. Na próxima, solte com mais calma.</p></div><button type="button" class="rs-ouvir" data-som="rapido">Ouvir</button></li>
          <li><div><b>Um "mmm" grave e longo</b><p>O ar saiu fraco ou parou antes da hora. Na próxima, solte um pouco mais firme e sem parar.</p></div><button type="button" class="rs-ouvir" data-som="devagar">Ouvir</button></li>
          <li><div><b>Quatro notas subindo e se abrindo</b><p>Você chegou à ilha.</p></div><button type="button" class="rs-ouvir" data-som="chegada">Ouvir</button></li>
        </ul>
        <p class="rs-manual-intro"><b>No modo Barriga:</b> as três notas suaves avisam para você se deitar e apoiar o celular. Depois de alguns segundos, um sininho avisa para ficar parado. Em seguida o som sobe: inspire fundo, enchendo a barriga, para o celular aprender a sua respiração. As três notas de novo avisam que a viagem começou. Nos celulares que permitem, a vibração acompanha os sons.</p>
      </details>
      <p class="agenda-aviso">O Respira é um jogo de relaxamento e não substitui o cuidado de um profissional de saúde. Se você está passando por um momento difícil, procure ajuda. O CVV atende 24 horas pelo telefone 188.</p>
      <p><a class="link" href="/jogos/">Ver todos os jogos</a></p>
    </div>
  </section>
  <script src="/js/respira.js?v={VERSAO}"></script>"""


def monta_respira():
    return pagina("Respira", "Respira, o jogo de respiração da Vivasso: uma jangada, o mar de Fortaleza e o seu ritmo. Progresso salvo no aparelho.",
                  RESPIRA_CORPO.replace("{VERSAO}", VERSAO), "/jogos/respira/", body_class="inner")


def cartao_blog(p):
    cat = p["category"]
    capa = p.get("cover") or imagem_cat(cat)
    rotulo = CAT_NOME.get(cat, cat)
    serie = f" · {esc(p['series'])}" if p.get("series") else ""
    return f"""      <a class="post-card" data-cat="{cat}" href="/blog/{p['slug']}/">
        <div class="post-thumb cat-{cat}"{estilo_img(capa)}></div>
        <div class="post-body">
          <span class="tag">{esc(rotulo)}{serie}</span>
          <h3>{esc(p['title'])}</h3>
          <p>{esc(p.get('excerpt', ''))}</p>
          <small>{data_extenso(p['date'])}</small>
        </div>
      </a>"""


def monta_blog(posts):
    chips = '<button type="button" class="chip on" data-filter="todos">Todos</button>' + "".join(
        f'<button type="button" class="chip" data-filter="{slug}">{esc(nome)}</button>' for slug, nome in CATEGORIAS)
    cards = "\n".join(cartao_blog(p) for p in posts) or '<p class="vazio">A primeira edição está a caminho. Volte em breve.</p>'
    corpo = f"""  <section class="blog-head">
    <div class="wrap">
      <h1>Viva <span class="hl-serif">Vivasso</span></h1>
      <p>A revista semanal da Vivasso. Bem-estar, passeios e dicas para viver bem a cidade.</p>
      <div class="chips" id="chips">{chips}</div>
    </div>
  </section>
  <section class="blog-list">
    <div class="wrap">
      <div class="post-grid" id="post-grid">
{cards}
      </div>
      <p class="vazio" id="vazio" hidden>Nada por aqui ainda neste assunto. Volte em breve.</p>
    </div>
  </section>"""
    return pagina("Revista", "A revista semanal da Vivasso. Bem-estar, passeios e dicas para viver bem a cidade.", corpo, "/blog/",
                  body_class="inner")


def monta_post(p):
    cat = p["category"]
    capa = p.get("cover")
    rotulo = CAT_NOME.get(cat, cat)
    serie = f" · {esc(p['series'])}" if p.get("series") else ""
    capa_html = (f'<img class="post-cover" src="{esc(capa)}" alt="">' if capa
                 else f'<div class="post-cover cat-{cat}"{estilo_img(imagem_cat(cat))}></div>')
    corpo = f"""  <article class="post">
    <div class="wrap post-wrap">
      <a class="back" href="/blog/">← Voltar à revista</a>
      <span class="tag">{esc(rotulo)}{serie}</span>
      <h1>{esc(p['title'])}</h1>
      <p class="post-meta">{data_extenso(p['date'])}</p>
      {capa_html}
      <div class="prose">
{p['html']}
      </div>
    </div>
  </article>"""
    ld = f"""<script type="application/ld+json">{{"@context":"https://schema.org","@type":"Article","headline":"{esc(p['title'])}","datePublished":"{p['date']}","author":{{"@type":"Organization","name":"Vivasso"}},"publisher":{{"@type":"Organization","name":"Vivasso"}}}}</script>"""
    return pagina(p["title"], p.get("excerpt", ""), corpo, f"/blog/{p['slug']}/",
                  extra_head=ld, body_class="inner")


def monta_paginas_legais():
    paginas = []
    for arq in sorted((ROOT / "content" / "pages").glob("*.md")):
        meta, corpo = front_matter(arq.read_text(encoding="utf-8"))
        slug = arq.stem
        html_corpo = f"""  <article class="post legal">
    <div class="wrap post-wrap">
      <h1>{esc(meta.get('title', slug))}</h1>
      <p class="post-meta">Última atualização: {esc(meta.get('updated', ''))}</p>
      <div class="prose">
{markdown(corpo)}
      </div>
    </div>
  </article>"""
        paginas.append((slug, pagina(meta.get("title", slug), meta.get("description", ""), html_corpo,
                                     f"/{slug}/", body_class="inner")))
    return paginas


def escreve(caminho, conteudo):
    destino = ROOT / caminho.strip("/") / "index.html" if caminho != "/" else ROOT / "index.html"
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(conteudo, encoding="utf-8")
    print("ok", destino.relative_to(ROOT))


def main():
    posts = carrega_posts()
    escreve("/", monta_home(posts))
    escreve("/blog/", monta_blog(posts))
    escreve("/agenda/", monta_agenda(carrega_agenda()))
    escreve("/cupons/", monta_cupons(carrega_cupons()))
    escreve("/jogos/", monta_jogos())
    escreve("/pausa/", monta_pausa_antiga())
    escreve("/selos/", monta_selos())
    escreve("/jogos/respira/", monta_respira())
    (ROOT / "404.html").write_text(monta_404(), encoding="utf-8")
    print("ok 404.html")
    urls = ["/", "/agenda/", "/cupons/", "/jogos/", "/selos/", "/jogos/respira/", "/blog/"]
    for p in posts:
        escreve(f"/blog/{p['slug']}/", monta_post(p))
        urls.append(f"/blog/{p['slug']}/")
    for slug, conteudo in monta_paginas_legais():
        escreve(f"/{slug}/", conteudo)
        urls.append(f"/{slug}/")
    sitemap = ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
               + "".join(f"  <url><loc>{SITE_URL}{u}</loc></url>\n" for u in urls) + "</urlset>\n")
    (ROOT / "sitemap.xml").write_text(sitemap, encoding="utf-8")
    (ROOT / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {SITE_URL}/sitemap.xml\n", encoding="utf-8")
    print(f"{len(posts)} texto(s) no blog.")


if __name__ == "__main__":
    main()
