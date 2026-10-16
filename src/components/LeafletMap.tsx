import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { LocationWeatherData } from '../../shared/types.js';
import { formatDateTime } from '../services/api';

interface LeafletMapProps {
  locations: LocationWeatherData[];
  selectedLocation?: LocationWeatherData | null;
  onSelectLocation: (loc: LocationWeatherData) => void;
  showOutlookLayer?: boolean;
  className?: string;
  zoom?: number;
  center?: [number, number];
}

export const LeafletMap: React.FC<LeafletMapProps> = ({
  locations,
  selectedLocation,
  onSelectLocation,
  showOutlookLayer = true,
  className = 'h-full w-full',
  zoom,
  center,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const areasLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialCenter: [number, number] = center || [20, 0];
    const initialZoom = zoom || (center ? 10 : 2);

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: true,
      attributionControl: true,
    });

    // Requirement 1: OpenStreetMap standard tiles through server proxy with custom User-Agent and caching.
    // Falls back gracefully and preserves mandatory attribution.
    L.tileLayer('/api/tiles/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    areasLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map view if center/zoom change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    if (center) {
      mapInstanceRef.current.setView(center, zoom || 11, { animate: true });
    }
  }, [center?.[0], center?.[1], zoom]);

  // Update Markers and Heavy Rain Visible Areas
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !areasLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    areasLayerRef.current.clearLayers();

    locations.forEach(loc => {
      const { latitude, longitude, name } = loc.location;
      const rule = loc.floodOutlookRule;
      const isSelected = selectedLocation?.location.id === loc.location.id;
      const measuredRain = rule.measuredValue || 0;

      // Requirement 4: Color and shape discipline
      // Teal is reserved for confirmed data status elsewhere in app.
      // High: Red (#dc2626), Octagon with exclamation mark
      // Elevated: Amber (#d97706), Diamond with warning triangle
      // Moderate: Orange (#ea580c), Square with dot
      // No signal / Low: Neutral slate (#475569), Circle with neutral dash
      let strokeColor = '#475569';
      let fillColor = '#64748b';
      let shapeHtml = '';

      if (rule.riskSeverity === 'high') {
        strokeColor = '#dc2626'; // Red
        fillColor = '#b91c1c';
        // Octagon shape via clip-path
        shapeHtml = `
          <div style="
            width: ${isSelected ? '28px' : '24px'};
            height: ${isSelected ? '28px' : '24px'};
            background: #dc2626;
            clip-path: polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #ffffff;
            font-weight: 800;
            font-size: 13px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.35);
          ">!</div>
        `;
      } else if (rule.riskSeverity === 'elevated') {
        strokeColor = '#d97706'; // Amber
        fillColor = '#b45309';
        // Diamond shape (rotated square)
        shapeHtml = `
          <div style="
            width: ${isSelected ? '24px' : '20px'};
            height: ${isSelected ? '24px' : '20px'};
            background: #d97706;
            transform: rotate(45deg);
            border-radius: 2px;
            border: 2px solid #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          ">
            <span style="transform: rotate(-45deg); color: #ffffff; font-weight: 900; font-size: 11px;">▲</span>
          </div>
        `;
      } else if (rule.riskSeverity === 'moderate') {
        strokeColor = '#ea580c'; // Moderate Orange
        fillColor = '#c2410c';
        // Square shape
        shapeHtml = `
          <div style="
            width: ${isSelected ? '22px' : '18px'};
            height: ${isSelected ? '22px' : '18px'};
            background: #ea580c;
            border-radius: 3px;
            border: 2px solid #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.25);
          ">
            <span style="width: 5px; height: 5px; background: #ffffff; border-radius: 1px;"></span>
          </div>
        `;
      } else {
        strokeColor = '#475569'; // Neutral slate for "no signal"
        fillColor = '#64748b';
        // Circle shape
        shapeHtml = `
          <div style="
            width: ${isSelected ? '20px' : '16px'};
            height: ${isSelected ? '20px' : '16px'};
            background: #64748b;
            border-radius: 50%;
            border: 2px solid #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 1px 3px rgba(0,0,0,0.25);
          ">
            <span style="width: 4px; height: 1.5px; background: #ffffff;"></span>
          </div>
        `;
      }

      // Requirement 6: Heavy rain layer drawn as visible area scaled by forecast rainfall
      if (showOutlookLayer) {
        let areaRadiusMeters = 15000;
        let areaStroke = '#64748b';
        let areaFill = '#94a3b8';
        let areaOpacity = 0.08;

        if (rule.riskSeverity === 'high') {
          areaRadiusMeters = Math.max(50000, Math.round(measuredRain * 800));
          areaStroke = '#dc2626';
          areaFill = '#ef4444';
          areaOpacity = 0.25;
        } else if (rule.riskSeverity === 'elevated') {
          areaRadiusMeters = Math.max(35000, Math.round(measuredRain * 700));
          areaStroke = '#d97706';
          areaFill = '#f59e0b';
          areaOpacity = 0.20;
        } else if (rule.riskSeverity === 'moderate') {
          areaRadiusMeters = 22000;
          areaStroke = '#ea580c';
          areaFill = '#ea580c';
          areaOpacity = 0.15;
        } else {
          areaRadiusMeters = 14000;
          areaStroke = '#64748b';
          areaFill = '#94a3b8';
          areaOpacity = 0.07;
        }

        const areaCircle = L.circle([latitude, longitude], {
          radius: areaRadiusMeters,
          color: areaStroke,
          fillColor: areaFill,
          fillOpacity: areaOpacity,
          weight: rule.riskSeverity !== 'low' ? 2 : 1,
          dashArray: rule.riskSeverity !== 'low' ? '6, 4' : '4, 4',
        });
        areaCircle.on('click', () => {
          marker.openPopup();
        });
        areaCircle.addTo(areasLayerRef.current!);
      }

      // Create custom div icon
      const customIcon = L.divIcon({
        className: 'custom-weather-pin',
        html: shapeHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([latitude, longitude], { icon: customIcon });

      // Requirement 3: Popup details showing rule version, threshold, input values,
      // what this means explanation, and two real timestamps (Model run / valid time and Retrieved at)
      const validTimeText = loc.modelRunAt
        ? `${formatDateTime(loc.modelRunAt)} (valid time; no model run time provided by provider)`
        : 'No model run time provided by provider';
      const retrievedFormatted = formatDateTime(loc.retrievedAt);

      const sum48hInput = loc.hourlyForecast48h.length > 0
        ? loc.hourlyForecast48h.reduce((acc, curr) => acc + (curr.precipitation || 0), 0).toFixed(1)
        : '-';
      const peakHourlyInput = loc.hourlyForecast48h.length > 0
        ? Math.max(...loc.hourlyForecast48h.map(p => p.precipitation || 0), 0).toFixed(1)
        : '-';
      const rain7dInput = loc.recentHistory7d?.total_7d_mm !== undefined
        ? `${loc.recentHistory7d.total_7d_mm} mm`
        : '-';

      const popupHtml = `
        <div style="padding: 12px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 260px; max-width: 320px; font-size: 12px; color: #1e293b; line-height: 1.4;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
            <div>
              <div style="font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600; letter-spacing: 0.04em;">
                ${loc.location.country || 'Target Location'}
              </div>
              <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 1px;">
                ${name}
              </div>
            </div>
            ${loc.isSimulated ? '<span style="font-size: 9px; font-weight: 800; background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 3px; border: 1px solid #fde68a; letter-spacing: 0.05em;">SIMULATED</span>' : ''}
          </div>

          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 3.5px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #64748b; font-size: 11px;">Risk Label:</span>
              <span style="font-weight: 700; color: ${strokeColor}; font-size: 12px;">${rule.riskLabel}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #64748b; font-size: 11px;">Rule Version:</span>
              <span style="font-family: monospace; font-size: 11px; color: #334155; background: #f1f5f9; padding: 1px 4px; border-radius: 2px;">${rule.ruleVersion}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #64748b; font-size: 11px;">Threshold:</span>
              <span style="font-weight: 600; color: #0f172a; font-size: 11px;">${rule.thresholdValue} mm / 24h</span>
            </div>

            <!-- Requirement 3: Input values section -->
            <div style="margin-top: 4px; padding: 5px 7px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 4px; font-size: 11px;">
              <div style="font-weight: 600; color: #334155; font-size: 10px; text-transform: uppercase; margin-bottom: 3px; letter-spacing: 0.03em;">
                Rule Input Values
              </div>
              <div style="display: flex; justify-content: space-between; color: #475569;">
                <span>24h Forecast Rain:</span>
                <span style="font-weight: 700; color: #0f172a;">${rule.measuredValue} mm</span>
              </div>
              <div style="display: flex; justify-content: space-between; color: #475569;">
                <span>48h Forecast Rain:</span>
                <span style="font-weight: 600; color: #0f172a;">${sum48hInput} mm</span>
              </div>
              <div style="display: flex; justify-content: space-between; color: #475569;">
                <span>Max Hourly Peak:</span>
                <span style="font-weight: 600; color: #0f172a;">${peakHourlyInput} mm/h</span>
              </div>
              <div style="display: flex; justify-content: space-between; color: #475569;">
                <span>7d Antecedent Rain:</span>
                <span style="font-weight: 600; color: #0f172a;">${rain7dInput}</span>
              </div>
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 2px;">
              <span style="color: #64748b; font-size: 11px;">Confidence:</span>
              <span style="color: #64748b; font-style: italic; font-size: 11px;">not assessed</span>
            </div>
          </div>

          <!-- Requirement 2: Explanation text derived only from app values -->
          <div style="margin-top: 6px; padding: 6px 8px; background: #f1f5f9; border-radius: 4px; font-size: 11px; color: #334155; line-height: 1.35;">
            ${rule.whatThisMeans}
          </div>

          <!-- Requirement 3: Real timestamps in popup -->
          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #cbd5e1; font-size: 10px; color: #475569; display: flex; flex-direction: column; gap: 2px;">
            <div><strong style="color: #334155;">Model run / valid time:</strong> ${validTimeText}</div>
            <div><strong style="color: #334155;">Retrieved at:</strong> ${retrievedFormatted}</div>
          </div>

          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px solid #e2e8f0;">
            <button id="btn-inspect-${loc.location.id}" style="
              width: 100%;
              padding: 6px 10px;
              background: #0f172a;
              color: #ffffff;
              font-size: 11px;
              font-weight: 600;
              border: none;
              border-radius: 4px;
              cursor: pointer;
            ">
              View Location Profile
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-inspect-${loc.location.id}`);
        if (btn) {
          btn.onclick = () => {
            onSelectLocation(loc);
          };
        }
      });

      marker.addTo(markersLayerRef.current!);
    });
  }, [locations, selectedLocation?.location.id, showOutlookLayer]);

  return (
    <div className={`relative ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full rounded border border-slate-200" />

      {/* Requirement 4: Map Legend showing different shapes in addition to color */}
      <div
        className="absolute bottom-3 right-3 z-1000 bg-white/95 backdrop-blur-xs border border-slate-200 rounded p-2.5 shadow-md text-xs text-slate-700 pointer-events-auto"
        aria-label="Map Marker Legend"
      >
        <span className="font-semibold text-slate-900 block mb-1.5 text-[11px] uppercase tracking-wider">
          Outlook Status Legend
        </span>
        <div className="space-y-1.5 text-[11px]">
          <div className="flex items-center gap-2">
            <span
              style={{
                width: '12px',
                height: '12px',
                background: '#dc2626',
                clipPath: 'polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)',
                display: 'inline-block',
              }}
            />
            <span>High Risk (Octagon · &ge;2x threshold)</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              style={{
                width: '10px',
                height: '10px',
                background: '#d97706',
                transform: 'rotate(45deg)',
                display: 'inline-block',
                borderRadius: '1px',
              }}
            />
            <span>Elevated (Diamond · &ge;threshold)</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              style={{
                width: '10px',
                height: '10px',
                background: '#ea580c',
                borderRadius: '1px',
                display: 'inline-block',
              }}
            />
            <span>Moderate Alert (Square)</span>
          </div>
          <div className="flex items-center gap-2">
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
        </div>
      </div>
    </div>
  );
};
