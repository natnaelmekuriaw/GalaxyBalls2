# Galaxy Balls artwork

The identity uses three connected rounded blocks, a four-point star, and a gold
orbit. It reflects the game's pieces and space setting. The main palette is navy
`#020518`, blue `#1E88E5`, green `#2E9E28`, red `#D32F2F`, gold `#F5A623`,
and warm ivory `#FFF4DC`.

| File | Dimensions | Use |
| --- | --- | --- |
| `galaxy-balls-mark.png` | 1254 × 1254 | Transparent master emblem for future artwork |
| `galaxy-balls-icon.png` | 1254 × 1254 | Opaque app icon, Games card, web navigation, favicon source |
| `galaxy-balls-adaptive.png` | 1254 × 1254 | Transparent Android foreground, themed icon mask, and splash emblem |
| `galaxy-balls-title.png` | 2172 × 724 | Transparent home title with the game name |

The artwork was created with the built-in image generation tool. Final source
images are kept here; the app does not fetch artwork from a remote service.

## Platform use

The standard icon has a full opaque navy background with no baked outer corner
mask. Native builds generate the required launcher sizes. The web export creates
16, 32, and 48 pixel favicon entries from the same source.

The adaptive emblem fits within Android's central safe circle. Android tints its
alpha silhouette for themed icons; the color foreground and monochrome layer use
the same image. The splash plugin and native fade overlay use this same emblem,
a navy background, and a 280 point image container.

Changing native launcher or splash artwork requires a new native build. Check the
installed release build on a device, including circular and themed launcher icons
and a cold start. Expo Go does not reproduce the full release splash experience.

## Artwork prompts

**Master emblem:** An original production emblem for Galaxy Balls, a mobile
falling-block puzzle. Three connected pillowy rounded square tiles form an L,
with blue, green, and red faces, dark navy outlines, restrained highlights, a
warm-gold four-point star in the open corner, and a gold orbital swoosh. Friendly
tactile retro arcade style, strong silhouette at phone icon sizes, transparent
square canvas, generous margins. No lettering, badge, background, or watermark.

**Standard icon:** Preserve the master emblem's three tiles, colors, orbit, star,
and proportions. Enlarge and center it on a full-bleed opaque navy square. Strong
small-size readability. No outer badge, baked rounded canvas corners, text,
additional stars, or frame.

**Adaptive foreground:** Preserve the complete colored emblem and reduce its
size on a transparent square canvas. Keep it centered with generous transparent
margins on all four sides. The entire visible silhouette must fit inside
Android's central safe circle. Do not add or remove artwork or add text.

**Home title:** Transparent landscape lockup at 3:1. The colored orbital emblem
on the left; the exact words "Galaxy" above "Balls" to its right. Substantial
rounded retro arcade lettering in warm ivory with navy outlines and a restrained
gold edge. Balanced tight composition, readable at 276 pixels wide. No panel,
background, tagline, extra text, or watermark.

## Verification

- All configured image paths exist; the standard icon is fully opaque and the
  emblem and title retain genuine alpha transparency.
- Adaptive foreground pixels fit within the central 66/108 safe circle.
- The title loads without horizontal overflow at 320 and 390 pixel widths in
  all three languages; the Games card and navigation display the matching icon.
- Production web export includes the artwork and favicon; Android JavaScript
  export includes the native splash component and artwork.
- Lint, TypeScript, and the game's automated tests pass.
