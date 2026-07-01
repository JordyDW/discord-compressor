# App icon sources

Vector sources for the app icon (a white "play" triangle framed by inward
compression arrows, on Discord blurple). Edit these, then re-render the PNGs in
`../` and re-run `npx expo prebuild -p android` to regenerate the Android mipmaps.

| SVG | Renders to | Purpose |
| --- | --- | --- |
| `full.svg` | `../icon.png` (1024), `../favicon.png` (48) | main app icon (full-bleed) |
| `fg.svg` | `../android-icon-foreground.png` (1024) | adaptive foreground (motif scaled into the ~66% safe zone, transparent) |
| `bg.svg` | `../android-icon-background.png` (1024) | adaptive background (blurple gradient) |
| `mono.svg` | `../android-icon-monochrome.png` (1024) | Material You themed-icon silhouette |
| `rounded.svg` | `../splash-icon.png` (1024) | rounded logo for the splash screen |

Re-render (needs `rsvg-convert`):

```bash
cd assets/icon-src
rsvg-convert -w 1024 -h 1024 full.svg    -o ../icon.png
rsvg-convert -w 1024 -h 1024 fg.svg      -o ../android-icon-foreground.png
rsvg-convert -w 1024 -h 1024 bg.svg      -o ../android-icon-background.png
rsvg-convert -w 1024 -h 1024 mono.svg    -o ../android-icon-monochrome.png
rsvg-convert -w 1024 -h 1024 rounded.svg -o ../splash-icon.png
rsvg-convert -w 48   -h 48   full.svg    -o ../favicon.png
```

Brand colors: blurple `#5865f2` → `#4049c0` (gradient), motif white `#ffffff`.

## Display images (docs only)

`icon-rounded.png` (rounded header icon) and `variants.png` (icon · adaptive ·
monochrome strip) are used by the top-level [`README.md`](../../README.md) for
presentation only — they are not app assets. Re-generate them after an icon change:

```bash
rsvg-convert -w 256 -h 256 rounded.svg -o icon-rounded.png
# variants.png is composited from ../icon.png, ../android-icon-foreground.png and
# ../android-icon-monochrome.png (see the generating script in the project history).
```
