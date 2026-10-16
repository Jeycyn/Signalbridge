import React from 'react';
import {
  LayoutDashboard,
  Map as MapIcon,
  Calendar,
  Database,
  Bell,
  Settings,
  Radio,
  CheckCircle2,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

export type NavTab = 'overview' | 'map' | 'events' | 'sources' | 'alerts' | 'settings';

interface NavigationProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  selectedLocationName?: string;
  isOnline: boolean;
}

interface NavItemDef {
  id: NavTab;
  label: string;
  icon: React.ElementType;
  isAvailable: boolean;
}

const NAV_ITEMS: NavItemDef[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, isAvailable: true },
  { id: 'map', label: 'Map', icon: MapIcon, isAvailable: true },
  { id: 'events', label: 'Events', icon: Calendar, isAvailable: false },
  { id: 'sources', label: 'Data sources', icon: Database, isAvailable: true },
  { id: 'alerts', label: 'Alerts', icon: Bell, isAvailable: false },
  { id: 'settings', label: 'Settings', icon: Settings, isAvailable: true },
];

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  isOnline,
}) => {
  return (
    <>
      {/* Desktop Left Rail */}
      <aside
        className="hidden md:flex md:w-64 md:flex-col bg-slate-900 text-slate-200 border-r border-slate-800 shrink-0"
        aria-label="Sidebar Navigation"
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-teal-400">
              <Radio className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-wide text-white">SignalBridge</h1>
              <p className="text-[11px] text-slate-400">Weather & Climate Risk</p>
            </div>
          </div>
        </div>

        {/* System Health / Data Status (Teal used exclusively for confirmed status) */}
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Provider Link</span>
            <span className="inline-flex items-center gap-1 text-teal-400 font-medium">
              <CheckCircle2 className="w-3 h-3 text-teal-400" aria-hidden="true" />
              <span>{isOnline ? 'Active (Open-Meteo)' : 'Offline Cache'}</span>
            </span>
          </div>
          <div className="flex items-center justify-between mt-1 text-slate-400">
            <span>Normalized Schema</span>
            <span className="text-slate-300">v1.2 · Portable</span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Main menu">
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${isActive ? 'text-teal-400' : 'text-slate-400'}`}
                    aria-hidden="true"
                  />
                  <span>{item.label}</span>
                </div>
                {!item.isAvailable && (
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <PWAInstallButton />
          <div className="text-[11px] text-slate-400">
            <p>Milestone 1 · Regional Intelligence</p>
            <p className="mt-0.5 text-slate-400">Complementary to civil authorities</p>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 text-slate-300 px-2 py-1.5 flex items-center justify-around"
        aria-label="Mobile Navigation"
      >
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center py-1 px-2 rounded text-[10px] font-medium transition ${
                isActive ? 'text-teal-400' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" aria-hidden="true" />
              <span>{item.label}</span>
              {!item.isAvailable && (
                <span className="text-[8px] text-slate-400 uppercase">soon</span>
              )}
            </button>
          );
        })}
      </nav>
    </>
  );
};
