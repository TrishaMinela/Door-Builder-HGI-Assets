# Door Builder webfonts

Unmodified WOFF2 Latin and Latin-ext subsets served locally with `font-display: swap`.

- Caladea: https://github.com/google/fonts/tree/main/ofl/caladea
- PT Sans: https://github.com/google/fonts/tree/main/ofl/ptsans
- Original webfont declarations: Google Fonts CSS API (Caladea v10, PT Sans v18).
- Both families include real 400/700 normal and italic faces. Their OFL licenses are included beside the fonts.

The app uses `--font-body` (PT Sans) and `--font-hero` (Caladea). The hero uses regular Caladea with real bold italic emphasis. PT Sans's real regular/bold faces are used by browser weight matching for existing intermediate UI weights; synthetic font faces are disabled by the existing app reset. Existing responsive font sizes are unchanged.

The PDF renderer continues to embed its separate Montserrat font from `/assets/branding/Montserrat-Variable.ttf`; these webfonts do not replace it.
