/*
 * TEMPORARY DIAGNOSTIC — /api/_debug-env
 *
 * Returns the NAMES of env vars/bindings visible to this Function at runtime,
 * and a boolean for whether SMTP2GO_API_KEY is bound. NEVER returns the value
 * of any secret. Delete this file once /api/send is working.
 */
export function onRequest({ env }) {
  const keys = Object.keys(env || {}).sort();
  const has = !!(env && env.SMTP2GO_API_KEY);
  const len = has ? String(env.SMTP2GO_API_KEY).length : 0;
  return new Response(
    JSON.stringify({
      bindings_visible_to_function: keys,
      SMTP2GO_API_KEY_present: has,
      SMTP2GO_API_KEY_length:  len,    // safe to expose — just the char count
      hint: has
        ? 'Key IS bound. /api/send should work; if it still 503s, redeploy.'
        : 'Key is NOT bound. Check: (1) exact name SMTP2GO_API_KEY, (2) added to Production scope, (3) it is under "Variables and Secrets", not "Build variables", (4) saved + redeployed.',
    }, null, 2),
    {
      headers: {
        'content-type': 'application/json',
        'cache-control': 'no-store',
      },
    }
  );
}
