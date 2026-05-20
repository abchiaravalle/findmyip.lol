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
- **[ipwho.is](https://ipwho.is/)** for IP geolocation (primary), with **[ipapi.co](https://ipapi.co/)** as a fallback. Both are free and require no API key.
- **[uselessfacts.jsph.pl](https://uselessfacts.jsph.pl/)** for the random fact, with hardcoded fallbacks if the API is down.

No npm install. No `node_modules`. No `package.json`. The deployed site is exactly what's in this repo.

## Local development

```bash
git clone https://github.com/abchiaravalle/findmyip.lol.git
cd findmyip.lol
open index.html
```

That's it. Open `index.html` in any modern browser. Everything works from `file://`.

If you want a local server (some browsers handle clipboard APIs differently on `file://`):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## Deploying

### Cloudflare Pages

1. Push this repo to GitHub.
2. In the Cloudflare dashboard → **Pages** → **Connect to Git** → pick the repo.
3. **Build command:** *(leave blank)*
4. **Build output directory:** `/`
5. Deploy.

Cloudflare serves everything gzipped + brotli automatically. The page weight will land well under the 150KB target over the wire.

### Netlify

1. Push to GitHub.
2. Netlify → **Add new site** → **Import from Git** → pick the repo.
3. **Build command:** *(leave blank)*
4. **Publish directory:** `/`
5. Deploy.

### Any static host

Drop the entire repo into any web root. There is no server-side anything to configure.

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

The page makes these outbound requests on load:

1. `https://ipwho.is/` — your IP + geolocation (fallback: `https://ipapi.co/json/`)
2. `https://api64.ipify.org` or `https://api.ipify.org` — best-effort lookup of the *other* IP family if you're dual-stack
3. `https://uselessfacts.jsph.pl/api/v2/facts/random` — the random fact
4. `https://tile.openstreetmap.org/...` — map tiles, **only** if you scroll the map into view

None of these are owned by us. We never see your IP or location. None of them require an API key — you could swap them out yourself by editing `index.html`.

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
