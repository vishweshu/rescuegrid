import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  BarChart2,
  CheckCircle,
  HelpCircle,
  FileEdit,
  UserCheck,
  Info,
  Sparkles,
  Sliders,
  AlertOctagon
} from 'lucide-react';
import { SearchZone } from '../types';

interface ZoneDetailDrawerProps {
  zone: SearchZone | null;
  onClose?: () => void;
  onOverridePriority: (zoneId: string, score: number, author: string, reason: string) => Promise<void>;
  isOffline: boolean;
}

export const ZoneDetailDrawer: React.FC<ZoneDetailDrawerProps> = ({
  zone,
  onClose,
  onOverridePriority,
  isOffline
}) => {
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideScore, setOverrideScore] = useState<number>(zone?.active_priority_score || 85);
  const [authorName, setAuthorName] = useState('Chief Rescue Coordinator');
  const [overrideReason, setOverrideReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!zone) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-8 text-center text-slate-500 h-full flex flex-col items-center justify-center">
        <Info className="w-10 h-10 mb-2 opacity-40 text-slate-400" />
        <h4 className="font-bold text-slate-300 text-sm mb-1">No Zone Selected</h4>
        <p className="text-xs text-slate-400 max-w-xs">
          Click any zone on the tactical map or the sector list above to inspect its explainable intelligence breakdown.
        </p>
      </div>
    );
  }

  const score = zone.active_priority_score;
  const breakdown = zone.score_breakdown || {
    evidence_strength: 50,
    potential_occupancy: 40,
    urgency_threat: 60,
    temporal_recency: 70,
    access_impedance_penalty: 10
  };

  const getScoreBadge = (val: number) => {
    if (val >= 75) {
      return (
        <span className="bg-red-950/60 text-red-300 border border-red-800 text-[11px] px-2.5 py-0.5 rounded font-semibold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
          High Priority
        </span>
      );
    }
    if (val >= 50) {
      return (
        <span className="bg-amber-950/60 text-amber-300 border border-amber-800 text-[11px] px-2.5 py-0.5 rounded font-semibold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          Medium Priority
        </span>
      );
    }
    return (
      <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[11px] px-2.5 py-0.5 rounded font-semibold flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        Low Priority
      </span>
    );
  };

  const handleApplyOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      alert('A recorded justification reason is mandatory for coordinator priority override.');
      return;
    }
    try {
      setSubmitting(true);
      await onOverridePriority(zone.id, Number(overrideScore), authorName, overrideReason);
      setShowOverrideModal(false);
      setOverrideReason('');
    } catch (err: any) {
      alert(`Override failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-xl text-slate-100 flex flex-col gap-3.5 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-slate-800 pb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="bg-slate-950 text-amber-400 font-mono text-xs font-black px-2.5 py-0.5 rounded border border-slate-800">
              {zone.code}
            </span>
            <span className="bg-slate-800 text-slate-300 text-xs font-bold px-2 py-0.5 rounded border border-slate-700">
              Rank #{zone.rank}
            </span>
            {getScoreBadge(score)}
            {zone.is_overridden && (
              <span className="bg-purple-950 text-purple-300 border border-purple-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                Override Active
              </span>
            )}
          </div>
          <h2 className="text-base font-bold text-white leading-tight">{zone.name}</h2>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Priority Score Summary Card */}
      <div className="flex items-center justify-between bg-slate-950/80 border border-slate-800 p-3 rounded-lg shadow-inner">
        <div>
          <div className="text-[11px] text-slate-400 font-medium">Explainable Search Priority Score</div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-3xl font-black font-mono text-amber-400">{score.toFixed(1)}</span>
            <span className="text-xs text-slate-500 font-medium">/ 100</span>
          </div>
        </div>

        <button
          onClick={() => {
            setOverrideScore(zone.active_priority_score);
            setShowOverrideModal(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-md text-xs font-semibold transition-colors"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Override Priority</span>
        </button>
      </div>

      {/* Override Info Alert if active */}
      {zone.is_overridden && (
        <div className="bg-purple-950/60 border border-purple-800/80 p-2.5 rounded-lg text-xs text-purple-200">
          <div className="font-bold flex items-center gap-1 text-purple-300 mb-0.5">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Human Coordinator Priority Override Active</span>
          </div>
          <p className="italic text-purple-200 text-[11px]">"{zone.override_reason}"</p>
          <div className="text-[10px] text-purple-400 mt-1">
            Authorized by: <b>{zone.override_author}</b> • {zone.override_timestamp ? new Date(zone.override_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
          </div>
        </div>
      )}

      {/* Plain Language Rationale */}
      <div className="bg-slate-950/60 border border-slate-800/90 p-3 rounded-lg text-xs leading-relaxed text-slate-300">
        <div className="font-bold text-amber-300 flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wider">
          <Info className="w-3.5 h-3.5 text-amber-400" />
          <span>Assessment Rationale</span>
        </div>
        <p className="text-slate-200 leading-normal">{zone.explanation || 'Calculated composite priority based on verified sensor signals and trapped reports.'}</p>
      </div>

      {/* Explainable Factor Breakdown */}
      <div className="bg-slate-800/50 border border-slate-700/60 p-3 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Factor Breakdown (Normalized Weights)</span>
          </span>
        </div>

        <div className="space-y-2 text-xs">
          {/* Evidence Strength */}
          <div>
            <div className="flex justify-between text-slate-300 text-[11px] mb-0.5">
              <span>Evidence Strength (30%):</span>
              <span className="font-mono font-bold text-blue-400">{breakdown.evidence_strength.toFixed(1)} / 100</span>
            </div>
            <div className="w-full bg-slate-700/70 h-1.5 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full transition-all duration-300" style={{ width: `${breakdown.evidence_strength}%` }} />
            </div>
          </div>

          {/* Potential Occupancy */}
          <div>
            <div className="flex justify-between text-slate-300 text-[11px] mb-0.5">
              <span>Potential Occupancy &amp; Vulnerability (25%):</span>
              <span className="font-mono font-bold text-emerald-400">{breakdown.potential_occupancy.toFixed(1)} / 100</span>
            </div>
            <div className="w-full bg-slate-700/70 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full transition-all duration-300" style={{ width: `${breakdown.potential_occupancy}%` }} />
            </div>
          </div>

          {/* Environmental Urgency */}
          <div>
            <div className="flex justify-between text-slate-300 text-[11px] mb-0.5">
              <span>Environmental Urgency / Threat (25%):</span>
              <span className="font-mono font-bold text-amber-400">{breakdown.urgency_threat.toFixed(1)} / 100</span>
            </div>
            <div className="w-full bg-slate-700/70 h-1.5 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full transition-all duration-300" style={{ width: `${breakdown.urgency_threat}%` }} />
            </div>
          </div>

          {/* Temporal Recency */}
          <div>
            <div className="flex justify-between text-slate-300 text-[11px] mb-0.5">
              <span>Temporal Recency (15%):</span>
              <span className="font-mono font-bold text-indigo-400">{breakdown.temporal_recency.toFixed(1)} / 100</span>
            </div>
            <div className="w-full bg-slate-700/70 h-1.5 rounded-full overflow-hidden">
              <div className="bg-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${breakdown.temporal_recency}%` }} />
            </div>
          </div>

          {/* Access Impedance Penalty */}
          <div>
            <div className="flex justify-between text-slate-300 text-[11px] mb-0.5">
              <span>Access Impedance Penalty (5%):</span>
              <span className="font-mono font-bold text-rose-400">-{breakdown.access_impedance_penalty.toFixed(1)}</span>
            </div>
            <div className="w-full bg-slate-700/70 h-1.5 rounded-full overflow-hidden">
              <div className="bg-rose-500 h-full rounded-full transition-all duration-300" style={{ width: `${breakdown.access_impedance_penalty}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Verified Facts & Missing Info */}
      <div className="space-y-2 text-xs">
        {/* Verified Facts */}
        <div className="bg-slate-950/70 border border-emerald-900/60 p-2.5 rounded-lg">
          <div className="font-bold text-emerald-400 flex items-center gap-1.5 mb-1 text-[11px]">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Verified Physical Facts ({zone.verified_facts?.length || 0})</span>
          </div>
          {zone.verified_facts && zone.verified_facts.length > 0 ? (
            <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
              {zone.verified_facts.map((fact, idx) => (
                <li key={idx} className="leading-snug">{fact}</li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 italic text-[11px]">No on-ground physical confirmation recorded yet.</p>
          )}
        </div>

        {/* Missing Intel */}
        <div className="bg-slate-950/70 border border-amber-900/60 p-2.5 rounded-lg">
          <div className="font-bold text-amber-400 flex items-center gap-1.5 mb-1 text-[11px]">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Missing Intel Required ({zone.missing_information?.length || 0})</span>
          </div>
          {zone.missing_information && zone.missing_information.length > 0 ? (
            <ul className="list-disc list-inside space-y-1 text-slate-300 text-[11px]">
              {zone.missing_information.map((item, idx) => (
                <li key={idx} className="leading-snug">{item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-500 italic text-[11px]">All key inputs satisfied for this sector.</p>
          )}
        </div>
      </div>

      {/* Humanitarian Safeguard Note */}
      <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg text-[10px] text-slate-400 flex items-start gap-1.5 mt-auto">
        <ShieldAlert className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
        <span>
          <b>Decision Support Notice:</b> Prioritization score is a relative ranking tool, not a survival certainty. Uncontacted sectors are never declared clear.
        </span>
      </div>

      {/* Coordinator Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-5 max-w-md w-full shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                <FileEdit className="w-4 h-4 text-amber-400" />
                <span>Coordinator Priority Override</span>
              </h3>
              <button
                onClick={() => setShowOverrideModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyOverride} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Target Zone:
                </label>
                <div className="p-2 bg-slate-800/80 rounded border border-slate-700 text-amber-300 font-mono font-bold">
                  {zone.code} — {zone.name}
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-slate-300 font-semibold">New Priority Score:</label>
                  <span className="font-mono font-bold text-amber-400 text-sm">{overrideScore} / 100</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="100"
                  step="1"
                  value={overrideScore}
                  onChange={(e) => setOverrideScore(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Coordinator Call-Sign / Name:
                </label>
                <input
                  type="text"
                  required
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Mandatory Operational Justification Reason:
                </label>
                <textarea
                  required
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="e.g., Direct satellite phone confirmation from trapped panchayat member confirming 6 children in basement..."
                  className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded font-bold shadow-md transition-all"
                >
                  {submitting ? 'Recording...' : 'Apply & Log Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
