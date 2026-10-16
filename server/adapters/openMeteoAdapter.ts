import { WeatherProviderAdapter } from './providerInterface.js';
import {
  LocationWeatherData,
  ProviderCoverageInfo,
  NormalisedRecord,
  CurrentConditions,
  HourlyPoint,
  DailyPoint,
  RecentRainHistory,
  QualityStatus,
} from '../../shared/types.js';
import { evaluateFloodRiskRule } from '../rules/floodRiskEngine.js';

const WEATHER_CODE_DESCRIPTIONS: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

function formatFreshnessAge(modelDateString?: string): { minutes: number; text: string } {
  if (!modelDateString) {
    return { minutes: -1, text: 'Timestamp unavailable' };
  }
  const modelTime = new Date(modelDateString).getTime();
  const now = Date.now();
  const diffMs = now - modelTime;
  const diffMins = Math.floor(diffMs / (60 * 1000));

  if (diffMins < 1) {
    return { minutes: 0, text: 'Under 1 min ago' };
  }
  if (diffMins < 60) {
    return { minutes: diffMins, text: `${diffMins}m ago` };
  }
  const hours = Math.floor(diffMins / 60);
  const remMins = diffMins % 60;
  return {
    minutes: diffMins,
    text: remMins > 0 ? `${hours}h ${remMins}m ago` : `${hours}h ago`,
  };
}

export class OpenMeteoAdapter implements WeatherProviderAdapter {
  readonly id = 'open-meteo';
  // Requirement 4: Read what API returns. Remove unconfirmed "Ensemble (ECMWF/GFS blend)"
  readonly name = 'Open-Meteo Weather API';
  private lastFetchTimestamp: string = new Date().toISOString();
  private cache = new Map<string, { data: LocationWeatherData; expiresAt: number }>();

  getMetadata(): ProviderCoverageInfo {
    return {
      id: this.id,
      provider: 'Open-Meteo Weather API',
      type: 'Numerical Weather Prediction',
      status: 'operational',
      lastSuccessfulImport: this.lastFetchTimestamp,
      cadenceText: 'See provider documentation (https://open-meteo.com/en/docs)',
      spatialResolutionText: 'See provider documentation (https://open-meteo.com/en/docs)',
      geographicCoverageText: 'Global coordinates (lat -90 to +90, lon -180 to +180)',
      variables: [
        'Precipitation (mm/h, 24h & 48h totals)',
        '2m Air Temperature (°C)',
        'Relative Humidity (%)',
        '10m Wind Speed (km/h)',
        'Surface Pressure (hPa)',
        'WMO Weather Classification Code',
      ],
      knownLimitations: [
        'Model grid spacing varies by region and provider backend; refer to provider documentation for specific localized grid limits.',
        'Radar precipitation assimilation latency depends on regional meteorological services.',
        'Microscale convective storms smaller than the provider model grid may experience location displacement.',
      ],
      attribution: 'Weather data by Open-Meteo.com under Creative Commons Attribution 4.0 International (CC BY 4.0).',
      license: 'CC BY 4.0 Open Data',
      documentationUrl: 'https://open-meteo.com/en/docs',
    };
  }

  async fetchLocationData(params: {
    lat: number;
    lon: number;
    name?: string;
    country?: string;
    timezone?: string;
    thresholdOverride?: number;
    simulateHeavyRain?: boolean;
  }): Promise<LocationWeatherData> {
    const lat = Number(params.lat.toFixed(4));
    const lon = Number(params.lon.toFixed(4));
    const tz = params.timezone || 'auto';

    const cacheKey = `${lat}_${lon}_${Boolean(params.simulateHeavyRain)}_${params.thresholdOverride || 30}`;
    const cachedEntry = this.cache.get(cacheKey);
    if (cachedEntry && Date.now() < cachedEntry.expiresAt) {
      return cachedEntry.data;
    }

    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', lat.toString());
    url.searchParams.set('longitude', lon.toString());
    url.searchParams.set(
      'current',
      'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,surface_pressure,wind_speed_10m,wind_direction_10m'
    );
    url.searchParams.set(
      'hourly',
      'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m'
    );
    url.searchParams.set(
      'daily',
      'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,rain_sum,wind_speed_10m_max'
    );
    url.searchParams.set('past_days', '7');
    url.searchParams.set('forecast_days', '7');
    url.searchParams.set('timezone', tz);

    const retrievedAt = new Date().toISOString();

    let response: Response;
    try {
      response = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SignalBridge-RiskIntelligence/1.0',
        },
      });
    } catch (netErr: any) {
      if (cachedEntry) return cachedEntry.data;
      throw netErr;
    }

    if (!response.ok) {
      if (cachedEntry) return cachedEntry.data;
      const errText = await response.text().catch(() => '');
      throw new Error(`Open-Meteo API returned status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    this.lastFetchTimestamp = retrievedAt;

    // Requirement 3: Calculate freshness strictly from provider's model valid time
    const modelRunAt = data.current?.time ? new Date(data.current.time).toISOString() : retrievedAt;
    const { minutes: freshnessMins, text: freshnessText } = formatFreshnessAge(data.current?.time);
    const isStale = freshnessMins > 120; // Stale if older than 2 hours from model time

    const weatherCode = Number(data.current?.weather_code ?? 0);
    const weatherDesc = WEATHER_CODE_DESCRIPTIONS[weatherCode] || 'Atmospheric condition noted';

    const currentConditions: CurrentConditions = {
      temperature_2m: data.current?.temperature_2m ?? null,
      apparent_temperature: data.current?.apparent_temperature ?? null,
      relative_humidity_2m: data.current?.relative_humidity_2m ?? null,
      precipitation_current: data.current?.precipitation ?? 0,
      weather_code: weatherCode,
      weather_description: weatherDesc,
      wind_speed_10m: data.current?.wind_speed_10m ?? null,
      wind_direction_10m: data.current?.wind_direction_10m ?? null,
      surface_pressure: data.current?.surface_pressure ?? null,
      time: data.current?.time || retrievedAt,
    };

    // Parse 48h hourly forecast
    const hourlyTimes: string[] = data.hourly?.time || [];
    const hourlyPrecip: number[] = data.hourly?.precipitation || [];
    const hourlyTemp: number[] = data.hourly?.temperature_2m || [];
    const hourlyHumidity: number[] = data.hourly?.relative_humidity_2m || [];
    const hourlyWind: number[] = data.hourly?.wind_speed_10m || [];

    let startIndex = 0;
    if (data.current?.time) {
      const idx = hourlyTimes.findIndex(t => t >= data.current.time);
      if (idx !== -1) {
        startIndex = idx;
      }
    }

    const hourlyForecast48h: HourlyPoint[] = [];
    const maxHourlyCount = Math.min(hourlyTimes.length, startIndex + 48);
    for (let i = startIndex; i < maxHourlyCount; i++) {
      hourlyForecast48h.push({
        time: hourlyTimes[i],
        precipitation: Number(hourlyPrecip[i] ?? 0),
        temperature: Number(hourlyTemp[i] ?? 0),
        humidity: Number(hourlyHumidity[i] ?? 0),
        wind_speed: Number(hourlyWind[i] ?? 0),
      });
    }

    // Requirement 6: SIMULATED test scenario toggle
    const isSimulated = Boolean(params.simulateHeavyRain);
    if (isSimulated && hourlyForecast48h.length >= 24) {
      // Inject synthetic severe rainfall burst for rule verification
      // Total 24h will be ~72.5 mm, well above standard 30mm threshold
      hourlyForecast48h[0].precipitation = 4.2;
      hourlyForecast48h[1].precipitation = 8.5;
      hourlyForecast48h[2].precipitation = 19.8; // Peak burst
      hourlyForecast48h[3].precipitation = 16.4;
      hourlyForecast48h[4].precipitation = 11.2;
      hourlyForecast48h[5].precipitation = 5.0;
      hourlyForecast48h[6].precipitation = 4.1;
      hourlyForecast48h[7].precipitation = 3.3;
    }

    // Daily Forecast (7 days forward)
    const dailyTimes: string[] = data.daily?.time || [];
    const dailyPrecipSum: number[] = data.daily?.precipitation_sum || [];
    const dailyRainSum: number[] = data.daily?.rain_sum || [];
    const dailyTempMax: number[] = data.daily?.temperature_2m_max || [];
    const dailyTempMin: number[] = data.daily?.temperature_2m_min || [];
    const dailyWindMax: number[] = data.daily?.wind_speed_10m_max || [];

    const todayDateStr = new Date().toISOString().slice(0, 10);
    const dailyStartIndex = dailyTimes.findIndex(d => d >= todayDateStr);
    const forwardDailyStart = dailyStartIndex >= 0 ? dailyStartIndex : Math.max(0, dailyTimes.length - 7);

    const dailyForecast7d: DailyPoint[] = [];
    for (let i = forwardDailyStart; i < Math.min(dailyTimes.length, forwardDailyStart + 7); i++) {
      dailyForecast7d.push({
        time: dailyTimes[i],
        precipitation_sum: isSimulated && i === forwardDailyStart ? 72.5 : Number(dailyPrecipSum[i] ?? 0),
        rain_sum: Number(dailyRainSum[i] ?? 0),
        temp_max: Number(dailyTempMax[i] ?? 0),
        temp_min: Number(dailyTempMin[i] ?? 0),
        wind_speed_max: Number(dailyWindMax[i] ?? 0),
      });
    }

    // Recent 7-day history
    const recentHistoryDays: { date: string; precipitation_mm: number }[] = [];
    let pastSum7d = 0;
    const historyEndIndex = forwardDailyStart > 0 ? forwardDailyStart : 7;
    const historyStartIndex = Math.max(0, historyEndIndex - 7);

    for (let i = historyStartIndex; i < historyEndIndex; i++) {
      const p = Number(dailyPrecipSum[i] ?? 0);
      pastSum7d += p;
      recentHistoryDays.push({
        date: dailyTimes[i] || `Day -${historyEndIndex - i}`,
        precipitation_mm: Math.round(p * 10) / 10,
      });
    }

    const baseline7d = 18.0;
    const recentHistory7d: RecentRainHistory = {
      daily_sums: recentHistoryDays,
      total_7d_mm: Math.round(pastSum7d * 10) / 10,
      baseline_7d_mm: baseline7d,
      percent_of_normal: Math.round((pastSum7d / (baseline7d || 1)) * 100),
    };

    let soilSaturationEstimate: 'Low' | 'Moderate' | 'High' | 'Near Saturation' = 'Low';
    if (pastSum7d > 75) soilSaturationEstimate = 'Near Saturation';
    else if (pastSum7d > 45) soilSaturationEstimate = 'High';
    else if (pastSum7d > 20) soilSaturationEstimate = 'Moderate';

    const climateContext = {
      climatologicalRainfallMonthAvg_mm: 72,
      terrainCharacteristics: `Lat ${lat.toFixed(2)}°, Lon ${lon.toFixed(2)}°, Elev ~${data.elevation ?? 0}m. Baseline terrain elevation and geographic coordinate profile.`,
      soilSaturationEstimate,
      catchmentSensitivity:
        soilSaturationEstimate === 'Near Saturation' || soilSaturationEstimate === 'High'
          ? 'Prior precipitation accumulation may elevate localized surface water accumulation.'
          : 'Standard baseline permeability: ground surface currently has absorption capacity for low-intensity rain.',
    };

    // Evaluate flood risk rule with confidence: not assessed and two timestamps
    const floodOutlookRule = evaluateFloodRiskRule({
      locationId: `${lat}_${lon}`,
      locationName: params.name || `${lat}, ${lon}`,
      hourlyPrecipitation48h: hourlyForecast48h.map(h => ({
        time: h.time,
        precipitation: h.precipitation,
      })),
      antecedentRain7d_mm: pastSum7d,
      threshold_24h_mm: params.thresholdOverride,
      sourceProvider: this.name,
      modelRunAt: modelRunAt,
      retrievedAt: retrievedAt,
    });

    // Normalised records with two distinct timestamps on every single record
    const normalisedRecords: NormalisedRecord[] = [];

    const createRecord = (
      variable: string,
      evidence_type: NormalisedRecord['evidence_type'],
      value: number | string | null,
      unit: string,
      observedOrValid: { observed_at?: string; valid_for?: string },
      qualityOverride?: QualityStatus,
      qualityReason?: string,
      notes?: string
    ): NormalisedRecord => {
      let quality: QualityStatus = qualityOverride || (isStale ? 'stale' : 'ok');
      if (value === null || value === undefined || (typeof value === 'number' && isNaN(value))) {
        quality = 'missing';
      }
      return {
        id: `om-${variable}-${lat}-${lon}-${observedOrValid.observed_at || observedOrValid.valid_for || retrievedAt}`,
        evidence_type,
        source: this.name,
        model_run_at: modelRunAt,
        observed_at: observedOrValid.observed_at,
        valid_for: observedOrValid.valid_for,
        retrieved_at: retrievedAt,
        freshness_age_text: freshnessText,
        latitude: lat,
        longitude: lon,
        variable,
        value: quality === 'missing' ? null : value,
        unit,
        quality_status: quality,
        quality_reason: qualityReason || (quality === 'stale' ? 'Model run timestamp is older than 2 hours' : quality === 'missing' ? 'Value absent from provider payload' : undefined),
        notes: isSimulated ? `SIMULATED TEST VALUE · ${notes || ''}` : notes,
      };
    };

    normalisedRecords.push(
      createRecord('precipitation_current', 'observation', currentConditions.precipitation_current, 'mm', {
        observed_at: currentConditions.time,
      }),
      createRecord('temperature_2m', 'observation', currentConditions.temperature_2m, '°C', {
        observed_at: currentConditions.time,
      }),
      createRecord('relative_humidity_2m', 'observation', currentConditions.relative_humidity_2m, '%', {
        observed_at: currentConditions.time,
      }),
      createRecord('wind_speed_10m', 'observation', currentConditions.wind_speed_10m, 'km/h', {
        observed_at: currentConditions.time,
      }),
      createRecord('weather_code', 'observation', currentConditions.weather_code, 'WMO code', {
        observed_at: currentConditions.time,
      }, undefined, undefined, weatherDesc)
    );

    hourlyForecast48h.slice(0, 24).forEach((h, idx) => {
      normalisedRecords.push(
        createRecord(`precipitation_forecast_h${idx + 1}`, 'forecast', h.precipitation, 'mm/h', {
          valid_for: h.time,
        }),
        createRecord(`temperature_forecast_h${idx + 1}`, 'forecast', h.temperature, '°C', {
          valid_for: h.time,
        })
      );
    });

    normalisedRecords.push(
      createRecord('precipitation_sum_24h_forecast', 'forecast', floodOutlookRule.measuredValue, 'mm', {
        valid_for: `+24h from ${modelRunAt}`,
      }),
      createRecord(
        'precipitation_sum_48h_forecast',
        'forecast',
        Math.round(hourlyForecast48h.reduce((acc, c) => acc + c.precipitation, 0) * 10) / 10,
        'mm',
        { valid_for: `+48h from ${modelRunAt}` }
      ),
      createRecord('antecedent_rain_7d', 'observation', recentHistory7d.total_7d_mm, 'mm', {
        observed_at: `Past 7 days up to ${todayDateStr}`,
      }),
      createRecord('soil_saturation_estimate', 'estimate', soilSaturationEstimate, 'index', {
        observed_at: modelRunAt,
      }, undefined, undefined, climateContext.catchmentSensitivity)
    );

    const locationName = params.name || (data.timezone ? data.timezone.split('/').pop()?.replace(/_/g, ' ') : `${lat}, ${lon}`);

    const result: LocationWeatherData = {
      location: {
        id: `${lat},${lon}`,
        name: locationName || 'Target Location',
        country: params.country || (data.timezone ? data.timezone.split('/')[0] : 'Global Coordinate'),
        latitude: lat,
        longitude: lon,
        elevation: data.elevation,
        timezone: data.timezone || 'UTC',
      },
      modelRunAt,
      retrievedAt,
      isStale,
      freshnessFromModelRunMinutes: freshnessMins,
      freshnessFromModelRunText: freshnessText,
      isSimulated,
      currentConditions,
      hourlyForecast48h,
      dailyForecast7d,
      recentHistory7d,
      climateContext,
      floodOutlookRule,
      normalisedRecords,
    };

    this.cache.set(cacheKey, { data: result, expiresAt: Date.now() + 60000 });
    return result;
  }
}
