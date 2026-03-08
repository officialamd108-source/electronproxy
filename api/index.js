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
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    // 2. Force the correct target route
    const url = new URL(req.url);
    url.hostname = 'api.electronhub.top';
    url.pathname = '/v1/chat/completions'; 

    // 3. Strip problematic headers so ElectronHub doesn't choke
    const headers = new Headers(req.headers);
    headers.delete('Origin');
    headers.delete('Referer');
    headers.delete('Host');
    headers.delete('Content-Length'); // Let fetch auto-calculate this
    headers.delete('Transfer-Encoding'); // Prevents the streaming 500 error!

    // 4. THE FIX: Buffer the entire chat message first instead of streaming it
    let bodyData = null;
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      bodyData = await req.text(); 
    }

    // 5. Forward the fully packaged request
    const response = await fetch(url.toString(), {
      method: req.method,
      headers: headers,
      body: bodyData,
      redirect: 'follow'
    });

    // 6. Force CORS on the way back
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
