export interface MapCoord {
  lat: number;
  lng: number;
}

export function parseCoord(value: unknown): number | null {
  const n = typeof value === 'string' ? Number.parseFloat(value) : Number.NaN;
  return Number.isFinite(n) ? n : null;
}

export function isValidCoord(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function parseRouteEndpoints(query: {
  fromLat?: unknown;
  fromLng?: unknown;
  toLat?: unknown;
  toLng?: unknown;
}): { from: MapCoord; to: MapCoord } | { error: string } {
  const fromLat = parseCoord(query.fromLat);
  const fromLng = parseCoord(query.fromLng);
  const toLat = parseCoord(query.toLat);
  const toLng = parseCoord(query.toLng);

  if (fromLat === null || fromLng === null || toLat === null || toLng === null) {
    return { error: 'fromLat, fromLng, toLat, and toLng are required' };
  }

  if (!isValidCoord(fromLat, fromLng) || !isValidCoord(toLat, toLng)) {
    return { error: 'Invalid coordinates' };
  }

  return {
    from: { lat: fromLat, lng: fromLng },
    to: { lat: toLat, lng: toLng },
  };
}

/** Buffalo metro bounding box — rejects obviously invalid long-distance routes. */
export function isInBuffaloServiceArea(from: MapCoord, to: MapCoord): boolean {
  const minLat = 42.65;
  const maxLat = 43.15;
  const minLng = -79.10;
  const maxLng = -78.55;

  const inBox = (point: MapCoord) =>
    point.lat >= minLat && point.lat <= maxLat && point.lng >= minLng && point.lng <= maxLng;

  return inBox(from) && inBox(to);
}
