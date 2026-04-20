#!/usr/bin/env bash
set -euo pipefail

# Build the poster: (1) generate QR code for the Vercel URL, (2) inject into HTML,
# (3) print to PDF via headless Chrome, (4) render a PNG preview for the webpage.
#
# Usage: ./build.sh [TARGET_URL]
# TARGET_URL defaults to https://lmc3403-webpage.vercel.app

cd "$(dirname "$0")"

TARGET_URL="${1:-https://lmc3403-webpage.vercel.app}"
REPO_ROOT="$(cd .. && pwd)"

echo "==> Generating QR for: $TARGET_URL"
python3 - <<PY
import qrcode, qrcode.image.svg
q = qrcode.QRCode(box_size=10, border=0, error_correction=qrcode.constants.ERROR_CORRECT_M)
q.add_data("$TARGET_URL")
q.make(fit=True)
img = q.make_image(image_factory=qrcode.image.svg.SvgPathImage)
img.save("_qr.svg")
PY

# Strip XML declaration + outer svg wrapper and tweak style to inherit cream bg
QR_INNER=$(python3 - <<'PY'
import re
with open("_qr.svg") as f:
    svg = f.read()
# Remove <?xml ... ?>
svg = re.sub(r'<\?xml[^>]*\?>\s*', '', svg)
# Ensure svg has viewBox for scaling; make fill ink color
svg = svg.replace('<svg', '<svg preserveAspectRatio="xMidYMid meet" style="fill:#181818"')
print(svg, end='')
PY
)

# Inject QR into HTML
python3 - <<PY
qr = """$QR_INNER"""
with open("poster.html") as f:
    html = f.read()
html = html.replace("{{QR_SVG}}", qr)
with open("_poster-built.html", "w") as f:
    f.write(html)
PY

echo "==> Printing HTML to PDF"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless --disable-gpu \
  --no-pdf-header-footer \
  --run-all-compositor-stages-before-draw \
  --virtual-time-budget=3000 \
  --print-to-pdf=_poster.pdf \
  --print-to-pdf-no-header \
  "file://$(pwd)/_poster-built.html" 2>/dev/null || true

if [ ! -s _poster.pdf ]; then
  echo "PDF print failed, bailing."
  exit 1
fi

echo "==> Copying PDF to repo root"
cp _poster.pdf "$REPO_ROOT/poster.pdf"

echo "==> Rendering PNG preview for webpage"
gs -dNOPAUSE -dBATCH -sDEVICE=png16m -r200 -sOutputFile="$REPO_ROOT/poster.png" "$REPO_ROOT/poster.pdf" >/dev/null
gs -dNOPAUSE -dBATCH -sDEVICE=png16m -r96  -sOutputFile="$REPO_ROOT/poster-preview.png" "$REPO_ROOT/poster.pdf" >/dev/null

echo "==> Cleaning temp files"
rm -f _qr.svg _poster-built.html _poster.pdf

echo "==> Done. Poster PDF: $REPO_ROOT/poster.pdf"
ls -la "$REPO_ROOT/poster.pdf" "$REPO_ROOT/poster.png" "$REPO_ROOT/poster-preview.png"
