import React from 'react';
import { WifiOff, Database } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface OfflineIndicatorProps {
  isCached?: boolean;
  cachedAgeDescription?: string;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  isCached = false,
  cachedAgeDescription,
}) => {
  const isOnline = useOnlineStatus();

  if (isOnline && !isCached) {
    return null;
  }

  return (
    <div
      role="status"
      className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-900 flex items-center justify-between"
    >
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <WifiOff className="w-3.5 h-3.5 text-amber-700 shrink-0" aria-hidden="true" />
        ) : (
          <Database className="w-3.5 h-3.5 text-amber-700 shrink-0" aria-hidden="true" />
        )}
        <span>
          {!isOnline
            ? 'Offline Mode: Network unavailable. Displaying cached risk intelligence.'
            : 'Cached Snapshot: Serving previously stored data.'}
          {cachedAgeDescription && (
            <span className="font-semibold ml-1.5">
              Snapshot age: {cachedAgeDescription}
            </span>
          )}
        </span>
      </div>
      <span className="text-[11px] text-amber-800">
        Non-sensitive cached records
      </span>
    </div>
  );
};
