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
  Zero trackers. Zero analytics. Zero cookies. Zero ads. One HTML file + one ~30-line edge function — that's the whole app.
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
- **Two Cloudflare Pages Functions**:
  - `functions/api/ip.js` — returns the visitor's IP + geo from `request.cf`. No third-party IP-intelligence vendor; lookup never leaves Cloudflare.
  - `functions/api/send.js` — opt-in: relays an email summary via SMTP2GO. The API key lives only in `env.SMTP2GO_API_KEY` (CF env var), never in the browser. Body is generated server-side from `request.cf` so the endpoint can't be abused to send arbitrary content. Per-IP 60s rate limit via the edge cache API.
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

The `/functions/` directory is auto-detected — `functions/api/ip.js` becomes `/api/ip` and `functions/api/send.js` becomes `/api/send` with no further config. CF serves everything gzipped + brotli automatically — gzipped page weight is under 70KB.

**To enable the email feature**, add an environment variable on the deployed project:

1. CF dashboard → your Pages project → **Settings** → **Environment variables**.
2. Add `SMTP2GO_API_KEY` (Production scope) with your SMTP2GO API key. Mark it as a **Secret** so it's encrypted at rest and never echoed back.
3. Trigger a redeploy so the new env var is bound to the running Functions.

If `SMTP2GO_API_KEY` is not set, `/api/send` returns `503 not_configured` and the modal shows a friendly error — the rest of the site keeps working.

For local dev, create a gitignored `.dev.vars` file at the project root:

```
SMTP2GO_API_KEY=api-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

`wrangler pages dev .` picks it up automatically.

### Other hosts (Netlify, GitHub Pages, etc.)

The static parts of the site will deploy fine anywhere, but `/api/ip` requires Cloudflare Pages Functions. If you want to host elsewhere, you'll need to either:

- Reintroduce a third-party IP-lookup API in `index.html` (`ipinfo.io/json` and `api.ipapi.is` are no-key, CORS-enabled options), accepting the privacy trade-off; or
- Port `functions/api/ip.js` to your host's equivalent (Netlify Edge Functions, Vercel Edge, Deno Deploy, etc.).

## Privacy

The differentiator here is honesty, not magic. Cloudflare hosts the site, so Cloudflare's standard edge logs exist — same as for any hosted site on the internet. The promise is that we add **nothing** on top of that, and that no commercial IP-intelligence vendor ever sees your address.

Here is exactly what happens when you open the page:

| Action | Happens? |
|---|---|
| Application logs / database writes from our code | **No.** The Pages Function reads `request.cf` and returns it — no DB, no log line, no queue, no telemetry. |
| Cloudflare's standard edge access logs exist | **Yes** — the same logs any hosted site has. We add nothing on top. |
| Cookies set | **No.** Not by this site, not by Cloudflare for this site. |
| `localStorage` written | Only your theme preference (light/dark). Never leaves your device. |
| Analytics (Google, Plausible, Fathom, Cloudflare Web Analytics) | **No, none.** |
| Browser fingerprinting | **No.** |
| Third-party JS | **No.** Leaflet is vendored locally. |
| Third-party fonts | **No.** System font stack only. |
| Email captures, popups, newsletters | **No.** |
| Social-share buttons | **No.** (They're tracking vectors.) |
| Commercial IP-intel vendor (ipinfo, MaxMind, ipapi, ipwho, ipify) sees your IP | **No.** The lookup runs in the `/api/ip` Pages Function using Cloudflare's own `request.cf` — no vendor is in the loop. |
| Email feature uses third-party (SMTP2GO) | **Only if you click "Email this to someone."** The `/api/send` Function relays one email through SMTP2GO; the modal discloses this before send. The body is generated server-side from `request.cf` so the endpoint can't be misused to send arbitrary content. |

The page makes these network requests on load:

1. `/api/ip` — **same-origin.** A Cloudflare Pages Function returns your IP, ASN, ISP, city, region, country, timezone, and approximate coordinates, all derived from `request.cf` at the CF edge. No third party involved.
2. `https://ipv4.icanhazip.com` and `https://ipv6.icanhazip.com` — two single-stack IP echoes (Cloudflare-run) that return **only** your address (no geo, no logging product). Each hostname resolves to exactly one address family, so we can display your IPv4 **and** IPv6 with correct labels. A family is skipped if your network can't reach it. These are third parties and do see your IP.
3. `https://uselessfacts.jsph.pl/api/v2/facts/random` — the random fact.
4. `https://tile.openstreetmap.org/...` — map tiles, **only** if you scroll the map into view.

No *commercial IP-intelligence* vendor (ipinfo, MaxMind, ipapi, ipwho, ipify) is ever in the loop — geo always comes from Cloudflare's own `request.cf`. The icanhazip echoes are plain address reflectors, used solely to learn your second address family.

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
│       ├── ip.js       # Cloudflare Pages Function — returns visitor IP + geo
│       └── send.js     # Cloudflare Pages Function — relays an email via SMTP2GO (opt-in)
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
