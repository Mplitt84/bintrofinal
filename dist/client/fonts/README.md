# Wordmark font

The "Shag Noir" wordmark in the header is set in **Midcent Disco**, a licensed
third-party font that can't be redistributed in this repo.

To activate it, add the licensed webfont here:

```
public/fonts/midcent-disco.woff2   <- preferred
public/fonts/midcent-disco.woff    <- optional
public/fonts/midcent-disco.otf     <- optional
```

The `@font-face` rule and the `--font-script` theme token in `src/styles.css`
already point at these filenames. Until a file is present the wordmark falls
back to Pacifico, so the header keeps rendering either way.
