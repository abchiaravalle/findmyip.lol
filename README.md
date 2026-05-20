<p align="center">
  <picture>
    <source media="(prefers-color-scheme: light)" srcset="assets/amplifi-on-dark.svg">
    <source media="(prefers-color-scheme: dark)" srcset="assets/amplifi-on-dark.svg">
    <img src="assets/amplifi-on-dark.svg" alt="amplifi.studio" width="280">
  </picture>
</p>

<h1 align="center">findmyip.lol</h1>

<p align="center">
  A privacy-respecting "What is my IP address?" tool by <a href="https://amplifi.studio">amplifi.studio</a>.<br>
  Zero trackers. Zero analytics. Zero cookies. Zero ads. One static HTML file.
</p>

<p align="center">
  <a href="https://findmyip.lol">findmyip.lol</a> ·
  <a href="#privacy">Privacy</a> ·
  <a href="#deploying">Deploy</a> ·
  <a href="LICENSE">MIT</a>
</p>

---

## Table of Contents

- [What it does](#what-it-does)
- [Why](#why)
- [Stack](#stack)
- [Local development](#local-development)
- [Deploying](#deploying)
  - [Cloudflare Pages](#cloudflare-pages)
  - [Netlify](#netlify)
  - [Any static host](#any-static-host)
- [Privacy](#privacy)
- [Verifying the no-tracking claim](#verifying-the-no-tracking-claim)
- [Project structure](#project-structure)
- [License](#license)

## What it does

Open the page and you get:

- Your public IP address (IPv4 and IPv6 if both are available), big and copyable.
- Approximate location, ISP, ASN, and timezone from a free, no-auth API.
- A small map pinned to that approximate location.
- A friendly VPN/proxy heuristic that compares your browser timezone to your IP timezone.
- A useless fact, because why not.
- A clear "what we **don't** know about you" list — the differentiator.

That's the whole product.

## Why

Most "what is my IP" pages are advertising landfills with creepy data-collection on top. This isn't that. It's a credibility play for [amplifi.studio](https://amplifi.studio) and a useful tool we wanted to exist.

## Stack

- **HTML + CSS + vanilla JavaScript.** No framework, no bundler, no build step.
- **[Leaflet 1.9.4](https://leafletjs.com/)** for the map, vendored locally in `/vendor` so nothing loads from a CDN.
- **[OpenStreetMap](https://www.openstreetmap.org/)** tiles, attributed per their tile-usage policy.
- **A single Cloudflare Pages Function** at `functions/api/ip.js` that returns your IP + geo from Cloudflare's edge (`request.cf`). No third-party IP-intelligence provider is involved — the lookup never leaves Cloudflare.
- **[uselessfacts.jsph.pl](https://uselessfacts.jsph.pl/)** for the random fact, with hardcoded fallbacks if the API is down.

No npm install. No `node_modules`. No `package.json`. The deployed site is exactly what's in this repo.

## Local development

```bash
git clone https://github.com/abchiaravalle/findmyip.lol.git
cd findmyip.lol
npx wrangler@latest pages dev .
```

This runs the Pages Function locally so `/api/ip` works. Visit `http://localhost:8788`. (Wrangler's IP lookup uses your machine's actual outbound IP, just like prod.)

If you just want to preview the static HTML/CSS without the IP lookup working:

```bash
python3 -m http.server 8000
# then open http://localhost:8000 — /api/ip will 404, page will show an error
```

## Deploying

### Cloudflare Pages (recommended)

1. Push this repo to GitHub.
2. CF dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → pick the repo.
3. Framework preset: **None**
4. **Build command:** *(leave blank)*
5. **Build output directory:** `/`
6. Deploy.

The `/functions/` directory is auto-detected and `functions/api/ip.js` becomes the live `/api/ip` endpoint with no config. CF serves everything gzipped + brotli automatically — gzipped page weight is under 70KB.

### Other hosts (Netlify, GitHub Pages, etc.)

The static parts of the site will deploy fine anywhere, but `/api/ip` requires Cloudflare Pages Functions. If you want to host elsewhere, you'll need to either:

- Reintroduce a third-party IP-lookup API in `index.html` (`ipinfo.io/json` and `api.ipapi.is` are no-key, CORS-enabled options), accepting the privacy trade-off; or
- Port `functions/api/ip.js` to your host's equivalent (Netlify Edge Functions, Vercel Edge, Deno Deploy, etc.).

## Privacy

This project's product is a no-tracking guarantee. Here is exactly what happens when you open the page:

| Action | Happens? |
|---|---|
| HTTP request logged on our server | **No.** There is no server. The site is static. |
| Cookies set | **No.** |
| `localStorage` written | Only your theme preference (light/dark). Never sent anywhere. |
| Analytics (Google, Plausible, Fathom, Cloudflare Web Analytics) | **No, none.** |
| Browser fingerprinting | **No.** |
| Third-party JS | **No.** Leaflet is vendored locally. |
| Third-party fonts | **No.** System font stack only. |
| Email captures, popups, newsletters | **No.** |
| Social-share buttons | **No.** (They're tracking vectors.) |
| Third-party IP-intel provider sees your IP | **No.** The lookup happens at Cloudflare's edge via a Pages Function — nothing leaves CF. |

The page makes these network requests on load:

1. `/api/ip` — **same-origin.** A Cloudflare Pages Function returns your IP, ASN, ISP, city, region, country, timezone, and approximate coordinates, all derived from `request.cf` at the CF edge. No third party involved.
2. `https://uselessfacts.jsph.pl/api/v2/facts/random` — the random fact.
3. `https://tile.openstreetmap.org/...` — map tiles, **only** if you scroll the map into view.

The IP lookup never touches a commercial IP-intelligence vendor. The only domains your browser contacts as a *result* of using this site are `findmyip.lol` itself, `uselessfacts.jsph.pl`, and (if you scroll to the map) `tile.openstreetmap.org`.

## Verifying the no-tracking claim

Don't trust this README. Verify it:

1. Open DevTools → **Network** tab → reload the page.
2. Confirm the request list matches what's in [Privacy](#privacy).
3. Open **Application** → **Cookies** → confirm there are zero entries.
4. Open `view-source:https://findmyip.lol/` → read it. It's intentionally unminified.

## Project structure

```
/
├── index.html          # The whole app. Comments throughout.
├── functions/
│   └── api/
│       └── ip.js       # Cloudflare Pages Function — returns visitor IP + geo
├── vendor/
│   ├── leaflet.js      # Leaflet 1.9.4, vendored
│   └── leaflet.css
├── assets/
│   ├── amplifi-on-dark.svg   # Logo (with dark background)
│   └── amplifi-mark.svg      # Logo (transparent)
├── robots.txt          # Allow all crawlers
├── humans.txt          # Credits + a restated privacy posture
├── README.md
├── LICENSE             # MIT
└── .gitignore
```

## License

[MIT](LICENSE) — built by [amplifi.studio](https://amplifi.studio).
