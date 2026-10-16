/**
 * SignalBridge - Climate and Weather Risk Intelligence PWA
 * Milestone 1 Implementation (Revised)
 */

import React, { useState, useEffect } from 'react';
import { PilotBanner } from './components/PilotBanner';
import { OfflineIndicator } from './components/OfflineIndicator';
import { Navigation, NavTab } from './components/Navigation';
import { OverviewView } from './components/OverviewView';
import { LocationProfileView } from './components/LocationProfileView';
import { DataSourcesView } from './components/DataSourcesView';
import { MapView } from './components/MapView';
import { SettingsView } from './components/SettingsView';
import { ComingSoonView } from './components/ComingSoonView';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import {
  fetchOverviewFeed,
  fetchLocationWeather,
  saveStoredCustomLocation,
} from './services/api';
import { LocationWeatherData, LocationInfo } from '../shared/types.js';
import { AlertTriangle, X } from 'lucide-react';

export default function App() {
  const isOnline = useOnlineStatus();

  // Navigation tab state
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');

  // Currently inspected location (when in profile view)
  const [profileLocation, setProfileLocation] = useState<LocationWeatherData | null>(null);

  // Selected map location highlight
  const [selectedMapLocation, setSelectedMapLocation] = useState<LocationWeatherData | null>(null);

  // Requirement 6: SIMULATED test scenario toggle state
  const [isSimulated, setIsSimulated] = useState(false);

  // Global overview feed state
  const [feedItems, setFeedItems] = useState<LocationWeatherData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCachedSnapshot, setIsCachedSnapshot] = useState(false);
  const [cachedAgeDescription, setCachedAgeDescription] = useState<string | undefined>();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load overview feed
  const loadOverview = async (simulate = isSimulated) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetchOverviewFeed(simulate);
      setFeedItems(res.data);
      setIsCachedSnapshot(res.isCached);
      setCachedAgeDescription(res.cachedAgeDescription);
      if (res.data.length > 0 && !selectedMapLocation) {
        setSelectedMapLocation(res.data[0]);
      }
    } catch (err: any) {
      console.error('Failed to load overview feed:', err);
      setErrorMessage(err.message || 'Unable to connect to meteorological provider.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOverview(isSimulated);
  }, [isSimulated]);

  // Handler to toggle simulation mode
  const handleToggleSimulated = (val: boolean) => {
    setIsSimulated(val);
    // If viewing profile of simulated target, refresh it
    if (profileLocation) {
      fetchLocationWeather({
        lat: profileLocation.location.latitude,
        lon: profileLocation.location.longitude,
        name: profileLocation.location.name,
        country: profileLocation.location.country,
        simulate: val,
      }).then(res => {
        setProfileLocation(res.data);
      }).catch(() => {});
    }
  };

  // Handler when user selects a search result (city, country, or coordinates)
  const handleSearchSelectLocation = async (loc: LocationInfo) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      saveStoredCustomLocation(loc);
      const res = await fetchLocationWeather({
        lat: loc.latitude,
        lon: loc.longitude,
        name: loc.name,
        country: loc.country,
        simulate: isSimulated,
      });

      // Update active profile and switch to profile view
      setProfileLocation(res.data);
      setSelectedMapLocation(res.data);

      // Prepend or update in feed if not present
      setFeedItems(prev => {
        const existingIdx = prev.findIndex(p => p.location.id === res.data.location.id);
        if (existingIdx >= 0) {
          const updated = [...prev];
          updated[existingIdx] = res.data;
          return updated;
        }
        return [res.data, ...prev];
      });
    } catch (err: any) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler when threshold is updated in Rule Audit
  const handleThresholdChange = async (newThreshold: number) => {
    if (!profileLocation) return;
    try {
      const res = await fetchLocationWeather({
        lat: profileLocation.location.latitude,
        lon: profileLocation.location.longitude,
        name: profileLocation.location.name,
        country: profileLocation.location.country,
        threshold: newThreshold,
        simulate: isSimulated,
      });
      setProfileLocation(res.data);
      setSelectedMapLocation(res.data);
    } catch (err) {
      console.error('Threshold re-evaluation error:', err);
    }
  };

  // Clear user-added custom locations
  const handleClearCustomLocations = () => {
    localStorage.removeItem('signalbridge_custom_locations');
    loadOverview(isSimulated);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* 1. Pilot informational banner */}
      <PilotBanner />

      {/* Requirement 6: Persistent SIMULATED badge across the app while active */}
      {isSimulated && (
        <div
          role="status"
          className="bg-amber-600 text-white px-4 py-1.5 text-xs font-semibold flex items-center justify-between shadow-xs"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-white shrink-0" aria-hidden="true" />
            <span>
              TEST HARNESS ACTIVE · SIMULATED heavy rain scenario injected for Kisumu (Kenya)
            </span>
          </div>
          <button
            onClick={() => handleToggleSimulated(false)}
            className="inline-flex items-center gap-1 bg-amber-700 hover:bg-amber-800 px-2 py-0.5 rounded text-[11px] font-medium transition"
            aria-label="Deactivate simulated test mode"
          >
            <span>Exit Test Mode</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Offline and cache age indicator */}
      <OfflineIndicator
        isCached={isCachedSnapshot}
        cachedAgeDescription={cachedAgeDescription}
      />

      {/* 3. Main Application Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Rail */}
        <Navigation
          currentTab={currentTab}
          onSelectTab={tab => {
            setCurrentTab(tab);
            if (tab !== 'overview') {
              if (tab !== 'map') {
                setProfileLocation(null);
              }
            }
          }}
          selectedLocationName={profileLocation?.location.name}
          isOnline={isOnline}
        />

        {/* Dynamic Screen Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden pb-14 md:pb-0">
          {errorMessage && (
            <div className="bg-red-50 border-b border-red-200 px-4 py-2.5 text-xs text-red-800 flex items-center justify-between">
              <span>{errorMessage}</span>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-red-600 hover:text-red-900 underline ml-2"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Location Profile Screen */}
          {profileLocation ? (
            <LocationProfileView
              data={profileLocation}
              onBack={() => setProfileLocation(null)}
              onThresholdChange={handleThresholdChange}
            />
          ) : currentTab === 'overview' ? (
            /* Screen 1: Overview Dashboard */
            <OverviewView
              feedItems={feedItems}
              selectedLocation={selectedMapLocation}
              onSelectLocation={loc => setSelectedMapLocation(loc)}
              onSearchSelectLocation={handleSearchSelectLocation}
              isLoading={isLoading}
              onRefresh={() => loadOverview(isSimulated)}
              onViewLocationProfile={loc => setProfileLocation(loc)}
              isSimulatedActive={isSimulated}
            />
          ) : currentTab === 'map' ? (
            /* Dedicated Map Tab */
            <MapView
              locations={feedItems}
              selectedLocation={selectedMapLocation}
              onSelectLocation={loc => setSelectedMapLocation(loc)}
              onViewLocationProfile={loc => setProfileLocation(loc)}
            />
          ) : currentTab === 'sources' ? (
            /* Screen 3: Data Sources and Coverage Page */
            <DataSourcesView />
          ) : currentTab === 'settings' ? (
            /* Settings & Test Harness Tab */
            <SettingsView
              isSimulated={isSimulated}
              onToggleSimulated={handleToggleSimulated}
              onClearCustomLocations={handleClearCustomLocations}
            />
          ) : (
            /* Coming Soon States for Events and Alerts */
            <ComingSoonView
              tab={currentTab}
              onReturnToOverview={() => setCurrentTab('overview')}
            />
          )}
        </main>
      </div>
    </div>
  );
}
