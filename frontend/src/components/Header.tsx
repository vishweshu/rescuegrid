import React, { useState, useEffect } from 'react';
import {
  Shield,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  FileText,
  History,
  RotateCcw,
  Presentation,
  Download
} from 'lucide-react';
import { Incident } from '../types';

interface HeaderProps {
  incident: Incident | null;
  isOffline: boolean;
  onToggleOffline: (offline: boolean) => void;
  onSync: () => void;
  onResetDemo: () => void;
  onOpenSitRep: () => void;
  onOpenAudit: () => void;
  unsyncedCount: number;
  syncing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  incident,
  isOffline,
  onToggleOffline,
  onSync,
  onResetDemo,
  onOpenSitRep,
  onOpenAudit,
  unsyncedCount,
  syncing
}) => {
  const [elapsedHours, setElapsedHours] = useState(12.4);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedHours((prev) => +(prev + 0.05).toFixed(2));
    }, 15000);
    return () => clearInterval(timer);
  }, []);

  const progressPercent = Math.min(100, Math.round((elapsedHours / 72) * 100));
  const hoursLeft = Math.max(0, 72 - Math.floor(elapsedHours));

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">
                RescueGrid
              </h1>
              <span className="text-[11px] text-slate-400 font-normal">
                Disaster Search &amp; Rescue
              </span>
            </div>
          </div>
        </div>

        {/* 72h Window */}
        <div className="flex items-center gap-2.5 bg-slate-800/60 border border-slate-700/60 px-3 py-1.5 rounded-lg text-xs w-full md:w-auto">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-300">
            Window: <b className="text-white font-mono">{elapsedHours.toFixed(1)}h</b> / 72h
          </span>
          <span className="text-slate-400 text-[11px]">({hoursLeft}h left)</span>
          <div className="w-16 bg-slate-700 h-1.5 rounded-full overflow-hidden ml-1">
            <div
              className="bg-amber-500 h-full rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center flex-wrap gap-2 w-full md:w-auto justify-end text-xs">
          {/* Offline Toggle */}
          <button
            onClick={() => onToggleOffline(!isOffline)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium border transition-colors ${
              isOffline
                ? 'bg-rose-950/60 text-rose-300 border-rose-800 hover:bg-rose-900/60'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750'
            }`}
          >
            {isOffline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span>Offline Mode</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                <span>Online</span>
              </>
            )}
          </button>

          {/* Sync Button */}
          <button
            onClick={onSync}
            disabled={syncing || isOffline || unsyncedCount === 0}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium border transition-colors ${
              unsyncedCount > 0 && !isOffline
                ? 'bg-amber-600 text-white border-amber-500 hover:bg-amber-500'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750 disabled:opacity-40'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            <span>Sync</span>
            {unsyncedCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 rounded-full">
                {unsyncedCount}
              </span>
            )}
          </button>

          {/* SitRep */}
          <button
            onClick={onOpenSitRep}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-md font-medium transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span>SitRep</span>
          </button>

          {/* Presentation Deck */}
          <a
            href="/presentation/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-md font-medium transition-colors"
          >
            <Presentation className="w-3.5 h-3.5 text-amber-400" />
            <span>Slides</span>
          </a>

          {/* Download PPTX */}
          <a
            href="/api/download/pptx"
            download
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-md font-medium transition-colors"
            title="Download PowerPoint Presentation (.pptx)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PPTX</span>
          </a>

          {/* Audit */}
          <button
            onClick={onOpenAudit}
            className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 border border-slate-700 rounded-md transition-colors"
            title="Audit Log"
          >
            <History className="w-3.5 h-3.5" />
          </button>

          {/* Reset Demo */}
          <button
            onClick={onResetDemo}
            disabled={isOffline}
            className="p-1.5 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 border border-slate-700 rounded-md transition-colors disabled:opacity-40"
            title="Reset to initial data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Incident Sub-bar */}
      <div className="bg-slate-950/70 border-t border-slate-800/60 px-4 py-1 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-slate-300 font-medium">
              {incident?.title || 'Landslide Sector 4 (Simulated)'}
            </span>
            <span className="text-slate-500">•</span>
            <span>6 Zones, 20 Buildings</span>
          </div>
          <span className="text-slate-500 text-[11px]">
            Demo Dataset
          </span>
        </div>
      </div>
    </header>
  );
};
