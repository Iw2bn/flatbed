#!/usr/bin/env python3
"""Build the standalone site from app.html.

app.html is the single source. It is written the way a claude.ai artifact expects (page content only,
no <html>/<head>), so this script wraps it in a full document with the home-screen app tags, registers
the offline service worker, stamps the service worker's cache version, and draws the app icons.

    python3 build.py
"""
import hashlib, pathlib, re, struct, zlib

ROOT = pathlib.Path(__file__).parent

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="description" content="Scan documents with your phone: Flatbed finds the page, straightens it, cleans it up and saves a PDF.">
<meta name="theme-color" content="#F1F2F6" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0F1015" media="(prefers-color-scheme: dark)">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Flatbed">
<!-- solid bar: with a see-through one, iOS 26 blurs the app's content under the clock (and lays the page out too short) -->
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/icon-180.png">
<link rel="icon" type="image/png" href="icons/icon-192.png">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}</style>
<script>
// Safety net for an app installed while the status bar was see-through (it keeps that until re-added to the Home
// Screen): iOS can then lay the page out shorter than the screen by about the status bar's height, leaving an empty
// band under the buttons. Measure that and stretch the layout (--vp-gap). With the solid bar it measures 0.
(() => {
  // installed on an iPhone with a notch or Dynamic Island: content near the top gets blurred by iOS (see .ios-app)
  if (navigator.standalone && Math.max(screen.width, screen.height) >= 812) document.documentElement.classList.add("ios-app");
  if (!(navigator.standalone || matchMedia("(display-mode: standalone)").matches)) return;
  const fit = () => {
    const root = document.documentElement, top = parseFloat(getComputedStyle(root).paddingTop) || 0;
    const full = innerWidth < innerHeight ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
    const gap = full - innerHeight;
    root.style.setProperty("--vp-gap", top > 0 && gap > 0 && gap <= top + 10 ? gap + "px" : "0px");
  };
  fit(); addEventListener("resize", fit); addEventListener("pageshow", fit);
  addEventListener("orientationchange", () => setTimeout(fit, 300));
})();
</script>
</head>
<body>
"""

TAIL = """
<script>
if ("serviceWorker" in navigator) addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
</script>
</body>
</html>
"""


def png(size, path):
    """Draw the app icon (a sheet with a scan line) as a PNG, no image libraries needed."""
    bg, paper, ink, line = (59, 71, 214), (255, 255, 255), (200, 204, 222), (255, 178, 30)
    px = [[bg] * size for _ in range(size)]

    def rect(x0, y0, x1, y1, c):
        for y in range(int(y0 * size), int(y1 * size)):
            for x in range(int(x0 * size), int(x1 * size)):
                px[y][x] = c

    rect(.24, .17, .76, .83, paper)
    for i in range(6):
        y = .27 + i * .075
        rect(.32, y, .68 - (.12 if i % 3 == 2 else 0), y + .028, ink)
    rect(.14, .49, .86, .53, line)
    raw = b"".join(b"\x00" + bytes(v for p in row for v in p) for row in px)
    chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    data = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 2, 0, 0, 0)) \
        + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    path.write_bytes(data)


def main():
    app = (ROOT / "app.html").read_text()
    # the full document already declares these
    app = re.sub(r'<meta (charset="utf-8"|name="viewport"[^>]*)>\n', "", app)
    page = HEAD + app + TAIL
    (ROOT / "index.html").write_text(page)

    (ROOT / "icons").mkdir(exist_ok=True)
    for s in (180, 192, 512):
        png(s, ROOT / "icons" / f"icon-{s}.png")

    version = hashlib.sha1(page.encode()).hexdigest()[:10]
    sw = (ROOT / "sw.js").read_text()
    sw = re.sub(r'const VERSION = "[^"]*";', f'const VERSION = "flatbed-{version}";', sw)
    (ROOT / "sw.js").write_text(sw)
    print(f"built index.html ({len(page) // 1024} KB), icons, sw.js version {version}")


if __name__ == "__main__":
    main()
