import React, { useState } from 'react';
import { Download, Share2, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running standalone or installed, omit button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 px-3 py-1.5 text-xs font-medium shadow-sm transition"
        title="Install SignalBridge as a desktop or mobile application"
      >
        <Download className="w-3.5 h-3.5 text-teal-400" aria-hidden="true" />
        <span>Install App</span>
      </button>
    );
  }

  // iOS Safari flow
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 px-3 py-1.5 text-xs font-medium shadow-sm transition"
          title="Install on iOS Safari"
        >
          <Share2 className="w-3.5 h-3.5 text-teal-400" aria-hidden="true" />
          <span>Install App</span>
        </button>

        {showIOSGuide && (
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ios-install-title"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
          >
            <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl text-slate-800 border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 id="ios-install-title" className="text-sm font-semibold text-slate-900">
                  Install SignalBridge on iOS
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                  aria-label="Close installation dialog"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <ol className="mt-3 text-xs text-slate-600 space-y-2 list-decimal list-inside">
                <li>
                  Tap the <strong className="text-slate-800">Share</strong> icon in the bottom Safari toolbar.
                </li>
                <li>Scroll down and select <strong className="text-slate-800">Add to Home Screen</strong>.</li>
                <li>Tap <strong className="text-slate-800">Add</strong> in the top-right corner to access offline risk data.</li>
              </ol>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded bg-slate-900 py-2 text-xs font-medium text-white hover:bg-slate-800"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
