import React from 'react';
import { Layers, MapPin, AlertTriangle, ArrowRight, Database } from 'lucide-react';
import { LocationWeatherData } from '../../shared/types.js';
import { LeafletMap } from './LeafletMap';
import { formatDateTime } from '../services/api';

interface MapViewProps {
  locations: LocationWeatherData[];
  selectedLocation: LocationWeatherData | null;
  onSelectLocation: (loc: LocationWeatherData) => void;
  onViewLocationProfile: (loc: LocationWeatherData) => void;
}

export const MapView: React.FC<MapViewProps> = ({
  locations,
  selectedLocation,
  onSelectLocation,
  onViewLocationProfile,
}) => {
  return (
    <div className="flex-1 flex flex-col h-full relative overflow-hidden bg-slate-100">
      {/* Map Control Bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 z-10 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Geospatial Weather & Precipitation Intelligence Map
          </h2>
          <p className="text-xs text-slate-500">
            OpenStreetMap standard tiles with heavy rainfall outlook visible areas
          </p>
        </div>
      </div>

      {/* Map Body */}
      <div className="flex-1 relative">
        <LeafletMap
          locations={locations}
          selectedLocation={selectedLocation}
          onSelectLocation={loc => {
            onSelectLocation(loc);
          }}
          showOutlookLayer={true}
          className="w-full h-full"
        />

        {/* Floating Selected Location Drawer if one is selected */}
        {selectedLocation && (
          <div className="absolute bottom-6 left-6 right-6 sm:right-auto sm:w-96 z-1000 bg-white/95 backdrop-blur-xs border border-slate-300 rounded-lg shadow-xl p-4 text-xs">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  Inspected Coordinate Target
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                  {selectedLocation.location.name}
                </h3>
                <span className="text-slate-500">
                  {selectedLocation.location.country} ({selectedLocation.location.latitude.toFixed(2)}°, {selectedLocation.location.longitude.toFixed(2)}°)
                </span>
              </div>
              <div
                className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                  selectedLocation.floodOutlookRule.riskSeverity === 'high'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : selectedLocation.floodOutlookRule.riskSeverity === 'elevated'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : selectedLocation.floodOutlookRule.riskSeverity === 'moderate'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                {selectedLocation.floodOutlookRule.riskLabel}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded border border-slate-100">
              <div>
                <span className="text-[10px] text-slate-500 block">24h Rain Sum</span>
                <span className="font-semibold text-slate-900">
                  {selectedLocation.floodOutlookRule.measuredValue} mm
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 block">Confidence</span>
                <span className="text-slate-600 text-[11px] font-medium">
                  not assessed
                </span>
              </div>
            </div>

            <p className="mt-2 text-slate-600 line-clamp-2">
              {selectedLocation.floodOutlookRule.whatThisMeans}
            </p>

            <div className="mt-3 pt-2 border-t border-slate-100 flex flex-col gap-1 text-[10px] text-slate-500">
              <div>
                <strong>Model run / valid time:</strong> {formatDateTime(selectedLocation.modelRunAt)} (valid time; provider gives no model run time)
              </div>
              <div className="flex items-center justify-between">
                <span><strong>Retrieved at:</strong> {formatDateTime(selectedLocation.retrievedAt)}</span>
                <button
                  onClick={() => onViewLocationProfile(selectedLocation)}
                  className="inline-flex items-center gap-1 font-semibold text-slate-900 hover:text-slate-700 ml-2"
                >
                  <span>Full Profile</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
