/**
 * SignalBridge - Common Portable Data Model and Types
 */

export type EvidenceType = 'observation' | 'forecast' | 'estimate' | 'report';

export type QualityStatus = 'ok' | 'stale' | 'missing';

export interface NormalisedRecord {
  id: string;
  evidence_type: EvidenceType;
  source: string;
  model_run_at?: string;  // Valid for / model run (from provider's payload)
  observed_at?: string;   // ISO string when observed
  valid_for?: string;     // ISO string for forecast validity window
  retrieved_at: string;   // When SignalBridge retrieved it from the provider
  latitude: number;
  longitude: number;
  variable: string;
  value: number | string | null;
  unit: string;
  quality_status: QualityStatus;
  quality_reason?: string;
  freshness_age_text?: string;
  notes?: string;
}

export interface LocationInfo {
  id: string;
  name: string;
  country: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  elevation?: number;
  timezone: string;
  country_code?: string;
}

export interface CurrentConditions {
  temperature_2m: number | null;
  apparent_temperature?: number | null;
  relative_humidity_2m: number | null;
  precipitation_current: number | null;
  weather_code: number;
  weather_description: string;
  wind_speed_10m: number | null;
  wind_direction_10m?: number | null;
  surface_pressure?: number | null;
  time: string; // Provider valid time
}

export interface HourlyPoint {
  time: string;
  precipitation: number;
  temperature: number;
  humidity: number;
  wind_speed: number;
}

export interface DailyPoint {
  time: string;
  precipitation_sum: number;
  rain_sum: number;
  temp_max: number;
  temp_min: number;
  wind_speed_max?: number;
}

export interface RecentRainHistory {
  daily_sums: { date: string; precipitation_mm: number }[];
  total_7d_mm: number;
  baseline_7d_mm: number;
  percent_of_normal: number;
}

export interface RiskRuleInput {
  variableName: string;
  label: string;
  value: number | string | null;
  unit: string;
  recordId?: string;
  source: string;
  model_run_at?: string;
  retrieved_at?: string;
}

export interface RiskRuleResult {
  ruleId: string;
  ruleVersion: string;
  ruleName: string;
  evaluatedAt: string;
  locationId: string;
  locationName: string;
  riskLabel: 'Low hazard signal' | 'Moderate rain alert' | 'Heavy rain outlook' | 'Severe flood risk';
  riskSeverity: 'low' | 'moderate' | 'elevated' | 'high';
  confidence: 'not assessed';
  confidenceNote: string;
  confidenceFutureFactors: string[];
  forecastWindowText: string;
  whatThisMeans: string;
  practicalNextSteps: string[];
  thresholdValue: number;
  measuredValue: number;
  thresholdUnit: string;
  inputs: RiskRuleInput[];
  ruleLogicDescription: string;
  officialSourceDisclaimer: string;
}

export interface ProviderCoverageInfo {
  id: string;
  provider: string;
  type: 'Numerical Weather Prediction' | 'Satellite Remote Sensing' | 'In-Situ Ground Station' | 'Hydrological Model';
  status: 'operational' | 'degraded' | 'maintenance';
  lastSuccessfulImport: string;
  cadenceText: string;
  spatialResolutionText: string;
  geographicCoverageText: string;
  variables: string[];
  knownLimitations: string[];
  attribution: string;
  license: string;
  documentationUrl: string;
}

export interface LocationWeatherData {
  location: LocationInfo;
  modelRunAt: string;  // Valid for / model run (from provider data)
  retrievedAt: string; // Retrieved at (when we fetched it)
  isStale: boolean;
  freshnessFromModelRunMinutes: number;
  freshnessFromModelRunText: string;
  isSimulated?: boolean;
  currentConditions: CurrentConditions;
  hourlyForecast48h: HourlyPoint[];
  dailyForecast7d: DailyPoint[];
  recentHistory7d: RecentRainHistory;
  climateContext: {
    climatologicalRainfallMonthAvg_mm: number;
    terrainCharacteristics: string;
    soilSaturationEstimate: 'Low' | 'Moderate' | 'High' | 'Near Saturation';
    catchmentSensitivity: string;
  };
  floodOutlookRule: RiskRuleResult;
  normalisedRecords: NormalisedRecord[];
}
