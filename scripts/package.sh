#!/bin/bash
# Builds the store packages: Chromium zip (Chrome, Edge, Opera) and Thunderbird xpi.
set -e
cd "$(dirname "$0")/.."
python3 - <<'PY'
import json, os, zipfile
os.makedirs("dist", exist_ok=True)
def build(out, manifest_path, skip=()):
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        z.write(manifest_path, "manifest.json")
        for root in ("_locales", "icons", "src"):
            for dirpath, _, files in sorted(os.walk(root)):
                for f in sorted(files):
                    if f not in skip:
                        z.write(os.path.join(dirpath, f))
    print(out)
v = json.load(open("manifest.json"))["version"]
build(f"dist/lexio-browser-extension-{v}.zip", "manifest.json", skip={"sender.html", "sender.js"})
tv = json.load(open("thunderbird/manifest.json"))["version"]
build(f"dist/lexio-thunderbird-{tv}.xpi", "thunderbird/manifest.json")
PY
