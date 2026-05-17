/*
 * NASA NeoWs feed URL — supports optional proxy via VITE_NEO_FEED_URL.
 */

export function neoFeedUrlForDay(isoDay: string): string {
  const proxy = import.meta.env.VITE_NEO_FEED_URL as string | undefined;
  if (proxy) {
    return proxy.replace('{date}', isoDay);
  }
  const key = (import.meta.env.VITE_NASA_API_KEY as string | undefined) ?? 'DEMO_KEY';
  return `https://api.nasa.gov/neo/rest/v1/feed?start_date=${isoDay}&end_date=${isoDay}&api_key=${encodeURIComponent(key)}`;
}
