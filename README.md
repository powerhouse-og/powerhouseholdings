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

## Deploy (Render + Cloudflare)

Same routine as Cardonomics, minus the database:

1. **Render → New → Blueprint** → connect this repo → Apply. It reads `render.yaml`
   and creates a free static site with auto-deploy from `main`.
2. When the first deploy succeeds, **Settings → Custom Domains** → add
   `powerhouseholdings.us` and `www.powerhouseholdings.us`. Copy the `.onrender.com` target.
3. **Cloudflare → DNS** → point `@` and `www` at that target (CNAME, grey cloud first).
4. Wait for Render to show both verified with certificates, set Cloudflare SSL to
   **Full (strict)**, then flip both records to orange cloud.
5. Cloudflare → Speed → **Rocket Loader off** (it breaks deferred scripts).

Every later `git push` to `main` goes live on its own.

## Design system

The corporate brand (Edition 2.0 — obsidian, bone, matured ultraviolet, brass; Instrument Serif / Inter Tight / JetBrains Mono) is tokenised in `assets/css/site.css`. Do not introduce colours or typefaces outside that file. The full brand guidelines document lives with the company's private assets, not in this repository.
