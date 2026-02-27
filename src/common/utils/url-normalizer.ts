export function normalizeUrl(url: string): string {
  try {
    const trimmed = url.trim();
    // Ensure we have a protocol
    const urlWithProtocol = trimmed.match(/^https?:\/\//i) ? trimmed : `https://${trimmed}`;
    const urlObject = new URL(urlWithProtocol);

    urlObject.hostname = urlObject.hostname.toLowerCase();
    urlObject.hash = '';

    // Strip common tracking parameters for better deduplication
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'fbclid', 'gclid', 'msclkid'];
    trackingParams.forEach(param => urlObject.searchParams.delete(param));

    let normalized = urlObject.toString();

    // Remove trailing slash if it's not the root path
    if (normalized.endsWith('/') && urlObject.pathname !== '/') {
      normalized = normalized.slice(0, -1);
    }

    return normalized;
  } catch (error) {
    throw new Error('Invalid URL');
  }
}