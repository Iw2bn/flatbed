# Flatbed

A document scanner that runs in the browser. Take a photo of a page and Flatbed finds its edges,
straightens it, cleans it up and saves a multi-page PDF. Everything happens on your phone: photos
are never uploaded anywhere.

## Use it on an iPhone

1. Open the site in Safari.
2. Tap the Share button, then **Add to Home Screen**.
3. Open Flatbed from the new icon. It runs full screen and works offline after the first visit.

Scans are kept on the phone, in the browser's storage for this site. Export a PDF to keep a copy anywhere else.

## Features

- Uses the iPhone's own camera (autofocus, flash), or imports several photos at once
- Automatic page edge detection with draggable corners and a magnifier for fine-tuning
- Straightens the page and snaps to A4 or Letter when it is clearly one of them
- Looks: Original, Auto (removes shadows and colour casts), Grey, B&W
- Multi-page documents: reorder by press-and-hold, rotate, recrop, retake, delete with undo
- Export to PDF (match scan, A4 or Letter; three quality levels) or JPG images, through the share sheet

## How it is built

- `app.html` is the whole app: one file of HTML, CSS and JavaScript.
- `build.py` wraps it into `index.html` with the home-screen tags, stamps the offline cache version
  in `sw.js` and draws the icons. Run `python3 build.py` after changing `app.html`.
- Libraries, loaded from CDNs and cached for offline use: OpenCV.js (edge detection and image
  processing), jsPDF, SortableJS, JSZip.
- `tools/scan-tests.js` generates test photos (several desks, shadows, clutter, a thumb over the page)
  and measures how close the detected corners are to the real ones. To run it, serve this folder
  (`python3 -m http.server`), open `index.html`, and run this in the browser console:

  ```js
  await new Promise(r => { const s = document.createElement("script"); s.src = "tools/scan-tests.js"; s.onload = r; document.head.append(s); });
  await waitCv();
  runDetectTests({ current: detectQuad }).summary;
  ```
