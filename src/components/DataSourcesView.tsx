import React, { useEffect, useState } from 'react';
import {
  Database,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Globe,
  Radio,
  FileCode,
  ShieldAlert,
  ExternalLink,
  Cpu,
} from 'lucide-react';
import { ProviderCoverageInfo } from '../../shared/types.js';
import { fetchDataSources } from '../services/api';

export const DataSourcesView: React.FC = () => {
  const [sources, setSources] = useState<ProviderCoverageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDataSources()
      .then(data => {
        setSources(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-teal-800">
            <Database className="w-4 h-4 text-teal-600" aria-hidden="true" />
            <span>Telemetry & Model Ingestion Pipeline</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Data Sources, Coverage & Provider Boundaries
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
            SignalBridge operates one adapter per provider behind a common portable interface. Values are never invented; when provider feeds are missing, uncalibrated, or out-of-cadence, records are strictly marked with their limitation reason.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {loading && (
          <div className="bg-white border border-slate-200 rounded p-8 text-center text-xs text-slate-500">
            Querying provider registry metadata...
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-4 text-xs text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>Error loading provider registry: {error}</span>
          </div>
        )}

        {/* Source Cards */}
        <div className="space-y-6">
          {sources.map(source => {
            const isOperational = source.status === 'operational';

            return (
              <article
                key={source.id}
                className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden"
              >
                {/* Source Top Header */}
                <div className="p-5 border-b border-slate-200 flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-base font-bold text-slate-900">
                        {source.provider}
                      </h3>
                      <span className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded border border-slate-200">
                        {source.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Provider Identifier: <code className="font-mono text-slate-800">{source.id}</code>
                    </p>
                  </div>

                  {/* Status Indicator */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold border ${
                        isOperational
                          ? 'bg-teal-50 text-teal-800 border-teal-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {isOperational ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" aria-hidden="true" />
                          <span>Active Provider</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                          <span>Milestone 2 Plug-in Adapter</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Technical Specifications Grid */}
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-50 border-b border-slate-200 text-xs">
                  <div>
                    <span className="text-[11px] font-semibold uppercase text-slate-500 block">
                      Coverage Area
                    </span>
                    <span className="font-medium text-slate-900 mt-1 block">
                      {source.geographicCoverageText}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold uppercase text-slate-500 block">
                      Spatial Resolution
                    </span>
                    <span className="font-medium text-slate-900 mt-1 block">
                      {source.spatialResolutionText.includes('documentation') ? (
                        <a
                          href={source.documentationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-800 underline hover:text-slate-900 inline-flex items-center gap-1"
                        >
                          <span>See provider documentation</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        source.spatialResolutionText
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold uppercase text-slate-500 block">
                      Update Cadence
                    </span>
                    <span className="font-medium text-slate-900 mt-1 block">
                      {source.cadenceText.includes('documentation') ? (
                        <a
                          href={source.documentationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-800 underline hover:text-slate-900 inline-flex items-center gap-1"
                        >
                          <span>See provider documentation</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ) : (
                        source.cadenceText
                      )}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold uppercase text-slate-500 block">
                      Last Successful Import
                    </span>
                    <span className="font-mono text-slate-800 mt-1 block text-[11px]">
                      {source.lastSuccessfulImport}
                    </span>
                  </div>
                </div>

                {/* Variables Ingested */}
                <div className="p-5 border-b border-slate-100">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 mb-2">
                    Variables Ingested into Portable Schema
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {source.variables.map((v, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-slate-100 text-slate-800 px-2.5 py-1 rounded border border-slate-200 font-mono"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Known Limitations (Strict Requirement) */}
                <div className="p-5 bg-amber-50/40 border-b border-amber-100">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wider mb-2">
                    <ShieldAlert className="w-4 h-4 text-amber-700" aria-hidden="true" />
                    <span>Known Limitations & Blind Spots</span>
                  </div>
                  <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
                    {source.knownLimitations.map((lim, idx) => (
                      <li key={idx} className="leading-relaxed">
                        {lim}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Attribution & License */}
                <div className="p-5 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-4">
                  <div>
                    <span className="font-semibold text-slate-800">Attribution: </span>
                    <span>{source.attribution}</span>
                    <span className="mx-2">·</span>
                    <span className="font-semibold text-slate-800">License: </span>
                    <span>{source.license}</span>
                  </div>

                  {source.documentationUrl && (
                    <a
                      href={source.documentationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-slate-900 hover:text-teal-700 font-medium underline"
                    >
                      <span>Provider Docs</span>
                      <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                    </a>
                  )}
                </div>
              </article>
            );
          })}
        </div>

        {/* Common Interface & Extensibility Explanation */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-slate-700" aria-hidden="true" />
            <h3 className="text-sm font-bold text-slate-900">
              Provider Adapter Architecture & Unified Record Schema
            </h3>
          </div>
          <p className="mt-2 text-xs text-slate-600 leading-relaxed">
            All data sources implement the <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">WeatherProviderAdapter</code> interface on the server. Every raw reading is mapped into a normalized record shape with an unambiguous evidence type, spatial location, validity timestamp, quality status, and physical unit. This guarantees that satellite soil moisture (NASA SMAP) and hyper-local IoT rain gauges can be mounted into the engine in Milestone 2 without changing the user interface.
          </p>

          <div className="mt-3 bg-slate-900 text-slate-200 p-3 rounded font-mono text-xs overflow-x-auto">
            <pre className="text-[11px] leading-tight">
{`interface NormalisedRecord {
  id: string;                                                // Stable unique record key
  evidence_type: 'observation' | 'forecast' | 'estimate' | 'report';
  source: string;                                           // Originating telemetry or NWP model
  observed_at?: string;                                     // ISO-8601 when physical state occurred
  valid_for?: string;                                       // ISO-8601 forecast validity window
  received_at: string;                                      // Timestamp ingested by SignalBridge
  latitude: number;
  longitude: number;
  variable: string;                                         // Standardized physical quantity name
  value: number | string | null;                           // Never fabricated; null if missing
  unit: string;                                             // Standard physical unit ('mm', '°C', etc.)
  quality_status: 'ok' | 'stale' | 'missing';               // Provider update cadence rule
  quality_reason?: string;                                  // Explanation if stale or missing
}`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
