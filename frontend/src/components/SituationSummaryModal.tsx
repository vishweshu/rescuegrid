import React from 'react';
import {
  X,
  FileText,
  Printer,
  Copy,
  AlertTriangle,
  CheckCircle,
  Truck,
  Shield,
  Layers,
  MapPin
} from 'lucide-react';
import { SituationSummary } from '../types';

interface SituationSummaryModalProps {
  summary: SituationSummary | null;
  onClose: () => void;
}

export const SituationSummaryModal: React.FC<SituationSummaryModalProps> = ({
  summary,
  onClose
}) => {
  if (!summary) return null;

  const handleCopy = () => {
    const text = `
RESCUEGRID AI — OPERATIONAL SITUATION REPORT (SITREP)
Disaster: ${summary.incident_title}
Location: ${summary.location}
Timestamp: ${new Date(summary.generated_at).toLocaleString()}

1. EXECUTIVE METRICS
- Total Reported Missing: ${summary.metrics.total_missing_persons}
- Unresolved Missing: ${summary.metrics.unresolved_missing}
- Located Alive / Evacuated: ${summary.metrics.located_alive}
- Total Clues Fused: ${summary.metrics.total_evidence_clues} (${summary.metrics.corroborated_clues} corroborated)
- Active Clue Contradictions: ${summary.metrics.active_conflicts_count}
- Active Hazards: ${summary.metrics.active_hazards_count}
- Blocked Routes: ${summary.metrics.blocked_roads_count}
- Rescue Teams Deployed: ${summary.metrics.deployed_teams_count} / ${summary.metrics.total_rescue_teams}

2. TOP PRIORITY SEARCH ZONES
${summary.top_priority_zones.map((z) => `* [${z.code}] ${z.name}: Priority ${z.priority_score}/100 (Estimated occupants: ${z.estimated_occupants})`).join('\n')}

3. CONFIRMED HAZARDS & ROAD RESTRICTIONS
Hazards:
${summary.critical_hazards.map((h) => `* ${h.hazard_type} (${h.severity}): ${h.description}`).join('\n')}
Road Closures:
${summary.blocked_routes.map((r) => `* ${r.road_name}: ${r.restriction_type} (Passable by: ${r.passable_by})`).join('\n')}

4. UNRESOLVED INTELLIGENCE CONFLICTS
${summary.active_conflicts.map((c) => `* ${c.conflict_type}: ${c.explanation} -> Action: ${c.action}`).join('\n')}

5. RECOMMENDED IMMEDIATE ACTIONS
${summary.recommended_next_actions.map((a, i) => `${i + 1}. ${a}`).join('\n')}
    `.trim();

    navigator.clipboard.writeText(text);
    alert('SitRep copied to clipboard in standard NDMA operational format.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-3xl w-full p-6 shadow-2xl text-slate-100 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-900/60 rounded-lg border border-blue-700/80">
              <FileText className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>72-Hour Operational Situation Report (SitRep)</span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded font-mono">
                  OFFICIAL PROTOCOL
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {summary.incident_title} • {new Date(summary.generated_at).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
              title="Copy SitRep text"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded border border-slate-700 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable SitRep Body */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 text-xs">
          {/* Section 1: Executive Metrics Grid */}
          <div>
            <h4 className="font-bold text-slate-300 text-xs mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-amber-400" />
              <span>1. Executive Incident Metrics</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                <span className="text-slate-400 block text-[10px]">Reported Missing</span>
                <span className="text-xl font-bold font-mono text-amber-400">{summary.metrics.total_missing_persons}</span>
                <span className="text-[10px] text-slate-500 block">Unresolved: {summary.metrics.unresolved_missing}</span>
              </div>
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                <span className="text-slate-400 block text-[10px]">Located Alive</span>
                <span className="text-xl font-bold font-mono text-emerald-400">{summary.metrics.located_alive}</span>
                <span className="text-[10px] text-slate-500 block">Deceased: {summary.metrics.deceased}</span>
              </div>
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                <span className="text-slate-400 block text-[10px]">Evidence Clues</span>
                <span className="text-xl font-bold font-mono text-blue-400">{summary.metrics.total_evidence_clues}</span>
                <span className="text-[10px] text-slate-500 block">Corroborated: {summary.metrics.corroborated_clues}</span>
              </div>
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                <span className="text-slate-400 block text-[10px]">Intelligence Conflicts</span>
                <span className="text-xl font-bold font-mono text-red-400">{summary.metrics.active_conflicts_count}</span>
                <span className="text-[10px] text-slate-500 block">Hazards: {summary.metrics.active_hazards_count}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Top Priority Search Zones */}
          <div>
            <h4 className="font-bold text-slate-300 text-xs mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-red-400" />
              <span>2. Highest-Priority Search Zones</span>
            </h4>
            <div className="space-y-1.5">
              {summary.top_priority_zones.map((z) => (
                <div key={z.id} className="p-2 bg-slate-950 border border-slate-800 rounded flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="bg-slate-800 text-amber-400 font-mono font-bold px-1.5 py-0.2 rounded text-[10px]">
                      {z.code}
                    </span>
                    <span className="font-bold text-slate-200">{z.name}</span>
                    {z.is_overridden && (
                      <span className="text-[10px] bg-purple-950 text-purple-300 px-1 rounded">
                        Coordinator Override
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">Est. Occupants: <b>{z.estimated_occupants}</b></span>
                    <span className="font-mono font-bold text-red-400">{z.priority_score.toFixed(1)} / 100</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Hazards & Road Network */}
          <div>
            <h4 className="font-bold text-slate-300 text-xs mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>3. Confirmed Hazards &amp; Blocked Routes</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                <span className="font-bold text-red-400 block mb-1">Critical Hazards:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  {summary.critical_hazards.map((h, i) => (
                    <li key={i}>{h.hazard_type}: {h.description} ({h.radius_meters}m)</li>
                  ))}
                </ul>
              </div>
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded">
                <span className="font-bold text-rose-400 block mb-1">Blocked Routes:</span>
                <ul className="list-disc list-inside space-y-1 text-slate-300">
                  {summary.blocked_routes.map((r, i) => (
                    <li key={i}>{r.road_name}: {r.restriction_type} ({r.passable_by})</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Section 4: Conflicting Reports */}
          {summary.active_conflicts.length > 0 && (
            <div>
              <h4 className="font-bold text-red-400 text-xs mb-2 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>4. Contradictory Intelligence (Requires Physical Audit)</span>
              </h4>
              <div className="space-y-2">
                {summary.active_conflicts.map((c, i) => (
                  <div key={i} className="p-2.5 bg-red-950/40 border border-red-800/80 rounded text-red-200">
                    <b className="text-red-300 block mb-0.5">{c.conflict_type}:</b>
                    <p className="text-slate-300 mb-1">{c.explanation}</p>
                    <span className="text-[11px] text-amber-300 font-bold">Recommended: {c.action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 5: Recommended Next Actions */}
          <div>
            <h4 className="font-bold text-emerald-400 text-xs mb-2 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>5. Recommended Tactical Next Actions</span>
            </h4>
            <div className="p-3 bg-emerald-950/30 border border-emerald-800/60 rounded">
              <ol className="list-decimal list-inside space-y-1.5 text-slate-200 font-medium">
                {summary.recommended_next_actions.map((act, i) => (
                  <li key={i} className="leading-relaxed">{act}</li>
                ))}
              </ol>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 pt-3 mt-4 flex items-center justify-between text-[11px] text-slate-400">
          <span>Derived purely from incoming verified and fused incident telemetry.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-semibold transition-all"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
};
