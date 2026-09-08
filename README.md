# Powerhouse Holdings — corporate site

The public web presence of Powerhouse Holdings, LLC (powerhouseholdings.us).

Static site — no framework, no build step, no dependencies.

```
index.html      Overview
about.html      About the house
projects.html   Portfolio: ChronoCal, Scorely, Cardonomics
contact.html    Contact
assets/css/     site.css (design tokens & system) · pages.css (components & motion states)
assets/js/      motion.js (smooth scroll, reveals, scroll-linked effects — dependency-free)
assets/brand/   favicon, marks, legacy logo
```

## Local preview

Open `index.html` directly, or serve the folder:

```
python -m http.server 8931
```

## Deploy

Any static host. For GitHub Pages: Settings → Pages → deploy from `main`, root.
`CNAME` is set to `powerhouseholdings.us`; point the domain's DNS at Pages and it binds automatically.

## Design system

The corporate brand (Edition 2.0 — obsidian, bone, matured ultraviolet, brass; Instrument Serif / Inter Tight / JetBrains Mono) is tokenised in `assets/css/site.css`. Do not introduce colours or typefaces outside that file. The full brand guidelines document lives with the company's private assets, not in this repository.
