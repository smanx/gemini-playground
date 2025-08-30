import worker from '../../src/index.js';

// A regular expression to identify requests for static assets
const STATIC_FILE_EXTENSIONS = /\.(css|js|html|json|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$/;

export default async (request, context) => {
  const url = new URL(request.url);

  // If the request is for the root path or a static file,
  // return without a response to let Netlify's static file handling take over.
  if (url.pathname === '/' || url.pathname === '/index.html' || STATIC_FILE_EXTENSIONS.test(url.pathname)) {
    return;
  }

  // Handle WebSocket connections using Deno's native API
  if (request.headers.get('Upgrade') === 'websocket') {
    const pathAndQuery = url.pathname + url.search;
    const targetUrl = `wss://generativelanguage.googleapis.com${pathAndQuery}`;

    // Deno.upgradeWebSocket is the standard way to handle WebSockets in Netlify Edge Functions.
    const { socket: clientSocket, response } = Deno.upgradeWebSocket(request);

    const targetSocket = new WebSocket(targetUrl);

    // When the connection to the target is open, start listening for messages.
    targetSocket.onopen = () => {
      // Forward messages from the client to the target.
      clientSocket.onmessage = (event) => {
        if (targetSocket.readyState === WebSocket.OPEN) {
          targetSocket.send(event.data);
        }
      };
    };

    // Forward messages from the target to the client.
    targetSocket.onmessage = (event) => {
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.send(event.data);
      }
    };

    // Handle closing from both ends.
    clientSocket.onclose = (event) => {
      if (targetSocket.readyState === WebSocket.OPEN) {
        targetSocket.close(event.code, event.reason);
      }
    };
    targetSocket.onclose = (event) => {
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.close(event.code, event.reason);
      }
    };

    // Handle errors.
    clientSocket.onerror = (error) => {
      console.error('Client WebSocket error:', error);
      if (targetSocket.readyState === WebSocket.OPEN) {
        targetSocket.close(1011, 'Client error');
      }
    };
    targetSocket.onerror = (error) => {
      console.error('Target WebSocket error:', error);
      if (clientSocket.readyState === WebSocket.OPEN) {
        clientSocket.close(1011, 'Target error');
      }
    };

    return response;
  }


  const env = {
    ...context.env,
    // This mock is for compatibility, but shouldn't be hit for static files
    // because of the check above.
    __STATIC_CONTENT: {
      get: () => new Response('Asset not found in worker', { status: 404 }),
    },
  };

  // Pass the request to the original worker's fetch handler for non-websocket requests
  return worker.fetch(request, env, context);
};
