#!/usr/bin/env python3
"""Optimise le logo ANSUT : fond blanc rendu transparent, variantes redimensionnees.

Le logo source est un JPEG de 1920x879 px pesant 395 kB, affiche a 40x40 px
dans la sidebar et 36x36 px dans le header. Ce script produit :
  - logo-ansut.png       : logo complet, fond transparent, largeur 480 px
  - logo-ansut-mark.png  : la seule signature en arc de cercle (icone carree 128 px)
"""

from pathlib import Path

from PIL import Image

SRC = Path("src/assets/logo-ansut.jpg")
OUT_FULL = Path("src/assets/logo-ansut.png")
OUT_MARK = Path("src/assets/logo-ansut-mark.png")

# Seuil au-dela duquel un pixel est considere comme du fond blanc.
WHITE_THRESHOLD = 243


def to_transparent(image: Image.Image) -> Image.Image:
    """Rend transparent le fond blanc de l'image."""
    rgba = image.convert("RGBA")
    pixels = rgba.load()
    width, height = rgba.size
    for y in range(height):
        for x in range(width):
            r, g, b, _ = pixels[x, y]
            if r >= WHITE_THRESHOLD and g >= WHITE_THRESHOLD and b >= WHITE_THRESHOLD:
                pixels[x, y] = (r, g, b, 0)
    return rgba


def main() -> None:
    source = Image.open(SRC)
    transparent = to_transparent(source)

    # Recadrage sur le contenu reel pour supprimer les marges blanches.
    bbox = transparent.getbbox()
    if bbox:
        transparent = transparent.crop(bbox)

    full = transparent.copy()
    full.thumbnail((480, 480), Image.LANCZOS)
    full.save(OUT_FULL, "PNG", optimize=True)

    # La signature graphique occupe environ le tiers gauche superieur du logo.
    width, height = transparent.size
    mark = transparent.crop((0, 0, int(width * 0.39), int(height * 0.53)))
    mark_bbox = mark.getbbox()
    if mark_bbox:
        mark = mark.crop(mark_bbox)

    # Mise au carre sur fond transparent pour un rendu propre en icone.
    side = max(mark.size)
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(mark, ((side - mark.width) // 2, (side - mark.height) // 2), mark)
    square.thumbnail((128, 128), Image.LANCZOS)
    square.save(OUT_MARK, "PNG", optimize=True)

    for path in (OUT_FULL, OUT_MARK):
        size_kb = path.stat().st_size / 1024
        with Image.open(path) as img:
            print(f"{path.name}: {img.size[0]}x{img.size[1]} px, {size_kb:.1f} kB")


if __name__ == "__main__":
    main()
