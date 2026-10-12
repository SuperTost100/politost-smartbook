// Files under /reader/ are served as static assets before this code runs. What reaches it is
// a path with no file: an app route such as /reader/libro/esempio, or a file that doesn't exist.
export default {
  async fetch(request, env) {
    const accept = request.headers.get('Accept') ?? '';
    if ((request.method === 'GET' || request.method === 'HEAD') && accept.includes('text/html')) {
      // The single-page app handles the route itself.
      return env.ASSETS.fetch(new Request(new URL('/reader/', request.url), request));
    }
    return new Response('Not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  },
};
