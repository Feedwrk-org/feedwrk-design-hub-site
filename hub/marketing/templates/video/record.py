#!/usr/bin/env python3
"""Record a story page frame by frame and write the video plus everything the voiceover needs.
usage: record.py page.html OUTDIR [--fps 30] [--name walkthrough] [--keys 2,6.5,14]
writes: OUTDIR/<name>.mp4 (silent, H.264, 30 fps), <name>.vo.json (lines with start/end),
        <name>.tts.txt (text for the voice tool: one paragraph per line, TTS spelling),
        <name>.srt (subtitles, display spelling), <name>-keys.png (contact sheet when --keys is given)
Needs Playwright with Chromium, and ffmpeg."""
import os, sys, json, argparse, subprocess, shutil, tempfile
from playwright.sync_api import sync_playwright
ap = argparse.ArgumentParser(); ap.add_argument("page"); ap.add_argument("out")
ap.add_argument("--fps", type=int, default=30); ap.add_argument("--name", default=None)
ap.add_argument("--keys", default=None, help="only render these times to a contact sheet, no video")
a = ap.parse_args()
name = a.name or os.path.splitext(os.path.basename(a.page))[0]
os.makedirs(a.out, exist_ok=True)
def ts(x): h, r = divmod(x, 3600); m, s = divmod(r, 60); return f"{int(h):02d}:{int(m):02d}:{s:06.3f}".replace(".", ",")
launch = {"proxy": {"server": os.environ["HTTPS_PROXY"]}} if os.environ.get("HTTPS_PROXY") else {}
with sync_playwright() as p:
    b = p.chromium.launch(**launch)
    pg = b.new_page(viewport={"width": 1920, "height": 1080})
    pg.goto("file://" + os.path.abspath(a.page) + "#rec"); pg.wait_for_timeout(1500)
    pg.evaluate("document.fonts.ready.then(()=>window.__rebuild())"); pg.wait_for_timeout(300)
    size = pg.evaluate("[document.querySelector('#stage').offsetWidth, document.querySelector('#stage').offsetHeight]")
    pg.set_viewport_size({"width": size[0], "height": size[1]}); pg.wait_for_timeout(200)
    st = pg.query_selector("#stage"); T = pg.evaluate("window.__T"); vo = pg.evaluate("window.__vo()")
    if a.keys:
        from PIL import Image
        tmp = tempfile.mkdtemp(); ims = []
        for t in [float(x) for x in a.keys.split(",")]:
            pg.evaluate(f"window.__render({t})"); f = f"{tmp}/{t:07.2f}.png"; st.screenshot(path=f); ims.append(Image.open(f).resize((640, int(640 * size[1] / size[0]))))
        w, h = ims[0].size; sheet = Image.new("RGB", (w * 3, h * ((len(ims) + 2) // 3)), "white")
        for i, im in enumerate(ims): sheet.paste(im, ((i % 3) * w, (i // 3) * h))
        sheet.save(f"{a.out}/{name}-keys.png"); print("keys", f"{a.out}/{name}-keys.png"); b.close(); sys.exit()
    fr = tempfile.mkdtemp()
    for i in range(int(round(T * a.fps))):
        pg.evaluate(f"window.__render({i / a.fps})"); st.screenshot(path=f"{fr}/{i:05d}.jpg", type="jpeg", quality=92)
    b.close()
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-framerate", str(a.fps), "-i", f"{fr}/%05d.jpg", "-c:v", "libx264", "-preset", "slow",
                "-crf", "20", "-pix_fmt", "yuv420p", "-movflags", "+faststart", f"{a.out}/{name}.mp4"], check=True)
shutil.rmtree(fr)
json.dump({"duration": T, "lines": vo}, open(f"{a.out}/{name}.vo.json", "w"), indent=2)
open(f"{a.out}/{name}.tts.txt", "w").write("\n\n".join(l["say"] for l in vo) + "\n")
open(f"{a.out}/{name}.srt", "w").write("\n".join(f"{i+1}\n{ts(l['start'])} --> {ts(l['end'] - 0.1)}\n{l['text']}\n" for i, l in enumerate(vo)))
print("video", f"{a.out}/{name}.mp4", f"{T:.1f}s,", len(vo), "voice lines")
