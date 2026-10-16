import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { providerRegistry } from './server/adapters/registry.js';
import { LocationInfo } from './shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Curated benchmark representative locations for global overview feed
const BENCHMARK_LOCATIONS: LocationInfo[] = [
  {
    id: 'valencia_es',
    name: 'Valencia',
    country: 'Spain',
    admin1: 'Valencian Community',
    latitude: 39.4699,
    longitude: -0.3763,
    timezone: 'Europe/Madrid',
  },
  {
    id: 'jakarta_id',
    name: 'Jakarta',
    country: 'Indonesia',
    admin1: 'DKI Jakarta',
    latitude: -6.2088,
    longitude: 106.8456,
    timezone: 'Asia/Jakarta',
  },
  {
    id: 'houston_us',
    name: 'Houston',
    country: 'United States',
    admin1: 'Texas',
    latitude: 29.7604,
    longitude: -95.3698,
    timezone: 'America/Chicago',
  },
  {
    id: 'london_uk',
    name: 'London',
    country: 'United Kingdom',
    admin1: 'Greater London',
    latitude: 51.5074,
    longitude: -0.1278,
    timezone: 'Europe/London',
  },
  {
    id: 'nairobi_ke',
    name: 'Nairobi',
    country: 'Kenya',
    admin1: 'Nairobi County',
    latitude: -1.2921,
    longitude: 36.8219,
    timezone: 'Africa/Nairobi',
  },
  {
    id: 'tokyo_jp',
    name: 'Tokyo',
    country: 'Japan',
    admin1: 'Tokyo',
    latitude: 35.6762,
    longitude: 139.6503,
    timezone: 'Asia/Tokyo',
  },
  {
    id: 'eldoret_ke',
    name: 'Eldoret',
    country: 'Kenya',
    admin1: 'Uasin Gishu County',
    latitude: 0.5143,
    longitude: 35.2698,
    timezone: 'Africa/Nairobi',
  },
  {
    id: 'kisumu_ke',
    name: 'Kisumu',
    country: 'Kenya',
    admin1: 'Kisumu County',
    latitude: -0.0917,
    longitude: 34.7680,
    timezone: 'Africa/Nairobi',
  },
];

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'operational',
      app: 'SignalBridge',
      version: '1.0.0-milestone1',
      time: new Date().toISOString(),
    });
  });

  // In-memory tile cache to strictly respect provider usage policies and accelerate rendering
  const tileMemoryCache = new Map<string, { buffer: Buffer; contentType: string; cachedAt: number }>();
  const MAX_TILE_CACHE = 1500;

  // Basemap Tile Proxy: Adheres to OpenStreetMap Tile Usage Policy with custom User-Agent and caching.
  // Supports optional MAP_TILE_URL environment variable for private/keyed tile servers.
  app.get(['/api/tiles/:z/:x/:y.png', '/api/tiles/:z/:x/:y'], async (req, res) => {
    try {
      const z = req.params.z;
      const x = req.params.x;
      const y = req.params.y.replace(/\.png$/, '');
      const cacheKey = `${z}/${x}/${y}`;

      const cached = tileMemoryCache.get(cacheKey);
      if (cached && Date.now() - cached.cachedAt < 86400000) {
        res.setHeader('Content-Type', cached.contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
        res.setHeader('X-Tile-Cache', 'HIT');
        return res.send(cached.buffer);
      }

      const tileTemplate = process.env.MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      const tileUrl = tileTemplate.replace('{z}', z).replace('{x}', x).replace('{y}', y);

      let tileRes = await fetch(tileUrl, {
        headers: {
          'User-Agent': 'SignalBridge-RiskIntelligence/1.0 (prototype-research; contact: info@signalbridge.org)',
          'Accept': 'image/png,image/*',
        },
      });

      // Graceful fallback to OpenStreetMap if custom MAP_TILE_URL failed
      if (!tileRes.ok && process.env.MAP_TILE_URL) {
        tileRes = await fetch(`https://tile.openstreetmap.org/${z}/${x}/${y}.png`, {
          headers: {
            'User-Agent': 'SignalBridge-RiskIntelligence/1.0 (prototype-research; contact: info@signalbridge.org)',
            'Accept': 'image/png,image/*',
          },
        });
      }

      if (!tileRes.ok) {
        return res.status(tileRes.status).end();
      }

      const buffer = Buffer.from(await tileRes.arrayBuffer());
      const contentType = tileRes.headers.get('content-type') || 'image/png';

      if (tileMemoryCache.size >= MAX_TILE_CACHE) {
        const firstKey = tileMemoryCache.keys().next().value;
        if (firstKey) tileMemoryCache.delete(firstKey);
      }
      tileMemoryCache.set(cacheKey, { buffer, contentType, cachedAt: Date.now() });

      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
      res.setHeader('X-Tile-Cache', 'MISS');
      res.send(buffer);
    } catch (err: any) {
      console.error('Tile proxy error:', err);
      res.status(502).end();
    }
  });

  // Location search: supports geocoding names or parsing coordinates
  app.get('/api/locations/search', async (req, res) => {
    try {
      const q = String(req.query.q || '').trim();
      if (!q) {
        return res.json({ locations: BENCHMARK_LOCATIONS });
      }

      // Check if coordinate pattern like "51.5, -0.12"
      const coordMatch = q.match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/);
      if (coordMatch) {
        const lat = parseFloat(coordMatch[1]);
        const lon = parseFloat(coordMatch[2]);
        if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
          const directLoc: LocationInfo = {
            id: `${lat.toFixed(4)},${lon.toFixed(4)}`,
            name: `Coordinates (${lat.toFixed(3)}°, ${lon.toFixed(3)}°)`,
            country: 'Custom Coordinates',
            latitude: lat,
            longitude: lon,
            timezone: 'auto',
          };
          return res.json({ locations: [directLoc] });
        }
      }

      // Open-Meteo Geocoding API
      const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=10&language=en&format=json`;
      const geoRes = await fetch(geoUrl, {
        headers: { 'Accept': 'application/json', 'User-Agent': 'SignalBridge-RiskIntelligence/1.0' },
      });

      if (!geoRes.ok) {
        return res.status(502).json({ error: 'Geocoding provider temporarily unavailable' });
      }

      const geoData = await geoRes.json();
      const results: LocationInfo[] = (geoData.results || []).map((r: any) => ({
        id: `${r.latitude.toFixed(4)},${r.longitude.toFixed(4)}`,
        name: r.name,
        country: r.country || '',
        admin1: r.admin1 || '',
        latitude: r.latitude,
        longitude: r.longitude,
        elevation: r.elevation,
        timezone: r.timezone || 'auto',
        country_code: r.country_code,
      }));

      res.json({ locations: results });
    } catch (err: any) {
      console.error('Geocoding error:', err);
      res.status(500).json({ error: 'Failed to process location search', details: err.message });
    }
  });

  // Weather data endpoint with provider adapter
  app.get('/api/weather', async (req, res) => {
    try {
      const lat = parseFloat(String(req.query.lat));
      const lon = parseFloat(String(req.query.lon));
      const name = req.query.name ? String(req.query.name) : undefined;
      const country = req.query.country ? String(req.query.country) : undefined;
      const timezone = req.query.timezone ? String(req.query.timezone) : undefined;
      const thresholdOverride = req.query.threshold ? parseFloat(String(req.query.threshold)) : undefined;
      const simulateHeavyRain = req.query.simulate === 'true';

      if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return res.status(400).json({ error: 'Invalid latitude or longitude parameters' });
      }

      const adapter = providerRegistry.getAdapter('open-meteo');
      const data = await adapter.fetchLocationData({
        lat,
        lon,
        name,
        country,
        timezone,
        thresholdOverride,
        simulateHeavyRain,
      });

      res.json(data);
    } catch (err: any) {
      console.error('Weather data fetch error:', err);
      res.status(502).json({
        error: 'Unable to retrieve data from meteorological provider',
        reason: err.message,
      });
    }
  });

  // Overview feed: returns real-time risk indicators for benchmark locations and supports simulation
  app.get('/api/overview-feed', async (req, res) => {
    try {
      const simulate = req.query.simulate === 'true';
      const adapter = providerRegistry.getAdapter('open-meteo');

      const results = await Promise.allSettled(
        BENCHMARK_LOCATIONS.map((loc, idx) => {
          // If simulation is enabled, simulate heavy rain on Kisumu (idx === 7 or loc.id === 'kisumu_ke')
          const shouldSimulateThisLocation = simulate && loc.id === 'kisumu_ke';
          return adapter.fetchLocationData({
            lat: loc.latitude,
            lon: loc.longitude,
            name: loc.name,
            country: loc.country,
            timezone: loc.timezone,
            simulateHeavyRain: shouldSimulateThisLocation,
          });
        })
      );

      const items = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map(r => r.value);

      res.json({
        items,
        isSimulated: simulate,
        simulatedLocationId: simulate ? 'kisumu_ke' : undefined,
        generatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error('Overview feed error:', err);
      res.status(500).json({ error: 'Failed to generate overview feed' });
    }
  });

  // Data sources metadata endpoint
  app.get('/api/sources', (req, res) => {
    const sources = providerRegistry.getAllProvidersMetadata();
    res.json({
      sources,
      systemStatus: 'nominal',
      updatedAt: new Date().toISOString(),
    });
  });

  // Mount Vite or serve static
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });

    // Intercept @vite/client to disable the WebSocket connection runner in iframe preview
    app.use((req, res, next) => {
      const url = req.url || '';
      if (url === '/@vite/client' || url.startsWith('/@vite/client?')) {
        const originalEnd = res.end;
        const originalWrite = res.write;
        const chunks: Buffer[] = [];

        res.write = function (chunk: any, ...args: any[]) {
          if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          return true;
        } as any;

        res.end = function (chunk: any, ...args: any[]) {
          if (chunk) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          let body = Buffer.concat(chunks).toString('utf-8');
          // Disarm WebSocket transport attempt in Vite client
          body = body.replace(
            /transport\.connect\(createHMRHandler\(handleMessage\)\);/g,
            '/* [vite:hmr disabled in preview] */'
          );
          body = body.replace(
            /reject\(\/\* @__PURE__ \*\/ new Error\("WebSocket closed without opened\."\)\);/g,
            'resolve();'
          );
          res.setHeader('Content-Length', Buffer.byteLength(body));
          return (originalEnd as any).apply(res, [body, ...args]);
        } as any;
      }
      next();
    });

    app.use(vite.middlewares);
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`SignalBridge server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
