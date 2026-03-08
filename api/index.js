export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // 1. Handle CORS Preflight checks
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      },
    });
  }

  // 2. Set up the target URL to ElectronHub
  const targetUrl = new URL(req.url);
  targetUrl.hostname = 'api.electronhub.top';

  // 3. Clone and clean the request
  const modifiedRequest = new Request(targetUrl.toString(), new Request(req));
  modifiedRequest.headers.delete('Origin');
  modifiedRequest.headers.delete('Referer');

  // 4. Forward to ElectronHub and return the response
  try {
    const response = await fetch(modifiedRequest);
    const modifiedResponse = new Response(response.body, response);
    modifiedResponse.headers.set('Access-Control-Allow-Origin', '*');
    return modifiedResponse;
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Proxy connection failed.' }), { status: 500 });
  }
}
