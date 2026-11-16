#!/bin/bash
# Builds the store zip: manifest, locales, icons and src only.
set -e
cd "$(dirname "$0")/.."
python3 - <<'PY'
import json, os, zipfile
version = json.load(open("manifest.json"))["version"]
os.makedirs("dist", exist_ok=True)
out = f"dist/lexio-browser-extension-{version}.zip"
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    z.write("manifest.json")
    for root in ("_locales", "icons", "src"):
        for dirpath, _, files in sorted(os.walk(root)):
            for f in sorted(files):
                z.write(os.path.join(dirpath, f))
print(out)
PY
