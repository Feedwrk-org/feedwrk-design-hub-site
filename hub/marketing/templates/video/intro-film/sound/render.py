import base64, wave, os, sys
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page()
    errs=[]; pg.on("console", lambda m: errs.append(m.text) if m.type=="error" else None)
    pg.goto("file://" + os.path.abspath("dist/index.html"))
    r = pg.evaluate("window.renderFilmSfx(53)")
    b.close()
print("errors:", errs[:5])
with wave.open("sfx-stem.wav","wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(44100); w.writeframes(base64.b64decode(r["b64"]))
print("frames", r["frames"], "peak", round(r["peak"],3))
