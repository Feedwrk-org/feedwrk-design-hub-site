#!/usr/bin/env python3
"""Fit a one-take voiceover to the video, line by line.
usage: vo_mix.py VIDEO.mp4 TAKE.wav VO.json OUTDIR [--noise -40] [--gap 0.25]
1. finds the pauses in the take (silencedetect), 2. cuts it into as many clips as VO.json has lines
(60 ms padding, 30 ms fades), 3. places each clip at its line's start (adelay) and mixes (amix normalize=0),
4. trims to the video length and normalises loudness (-16 LUFS, -1.5 dBTP), 5. muxes: video copied, AAC 192k.
writes OUTDIR/<video>-vo.mp4 and OUTDIR/<video>-vo.mp3. If the take has more or fewer pauses than lines,
it stops and prints what it found: re-render the take with clearer pauses, or raise/lower --gap."""
import sys, os, re, json, argparse, subprocess
ap = argparse.ArgumentParser(); ap.add_argument("video"); ap.add_argument("take"); ap.add_argument("vo"); ap.add_argument("out")
ap.add_argument("--noise", default="-40"); ap.add_argument("--gap", type=float, default=0.25)
a = ap.parse_args(); os.makedirs(a.out, exist_ok=True)
V = json.load(open(a.vo)); lines = V["lines"]; dur = V["duration"]
log = subprocess.run(["ffmpeg", "-i", a.take, "-af", f"silencedetect=noise={a.noise}dB:d={a.gap}", "-f", "null", "-"], capture_output=True, text=True).stderr
starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]; ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
hh, mm, ss = re.search(r"Duration: (\d+):(\d+):([\d.]+)", log).groups(); total = int(hh) * 3600 + int(mm) * 60 + float(ss)
# speech segments = gaps between silences
segs, cur = [], 0.0
for s, e in zip(starts, ends + [total] * (len(starts) - len(ends))):
    if s - cur > 0.15: segs.append((cur, s))
    cur = e
if total - cur > 0.15: segs.append((cur, total))
# merge the shortest pauses until the count matches the lines
while len(segs) > len(lines):
    gaps = [segs[i + 1][0] - segs[i][1] for i in range(len(segs) - 1)]; i = gaps.index(min(gaps))
    segs[i:i + 2] = [(segs[i][0], segs[i + 1][1])]
if len(segs) != len(lines):
    print(f"found {len(segs)} speech parts for {len(lines)} lines:", [(round(x, 2), round(y, 2)) for x, y in segs]); sys.exit(1)
parts, labels = [], []
for i, ((s, e), l) in enumerate(zip(segs, lines)):
    s, e = max(0, s - 0.06), min(total, e + 0.06); d = e - s; ms = int(l["start"] * 1000)
    parts.append(f"[1:a]atrim={s:.3f}:{e:.3f},asetpts=PTS-STARTPTS,afade=t=in:d=0.03,afade=t=out:st={d-0.03:.3f}:d=0.03,adelay={ms}|{ms}[v{i}]")
    labels.append(f"[v{i}]")
    if l["start"] + d > l["end"] + 0.3: print(f"warning: line {i+1} runs {l['start'] + d - l['end']:.1f}s past its step: shorten it or lengthen the step")
fc = ";".join(parts) + ";" + "".join(labels) + f"amix=inputs={len(labels)}:normalize=0,apad,atrim=0:{dur:.3f},loudnorm=I=-16:TP=-1.5:LRA=11,aresample=44100[a]"
base = os.path.splitext(os.path.basename(a.video))[0]
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", a.video, "-i", a.take, "-filter_complex", fc, "-map", "0:v", "-map", "[a]",
                "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", f"{a.out}/{base}-vo.mp4"], check=True)
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", f"{a.out}/{base}-vo.mp4", "-vn", "-c:a", "libmp3lame", "-b:a", "192k", f"{a.out}/{base}-vo.mp3"], check=True)
print("done", f"{a.out}/{base}-vo.mp4", f"{a.out}/{base}-vo.mp3")
