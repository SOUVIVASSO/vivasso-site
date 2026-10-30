#!/usr/bin/env python3
"""Prepara as edicoes da revista Viva Vivasso para o site.

Le as pastas de edicao (#001, #002...) com as paginas em PNG ou JPG, reduz as imagens
e grava em assets/revista/<numero>/ no formato que o site usa:
  capa.webp, p01.webp, p02.webp... e info.json

Uso:
  python ferramentas/prepara_revista.py CAMINHO_DA_PASTA_COM_AS_EDICOES
O caminho pode ser uma pasta com subpastas #001...#014 ou um arquivo .zip dela.
Requer a biblioteca Pillow (pip install pillow).
"""
import json
import re
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path

from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
SAIDA = RAIZ / "assets" / "revista"
LARGURA_PAGINA = 1100
LARGURA_CAPA = 600
QUALIDADE = 80
EXT = {".png", ".jpg", ".jpeg", ".webp"}


def chave_natural(p):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", p.stem)]


def acha_edicoes(base):
    """Devolve {numero: [imagens ordenadas]} procurando pastas com nome #NNN."""
    edicoes = {}
    for pasta in base.rglob("*"):
        if not pasta.is_dir():
            continue
        m = re.fullmatch(r"#?\s*0*(\d{1,3})", pasta.name.strip())
        if not m:
            continue
        imgs = sorted([f for f in pasta.iterdir() if f.is_file() and f.suffix.lower() in EXT], key=chave_natural)
        if imgs:
            edicoes[int(m.group(1))] = imgs
    return dict(sorted(edicoes.items()))


def reduz(origem, destino, largura):
    with Image.open(origem) as im:
        im = im.convert("RGB")
        if im.width > largura:
            altura = round(im.height * largura / im.width)
            im = im.resize((largura, altura), Image.LANCZOS)
        im.save(destino, "WEBP", quality=QUALIDADE, method=6)
        return im.width, im.height


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    entrada = Path(sys.argv[1])
    temp = None
    if entrada.suffix.lower() == ".zip":
        temp = tempfile.mkdtemp(prefix="revista_")
        with zipfile.ZipFile(entrada) as z:
            z.extractall(temp)
        entrada = Path(temp)
    edicoes = acha_edicoes(entrada)
    if not edicoes:
        print("Nao encontrei pastas de edicao (#001, #002...) com imagens em", entrada)
        sys.exit(1)
    total = 0
    for numero, imgs in edicoes.items():
        pasta = SAIDA / f"{numero:03d}"
        if pasta.exists():
            shutil.rmtree(pasta)
        pasta.mkdir(parents=True)
        largura = altura = 0
        for i, img in enumerate(imgs, start=1):
            largura, altura = reduz(img, pasta / f"p{i:02d}.webp", LARGURA_PAGINA)
        cw, ch = reduz(imgs[0], pasta / "capa.webp", LARGURA_CAPA)
        (pasta / "info.json").write_text(json.dumps({
            "paginas": len(imgs), "largura": largura, "altura": altura,
            "capa_largura": cw, "capa_altura": ch}, ensure_ascii=False), encoding="utf-8")
        tam = sum(f.stat().st_size for f in pasta.iterdir())
        total += tam
        print(f"edicao {numero:03d}: {len(imgs)} paginas, {tam / 1024:.0f} KB")
    print(f"pronto: {len(edicoes)} edicoes, {total / 1024 / 1024:.1f} MB no total")
    if temp:
        shutil.rmtree(temp, ignore_errors=True)


if __name__ == "__main__":
    main()
