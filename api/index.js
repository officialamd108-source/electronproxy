export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // 1. CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    const url = new URL(req.url);
    url.hostname = 'api.electronhub.top';
    url.pathname = '/v1/chat/completions';

    // 2. WAF Bypass: Spoof a real browser and strip server headers
    const headers = new Headers(req.headers);
    headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    headers.set('Accept', 'application/json');
    headers.delete('Origin');
    headers.delete('Referer');
    headers.delete('Host');
    headers.delete('Content-Length');
    headers.delete('Transfer-Encoding');

    let bodyData = null;

    // 3. Payload Scrubbing: Rebuild the JSON to hide Janitor AI
    if (req.method === 'POST') {
      try {
        const rawBody = await req.json();
        
        // Build a hyper-clean payload
        const cleanBody = {
          model: "deepseek-v3.2:free", // Forces the standard model, ignores Janitor settings
          messages: rawBody.messages,
          stream: rawBody.stream || false
        };

        // Only pass standard parameters, dropping Janitor's custom tracking
        if (rawBody.temperature) cleanBody.temperature = rawBody.temperature;
        if (rawBody.max_tokens) cleanBody.max_tokens = rawBody.max_tokens;

        bodyData = JSON.stringify(cleanBody);
        headers.set('Content-Type', 'application/json');
      } catch (err) {
        // Fallback if it's not JSON
        bodyData = await req.text();
      }
    }

    // 4. Send the disguised payload
    const response = await fetch(url.toString(), {
      method: req.method,
      headers: headers,
      body: bodyData,
      redirect: 'follow'
    });

    // 5. Force CORS on the return trip
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
