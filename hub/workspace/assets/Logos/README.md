# Logos

- `feedwrk-mark.svg` — the app mark: "fw" in white on a `#0B1220` rounded tile (rx 7 on 32). Sidebar brand row and favicon. Copied from the prototype's `design-kit/assets/logo.svg`; it sets "fw" in the system font, not as outlines.
- `feedwrk-wordmark.svg` — the wordmark, ink `#18181b` (= `foreground`, Light). Next to the mark in the sidebar at 14px tall.
- `feedwrk-wordmark-on-dark.svg` — the same paths in `#f5f5f6` (= `foreground`, Dark).
- `feedwrk-wordmark-email.png` — the wordmark for email, 720 × 190, ink on transparent. A copy of `feedwrk-ink.png` in `Feedwrk-org/brand-assets`; emails load it from there (`https://raw.githubusercontent.com/Feedwrk-org/brand-assets/main/feedwrk-ink.png`) at 84px wide, because mail clients do not show SVG. Its ink is the brand navy `#1a2533`, not `foreground`.

In code the wordmark is `FeedwrkLogo` (`src/components/feedwrk-logo.tsx`), drawn in `currentColor`, so it follows the theme on its own. Never recolour the mark to the user's accent; never stretch either.

Open: the phone navigation drawer shows a plain "F" on a `primary` tile instead of this mark. One of the two should go.
