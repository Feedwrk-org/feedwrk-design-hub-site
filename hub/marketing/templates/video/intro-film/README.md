# Intro film

The first finished Feedwrk film, kept as a template: a 53 s intro to Feedwrk on why product data matters, with voice, music and sound effects. Copy it to start the next film.

| Version | Page | Final video | What differs |
|---|---|---|---|
| v1 | `../intro-film.html` | `media/intro-film-v1.mp4` | The kit as written: River code motion on the title, Feedwrk step and end card |
| v2 | `../intro-film-v2.html` | `media/intro-film-v2.mp4` | No code motion; big centred text on the title, Feedwrk step and end card; a faint tint-blue to tint-sand gradient ground |

Both: 1920 x 1080, 30 fps, light theme, about 53 s.

## Exceptions the owner asked for

These break the system's rules on purpose. Do not copy them into a new film unless the owner asks again.

- Both: 53 s and six steps (the film guide says 20–40 s and 3–5 scenes); no footer; no mono label above captions; captions at 64px (kit: 40px); no button on the end card.
- v2 only: a gradient ground (the system has no gradients) and centred text (the system anchors text top left).

## Story

| Time | Step | Scene | Voice |
|---|---|---|---|
| 0:00 | Title | "Commerce runs on product data" | Online, every sale starts with product data. |
| 0:05 | The market | Line, $5.1T (2022) to $7.9T (2028 forecast) | Online retail keeps growing, towards eight trillion dollars a year by 2028. |
| 0:12 | New ways to find | One number, +693% | AI is a new way to find products. Its traffic to US stores grew almost eightfold. |
| 0:19 | Missing data | Bars, 70% and 65% (key) | When product information is missing, 65% of shoppers walk away. |
| 0:26 | Language | One number, 76% | And three in four shoppers prefer to buy in their own language. |
| 0:33 | Returns | Results, 43% · 19.3% · $850B | Wrong data comes back too. 43% of shoppers have returned an item because of it. |
| 0:40 | Feedwrk | Caption over motion (v1) or centred text (v2) | Feedwrk turns every supplier feed into one complete catalogue, ready for every channel and language. |
| 0:47 | End | "One catalogue, every channel" | Feedwrk. One catalogue, every channel. |

The Feedwrk claim ("every supplier feed… every channel and language") must still be checked against production code before the film is used outside the team (**Walkthroughs** › Sources).

## Sources for the numbers

- EMARKETER forecast, Feb 2025: worldwide retail e-commerce $5.08T (2022) to $7.89T (2028).
- Adobe Analytics: AI traffic to US retail sites +693% year on year, Nov–Dec 2025.
- Akeneo, 2025 Consumer Returns Report: 70% buy a different product, 65% abandon, 43% returned an item after wrong information.
- CSA Research, Can't Read, Won't Buy (2020): 76% of 8,709 shoppers in 29 countries prefer their own language.
- NRF and Happy Returns, 2025 Retail Returns Landscape: 19.3% online return rate, $849.9B returned.

## Files

| File | What |
|---|---|
| `media/intro-film-v1.mp4`, `media/intro-film-v2.mp4` | Finals: voice, music and effects mixed |
| `media/voiceover-take.wav` | The voice, one take (Gemini 3.8 Flash TTS, voice Achird, en-GB; the model returned 24 kHz) |
| `media/intro-film.tts.txt`, `media/intro-film.vo.json`, `media/intro-film.srt` | Voice text, line timings, subtitles (from `record.py`) |
| Music | The Feedwrk music, `assets/Music/feedwrk-music-v1.mp3` (the film uses its first 53 s) |
| `media/sfx-stem.mp3` | The sound effects alone, for listening. `sound/` renders the exact WAV |
| `sound/` | The effects as code (audiorective), timed to the story. See **Sound** |
| `mix.sh` | The final mix: voice + music + effects, at the levels in **Sound** |

Before using the music or AI voice in paid ads, check the commercial-use terms of Figma Weave and of the model that made each (MiniMax, Google).

## Remake it

1. Copy `intro-film.html` (or v2), change the STORY: steps, captions, numbers, `vo` and `say` lines. Keep every number sourced in `note`.
2. `record.py intro-film.html out --name intro-film` writes the silent MP4 and the voice files (needs the Google Fonts reachable, or local Inter and IBM Plex Mono).
3. Render `out/intro-film.tts.txt` in one take (**Voiceover**), then `vo_mix.py out/intro-film.mp4 take.wav out/intro-film.vo.json out`.
4. Effects: change the cue sheet in `sound/film-sfx.ts` to the new step times, then in `sound/`: `npm install`, `npm run build`, `npm run render` (writes `sfx-stem.wav`; needs Playwright with Chromium).
5. `mix.sh out/intro-film-vo.mp4 ../../../assets/Music/feedwrk-music-v1.mp3 sound/sfx-stem.wav final.mp4 53` (paths from `templates/video/intro-film/`).
