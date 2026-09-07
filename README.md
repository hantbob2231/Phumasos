# FigureOS WebOS 3.0

FigureOS WebOS wraps the existing Figure/Cine game experience in a cinematic single-page operating-system shell. The original `Figureos.html` is preserved as `/figure/index.html` and augmented with a small same-origin bridge rather than being rewritten from scratch.

The project is dependency-free at runtime: Node.js 20+ is enough.

## What is included

- Home dashboard with clock/date, Jump Back In, Quick Play, recent browser activity, app favorites, system status, local music, weather-provider abstraction, wallpaper and notifications.
- Browser with multiple tabs, new/close/duplicate, back/forward/reload/stop/home, destination URL bar, HTTPS indicator, bookmarks, history, recent sites, tab titles/favicons, shortcuts, fullscreen and a mobile tab switcher.
- Operator-controlled same-origin HTTP/HTTPS proxy at `/proxy/<encoded-url>`.
- WebSocket tunnel at `/socket/<encoded-url>` for approved `ws://` / `wss://` services.
- Figure app at `/figure/`, loaded by same-origin iframe and bridged with `postMessage()` events.
- OS-level Library, Apps registry, global search, CIRI command panel, task manager, Settings and lock screen.
- Original Figure themes and particle setting keys shared across the shell and Figure iframe.
- Installable PWA with offline shell and update notification support.
- Desktop/tablet/mobile responsive layouts.

## Run locally

```bash
cp .env.example .env
# Edit .env. At minimum, add only origins you own or are authorized to proxy.
npm start
```

Open `http://localhost:3000`.

No `npm install` is required because there are no third-party runtime dependencies.

Development with restart-on-change:

```bash
npm run dev
```

Tests:

```bash
npm test
```

## Configuration

```dotenv
PORT=3000
NODE_ENV=development
PUBLIC_ORIGIN=http://localhost:3000
PROXY_ALLOWED_ORIGINS=https://authorized-example.com,https://another-service-you-control.example
PROXY_REQUEST_TIMEOUT_MS=15000
PROXY_MAX_RESPONSE_BYTES=52428800
PROXY_MAX_UPLOAD_BYTES=10485760
PROXY_RATE_LIMIT_PER_MINUTE=120
BROWSER_SEARCH_TEMPLATE=
ASSISTANT_PROVIDER_URL=
ASSISTANT_PROVIDER_TOKEN=
BUNNY_ORIGIN_SECRET=
```

`PROXY_ALLOWED_ORIGINS` is exact-origin based. `https://app.example.com` does not automatically authorize `https://api.example.com` or `http://app.example.com`.

For a search provider, use an operator-approved endpoint containing `{query}`:

```dotenv
BROWSER_SEARCH_TEMPLATE=https://search.example.com/?q={query}
```

The destination must still be present in `PROXY_ALLOWED_ORIGINS`.

## Architecture

```text
Browser / installed PWA
        |
        v
https://figure.example.com     Bunny CDN / Pull Zone
        |
        v
https://origin.figure.example.com
        |
        +-- /, /src, /figure, /icons     static WebOS + Figure app
        +-- /api/*                        FigureOS application API
        +-- /proxy/*                      allowlisted HTTP/HTTPS gateway
        +-- /socket/*                     allowlisted WebSocket tunnel
        |
        v
Authorized destination services only
```

The CDN accelerates/routs requests. The Node origin performs the dynamic proxy work. A static CDN by itself cannot provide this proxy.

## Figure preservation

`figure/index.html` is the uploaded Figure source with only two integration additions:

1. `/src/figure/embedded.css` adjusts the existing Figure dock when it is running inside the WebOS iframe.
2. `/src/figure/bridge.js` wraps existing functions to emit or receive:
   - `figure:ready`
   - `figure:library`
   - `figure:game-start`
   - `figure:game-close`
   - `figure:game-focus`
   - `figure:theme-change`
   - `figure:particles-change`

The existing game catalog, play-time localStorage database (`cine_store_v10`), Continue Playing behavior, game modal, game iframe layer, themes, particles, controller handling and launch/fullscreen behavior remain in the Figure document.

The uploaded HTML referenced `Tutorial.mp4` and `backgroundmusic.mp3` but those files were not part of the upload. This project includes tiny local placeholders to prevent 404s. Replace them with the original media assets when available.

Legacy Figure game URLs are intentionally not auto-added to the proxy allowlist. Keep them as the original Figure behavior unless you own/have permission to reverse-proxy those services.

## Browser
### Proxy + direct fallback

The FigureOS browser automatically uses `/proxy/` for destinations listed in `PROXY_ALLOWED_ORIGINS`. Other HTTP/HTTPS destinations are attempted directly inside the browser iframe. Sites that disallow embedding may still refuse to render; FigureOS does not remove or bypass those security controls.

 / proxy behavior

Frontend browser navigation calls the single helper in `src/browser/proxy.js`:

```js
proxify('https://authorized.example/path')
// -> /proxy/<base64url destination>
```

The address bar keeps the destination URL, not the internal route.

The gateway rewrites normal HTML/CSS/module-JS references including:

- `src`
- `href`
- `srcset`
- `poster`
- form `action`
- inline/style-block CSS `url()`
- CSS `@import`
- static/dynamic module import strings
- Worker/SharedWorker script strings
- HTTP redirects

An injected same-origin client shim (when allowed by the upstream CSP) routes dynamic `fetch`, XHR, EventSource, WebSocket and new-window requests back through FigureOS.

### Compatibility boundary

This is an authorized reverse-proxy browser, not a complete browser engine or an anonymizing service. Some applications depend on exact origin/location semantics, service workers, WebRTC, DRM, cross-origin isolation, signed URLs, complex runtime-generated module paths, or other browser security state. Those services may require upstream changes by their owner.

FigureOS does not strip or bypass upstream authentication, paywalls, anti-bot systems, DRM, CSP or framing controls. If upstream HTML explicitly refuses framing with `X-Frame-Options` or `CSP frame-ancestors`, the gateway returns a FigureOS compatibility screen.

## Proxy security model

The production gateway does all of the following before contacting a destination:

- HTTP/HTTPS only for `/proxy`, WS/WSS only for `/socket`.
- Exact `PROXY_ALLOWED_ORIGINS` check.
- Rejects credentials embedded in destination URLs.
- Rejects localhost and `.localhost`.
- Rejects loopback, private, link-local, carrier-grade NAT, multicast, documentation/reserved and other unsafe IP ranges.
- Resolves DNS first and rejects the destination if any returned address is unsafe.
- Pins the outbound TCP/TLS connection to the validated DNS result to reduce DNS-rebinding/TOCTOU risk.
- Request timeout, upload cap, response cap and per-IP HTTP proxy rate limit.
- Removes hop-by-hop request/response headers.
- Does not log Authorization headers, passwords or proxy request bodies.
- Keeps upstream cookies in a server-side, per-FigureOS-session cookie jar instead of exposing upstream cookies to browser JavaScript.
- Uses HttpOnly, SameSite cookies for proxy-session and CSRF state; Secure is added when `PUBLIC_ORIGIN` is HTTPS.
- CSRF-protects state-changing FigureOS APIs.
- Sanitizes backend proxy errors.
- Keeps assistant/API provider tokens server-side.
- Sends `Cache-Control: no-store, private` and `Surrogate-Control: no-store` on proxied content.

The in-memory upstream cookie jar is intentionally simple. For a multi-instance production deployment, replace it with a shared encrypted session store (for example Redis) while retaining the same destination isolation rules.

## CIRI provider

CIRI handles local OS commands without any remote AI service:

- `open Figure`
- `open browser`
- `switch to settings`
- `search games for racing`
- `change theme to neon`
- `change wallpaper`
- `lock screen`

Unknown prompts use `src/providers/assistantProvider.js`, which calls `/api/assistant`. The provider URL/token are read only by the origin from environment variables.

The example server adapter expects a provider to accept:

```json
{ "message": "..." }
```

and return one of `message`, `output`, or `response`. Adapt the server route for your provider instead of putting provider secrets in frontend JavaScript.

## PWA

- Manifest: `/manifest.webmanifest`
- Service worker: `/sw.js`
- Icons: `/icons/icon-192.png`, `/icons/icon-512.png`
- Standalone display mode.
- Network-first navigation with offline shell fallback.
- Same-origin static assets cached selectively.
- `/proxy/*`, `/api/*`, `/socket/*` and non-GET requests are never cached by the service worker.

Remote games and proxied pages are not made available offline.

## Bunny.net production setup

### 1. Deploy the Node origin

Deploy this directory to a Node 20+ host at a hostname such as:

```text
origin.figure.example.com
```

That origin hostname should resolve directly to the backend, not back through the same Pull Zone, otherwise you create an origin loop.

Production environment example:

```dotenv
PORT=3000
NODE_ENV=production
PUBLIC_ORIGIN=https://figure.example.com
PROXY_ALLOWED_ORIGINS=https://portal.example.com,https://media.example.com
BUNNY_ORIGIN_SECRET=<long-random-secret>
```

Put TLS in front of Node at the origin (your platform load balancer/reverse proxy is fine).

### 2. Create the Bunny Pull Zone

Create a Pull Zone and set its Origin URL to:

```text
https://origin.figure.example.com
```

The current project can serve static and dynamic paths from this single origin. That is the simplest deployment.

If you later move static assets to a different origin, Bunny Edge Rules support `Change Origin URL`; route `/proxy/*`, `/api/*` and `/socket/*` to the Node backend while preserving the incoming path/query. Bunny's current Edge Rule variable expansion supports path and URL variables for this purpose.

### 3. Add the public hostname

In the Pull Zone, add:

```text
figure.example.com
```

Create the DNS CNAME Bunny gives you (normally the Pull Zone `*.b-cdn.net` hostname). If your DNS provider has its own proxying feature, keep it disabled for this CNAME so Bunny receives the traffic directly.

Enable Bunny's free SSL certificate for the custom hostname and force HTTPS after the certificate is active.

### 4. Edge Rules / caching

Use path rules similar to:

| Path | Bunny action | Reason |
|---|---|---|
| `/proxy/*` | Override Cache Time = `0` | Personalized/authorized proxied traffic must never be edge cached. |
| `/api/*` | Override Cache Time = `0` | API/CSRF/assistant responses are user-specific or dynamic. |
| `/socket/*` | Dynamic origin + WebSocket support; no cache | Upgrade tunnel. |
| `/sw.js` | Very short/no cache | Browser must be able to discover service-worker updates. |
| `/`, HTML entry points | Short/no cache | Avoid stale app shells during deploys. |
| `/src/*` | Moderate static TTL | Current filenames are not content-hashed. |
| `/icons/*` | Longer static TTL | Stable PWA icons. |
| versioned/hashed future assets | Long TTL | Safe once filenames change with content. |

The Node origin already returns `no-store, private` plus `Surrogate-Control: no-store` on proxy responses. Keep the Bunny bypass rule as defense in depth.

Bunny's FAQ documents `Override Cache Time = 0` as the way to bypass caching for selected content. Bunny also supports Range requests; keep cache slicing/uncached Range behavior in mind for large media.

### 5. WebSockets

Enable WebSocket support in the Pull Zone. Bunny currently exposes this directly in Pull Zone settings. Make sure your origin/load balancer also allows HTTP Upgrade and uses idle timeouts appropriate for your authorized applications.

The FigureOS origin tunnels `/socket/*` only after the same allowlist, DNS and private-network checks used by the HTTP gateway.

### 6. Protect the origin

Generate a long random secret and set it as `BUNNY_ORIGIN_SECRET` on the Node origin.

Add a Bunny Edge Rule that sets this request header toward the origin:

```text
X-FigureOS-Origin-Secret: <same secret>
```

When configured, the Node server rejects HTTP and WebSocket requests that do not carry the secret. Never put this value in frontend JavaScript.

Also restrict direct origin network access to Bunny's egress ranges where your hosting platform supports it.

### 7. Bunny Shield

If Bunny Shield is available on your plan:

- Enable it for the public hostname.
- Start in Learning Mode and review events before enforcing aggressive rules.
- Use WAF/DDoS protection for the whole hostname.
- Add edge rate limits for `/proxy/*` and `/api/*` that complement the origin's own limit.
- Tune bot rules carefully around `/socket/*` and legitimate game/browser traffic.
- Use access lists for operator/admin-only services when appropriate.

### 8. Security headers

The origin sends CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy and SAMEORIGIN framing protection for FigureOS itself. Do not overwrite upstream CSP/X-Frame-Options inside `/proxy/*`.

At Bunny you can additionally set HSTS after every relevant hostname is permanently HTTPS:

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

Only add `includeSubDomains` if that is true for the rest of your domain.

## Test status

Run:

```bash
npm test
```

The included suite currently checks:

1. Home, API health, manifest and `/figure/` load from the Node origin.
2. Approved gateway response path and relative link/image/form rewriting.
3. POST body forwarding through the approved gateway path.
4. Unapproved proxy origin rejection.
5. Private/loopback/reserved IP detection.
6. Exact origin allowlisting and protocol/credential validation.
7. `X-Frame-Options` / `frame-ancestors` compatibility behavior.
8. CSS URL and `@import` rewriting.
9. module import / Worker URL rewriting.
10. server-side upstream cookie isolation.
11. CSRF rejection/acceptance behavior for the assistant API.
12. local byte Range responses.
13. service-worker exclusion of `/proxy/*` and `/api/*`.
14. syntax checking can be run over every `.js` file with `node --check`.

The repository also contains `tests/ui_smoke.py`. Headless Chromium in the build sandbox is administratively blocked from navigating even to intercepted/local test origins, so that script is provided for a normal developer machine rather than counted as a passing build check.

For deployment acceptance, use an origin you actually own in `PROXY_ALLOWED_ORIGINS` and manually verify its authenticated flows, CSP, forms, streaming and WebSocket behavior. Do not use an unrelated public website as a proxy test target.

## Project tree

```text
/
  index.html
  package.json
  .env.example
  README.md

  /src
    app.js
    router.js
    state.js
    themes.js
    particles.js
    search.js
    tasks.js
    styles.css

    /browser
      browser.js
      tabs.js
      history.js
      bookmarks.js
      proxy.js
      proxyClient.js

    /figure
      bridge.js
      embedded.css

    /apps
      registry.js
      home.js
      settings.js
      ciri.js
      music.js
      files.js

    /providers
      assistantProvider.js
      weatherProvider.js

  /public
    manifest.webmanifest
    sw.js
    offline.html
    /icons

  /figure
    index.html
    Tutorial.mp4
    backgroundmusic.mp3

  /server
    server.js
    /proxy
      gateway.js
      security.js
      rewrite.js
      cookies.js
      websocket.js

  /tests
```

## Important deployment rule

This code is intentionally not an unrestricted public proxy. Keep `PROXY_ALLOWED_ORIGINS` narrow, use it only for services you own or are authorized to reverse proxy, and require upstream services to opt into the framing/origin behavior they need instead of stripping their security controls.
