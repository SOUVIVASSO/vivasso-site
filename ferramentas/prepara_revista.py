#!/usr/bin/env python3
"""Prepara as edicoes da revista Viva Vivasso para o site.

Le as pastas de edicao (#001, #002...) e grava em assets/revista/<numero>/ o que o site usa:
  capa.webp, p01.webp, p02.webp... e info.json

Em cada pasta, usa o PDF da edicao quando existir (e mais leve e traz as paginas na ordem certa).
Se nao houver PDF, usa as imagens (PNG, JPG ou WEBP) em ordem numerica.

Uso:
  python ferramentas/prepara_revista.py CAMINHO [numero ...]
O CAMINHO pode ser uma pasta com as subpastas #001...#013 ou um .zip dela. Se voce passar numeros
no final (por exemplo 3 5), so essas edicoes sao refeitas.
Requer Pillow e PyMuPDF (pip install pillow pymupdf).
"""
import json
import re
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path

import fitz  # PyMuPDF
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "assets" / "revista"
LARGURA_PAGINA = 1100
LARGURA_CAPA = 600
QUALIDADE = 80
EXT = {".png", ".jpg", ".jpeg", ".webp"}
Image.MAX_IMAGE_PIXELS = None


def chave_natural(p):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", p.stem)]


def acha_edicoes(base):
    """Devolve {numero: {"pdf": caminho ou None, "imgs": [imagens ordenadas]}}."""
    edicoes = {}
    for pasta in base.rglob("*"):
        if not pasta.is_dir():
            continue
        m = re.fullmatch(r"#?\s*0*(\d{1,3})", pasta.name.strip())
        if not m:
            continue
        arquivos = [f for f in pasta.iterdir() if f.is_file()]
        pdfs = sorted(f for f in arquivos if f.suffix.lower() == ".pdf")
        imgs = sorted((f for f in arquivos if f.suffix.lower() in EXT), key=chave_natural)
        if pdfs or imgs:
            edicoes[int(m.group(1))] = {"pdf": pdfs[0] if pdfs else None, "imgs": imgs}
    return dict(sorted(edicoes.items()))


def salva(im, destino, largura):
    im = im.convert("RGB")
    if im.width > largura:
        im = im.resize((largura, round(im.height * largura / im.width)), Image.LANCZOS)
    im.save(destino, "WEBP", quality=QUALIDADE, method=6)
    return im.width, im.height


def paginas_do_pdf(pdf):
    doc = fitz.open(pdf)
    for pagina in doc:
        zoom = LARGURA_PAGINA * 1.5 / pagina.rect.width
        pix = pagina.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
        yield Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    doc.close()


def paginas_das_imagens(imgs):
    for f in imgs:
        with Image.open(f) as im:
            yield im.convert("RGB")


def prepara(numero, dados):
    pasta = SAIDA / f"{numero:03d}"
    if pasta.exists():
        shutil.rmtree(pasta)
    pasta.mkdir(parents=True)
    origem = "pdf" if dados["pdf"] else "imagens"
    fonte = paginas_do_pdf(dados["pdf"]) if dados["pdf"] else paginas_das_imagens(dados["imgs"])
    n = 0
    largura = altura = cw = ch = 0
    for i, im in enumerate(fonte, start=1):
        largura, altura = salva(im, pasta / f"p{i:02d}.webp", LARGURA_PAGINA)
        if i == 1:
            cw, ch = salva(im, pasta / "capa.webp", LARGURA_CAPA)
        n = i
    (pasta / "info.json").write_text(json.dumps({
        "paginas": n, "largura": largura, "altura": altura,
        "capa_largura": cw, "capa_altura": ch}, ensure_ascii=False), encoding="utf-8")
    tam = sum(f.stat().st_size for f in pasta.iterdir())
    print(f"edicao {numero:03d}: {n} paginas a partir de {origem}, {tam / 1024:.0f} KB")
    return tam


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    entrada = Path(sys.argv[1])
    so = {int(x) for x in sys.argv[2:]}
    temp = None
    if entrada.suffix.lower() == ".zip":
        temp = tempfile.mkdtemp(prefix="revista_")
        with zipfile.ZipFile(entrada) as z:
            z.extractall(temp)
        entrada = Path(temp)
    edicoes = acha_edicoes(entrada)
    if so:
        edicoes = {k: v for k, v in edicoes.items() if k in so}
    if not edicoes:
        print("Nao encontrei pastas de edicao (#001, #002...) em", entrada)
        sys.exit(1)
    total = sum(prepara(numero, dados) for numero, dados in edicoes.items())
    print(f"pronto: {len(edicoes)} edicoes, {total / 1024 / 1024:.1f} MB no total")
    if temp:
        shutil.rmtree(temp, ignore_errors=True)


if __name__ == "__main__":
    main()
