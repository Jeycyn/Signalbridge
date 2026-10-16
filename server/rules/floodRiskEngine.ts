import { RiskRuleResult, RiskRuleInput } from '../../shared/types.js';

export interface EvaluateFloodRiskParams {
  locationId: string;
  locationName: string;
  hourlyPrecipitation48h: { time: string; precipitation: number }[];
  antecedentRain7d_mm: number;
  threshold_24h_mm?: number;
  sourceProvider: string;
  modelRunAt?: string;
  retrievedAt?: string;
}

export const FLOOD_RULE_VERSION = 'v1.2.0';
export const DEFAULT_RAIN_THRESHOLD_24H_MM = 30.0; // 30 mm in 24 hours is standard heavy rain threshold

export const CONFIDENCE_FUTURE_FACTORS = [
  'Forecast horizon (decay over forward hours)',
  'Data age (freshness relative to provider model run)',
  'Number of independent sources (multi-model consensus)',
];

export function evaluateFloodRiskRule(params: {
  locationId: string;
  locationName: string;
  hourlyPrecipitation48h: { time: string; precipitation: number }[];
  antecedentRain7d_mm: number;
  threshold_24h_mm?: number;
  sourceProvider: string;
  modelRunAt?: string;
  retrievedAt?: string;
}): RiskRuleResult {
  const threshold = params.threshold_24h_mm ?? DEFAULT_RAIN_THRESHOLD_24H_MM;
  
  // Sum first 24 hours
  const first24h = params.hourlyPrecipitation48h.slice(0, 24);
  const sum24h = first24h.reduce((acc, curr) => acc + (curr.precipitation || 0), 0);
  const sum48h = params.hourlyPrecipitation48h.reduce((acc, curr) => acc + (curr.precipitation || 0), 0);
  const maxHourlyPeak = Math.max(...params.hourlyPrecipitation48h.map(p => p.precipitation || 0), 0);

  // Peak time detection
  const peakRecord = params.hourlyPrecipitation48h.reduce(
    (max, curr) => (curr.precipitation > max.precipitation ? curr : max),
    { time: '', precipitation: 0 }
  );

  let riskLabel: RiskRuleResult['riskLabel'] = 'Low hazard signal';
  let riskSeverity: RiskRuleResult['riskSeverity'] = 'low';
  // Strict requirement 2: remove hardcoded confidence; must show 'not assessed' until a documented method exists
  const confidence: RiskRuleResult['confidence'] = 'not assessed';
  let forecastWindowText = 'Forecast: minimal heavy precipitation expected';
  const practicalNextSteps: string[] = [];

  const round = (num: number) => Math.round(num * 10) / 10;
  const measured24h = round(sum24h);
  const measured48h = round(sum48h);

  const comparisonWord = measured24h >= threshold ? 'above' : 'below';
  const whatThisMeans = `Forecast rain for the next 24 hours is ${measured24h} mm, ${comparisonWord} the ${threshold} mm threshold (rule ${FLOOD_RULE_VERSION}). This is a rainfall-only check and does not account for drainage, terrain or river levels.`;

  if (measured24h >= threshold * 2.0 || (measured24h >= threshold && maxHourlyPeak >= 15)) {
    riskLabel = 'Severe flood risk';
    riskSeverity = 'high';
    forecastWindowText = `Forecast: heavy rain (${measured24h} mm / 24h, 48h total: ${measured48h} mm)`;
    practicalNextSteps.push(
      'Consult official meteorological and local emergency management advisories.',
      'Check local drainage points and avoid known flood-prone transit routes.'
    );
  } else if (measured24h >= threshold) {
    riskLabel = 'Heavy rain outlook';
    riskSeverity = 'elevated';
    forecastWindowText = `Forecast: heavy rain (${measured24h} mm / 24h, 48h total: ${measured48h} mm)`;
    practicalNextSteps.push(
      'Monitor local meteorological updates as forecast approaches.',
      'Check that property perimeter drains and gutters are free of debris.'
    );
  } else if (measured24h >= threshold * 0.5) {
    riskLabel = 'Moderate rain alert';
    riskSeverity = 'moderate';
    forecastWindowText = `Forecast: moderate precipitation (${measured24h} mm in 24h, ${measured48h} mm in 48h)`;
    practicalNextSteps.push(
      'Standard precautionary awareness. Review upcoming hourly forecasts.'
    );
  } else {
    riskLabel = 'Low hazard signal';
    riskSeverity = 'low';
    forecastWindowText = `Forecast: light or no precipitation (${measured24h} mm over 24h)`;
    practicalNextSteps.push(
      'Standard baseline operations. No precautionary flood interventions indicated by current rainfall forecast.'
    );
  }

  const inputs: RiskRuleInput[] = [
    {
      variableName: 'precipitation_sum_24h_forecast',
      label: '24-Hour Forecast Rain Sum',
      value: measured24h,
      unit: 'mm',
      source: params.sourceProvider,
      model_run_at: params.modelRunAt,
      retrieved_at: params.retrievedAt,
    },
    {
      variableName: 'precipitation_sum_48h_forecast',
      label: '48-Hour Forecast Rain Sum',
      value: measured48h,
      unit: 'mm',
      source: params.sourceProvider,
      model_run_at: params.modelRunAt,
      retrieved_at: params.retrievedAt,
    },
    {
      variableName: 'hourly_peak_intensity',
      label: 'Maximum Hourly Peak Rate',
      value: round(maxHourlyPeak),
      unit: 'mm/h',
      source: params.sourceProvider,
      model_run_at: params.modelRunAt,
      retrieved_at: params.retrievedAt,
    },
    {
      variableName: 'antecedent_precipitation_7d',
      label: '7-Day Prior Rainfall History',
      value: round(params.antecedentRain7d_mm),
      unit: 'mm',
      source: `${params.sourceProvider} (Past Days)`,
      model_run_at: params.modelRunAt,
      retrieved_at: params.retrievedAt,
    },
    {
      variableName: 'threshold_rule_trigger',
      label: 'Configured Rain Threshold',
      value: threshold,
      unit: 'mm/24h',
      source: 'SignalBridge Operational Policy',
    },
  ];

  return {
    ruleId: 'FL-RAIN-24H',
    ruleVersion: FLOOD_RULE_VERSION,
    ruleName: '24h Precipitation Accumulation Flood Outlook Rule',
    evaluatedAt: new Date().toISOString(),
    locationId: params.locationId,
    locationName: params.locationName,
    riskLabel,
    riskSeverity,
    confidence,
    confidenceNote: 'Confidence calculation is not assessed pending formal methodology documentation.',
    confidenceFutureFactors: CONFIDENCE_FUTURE_FACTORS,
    forecastWindowText,
    whatThisMeans,
    practicalNextSteps,
    thresholdValue: threshold,
    measuredValue: measured24h,
    thresholdUnit: 'mm/24h',
    inputs,
    ruleLogicDescription: `Computes cumulative precipitation over the next 24 forecast hours from NWP models. Compares against threshold T (${threshold} mm). Severity triggers: >= 2*T = Severe, >= T = Heavy, >= 0.5*T = Moderate, < 0.5*T = Low. This is a rainfall-only evaluation.`,
    officialSourceDisclaimer: 'SignalBridge complements, and never replaces, official meteorological and emergency authorities. In case of imminent threat, adhere exclusively to instructions from civil protection authorities.',
  };
}
