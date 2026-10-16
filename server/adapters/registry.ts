import { WeatherProviderAdapter } from './providerInterface.js';
import { OpenMeteoAdapter } from './openMeteoAdapter.js';
import { ProviderCoverageInfo } from '../../shared/types.js';

export class ProviderRegistry {
  private adapters: Map<string, WeatherProviderAdapter> = new Map();

  constructor() {
    const openMeteo = new OpenMeteoAdapter();
    this.adapters.set(openMeteo.id, openMeteo);
  }

  getAdapter(id: string = 'open-meteo'): WeatherProviderAdapter {
    const adapter = this.adapters.get(id);
    if (!adapter) {
      return this.adapters.get('open-meteo')!;
    }
    return adapter;
  }

  getAllProvidersMetadata(): ProviderCoverageInfo[] {
    const list = Array.from(this.adapters.values()).map(a => a.getMetadata());

    // Planned extension adapters
    const futureSatelliteSource: ProviderCoverageInfo = {
      id: 'satellite-gpm-smap',
      provider: 'NASA GPM IMERG & SMAP Soil Moisture (Planned Adapter)',
      type: 'Satellite Remote Sensing',
      status: 'maintenance',
      lastSuccessfulImport: 'Pipeline configured for Milestone 2',
      cadenceText: 'See provider documentation (https://gpm.nasa.gov/data)',
      spatialResolutionText: 'See provider documentation (https://gpm.nasa.gov/data)',
      geographicCoverageText: 'Global (60°N - 60°S coverage corridor)',
      variables: [
        'Microwave precipitation rate',
        'Top 5cm Volumetric Soil Moisture (m³/m³)',
        'Cloud liquid water path',
      ],
      knownLimitations: [
        'Infrared rain estimates can suffer under cold cirrus clouds.',
        'Dense vegetation canopies attenuate L-band soil emission signals.',
      ],
      attribution: 'NASA Earth Science Division / JAXA Precipitation Processing System.',
      license: 'NASA Open Data Policy (Public Domain)',
      documentationUrl: 'https://gpm.nasa.gov/data',
    };

    const futureInSituSource: ProviderCoverageInfo = {
      id: 'insitu-hydrometric-telemetry',
      provider: 'Ground Hydrometric Station Network (Planned Adapter)',
      type: 'In-Situ Ground Station',
      status: 'maintenance',
      lastSuccessfulImport: 'Sensor API specification ready',
      cadenceText: 'See provider documentation',
      spatialResolutionText: 'Point observation (<1m)',
      geographicCoverageText: 'River basins, urban stormwater outfalls',
      variables: [
        'Tipping bucket rainfall gauge (0.2mm tip)',
        'Ultrasonic river stage / water level (m)',
        'Soil dielectric permittivity',
      ],
      knownLimitations: [
        'Point data may miss localized rain shafts occurring 2 km away.',
        'Sensor orifices can experience debris clogs during intense vegetative runoff.',
      ],
      attribution: 'National Hydro-Meteorological Services & Open Hydrology Mesh.',
      license: 'Public Sector Information (PSI)',
      documentationUrl: 'https://signalbridge.org/protocols/insitu',
    };

    return [...list, futureSatelliteSource, futureInSituSource];
  }
}

export const providerRegistry = new ProviderRegistry();
