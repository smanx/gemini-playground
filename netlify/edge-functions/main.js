import worker from '../../src/index.js';

export default async (request, context) => {
  const env = {
    ...context.env,
    __STATIC_CONTENT: {
      get: () => null, // Netlify handles static assets automatically
    },
  };

  // Netlify provides a different way to handle geolocation data
  const newRequest = new Request(request.url, {
    headers: request.headers,
    method: request.method,
    body: request.body,
    redirect: request.redirect,
  });

  return worker.fetch(newRequest, env, context);
};
