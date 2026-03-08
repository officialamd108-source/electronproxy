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
    // 2. THE NUCLEAR OPTION: Do NOT clone headers. Build completely new ones.
    const auth = req.headers.get('Authorization') || '';
    const cleanHeaders = new Headers({
      'Content-Type': 'application/json',
      'Authorization': auth,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Accept': 'application/json'
    });

    // 3. Extract only the raw text, destroy the Janitor AI fingerprint
    let cleanBodyText = '';
    if (req.method === 'POST') {
      const rawBody = await req.json();
      
      // We are dropping Janitor's custom stop tokens, rep penalties, and top_p settings.
      // This makes the payload look completely generic.
      const cleanBody = {
        model: "deepseek-chat", // Force standard model tag
        messages: rawBody.messages,
        stream: rawBody.stream || false,
        temperature: 0.8 // Standard default
      };
      cleanBodyText = JSON.stringify(cleanBody);
    }

    // 4. Send the completely synthetic "Ghost" request
    const response = await fetch('https://api.electronhub.top/v1/chat/completions', {
      method: req.method,
      headers: cleanHeaders,
      body: req.method === 'POST' ? cleanBodyText : undefined,
      duplex: 'half' // Keep the stream fix to prevent Vercel from crashing
    });

    // 5. Pipe the response back to Janitor AI safely
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
