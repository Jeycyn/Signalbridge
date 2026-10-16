import React from 'react';
import { Calendar, Bell, Settings, ArrowLeft, Clock, ShieldCheck } from 'lucide-react';
import { NavTab } from './Navigation';

interface ComingSoonViewProps {
  tab: NavTab;
  onReturnToOverview: () => void;
}

export const ComingSoonView: React.FC<ComingSoonViewProps> = ({ tab, onReturnToOverview }) => {
  const meta: Record<string, { title: string; description: string; plannedMilestone: string; icon: React.ElementType }> = {
    events: {
      title: 'Historical & Severe Weather Events Feed',
      description:
        'Archived post-event summaries, ground-truthed flood extents, and multi-day synoptic timeline replays are scheduled for Milestone 2.',
      plannedMilestone: 'Milestone 2 (Q1)',
      icon: Calendar,
    },
    alerts: {
      title: 'Configurable Catchment Alert Subscriptions',
      description:
        'Webhook, SMS, and push notification triggers based on threshold breach rules will be introduced once in-situ sensor networks are integrated.',
      plannedMilestone: 'Milestone 2 (Q2)',
      icon: Bell,
    },
    settings: {
      title: 'System Preferences & Organization Units',
      description:
        'Workspace unit preferences (Metric/Imperial), custom hydrologic basin definitions, and telemetry API tokens.',
      plannedMilestone: 'Milestone 3',
      icon: Settings,
    },
  };

  const current = meta[tab] || meta.events;
  const Icon = current.icon;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-800">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-lg p-6 shadow-xs text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
          <Icon className="w-6 h-6" aria-hidden="true" />
        </div>

        <div>
          <span className="text-[11px] font-mono uppercase tracking-wider text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
            {current.plannedMilestone}
          </span>
          <h2 className="text-base font-bold text-slate-900 mt-2">{current.title}</h2>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            {current.description}
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded p-3 text-[11px] text-slate-500 text-left flex items-start gap-2">
          <Clock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
          <span>
            Milestone 1 focus is strictly limited to Overview Dashboard, Location Profiles, and Data Sources with the Open-Meteo adapter.
          </span>
        </div>

        <button
          onClick={onReturnToOverview}
          className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Return to Overview Dashboard</span>
        </button>
      </div>
    </div>
  );
};
