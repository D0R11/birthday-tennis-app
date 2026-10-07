# Email art

The pixel art in the RSVP emails, as PNGs (2x) embedded in each email. Gmail can't show SVG or custom fonts,
so these are rendered from the HTML sources in `src/`, which copy the "RSVP emails" frames on the design canvas.

To re-render one after changing its source (e.g. `headline-joined`, 520×76):

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --hide-scrollbars --force-device-scale-factor=2 --window-size=520,76 --virtual-time-budget=5000 --screenshot="$PWD/headline-joined.png" "file://$PWD/src/headline-joined.html"
```

Sizes: header 600×150, headline-joined 520×76, headline-changed 520×52, headline-declined 488×40, duo 520×136, floor 600×96.

## Per-guest text

Everything else in the emails (names, card values, paragraphs, the footer) is drawn in the pixel fonts when each
email is sent, by `server/pixel-text.js`, from the glyph masks in `glyphs.json`. To add a font size, edit `FONTS` in
`src/glyphs.html` and recapture:

```bash
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --virtual-time-budget=8000 --dump-dom "file://$PWD/src/glyphs.html" | python3 -c "import sys,re,html;print(html.unescape(re.search(r'<pre id=\"out\">(.*?)</pre>',sys.stdin.read(),re.S).group(1)))" > glyphs.json
```
