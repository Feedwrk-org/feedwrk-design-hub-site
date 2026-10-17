# Channels

Where products are sent. The brands' own marks, optically normalised to read the same size and weight in a 256 × 256 canvas (from `design/brand-logos/icons/channels/`). Colours are their own; no `currentColor`.

Use them only for "publishes to" and integration screens (channel lists, connect wizard, channel detail header, push history). Never recolour, restyle or stretch. Trademarks belong to their owners.

## Which file for which channel

| Channel | File | Note |
|---|---|---|
| Your store (Shopify) | `shopify-icon.svg` | The Shopify bag. Wherever the store appears as a channel; never the generic `store` icon. 24 × 24 canvas. |
| Google sales channels | `google-g-icon.svg` | The Google G (owner 8 Oct 2026). Not the Merchant Center or Shopping marks. |
| Meta | `meta-icon-256.svg` | |
| TikTok Shop | `tiktok-shop-icon-256.svg` | The app mark: white note on a black disc (owner reference, 8 Oct 2026). |
| Pinterest | `pinterest-icon-256.svg` | White P on the red disc; the disc fills the canvas. |
| Bing | `bing-shopping-icon-256.svg` | |

`google-merchant-center-icon-256.svg` and `google-shopping-icon-256.svg` stay in the group for screens that name those Google products, not for a sales channel.

## Rules for adding or changing a mark

1. **Copy the brand's own file, never redraw or approximate it.** Take it from the brand's press kit or an existing project asset and record where it came from here.
2. **No see-through parts.** A letter or shape that is the background showing through (Pinterest P, Shopify S) is filled white inside the file, so the mark reads the same on light and dark surfaces. A mark that is black on transparent uses the brand's own dark-ground version (TikTok: black disc, white note). Check every new mark on `surface` in both themes before adding it.
3. **Same diameter.** Every mark fills its canvas edge to edge: a disc mark (Pinterest, TikTok) has the same diameter as the Google G (owner 8 Oct 2026). No padding inside the file. Put a new mark next to the others in the ChannelMark preview and match it by eye at 24px and 32px; fix the file's padding, never the CSS size per brand.
4. **One file per channel.** When a mark changes, replace the file (new blob) and update every preview that uses it; do not keep two versions in use.

To show a mark plain or in an outline circle, wrap it in the ChannelMark component (`fw-chmark`, `fw-chmark circle`); never edit the file to add a circle.
