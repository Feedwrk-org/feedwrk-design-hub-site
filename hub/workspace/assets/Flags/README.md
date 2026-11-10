# Flags

Round flags for languages, shown with the LanguageFlag component (`fw-flag`). Copied as they are from the prototype's `src/shared/ui/assets/flags/` (modern-ux-shine, 12 Oct 2026): 32 × 32 SVGs, the flag clipped to a circle inside the file, own colours, no `currentColor`.

## Which file for which language

| Language | File | Flag |
|---|---|---|
| English | `en.svg` | United Kingdom (Union flag) |
| German | `de.svg` | Germany |
| French | `fr.svg` | France |
| Dutch | `nl.svg` | Netherlands |
| Swedish | `sv.svg` | Sweden |
| Spanish | `es.svg` | Spain |
| Latvian | `lv.svg` | Latvia |

Files are named by the language code, so a screen finds a flag from the language it already has. A language with no file here shows the monogram (see LanguageFlag).

## Rules for adding a flag

1. **Copy, never redraw.** Take the flag from the prototype or a licensed open set and record where it came from in the table above. Official colours only.
2. **Round in the file.** 32 × 32 viewBox, the flag clipped to a full circle (`clipPath` circle r 16), filling it edge to edge. No padding, no outline in the file: the ring comes from `fw-flag`.
3. **No see-through parts.** Every part of the circle is filled.
4. **One file per language.** A language spoken in several countries gets one flag, chosen once here.
5. Check a new flag next to the others in the LanguageFlag preview at 24px, in Light and Dark.

Open: Finnish, Danish, Norwegian, Estonian, Lithuanian, Polish and the rest of the Translate language list have no file yet and show the monogram. Add them by rule 1.
