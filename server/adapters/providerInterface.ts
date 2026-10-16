import { LocationWeatherData, ProviderCoverageInfo } from '../../shared/types.js';

export interface WeatherProviderAdapter {
  readonly id: string;
  readonly name: string;
  getMetadata(): ProviderCoverageInfo;
  fetchLocationData(params: {
    lat: number;
    lon: number;
    name?: string;
    country?: string;
    timezone?: string;
    thresholdOverride?: number;
    simulateHeavyRain?: boolean;
  }): Promise<LocationWeatherData>;
}
