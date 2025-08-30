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

  const env = {
    ...context.env,
    // This mock is for compatibility, but shouldn't be hit for static files
    // because of the check above.
    __STATIC_CONTENT: {
      get: () => new Response('Asset not found in worker', { status: 404 }),
    },
  };

  // Pass the request to the original worker's fetch handler
  return worker.fetch(request, env, context);
};
