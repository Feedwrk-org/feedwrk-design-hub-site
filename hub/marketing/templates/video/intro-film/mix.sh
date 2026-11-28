#!/usr/bin/env bash
# Mix the intro film's final sound: voice (already on the recorded video), music bed, sound effects.
# usage: mix.sh VIDEO-WITH-VOICE.mp4 MUSIC.mp3 SFX.wav OUT.mp4 [LENGTH_SECONDS]
# Levels (see 19-sound.md): music -5 dB, ducked under the voice (sidechain, 3:1), fade in 1.5 s and out 2.5 s;
# effects at 0.8; a limiter at -1 dBTP. Video is copied, audio AAC 192 kbps.
set -euo pipefail
V="$1"; MUSIC="$2"; SFX="$3"; OUT="$4"; T="${5:-53}"
FADE_OUT=$(python3 -c "print($T-2.5)")
ffmpeg -y -loglevel error -i "$V" -i "$MUSIC" -i "$SFX" -filter_complex \
"[1:a]atrim=0:$T,asetpts=PTS-STARTPTS,aresample=44100,volume=-5dB,afade=t=in:st=0:d=1.5,afade=t=out:st=$FADE_OUT:d=2.5[m];\
[0:a]asplit[v][key];[m][key]sidechaincompress=threshold=0.03:ratio=3:attack=80:release=600[md];\
[2:a]volume=0.8[s];[v][md][s]amix=inputs=3:normalize=0,alimiter=limit=0.89[a]" \
-map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -t "$T" "$OUT"
echo "mixed $OUT"
