import React from 'react';
import { AlertCircle, ExternalLink } from 'lucide-react';

export const PilotBanner: React.FC = () => {
  return (
    <aside
      aria-label="Pilot advisory disclaimer"
      className="bg-slate-100 border-b border-slate-200 text-slate-800 px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-2"
    >
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-slate-600 shrink-0" aria-hidden="true" />
        <span>
          <strong className="font-semibold text-slate-900">Pilot: informational only, not an official warning.</strong>{' '}
          SignalBridge synthesizes open meteorological signals to assist risk awareness. Always defer to official national meteorological and civil emergency authorities.
        </span>
      </div>
      <div className="flex items-center gap-3 text-slate-600">
        <span className="hidden sm:inline">Milestone 1 · Open-Meteo Integration</span>
        <a
          href="https://open-meteo.com"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 hover:text-slate-900 underline underline-offset-2"
        >
          <span>Data Terms</span>
          <ExternalLink className="w-3 h-3" aria-hidden="true" />
        </a>
      </div>
    </aside>
  );
};
