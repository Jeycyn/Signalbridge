import React from 'react';
import { Sliders, AlertTriangle, ShieldCheck, MapPin, Trash2, Info, CheckCircle2 } from 'lucide-react';
import { LocationInfo } from '../../shared/types.js';
import { getStoredCustomLocations } from '../services/api';

interface SettingsViewProps {
  isSimulated: boolean;
  onToggleSimulated: (val: boolean) => void;
  onClearCustomLocations: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  isSimulated,
  onToggleSimulated,
  onClearCustomLocations,
}) => {
  const customLocations: LocationInfo[] = getStoredCustomLocations();

  return (
    <div className="flex-1 flex flex-col overflow-y-auto bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 px-4 py-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Settings & Operational Test Harness
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            System configuration, monitored location management, and controlled scenario testing
          </p>
        </div>
      </header>

      <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* Requirement 6: Test Scenario clearly labelled SIMULATED */}
        <section aria-labelledby="simulated-test-title" className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">
                  SIMULATED
                </span>
                <h3 id="simulated-test-title" className="text-base font-bold text-slate-900">
                  Test Scenario: Heavy Rain Forecast Injection
                </h3>
              </div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed max-w-2xl">
                Toggles synthetic heavy-precipitation weather evidence (72.5 mm accumulation over 24 hours with peak hourly burst of 19.8 mm/h) targeting <strong>Kisumu, Kenya</strong>. Use this test harness to evaluate how the visible risk rule (<code className="font-mono text-slate-800">FL-RAIN-24H v1.2.0</code>) triggers elevated alert classifications and updates downstream cards.
              </p>
            </div>

            {/* Toggle Switch */}
            <div className="shrink-0 flex items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSimulated}
                  onChange={e => onToggleSimulated(e.target.checked)}
                  className="sr-only peer"
                  aria-label="Toggle SIMULATED heavy rain test scenario"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>
          </div>

          {isSimulated && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-900 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <strong className="font-semibold">SIMULATED ACTIVE: </strong>
                <span>
                  The weather feed for Kisumu is currently receiving a synthetic heavy rainfall forecast to test the risk logic. A persistent SIMULATED badge remains visible across the application while this scenario is enabled.
                </span>
              </div>
            </div>
          )}
        </section>

        {/* User Monitored Locations */}
        <section aria-labelledby="custom-locations-title" className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 id="custom-locations-title" className="text-sm font-semibold text-slate-900">
                User-Added Monitored Locations
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Locations added via search bar or coordinate input are saved to your local device.
              </p>
            </div>
            {customLocations.length > 0 && (
              <button
                onClick={onClearCustomLocations}
                className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-800 transition"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Clear Custom Locations</span>
              </button>
            )}
          </div>

          <div className="mt-4">
            {customLocations.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded border border-slate-200 text-center text-xs text-slate-500">
                No custom locations added yet. Search any city, country, or coordinate in the Overview search bar to add it to your surveillance feed.
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 text-xs">
                {customLocations.map(loc => (
                  <li key={loc.id} className="py-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      <span className="font-medium text-slate-900">{loc.name}</span>
                      <span className="text-slate-500">{loc.country}</span>
                    </div>
                    <span className="font-mono text-slate-500 text-[11px]">
                      {loc.latitude.toFixed(3)}°, {loc.longitude.toFixed(3)}°
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Operational Boundary Notice */}
        <section className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs text-xs text-slate-600 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <ShieldCheck className="w-4 h-4 text-slate-700" aria-hidden="true" />
            <span>Operational Integrity Protocol</span>
          </div>
          <p className="leading-relaxed">
            SignalBridge operates strictly on authentic physical observations and model runs. Simulation injection is restricted to isolated test sessions with mandatory UI markings to prevent any confusion with actual hydrometeorological signals.
          </p>
        </section>
      </div>
    </div>
  );
};
