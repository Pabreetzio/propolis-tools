# Propolis Comparison Images

Put reference C++ PNGs in `cpp/` and web-rendered PNGs in `web/`.
Generated hmap data is written to `hmap/cpp`, `hmap/web`, and `hmap/comparison`.

Use matching basenames so the manifest script can pair them automatically:

```text
cpp/hello-size5.png
web/hello-size5.png
```

Then run:

```bash
pnpm --filter @propolis-tools/compare-site manifest
pnpm --filter @propolis-tools/compare-site dev
```

The comparison app reads `manifest.json` from this folder.
