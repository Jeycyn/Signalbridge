import {
  LocationInfo,
  LocationWeatherData,
  ProviderCoverageInfo,
} from '../../shared/types.js';

const CACHE_KEY_LAST_LOCATION = 'signalbridge_last_location_data';
const CACHE_KEY_OVERVIEW = 'signalbridge_overview_feed';
const CACHE_KEY_CUSTOM_LOCATIONS = 'signalbridge_custom_locations';

export interface CachedResponse<T> {
  data: T;
  isCached: boolean;
  cachedAt?: string;
  cachedAgeDescription?: string;
}

export function formatAge(isoDateString?: string): string {
  if (!isoDateString) return 'Timestamp unavailable';
  const ageMs = Date.now() - new Date(isoDateString).getTime();
  if (isNaN(ageMs)) return 'Timestamp unavailable';
  const mins = Math.floor(ageMs / (1000 * 60));
  if (mins < 1) return 'Under 1 min ago';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours < 24) return remMins > 0 ? `${hours}h ${remMins}m ago` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatDateTime(isoDateString?: string): string {
  if (!isoDateString) return 'Not recorded';
  try {
    const d = new Date(isoDateString);
    if (isNaN(d.getTime())) return isoDateString;
    return d.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return isoDateString;
  }
}

export function getStoredCustomLocations(): LocationInfo[] {
  try {
    const raw = localStorage.getItem(CACHE_KEY_CUSTOM_LOCATIONS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

export function saveStoredCustomLocation(loc: LocationInfo): void {
  try {
    const list = getStoredCustomLocations();
    if (!list.some(l => l.id === loc.id || (l.latitude === loc.latitude && l.longitude === loc.longitude))) {
      list.push(loc);
      localStorage.setItem(CACHE_KEY_CUSTOM_LOCATIONS, JSON.stringify(list));
    }
  } catch {}
}

export async function searchLocations(query: string): Promise<LocationInfo[]> {
  const url = query
    ? `/api/locations/search?q=${encodeURIComponent(query)}`
    : '/api/locations/search';
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to search locations: ${res.statusText}`);
  }
  const data = await res.json();
  return data.locations || [];
}

export async function fetchLocationWeather(params: {
  lat: number;
  lon: number;
  name?: string;
  country?: string;
  threshold?: number;
  simulate?: boolean;
}): Promise<CachedResponse<LocationWeatherData>> {
  const query = new URLSearchParams();
  query.set('lat', params.lat.toString());
  query.set('lon', params.lon.toString());
  if (params.name) query.set('name', params.name);
  if (params.country) query.set('country', params.country);
  if (params.threshold) query.set('threshold', params.threshold.toString());
  if (params.simulate) query.set('simulate', 'true');

  try {
    const res = await fetch(`/api/weather?${query.toString()}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Server responded with ${res.status}`);
    }
    const data: LocationWeatherData = await res.json();

    // Cache the last successful non-sensitive location result
    try {
      localStorage.setItem(
        CACHE_KEY_LAST_LOCATION,
        JSON.stringify({
          cachedAt: new Date().toISOString(),
          data,
        })
      );
    } catch {}

    return {
      data,
      isCached: false,
    };
  } catch (err: any) {
    // Attempt to load from offline cache
    try {
      const raw = localStorage.getItem(CACHE_KEY_LAST_LOCATION);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.data) {
          return {
            data: parsed.data,
            isCached: true,
            cachedAt: parsed.cachedAt,
            cachedAgeDescription: formatAge(parsed.data.modelRunAt || parsed.cachedAt),
          };
        }
      }
    } catch {}

    throw new Error(
      `Data unavailable from provider: ${err.message || 'Network request failed'}. No cached offline snapshot available.`
    );
  }
}

export async function fetchOverviewFeed(simulate?: boolean): Promise<CachedResponse<LocationWeatherData[]>> {
  try {
    const url = simulate ? '/api/overview-feed?simulate=true' : '/api/overview-feed';
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to load overview feed: status ${res.status}`);
    }
    const json = await res.json();
    const items: LocationWeatherData[] = json.items || [];

    // Also fetch any user-added custom locations stored in localStorage
    const customLocs = getStoredCustomLocations();
    if (customLocs.length > 0) {
      const customResults = await Promise.allSettled(
        customLocs.map(c =>
          fetchLocationWeather({
            lat: c.latitude,
            lon: c.longitude,
            name: c.name,
            country: c.country,
            simulate,
          })
        )
      );
      customResults.forEach(r => {
        if (r.status === 'fulfilled' && !items.some(it => it.location.id === r.value.data.location.id)) {
          items.push(r.value.data);
        }
      });
    }

    try {
      localStorage.setItem(
        CACHE_KEY_OVERVIEW,
        JSON.stringify({
          cachedAt: new Date().toISOString(),
          items,
        })
      );
    } catch {}

    return {
      data: items,
      isCached: false,
    };
  } catch (err: any) {
    try {
      const raw = localStorage.getItem(CACHE_KEY_OVERVIEW);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.items) && parsed.items.length > 0) {
          return {
            data: parsed.items,
            isCached: true,
            cachedAt: parsed.cachedAt,
            cachedAgeDescription: formatAge(parsed.cachedAt),
          };
        }
      }
    } catch {}

    throw new Error(`Overview feed unavailable: ${err.message || 'Offline with no stored snapshot'}`);
  }
}

export async function fetchDataSources(): Promise<ProviderCoverageInfo[]> {
  const res = await fetch('/api/sources');
  if (!res.ok) {
    throw new Error('Failed to retrieve data sources specifications');
  }
  const json = await res.json();
  return json.sources || [];
}
