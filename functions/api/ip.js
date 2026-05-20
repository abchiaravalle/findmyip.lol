/*
 * /api/ip — Cloudflare Pages Function.
 *
 * Returns the visitor's IP + geolocation, computed at Cloudflare's edge.
 * No third-party APIs. No keys. No logs we keep (Cloudflare's edge logs are
 * the same logs that already exist because Cloudflare is serving the HTML).
 *
 * Everything in `request.cf` is data Cloudflare derives from the connection
 * itself — they have to know it to route the request. We just expose a tiny
 * subset of it back to the page so it can be rendered.
 *
 * Docs: https://developers.cloudflare.com/workers/runtime-apis/request/#incomingrequestcfproperties
 */
export function onRequest({ request }) {
  const cf = request.cf || {};
  const ip = request.headers.get('cf-connecting-ip') || null;

  // Honest failure mode: if Cloudflare didn't give us the IP or geo data
  // (rare — happens on some preview-deployment paths or non-CF traffic),
  // return a 503 with a clear message instead of fabricating an answer.
  if (!ip) {
    return new Response(
      JSON.stringify({
        error: 'no_edge_data',
        message: "Cloudflare didn't expose your IP for this request. Try refreshing.",
      }),
      { status: 503, headers: corsHeaders('application/json') }
    );
  }

  const body = {
    ip,
    type:     ip.includes(':') ? 'IPv6' : 'IPv4',
    city:     cf.city || null,
    region:   cf.region || null,
    country:  cf.country || null,                 // ISO 3166-1 alpha-2
    lat:      cf.latitude  != null ? parseFloat(cf.latitude)  : null,
    lon:      cf.longitude != null ? parseFloat(cf.longitude) : null,
    timezone: cf.timezone || null,
    asn:      cf.asn != null ? ('AS' + cf.asn) : null,
    isp:      cf.asOrganization || null,
  };

  return new Response(JSON.stringify(body), {
    headers: corsHeaders('application/json'),
  });
}

function corsHeaders(contentType) {
  return {
    'content-type': contentType,
    // No caching: every visitor's IP differs, and we don't want a CDN edge to
    // return one visitor's IP to another.
    'cache-control': 'no-store',
    // Page is same-origin, so CORS technically unnecessary, but explicit is
    // better than implicit and makes the endpoint portable for anyone forking.
    'access-control-allow-origin': '*',
  };
}
