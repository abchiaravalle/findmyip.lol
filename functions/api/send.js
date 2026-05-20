/*
 * /api/send — Cloudflare Pages Function.
 *
 * Sends an email summary of the visitor's IP/geo info to one recipient via
 * SMTP2GO. The visitor only supplies the recipient address; the body is
 * generated server-side from request.cf so this endpoint can't be abused to
 * relay arbitrary content (the worst case is a spammer mailing someone a
 * description of the spammer's own IP).
 *
 * The SMTP2GO API key lives ONLY in this Function's runtime environment as
 * env.SMTP2GO_API_KEY — configured in the Cloudflare Pages dashboard under
 * Settings → Environment variables. It is never sent to the browser and
 * never committed to the repo. For local dev with `wrangler pages dev`,
 * put it in a gitignored .dev.vars file at the project root:
 *
 *     SMTP2GO_API_KEY=api-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *
 * Rate limiting: per source-IP via the CF cache API. 60s cooldown between
 * sends from the same IP, no external state required.
 */

const FROM_EMAIL = 'findmyip@amplifi.studio';
const FROM_NAME  = 'findmyip';
const RATE_LIMIT_SECONDS = 60;

// Loose but practical email regex — rejects obvious junk, accepts the
// long tail of real addresses without trying to fully implement RFC 5321.
const EMAIL_RE = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]+$/;

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }
  if (!env.SMTP2GO_API_KEY) {
    return json({ error: 'not_configured', message: 'Email is not configured on this deployment.' }, 503);
  }

  const ip = request.headers.get('cf-connecting-ip') || 'unknown';

  // ---- Per-IP rate limit via the cache API ----
  // We "store" a marker response in the edge cache, keyed by the visitor's
  // IP, with a TTL equal to the cooldown window. If the marker is present,
  // they're within the cooldown.
  const rateKey = new Request(`https://rate-limit.invalid/send/${encodeURIComponent(ip)}`, { method: 'GET' });
  const cache = caches.default;
  const existing = await cache.match(rateKey);
  if (existing) {
    return json({
      error: 'rate_limited',
      message: `Please wait ${RATE_LIMIT_SECONDS} seconds between sends from the same network.`,
    }, 429);
  }

  // ---- Parse the request ----
  let body;
  try { body = await request.json(); } catch (_) {
    return json({ error: 'bad_json' }, 400);
  }

  const to = String(body.to || '').trim();
  if (!EMAIL_RE.test(to) || to.length > 254) {
    return json({ error: 'bad_recipient', message: 'That recipient email address looks invalid.' }, 400);
  }

  // ---- Compose the email from request.cf (server-side, not from input) ----
  const cf = request.cf || {};
  const facts = {
    ip,
    type:     ip.includes(':') ? 'IPv6' : 'IPv4',
    city:     cf.city || null,
    region:   cf.region || null,
    country:  cf.country || null,
    timezone: cf.timezone || null,
    asn:      cf.asn != null ? ('AS' + cf.asn) : null,
    isp:      cf.asOrganization || null,
    lat:      cf.latitude || null,
    lon:      cf.longitude || null,
  };

  const sourceHost = new URL(request.url).host;       // findmyip.lol OR findmyip.amplifi.studio
  const subject   = `Your IP info from ${sourceHost}`;
  const html      = renderHtml(facts, sourceHost);
  const text      = renderText(facts, sourceHost);

  // ---- Send via SMTP2GO ----
  let smtpRes;
  try {
    smtpRes = await fetch('https://api.smtp2go.com/v3/email/send', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json',
        'x-smtp2go-api-key': env.SMTP2GO_API_KEY,
      },
      body: JSON.stringify({
        sender: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: [to],
        subject,
        html_body: html,
        text_body: text,
      }),
    });
  } catch (e) {
    return json({ error: 'upstream_failed', message: 'Could not reach SMTP2GO.' }, 502);
  }

  let smtpJson = null;
  try { smtpJson = await smtpRes.json(); } catch (_) { /* ignore */ }

  if (!smtpRes.ok || (smtpJson && smtpJson.data && smtpJson.data.error)) {
    return json({
      error: 'send_failed',
      message: (smtpJson && smtpJson.data && smtpJson.data.error) || 'SMTP2GO rejected the message.',
    }, 502);
  }

  // ---- Record the rate-limit marker (only after a successful accept) ----
  await cache.put(
    rateKey,
    new Response('1', { headers: { 'cache-control': `public, max-age=${RATE_LIMIT_SECONDS}` } })
  );

  return json({ ok: true });
}

function renderHtml(f, host) {
  const row = (k, v) => v ? `<tr><td style="padding:6px 12px 6px 0;color:#64748b;font:13px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;">${k}</td><td style="padding:6px 0;color:#1e293b;font:13px/1.4 ui-monospace,Menlo,monospace;">${escapeHtml(String(v))}</td></tr>` : '';
  return `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f8fafc;color:#1e293b;font:14px/1.5 -apple-system,BlinkMacSystemFont,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:24px;">
    <h1 style="margin:0 0 4px;font-size:18px;font-weight:600;">Your IP info</h1>
    <p style="margin:0 0 16px;color:#64748b;font-size:13px;">Captured from <a href="https://${escapeHtml(host)}/" style="color:#8b5cf6;text-decoration:none;">${escapeHtml(host)}</a></p>
    <table cellpadding="0" cellspacing="0" role="presentation" style="border-collapse:collapse;">
      ${row('IP address', f.ip)}
      ${row('Type',       f.type)}
      ${row('Location',   [f.city, f.region, f.country].filter(Boolean).join(', '))}
      ${row('ISP',        f.isp)}
      ${row('ASN',        f.asn)}
      ${row('Timezone',   f.timezone)}
      ${row('Coordinates',(f.lat != null && f.lon != null) ? `${f.lat}, ${f.lon}` : null)}
    </table>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
    <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5;">
      Sent from <a href="https://${escapeHtml(host)}/" style="color:#8b5cf6;">${escapeHtml(host)}</a> — a privacy-respecting IP lookup tool by <a href="https://amplifi.studio" style="color:#8b5cf6;">amplifi.studio</a>.<br>
      Delivery handled by <a href="https://smtp2go.com" style="color:#8b5cf6;">SMTP2GO</a>, which keeps its own delivery logs.
    </p>
  </div>
</body></html>`;
}

function renderText(f, host) {
  const lines = [
    'Your IP info',
    `Captured from https://${host}/`,
    '',
    `IP address:  ${f.ip}`,
    `Type:        ${f.type}`,
    `Location:    ${[f.city, f.region, f.country].filter(Boolean).join(', ') || 'unknown'}`,
    `ISP:         ${f.isp || 'unknown'}`,
    `ASN:         ${f.asn || 'unknown'}`,
    `Timezone:    ${f.timezone || 'unknown'}`,
    (f.lat != null && f.lon != null) ? `Coordinates: ${f.lat}, ${f.lon}` : null,
    '',
    `Sent from https://${host}/ — a privacy-respecting IP lookup by amplifi.studio.`,
    'Delivery handled by SMTP2GO, which keeps its own delivery logs.',
  ].filter(Boolean);
  return lines.join('\n');
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      'access-control-allow-origin': '*',
    },
  });
}
