export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // 1. Perfect CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    // 2. Force the correct target route
    const url = new URL(req.url);
    url.hostname = 'api.electronhub.top';
    url.pathname = '/v1/chat/completions'; // This forces the traffic to the right place!

    // 3. Strip all identifying headers
    const headers = new Headers(req.headers);
    headers.delete('Origin');
    headers.delete('Referer');
    headers.delete('Host');

    // 4. Safely forward the body
    const fetchOptions = {
      method: req.method,
      headers: headers,
      redirect: 'follow'
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      fetchOptions.body = req.body;
    }

    const response = await fetch(url.toString(), fetchOptions);

    // 5. Force CORS on the way back
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
}
