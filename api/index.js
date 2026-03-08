export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // 1. Instant CORS Preflight approval
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
    // 2. Lock onto the exact ElectronHub endpoint
    const url = new URL('https://api.electronhub.top/v1/chat/completions');

    // 3. Clone headers and spoof the browser
    const headers = new Headers(req.headers);
    headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    headers.delete('Host');
    headers.delete('Origin');
    headers.delete('Referer');

    // 4. THE FIX: Forward the raw stream with duplex: 'half'
    const fetchOptions = {
      method: req.method,
      headers: headers,
      redirect: 'follow',
      body: (req.method !== 'GET' && req.method !== 'HEAD') ? req.body : undefined,
      duplex: 'half' // <-- THIS prevents the Vercel 500 crash!
    };

    const response = await fetch(url, fetchOptions);

    // 5. Pipe the response back to Janitor AI
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set('Access-Control-Allow-Origin', '*');

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
    
  }
}
