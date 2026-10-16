import React, { useState } from 'react';
import {
  ArrowLeft,
  MapPin,
  Clock,
  CloudRain,
  Wind,
  Thermometer,
  Droplets,
  Gauge,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  FileText,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { LocationWeatherData } from '../../shared/types.js';
import { LeafletMap } from './LeafletMap';
import { RuleAuditModal } from './RuleAuditModal';
import { formatDateTime } from '../services/api';

interface LocationProfileViewProps {
  data: LocationWeatherData;
  onBack: () => void;
  onThresholdChange?: (newThreshold: number) => void;
}

export const LocationProfileView: React.FC<LocationProfileViewProps> = ({
  data,
  onBack,
  onThresholdChange,
}) => {
  const [showRuleAudit, setShowRuleAudit] = useState(false);
  const [activeThreshold, setActiveThreshold] = useState(
    data.floodOutlookRule.thresholdValue || 30
  );
  const [showRawRecords, setShowRawRecords] = useState(false);

  const rule = data.floodOutlookRule;
  const isHigh = rule.riskSeverity === 'high';
  const isElevated = rule.riskSeverity === 'elevated';
  const isMod = rule.riskSeverity === 'moderate';

  const handleUpdateThreshold = (newVal: number) => {
    setActiveThreshold(newVal);
    if (onThresholdChange) {
      onThresholdChange(newVal);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50">
      {/* Profile Header Bar */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-1.5 rounded border border-slate-300 hover:bg-slate-100 text-slate-700 transition"
              aria-label="Back to overview"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                  {data.location.name}
                </h2>
                <span className="text-xs text-slate-500 font-medium">
                  {data.location.country}
                </span>
                {data.isSimulated && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                    SIMULATED ACTIVE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                <span className="font-mono">
                  {data.location.latitude.toFixed(4)}°, {data.location.longitude.toFixed(4)}°
                </span>
                <span>·</span>
                <span>Timezone: {data.location.timezone}</span>
                {data.location.elevation !== undefined && (
                  <>
                    <span>·</span>
                    <span>Elev: {data.location.elevation}m</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Requirement 3: Separate Timestamps in Header */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded">
            <div>
              <span className="text-slate-500 text-[11px] block">Valid for / model run:</span>
              <span className="font-mono font-medium text-slate-800">
                {formatDateTime(data.modelRunAt)} (valid time; provider gives no model run time)
              </span>
            </div>
            <span className="hidden sm:inline text-slate-300">|</span>
            <div>
              <span className="text-slate-500 text-[11px] block">Retrieved at:</span>
              <span className="font-mono text-slate-600">
                {formatDateTime(data.retrievedAt)}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* Top Grid: Exact Side Card Style & Focused Map */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Side Card in exact requested style */}
          <div className="lg:col-span-5 bg-white border border-slate-300 rounded-lg p-5 shadow-xs flex flex-col justify-between">
            <div>
              {/* Header: "Flood risk - <place>" */}
              <div className="pb-3 border-b border-slate-100">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Hydrological Threat Outlook
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-0.5">
                  Flood risk - {data.location.name}
                </h3>
              </div>

              {/* Risk Label */}
              <div className="mt-4 flex items-center gap-2">
                <div
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold border ${
                    isHigh
                      ? 'bg-red-50 text-red-700 border-red-300'
                      : isElevated
                      ? 'bg-amber-50 text-amber-700 border-amber-300'
                      : isMod
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-slate-50 text-slate-700 border-slate-300'
                  }`}
                >
                  {(isHigh || isElevated) && (
                    <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  )}
                  <span>{rule.riskLabel}</span>
                </div>
                <span className="text-xs text-slate-500 font-mono">
                  Rule {rule.ruleId} ({rule.ruleVersion})
                </span>
              </div>

              {/* Forecast: heavy rain (next 24-48 hours) */}
              <div className="mt-3">
                <span className="text-xs font-semibold text-slate-900 block">
                  {rule.forecastWindowText}
                </span>
              </div>

              {/* Requirement 2: Confidence: not assessed + list of factors that will later feed it */}
              <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-800">Confidence:</span>
                  <span className="font-mono text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                    not assessed
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 pt-1.5 border-t border-slate-200">
                  <span className="font-semibold text-slate-700 block mb-1">
                    Future evaluation factors (to be documented):
                  </span>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-600">
                    <li>Forecast horizon (confidence decay over 24h/48h window)</li>
                    <li>Data age (time elapsed since provider model run)</li>
                    <li>Number of independent sources (multi-model consensus)</li>
                  </ul>
                </div>
              </div>

              {/* "What this means" paragraph */}
              <div className="mt-4 bg-slate-50 border border-slate-200 rounded p-3">
                <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider block">
                  What this means
                </span>
                <p className="mt-1 text-xs text-slate-700 leading-relaxed">
                  {rule.whatThisMeans}
                </p>
              </div>

              {/* Practical Next Steps */}
              {rule.practicalNextSteps.length > 0 && (
                <div className="mt-3">
                  <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider block">
                    Practical Next Steps
                  </span>
                  <ul className="mt-1 text-xs text-slate-600 space-y-1 list-disc list-inside">
                    {rule.practicalNextSteps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Bottom: "View details" button + two separate timestamps */}
            <div className="mt-6 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-[11px] text-slate-500">
                <div>
                  <strong>Valid for / model run:</strong> {formatDateTime(data.modelRunAt)} (valid time; provider gives no model run time)
                </div>
                <div>
                  <strong>Retrieved at:</strong> {formatDateTime(data.retrievedAt)}
                </div>
              </div>
              <button
                onClick={() => setShowRuleAudit(true)}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium transition shadow-xs shrink-0 self-end sm:self-auto"
              >
                View details
              </button>
            </div>
          </div>

          {/* Small Interactive Map Column */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-3 shadow-xs flex flex-col h-[380px] lg:h-auto">
            <div className="flex items-center justify-between px-1 pb-2 border-b border-slate-100 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                <MapPin className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
                <span>Geographic Target Coordinates</span>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                {data.location.latitude.toFixed(4)}°, {data.location.longitude.toFixed(4)}°
              </span>
            </div>
            <div className="flex-1 mt-2 min-h-0 relative rounded overflow-hidden">
              <LeafletMap
                locations={[data]}
                selectedLocation={data}
                onSelectLocation={() => {}}
                center={[data.location.latitude, data.location.longitude]}
                zoom={11}
                showOutlookLayer={true}
              />
            </div>
            <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500">
              <span>OpenStreetMap Standard Tiles</span>
              <span>Radius: 20–35 km outlook area</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SEPARATE LABELLED SECTIONS: Observed, Forecast, Estimated
            ========================================================================= */}

        {/* SECTION 1: OBSERVED DATA */}
        <section aria-labelledby="section-observed-title" className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded uppercase tracking-wider">
                  Observed Data
                </span>
                <span className="text-xs text-slate-500">
                  Current atmospheric sensors & reanalysis ground records
                </span>
              </div>
              <h3 id="section-observed-title" className="text-base font-semibold text-slate-900 mt-1">
                Current Conditions & 7-Day Rain History
              </h3>
            </div>
            <div className="text-left sm:text-right text-[11px] text-slate-500">
              <div>
                <strong>Valid for / model run:</strong> {formatDateTime(data.modelRunAt)} ({data.freshnessFromModelRunText})
              </div>
              <div>
                <strong>Retrieved at:</strong> {formatDateTime(data.retrievedAt)}
              </div>
            </div>
          </div>

          {/* Current Conditions Metrics */}
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div className="bg-slate-50 border border-slate-200 rounded p-3">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Thermometer className="w-3.5 h-3.5" aria-hidden="true" />
                <span>2m Temp</span>
              </div>
              <div className="text-base font-bold text-slate-900">
                {data.currentConditions.temperature_2m !== null
                  ? `${data.currentConditions.temperature_2m} °C`
                  : 'Data unavailable'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Feels: {data.currentConditions.apparent_temperature ?? 'N/A'} °C
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded p-3">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <CloudRain className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Precip Rate</span>
              </div>
              <div className="text-base font-bold text-slate-900">
                {data.currentConditions.precipitation_current !== null
                  ? `${data.currentConditions.precipitation_current} mm`
                  : 'Data unavailable'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Current rate</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded p-3">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Droplets className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Rel Humidity</span>
              </div>
              <div className="text-base font-bold text-slate-900">
                {data.currentConditions.relative_humidity_2m !== null
                  ? `${data.currentConditions.relative_humidity_2m} %`
                  : 'Data unavailable'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Surface level</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded p-3">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Wind className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Wind Speed</span>
              </div>
              <div className="text-base font-bold text-slate-900">
                {data.currentConditions.wind_speed_10m !== null
                  ? `${data.currentConditions.wind_speed_10m} km/h`
                  : 'Data unavailable'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">10m standard</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded p-3">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Gauge className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Pressure</span>
              </div>
              <div className="text-base font-bold text-slate-900">
                {data.currentConditions.surface_pressure != null
                  ? `${Math.round(data.currentConditions.surface_pressure)} hPa`
                  : 'Data unavailable'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Barometric</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded p-3">
              <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                <Info className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Condition</span>
              </div>
              <div className="text-xs font-semibold text-slate-900 leading-tight">
                {data.currentConditions.weather_description}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                WMO Code {data.currentConditions.weather_code}
              </div>
            </div>
          </div>

          {/* 7-Day Rain History Bars */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                7-Day Antecedent Rain History (Precipitation Infiltration Base)
              </h4>
              <div className="flex items-center gap-4 text-xs text-slate-600">
                <span>
                  <strong>7-Day Total:</strong> {data.recentHistory7d.total_7d_mm} mm
                </span>
                <span>·</span>
                <span>
                  <strong>Climatic Normal:</strong> {data.recentHistory7d.baseline_7d_mm} mm
                </span>
                <span>·</span>
                <span className="font-semibold text-slate-800">
                  {data.recentHistory7d.percent_of_normal}% of weekly baseline
                </span>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {data.recentHistory7d.daily_sums.map((day, idx) => {
                const maxHistoryVal = Math.max(
                  ...data.recentHistory7d.daily_sums.map(d => d.precipitation_mm),
                  15
                );
                const heightPct = Math.min(100, Math.round((day.precipitation_mm / maxHistoryVal) * 100));

                return (
                  <div key={idx} className="bg-slate-50 border border-slate-200 rounded p-2 text-center flex flex-col justify-between">
                    <span className="text-[10px] text-slate-500 block truncate">
                      {day.date.slice(5)}
                    </span>
                    <div className="h-16 flex items-end justify-center my-1">
                      <div
                        style={{ height: `${Math.max(8, heightPct)}%` }}
                        className={`w-4 rounded-t ${
                          day.precipitation_mm > 15 ? 'bg-amber-600' : 'bg-teal-700'
                        }`}
                        title={`${day.date}: ${day.precipitation_mm} mm`}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-800">
                      {day.precipitation_mm} <span className="text-[10px] font-normal text-slate-500">mm</span>
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-[11px] text-slate-500 flex flex-wrap items-center justify-between gap-2">
              <span>Observed Antecedent records provide direct input to topsoil saturation estimates.</span>
              <span>
                Valid for: {formatDateTime(data.modelRunAt)} · Retrieved at: {formatDateTime(data.retrievedAt)}
              </span>
            </div>
          </div>
        </section>

        {/* SECTION 2: FORECAST DATA */}
        <section aria-labelledby="section-forecast-title" className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-800 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded uppercase tracking-wider">
                  Forecast Data
                </span>
                <span className="text-xs text-slate-500">
                  Forward numerical weather prediction model output
                </span>
              </div>
              <h3 id="section-forecast-title" className="text-base font-semibold text-slate-900 mt-1">
                48-Hour Hourly Precipitation Outlook & 7-Day Forecast
              </h3>
            </div>
            <div className="text-left sm:text-right text-[11px] text-slate-500">
              <div>
                <strong>Valid for / model run:</strong> {formatDateTime(data.modelRunAt)} ({data.freshnessFromModelRunText})
              </div>
              <div>
                <strong>Retrieved at:</strong> {formatDateTime(data.retrievedAt)}
              </div>
            </div>
          </div>

          {/* 48-Hour Hourly Sequence */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider">
                Hourly Forecast Timeline (Next 48 Hours)
              </span>
              <span className="text-[11px] text-slate-500">
                Scroll horizontally to inspect 48h horizon →
              </span>
            </div>

            <div className="overflow-x-auto pb-2 border border-slate-200 rounded bg-slate-50 p-3">
              <div className="flex items-end gap-2 min-w-[900px] h-32 pt-2">
                {data.hourlyForecast48h.map((hour, idx) => {
                  const maxPrecip = Math.max(
                    ...data.hourlyForecast48h.map(h => h.precipitation),
                    10
                  );
                  const barHeightPct = Math.min(100, Math.round((hour.precipitation / maxPrecip) * 100));
                  const isHighRain = hour.precipitation >= 5.0;
                  const timeLabel = hour.time ? hour.time.slice(11, 16) : `+${idx}h`;

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center justify-end h-full text-center group cursor-pointer"
                      title={`${hour.time}: ${hour.precipitation} mm/h, ${hour.temperature}°C, Wind ${hour.wind_speed}km/h`}
                    >
                      <span className="text-[10px] text-slate-600 font-semibold mb-0.5 group-hover:text-slate-900">
                        {hour.precipitation > 0 ? `${hour.precipitation}` : ''}
                      </span>
                      <div className="w-full flex justify-center items-end h-16">
                        <div
                          style={{ height: `${Math.max(4, barHeightPct)}%` }}
                          className={`w-3.5 rounded-t transition-all ${
                            isHighRain
                              ? 'bg-amber-600 group-hover:bg-amber-500'
                              : hour.precipitation > 0
                              ? 'bg-teal-600 group-hover:bg-teal-500'
                              : 'bg-slate-300'
                          }`}
                        />
                      </div>
                      <div className="mt-1 pt-1 border-t border-slate-200 w-full text-[9px] text-slate-500">
                        <div className="font-mono text-slate-800">{timeLabel}</div>
                        <div>{hour.temperature}°C</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-600" /> &ge; 5 mm/h intense burst
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-teal-600" /> Standard shower
                </span>
              </div>
              <span>24h Accumulation: {rule.measuredValue} mm · Open-Meteo Weather API</span>
            </div>
          </div>

          {/* 7-Day Forward Daily Outlook Table */}
          <div className="mt-6 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
              7-Day Daily Forecast Outlook
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {data.dailyForecast7d.map((day, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded p-2.5 text-xs text-center">
                  <span className="font-semibold text-slate-900 block">{day.time.slice(5)}</span>
                  <div className="my-1.5 text-base font-bold text-slate-800">
                    {day.precipitation_sum} <span className="text-xs font-normal text-slate-500">mm</span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    {day.temp_max}° / {day.temp_min}°C
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Wind ~{day.wind_speed_max ?? 0} km/h
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 3: ESTIMATED & CLIMATE CONTEXT DATA */}
        <section aria-labelledby="section-estimated-title" className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-700 bg-slate-100 border border-slate-300 px-2 py-0.5 rounded uppercase tracking-wider">
                  Estimated & Contextual Data
                </span>
                <span className="text-xs text-slate-500">
                  Regional terrain baseline and rainfall accumulation factors
                </span>
              </div>
              <h3 id="section-estimated-title" className="text-base font-semibold text-slate-900 mt-1">
                Climate Context & Soil Saturation Estimates
              </h3>
            </div>
            <div className="text-left sm:text-right text-[11px] text-slate-500">
              <div>
                <strong>Valid for / model run:</strong> {formatDateTime(data.modelRunAt)} (valid time; provider gives no model run time)
              </div>
              <div>
                <strong>Retrieved at:</strong> {formatDateTime(data.retrievedAt)}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Soil Saturation Indicator */}
            <div className="bg-slate-50 border border-slate-200 rounded p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Topsoil Saturation Estimate
              </span>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`text-base font-bold ${
                    data.climateContext.soilSaturationEstimate === 'Near Saturation' ||
                    data.climateContext.soilSaturationEstimate === 'High'
                      ? 'text-amber-700'
                      : 'text-slate-800'
                  }`}
                >
                  {data.climateContext.soilSaturationEstimate}
                </span>
              </div>
              <p className="mt-2 text-slate-600 leading-relaxed">
                {data.climateContext.catchmentSensitivity}
              </p>
              <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                Formula: Antecedent 7-day cumulative precipitation vs percolation curve
              </div>
            </div>

            {/* Climatological Monthly Benchmark */}
            <div className="bg-slate-50 border border-slate-200 rounded p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Climatological Baseline
              </span>
              <div className="mt-2 text-base font-bold text-slate-900">
                ~{data.climateContext.climatologicalRainfallMonthAvg_mm} mm / month avg
              </div>
              <p className="mt-2 text-slate-600 leading-relaxed">
                Reference 30-year climatological normal for this latitude zone. Serves as regional anchor to calibrate seasonal anomaly deviations.
              </p>
              <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                WMO Climate Normals Standard
              </div>
            </div>

            {/* Terrain Characteristics */}
            <div className="bg-slate-50 border border-slate-200 rounded p-4">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 block">
                Terrain & Geographic Profile
              </span>
              <p className="mt-2 text-slate-700 leading-relaxed">
                {data.climateContext.terrainCharacteristics}
              </p>
              <p className="mt-2 text-slate-600">
                Urban hard surfaces accelerate runoff velocity, while rural vegetated buffers slow crest timing.
              </p>
              <div className="mt-3 pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                Global Elevation Model ~{data.location.elevation ?? 0}m
              </div>
            </div>
          </div>
        </section>

        {/* PORTABLE NORMALISED RECORDS INSPECTION */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Portable Normalised Data Records ({data.normalisedRecords.length} records)
              </h3>
              <p className="text-xs text-slate-500">
                Every record carries two explicit timestamps: Valid for / model run and Retrieved at.
              </p>
            </div>
            <button
              onClick={() => setShowRawRecords(!showRawRecords)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              <FileText className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{showRawRecords ? 'Hide Schema Records' : 'Inspect Normalized Records'}</span>
              {showRawRecords ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showRawRecords && (
            <div className="mt-4 border border-slate-200 rounded overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-mono text-[11px]">
                  <tr>
                    <th className="py-2 px-3">id</th>
                    <th className="py-2 px-3">evidence_type</th>
                    <th className="py-2 px-3">variable</th>
                    <th className="py-2 px-3">value</th>
                    <th className="py-2 px-3">unit</th>
                    <th className="py-2 px-3">quality_status</th>
                    <th className="py-2 px-3">model_run_at</th>
                    <th className="py-2 px-3">retrieved_at</th>
                    <th className="py-2 px-3">source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-700">
                  {data.normalisedRecords.map(rec => (
                    <tr key={rec.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 text-slate-500 truncate max-w-[120px]">{rec.id}</td>
                      <td className="py-2 px-3 font-semibold text-slate-800">{rec.evidence_type}</td>
                      <td className="py-2 px-3 text-slate-900">{rec.variable}</td>
                      <td className="py-2 px-3 font-bold text-slate-900">
                        {rec.value !== null ? String(rec.value) : 'Data unavailable'}
                      </td>
                      <td className="py-2 px-3 text-slate-500">{rec.unit}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] ${
                            rec.quality_status === 'ok'
                              ? 'bg-teal-50 text-teal-800'
                              : rec.quality_status === 'stale'
                              ? 'bg-amber-50 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {rec.quality_status}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-500 truncate max-w-[140px]">
                        {rec.model_run_at || '-'}
                      </td>
                      <td className="py-2 px-3 text-slate-500 truncate max-w-[140px]">
                        {rec.retrieved_at}
                      </td>
                      <td className="py-2 px-3 text-slate-500 truncate max-w-[120px]">{rec.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Transparent Rule Audit Modal */}
      {showRuleAudit && (
        <RuleAuditModal
          rule={rule}
          currentThreshold={activeThreshold}
          onUpdateThreshold={handleUpdateThreshold}
          onClose={() => setShowRuleAudit(false)}
        />
      )}
    </div>
  );
};
