# Snip Design Language

## Tokens

- **Background:** `#0B0B0E`; use near-black across the full page.
- **Surfaces:** `#131317` base, `#19191F` raised; keep contrast quiet.
- **Text:** `#F5F2F0` primary, `#A09CA3` muted, `#737078` quiet.
- **Accent:** `linear-gradient(110deg, #FF7B69, #F05A91 55%, #FF9A61)` for emphasis and primary actions.
- **Fonts:** `'Inter', 'Avenir Next', Avenir, 'Segoe UI', sans-serif`; monospace only for compact metadata.
- **Type scale:** 11-13px metadata, 14-16px controls/body, 18px supporting text, 24px section titles, 42px mobile / 56px desktop hero.
- **Spacing:** 4, 8, 12, 16, 24, 32, 48, 64px; center content in a 920px column with generous vertical gaps.
- **Radii:** 16px controls/notices, 24px cards, 32px large surfaces, 999px pill inputs and actions.
- **Borders:** 1px white at 7-13% opacity; use a slightly brighter border for focus.
- **Shadows and glow:** cards use `0 24px 70px rgba(0,0,0,.3)`; hero uses a soft coral/pink radial glow; focused input gets a restrained pink halo.

## Snip Mapping

- **Page header / hero:** quiet wordmark and API status above a centered, bold headline and muted subline; warm glow sits behind this area.
- **URL form:** centerpiece chat-style pill with a transparent input and attached gradient action; keep the accessible label and hint.
- **Result and errors:** concise raised notices with subtle borders; success uses the accent for its link, errors use warm red text.
- **Links table:** a generously rounded, bordered surface with subdued column labels, clear row separators, and muted original URLs.
