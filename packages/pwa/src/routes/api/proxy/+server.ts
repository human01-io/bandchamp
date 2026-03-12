import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const ALLOWED_HOSTS = ['bandcamp.com', 'www.bandcamp.com'];

function isAllowedHost(hostname: string): boolean {
  return ALLOWED_HOSTS.includes(hostname) || hostname.endsWith('.bandcamp.com');
}

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { url, method = 'POST', payload } = body as {
    url: string;
    method?: string;
    payload?: string;
  };

  if (!url) {
    return error(400, 'Missing url parameter');
  }

  try {
    const parsed = new URL(url);
    if (!isAllowedHost(parsed.hostname)) {
      return error(403, 'Host not allowed');
    }
  } catch {
    return error(400, 'Invalid URL');
  }

  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; BandChamp/1.0)',
      },
      body: payload || undefined,
    });

    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      const data = await response.json();
      return json(data);
    }

    const text = await response.text();
    return new Response(text, {
      headers: { 'Content-Type': contentType },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Fetch failed';
    return error(502, message);
  }
};

export const GET: RequestHandler = async ({ url: reqUrl }) => {
  const targetUrl = reqUrl.searchParams.get('url');

  if (!targetUrl) {
    return error(400, 'Missing url parameter');
  }

  try {
    const parsed = new URL(targetUrl);
    if (!isAllowedHost(parsed.hostname)) {
      return error(403, 'Host not allowed');
    }
  } catch {
    return error(400, 'Invalid URL');
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BandChamp/1.0)',
      },
    });

    const text = await response.text();
    const contentType = response.headers.get('content-type') || 'text/html';
    return new Response(text, {
      headers: { 'Content-Type': contentType },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Fetch failed';
    return error(502, message);
  }
};
