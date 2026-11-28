#!/usr/bin/env python3
"""Inline the kit into one self-contained page.
usage: build.py story.html out.html [--bundle ../../components/bundle.js] [--logos DIR]
story.html links video.css / video.js / bundle.js and uses __WM__ (wordmark) and __WMD__ (wordmark on dark)."""
import sys, os, re, base64, argparse
ap = argparse.ArgumentParser(); ap.add_argument("story"); ap.add_argument("out")
here = os.path.dirname(os.path.abspath(__file__))
ap.add_argument("--bundle", default=os.path.join(here, "..", "..", "components", "bundle.js"))
ap.add_argument("--logos", default=os.path.join(here, "logos"))
a = ap.parse_args()
s = open(a.story).read()
def data(p, mime): return f"data:{mime};base64," + base64.b64encode(open(p, "rb").read()).decode()
s = s.replace('<link rel="stylesheet" href="video.css">', "<style>" + open(os.path.join(here, "video.css")).read() + "</style>")
s = s.replace('<script src="bundle.js"></script>', "<script>" + open(a.bundle).read() + "</script>")
s = s.replace('<script src="video.js"></script>', "<script>" + open(os.path.join(here, "video.js")).read() + "</script>")
s = s.replace("__WM__", data(os.path.join(a.logos, "feedwrk-wordmark.svg"), "image/svg+xml"))
s = s.replace("__WMD__", data(os.path.join(a.logos, "feedwrk-wordmark-on-dark.svg"), "image/svg+xml"))
open(a.out, "w").write(s); print("built", a.out, len(s), "bytes")
