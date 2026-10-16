import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Layers,
  Clock,
  AlertTriangle,
  ListFilter,
  MapPin,
  RefreshCw,
  ChevronRight,
  Database,
  ExternalLink,
  Wifi,
} from 'lucide-react';
import { LocationWeatherData, LocationInfo } from '../../shared/types.js';
import { LeafletMap } from './LeafletMap';
import { searchLocations, formatDateTime, saveStoredCustomLocation } from '../services/api';

interface OverviewViewProps {
  feedItems: LocationWeatherData[];
  selectedLocation: LocationWeatherData | null;
  onSelectLocation: (loc: LocationWeatherData) => void;
  onSearchSelectLocation: (loc: LocationInfo) => void;
  isLoading: boolean;
  onRefresh: () => void;
  onViewLocationProfile: (loc: LocationWeatherData) => void;
  isSimulatedActive?: boolean;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  feedItems,
  selectedLocation,
  onSelectLocation,
  onSearchSelectLocation,
  isLoading,
  onRefresh,
  onViewLocationProfile,
  isSimulatedActive,
}) => {
  // Search query & results
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationInfo[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Requirement 7: Filters list only options that actually exist
  // Hazard has only Heavy rain / flood outlook
  const [hazardFilter] = useState<'flood'>('flood');
  const [timeRangeFilter, setTimeRangeFilter] = useState<'24h' | '48h'>('24h');
  const [statusFilter, setStatusFilter] = useState<'all' | 'elevated' | 'nominal'>('all');

  // Requirement 1: On desktop, show map and event feed by default.
  // Low-bandwidth text list is switchable, and used automatically on slow connections.
  const [lowBandwidthMode, setLowBandwidthMode] = useState(false);
  const [slowConnectionAutoSwitched, setSlowConnectionAutoSwitched] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn) {
        if (
          conn.saveData ||
          conn.effectiveType === 'slow-2g' ||
          conn.effectiveType === '2g' ||
          conn.effectiveType === '3g'
        ) {
          setLowBandwidthMode(true);
          setSlowConnectionAutoSwitched(true);
        }
      }
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchLocations(searchQuery);
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (err) {
        console.error('Search failure:', err);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter items
  const filteredItems = feedItems.filter(item => {
    const rule = item.floodOutlookRule;
    if (statusFilter === 'elevated' && rule.riskSeverity === 'low') return false;
    if (statusFilter === 'nominal' && rule.riskSeverity !== 'low') return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Top Header & Search Bar */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
                Climate & Weather Risk Overview
              </h2>
              {isSimulatedActive && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                  SIMULATED ACTIVE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Evidence-based precipitation outlook surveillance · 7 pilot reference stations & custom targets
            </p>
          </div>

          {/* Search Box: search city, country or coordinates */}
          <div className="relative w-full md:w-96">
            <div className="relative">
              <Search
                className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                placeholder="Search location (city, country or coordinates)"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) setShowSearchResults(true);
                }}
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-300 rounded focus:bg-white focus:border-slate-800 transition"
                aria-label="Search location by city, country or coordinates"
              />
              {isSearching && (
                <RefreshCw
                  className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 animate-spin"
                  aria-hidden="true"
                />
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div
                className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded shadow-lg z-50 max-h-64 overflow-y-auto"
                role="listbox"
              >
                <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider bg-slate-50 border-b border-slate-100">
                  Select Location Target (Adds to Monitored Feed)
                </div>
                {searchResults.map(loc => (
                  <button
                    key={`${loc.latitude}-${loc.longitude}`}
                    onClick={() => {
                      saveStoredCustomLocation(loc);
                      onSearchSelectLocation(loc);
                      setShowSearchResults(false);
                      setSearchQuery('');
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-slate-100 flex items-center justify-between border-b border-slate-50 last:border-b-0 transition"
                  >
                    <div>
                      <span className="font-medium text-slate-900">{loc.name}</span>
                      <span className="text-slate-500 ml-1.5">
                        {loc.country} {loc.admin1 ? `· ${loc.admin1}` : ''}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      {loc.latitude.toFixed(2)}°, {loc.longitude.toFixed(2)}°
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Auto-detected Slow Connection Banner */}
      {slowConnectionAutoSwitched && lowBandwidthMode && (
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2 text-xs text-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wifi className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
            <span>
              <strong>Low-bandwidth connection detected:</strong> Switched to lightweight text list view automatically to preserve data.
            </span>
          </div>
          <button
            onClick={() => {
              setLowBandwidthMode(false);
              setSlowConnectionAutoSwitched(false);
            }}
            className="text-slate-900 underline text-xs font-medium ml-2"
          >
            Switch back to Map
          </button>
        </div>
      )}

      {/* Filter Toolbar & Bandwidth Mode Toggle */}
      <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Requirement 7: List only options that actually exist */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-slate-500 font-medium">
              <Filter className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Filters:</span>
            </div>

            {/* Hazard Filter: Only existing hazard */}
            <div className="bg-white border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-700 font-medium">
              Hazard: Heavy rain / flood outlook
            </div>

            {/* Time Horizon Filter */}
            <select
              value={timeRangeFilter}
              onChange={e => setTimeRangeFilter(e.target.value as any)}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700"
              aria-label="Filter by Time Horizon"
            >
              <option value="24h">Horizon: 24 Hours</option>
              <option value="48h">Horizon: 48 Hours</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="bg-white border border-slate-300 rounded px-2 py-1 text-xs text-slate-700"
              aria-label="Filter by Status"
            >
              <option value="all">Status: All Statuses</option>
              <option value="elevated">Elevated Outlook (&ge; threshold)</option>
              <option value="nominal">Nominal (&lt; threshold)</option>
            </select>
          </div>

          {/* Right Controls: Low-bandwidth toggle & Refresh */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLowBandwidthMode(!lowBandwidthMode)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-medium transition ${
                lowBandwidthMode
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
              title="Toggle low-bandwidth text-first view instead of interactive map"
            >
              <ListFilter className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{lowBandwidthMode ? 'Switch to Map View' : 'Text-First View (Low Bandwidth)'}</span>
            </button>

            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-1 text-slate-600 hover:text-slate-900 px-2 py-1 rounded hover:bg-slate-200 transition"
              title="Refresh provider records"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area: Map and Event Feed */}
      <div className="flex-1 p-4 sm:p-6 max-w-7xl mx-auto w-full">
        {/* Requirement 4: Source facts read what API returns; where absent show link to provider docs */}
        <div className="mb-4 bg-white border border-slate-200 rounded p-3 text-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-teal-600 shrink-0" aria-hidden="true" />
            <div>
              <span className="font-semibold text-slate-900">Provider Feed: </span>
              <span className="text-slate-700">Open-Meteo Weather API</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-slate-600">
            <span>
              <strong>Cadence:</strong>{' '}
              <a
                href="https://open-meteo.com/en/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-slate-900 inline-flex items-center gap-0.5"
              >
                See provider documentation
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </span>
            <span>
              <strong>Resolution:</strong>{' '}
              <a
                href="https://open-meteo.com/en/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-slate-900 inline-flex items-center gap-0.5"
              >
                See provider documentation
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </span>
            <span>
              <strong>Coverage:</strong> Global coordinates
            </span>
          </div>
        </div>

        {/* Layout: Low-bandwidth text list OR Side-by-side Desktop / Stacked Mobile */}
        {lowBandwidthMode ? (
          /* Low Bandwidth Text-First Table */
          <div className="bg-white border border-slate-200 rounded overflow-hidden shadow-xs">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Text-First Risk Intelligence Manifest (Low-Bandwidth Mode)
                </h3>
                <p className="text-xs text-slate-500">
                  Minimal resource transmission representation. Map rendering suppressed.
                </p>
              </div>
              <span className="text-xs font-mono text-slate-600">
                {filteredItems.length} monitored coordinates
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Location</th>
                    <th className="py-2.5 px-3 font-semibold">Coordinates</th>
                    <th className="py-2.5 px-3 font-semibold">24h Rain Outlook</th>
                    <th className="py-2.5 px-3 font-semibold">Risk Classification</th>
                    <th className="py-2.5 px-3 font-semibold">Confidence</th>
                    <th className="py-2.5 px-3 font-semibold">Valid For / Model Run</th>
                    <th className="py-2.5 px-3 font-semibold">Retrieved At</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredItems.map(item => {
                    const rule = item.floodOutlookRule;
                    const isHigh = rule.riskSeverity === 'high';
                    const isElevated = rule.riskSeverity === 'elevated';
                    const isMod = rule.riskSeverity === 'moderate';

                    return (
                      <tr key={item.location.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium text-slate-900">
                          {item.location.name}
                          <span className="block text-[11px] text-slate-500">
                            {item.location.country}
                          </span>
                          {item.isSimulated && (
                            <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200 inline-block mt-0.5">
                              SIMULATED
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-600">
                          {item.location.latitude.toFixed(2)}°, {item.location.longitude.toFixed(2)}°
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900">
                          {rule.measuredValue} mm
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 font-medium ${
                              isHigh
                                ? 'text-red-700'
                                : isElevated
                                ? 'text-amber-700'
                                : isMod
                                ? 'text-amber-600'
                                : 'text-slate-700'
                            }`}
                          >
                            {(isHigh || isElevated) && (
                              <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                            )}
                            {rule.riskLabel}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {/* Requirement 2: Confidence: not assessed */}
                          Confidence: not assessed
                        </td>
                        <td className="py-3 px-3 text-[11px]">
                          {/* Requirement 3: Two separate timestamps */}
                          <span className="font-mono text-slate-800 block">
                            {formatDateTime(item.modelRunAt)}
                          </span>
                          <span className="text-slate-500 text-[10px]">
                            Age: {item.freshnessFromModelRunText}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-500 font-mono">
                          {formatDateTime(item.retrievedAt)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => onViewLocationProfile(item)}
                            className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-[11px] font-medium"
                          >
                            Inspect Profile
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Requirement 1: Side-by-Side Map and Feed on desktop by default */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Interactive Map Column */}
            <div className="lg:col-span-7 flex flex-col h-[400px] lg:h-[600px] bg-white border border-slate-200 rounded p-2 shadow-xs">
              <div className="flex items-center justify-between px-2 py-1 text-xs border-b border-slate-100 mb-2">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                  <Layers className="w-3.5 h-3.5 text-slate-600" aria-hidden="true" />
                  <span>Interactive Map · Heavy Rain Outlook</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span>OpenStreetMap Standard Tiles</span>
                  <span>·</span>
                  <span>Click pin to inspect</span>
                </div>
              </div>

              <div className="flex-1 min-h-0 relative">
                <LeafletMap
                  locations={filteredItems}
                  selectedLocation={selectedLocation}
                  onSelectLocation={loc => {
                    onSelectLocation(loc);
                    onViewLocationProfile(loc);
                  }}
                  showOutlookLayer={true}
                />
              </div>

              {/* Requirement 4: Map Legend showing different shapes in addition to colour (No teal) */}
              <div className="mt-2 pt-2 border-t border-slate-100 px-2 flex flex-wrap items-center justify-between text-[11px] text-slate-600 gap-2">
                <span className="font-medium text-slate-800">Legend:</span>
                <div className="flex items-center gap-1.5">
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      background: '#64748b',
                      borderRadius: '50%',
                      display: 'inline-block',
                    }}
                  />
                  <span>No Signal / Low (Circle)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    style={{
                      width: '9px',
                      height: '9px',
                      background: '#ea580c',
                      borderRadius: '1px',
                      display: 'inline-block',
                    }}
                  />
                  <span>Moderate Alert (Square)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    style={{
                      width: '9px',
                      height: '9px',
                      background: '#d97706',
                      transform: 'rotate(45deg)',
                      borderRadius: '1px',
                      display: 'inline-block',
                    }}
                  />
                  <span>Elevated (Diamond)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      background: '#dc2626',
                      clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
                      display: 'inline-block',
                    }}
                  />
                  <span>High Risk (Octagon)</span>
                </div>
              </div>
            </div>

            {/* Event Feed Column */}
            <div className="lg:col-span-5 flex flex-col h-[520px] lg:h-[600px] bg-white border border-slate-200 rounded shadow-xs overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-900">
                    Location Risk Intelligence Feed
                  </h3>
                  <span className="text-[11px] text-slate-500">
                    {filteredItems.length} operational outlooks monitored
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                  Horizon: {timeRangeFilter}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-2">
                {filteredItems.map(item => {
                  const rule = item.floodOutlookRule;
                  const isHigh = rule.riskSeverity === 'high';
                  const isElevated = rule.riskSeverity === 'elevated';
                  const isMod = rule.riskSeverity === 'moderate';

                  return (
                    <article
                      key={item.location.id}
                      className="p-3 rounded border border-slate-200 bg-white hover:border-slate-400 hover:shadow-xs transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />
                            <h4 className="text-sm font-semibold text-slate-900">
                              {item.location.name}
                            </h4>
                            {item.isSimulated && (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                SIMULATED
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5 ml-5">
                            {item.location.country} · {item.location.latitude.toFixed(2)}°, {item.location.longitude.toFixed(2)}°
                          </p>
                        </div>

                        {/* Risk Tag */}
                        <div
                          className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border ${
                            isHigh
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : isElevated
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : isMod
                              ? 'bg-amber-50/60 text-amber-800 border-amber-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {(isHigh || isElevated) && (
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          )}
                          <span>{rule.riskLabel}</span>
                        </div>
                      </div>

                      {/* Forecast metrics */}
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs bg-slate-50 p-2 rounded border border-slate-100">
                        <div>
                          <span className="text-[10px] text-slate-500 block">24h Rain Outlook</span>
                          <span className="font-semibold text-slate-900">{rule.measuredValue} mm</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Current Temp</span>
                          <span className="font-semibold text-slate-900">
                            {item.currentConditions.temperature_2m !== null ? `${item.currentConditions.temperature_2m} °C` : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Confidence</span>
                          <span className="text-slate-600 text-[11px] font-medium">not assessed</span>
                        </div>
                      </div>

                      {/* Brief text meaning */}
                      <p className="mt-2 text-xs text-slate-600 line-clamp-2">
                        {rule.whatThisMeans}
                      </p>

                      {/* Requirement 3: Show two separate timestamps on every card */}
                      <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-1">
                          <div className="flex items-center gap-1 text-slate-700">
                            <Clock className="w-3 h-3 text-slate-400" aria-hidden="true" />
                            <span>
                              <strong>Valid for / model run:</strong> {formatDateTime(item.modelRunAt)} (valid time; provider gives no model run time)
                            </span>
                          </div>
                          <button
                            onClick={() => onViewLocationProfile(item)}
                            className="inline-flex items-center gap-1 font-medium text-slate-900 hover:text-slate-700 transition ml-auto"
                          >
                            <span>Profile</span>
                            <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>
                            <strong>Retrieved at:</strong> {formatDateTime(item.retrievedAt)}
                          </span>
                          <span>Open-Meteo Weather API</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
