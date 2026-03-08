export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // 1. Preflight
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
    // 2. High-Level IP Spoofing
    // We generate a fake, random IPv4 address so Cloudflare thinks you are a new, normal user every time.
    const fakeIP = `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
    
    const cleanHeaders = new Headers({
      'Content-Type': 'application/json',
      'Authorization': req.headers.get('Authorization') || '',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'X-Forwarded-For': fakeIP,
      'X-Real-IP': fakeIP
    });

    let cleanBodyText = '';
    if (req.method === 'POST') {
      const rawBody = await req.json();
      
      // 3. High-Level Context Truncation
      // Free servers crash on huge chats. We intercept the array and ONLY send the system prompt + the last 2 messages.
      let lightweightMessages = rawBody.messages;
      if (lightweightMessages && lightweightMessages.length > 3) {
        lightweightMessages = [
          lightweightMessages[0], // Keeps your bot's core personality/system prompt
          lightweightMessages[lightweightMessages.length - 2], // The bot's last reply
          lightweightMessages[lightweightMessages.length - 1]  // Your newest message
        ];
      }

      const cleanBody = {
        model: "deepseek-chat", 
        messages: lightweightMessages,
        stream: false, // Force stream off to prevent chunking crashes
        temperature: 0.8
      };
      cleanBodyText = JSON.stringify(cleanBody);
    }

    // 4. Fire the ghost payload
    const response = await fetch('https://api.electronhub.top/v1/chat/completions', {
      method: req.method,
      headers: cleanHeaders,
      body: req.method === 'POST' ? cleanBodyText : undefined,
      duplex: 'half'
    });

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
