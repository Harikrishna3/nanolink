export function normalizeUrl(url: string): string {
  try {
    const trimmed = url.trim();
    const urlObject = new URL(trimmed);
    urlObject.hostname = urlObject.hostname.toLowerCase();
    urlObject.hash = '';
    let normalizeUrl = urlObject.toString();
    if (normalizeUrl.endsWith('/') && urlObject.pathname !== '/') {
      normalizeUrl = normalizeUrl.slice(0, -1);
    }
    return normalizeUrl;
  } catch (error) {
    throw new Error('Invalid URL');
  }
}